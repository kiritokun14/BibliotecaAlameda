-- HU-20 / T-099. Aplicar después de agenda_actividades.sql e inscripciones_responsables.sql.
BEGIN;

ALTER TABLE public.asistencia ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS privado."correccionAsistencia" (
    "asistenciaId" uuid NOT NULL REFERENCES public.asistencia(id),
    version integer NOT NULL CHECK (version > 1),
    anterior text NOT NULL CHECK (anterior IN ('presente', 'ausente')),
    nuevo text NOT NULL CHECK (nuevo IN ('presente', 'ausente') AND nuevo <> anterior),
    "corregidoPor" uuid NOT NULL REFERENCES public.perfil(id),
    motivo text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 1 AND 500),
    "motivoPrevio" text,
    "corregidoA" timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY ("asistenciaId", version)
);

CREATE TABLE IF NOT EXISTS privado."cierreAsistencia" (
    "sesionId" uuid PRIMARY KEY REFERENCES public."sesionActividad"(id),
    "cerradoPor" uuid NOT NULL REFERENCES public.perfil(id),
    "cerradoA" timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE privado."correccionAsistencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE privado."cierreAsistencia" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."correccionAsistencia", privado."cierreAsistencia" FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION privado.filas_asistencia(sesion uuid)
RETURNS TABLE ("usuarioId" uuid, nombre text, marca text, version integer,
               confirmada boolean, "motivoAnterior" text)
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
    -- Una inscripción confirmada aparece sin marca hasta que exista una fila en asistencia.
    -- Un registro histórico sigue visible si se cancela su inscripción después.
    SELECT u.id, concat_ws(' ', p.nombres, p."primerApellido", p."segundoApellido"),
           a.estatus, a.version, i."usuarioId" IS NOT NULL,
           CASE WHEN a.version = 1 THEN a."razonCorreccion" ELSE h."motivoPrevio" END
    FROM (
        SELECT "usuarioId" AS id FROM public.inscripcion WHERE "sesionId" = sesion AND status = 'confirmada'
        UNION
        SELECT "usuarioId" FROM public.asistencia WHERE "sesionId" = sesion
    ) u
    JOIN public.perfil p ON p.id = u.id
    LEFT JOIN public.inscripcion i ON i."sesionId" = sesion AND i."usuarioId" = u.id AND i.status = 'confirmada'
    LEFT JOIN public.asistencia a ON a."sesionId" = sesion AND a."usuarioId" = u.id
    LEFT JOIN privado."correccionAsistencia" h ON h."asistenciaId" = a.id AND h.version = 2;
$$;

CREATE OR REPLACE FUNCTION privado.resumen_asistencia(s public."sesionActividad")
RETURNS jsonb LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
    SELECT jsonb_build_object(
        'id', s.id, 'folio', coalesce(a.folio, a.slug), 'nombre', a.titulo, 'espacio', e.nombre,
        'inicio', s.inicio, 'estado', s.estado,
        'cerrada', CASE WHEN c."sesionId" IS NOT NULL THEN jsonb_build_object(
            'quien', concat_ws(' ', p.nombres, p."primerApellido", p."segundoApellido"), 'fecha', c."cerradoA") END,
        'inscritos', conteo.inscritos, 'total', conteo.total, 'presentes', conteo.presentes,
        'ausentes', conteo.ausentes, 'sinMarcar', conteo.sin_marcar)
    FROM public.actividad a
    JOIN public.espacio e ON e.id = s."espacioId"
    LEFT JOIN privado."cierreAsistencia" c ON c."sesionId" = s.id
    LEFT JOIN public.perfil p ON p.id = c."cerradoPor"
    CROSS JOIN LATERAL (
        SELECT count(*) FILTER (WHERE confirmada) AS inscritos, count(*) AS total,
               count(*) FILTER (WHERE marca = 'presente') AS presentes,
               count(*) FILTER (WHERE marca = 'ausente') AS ausentes,
               count(*) FILTER (WHERE marca IS NULL) AS sin_marcar
        FROM privado.filas_asistencia(s.id)
    ) conteo
    WHERE a.id = s."actividadId";
$$;

CREATE OR REPLACE FUNCTION privado.gestionar_asistencia(operacion text, datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
    actor uuid := privado.comprobar_sesion_cuenta();
    ambitos jsonb;
    sesion uuid;
    s public."sesionActividad"%ROWTYPE;
    registro public.asistencia%ROWTYPE;
    marcas jsonb;
    usuario uuid;
    estado_nuevo text;
    motivo_nuevo text;
    version_anterior integer;
    cerrada boolean;
    campos text[];
BEGIN
    campos := CASE operacion
        WHEN 'sesiones' THEN ARRAY[]::text[]
        WHEN 'consultar' THEN ARRAY['sesionId']
        WHEN 'registrar' THEN ARRAY['sesionId', 'marcas']
        WHEN 'cerrar' THEN ARRAY['sesionId', 'marcas']
        WHEN 'corregir' THEN ARRAY['sesionId', 'usuarioId', 'estatus', 'motivo', 'version']
    END;
    IF campos IS NULL OR jsonb_typeof(datos) IS DISTINCT FROM 'object'
        OR EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE NOT k = ANY(campos)) THEN
        RAISE EXCEPTION 'Solicitud inválida.' USING ERRCODE = '22023';
    END IF;

    IF operacion = 'sesiones' THEN
        SELECT jsonb_agg(p) INTO ambitos FROM jsonb_array_elements(privado.permisos_de_cuenta(actor, true)) p
        WHERE p->>'capacidad' = 'registrar_asistencia';
        IF ambitos IS NULL THEN
            RAISE EXCEPTION 'Permiso de asistencia requerido.' USING ERRCODE = '42501';
        END IF;
        RETURN (
            SELECT coalesce(jsonb_agg(privado.resumen_asistencia(ss) ORDER BY ss.inicio DESC, ss.id), '[]'::jsonb)
            FROM public."sesionActividad" ss JOIN public.actividad a ON a.id = ss."actividadId"
            WHERE ss.estado <> 'borrador'
            AND (a."requiereInscripcion" AND a."estadoPublicacion" IN ('publicada', 'retirada', 'archivada')
                OR EXISTS (SELECT 1 FROM public.asistencia r WHERE r."sesionId" = ss.id)
                OR EXISTS (SELECT 1 FROM privado."cierreAsistencia" c WHERE c."sesionId" = ss.id))
            AND EXISTS (SELECT 1 FROM jsonb_array_elements(ambitos) p
                        WHERE p->>'ambito' = 'global' OR p->>'actividadId' = ss."actividadId"::text)
        );
    END IF;

    sesion := (datos->>'sesionId')::uuid;
    IF sesion IS NULL THEN RAISE EXCEPTION 'Falta la sesión.' USING ERRCODE = '22023'; END IF;
    SELECT * INTO s FROM public."sesionActividad" WHERE id = sesion;
    IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la sesión.' USING ERRCODE = 'P0002'; END IF;
    IF NOT privado.permiso_agenda(actor, 'registrar_asistencia', s."actividadId") THEN
        RAISE EXCEPTION 'Acceso denegado a la sesión.' USING ERRCODE = '42501';
    END IF;

    IF operacion <> 'consultar' THEN
        -- El mismo orden que inscripciones: actividad, sesión y finalmente sus registros.
        PERFORM 1 FROM public.actividad WHERE id = s."actividadId" FOR SHARE;
        SELECT * INTO s FROM public."sesionActividad" WHERE id = sesion FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la sesión.' USING ERRCODE = 'P0002'; END IF;
        actor := privado.comprobar_sesion_cuenta();
        IF NOT privado.permiso_agenda(actor, 'registrar_asistencia', s."actividadId") THEN
            RAISE EXCEPTION 'Acceso denegado a la sesión.' USING ERRCODE = '42501';
        END IF;
        IF s.estado NOT IN ('programada', 'en_curso', 'finalizada') OR s.inicio > clock_timestamp() THEN
            RAISE EXCEPTION 'La sesión no permite registrar asistencia.' USING ERRCODE = '55000';
        END IF;
    END IF;

    SELECT EXISTS (SELECT 1 FROM privado."cierreAsistencia" WHERE "sesionId" = sesion) INTO cerrada;
    IF s.estado = 'borrador' OR NOT (
        EXISTS (SELECT 1 FROM public.actividad a WHERE a.id = s."actividadId" AND a."requiereInscripcion"
                AND a."estadoPublicacion" IN ('publicada', 'retirada', 'archivada'))
        OR EXISTS (SELECT 1 FROM public.asistencia WHERE "sesionId" = sesion) OR cerrada
    ) THEN
        RAISE EXCEPTION 'La sesión no tiene lista de asistencia.' USING ERRCODE = 'P0002';
    END IF;

    IF operacion IN ('registrar', 'cerrar') THEN
        marcas := datos->'marcas';
        IF jsonb_typeof(marcas) IS DISTINCT FROM 'array' THEN
            RAISE EXCEPTION 'Se requieren marcas válidas.' USING ERRCODE = '22023';
        END IF;
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(marcas) m WHERE jsonb_typeof(m) <> 'object') THEN
            RAISE EXCEPTION 'Marcas inválidas.' USING ERRCODE = '22023';
        END IF;
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(marcas) m
            WHERE NOT (m ? 'usuarioId' AND m ? 'estatus') OR (m - 'usuarioId' - 'estatus') <> '{}'::jsonb
               OR jsonb_typeof(m->'usuarioId') <> 'string' OR coalesce(m->>'estatus', '') NOT IN ('presente', 'ausente')
        ) OR EXISTS (
            SELECT 1 FROM jsonb_to_recordset(marcas) AS m("usuarioId" uuid) GROUP BY m."usuarioId" HAVING count(*) > 1
        ) THEN
            RAISE EXCEPTION 'Marcas inválidas o repetidas.' USING ERRCODE = '22023';
        END IF;
        IF EXISTS (
            SELECT 1 FROM jsonb_to_recordset(marcas) AS m("usuarioId" uuid, estatus text)
            LEFT JOIN public.asistencia r ON r."sesionId" = sesion AND r."usuarioId" = m."usuarioId"
            LEFT JOIN public.inscripcion i ON i."sesionId" = sesion AND i."usuarioId" = m."usuarioId" AND i.status = 'confirmada'
            WHERE (r.id IS NULL AND (i.id IS NULL OR cerrada)) OR (r.id IS NOT NULL AND r.estatus <> m.estatus)
        ) THEN
            RAISE EXCEPTION 'La lista cambió o la marca requiere una corrección.' USING ERRCODE = '40001';
        END IF;

        INSERT INTO public.asistencia ("sesionId", "usuarioId", estatus, "registradoPor")
        SELECT sesion, m."usuarioId", m.estatus, actor
        FROM jsonb_to_recordset(marcas) AS m("usuarioId" uuid, estatus text)
        ON CONFLICT ("sesionId", "usuarioId") DO NOTHING;

        IF operacion = 'cerrar' AND NOT cerrada THEN
            INSERT INTO public.asistencia ("sesionId", "usuarioId", estatus, "registradoPor")
            SELECT sesion, i."usuarioId", 'ausente', actor
            FROM public.inscripcion i WHERE i."sesionId" = sesion AND i.status = 'confirmada'
            ON CONFLICT ("sesionId", "usuarioId") DO NOTHING;
            INSERT INTO privado."cierreAsistencia" ("sesionId", "cerradoPor") VALUES (sesion, actor);
        END IF;
    ELSIF operacion = 'corregir' THEN
        usuario := (datos->>'usuarioId')::uuid;
        estado_nuevo := datos->>'estatus';
        motivo_nuevo := regexp_replace(datos->>'motivo', '^[[:space:]]+|[[:space:]]+$', '', 'g');
        version_anterior := (datos->>'version')::integer;
        IF usuario IS NULL OR coalesce(estado_nuevo, '') NOT IN ('presente', 'ausente')
            OR jsonb_typeof(datos->'motivo') IS DISTINCT FROM 'string' OR length(motivo_nuevo) NOT BETWEEN 1 AND 500
            OR coalesce(version_anterior, 0) < 1 THEN
            RAISE EXCEPTION 'Se requiere una marca, versión y motivo válidos.' USING ERRCODE = '22023';
        END IF;
        SELECT * INTO registro FROM public.asistencia WHERE "sesionId" = sesion AND "usuarioId" = usuario FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la marca de asistencia.' USING ERRCODE = 'P0002'; END IF;

        IF registro.version = version_anterior THEN
            IF registro.estatus = estado_nuevo THEN
                RAISE EXCEPTION 'El estado no cambió.' USING ERRCODE = '22023';
            END IF;
            UPDATE public.asistencia SET estatus = estado_nuevo, "razonCorreccion" = motivo_nuevo, version = registro.version + 1
            WHERE id = registro.id;
            INSERT INTO privado."correccionAsistencia" ("asistenciaId", version, anterior, nuevo, "corregidoPor", motivo, "motivoPrevio")
            VALUES (registro.id, registro.version + 1, registro.estatus, estado_nuevo, actor, motivo_nuevo,
                    CASE WHEN registro.version = 1 THEN registro."razonCorreccion" END);
        ELSIF NOT EXISTS (
            -- Si se perdió la respuesta, se puede repetir la última corrección exacta.
            SELECT 1 FROM privado."correccionAsistencia" h WHERE h."asistenciaId" = registro.id
            AND h.version = registro.version AND h.version - 1 = version_anterior
            AND h.nuevo = estado_nuevo AND h."corregidoPor" = actor AND h.motivo = motivo_nuevo
        ) THEN
            RAISE EXCEPTION 'La marca cambió.' USING ERRCODE = '40001';
        END IF;
    END IF;

    RETURN jsonb_build_object('sesion', privado.resumen_asistencia(s), 'personas', (
        SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.nombre, f."usuarioId"), '[]'::jsonb)
        FROM privado.filas_asistencia(sesion) f
    ), 'correcciones', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('id', h."asistenciaId"::text || ':' || h.version,
            'persona', concat_ws(' ', p.nombres, p."primerApellido", p."segundoApellido"),
            'anterior', h.anterior, 'nuevo', h.nuevo, 'motivo', h.motivo, 'fecha', h."corregidoA",
            'quien', concat_ws(' ', q.nombres, q."primerApellido", q."segundoApellido"))
            ORDER BY h."corregidoA" DESC, h."asistenciaId", h.version DESC), '[]'::jsonb)
        FROM privado."correccionAsistencia" h
        JOIN public.asistencia r ON r.id = h."asistenciaId"
        JOIN public.perfil p ON p.id = r."usuarioId"
        JOIN public.perfil q ON q.id = h."corregidoPor"
        WHERE r."sesionId" = sesion
    ));
END;
$$;

REVOKE ALL ON FUNCTION privado.filas_asistencia(uuid), privado.resumen_asistencia(public."sesionActividad"),
    privado.gestionar_asistencia(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gestionar_asistencia(operacion text, datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
    SELECT privado.gestionar_asistencia(operacion, datos);
$$;
REVOKE ALL ON FUNCTION public.gestionar_asistencia(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gestionar_asistencia(text, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
