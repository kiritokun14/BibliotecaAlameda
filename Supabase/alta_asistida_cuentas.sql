-- T-033 / HU-09. Alta de cuentas asistida por Servicios Digitales (capacidad alta_asistida).
-- El operador prepara la solicitud; el servidor envía la invitación de Supabase Auth y el titular
-- verifica su correo y elige su contraseña en privado. Nunca se crea una cuenta solo con teléfono.
-- Un posible duplicado queda en revisión y no se fusionan identidades sin verificación (CA-09.2).

CREATE TABLE public."altaAsistida" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 correo text NOT NULL CHECK (length(correo) BETWEEN 3 AND 254 AND correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 estado text NOT NULL CHECK (estado IN ('lista','en_revision','invitada','descartada','cancelada')),
 -- Los datos personales solo se conservan mientras la solicitud está abierta.
 datos jsonb,
 candidatos uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
 motivo text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 1 AND 500),
 "solicitadoPor" uuid NOT NULL REFERENCES public.perfil(id) ON DELETE RESTRICT,
 "solicitadoEn" timestamptz NOT NULL DEFAULT now(),
 "resueltoPor" uuid REFERENCES public.perfil(id) ON DELETE RESTRICT,
 "resueltoEn" timestamptz,
 "motivoResolucion" text CHECK (length(btrim("motivoResolucion")) BETWEEN 1 AND 500),
 "usuarioId" uuid REFERENCES public.perfil(id) ON DELETE RESTRICT,
 "invitadaEn" timestamptz,
 CONSTRAINT datos_solo_abiertas CHECK ((estado IN ('lista','en_revision')) = (datos IS NOT NULL)),
 CONSTRAINT invitada_con_cuenta CHECK ((estado='invitada') = ("usuarioId" IS NOT NULL))
);
CREATE UNIQUE INDEX alta_asistida_correo_abierta_idx ON public."altaAsistida"(lower(correo)) WHERE estado IN ('lista','en_revision');
CREATE INDEX alta_asistida_estado_idx ON public."altaAsistida"(estado,"solicitadoEn");
CREATE INDEX alta_asistida_solicitado_idx ON public."altaAsistida"("solicitadoPor");
CREATE INDEX alta_asistida_resuelto_idx ON public."altaAsistida"("resueltoPor");
CREATE INDEX alta_asistida_usuario_idx ON public."altaAsistida"("usuarioId");
ALTER TABLE public."altaAsistida" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."altaAsistida" FROM anon,authenticated;
GRANT SELECT ON public."altaAsistida" TO service_role;

ALTER TABLE public."historialCuenta" DROP CONSTRAINT acciones_cuenta;
ALTER TABLE public."historialCuenta" ADD CONSTRAINT acciones_cuenta CHECK (accion IN
 ('asignar_rol','retirar_rol','cambiar_estado','asignar_capacidad','retirar_capacidad','guardar_acceso','alta_asistida'));

-- Las mismas reglas del autorregistro (CU-05), reutilizadas por el alta asistida antes de invitar.
CREATE FUNCTION privado.validar_datos_registro(datos jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
DECLARE
  tutor jsonb;
  nacimiento date;
  campo text;
  hoy date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::date;
BEGIN
  IF jsonb_typeof(datos) IS DISTINCT FROM 'object' OR octet_length(datos::text) > 16000 THEN
    RAISE EXCEPTION 'Datos de registro obligatorios o demasiado extensos.' USING ERRCODE = '23514';
  END IF;
  IF NOT (datos->'aceptaAviso' = 'true'::jsonb) OR datos->'aceptaAviso' IS NULL THEN
    RAISE EXCEPTION 'Se requiere aceptar el aviso de privacidad.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) AS k(campo)
     WHERE k.campo NOT IN ('nombres','primerApellido','segundoApellido','fechaNacimiento','telefono','domicilio','aceptaAviso','tutor')) THEN
    RAISE EXCEPTION 'Campos de registro no permitidos.' USING ERRCODE = '23514';
  END IF;
  FOREACH campo IN ARRAY ARRAY['nombres','primerApellido','fechaNacimiento','telefono'] LOOP
    IF jsonb_typeof(datos->campo) IS DISTINCT FROM 'string'
       OR length(btrim(datos->>campo)) NOT BETWEEN 1 AND 150 THEN
      RAISE EXCEPTION 'Datos personales incompletos o inválidos.' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  IF datos ? 'segundoApellido' AND (jsonb_typeof(datos->'segundoApellido') IS DISTINCT FROM 'string'
    OR length(btrim(datos->>'segundoApellido')) NOT BETWEEN 1 AND 150) THEN
    RAISE EXCEPTION 'Segundo apellido inválido.' USING ERRCODE = '23514';
  END IF;
  IF (datos->>'telefono') !~ '^[0-9]{10}$' OR (datos->>'fechaNacimiento') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Teléfono o fecha inválidos.' USING ERRCODE = '23514';
  END IF;
  nacimiento := (datos->>'fechaNacimiento')::date;
  IF nacimiento > hoy THEN
    RAISE EXCEPTION 'Fecha de nacimiento futura.' USING ERRCODE = '23514';
  END IF;
  PERFORM privado.validar_domicilio_registro(datos->'domicilio');
  IF nacimiento > (hoy - INTERVAL '18 years')::date THEN
    tutor := datos->'tutor';
    IF jsonb_typeof(tutor) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Se requiere el contacto del tutor.' USING ERRCODE = '23514';
    END IF;
    FOREACH campo IN ARRAY ARRAY['nombres','apellidos','telefono','correo','relacion'] LOOP
      IF jsonb_typeof(tutor->campo) IS DISTINCT FROM 'string'
         OR length(btrim(tutor->>campo)) NOT BETWEEN 1 AND 254 THEN
        RAISE EXCEPTION 'Datos del tutor incompletos o inválidos.' USING ERRCODE = '23514';
      END IF;
    END LOOP;
    IF (tutor->>'telefono') !~ '^[0-9]{10}$'
       OR (tutor->>'correo') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       OR (tutor->>'relacion') NOT IN ('madre','padre','tutor') THEN
      RAISE EXCEPTION 'Contacto del tutor inválido.' USING ERRCODE = '23514';
    END IF;
    PERFORM privado.validar_domicilio_registro(tutor->'domicilio');
  ELSIF datos ? 'tutor' THEN
    RAISE EXCEPTION 'El adulto no requiere contacto de tutor.' USING ERRCODE = '23514';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION privado.validar_datos_registro(jsonb) FROM PUBLIC, anon, authenticated;

-- Mismo registro atómico de T-027. Si la cuenta viene de una invitación de alta asistida,
-- los datos se toman de la solicitud (no del metadata) y se registra al operador.
CREATE OR REPLACE FUNCTION privado.crear_perfil_autorregistro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  datos jsonb := NEW.raw_user_meta_data->'registro';
  domicilio jsonb;
  tutor jsonb;
  direccion_tutor jsonb;
  nacimiento date;
  solicitud_id uuid;
  solicitud public."altaAsistida"%ROWTYPE;
BEGIN
  IF NEW.raw_user_meta_data ? 'altaAsistida' THEN
    -- Una invitación no lleva contraseña; un autorregistro sí. El titular la elige al aceptar.
    IF NEW.raw_user_meta_data ? 'registro' OR coalesce(NEW.encrypted_password,'')<>'' THEN
      RAISE EXCEPTION 'Solicitud de alta asistida inválida.' USING ERRCODE = '23514';
    END IF;
    BEGIN solicitud_id := (NEW.raw_user_meta_data->>'altaAsistida')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Solicitud de alta asistida inválida.' USING ERRCODE = '23514';
    END;
    SELECT * INTO solicitud FROM public."altaAsistida" WHERE id = solicitud_id FOR UPDATE;
    IF NOT FOUND OR solicitud.estado <> 'lista' OR lower(solicitud.correo) <> lower(NEW.email) THEN
      RAISE EXCEPTION 'Solicitud de alta asistida inválida.' USING ERRCODE = '23514';
    END IF;
    datos := solicitud.datos;
  END IF;
  PERFORM privado.validar_datos_registro(datos);
  nacimiento := (datos->>'fechaNacimiento')::date;
  domicilio := datos->'domicilio';
  tutor := datos->'tutor';
  INSERT INTO public.perfil (id,nombres,"primerApellido","segundoApellido","fechaNacimiento",telefono,
    calle,"numeroExterior","numeroInterior","coloniaLocalidad","codigoPostal",municipio,"estadoProvincia","avisoAceptadoEn","creadoPor")
  VALUES (NEW.id,btrim(datos->>'nombres'),btrim(datos->>'primerApellido'),datos->>'segundoApellido',nacimiento,datos->>'telefono',
    domicilio->>'calle',domicilio->>'numeroExterior',domicilio->>'numeroInterior',domicilio->>'coloniaLocalidad',
    domicilio->>'codigoPostal',domicilio->>'municipio',domicilio->>'estadoProvincia',CURRENT_TIMESTAMP,solicitud."solicitadoPor");
  IF tutor IS NOT NULL THEN
    direccion_tutor := tutor->'domicilio';
    INSERT INTO public."contactoTutor" ("usuarioId",nombres,apellidos,telefono,correo,direccion,relacion)
    VALUES (NEW.id,btrim(tutor->>'nombres'),btrim(tutor->>'apellidos'),tutor->>'telefono',tutor->>'correo',
      concat_ws(', ',direccion_tutor->>'calle',direccion_tutor->>'numeroExterior',
        direccion_tutor->>'numeroInterior',direccion_tutor->>'coloniaLocalidad',direccion_tutor->>'codigoPostal',
        direccion_tutor->>'municipio',direccion_tutor->>'estadoProvincia'),tutor->>'relacion');
  END IF;
  -- Ejecutar las comprobaciones diferidas con el contexto privado de esta función.
  -- Auth no necesita permisos de lectura/escritura sobre las tablas de perfiles.
  SET CONSTRAINTS public.comprobar_tutor_perfil, public.conservar_tutor_menor IMMEDIATE;
  SET CONSTRAINTS public.comprobar_tutor_perfil, public.conservar_tutor_menor DEFERRED;
  IF solicitud_id IS NOT NULL THEN
    UPDATE public."altaAsistida" SET estado='invitada',"usuarioId"=NEW.id,"invitadaEn"=CURRENT_TIMESTAMP,datos=NULL
      WHERE id = solicitud_id;
    INSERT INTO public."historialCuenta"("usuarioId","realizadoPor",accion,motivo,anterior,posterior)
    VALUES (NEW.id,solicitud."solicitadoPor",'alta_asistida',solicitud.motivo,'{}'::jsonb,
      jsonb_build_object('solicitud',solicitud_id,'revisadaPor',solicitud."resueltoPor"));
  END IF;
  -- Los datos personales quedan en tablas protegidas, no se duplican en JWT/user_metadata.
  UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data - 'registro' - 'altaAsistida' WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION privado.crear_perfil_autorregistro() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION privado.limpiar_metadata_registro()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  NEW.raw_user_meta_data := NEW.raw_user_meta_data - 'registro' - 'altaAsistida';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION privado.limpiar_metadata_registro() FROM PUBLIC, anon, authenticated;

-- Cuentas que podrían ser la misma persona: mismo nombre y fecha, o mismo teléfono y fecha.
CREATE FUNCTION privado.posibles_duplicados(datos jsonb)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
 SELECT coalesce(array_agg(p.id ORDER BY p.id),ARRAY[]::uuid[]) FROM public.perfil p
 WHERE p."fechaNacimiento" = (datos->>'fechaNacimiento')::date
   AND (p.telefono = datos->>'telefono'
     OR (lower(btrim(p.nombres)) = lower(btrim(datos->>'nombres'))
       AND lower(btrim(p."primerApellido")) = lower(btrim(datos->>'primerApellido'))));
$$;
REVOKE ALL ON FUNCTION privado.posibles_duplicados(jsonb) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION privado.alta_asistida(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid; claves text[]; v_correo text; v_motivo text; registro jsonb; v_candidatos uuid[];
 solicitud public."altaAsistida"%ROWTYPE; nuevo_estado text; limite integer; desplazamiento integer;
BEGIN
 IF operacion NOT IN ('preparar','listar','resolver','cancelar')
   OR operacion IS NULL OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'Petición inválida.' USING ERRCODE='22023';
 END IF;
 actor := privado.comprobar_sesion_cuenta();
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) p
   WHERE p->>'capacidad'='alta_asistida') THEN
   RAISE EXCEPTION 'Sin permiso de alta asistida.' USING ERRCODE='42501';
 END IF;
 claves := CASE operacion
   WHEN 'preparar' THEN ARRAY['correo','registro','motivo']
   WHEN 'listar' THEN ARRAY['limite','desplazamiento']
   WHEN 'resolver' THEN ARRAY['id','decision','motivo']
   WHEN 'cancelar' THEN ARRAY['id','motivo'] END;
 IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE NOT k=ANY(claves)) THEN
   RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE='22023';
 END IF;

 IF operacion='listar' THEN
   limite:=coalesce((datos->>'limite')::integer,25);
   desplazamiento:=coalesce((datos->>'desplazamiento')::integer,0);
   IF limite NOT BETWEEN 1 AND 100 OR desplazamiento NOT BETWEEN 0 AND 100000 THEN
     RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE='22023'; END IF;
   RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'correo',a.correo,'estado',a.estado,
     'nombres',a.datos->>'nombres','primerApellido',a.datos->>'primerApellido','segundoApellido',a.datos->>'segundoApellido',
     'fechaNacimiento',a.datos->>'fechaNacimiento','telefono',a.datos->>'telefono',
     'solicitadoPor',a."solicitadoPor",'solicitadoEn',a."solicitadoEn",
     'candidatos',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nombres',p.nombres,'primerApellido',p."primerApellido",
        'segundoApellido',p."segundoApellido",'fechaNacimiento',p."fechaNacimiento",'telefono',p.telefono,'correo',u.email,
        'estatus',p.estatus) ORDER BY p.id),'[]'::jsonb)
       FROM public.perfil p JOIN auth.users u ON u.id=p.id WHERE p.id=ANY(a.candidatos)))
     ORDER BY a."solicitadoEn",a.id),'[]'::jsonb)
     FROM (SELECT * FROM public."altaAsistida" WHERE estado IN ('lista','en_revision')
       ORDER BY "solicitadoEn",id LIMIT limite OFFSET desplazamiento) a);
 END IF;

 v_motivo:=btrim(datos->>'motivo');
 IF v_motivo IS NULL OR length(v_motivo) NOT BETWEEN 1 AND 500 THEN
   RAISE EXCEPTION 'Motivo obligatorio.' USING ERRCODE='22023'; END IF;

 IF operacion='preparar' THEN
   v_correo:=lower(btrim(datos->>'correo'));
   -- CA-09.1: sin correo accesible no hay alta; el teléfono solo no activa una cuenta.
   IF v_correo IS NULL OR length(v_correo)>254 OR v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
     RAISE EXCEPTION 'Se requiere un correo válido del titular.' USING ERRCODE='23514'; END IF;
   registro:=datos->'registro';
   PERFORM privado.validar_datos_registro(registro);
   PERFORM pg_advisory_xact_lock(hashtextextended('biblioteca.alta_asistida:'||v_correo,0));
   IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email)=v_correo) THEN
     RAISE EXCEPTION 'El correo ya tiene una cuenta; orientar la recuperación de acceso.' USING ERRCODE='23505'; END IF;
   IF EXISTS (SELECT 1 FROM public."altaAsistida" WHERE lower(correo)=v_correo AND estado IN ('lista','en_revision')) THEN
     RAISE EXCEPTION 'Ya hay una solicitud abierta para ese correo.' USING ERRCODE='23505'; END IF;
   v_candidatos:=privado.posibles_duplicados(registro);
   INSERT INTO public."altaAsistida"(correo,estado,datos,candidatos,motivo,"solicitadoPor")
   VALUES(v_correo,CASE WHEN cardinality(v_candidatos)>0 THEN 'en_revision' ELSE 'lista' END,registro,v_candidatos,v_motivo,actor)
   RETURNING * INTO solicitud;
 ELSE
   BEGIN SELECT * INTO solicitud FROM public."altaAsistida" WHERE id=(alta_asistida.datos->>'id')::uuid FOR UPDATE;
   EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Solicitud inválida.' USING ERRCODE='22023'; END;
   IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE='P0002'; END IF;
   IF operacion='resolver' THEN
     IF solicitud.estado<>'en_revision' THEN
       RAISE EXCEPTION 'La solicitud no está en revisión.' USING ERRCODE='23514'; END IF;
     -- 'misma_persona': no se crea otra cuenta ni se fusiona; se orienta la recuperación de la existente.
     nuevo_estado:=CASE datos->>'decision' WHEN 'persona_distinta' THEN 'lista' WHEN 'misma_persona' THEN 'descartada' END;
     IF nuevo_estado IS NULL THEN RAISE EXCEPTION 'Decisión inválida.' USING ERRCODE='22023'; END IF;
   ELSE
     IF solicitud.estado NOT IN ('lista','en_revision') THEN
       RAISE EXCEPTION 'La solicitud ya está cerrada.' USING ERRCODE='23514'; END IF;
     nuevo_estado:='cancelada';
   END IF;
   UPDATE public."altaAsistida" SET estado=nuevo_estado,"resueltoPor"=actor,"resueltoEn"=CURRENT_TIMESTAMP,
     "motivoResolucion"=v_motivo,datos=CASE WHEN nuevo_estado='lista' THEN "altaAsistida".datos END
   WHERE id=solicitud.id RETURNING * INTO solicitud;
 END IF;
 -- Con estado 'lista', el servidor envía la invitación de Auth con {"altaAsistida": id}.
 RETURN jsonb_build_object('id',solicitud.id,'correo',solicitud.correo,'estado',solicitud.estado,
   'candidatos',to_jsonb(solicitud.candidatos));
END;
$$;
REVOKE ALL ON FUNCTION privado.alta_asistida(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION privado.alta_asistida(text,jsonb) TO authenticated;
CREATE FUNCTION public.alta_asistida(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.alta_asistida(operacion,datos);
$$;
REVOKE ALL ON FUNCTION public.alta_asistida(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.alta_asistida(text,jsonb) TO authenticated;
