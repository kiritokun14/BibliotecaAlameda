-- Prueba reversible de seguimiento propio. Usa una base de pruebas con hu08_seguimiento_personal.sql.
BEGIN;
DO $$
DECLARE
    titular uuid := gen_random_uuid();
    otra uuid := gen_random_uuid();
    auth_titular uuid := gen_random_uuid();
    auth_otra uuid := gen_random_uuid();
    actividad uuid := gen_random_uuid();
    espacio uuid := gen_random_uuid();
    cerrada uuid := gen_random_uuid();
    abierta uuid := gen_random_uuid();
    persona uuid;
    obtenido jsonb;
    registro jsonb := '{"nombres":"Prueba HU08","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
    FOREACH persona IN ARRAY ARRAY[titular, otra] LOOP
        INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data)
        VALUES (persona, persona::text || '@example.invalid', now(), jsonb_build_object('registro', registro));
    END LOOP;
    INSERT INTO auth.sessions(id, user_id, created_at)
    VALUES (auth_titular, titular, now()), (auth_otra, otra, now());

    INSERT INTO public.espacio(id, slug, nombre, capacidad, descripcion)
    VALUES (espacio, espacio::text, 'Prueba seguimiento HU08', 5, 'Desechable');
    INSERT INTO public.actividad(id, slug, titulo, descripcion, categoria, audiencia, requerimientos,
        "estadoPublicacion", "referenciaAutorizacion", "referenciaPublicacion", "creadoPor")
    VALUES (actividad, actividad::text, 'Taller de prueba HU08', 'Desechable', 'taller', 'General', '',
        'publicada', 'Acta', 'Aviso', titular);
    INSERT INTO public."sesionActividad"(id, "actividadId", "espacioId", inicio, fin, capacidad, estado)
    VALUES (cerrada, actividad, espacio, now() - interval '4 hours', now() - interval '3 hours', 5, 'finalizada'),
           (abierta, actividad, espacio, now() - interval '2 hours', now() - interval '1 hour', 5, 'finalizada');
    INSERT INTO public.inscripcion("sesionId", "usuarioId", status, "decisionPor", "decididoA")
    VALUES (cerrada, titular, 'confirmada', titular, now()), (abierta, titular, 'confirmada', titular, now()),
           (cerrada, otra, 'confirmada', titular, now());
    INSERT INTO public.asistencia("sesionId", "usuarioId", estatus, "registradoPor")
    VALUES (cerrada, titular, 'presente', titular), (abierta, titular, 'presente', titular),
           (cerrada, otra, 'ausente', titular);
    INSERT INTO privado."cierreAsistencia"("sesionId", "cerradoPor") VALUES (cerrada, titular);

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', titular, 'role', 'authenticated', 'session_id', auth_titular)::text, true);
    SET LOCAL ROLE authenticated;
    obtenido := public.mis_inscripciones(0);
    IF jsonb_array_length(obtenido) <> 2 OR NOT obtenido @> jsonb_build_array(
        jsonb_build_object('sesionId', cerrada, 'status', 'confirmada', 'asistencia', 'presente'),
        jsonb_build_object('sesionId', abierta, 'status', 'confirmada', 'asistencia', NULL)
    ) THEN RAISE EXCEPTION 'El titular solo debería ver su propia marca una vez cerrada la lista'; END IF;
    RESET ROLE;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', otra, 'role', 'authenticated', 'session_id', auth_otra)::text, true);
    SET LOCAL ROLE authenticated;
    obtenido := public.mis_inscripciones(0);
    IF jsonb_array_length(obtenido) <> 1 OR NOT obtenido @> jsonb_build_array(
        jsonb_build_object('sesionId', cerrada, 'asistencia', 'ausente')
    ) THEN RAISE EXCEPTION 'La otra cuenta vio una inscripción o asistencia ajena'; END IF;
    RESET ROLE;
END;
$$;
ROLLBACK;
