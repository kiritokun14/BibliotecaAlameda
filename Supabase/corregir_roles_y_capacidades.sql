-- Corrección acordada: solo Usuario, Editor y Administrador.
-- Los actores/funciones de la biblioteca se representan mediante capacidades, no roles nuevos.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public."rolUsuario" WHERE "rolCodigo" NOT IN ('usuario','editor','administrador'))
    OR EXISTS (SELECT 1 FROM public."ambitoRol") THEN
   RAISE EXCEPTION 'Hay asignaciones anteriores: requieren conversión explícita, sin pérdida de datos.';
 END IF;
END; $$;

-- Se reutiliza la tabla vacía de ámbitos; no se añade una tabla paralela.
CREATE OR REPLACE FUNCTION privado.roles_de_cuenta(usuario uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('actividades','[]'::jsonb) ORDER BY r."rolCodigo"),'[]'::jsonb)
 FROM public."rolUsuario" r WHERE r."usuarioId"=usuario;
$$;
ALTER TABLE public."ambitoRol" RENAME TO "permisoCuenta";
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public."permisoCuenta"'::regclass
   AND (contype='p' OR (contype='f' AND confrelid='public."rolUsuario"'::regclass)) LOOP
   EXECUTE format('ALTER TABLE public."permisoCuenta" DROP CONSTRAINT %I',c.conname);
 END LOOP;
END; $$;
ALTER TABLE public."permisoCuenta" RENAME COLUMN "rolCodigo" TO capacidad;
ALTER TABLE public."permisoCuenta"
 ALTER COLUMN "actividadId" DROP NOT NULL,
 ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ADD COLUMN "vigenteDesde" timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN "vigenteHasta" timestamptz,
 ADD COLUMN "asignadoPor" uuid NOT NULL REFERENCES public.perfil(id) ON DELETE RESTRICT,
 ADD COLUMN "asignadoEn" timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN motivo text NOT NULL CHECK(length(btrim(motivo)) BETWEEN 1 AND 500),
 ADD FOREIGN KEY ("usuarioId") REFERENCES public.perfil(id) ON DELETE RESTRICT,
 ADD UNIQUE NULLS NOT DISTINCT ("usuarioId",capacidad,"actividadId"),
 ADD CHECK ("vigenteHasta" IS NULL OR "vigenteHasta">"vigenteDesde"),
 ADD CHECK (capacidad IN ('preparar_contenidos','gestionar_actividades','confirmar_inscripciones','registrar_asistencia',
  'moderar_foro','registrar_recompensas','alta_asistida','orientar_recuperacion','atender_contactos','validar_credenciales','publicar_contenidos'));
ALTER POLICY lectura_ambitos_propios ON public."permisoCuenta" RENAME TO lectura_permisos_propios;
ALTER INDEX public.ambito_rol_actividad_idx RENAME TO permiso_cuenta_actividad_idx;
CREATE INDEX permiso_cuenta_actor_idx ON public."permisoCuenta"("asignadoPor");
REVOKE ALL ON public."permisoCuenta" FROM anon,authenticated,service_role;
GRANT SELECT ON public."permisoCuenta" TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public."permisoCuenta" TO service_role;

DELETE FROM public.rol WHERE codigo IN ('responsable_actividades','servicios_digitales','prestamos','publicador');
INSERT INTO public.rol(codigo,nombre,descripcion) VALUES
 ('usuario','Usuario','Cuenta básica: únicamente sus datos y gestiones propias.'),
 ('editor','Editor','Acceso operativo del personal con capacidades concedidas expresamente.'),
 ('administrador','Administrador','Administración de cuentas y permisos; no recibe facultades operativas automáticamente.')
ON CONFLICT(codigo) DO UPDATE SET nombre=EXCLUDED.nombre,descripcion=EXCLUDED.descripcion;
ALTER TABLE public.rol ADD CONSTRAINT solo_tres_roles CHECK(codigo IN ('usuario','editor','administrador'));
ALTER TABLE public."rolUsuario" ADD CONSTRAINT roles_globales CHECK(ambito='global');
ALTER TABLE public."rolUsuario" ADD CONSTRAINT usuario_sin_vencimiento CHECK("rolCodigo"<>'usuario' OR "vigenteHasta" IS NULL);
INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion")
 SELECT id,'usuario',id,'Rol básico de la cuenta, sin privilegios del personal' FROM public.perfil
 ON CONFLICT("usuarioId","rolCodigo") DO NOTHING;
CREATE FUNCTION privado.asignar_rol_basico()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion")
 VALUES(NEW.id,'usuario',NEW.id,'Rol básico de la cuenta, sin privilegios del personal');
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION privado.asignar_rol_basico() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER asignar_rol_basico AFTER INSERT ON public.perfil FOR EACH ROW EXECUTE FUNCTION privado.asignar_rol_basico();

DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public."historialCuenta"'::regclass
  AND contype='c' AND pg_get_constraintdef(oid) LIKE '%accion%' LOOP
   EXECUTE format('ALTER TABLE public."historialCuenta" DROP CONSTRAINT %I',c.conname);
 END LOOP;
END; $$;
ALTER TABLE public."historialCuenta" ADD CONSTRAINT acciones_cuenta CHECK(accion IN
 ('asignar_rol','retirar_rol','cambiar_estado','asignar_capacidad','retirar_capacidad','guardar_acceso'));

CREATE FUNCTION privado.permisos_de_cuenta(usuario uuid,efectivos boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('ambito',CASE WHEN p."actividadId" IS NULL THEN 'global' ELSE 'actividades_asignadas' END)
 ORDER BY p.capacidad,p."actividadId"),'[]'::jsonb)
 FROM public."permisoCuenta" p WHERE p."usuarioId"=usuario AND (NOT efectivos OR (
   p."vigenteDesde"<=statement_timestamp() AND (p."vigenteHasta" IS NULL OR p."vigenteHasta">statement_timestamp())
   AND EXISTS (SELECT 1 FROM public."rolUsuario" r WHERE r."usuarioId"=usuario AND r."rolCodigo"='editor'
    AND r."vigenteDesde"<=statement_timestamp() AND (r."vigenteHasta" IS NULL OR r."vigenteHasta">statement_timestamp()))
 ));
$$;
REVOKE ALL ON FUNCTION privado.permisos_de_cuenta(uuid,boolean) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION privado.administrar_roles_cuenta(operacion text, datos jsonb DEFAULT '{}'::jsonb)
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
   IF v_codigo='usuario' THEN RAISE EXCEPTION 'El rol básico no se asigna ni se retira manualmente.' USING ERRCODE='23514'; END IF;
   antes:=jsonb_build_object('roles',privado.roles_de_cuenta(destino),'permisosAdicionales',privado.permisos_de_cuenta(destino));
   IF operacion='asignar_rol' THEN
     IF NOT EXISTS (SELECT 1 FROM public.perfil p JOIN auth.users u ON u.id=p.id
       WHERE p.id=destino AND p.estatus='activo' AND u.email_confirmed_at IS NOT NULL) THEN
       RAISE EXCEPTION 'Se requiere cuenta activa y verificada.' USING ERRCODE='23514'; END IF;
     ambito:=coalesce(datos->>'ambito','global');
     desde:=coalesce((datos->>'vigenteDesde')::timestamptz,statement_timestamp());
     hasta:=(datos->>'vigenteHasta')::timestamptz;
     IF ambito<>'global' OR (hasta IS NOT NULL AND (hasta<=desde OR hasta<=statement_timestamp())) THEN
       RAISE EXCEPTION 'Vigencia o ámbito inválidos.' USING ERRCODE='23514'; END IF;
     IF jsonb_typeof(coalesce(datos->'actividades','[]'::jsonb))<>'array' THEN
       RAISE EXCEPTION 'Actividades inválidas.' USING ERRCODE='22023'; END IF;
     SELECT coalesce(array_agg(value::uuid),ARRAY[]::uuid[]) INTO actividades
       FROM jsonb_array_elements_text(coalesce(datos->'actividades','[]'::jsonb));
     IF cardinality(actividades)>100 OR cardinality(actividades)<>(SELECT count(DISTINCT a) FROM unnest(actividades) a)
        OR (ambito='global' AND cardinality(actividades)<>0)
        OR cardinality(actividades)<>0
        OR (SELECT count(*) FROM public.actividad WHERE id=ANY(actividades))<>cardinality(actividades) THEN
       RAISE EXCEPTION 'Alcance de actividades inválido.' USING ERRCODE='23514'; END IF;
     IF v_codigo='administrador' AND (ambito<>'global' OR hasta IS NOT NULL OR desde>statement_timestamp()) THEN
       RAISE EXCEPTION 'La administración debe ser actual, global y sin vencimiento automático.' USING ERRCODE='23514'; END IF;
     INSERT INTO public."rolUsuario" ("usuarioId","rolCodigo","asignadoPor","motivoAsignacion",ambito,"vigenteDesde","vigenteHasta")
       VALUES(destino,v_codigo,actor,motivo,ambito,desde,hasta)
       ON CONFLICT("usuarioId","rolCodigo") DO UPDATE SET "asignadoPor"=actor,"asignadoEn"=now(),
       "motivoAsignacion"=motivo,ambito=EXCLUDED.ambito,"vigenteDesde"=desde,"vigenteHasta"=hasta;

   ELSE
     IF NOT EXISTS (SELECT 1 FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"=v_codigo) THEN
       RAISE EXCEPTION 'Rol no asignado.' USING ERRCODE='P0002'; END IF;
     DELETE FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"=v_codigo;
     IF v_codigo='editor' THEN DELETE FROM public."permisoCuenta" WHERE "usuarioId"=destino; END IF;
   END IF;
   despues:=jsonb_build_object('roles',privado.roles_de_cuenta(destino),'permisosAdicionales',privado.permisos_de_cuenta(destino));
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

REVOKE ALL ON FUNCTION privado.administrar_roles_cuenta(text,jsonb) FROM PUBLIC,anon,authenticated;


CREATE OR REPLACE FUNCTION privado.administrar_cuentas(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid; destino uuid; respuesta jsonb; antes jsonb; despues jsonb; motivo text; cap text;
 desde timestamptz; hasta timestamptz; ambito text; actividades uuid[]; a uuid; item text;
 catalogo text[]:=ARRAY['preparar_contenidos','gestionar_actividades','confirmar_inscripciones','registrar_asistencia',
 'moderar_foro','registrar_recompensas','alta_asistida','orientar_recuperacion','atender_contactos','validar_credenciales','publicar_contenidos'];
 roles_deseados text[]; capacidades_deseadas text[];
BEGIN
 IF operacion IS NULL OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'Petición inválida.' USING ERRCODE='22023'; END IF;
 IF operacion IN ('asignar_rol','retirar_rol','cambiar_estado','asignar_capacidad','retirar_capacidad','guardar_acceso') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('biblioteca.administrar_cuentas',0)); END IF;
 actor:=privado.comprobar_sesion_cuenta();
 IF operacion NOT IN ('listar_capacidades','asignar_capacidad','retirar_capacidad','guardar_acceso') THEN
  respuesta:=privado.administrar_roles_cuenta(operacion,datos);
  IF operacion='mi_acceso' THEN RETURN respuesta||jsonb_build_object('permisosAdicionales',privado.permisos_de_cuenta(actor,true)); END IF;
  IF operacion='ver_cuenta' THEN RETURN respuesta||jsonb_build_object('permisosAdicionales',privado.permisos_de_cuenta((datos->>'usuarioId')::uuid)); END IF;
  IF operacion='listar_cuentas' THEN
   RETURN respuesta||jsonb_build_object('cuentas',(SELECT coalesce(jsonb_agg(c||jsonb_build_object('permisosAdicionales',
    privado.permisos_de_cuenta((c->>'id')::uuid))),'[]'::jsonb) FROM jsonb_array_elements(respuesta->'cuentas') c));
  END IF;
  RETURN respuesta;
 END IF;
 -- La misma comprobación de administrador que protege la gestión de roles.
 PERFORM privado.administrar_roles_cuenta('listar_roles');
 IF operacion='listar_capacidades' THEN
  IF datos<>'{}'::jsonb THEN RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE='22023'; END IF;
  RETURN (SELECT jsonb_agg(jsonb_build_object('codigo',c,'admiteActividades',c=ANY(ARRAY['preparar_contenidos','gestionar_actividades',
   'confirmar_inscripciones','registrar_asistencia','registrar_recompensas','publicar_contenidos']))) FROM unnest(catalogo) c);
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('usuarioId','capacidad','ambito','actividades',
  'vigenteDesde','vigenteHasta','motivo','roles','capacidades')) THEN
  RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE='22023'; END IF;
 destino:=(datos->>'usuarioId')::uuid; motivo:=btrim(datos->>'motivo');
 IF motivo IS NULL OR length(motivo) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Motivo obligatorio.' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.perfil WHERE id=destino FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta inexistente.' USING ERRCODE='P0002'; END IF;
 antes:=jsonb_build_object('roles',privado.roles_de_cuenta(destino),'permisosAdicionales',privado.permisos_de_cuenta(destino));
 IF operacion='guardar_acceso' THEN
  IF jsonb_typeof(datos->'roles') IS DISTINCT FROM 'array' OR jsonb_typeof(datos->'capacidades') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Selección inválida.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO roles_deseados FROM jsonb_array_elements_text(datos->'roles');
  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO capacidades_deseadas FROM jsonb_array_elements_text(datos->'capacidades');
  IF cardinality(roles_deseados)>2 OR NOT roles_deseados<@ARRAY['editor','administrador']::text[]
   OR cardinality(capacidades_deseadas)>11 OR NOT capacidades_deseadas<@catalogo
   OR cardinality(roles_deseados)<>(SELECT count(DISTINCT x) FROM unnest(roles_deseados) x)
   OR cardinality(capacidades_deseadas)<>(SELECT count(DISTINCT x) FROM unnest(capacidades_deseadas) x)
   OR (cardinality(capacidades_deseadas)>0 AND NOT 'editor'=ANY(roles_deseados)) THEN
   RAISE EXCEPTION 'Roles o capacidades inválidos.' USING ERRCODE='23514'; END IF;
  -- Primero incorporar roles; después retirar. Un error revierte la selección completa.
  FOREACH item IN ARRAY roles_deseados LOOP
   IF NOT EXISTS(SELECT 1 FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"=item
     AND "vigenteDesde"<=statement_timestamp() AND ("vigenteHasta" IS NULL OR "vigenteHasta">statement_timestamp())) THEN
    PERFORM privado.administrar_roles_cuenta('asignar_rol',jsonb_build_object('usuarioId',destino,'rol',item,'motivo',motivo)); END IF;
  END LOOP;
  DELETE FROM public."permisoCuenta" WHERE "usuarioId"=destino;
  FOREACH item IN ARRAY capacidades_deseadas LOOP
   PERFORM privado.administrar_cuentas('asignar_capacidad',(datos-'roles'-'capacidades')||jsonb_build_object('capacidad',item));
  END LOOP;
  FOR item IN SELECT "rolCodigo" FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"<>'usuario' AND NOT "rolCodigo"=ANY(roles_deseados) ORDER BY ("rolCodigo"='administrador') LOOP
   PERFORM privado.administrar_roles_cuenta('retirar_rol',jsonb_build_object('usuarioId',destino,'rol',item,'motivo',motivo));
  END LOOP;

 ELSE
  cap:=datos->>'capacidad';
  IF cap IS NULL OR NOT cap=ANY(catalogo) THEN RAISE EXCEPTION 'Capacidad inexistente.' USING ERRCODE='22023'; END IF;
  IF operacion='asignar_capacidad' THEN
   IF NOT EXISTS(SELECT 1 FROM public."rolUsuario" r JOIN public.perfil p ON p.id=r."usuarioId" JOIN auth.users u ON u.id=p.id
    WHERE r."usuarioId"=destino AND r."rolCodigo"='editor' AND p.estatus='activo' AND u.email_confirmed_at IS NOT NULL
     AND r."vigenteDesde"<=statement_timestamp() AND (r."vigenteHasta" IS NULL OR r."vigenteHasta">statement_timestamp())) THEN
    RAISE EXCEPTION 'Se requiere Editor activo y verificado.' USING ERRCODE='23514'; END IF;
   ambito:=coalesce(datos->>'ambito','global'); desde:=coalesce((datos->>'vigenteDesde')::timestamptz,statement_timestamp()); hasta:=(datos->>'vigenteHasta')::timestamptz;
   IF ambito NOT IN ('global','actividades_asignadas') OR (hasta IS NOT NULL AND (hasta<=desde OR hasta<=statement_timestamp()))
    OR jsonb_typeof(coalesce(datos->'actividades','[]'::jsonb))<>'array' THEN
    RAISE EXCEPTION 'Ámbito o vigencia inválidos.' USING ERRCODE='23514'; END IF;
   SELECT coalesce(array_agg(value::uuid),ARRAY[]::uuid[]) INTO actividades FROM jsonb_array_elements_text(coalesce(datos->'actividades','[]'::jsonb));
   IF cardinality(actividades)>100 OR cardinality(actividades)<>(SELECT count(DISTINCT x) FROM unnest(actividades) x)
    OR (ambito='global' AND cardinality(actividades)>0)
    OR (ambito='actividades_asignadas' AND (cardinality(actividades)=0 OR NOT cap=ANY(ARRAY['preparar_contenidos','gestionar_actividades',
     'confirmar_inscripciones','registrar_asistencia','registrar_recompensas','publicar_contenidos'])))
    OR (SELECT count(*) FROM public.actividad WHERE id=ANY(actividades))<>cardinality(actividades) THEN
    RAISE EXCEPTION 'Alcance inválido.' USING ERRCODE='23514'; END IF;
   DELETE FROM public."permisoCuenta" WHERE "usuarioId"=destino AND capacidad=cap;
   IF ambito='global' THEN actividades:=ARRAY[NULL::uuid]; END IF;
   FOREACH a IN ARRAY actividades LOOP
    INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"actividadId","vigenteDesde","vigenteHasta","asignadoPor",motivo)
    VALUES(destino,cap,a,desde,hasta,actor,motivo);
   END LOOP;
  ELSE
   DELETE FROM public."permisoCuenta" WHERE "usuarioId"=destino AND capacidad=cap;
   IF NOT FOUND THEN RAISE EXCEPTION 'Capacidad no asignada.' USING ERRCODE='P0002'; END IF;
  END IF;
 END IF;
 despues:=jsonb_build_object('roles',privado.roles_de_cuenta(destino),'permisosAdicionales',privado.permisos_de_cuenta(destino));
 INSERT INTO public."historialCuenta"("usuarioId","realizadoPor",accion,motivo,anterior,posterior)
 VALUES(destino,actor,operacion,motivo,antes,despues);
 RETURN jsonb_build_object('usuarioId',destino,'accion',operacion,'resultado',despues);
END;
$$;
REVOKE ALL ON FUNCTION privado.administrar_cuentas(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION privado.administrar_cuentas(text,jsonb) TO authenticated;
