-- HU-22 / T-116. Aplicar después de agenda_actividades.sql y asistencia_actividades.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS privado.visita_general_diaria (
    fecha date PRIMARY KEY,
    total integer NOT NULL CHECK (total >= 0),
    referencia text NOT NULL CHECK (length(btrim(referencia)) BETWEEN 1 AND 120),
    registrado_por uuid NOT NULL REFERENCES public.perfil(id),
    version timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS privado.incidencias_sesion (
    sesion_id uuid PRIMARY KEY REFERENCES public."sesionActividad"(id),
    total integer NOT NULL CHECK (total >= 0),
    referencia text NOT NULL CHECK (length(btrim(referencia)) BETWEEN 1 AND 120),
    registrado_por uuid NOT NULL REFERENCES public.perfil(id),
    version timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE privado.visita_general_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE privado.incidencias_sesion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE privado.visita_general_diaria, privado.incidencias_sesion FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS estadisticas_participacion_sesiones_fecha
    ON public."sesionActividad"(inicio) WHERE estado <> 'borrador';
CREATE INDEX IF NOT EXISTS estadisticas_participacion_contactos_cerrados_fecha
    ON public."mensajeContacto"("actualizadoEn") WHERE "estadoAtencion" = 'cerrado';

CREATE OR REPLACE FUNCTION privado.administra_registros_estadisticos(actor uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
    SELECT EXISTS (
        SELECT 1 FROM public."rolUsuario" r
        WHERE r."usuarioId" = actor AND r."rolCodigo" = 'administrador' AND r.ambito = 'global'
          AND r."vigenteDesde" <= statement_timestamp()
          AND (r."vigenteHasta" IS NULL OR r."vigenteHasta" > statement_timestamp())
    );
$$;

CREATE OR REPLACE FUNCTION public.estadisticas_participacion(desde date, hasta date, actividad_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
    actor uuid := privado.comprobar_sesion_cuenta();
    zona constant text := 'America/Mazatlan';
    inicio_periodo timestamptz;
    fin_periodo timestamptz;
    alcance_global boolean;
    gestion_global boolean;
    asignadas uuid[];
    asignadas_gestion uuid[];
    puede_administrar boolean := privado.administra_registros_estadisticos(actor);
    incluir_generales boolean;
    reporte jsonb;
BEGIN
    IF desde IS NULL OR hasta IS NULL OR NOT isfinite(desde) OR NOT isfinite(hasta)
       OR desde > hasta OR hasta - desde > 365 THEN
        RAISE EXCEPTION 'El periodo debe tener entre 1 y 366 días.' USING ERRCODE = '22023';
    END IF;

    inicio_periodo := desde::timestamp AT TIME ZONE zona;
    fin_periodo := (hasta + 1)::timestamp AT TIME ZONE zona;
    SELECT coalesce(bool_or(p->>'ambito' = 'global') FILTER (WHERE p->>'capacidad' = 'consultar_estadisticas'), false),
           coalesce(bool_or(p->>'ambito' = 'global') FILTER (WHERE p->>'capacidad' = 'gestionar_actividades'), false),
           coalesce(array_agg((p->>'actividadId')::uuid) FILTER (
               WHERE p->>'capacidad' = 'consultar_estadisticas' AND p->>'ambito' = 'actividades_asignadas'), ARRAY[]::uuid[]),
           coalesce(array_agg((p->>'actividadId')::uuid) FILTER (
               WHERE p->>'capacidad' = 'gestionar_actividades' AND p->>'ambito' = 'actividades_asignadas'), ARRAY[]::uuid[])
      INTO alcance_global, gestion_global, asignadas, asignadas_gestion
      FROM jsonb_array_elements(privado.permisos_de_cuenta(actor, true)) p;

    IF NOT alcance_global AND (cardinality(asignadas) = 0
       OR (actividad_id IS NOT NULL AND NOT actividad_id = ANY(asignadas))) THEN
        RAISE EXCEPTION 'Sin permiso para consultar este ámbito.' USING ERRCODE = '42501';
    END IF;
    IF actividad_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.actividad a WHERE a.id = actividad_id) THEN
        RAISE EXCEPTION 'Actividad no encontrada.' USING ERRCODE = 'P0002';
    END IF;
    incluir_generales := alcance_global AND actividad_id IS NULL;

    WITH actividades_visibles AS MATERIALIZED (
        SELECT a.id, coalesce(a.folio, a.slug) AS folio, a.titulo
        FROM public.actividad a
        WHERE (alcance_global OR a.id = ANY(asignadas))
          AND EXISTS (SELECT 1 FROM public."sesionActividad" s WHERE s."actividadId" = a.id AND s.estado <> 'borrador')
    ), sesiones_visibles AS MATERIALIZED (
        SELECT s.id, a.folio, a.titulo, (s.inicio AT TIME ZONE zona)::date AS fecha, s.estado, s.inicio,
               i.solicitudes, i.confirmaciones, m.asistencias, m.ausencias,
               (c."sesionId" IS NOT NULL AND s.estado <> 'cancelada') AS lista_cerrada,
               ((s.estado = 'finalizada' OR c."sesionId" IS NOT NULL) AND s.estado <> 'cancelada') AS realizada,
               r.total AS incidencias,
               CASE WHEN r.sesion_id IS NOT NULL THEN jsonb_build_object(
                   'total', r.total, 'referencia', r.referencia, 'version', r.version) END AS registro_incidencias,
               ((puede_administrar OR gestion_global OR a.id = ANY(asignadas_gestion))
                   AND s.inicio <= statement_timestamp() AND s.estado <> 'cancelada') AS puede_registrar_incidencias
        FROM public."sesionActividad" s
        JOIN actividades_visibles a ON a.id = s."actividadId"
        LEFT JOIN privado."cierreAsistencia" c ON c."sesionId" = s.id
        LEFT JOIN privado.incidencias_sesion r ON r.sesion_id = s.id
        CROSS JOIN LATERAL (
            SELECT count(*) AS solicitudes, count(*) FILTER (WHERE status = 'confirmada') AS confirmaciones
            FROM public.inscripcion WHERE "sesionId" = s.id
        ) i
        CROSS JOIN LATERAL (
            SELECT count(*) FILTER (WHERE estatus = 'presente') AS asistencias,
                   count(*) FILTER (WHERE estatus = 'ausente') AS ausencias
            FROM public.asistencia WHERE "sesionId" = s.id AND c."sesionId" IS NOT NULL AND s.estado <> 'cancelada'
        ) m
        WHERE s.estado <> 'borrador' AND s.inicio >= inicio_periodo AND s.inicio < fin_periodo
          AND (actividad_id IS NULL OR a.id = actividad_id)
    ), conteos_diarios AS (
        SELECT fecha, sum(solicitudes) AS solicitudes, sum(confirmaciones) AS confirmaciones,
               sum(asistencias) AS asistencias, sum(ausencias) AS ausencias,
               count(*) FILTER (WHERE lista_cerrada) AS listas_cerradas,
               count(*) FILTER (WHERE realizada) AS sesiones_realizadas,
               count(*) FILTER (WHERE estado = 'cancelada') AS sesiones_canceladas,
               sum(incidencias) AS incidencias,
               count(*) FILTER (WHERE incidencias > 0) AS sesiones_con_incidencias
        FROM sesiones_visibles GROUP BY fecha
    ), atenciones_diarias AS (
        SELECT (m."actualizadoEn" AT TIME ZONE zona)::date AS fecha, count(*) AS total
        FROM public."mensajeContacto" m
        WHERE incluir_generales AND m."estadoAtencion" = 'cerrado'
          AND m."actualizadoEn" >= inicio_periodo AND m."actualizadoEn" < fin_periodo
        GROUP BY 1
    ), dias AS MATERIALIZED (
        SELECT desde + d.numero AS fecha,
               coalesce(c.solicitudes, 0) AS solicitudes, coalesce(c.confirmaciones, 0) AS confirmaciones,
               coalesce(c.asistencias, 0) AS asistencias, coalesce(c.ausencias, 0) AS ausencias,
               coalesce(c.listas_cerradas, 0) AS "listasCerradas",
               coalesce(c.sesiones_realizadas, 0) AS "sesionesRealizadas",
               coalesce(c.sesiones_canceladas, 0) AS "sesionesCanceladas",
               c.incidencias, coalesce(c.sesiones_con_incidencias, 0) AS "sesionesConIncidencias",
               v.total AS "visitasGenerales",
               CASE WHEN incluir_generales THEN coalesce(a.total, 0) END AS atenciones,
               CASE WHEN v.fecha IS NOT NULL THEN jsonb_build_object(
                   'total', v.total, 'referencia', v.referencia, 'version', v.version) END AS "registroVisitas"
        FROM generate_series(0, hasta - desde) d(numero)
        LEFT JOIN conteos_diarios c ON c.fecha = desde + d.numero
        LEFT JOIN atenciones_diarias a ON a.fecha = desde + d.numero
        LEFT JOIN privado.visita_general_diaria v ON incluir_generales AND v.fecha = desde + d.numero
    )
    SELECT jsonb_build_object(
        'desde', desde, 'hasta', hasta, 'actividadId', actividad_id,
        'ambito', CASE WHEN alcance_global THEN 'global' ELSE 'actividades_asignadas' END,
        'puedeRegistrarVisitas', incluir_generales AND (gestion_global OR puede_administrar),
        'actividades', (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.titulo, a.folio), '[]'::jsonb) FROM actividades_visibles a),
        'totales', (SELECT jsonb_build_object(
            'solicitudes', sum(d.solicitudes), 'confirmaciones', sum(d.confirmaciones),
            'asistencias', sum(d.asistencias), 'ausencias', sum(d.ausencias),
            'listasCerradas', sum(d."listasCerradas"), 'sesionesRealizadas', sum(d."sesionesRealizadas"),
            'sesionesCanceladas', sum(d."sesionesCanceladas"), 'incidencias', sum(d.incidencias),
            'sesionesConIncidencias', sum(d."sesionesConIncidencias"),
            'visitasGenerales', sum(d."visitasGenerales"),
            'diasConVisitas', CASE WHEN incluir_generales THEN count(d."visitasGenerales") END,
            'atenciones', sum(d.atenciones)) FROM dias d),
        'dias', (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.fecha) FROM dias d),
        'sesiones', (SELECT coalesce(jsonb_agg(jsonb_build_object(
            'id', s.id, 'fecha', s.fecha, 'folio', s.folio, 'titulo', s.titulo, 'estado', s.estado,
            'solicitudes', s.solicitudes, 'confirmaciones', s.confirmaciones,
            'asistencias', s.asistencias, 'ausencias', s.ausencias, 'listaCerrada', s.lista_cerrada,
            'incidencias', s.incidencias, 'registroIncidencias', s.registro_incidencias,
            'puedeRegistrarIncidencias', s.puede_registrar_incidencias) ORDER BY s.inicio, s.id), '[]'::jsonb) FROM sesiones_visibles s),
        'fuentes', jsonb_build_object(
            'solicitudes', 'Solicitudes de inscripción de las sesiones del periodo, en todos sus estados.',
            'confirmaciones', 'Solicitudes con estado confirmado a la fecha de consulta.',
            'asistencias', 'Marcas de presencia de listas cerradas, excluidas las sesiones canceladas.',
            'ausencias', 'Marcas de ausencia de listas cerradas, excluidas las sesiones canceladas.',
            'visitasGenerales', 'Totales diarios de visitas generales a la biblioteca registrados por el personal con una referencia.',
            'atenciones', 'Contactos cerrados del portal y Bibliocomunidad, agrupados por la fecha de cierre registrada.',
            'incidencias', 'Totales de incidencias operativas registrados por sesión con una referencia.'))
    INTO reporte;

    RETURN reporte;
END;
$$;

CREATE OR REPLACE FUNCTION public.guardar_visitas_generales(fecha date, total integer, referencia text, version timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
    actor uuid := privado.comprobar_sesion_cuenta();
    fila privado.visita_general_diaria%ROWTYPE;
BEGIN
    IF NOT privado.permiso_agenda(actor, 'consultar_estadisticas') OR NOT (
        privado.permiso_agenda(actor, 'gestionar_actividades') OR privado.administra_registros_estadisticos(actor)) THEN
        RAISE EXCEPTION 'Sin permiso para registrar visitas generales.' USING ERRCODE = '42501';
    END IF;
    IF fecha IS NULL OR NOT isfinite(fecha) OR fecha > (statement_timestamp() AT TIME ZONE 'America/Mazatlan')::date
       OR total IS NULL OR total < 0 OR referencia IS NULL OR length(btrim(referencia)) NOT BETWEEN 1 AND 120 THEN
        RAISE EXCEPTION 'Fecha, total o referencia de visitas inválidos.' USING ERRCODE = '22023';
    END IF;

    IF version IS NULL THEN
        INSERT INTO privado.visita_general_diaria (fecha, total, referencia, registrado_por)
        VALUES ($1, $2, btrim($3), actor)
        ON CONFLICT DO NOTHING RETURNING * INTO fila;
    ELSE
        UPDATE privado.visita_general_diaria v
        SET total = $2, referencia = btrim($3), registrado_por = actor,
            version = greatest(clock_timestamp(), v.version + interval '1 microsecond')
        WHERE v.fecha = $1 AND v.version = $4 RETURNING v.* INTO fila;
    END IF;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La captura de visitas cambió desde la última consulta.' USING ERRCODE = '40001';
    END IF;
    RETURN jsonb_build_object('total', fila.total, 'referencia', fila.referencia, 'version', fila.version);
END;
$$;

CREATE OR REPLACE FUNCTION public.guardar_incidencias_sesion(sesion_id uuid, total integer, referencia text, version timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
    actor uuid := privado.comprobar_sesion_cuenta();
    sesion public."sesionActividad"%ROWTYPE;
    fila privado.incidencias_sesion%ROWTYPE;
BEGIN
    SELECT * INTO sesion FROM public."sesionActividad" s
    WHERE s.id = $1 AND privado.permiso_agenda(actor, 'consultar_estadisticas', s."actividadId")
      AND (privado.permiso_agenda(actor, 'gestionar_actividades', s."actividadId")
           OR privado.administra_registros_estadisticos(actor))
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sin permiso para registrar incidencias de esta sesión.' USING ERRCODE = '42501';
    END IF;
    IF sesion.estado IN ('borrador', 'cancelada') OR sesion.inicio > statement_timestamp() THEN
        RAISE EXCEPTION 'La sesión debe haber iniciado y estar vigente.' USING ERRCODE = '55000';
    END IF;
    IF total IS NULL OR total < 0 OR referencia IS NULL OR length(btrim(referencia)) NOT BETWEEN 1 AND 120 THEN
        RAISE EXCEPTION 'Total o referencia de incidencias inválidos.' USING ERRCODE = '22023';
    END IF;

    IF version IS NULL THEN
        INSERT INTO privado.incidencias_sesion (sesion_id, total, referencia, registrado_por)
        VALUES ($1, $2, btrim($3), actor)
        ON CONFLICT DO NOTHING RETURNING * INTO fila;
    ELSE
        UPDATE privado.incidencias_sesion r
        SET total = $2, referencia = btrim($3), registrado_por = actor,
            version = greatest(clock_timestamp(), r.version + interval '1 microsecond')
        WHERE r.sesion_id = $1 AND r.version = $4 RETURNING r.* INTO fila;
    END IF;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La captura de incidencias cambió desde la última consulta.' USING ERRCODE = '40001';
    END IF;
    RETURN jsonb_build_object('total', fila.total, 'referencia', fila.referencia, 'version', fila.version);
END;
$$;

REVOKE ALL ON FUNCTION privado.administra_registros_estadisticos(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.estadisticas_participacion(date, date, uuid),
    public.guardar_visitas_generales(date, integer, text, timestamptz),
    public.guardar_incidencias_sesion(uuid, integer, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.estadisticas_participacion(date, date, uuid),
    public.guardar_visitas_generales(date, integer, text, timestamptz),
    public.guardar_incidencias_sesion(uuid, integer, text, timestamptz) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
