-- HU-28 / HU-29. Ejecutar en una base de pruebas después de progreso_recompensas.sql. Termina con ROLLBACK.
BEGIN;
DO $$
DECLARE
    responsable uuid := gen_random_uuid(); persona uuid := gen_random_uuid(); sin_cred uuid := gen_random_uuid();
    auth_responsable uuid := gen_random_uuid(); auth_persona uuid := gen_random_uuid();
    actividad uuid := gen_random_uuid(); espacio uuid := gen_random_uuid();
    s0 uuid := gen_random_uuid(); s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid(); s3 uuid := gen_random_uuid();
    x uuid; r jsonb; premio uuid; entrega uuid; denegada boolean;
    registro jsonb := '{"nombres":"Prueba HU28","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
    FOREACH x IN ARRAY ARRAY[responsable, persona, sin_cred] LOOP
        INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data)
        VALUES (x, x::text || '@example.invalid', now(), jsonb_build_object('registro', registro));
    END LOOP;
    INSERT INTO auth.sessions(id, user_id, created_at) VALUES (auth_responsable, responsable, now()), (auth_persona, persona, now());
    INSERT INTO public."rolUsuario" ("usuarioId", "rolCodigo", "asignadoPor", "motivoAsignacion")
    VALUES (responsable, 'responsable_actividades', responsable, 'Prueba HU28');
    INSERT INTO public."permisoCuenta" ("usuarioId", capacidad, "actividadId", "asignadoPor", motivo) VALUES
        (responsable, 'registrar_asistencia', NULL, responsable, 'Prueba HU28'),
        (responsable, 'registrar_recompensas', NULL, responsable, 'Prueba HU28');
    -- Credencial validada hace 30 días: la sesión de hace 40 días no cuenta (sin crédito retroactivo).
    INSERT INTO public."credencialBibliotecaria" ("usuarioId", "numeroCredencial", "fechaEmision", "fechaVencimiento",
        "estadoValidacion", "validadaPor", "validadaEn")
    VALUES (persona, 'PRUEBA-HU28', current_date - 60, current_date + 600, 'validada', responsable, now() - interval '30 days');

    INSERT INTO public.espacio(id, slug, nombre, capacidad, descripcion) VALUES (espacio, espacio::text, 'Prueba HU28', 5, 'Desechable');
    INSERT INTO public.actividad (id, slug, titulo, descripcion, categoria, audiencia, requerimientos,
        "estadoPublicacion", "referenciaAutorizacion", "referenciaPublicacion", "creadoPor")
    VALUES (actividad, actividad::text, 'Actividad HU28', 'Desechable', 'taller', 'General', '', 'publicada', 'Acta', 'Aviso', responsable);
    INSERT INTO public."sesionActividad" (id, "actividadId", "espacioId", inicio, fin, capacidad, estado) VALUES
        (s0, actividad, espacio, now() - interval '40 days', now() - interval '40 days' + interval '1 hour', 5, 'finalizada'),
        (s1, actividad, espacio, now() - interval '20 days', now() - interval '20 days' + interval '1 hour', 5, 'finalizada'),
        (s2, actividad, espacio, now() - interval '10 days', now() - interval '10 days' + interval '1 hour', 5, 'finalizada'),
        (s3, actividad, espacio, now() - interval '3 hours', now() - interval '2 hours', 5, 'finalizada');
    INSERT INTO public.inscripcion ("sesionId", "usuarioId", status, "decisionPor", "decididoA")
    SELECT s, u, 'confirmada', responsable, now() FROM unnest(ARRAY[s0, s1, s2, s3]) s CROSS JOIN unnest(ARRAY[persona, sin_cred]) u;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', responsable, 'role', 'authenticated', 'session_id', auth_responsable)::text, true);
    SET LOCAL ROLE authenticated;
    FOREACH x IN ARRAY ARRAY[s0, s1, s2, s3] LOOP
        PERFORM public.gestionar_asistencia('registrar', jsonb_build_object('sesionId', x, 'marcas', jsonb_build_array(
            jsonb_build_object('usuarioId', persona, 'estatus', 'presente'), jsonb_build_object('usuarioId', sin_cred, 'estatus', 'presente'))));
    END LOOP;
    -- Reintento del mismo lote: no duplica
    PERFORM public.gestionar_asistencia('registrar', jsonb_build_object('sesionId', s3, 'marcas', jsonb_build_array(
        jsonb_build_object('usuarioId', persona, 'estatus', 'presente'))));

    r := public.progreso_recompensas('participante', jsonb_build_object('usuarioId', persona));
    IF (r->'resumen'->>'validas')::int <> 3 OR (r->'resumen'->>'nivel')::int <> 1 OR (r->'resumen'->>'noContadas')::int <> 1 THEN
        RAISE EXCEPTION 'CA-28.1/28.2: % participaciones, nivel %', r->'resumen'->>'validas', r->'resumen'->>'nivel';
    END IF;
    r := public.progreso_recompensas('participante', jsonb_build_object('usuarioId', sin_cred));
    IF (r->'resumen'->>'total')::int <> 0 THEN RAISE EXCEPTION 'CA-28.2: contó sesiones sin credencial'; END IF;

    -- Corrección a ausente baja el progreso; volver a presente lo recupera
    PERFORM public.gestionar_asistencia('corregir', jsonb_build_object('sesionId', s3, 'usuarioId', persona, 'estatus', 'ausente', 'version', 1, 'motivo', 'Error'));
    IF (public.progreso_recompensas('participante', jsonb_build_object('usuarioId', persona))->'resumen'->>'nivel')::int <> 0 THEN
        RAISE EXCEPTION 'La corrección no bajó el nivel';
    END IF;
    PERFORM public.gestionar_asistencia('corregir', jsonb_build_object('sesionId', s3, 'usuarioId', persona, 'estatus', 'presente', 'version', 2, 'motivo', 'Sí asistió'));

    -- Ajuste manual exige motivo
    denegada := false;
    BEGIN PERFORM public.progreso_recompensas('ajustar', jsonb_build_object('usuarioId', sin_cred, 'cambio', 1, 'motivo', ' '));
    EXCEPTION WHEN invalid_parameter_value THEN denegada := true; END;
    IF NOT denegada THEN RAISE EXCEPTION 'Ajuste sin motivo'; END IF;
    r := public.progreso_recompensas('ajustar', jsonb_build_object('usuarioId', sin_cred, 'cambio', 1, 'motivo', 'Taller fuera de la agenda'));
    IF (r->'resumen'->>'total')::int <> 1 OR jsonb_array_length(r->'ajustes') <> 1 THEN RAISE EXCEPTION 'No se guardó el ajuste'; END IF;

    -- CU-29: una pieza, se asigna, se agota, se cancela y vuelve
    r := public.progreso_recompensas('crear_recompensa', jsonb_build_object('nombre', 'Separador HU28', 'descripcion', '',
        'nivelRequerido', 1, 'existencias', 1, 'vigenciaInicio', now() - interval '1 day', 'vigenciaFin', now() + interval '30 days', 'estado', 'activa'));
    premio := (r->>'id')::uuid;
    denegada := false;
    BEGIN PERFORM public.progreso_recompensas('asignar', jsonb_build_object('recompensaId', premio, 'usuarioId', sin_cred,
        'referencia', 'OF-1', 'autoridad', 'Dirección', 'fechaAutorizacion', (now() AT TIME ZONE 'America/Mazatlan')::date));
    EXCEPTION WHEN check_violation THEN denegada := true; END;
    IF NOT denegada THEN RAISE EXCEPTION 'Se asignó sin credencial ni nivel'; END IF;

    r := public.progreso_recompensas('asignar', jsonb_build_object('recompensaId', premio, 'usuarioId', persona,
        'referencia', 'OF-2', 'autoridad', 'Dirección', 'fechaAutorizacion', (now() AT TIME ZONE 'America/Mazatlan')::date));
    entrega := (r->>'id')::uuid;
    IF r->>'estado' <> 'asignada' OR r->'autorizacion'->>'referencia' <> 'OF-2' THEN RAISE EXCEPTION 'CA-29.1: falta la autorización'; END IF;
    IF (SELECT existencias FROM public.recompensa WHERE id = premio) <> 0
        OR (SELECT estado FROM public.recompensa WHERE id = premio) <> 'agotada' THEN
        RAISE EXCEPTION 'La asignación no apartó la pieza';
    END IF;
    denegada := false;
    BEGIN PERFORM public.progreso_recompensas('asignar', jsonb_build_object('recompensaId', premio, 'usuarioId', persona,
        'referencia', 'OF-3', 'autoridad', 'Dirección', 'fechaAutorizacion', (now() AT TIME ZONE 'America/Mazatlan')::date));
    EXCEPTION WHEN serialization_failure THEN denegada := true; END;
    IF NOT denegada THEN RAISE EXCEPTION 'Doble asignación'; END IF;

    r := public.progreso_recompensas('cancelar', jsonb_build_object('entregaId', entrega, 'motivo', 'No se presentó'));
    IF (SELECT existencias FROM public.recompensa WHERE id = premio) <> 1 THEN RAISE EXCEPTION 'Cancelar no devolvió la pieza'; END IF;
    r := public.progreso_recompensas('asignar', jsonb_build_object('recompensaId', premio, 'usuarioId', persona,
        'referencia', 'OF-4', 'autoridad', 'Dirección', 'fechaAutorizacion', (now() AT TIME ZONE 'America/Mazatlan')::date));
    r := public.progreso_recompensas('confirmar', jsonb_build_object('entregaId', r->>'id'));
    IF r->>'estado' <> 'entregada' OR r->>'confirmadaPor' IS NULL THEN RAISE EXCEPTION 'CA-29.1: falta quién entregó'; END IF;
    RESET ROLE;

    -- La persona ve lo suyo y no la lista del personal
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', persona, 'role', 'authenticated', 'session_id', auth_persona)::text, true);
    SET LOCAL ROLE authenticated;
    r := public.progreso_recompensas('mio');
    IF (r->'resumen'->>'total')::int <> 3 OR jsonb_array_length(r->'entregas') <> 1 THEN RAISE EXCEPTION 'Mi progreso incompleto'; END IF;
    denegada := false;
    BEGIN PERFORM public.progreso_recompensas('participantes');
    EXCEPTION WHEN insufficient_privilege THEN denegada := true; END;
    IF NOT denegada THEN RAISE EXCEPTION 'Una persona leyó el progreso de todos'; END IF;
    RESET ROLE;
END;
$$;
ROLLBACK;
