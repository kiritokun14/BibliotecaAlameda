-- HU-08. Ejecutar después de inscripcion_propia.sql y asistencia_actividades.sql.
BEGIN;

CREATE OR REPLACE FUNCTION privado.mis_inscripciones(pagina integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
    actor uuid := privado.comprobar_sesion_cuenta();
BEGIN
    IF pagina IS NULL OR pagina NOT BETWEEN 0 AND 5000 THEN
        RAISE EXCEPTION 'Página inválida' USING ERRCODE = '22023';
    END IF;

    RETURN (
        SELECT coalesce(jsonb_agg(to_jsonb(fila) ORDER BY fila.inicio DESC, fila.id), '[]'::jsonb)
        FROM (
            SELECT i.id, i.status, a.folio, a.titulo, s.inicio, s.id AS "sesionId",
                a."estadoPublicacion" = 'publicada' AS publicada,
                CASE WHEN cierre."sesionId" IS NOT NULL AND s.estado <> 'cancelada'
                    THEN marca.estatus
                END AS asistencia
            FROM public.inscripcion i
            JOIN public."sesionActividad" s ON s.id = i."sesionId"
            JOIN public.actividad a ON a.id = s."actividadId"
            LEFT JOIN privado."cierreAsistencia" cierre ON cierre."sesionId" = s.id
            LEFT JOIN public.asistencia marca ON marca."sesionId" = s.id AND marca."usuarioId" = actor
            WHERE i."usuarioId" = actor
            ORDER BY s.inicio DESC, i.id
            LIMIT 21 OFFSET pagina * 20
        ) fila
    );
END;
$$;

COMMIT;
