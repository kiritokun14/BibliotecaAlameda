-- HU-20 / T-099. Ejecutar en una base de pruebas después de asistencia_actividades.sql.
BEGIN;
DO $$
DECLARE
    responsable uuid := gen_random_uuid(); corrector uuid := gen_random_uuid();
    persona uuid := gen_random_uuid(); segunda uuid := gen_random_uuid(); pendiente uuid := gen_random_uuid();
    auth_responsable uuid := gen_random_uuid(); auth_corrector uuid := gen_random_uuid(); auth_persona uuid := gen_random_uuid();
    actividad uuid := gen_random_uuid(); ajena uuid := gen_random_uuid(); espacio uuid := gen_random_uuid();
    sesion uuid := gen_random_uuid(); otra_sesion uuid := gen_random_uuid(); sesion_ajena uuid := gen_random_uuid();
    x uuid; datos jsonb; marcas jsonb; correccion jsonb; r jsonb; denegada boolean; fila uuid;
    registro jsonb := '{"nombres":"Prueba HU20","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
    FOREACH x IN ARRAY ARRAY[responsable, corrector, persona, segunda, pendiente] LOOP
        INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data)
        VALUES (x, x::text || '@example.invalid', now(), jsonb_build_object('registro', registro));
    END LOOP;
    UPDATE public.perfil SET nombres = 'María' WHERE id = corrector;
    INSERT INTO auth.sessions(id, user_id, created_at) VALUES
        (auth_responsable, responsable, now()), (auth_corrector, corrector, now()), (auth_persona, persona, now());
    INSERT INTO public."rolUsuario" ("usuarioId", "rolCodigo", "asignadoPor", "motivoAsignacion") VALUES
        (responsable, 'responsable_actividades', responsable, 'Prueba HU20'),
        (corrector, 'responsable_actividades', corrector, 'Prueba HU20');
    INSERT INTO public.espacio(id, slug, nombre, capacidad, descripcion)
    VALUES (espacio, espacio::text, 'Prueba HU20', 5, 'Desechable');
    INSERT INTO public.actividad (id, slug, titulo, descripcion, categoria, audiencia, requerimientos,
        "estadoPublicacion", "referenciaAutorizacion", "referenciaPublicacion", "creadoPor") VALUES
        (actividad, actividad::text, 'Actividad HU20', 'Desechable', 'taller', 'General', '', 'publicada', 'Acta', 'Aviso', responsable),
        (ajena, ajena::text, 'Actividad ajena', 'Desechable', 'taller', 'General', '', 'publicada', 'Acta', 'Aviso', corrector);
    INSERT INTO public."sesionActividad" (id, "actividadId", "espacioId", inicio, fin, capacidad, estado) VALUES
        (sesion, actividad, espacio, now() - interval '3 hours', now() - interval '2 hours', 5, 'finalizada'),
        (otra_sesion, actividad, espacio, now() + interval '1 day', now() + interval '25 hours', 5, 'programada'),
        (sesion_ajena, ajena, espacio, now() - interval '5 hours', now() - interval '4 hours', 5, 'finalizada');
    INSERT INTO public."permisoCuenta" ("usuarioId", capacidad, "actividadId", "asignadoPor", motivo) VALUES
        (responsable, 'registrar_asistencia', actividad, responsable, 'Permiso limitado a la actividad'),
        (corrector, 'registrar_asistencia', NULL, corrector, 'Permiso global');
    INSERT INTO public.inscripcion ("sesionId", "usuarioId", status, "decisionPor", "decididoA") VALUES
        (sesion, persona, 'confirmada', responsable, now()), (sesion, segunda, 'confirmada', responsable, now()),
        (otra_sesion, persona, 'confirmada', responsable, now()), (sesion, pendiente, 'pendiente', NULL, NULL);

    datos := jsonb_build_object('sesionId', sesion);
    marcas := jsonb_build_array(jsonb_build_object('usuarioId', persona, 'estatus', 'presente'));
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', persona, 'role', 'authenticated', 'session_id', auth_persona)::text, true);
    SET LOCAL ROLE authenticated;
    denegada := false;
    BEGIN PERFORM public.gestionar_asistencia('consultar', datos);
    EXCEPTION WHEN insufficient_privilege THEN denegada := true; END;
    IF NOT denegada THEN RAISE EXCEPTION 'Una persona inscrita leyó toda la lista'; END IF;
    RESET ROLE;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', responsable, 'role', 'authenticated', 'session_id', auth_responsable)::text, true);
    SET LOCAL ROLE authenticated;
    r := public.gestionar_asistencia('sesiones');
    IF jsonb_array_length(r) <> 2 OR r @> jsonb_build_array(jsonb_build_object('id', sesion_ajena)) THEN
        RAISE EXCEPTION 'Listado de sesiones fuera del alcance';
    END IF;
    denegada := false;
    BEGIN PERFORM public.gestionar_asistencia('consultar', jsonb_build_object('sesionId', sesion_ajena));
    EXCEPTION WHEN insufficient_privilege THEN denegada := true; END;
    IF NOT denegada THEN RAISE EXCEPTION 'El responsable leyó una sesión ajena'; END IF;

    r := public.gestionar_asistencia('consultar', datos);
    IF r->'sesion'->>'presentes' IS DISTINCT FROM '0' OR r->'sesion'->>'sinMarcar' IS DISTINCT FROM '2'
       OR jsonb_array_length(r->'personas') <> 2 OR r->'personas'->0->>'marca' IS NOT NULL THEN
        RAISE EXCEPTION 'CA-20.1: una inscripción sin marca se contó como asistencia';
    END IF;
    denegada := false;
    BEGIN PERFORM public.gestionar_asistencia('registrar', jsonb_build_object('sesionId', otra_sesion, 'marcas', marcas));
    EXCEPTION WHEN object_not_in_prerequisite_state THEN denegada := true; END;
    IF NOT denegada THEN RAISE EXCEPTION 'Se contó una presencia antes de la sesión'; END IF;
    denegada := false;
    BEGIN PERFORM public.gestionar_asistencia('registrar', datos || jsonb_build_object('marcas', marcas ||
        jsonb_build_array(jsonb_build_object('usuarioId', pendiente, 'estatus', 'presente'))));
    EXCEPTION WHEN serialization_failure THEN denegada := true; END;
    IF NOT denegada OR public.gestionar_asistencia('consultar', datos)->'sesion'->>'presentes' IS DISTINCT FROM '0' THEN
        RAISE EXCEPTION 'Un lote inválido guardó asistencia';
    END IF;

    PERFORM public.gestionar_asistencia('registrar', datos || jsonb_build_object('marcas', marcas));
    r := public.gestionar_asistencia('registrar', datos || jsonb_build_object('marcas', marcas));
    IF r->'sesion'->>'presentes' IS DISTINCT FROM '1' OR r->'sesion'->>'sinMarcar' IS DISTINCT FROM '1' THEN
        RAISE EXCEPTION 'La presencia guardada se perdió o se duplicó al reintentar';
    END IF;
    r := public.gestionar_asistencia('consultar', jsonb_build_object('sesionId', otra_sesion));
    IF r->'sesion'->>'presentes' IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'La marca afectó otra sesión'; END IF;
    RESET ROLE;
    SELECT id INTO STRICT fila FROM public.asistencia WHERE "sesionId" = sesion AND "usuarioId" = persona;
    -- Simula una fila del esquema anterior, que conservaba solo el último motivo.
    UPDATE public.asistencia SET "razonCorreccion" = 'Motivo anterior a HU-20' WHERE id = fila;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', corrector, 'role', 'authenticated', 'session_id', auth_corrector)::text, true);
    SET LOCAL ROLE authenticated;
    correccion := datos || jsonb_build_object('usuarioId', persona, 'estatus', 'ausente', 'version', 1);
    denegada := false;
    BEGIN PERFORM public.gestionar_asistencia('corregir', correccion || jsonb_build_object('motivo', E' \t\n '));
    EXCEPTION WHEN invalid_parameter_value THEN denegada := true; END;
    IF NOT denegada THEN RAISE EXCEPTION 'CA-20.2: corrección sin motivo'; END IF;
    correccion := correccion || jsonb_build_object('motivo', 'Se marcó a la persona equivocada');
    PERFORM public.gestionar_asistencia('corregir', correccion);
    r := public.gestionar_asistencia('corregir', correccion);
    IF r->'sesion'->>'presentes' IS DISTINCT FROM '0' OR r->'sesion'->>'ausentes' IS DISTINCT FROM '1'
        OR jsonb_array_length(r->'correcciones') <> 1 OR r->'correcciones'->0->>'quien' IS DISTINCT FROM 'María Temporal'
        OR r->'correcciones'->0->>'motivo' IS DISTINCT FROM correccion->>'motivo'
        OR NOT r->'personas' @> jsonb_build_array(jsonb_build_object('usuarioId', persona, 'motivoAnterior', 'Motivo anterior a HU-20')) THEN
        RAISE EXCEPTION 'CA-20.2: se perdió o se duplicó la corrección';
    END IF;
    denegada := false;
    BEGIN PERFORM public.gestionar_asistencia('corregir', correccion || jsonb_build_object('estatus', 'presente'));
    EXCEPTION WHEN serialization_failure THEN denegada := true; END;
    IF NOT denegada THEN RAISE EXCEPTION 'Se guardaron cambios sobre una versión obsoleta'; END IF;

    r := public.gestionar_asistencia('cerrar', datos || jsonb_build_object('marcas', '[]'::jsonb));
    IF r->'sesion'->>'ausentes' IS DISTINCT FROM '2' OR r->'sesion'->>'sinMarcar' IS DISTINCT FROM '0'
        OR r->'sesion'->'cerrada'->>'quien' IS DISTINCT FROM 'María Temporal' THEN
        RAISE EXCEPTION 'El cierre no guardó ausencias y responsable';
    END IF;
    r := public.gestionar_asistencia('corregir', correccion || jsonb_build_object('estatus', 'presente', 'version', 2, 'motivo', 'Presencia verificada'));
    IF r->'sesion'->>'presentes' IS DISTINCT FROM '1' OR jsonb_array_length(r->'correcciones') <> 2 THEN
        RAISE EXCEPTION 'La corrección tras el cierre no reemplazó la marca';
    END IF;
    RESET ROLE;
    IF NOT EXISTS (SELECT 1 FROM public.asistencia WHERE id = fila AND "registradoPor" = responsable AND version = 3)
        OR (SELECT count(*) FROM public.asistencia WHERE "sesionId" = sesion AND "usuarioId" = persona) <> 1
        OR (SELECT count(*) FROM privado."correccionAsistencia" WHERE "asistenciaId" = fila AND "corregidoPor" = corrector) <> 2 THEN
        RAISE EXCEPTION 'CA-20.2: se perdió la identidad del registro o del responsable';
    END IF;
END;
$$;
ROLLBACK;
