-- HU-22 / T-116. Ejecutar en una copia de pruebas después de estadisticas_participacion.sql.
BEGIN;
DO $$
DECLARE
    global uuid := gen_random_uuid(); asignado uuid := gen_random_uuid(); lector uuid := gen_random_uuid();
    persona uuid := gen_random_uuid(); segunda uuid := gen_random_uuid(); tercera uuid := gen_random_uuid();
    auth_global uuid := gen_random_uuid(); auth_asignado uuid := gen_random_uuid();
    auth_lector uuid := gen_random_uuid(); auth_persona uuid := gen_random_uuid();
    taller uuid := gen_random_uuid(); ajena uuid := gen_random_uuid(); espacio uuid := gen_random_uuid();
    sesion uuid := gen_random_uuid(); abierta uuid := gen_random_uuid(); cancelada uuid := gen_random_uuid();
    ultima uuid := gen_random_uuid(); fuera uuid := gen_random_uuid(); borrador uuid := gen_random_uuid();
    dia date := date '2001-02-21'; inicio timestamptz := date '2001-02-21'::timestamp AT TIME ZONE 'America/Mazatlan';
    x uuid; r jsonb; version_anterior timestamptz;
    inscripcion text := '{"nombres":"Dato personal de prueba HU22","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
    FOREACH x IN ARRAY ARRAY[global, asignado, lector, persona, segunda, tercera] LOOP
        INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data)
        VALUES (x, x::text || '@example.invalid', now(), jsonb_build_object('registro', inscripcion::jsonb));
    END LOOP;
    INSERT INTO auth.sessions(id, user_id, created_at) VALUES
        (auth_global, global, now()), (auth_asignado, asignado, now()), (auth_lector, lector, now()), (auth_persona, persona, now());
    INSERT INTO public."rolUsuario" ("usuarioId", "rolCodigo", "asignadoPor", "motivoAsignacion") VALUES
        (global, 'responsable_actividades', global, 'Prueba HU22'),
        (asignado, 'responsable_actividades', global, 'Prueba HU22'),
        (lector, 'responsable_actividades', global, 'Prueba HU22');
    INSERT INTO public.espacio(id, slug, nombre, capacidad, descripcion)
    VALUES (espacio, espacio::text, 'Prueba HU22', 10, 'Desechable');
    INSERT INTO public.actividad (id, slug, titulo, descripcion, categoria, audiencia, requerimientos,
        "estadoPublicacion", "referenciaAutorizacion", "referenciaPublicacion", "creadoPor") VALUES
        (taller, taller::text, 'Taller HU22', 'Desechable', 'taller', 'General', '', 'publicada', 'Acta', 'Aviso', global),
        (ajena, ajena::text, 'Taller ajeno HU22', 'Desechable', 'curso', 'General', '', 'publicada', 'Acta', 'Aviso', global);
    INSERT INTO public."permisoCuenta" ("usuarioId", capacidad, "actividadId", "asignadoPor", motivo) VALUES
        (global, 'consultar_estadisticas', NULL, global, 'Prueba HU22'),
        (global, 'gestionar_actividades', NULL, global, 'Prueba HU22'),
        (asignado, 'consultar_estadisticas', taller, global, 'Prueba HU22'),
        (asignado, 'gestionar_actividades', taller, global, 'Prueba HU22'),
        (lector, 'consultar_estadisticas', NULL, global, 'Prueba HU22');
    INSERT INTO public."sesionActividad" (id, "actividadId", "espacioId", inicio, fin, capacidad, estado) VALUES
        (sesion, taller, espacio, inicio + interval '1 hour', inicio + interval '2 hours', 10, 'finalizada'),
        (abierta, ajena, espacio, inicio + interval '5 hours', inicio + interval '6 hours', 10, 'finalizada'),
        (cancelada, taller, espacio, inicio + interval '8 hours', inicio + interval '9 hours', 10, 'cancelada'),
        (borrador, taller, espacio, inicio + interval '18 hours', inicio + interval '19 hours', 10, 'borrador'),
        (ultima, taller, espacio, inicio + interval '23 hours', inicio + interval '23 hours 30 minutes', 10, 'finalizada'),
        (fuera, taller, espacio, inicio + interval '24 hours', inicio + interval '25 hours', 10, 'finalizada');
    INSERT INTO public.inscripcion ("sesionId", "usuarioId", status, "decisionPor", "decididoA") VALUES
        (sesion, persona, 'confirmada', global, now()), (sesion, segunda, 'confirmada', global, now()),
        (sesion, tercera, 'pendiente', NULL, NULL), (cancelada, persona, 'cancelada', NULL, NULL),
        (fuera, persona, 'confirmada', global, now());
    INSERT INTO public.asistencia ("sesionId", "usuarioId", estatus, "registradoPor") VALUES
        (sesion, persona, 'presente', global), (sesion, segunda, 'ausente', global),
        (abierta, persona, 'presente', global), (cancelada, persona, 'presente', global);
    INSERT INTO privado."cierreAsistencia" ("sesionId", "cerradoPor") VALUES (sesion, global), (cancelada, global);
    INSERT INTO public."mensajeContacto" ("nombreRemitente", "correoContacto", asunto, "cuerpoMensaje",
        "estadoAtencion", "atendidoPor", "respuestaFinal", "creadoEn", "actualizadoEn") VALUES
        ('Contacto privado', 'contacto@example.invalid', 'Asunto privado', 'Mensaje privado',
         'cerrado', global, 'Respuesta privada', inicio - interval '1 day', inicio + interval '11 hours'),
        ('Contacto privado', 'contacto@example.invalid', 'Asunto privado', 'Mensaje privado',
         'en_atencion', global, NULL, inicio, inicio + interval '1 hour'),
        ('Contacto privado', 'contacto@example.invalid', 'Asunto privado', 'Mensaje privado',
         'cerrado', global, 'Respuesta privada', inicio, inicio + interval '24 hours');

    IF has_function_privilege('anon', 'public.estadisticas_participacion(date,date,uuid)', 'EXECUTE')
       OR has_table_privilege('authenticated', 'privado.visita_general_diaria', 'SELECT')
       OR has_table_privilege('authenticated', 'privado.incidencias_sesion', 'UPDATE') THEN
        RAISE EXCEPTION 'El acceso directo omite los controles del reporte o la captura.';
    END IF;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', global, 'role', 'authenticated', 'session_id', auth_global)::text, true);
    SET LOCAL ROLE authenticated;
    r := public.estadisticas_participacion(dia, dia);
    IF NOT (r->'totales' @> '{"solicitudes":4,"confirmaciones":2,"asistencias":1,"ausencias":1,"listasCerradas":1,"sesionesRealizadas":3,"sesionesCanceladas":1,"incidencias":null,"visitasGenerales":null,"diasConVisitas":0,"atenciones":1}'::jsonb)
       OR jsonb_array_length(r->'sesiones') <> 4 OR jsonb_array_length(r->'dias') <> 1
       OR NOT (r->'sesiones' @> jsonb_build_array(jsonb_build_object('id', ultima, 'fecha', dia)))
       OR r::text LIKE '%example.invalid%' OR r::text LIKE '%Dato personal de prueba%' OR r::text LIKE '%Mensaje privado%'
       OR r::text LIKE '%' || persona::text || '%' THEN
        RAISE EXCEPTION 'Los conteos, la fecha local o la proyección pública del reporte son incorrectos.';
    END IF;
    BEGIN
        PERFORM public.estadisticas_participacion(dia, dia + 366);
        RAISE EXCEPTION 'Se permitió un periodo de más de 366 días.';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    BEGIN
        PERFORM public.guardar_visitas_generales(dia, -1, 'Bitácora 01');
        RAISE EXCEPTION 'Se permitió un total de visitas negativo.';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    r := public.guardar_visitas_generales(dia, 48, ' Bitácora 01 ');
    IF r->>'referencia' <> 'Bitácora 01' OR r ? 'registrado_por' THEN
        RAISE EXCEPTION 'La captura devuelve una proyección inesperada.';
    END IF;
    version_anterior := (r->>'version')::timestamptz;
    PERFORM public.guardar_visitas_generales(dia, 49, 'Bitácora 01', version_anterior);
    BEGIN
        PERFORM public.guardar_visitas_generales(dia, 90, 'Bitácora desactualizada', version_anterior);
        RAISE EXCEPTION 'Se sobrescribió una captura con versión anterior.';
    EXCEPTION WHEN serialization_failure THEN NULL;
    END;
    PERFORM public.guardar_visitas_generales(dia + 1, 0, 'Bitácora 02');
    PERFORM public.guardar_incidencias_sesion(sesion, 2, 'Acta U-22');
    PERFORM public.guardar_incidencias_sesion(ultima, 0, 'Acta U-23');
    BEGIN
        PERFORM public.guardar_incidencias_sesion(cancelada, 2, 'Acta X');
        RAISE EXCEPTION 'Se permitió registrar incidencias nuevas de una sesión cancelada.';
    EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
    END;
    r := public.estadisticas_participacion(dia, dia + 1);
    IF NOT (r->'totales' @> '{"incidencias":2,"sesionesConIncidencias":1,"visitasGenerales":49,"diasConVisitas":2,"atenciones":2,"asistencias":1}'::jsonb)
       OR r->'dias'->1->>'visitasGenerales' IS DISTINCT FROM '0'
       OR r->'dias'->1->>'incidencias' IS NOT NULL
       OR r->'dias'->0->'registroVisitas'->>'referencia' IS DISTINCT FROM 'Bitácora 01' THEN
        RAISE EXCEPTION 'Las capturas registradas, los ceros y los días faltantes no se distinguen correctamente.';
    END IF;
    r := public.estadisticas_participacion(dia, dia, taller);
    IF r->'totales'->>'visitasGenerales' IS NOT NULL OR r->'totales'->>'atenciones' IS NOT NULL
       OR r->>'puedeRegistrarVisitas' IS DISTINCT FROM 'false' OR jsonb_array_length(r->'sesiones') <> 3 THEN
        RAISE EXCEPTION 'El filtro por actividad incluye estadísticas generales o sesiones ajenas.';
    END IF;
    RESET ROLE;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', asignado, 'role', 'authenticated', 'session_id', auth_asignado)::text, true);
    SET LOCAL ROLE authenticated;
    r := public.estadisticas_participacion(dia, dia);
    IF r->>'ambito' IS DISTINCT FROM 'actividades_asignadas' OR jsonb_array_length(r->'actividades') <> 1
       OR jsonb_array_length(r->'sesiones') <> 3 OR r->'totales'->>'visitasGenerales' IS NOT NULL
       OR r->'totales'->>'atenciones' IS NOT NULL OR r::text LIKE '%Taller ajeno HU22%' THEN
        RAISE EXCEPTION 'Un alcance asignado devolvió datos ajenos.';
    END IF;
    BEGIN
        PERFORM public.estadisticas_participacion(dia, dia, ajena);
        RAISE EXCEPTION 'Se permitió consultar una actividad ajena.';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.guardar_incidencias_sesion(abierta, 2, 'Acta ajena');
        RAISE EXCEPTION 'Se permitió registrar incidencias de una sesión ajena.';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.guardar_visitas_generales(dia, 2, 'Bitácora ajena');
        RAISE EXCEPTION 'Se permitió al alcance asignado registrar visitas generales.';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM public.guardar_incidencias_sesion(sesion, 3, 'Acta U-22 corregida',
        (r->'sesiones'->0->'registroIncidencias'->>'version')::timestamptz);
    RESET ROLE;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', lector, 'role', 'authenticated', 'session_id', auth_lector)::text, true);
    SET LOCAL ROLE authenticated;
    r := public.estadisticas_participacion(dia, dia);
    IF r->>'puedeRegistrarVisitas' IS DISTINCT FROM 'false' OR r->'sesiones'->0->>'puedeRegistrarIncidencias' IS DISTINCT FROM 'false'
       OR r->'totales'->>'incidencias' IS DISTINCT FROM '3' THEN
        RAISE EXCEPTION 'La consulta global otorgó permisos de captura o perdió la última corrección.';
    END IF;
    BEGIN
        PERFORM public.guardar_visitas_generales(dia, 2, 'Bitácora no autorizada');
        RAISE EXCEPTION 'La capacidad de consulta basta para escribir visitas.';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RESET ROLE;

    INSERT INTO public."rolUsuario" ("usuarioId", "rolCodigo", "asignadoPor", "motivoAsignacion")
    VALUES (lector, 'administrador', global, 'Prueba de permiso administrativo HU22');
    SET LOCAL ROLE authenticated;
    r := public.estadisticas_participacion(dia, dia);
    IF r->>'puedeRegistrarVisitas' IS DISTINCT FROM 'true' OR r->'sesiones'->0->>'puedeRegistrarIncidencias' IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'El rol administrador global con estadísticas no obtuvo capacidad de registrar.';
    END IF;
    PERFORM public.guardar_visitas_generales(dia + 2, 8, 'Bitácora 03');
    PERFORM public.guardar_incidencias_sesion(abierta, 0, 'Acta U-25');
    RESET ROLE;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', persona, 'role', 'authenticated', 'session_id', auth_persona)::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
        PERFORM public.estadisticas_participacion(dia, dia);
        RAISE EXCEPTION 'Una cuenta ordinaria consultó el reporte.';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RESET ROLE;
END;
$$;
ROLLBACK;
