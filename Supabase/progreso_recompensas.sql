-- HU-28 / HU-29 (CU-28, CU-29, D-11). Progreso por participación y entrega de recompensas.
-- Aplicar después de asistencia_actividades.sql (paso 26).
--
-- Reglas del documento:
--   * Cuenta una participación por sesión con asistencia «presente» registrada por el personal,
--     si la credencial bibliotecaria estaba validada y vigente en la fecha de la sesión.
--   * La evaluación se guarda al registrar la asistencia: una validación posterior no da crédito
--     retroactivo, y el vencimiento posterior conserva lo ya acreditado.
--   * Niveles: 0 Inicial (0–2), 1 Lector activo (3–5), 2 Lector constante (6 o más).
--   * Ajustes manuales con motivo; comentarios, propuestas o documentos no suman.
--   * Recompensas: la asignación registra la autorización de la Dirección y aparta una pieza;
--     la entrega se confirma aparte; cancelar una asignación devuelve la pieza. Sin canje automático.
BEGIN;

CREATE TABLE IF NOT EXISTS privado."participacionProgreso" (
    "asistenciaId" uuid PRIMARY KEY REFERENCES public.asistencia(id),
    "usuarioId" uuid NOT NULL REFERENCES public.perfil(id),
    "sesionId" uuid NOT NULL REFERENCES public."sesionActividad"(id),
    cuenta boolean NOT NULL,
    razon text NOT NULL CHECK (razon IN ('valida', 'ausente', 'sin_credencial', 'sesion_cancelada')),
    "evaluadoEn" timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE ("sesionId", "usuarioId")
);
CREATE INDEX IF NOT EXISTS "participacionProgreso_usuario" ON privado."participacionProgreso" ("usuarioId");

CREATE TABLE IF NOT EXISTS privado."ajusteProgreso" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "usuarioId" uuid NOT NULL REFERENCES public.perfil(id),
    cambio integer NOT NULL CHECK (cambio BETWEEN -10 AND 10 AND cambio <> 0),
    motivo text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 1 AND 500),
    "registradoPor" uuid NOT NULL REFERENCES public.perfil(id),
    "registradoEn" timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS "ajusteProgreso_usuario" ON privado."ajusteProgreso" ("usuarioId");

ALTER TABLE privado."participacionProgreso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE privado."ajusteProgreso" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."participacionProgreso", privado."ajusteProgreso" FROM PUBLIC, anon, authenticated;

-- Asignación y entrega separadas. «fechaEntrega» (histórica e inmutable) es la fecha de asignación:
-- el disparador existente valida ahí vigencia, credencial y nivel y descuenta la pieza.
ALTER TABLE public."entregaRecompensa"
    ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'entregada',
    ADD COLUMN IF NOT EXISTS "autorizacionReferencia" text,
    ADD COLUMN IF NOT EXISTS "autorizadaPor" text,
    ADD COLUMN IF NOT EXISTS "autorizadaEl" date,
    ADD COLUMN IF NOT EXISTS "confirmadaPor" uuid REFERENCES public.perfil(id),
    ADD COLUMN IF NOT EXISTS "confirmadaEn" timestamptz,
    ADD COLUMN IF NOT EXISTS "canceladaPor" uuid REFERENCES public.perfil(id),
    ADD COLUMN IF NOT EXISTS "canceladaEn" timestamptz,
    ADD COLUMN IF NOT EXISTS "motivoCancelacion" text;
ALTER TABLE public."entregaRecompensa" DROP CONSTRAINT IF EXISTS ck_entregaRecompensa_estado;
ALTER TABLE public."entregaRecompensa" ADD CONSTRAINT ck_entregaRecompensa_estado CHECK (
    estado IN ('asignada', 'entregada', 'cancelada')
    AND (estado <> 'entregada' OR "confirmadaEn" IS NOT NULL OR "autorizacionReferencia" IS NULL)
    AND (estado <> 'cancelada' OR length(btrim(coalesce("motivoCancelacion", ''))) BETWEEN 1 AND 500)
);
-- Evita la doble asignación de la misma recompensa a la misma persona.
CREATE UNIQUE INDEX IF NOT EXISTS "entregaRecompensa_una_vigente"
    ON public."entregaRecompensa" ("recompensaId", "usuarioId") WHERE estado <> 'cancelada';

CREATE OR REPLACE FUNCTION privado.nivel_progreso(total integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
    SELECT CASE WHEN total >= 6 THEN 2 WHEN total >= 3 THEN 1 ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION privado.sincronizar_progreso(usuario uuid)
RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE total integer;
BEGIN
    SELECT greatest(0,
        (SELECT count(*) FROM privado."participacionProgreso" WHERE "usuarioId" = usuario AND cuenta)
        + (SELECT coalesce(sum(cambio), 0) FROM privado."ajusteProgreso" WHERE "usuarioId" = usuario))::integer
    INTO total;
    INSERT INTO public."progresoUsuario" (id, "nivelActual", "participacionesValidas")
    VALUES (usuario, privado.nivel_progreso(total), total)
    ON CONFLICT (id) DO UPDATE SET "nivelActual" = EXCLUDED."nivelActual",
        "participacionesValidas" = EXCLUDED."participacionesValidas"
    WHERE ("progresoUsuario"."nivelActual", "progresoUsuario"."participacionesValidas")
        IS DISTINCT FROM (EXCLUDED."nivelActual", EXCLUDED."participacionesValidas");
END;
$$;

CREATE OR REPLACE FUNCTION privado.evaluar_participacion(a public.asistencia)
RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE
    s public."sesionActividad"%ROWTYPE;
    dia date;
    anterior privado."participacionProgreso"%ROWTYPE;
    motivo text;
BEGIN
    SELECT * INTO s FROM public."sesionActividad" WHERE id = a."sesionId";
    dia := (s.inicio AT TIME ZONE 'America/Mazatlan')::date;
    SELECT * INTO anterior FROM privado."participacionProgreso" WHERE "asistenciaId" = a.id;

    IF s.estado = 'cancelada' THEN
        motivo := 'sesion_cancelada';
    ELSIF a.estatus <> 'presente' THEN
        motivo := 'ausente';
    ELSIF anterior.razon = 'valida' THEN
        -- Ya acreditada: un vencimiento o renovación posterior no la retira.
        motivo := 'valida';
    ELSIF EXISTS (
        SELECT 1 FROM public."credencialBibliotecaria" c
        WHERE c."usuarioId" = a."usuarioId" AND c."estadoValidacion" IN ('validada', 'vencida')
        AND c."fechaEmision" <= dia AND c."fechaVencimiento" >= dia
        AND (c."validadaEn" IS NULL OR (c."validadaEn" AT TIME ZONE 'America/Mazatlan')::date <= dia)
    ) THEN
        motivo := 'valida';
    ELSE
        motivo := 'sin_credencial';
    END IF;

    INSERT INTO privado."participacionProgreso" ("asistenciaId", "usuarioId", "sesionId", cuenta, razon)
    VALUES (a.id, a."usuarioId", a."sesionId", motivo = 'valida', motivo)
    ON CONFLICT ("asistenciaId") DO UPDATE SET cuenta = EXCLUDED.cuenta, razon = EXCLUDED.razon,
        "evaluadoEn" = clock_timestamp()
    WHERE "participacionProgreso".razon IS DISTINCT FROM EXCLUDED.razon;
    PERFORM privado.sincronizar_progreso(a."usuarioId");
END;
$$;

CREATE OR REPLACE FUNCTION privado.progreso_por_asistencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
    PERFORM privado.evaluar_participacion(NEW);
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION privado.progreso_por_sesion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
    PERFORM privado.evaluar_participacion(a) FROM public.asistencia a WHERE a."sesionId" = NEW.id;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS progreso_por_asistencia ON public.asistencia;
CREATE TRIGGER progreso_por_asistencia AFTER INSERT OR UPDATE OF estatus ON public.asistencia
    FOR EACH ROW EXECUTE FUNCTION privado.progreso_por_asistencia();
DROP TRIGGER IF EXISTS progreso_por_sesion ON public."sesionActividad";
CREATE TRIGGER progreso_por_sesion AFTER UPDATE OF estado ON public."sesionActividad"
    FOR EACH ROW WHEN (NEW.estado = 'cancelada' AND OLD.estado IS DISTINCT FROM 'cancelada')
    EXECUTE FUNCTION privado.progreso_por_sesion();

-- Asistencias que ya existían antes de este script.
DO $$ BEGIN
    PERFORM privado.evaluar_participacion(a) FROM public.asistencia a
    WHERE NOT EXISTS (SELECT 1 FROM privado."participacionProgreso" p WHERE p."asistenciaId" = a.id);
END $$;

CREATE OR REPLACE FUNCTION privado.resumen_progreso(usuario uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
    SELECT jsonb_build_object(
        'usuarioId', p.id, 'nombre', concat_ws(' ', p.nombres, p."primerApellido", p."segundoApellido"),
        'validas', conteo.validas, 'ajustes', conteo.ajustes, 'total', greatest(0, conteo.validas + conteo.ajustes),
        'nivel', privado.nivel_progreso(greatest(0, conteo.validas + conteo.ajustes)::integer),
        'noContadas', conteo.no_contadas,
        'credencial', (SELECT jsonb_build_object('estado', c."estadoValidacion", 'vence', c."fechaVencimiento",
                'vigente', c."estadoValidacion" = 'validada'
                    AND (statement_timestamp() AT TIME ZONE 'America/Mazatlan')::date BETWEEN c."fechaEmision" AND c."fechaVencimiento")
            FROM public."credencialBibliotecaria" c WHERE c."usuarioId" = p.id),
        'asignadas', (SELECT count(*) FROM public."entregaRecompensa" e WHERE e."usuarioId" = p.id AND e.estado = 'asignada'),
        'entregadas', (SELECT count(*) FROM public."entregaRecompensa" e WHERE e."usuarioId" = p.id AND e.estado = 'entregada'),
        'ultimaParticipacion', (SELECT max(s.inicio) FROM privado."participacionProgreso" pp
            JOIN public."sesionActividad" s ON s.id = pp."sesionId" WHERE pp."usuarioId" = p.id AND pp.cuenta))
    FROM public.perfil p
    CROSS JOIN LATERAL (
        SELECT (SELECT count(*) FROM privado."participacionProgreso" WHERE "usuarioId" = p.id AND cuenta) AS validas,
               (SELECT count(*) FROM privado."participacionProgreso" WHERE "usuarioId" = p.id AND razon = 'sin_credencial') AS no_contadas,
               (SELECT coalesce(sum(cambio), 0) FROM privado."ajusteProgreso" WHERE "usuarioId" = p.id) AS ajustes
    ) conteo
    WHERE p.id = usuario;
$$;

CREATE OR REPLACE FUNCTION privado.vista_recompensa(r public.recompensa)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
    SELECT jsonb_build_object('id', r.id, 'nombre', r.nombre, 'descripcion', r.descripcion,
        'nivelRequerido', r."nivelRequerido", 'existencias', r.existencias,
        'vigenciaInicio', r."fechaVigenciaInicio", 'vigenciaFin', r."fechaVigenciaFin", 'estado', r.estado,
        'asignadas', (SELECT count(*) FROM public."entregaRecompensa" e WHERE e."recompensaId" = r.id AND e.estado = 'asignada'),
        'entregadas', (SELECT count(*) FROM public."entregaRecompensa" e WHERE e."recompensaId" = r.id AND e.estado = 'entregada'),
        'actualizadoEn', r."actualizadoEn");
$$;

CREATE OR REPLACE FUNCTION privado.vista_entrega(e public."entregaRecompensa")
RETURNS jsonb LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
    SELECT jsonb_build_object('id', e.id, 'estado', e.estado,
        'recompensaId', e."recompensaId", 'recompensa', r.nombre,
        'usuarioId', e."usuarioId", 'persona', privado.nombre_persona(e."usuarioId"),
        'asignadaPor', privado.nombre_persona(e."entregadoPor"), 'asignadaEn', e."fechaEntrega",
        'autorizacion', CASE WHEN e."autorizacionReferencia" IS NOT NULL THEN jsonb_build_object(
            'referencia', e."autorizacionReferencia", 'autoridad', e."autorizadaPor", 'fecha', e."autorizadaEl") END,
        'confirmadaPor', CASE WHEN e."confirmadaPor" IS NOT NULL THEN privado.nombre_persona(e."confirmadaPor") END,
        'confirmadaEn', e."confirmadaEn",
        'canceladaPor', CASE WHEN e."canceladaPor" IS NOT NULL THEN privado.nombre_persona(e."canceladaPor") END,
        'canceladaEn', e."canceladaEn", 'motivoCancelacion', e."motivoCancelacion", 'notas', e.notas)
    FROM public.recompensa r WHERE r.id = e."recompensaId";
$$;

CREATE OR REPLACE FUNCTION privado.texto_requerido(valor jsonb, maximo integer)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE t text;
BEGIN
    IF jsonb_typeof(valor) IS DISTINCT FROM 'string' THEN
        RAISE EXCEPTION 'Texto requerido.' USING ERRCODE = '22023';
    END IF;
    t := regexp_replace(valor #>> '{}', '^[[:space:]]+|[[:space:]]+$', '', 'g');
    IF length(t) NOT BETWEEN 1 AND maximo THEN
        RAISE EXCEPTION 'Texto vacío o demasiado largo.' USING ERRCODE = '22023';
    END IF;
    RETURN t;
END;
$$;

CREATE OR REPLACE FUNCTION privado.progreso_recompensas(operacion text, datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
    actor uuid := privado.comprobar_sesion_cuenta();
    campos text[];
    usuario uuid;
    r public.recompensa%ROWTYPE;
    e public."entregaRecompensa"%ROWTYPE;
    campos_recompensa text[] := ARRAY['nombre', 'descripcion', 'nivelRequerido', 'existencias',
                                      'vigenciaInicio', 'vigenciaFin', 'estado'];
    hoy date := (statement_timestamp() AT TIME ZONE 'America/Mazatlan')::date;
BEGIN
    campos := CASE operacion
        WHEN 'mio' THEN ARRAY[]::text[]
        WHEN 'participantes' THEN ARRAY[]::text[]
        WHEN 'participante' THEN ARRAY['usuarioId']
        WHEN 'ajustar' THEN ARRAY['usuarioId', 'cambio', 'motivo']
        WHEN 'recompensas' THEN ARRAY[]::text[]
        WHEN 'crear_recompensa' THEN campos_recompensa
        WHEN 'editar_recompensa' THEN campos_recompensa || ARRAY['id', 'actualizadoEn']
        WHEN 'entregas' THEN ARRAY[]::text[]
        WHEN 'asignar' THEN ARRAY['recompensaId', 'usuarioId', 'referencia', 'autoridad', 'fechaAutorizacion', 'notas']
        WHEN 'confirmar' THEN ARRAY['entregaId']
        WHEN 'cancelar' THEN ARRAY['entregaId', 'motivo']
    END;
    IF campos IS NULL OR jsonb_typeof(datos) IS DISTINCT FROM 'object'
        OR EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE NOT k = ANY(campos)) THEN
        RAISE EXCEPTION 'Solicitud inválida.' USING ERRCODE = '22023';
    END IF;

    IF operacion = 'mio' THEN
        RETURN jsonb_build_object(
            'resumen', privado.resumen_progreso(actor),
            'participaciones', (
                SELECT coalesce(jsonb_agg(jsonb_build_object('sesionId', s.id, 'actividad', a.titulo,
                    'inicio', s.inicio, 'cuenta', pp.cuenta, 'razon', pp.razon) ORDER BY s.inicio DESC), '[]'::jsonb)
                FROM privado."participacionProgreso" pp
                JOIN public."sesionActividad" s ON s.id = pp."sesionId"
                JOIN public.actividad a ON a.id = s."actividadId"
                WHERE pp."usuarioId" = actor AND pp.razon <> 'ausente'),
            'recompensas', (
                SELECT coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre, 'descripcion', x.descripcion,
                    'nivelRequerido', x."nivelRequerido", 'disponible', x.existencias > 0, 'vigenciaFin', x."fechaVigenciaFin")
                    ORDER BY x."nivelRequerido", x.nombre), '[]'::jsonb)
                FROM public.recompensa x
                WHERE x.estado IN ('activa', 'agotada') AND x."fechaVigenciaFin" >= statement_timestamp()),
            'entregas', (
                SELECT coalesce(jsonb_agg(jsonb_build_object('id', e2.id, 'recompensaId', x.id, 'recompensa', x.nombre, 'estado', e2.estado,
                    'asignadaEn', e2."fechaEntrega", 'confirmadaEn', e2."confirmadaEn") ORDER BY e2."fechaEntrega" DESC), '[]'::jsonb)
                FROM public."entregaRecompensa" e2 JOIN public.recompensa x ON x.id = e2."recompensaId"
                WHERE e2."usuarioId" = actor AND e2.estado <> 'cancelada'));
    END IF;

    IF NOT privado.permiso_agenda(actor, 'registrar_recompensas') THEN
        RAISE EXCEPTION 'Permiso de recompensas requerido.' USING ERRCODE = '42501';
    END IF;

    IF operacion = 'participantes' THEN
        RETURN (
            SELECT coalesce(jsonb_agg(privado.resumen_progreso(u.id) ORDER BY p.nombres, p."primerApellido", u.id), '[]'::jsonb)
            FROM (
                SELECT "usuarioId" AS id FROM privado."participacionProgreso" WHERE razon <> 'ausente'
                UNION SELECT "usuarioId" FROM privado."ajusteProgreso"
                UNION SELECT "usuarioId" FROM public."entregaRecompensa"
                UNION SELECT "usuarioId" FROM public."credencialBibliotecaria" WHERE "estadoValidacion" IN ('validada', 'vencida')
            ) u JOIN public.perfil p ON p.id = u.id
        );
    END IF;

    IF operacion IN ('participante', 'ajustar') THEN
        usuario := (datos->>'usuarioId')::uuid;
        IF usuario IS NULL OR NOT EXISTS (SELECT 1 FROM public.perfil WHERE id = usuario) THEN
            RAISE EXCEPTION 'No se encontró la persona.' USING ERRCODE = 'P0002';
        END IF;
        IF operacion = 'ajustar' THEN
            IF jsonb_typeof(datos->'cambio') IS DISTINCT FROM 'number'
                OR (datos->>'cambio')::numeric NOT IN (-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10) THEN
                RAISE EXCEPTION 'El ajuste debe ser un número entero entre -10 y 10, distinto de cero.' USING ERRCODE = '22023';
            END IF;
            PERFORM 1 FROM public.perfil WHERE id = usuario FOR UPDATE;
            INSERT INTO privado."ajusteProgreso" ("usuarioId", cambio, motivo, "registradoPor")
            VALUES (usuario, (datos->>'cambio')::integer, privado.texto_requerido(datos->'motivo', 500), actor);
            PERFORM privado.sincronizar_progreso(usuario);
        END IF;
        RETURN jsonb_build_object(
            'resumen', privado.resumen_progreso(usuario),
            'participaciones', (
                SELECT coalesce(jsonb_agg(jsonb_build_object('sesionId', s.id, 'actividad', a.titulo,
                    'folio', coalesce(a.folio, a.slug), 'inicio', s.inicio, 'cuenta', pp.cuenta, 'razon', pp.razon)
                    ORDER BY s.inicio DESC), '[]'::jsonb)
                FROM privado."participacionProgreso" pp
                JOIN public."sesionActividad" s ON s.id = pp."sesionId"
                JOIN public.actividad a ON a.id = s."actividadId"
                WHERE pp."usuarioId" = usuario AND pp.razon <> 'ausente'),
            'ajustes', (
                SELECT coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'cambio', j.cambio, 'motivo', j.motivo,
                    'quien', privado.nombre_persona(j."registradoPor"), 'fecha', j."registradoEn")
                    ORDER BY j."registradoEn" DESC), '[]'::jsonb)
                FROM privado."ajusteProgreso" j WHERE j."usuarioId" = usuario),
            'entregas', (
                SELECT coalesce(jsonb_agg(privado.vista_entrega(e2) ORDER BY e2."fechaEntrega" DESC), '[]'::jsonb)
                FROM public."entregaRecompensa" e2 WHERE e2."usuarioId" = usuario));
    END IF;

    IF operacion = 'recompensas' THEN
        RETURN (SELECT coalesce(jsonb_agg(privado.vista_recompensa(x)
            ORDER BY x.estado = 'archivada', x."nivelRequerido", x.nombre), '[]'::jsonb) FROM public.recompensa x);
    END IF;

    IF operacion IN ('crear_recompensa', 'editar_recompensa') THEN
        IF EXISTS (SELECT 1 FROM unnest(campos_recompensa) c WHERE NOT datos ? c)
            OR jsonb_typeof(datos->'nivelRequerido') IS DISTINCT FROM 'number'
            OR jsonb_typeof(datos->'existencias') IS DISTINCT FROM 'number'
            OR (datos->>'nivelRequerido')::numeric NOT IN (0, 1, 2)
            OR (datos->>'existencias')::numeric <> trunc((datos->>'existencias')::numeric)
            OR (datos->>'existencias')::numeric NOT BETWEEN 0 AND 100000
            OR coalesce(datos->>'estado', '') NOT IN ('activa', 'inactiva', 'archivada')
            OR jsonb_typeof(datos->'descripcion') IS DISTINCT FROM 'string'
            OR length(datos->>'descripcion') > 1000
            OR (datos->>'vigenciaFin')::timestamptz < (datos->>'vigenciaInicio')::timestamptz THEN
            RAISE EXCEPTION 'Revisa nombre, nivel, existencias, vigencia y estado.' USING ERRCODE = '22023';
        END IF;
        IF operacion = 'crear_recompensa' THEN
            INSERT INTO public.recompensa (nombre, descripcion, "nivelRequerido", existencias,
                "fechaVigenciaInicio", "fechaVigenciaFin", estado, "creadoPor")
            VALUES (privado.texto_requerido(datos->'nombre', 150), btrim(datos->>'descripcion'),
                (datos->>'nivelRequerido')::integer, (datos->>'existencias')::integer,
                (datos->>'vigenciaInicio')::timestamptz, (datos->>'vigenciaFin')::timestamptz,
                CASE WHEN datos->>'estado' = 'activa' AND (datos->>'existencias')::integer = 0 THEN 'agotada'
                     ELSE datos->>'estado' END, actor)
            RETURNING * INTO r;
        ELSE
            SELECT * INTO r FROM public.recompensa WHERE id = (datos->>'id')::uuid FOR UPDATE;
            IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la recompensa.' USING ERRCODE = 'P0002'; END IF;
            IF r."actualizadoEn" IS DISTINCT FROM (datos->>'actualizadoEn')::timestamptz THEN
                RAISE EXCEPTION 'La recompensa cambió.' USING ERRCODE = '40001';
            END IF;
            UPDATE public.recompensa SET nombre = privado.texto_requerido(datos->'nombre', 150),
                descripcion = btrim(datos->>'descripcion'), "nivelRequerido" = (datos->>'nivelRequerido')::integer,
                existencias = (datos->>'existencias')::integer,
                "fechaVigenciaInicio" = (datos->>'vigenciaInicio')::timestamptz,
                "fechaVigenciaFin" = (datos->>'vigenciaFin')::timestamptz,
                estado = CASE WHEN datos->>'estado' = 'activa' AND (datos->>'existencias')::integer = 0 THEN 'agotada'
                              ELSE datos->>'estado' END
            WHERE id = r.id RETURNING * INTO r;
        END IF;
        RETURN privado.vista_recompensa(r);
    END IF;

    IF operacion = 'entregas' THEN
        RETURN (SELECT coalesce(jsonb_agg(privado.vista_entrega(x) ORDER BY x."fechaEntrega" DESC, x.id), '[]'::jsonb)
                FROM (SELECT * FROM public."entregaRecompensa" ORDER BY "fechaEntrega" DESC, id LIMIT 500) x);
    END IF;

    IF operacion = 'asignar' THEN
        usuario := (datos->>'usuarioId')::uuid;
        IF jsonb_typeof(datos->'fechaAutorizacion') IS DISTINCT FROM 'string'
            OR (datos->>'fechaAutorizacion')::date > hoy THEN
            RAISE EXCEPTION 'La fecha de autorización no puede ser futura.' USING ERRCODE = '22023';
        END IF;
        SELECT * INTO r FROM public.recompensa WHERE id = (datos->>'recompensaId')::uuid FOR UPDATE;
        IF NOT FOUND OR usuario IS NULL OR NOT EXISTS (SELECT 1 FROM public.perfil WHERE id = usuario) THEN
            RAISE EXCEPTION 'No se encontró la recompensa o la persona.' USING ERRCODE = 'P0002';
        END IF;
        IF EXISTS (SELECT 1 FROM public."entregaRecompensa" WHERE "recompensaId" = r.id AND "usuarioId" = usuario
                   AND estado <> 'cancelada') THEN
            RAISE EXCEPTION 'La persona ya tiene esta recompensa.' USING ERRCODE = '40001';
        END IF;
        IF r.estado <> 'activa' OR r.existencias < 1 THEN
            RAISE EXCEPTION 'La recompensa no está activa o no tiene existencias.' USING ERRCODE = '55000';
        END IF;
        BEGIN
            INSERT INTO public."entregaRecompensa" ("recompensaId", "usuarioId", "entregadoPor", notas, estado,
                "autorizacionReferencia", "autorizadaPor", "autorizadaEl")
            VALUES (r.id, usuario, actor,
                CASE WHEN jsonb_typeof(datos->'notas') = 'string' THEN left(btrim(datos->>'notas'), 500) ELSE '' END,
                'asignada', privado.texto_requerido(datos->'referencia', 120),
                privado.texto_requerido(datos->'autoridad', 150), (datos->>'fechaAutorizacion')::date)
            RETURNING * INTO e;
        EXCEPTION WHEN check_violation THEN
            -- El disparador histórico explica vigencia, credencial o nivel.
            RAISE EXCEPTION '%', SQLERRM USING ERRCODE = '23514';
        END;
        UPDATE public.recompensa SET estado = 'agotada' WHERE id = r.id AND existencias = 0 AND estado = 'activa';
        RETURN privado.vista_entrega(e);
    END IF;

    -- confirmar / cancelar
    SELECT * INTO e FROM public."entregaRecompensa" WHERE id = (datos->>'entregaId')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la asignación.' USING ERRCODE = 'P0002'; END IF;
    IF operacion = 'confirmar' THEN
        IF e.estado = 'entregada' AND e."confirmadaPor" = actor THEN
            RETURN privado.vista_entrega(e); -- reintento
        END IF;
        IF e.estado <> 'asignada' THEN
            RAISE EXCEPTION 'Solo se confirma una recompensa asignada.' USING ERRCODE = '55000';
        END IF;
        UPDATE public."entregaRecompensa" SET estado = 'entregada', "confirmadaPor" = actor, "confirmadaEn" = clock_timestamp()
        WHERE id = e.id RETURNING * INTO e;
    ELSE
        IF e.estado = 'cancelada' AND e."canceladaPor" = actor THEN
            RETURN privado.vista_entrega(e);
        END IF;
        IF e.estado <> 'asignada' THEN
            RAISE EXCEPTION 'Solo se cancela una recompensa asignada que aún no se entrega.' USING ERRCODE = '55000';
        END IF;
        PERFORM 1 FROM public.recompensa WHERE id = e."recompensaId" FOR UPDATE;
        UPDATE public."entregaRecompensa" SET estado = 'cancelada', "canceladaPor" = actor, "canceladaEn" = clock_timestamp(),
            "motivoCancelacion" = privado.texto_requerido(datos->'motivo', 500)
        WHERE id = e.id RETURNING * INTO e;
        UPDATE public.recompensa SET existencias = existencias + 1,
            estado = CASE WHEN estado = 'agotada' THEN 'activa' ELSE estado END
        WHERE id = e."recompensaId";
    END IF;
    RETURN privado.vista_entrega(e);
END;
$$;

REVOKE ALL ON FUNCTION privado.nivel_progreso(integer), privado.sincronizar_progreso(uuid),
    privado.evaluar_participacion(public.asistencia), privado.progreso_por_asistencia(), privado.progreso_por_sesion(),
    privado.resumen_progreso(uuid), privado.vista_recompensa(public.recompensa),
    privado.vista_entrega(public."entregaRecompensa"), privado.texto_requerido(jsonb, integer),
    privado.progreso_recompensas(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.progreso_recompensas(operacion text, datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
    SELECT privado.progreso_recompensas(operacion, datos);
$$;
REVOKE ALL ON FUNCTION public.progreso_recompensas(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.progreso_recompensas(text, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
