-- HU-08. Ejecutar en una copia de pruebas después de perfil_seguimiento_hu08.sql.
BEGIN;
DO $$
DECLARE
  menor uuid := gen_random_uuid();
  otra_persona uuid := gen_random_uuid();
  personal uuid := gen_random_uuid();
  sesion_menor uuid := gen_random_uuid();
  sesion_personal uuid := gen_random_uuid();
  identificador uuid;
  solicitud uuid;
  limite_menor date := ((statement_timestamp() AT TIME ZONE 'America/Mazatlan')::date - interval '18 years')::date;
  domicilio jsonb := '{"calle":"Prueba","numeroExterior":"52","coloniaLocalidad":"Centro","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}';
  datos jsonb;
  cambios jsonb;
  respuesta jsonb;
  version_leida text;
  rechazo boolean;
BEGIN
  datos := jsonb_build_object('nombres', 'Titular', 'primerApellido', 'Prueba',
    'fechaNacimiento', limite_menor + 1, 'telefono', '3110000000', 'aceptaAviso', true,
    'domicilio', domicilio, 'tutor', jsonb_build_object('nombres', 'Responsable', 'apellidos', 'Prueba',
    'telefono', '3111111111', 'correo', 'tutor@example.invalid', 'domicilio', domicilio, 'relacion', 'madre'));
  FOREACH identificador IN ARRAY ARRAY[menor, otra_persona] LOOP
    INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    VALUES (identificador, identificador::text || '@example.invalid', now(), jsonb_build_object('registro', datos));
  END LOOP;
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  VALUES (personal, personal::text || '@example.invalid', now(), jsonb_build_object('registro',
    (datos - 'tutor') || jsonb_build_object('fechaNacimiento', limite_menor - 10)));
  INSERT INTO auth.sessions (id, user_id, created_at)
  VALUES (sesion_menor, menor, now()), (sesion_personal, personal, now());
  INSERT INTO public."rolUsuario" ("usuarioId", "rolCodigo", "asignadoPor", "motivoAsignacion")
  VALUES (personal, 'editor', personal, 'Cuenta ficticia de personal para HU-08');
  INSERT INTO public."solicitudCredencial" ("usuarioId", "tipoSolicitud") VALUES (menor, 'obtencion')
  RETURNING id INTO solicitud;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', menor, 'role', 'authenticated',
    'session_id', sesion_menor)::text, true);
  SET LOCAL ROLE authenticated;
  respuesta := public.mi_perfil('consultar');
  IF respuesta->>'id' IS DISTINCT FROM menor::text OR respuesta->'esMenor' IS DISTINCT FROM 'true'::jsonb
     OR respuesta->'responsable'->>'telefono' IS DISTINCT FROM '3111111111'
     OR respuesta->'domicilio' IS DISTINCT FROM 'null'::jsonb THEN
    RAISE EXCEPTION 'La proyección del perfil menor no corresponde al titular.';
  END IF;
  version_leida := respuesta->>'actualizadoA';

  FOREACH cambios IN ARRAY ARRAY[
    jsonb_build_object('id', otra_persona, 'nombres', 'Nombre suplantado'),
    '{"roles":["administrador"],"nombres":"Nombre suplantado"}'::jsonb,
    jsonb_build_object('responsable', jsonb_build_object('usuarioId', otra_persona, 'telefono', '3119999999')),
    '{"responsable":{"nombre":"Otra persona","telefono":"3119999999"}}'::jsonb
  ] LOOP
    rechazo := false;
    BEGIN
      PERFORM public.mi_perfil('guardar', cambios || jsonb_build_object('actualizadoA', version_leida));
    EXCEPTION WHEN invalid_parameter_value THEN rechazo := true;
    END;
    IF NOT rechazo THEN RAISE EXCEPTION 'La operación aceptó identidad o campos protegidos.'; END IF;
  END LOOP;

  rechazo := false;
  BEGIN
    PERFORM public.mi_perfil('guardar', jsonb_build_object('nombres', 'Cambio parcial', 'actualizadoA', version_leida,
      'responsable', jsonb_build_object('telefono', '3119999999', 'correo', 'correo inválido')));
  EXCEPTION WHEN check_violation THEN rechazo := true;
  END;
  IF NOT rechazo OR public.mi_perfil('consultar')->>'nombres' IS DISTINCT FROM 'Titular' THEN
    RAISE EXCEPTION 'Un contacto inválido permitió guardar parcialmente el perfil.';
  END IF;

  respuesta := public.mi_perfil('guardar', jsonb_build_object('actualizadoA', version_leida,
    'responsable', jsonb_build_object('telefono', '3112222222', 'correo', 'contacto@example.invalid')));
  IF respuesta->'responsable' IS DISTINCT FROM '{"telefono":"3112222222","correo":"contacto@example.invalid","nombre":"Responsable Prueba","relacion":"madre"}'::jsonb THEN
    RAISE EXCEPTION 'No guardó los canales propios o cambió la identidad de la persona responsable.';
  END IF;
  RESET ROLE;
  IF (SELECT telefono FROM public."contactoTutor" WHERE "usuarioId" = otra_persona) IS DISTINCT FROM '3111111111' THEN
    RAISE EXCEPTION 'Modificó el contacto de otra cuenta.';
  END IF;

  -- Simula que llegó el cumpleaños sin crear una cuenta ni una sesión nueva.
  UPDATE public.perfil SET "fechaNacimiento" = limite_menor WHERE id = menor;
  SET LOCAL ROLE authenticated;
  respuesta := public.mi_perfil('consultar');
  IF respuesta->>'id' IS DISTINCT FROM menor::text OR respuesta->'esMenor' IS DISTINCT FROM 'false'::jsonb
     OR respuesta->'responsable' IS DISTINCT FROM 'null'::jsonb OR respuesta->'domicilio' IS DISTINCT FROM domicilio || '{"numeroInterior":null}'::jsonb THEN
    RAISE EXCEPTION 'Al cumplir 18 cambió la identidad o se siguió usando el contacto anterior.';
  END IF;
  rechazo := false;
  BEGIN
    PERFORM public.mi_perfil('guardar', jsonb_build_object('actualizadoA', respuesta->>'actualizadoA',
      'responsable', jsonb_build_object('telefono', '3113333333')));
  EXCEPTION WHEN insufficient_privilege THEN rechazo := true;
  END;
  IF NOT rechazo THEN RAISE EXCEPTION 'La cuenta adulta modificó su contacto histórico.'; END IF;
  RESET ROLE;
  IF (SELECT telefono FROM public."contactoTutor" WHERE "usuarioId" = menor) IS DISTINCT FROM '3112222222'
     OR NOT EXISTS (SELECT 1 FROM public."solicitudCredencial" WHERE id = solicitud AND "usuarioId" = menor) THEN
    RAISE EXCEPTION 'La mayoría de edad alteró el contacto histórico o el seguimiento.';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', personal, 'role', 'authenticated',
    'session_id', sesion_personal)::text, true);
  SET LOCAL ROLE authenticated;
  respuesta := public.mi_perfil('consultar');
  IF respuesta->>'id' IS DISTINCT FROM personal::text OR respuesta ? 'roles' OR respuesta ? 'estatus' THEN
    RAISE EXCEPTION 'La cuenta del personal no consultó solo su propio perfil.';
  END IF;
  respuesta := public.mi_perfil('guardar', jsonb_build_object('actualizadoA', respuesta->>'actualizadoA',
    'domicilio', domicilio || '{"calle":"Alameda","numeroInterior":null}'::jsonb));
  IF respuesta->'domicilio'->>'calle' IS DISTINCT FROM 'Alameda' THEN
    RAISE EXCEPTION 'No guardó el domicilio propio de la cuenta del personal.';
  END IF;
  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM public."rolUsuario" WHERE "usuarioId" = personal AND "rolCodigo" = 'editor')
     OR EXISTS (SELECT 1 FROM public."rolUsuario" WHERE "usuarioId" = menor AND "rolCodigo" = 'administrador') THEN
    RAISE EXCEPTION 'La edición del perfil modificó roles.';
  END IF;
END;
$$;
ROLLBACK;
SELECT 'HU-08: titularidad, contactos, mayoría de edad y roles verificados' AS resultado;
