-- T-032 / CU-10. Catálogo, ámbitos, vigencia, bitácora y operaciones administrativas.
-- No concede roles a personas. El primer administrador requiere designación expresa.
INSERT INTO public.rol (codigo,nombre,descripcion) VALUES
 ('administrador','Administrador del portal','Administra cuentas; no autoriza actividades ni publica por defecto.'),
 ('editor','Editor','Prepara contenidos; no publica por defecto.'),
 ('responsable_actividades','Responsable de actividades','Gestiona agenda, solicitudes, asistencia, moderación y recompensas.'),
 ('servicios_digitales','Servicios Digitales','Altas asistidas, contactos y atención.'),
 ('prestamos','Préstamos','Cotejo presencial y validación de credenciales.'),
 ('publicador','Publicación autorizada','Capacidad editorial expresa; no sustituye autorizaciones institucionales.')
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public."rolUsuario"
 ADD COLUMN "ambito" text NOT NULL DEFAULT 'global' CHECK ("ambito" IN ('global','actividades_asignadas')),
 ADD COLUMN "vigenteDesde" timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN "vigenteHasta" timestamptz,
 ADD CONSTRAINT vigencia_rol_valida CHECK ("vigenteHasta" IS NULL OR "vigenteHasta">"vigenteDesde"),
 ADD CONSTRAINT continuidad_rol_admin CHECK ("rolCodigo"<>'administrador' OR ("ambito"='global' AND "vigenteHasta" IS NULL));

CREATE TABLE public."ambitoRol" (
 "usuarioId" uuid NOT NULL,
 "rolCodigo" text NOT NULL,
 "actividadId" uuid NOT NULL REFERENCES public.actividad(id) ON DELETE RESTRICT,
 PRIMARY KEY ("usuarioId","rolCodigo","actividadId"),
 FOREIGN KEY ("usuarioId","rolCodigo") REFERENCES public."rolUsuario"("usuarioId","rolCodigo") ON DELETE CASCADE
);
CREATE INDEX ambito_rol_actividad_idx ON public."ambitoRol"("actividadId");
ALTER TABLE public."ambitoRol" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."ambitoRol" FROM anon,authenticated;
GRANT SELECT ON public."ambitoRol" TO authenticated;
CREATE POLICY lectura_ambitos_propios ON public."ambitoRol" FOR SELECT TO authenticated
 USING ("usuarioId"=(select auth.uid()));

CREATE TABLE public."historialCuenta" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 "usuarioId" uuid NOT NULL REFERENCES public.perfil(id) ON DELETE RESTRICT,
 "realizadoPor" uuid NOT NULL REFERENCES public.perfil(id) ON DELETE RESTRICT,
 accion text NOT NULL CHECK (accion IN ('asignar_rol','retirar_rol','cambiar_estado')),
 motivo text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 1 AND 500),
 anterior jsonb NOT NULL,
 posterior jsonb NOT NULL,
 "realizadoEn" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX historial_cuenta_usuario_idx ON public."historialCuenta"("usuarioId","realizadoEn" DESC,id);
CREATE INDEX historial_cuenta_actor_idx ON public."historialCuenta"("realizadoPor");
ALTER TABLE public."historialCuenta" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."historialCuenta" FROM anon,authenticated;
GRANT SELECT,INSERT ON public."historialCuenta" TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public."ambitoRol" TO service_role;

CREATE FUNCTION privado.impedir_edicion_historial_cuenta()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 RAISE EXCEPTION 'La bitácora es de solo anexado.' USING ERRCODE='23514';
END;
$$;
REVOKE ALL ON FUNCTION privado.impedir_edicion_historial_cuenta() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER conservar_historial_cuenta BEFORE UPDATE OR DELETE ON public."historialCuenta"
 FOR EACH ROW EXECUTE FUNCTION privado.impedir_edicion_historial_cuenta();

-- Se ejecuta únicamente desde la función privilegiada; nunca es una RPC pública.
CREATE FUNCTION privado.comprobar_sesion_cuenta()
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE actor uuid := auth.uid(); sesion uuid;
BEGIN
 IF actor IS NULL OR coalesce(auth.jwt()->>'role','')<>'authenticated' THEN
   RAISE EXCEPTION 'Sesión requerida.' USING ERRCODE='42501';
 END IF;
 BEGIN sesion := (auth.jwt()->>'session_id')::uuid;
 EXCEPTION WHEN invalid_text_representation THEN
   RAISE EXCEPTION 'Sesión inválida.' USING ERRCODE='42501';
 END;
 IF sesion IS NULL OR NOT EXISTS (
   SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
   JOIN public.perfil p ON p.id=u.id
   WHERE s.id=sesion AND s.user_id=actor AND p.estatus='activo' AND u.email_confirmed_at IS NOT NULL
   AND (s.not_after IS NULL OR s.not_after>statement_timestamp())
 ) THEN RAISE EXCEPTION 'Sesión revocada, cuenta inactiva o correo pendiente.' USING ERRCODE='42501'; END IF;
 RETURN actor;
END;
$$;
REVOKE ALL ON FUNCTION privado.comprobar_sesion_cuenta() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION privado.roles_de_cuenta(usuario uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('actividades',
   coalesce((SELECT jsonb_agg(a."actividadId" ORDER BY a."actividadId") FROM public."ambitoRol" a
   WHERE a."usuarioId"=r."usuarioId" AND a."rolCodigo"=r."rolCodigo"),'[]'::jsonb)) ORDER BY r."rolCodigo"),'[]'::jsonb)
 FROM public."rolUsuario" r WHERE r."usuarioId"=usuario;
$$;
REVOKE ALL ON FUNCTION privado.roles_de_cuenta(uuid) FROM PUBLIC,anon,authenticated;

-- Única entrada privilegiada. Auth firma el JWT; actor y sesión nunca se reciben en datos.
-- RLS permanece activo y no se conceden INSERT/UPDATE/DELETE directos a authenticated.
CREATE FUNCTION public.administrar_cuentas(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid; destino uuid; v_codigo text; motivo text; ambito text;
 desde timestamptz; hasta timestamptz; actividades uuid[] := ARRAY[]::uuid[];
 antes jsonb; despues jsonb; estado text; limite integer; desplazamiento integer; busqueda text;
 salida jsonb; total bigint; claves text[];
BEGIN
 IF operacion NOT IN ('mi_acceso','listar_roles','listar_cuentas','ver_cuenta','asignar_rol','retirar_rol','cambiar_estado','historial')
   OR operacion IS NULL OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'Petición inválida.' USING ERRCODE='22023';
 END IF;
 IF operacion IN ('asignar_rol','retirar_rol','cambiar_estado') THEN
   -- Serializa todas las mutaciones administrativas para evitar retirar los dos últimos admins a la vez.
   PERFORM pg_advisory_xact_lock(hashtextextended('biblioteca.administrar_cuentas',0));
 END IF;
 actor := privado.comprobar_sesion_cuenta();
 IF operacion='mi_acceso' THEN
   IF datos<>'{}'::jsonb THEN RAISE EXCEPTION 'No se reciben campos.' USING ERRCODE='22023'; END IF;
   RETURN jsonb_build_object('usuarioId',actor,'roles',(
     SELECT coalesce(jsonb_agg(valor),'[]'::jsonb) FROM jsonb_array_elements(privado.roles_de_cuenta(actor)) valor
     WHERE (valor->>'vigenteDesde')::timestamptz<=statement_timestamp()
       AND ((valor->>'vigenteHasta') IS NULL OR (valor->>'vigenteHasta')::timestamptz>statement_timestamp())
   ));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public."rolUsuario" r WHERE r."usuarioId"=actor
    AND r."rolCodigo"='administrador' AND r.ambito='global'
    AND r."vigenteDesde"<=statement_timestamp() AND (r."vigenteHasta" IS NULL OR r."vigenteHasta">statement_timestamp())) THEN
   RAISE EXCEPTION 'Sin facultad administrativa.' USING ERRCODE='42501';
 END IF;
 claves := CASE operacion
   WHEN 'listar_roles' THEN ARRAY[]::text[]
   WHEN 'listar_cuentas' THEN ARRAY['busqueda','limite','desplazamiento']
   WHEN 'ver_cuenta' THEN ARRAY['usuarioId']
   WHEN 'historial' THEN ARRAY['usuarioId','limite','desplazamiento']
   WHEN 'asignar_rol' THEN ARRAY['usuarioId','rol','ambito','actividades','vigenteDesde','vigenteHasta','motivo']
   WHEN 'retirar_rol' THEN ARRAY['usuarioId','rol','motivo']
   WHEN 'cambiar_estado' THEN ARRAY['usuarioId','estatus','motivo'] END;
 IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE NOT k=ANY(claves)) THEN
   RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE='22023';
 END IF;
 IF operacion='listar_roles' THEN
   RETURN (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.codigo),'[]'::jsonb) FROM public.rol r);
 END IF;
 IF operacion IN ('listar_cuentas','historial') THEN
   limite:=coalesce((datos->>'limite')::integer,25);
   desplazamiento:=coalesce((datos->>'desplazamiento')::integer,0);
   IF limite NOT BETWEEN 1 AND 100 OR desplazamiento NOT BETWEEN 0 AND 100000 THEN
     RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE='22023'; END IF;
 END IF;
 IF operacion='listar_cuentas' THEN
   busqueda:=coalesce(datos->>'busqueda','');
   IF length(busqueda)>100 THEN RAISE EXCEPTION 'Búsqueda inválida.' USING ERRCODE='22023'; END IF;
   SELECT count(*) INTO total FROM public.perfil p JOIN auth.users u ON u.id=p.id
    WHERE concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido",u.email) ILIKE '%'||busqueda||'%';
   SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]'::jsonb) INTO salida FROM (
     SELECT p.id,p.nombres,p."primerApellido",p."segundoApellido",p.estatus,u.email as correo,
       u.email_confirmed_at IS NOT NULL AS "correoConfirmado",privado.roles_de_cuenta(p.id) as roles
     FROM public.perfil p JOIN auth.users u ON u.id=p.id
     WHERE concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido",u.email) ILIKE '%'||busqueda||'%'
     ORDER BY p.id LIMIT limite OFFSET desplazamiento
   ) q;
   RETURN jsonb_build_object('total',total,'cuentas',salida,'limite',limite,'desplazamiento',desplazamiento);
 END IF;
 destino:=(datos->>'usuarioId')::uuid;
 IF destino IS NULL OR NOT EXISTS (SELECT 1 FROM public.perfil WHERE id=destino) THEN
   RAISE EXCEPTION 'Cuenta no encontrada.' USING ERRCODE='P0002'; END IF;
 IF operacion='ver_cuenta' THEN
   RETURN (SELECT jsonb_build_object('id',p.id,'nombres',p.nombres,'primerApellido',p."primerApellido",
     'segundoApellido',p."segundoApellido",'estatus',p.estatus,'correo',u.email,
     'correoConfirmado',u.email_confirmed_at IS NOT NULL,'roles',privado.roles_de_cuenta(p.id))
     FROM public.perfil p JOIN auth.users u ON u.id=p.id WHERE p.id=destino);
 ELSIF operacion='historial' THEN
   SELECT count(*) INTO total FROM public."historialCuenta" WHERE "usuarioId"=destino;
   SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q."realizadoEn" DESC,q.id),'[]'::jsonb) INTO salida FROM (
     SELECT * FROM public."historialCuenta" WHERE "usuarioId"=destino ORDER BY "realizadoEn" DESC,id LIMIT limite OFFSET desplazamiento
   ) q;
   RETURN jsonb_build_object('total',total,'cambios',salida);
 END IF;
 motivo:=btrim(datos->>'motivo');
 IF motivo IS NULL OR length(motivo) NOT BETWEEN 1 AND 500 THEN
   RAISE EXCEPTION 'Motivo obligatorio.' USING ERRCODE='22023'; END IF;
 -- Los roles y el estado se escriben con la bitácora en la misma transacción.
 PERFORM 1 FROM public.perfil WHERE id=destino FOR UPDATE;
 IF operacion IN ('asignar_rol','retirar_rol') THEN
   v_codigo:=datos->>'rol';
   IF v_codigo IS NULL OR NOT EXISTS (SELECT 1 FROM public.rol WHERE rol.codigo=v_codigo) THEN
     RAISE EXCEPTION 'Rol no encontrado.' USING ERRCODE='P0002'; END IF;
   antes:=jsonb_build_object('roles',privado.roles_de_cuenta(destino));
   IF operacion='asignar_rol' THEN
     IF NOT EXISTS (SELECT 1 FROM public.perfil p JOIN auth.users u ON u.id=p.id
       WHERE p.id=destino AND p.estatus='activo' AND u.email_confirmed_at IS NOT NULL) THEN
       RAISE EXCEPTION 'Se requiere cuenta activa y verificada.' USING ERRCODE='23514'; END IF;
     ambito:=coalesce(datos->>'ambito','global');
     desde:=coalesce((datos->>'vigenteDesde')::timestamptz,statement_timestamp());
     hasta:=(datos->>'vigenteHasta')::timestamptz;
     IF ambito NOT IN ('global','actividades_asignadas') OR (hasta IS NOT NULL AND (hasta<=desde OR hasta<=statement_timestamp())) THEN
       RAISE EXCEPTION 'Vigencia o ámbito inválidos.' USING ERRCODE='23514'; END IF;
     IF jsonb_typeof(coalesce(datos->'actividades','[]'::jsonb))<>'array' THEN
       RAISE EXCEPTION 'Actividades inválidas.' USING ERRCODE='22023'; END IF;
     SELECT coalesce(array_agg(value::uuid),ARRAY[]::uuid[]) INTO actividades
       FROM jsonb_array_elements_text(coalesce(datos->'actividades','[]'::jsonb));
     IF cardinality(actividades)>100 OR cardinality(actividades)<>(SELECT count(DISTINCT a) FROM unnest(actividades) a)
        OR (ambito='global' AND cardinality(actividades)<>0)
        OR (ambito='actividades_asignadas' AND (cardinality(actividades)=0 OR v_codigo NOT IN ('responsable_actividades','publicador')))
        OR (SELECT count(*) FROM public.actividad WHERE id=ANY(actividades))<>cardinality(actividades) THEN
       RAISE EXCEPTION 'Alcance de actividades inválido.' USING ERRCODE='23514'; END IF;
     IF v_codigo='administrador' AND (ambito<>'global' OR hasta IS NOT NULL OR desde>statement_timestamp()) THEN
       RAISE EXCEPTION 'La administración debe ser actual, global y sin vencimiento automático.' USING ERRCODE='23514'; END IF;
     INSERT INTO public."rolUsuario" ("usuarioId","rolCodigo","asignadoPor","motivoAsignacion",ambito,"vigenteDesde","vigenteHasta")
       VALUES(destino,v_codigo,actor,motivo,ambito,desde,hasta)
       ON CONFLICT("usuarioId","rolCodigo") DO UPDATE SET "asignadoPor"=actor,"asignadoEn"=now(),
       "motivoAsignacion"=motivo,ambito=EXCLUDED.ambito,"vigenteDesde"=desde,"vigenteHasta"=hasta;
     DELETE FROM public."ambitoRol" WHERE "usuarioId"=destino AND "rolCodigo"=v_codigo;
     INSERT INTO public."ambitoRol" SELECT destino,v_codigo,a FROM unnest(actividades) a;
   ELSE
     IF NOT EXISTS (SELECT 1 FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"=v_codigo) THEN
       RAISE EXCEPTION 'Rol no asignado.' USING ERRCODE='P0002'; END IF;
     DELETE FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"=v_codigo;
   END IF;
   despues:=jsonb_build_object('roles',privado.roles_de_cuenta(destino));
 ELSE
   estado:=datos->>'estatus';
   IF estado IS NULL OR estado NOT IN ('activo','inactivo','bloqueado') THEN
     RAISE EXCEPTION 'Estado inválido.' USING ERRCODE='22023'; END IF;
   SELECT jsonb_build_object('estatus',estatus) INTO antes FROM public.perfil WHERE id=destino;
   IF antes->>'estatus'=estado THEN
     RAISE EXCEPTION 'La cuenta ya tiene ese estado.' USING ERRCODE='23514'; END IF;
   UPDATE public.perfil SET estatus=estado WHERE id=destino;
   IF estado<>'activo' THEN
     -- Las sesiones previas no recuperan vigencia cuando se reactiva la cuenta.
     UPDATE auth.sessions SET not_after=least(coalesce(not_after,statement_timestamp()),statement_timestamp()) WHERE user_id=destino;
   END IF;
   despues:=jsonb_build_object('estatus',estado);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public."rolUsuario" r JOIN public.perfil p ON p.id=r."usuarioId"
   JOIN auth.users u ON u.id=p.id WHERE r."rolCodigo"='administrador' AND p.estatus='activo'
   AND u.email_confirmed_at IS NOT NULL AND r."vigenteDesde"<=statement_timestamp()
   AND (r."vigenteHasta" IS NULL OR r."vigenteHasta">statement_timestamp())) THEN
   RAISE EXCEPTION 'No se puede dejar al portal sin administración recuperable.' USING ERRCODE='23514';
 END IF;
 INSERT INTO public."historialCuenta"("usuarioId","realizadoPor",accion,motivo,anterior,posterior)
 VALUES(destino,actor,operacion,motivo,antes,despues);
 RETURN jsonb_build_object('usuarioId',destino,'accion',operacion,'resultado',despues);
END;
$$;
REVOKE ALL ON FUNCTION public.administrar_cuentas(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.administrar_cuentas(text,jsonb) TO authenticated;
