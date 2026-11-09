-- T-076 / HU-16. Revisión de solicitudes de visita o uso de espacio (lado del personal).
-- Se ejecuta después de solicitudes_espacio.sql.
--
-- Criterios de T-076:
--   1. La solicitud original queda separada del acuerdo: lo que pidió la persona no se modifica;
--      lo acordado va en columnas propias (espacioAcordadoId, inicioAcordado, finAcordado, condicionesUso).
--   2. Alternativas y observaciones son trazables: cada propuesta, respuesta y decisión queda en
--      historialSolicitudEspacio con quién la hizo y cuándo.
--   3. La aprobación registra quién verificó la disponibilidad (autorizadoPor y la lista de cotejo).
--   4. Un cambio de espacio o fecha requiere revisión institucional: el personal lo propone,
--      la persona responde y la solicitud vuelve a revisión; nunca se aprueba sola.
--
-- Quién atiende: cuentas con la capacidad global 'registrar_resoluciones_actividades', la misma que
-- el panel usa para /admin/atencion/espacios (Front/src/servicios/accesoPanel.ts).
--
-- Qué agrega:
--   1. Columnas del acuerdo y de la propuesta vigente en solicitudEspacio.
--   2. Acción 'respuesta' en la bitácora.
--   3. Función atender_solicitudes_espacio(operacion, datos) para el personal:
--      bandeja, obtener, aprobar, proponer, rechazar y cancelar.
--   4. Nueva versión de solicitudes_espacio(operacion, datos) para la persona usuaria:
--      agrega 'responder' (aceptar o no la propuesta) y muestra el acuerdo y la propuesta.
--   Cada decisión del personal deja un aviso en avisoNotificacion para la persona.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Acuerdo y propuesta, separados de lo solicitado
-- ---------------------------------------------------------------------------
ALTER TABLE public."solicitudEspacio"
  ADD COLUMN "espacioAcordadoId" uuid,
  ADD COLUMN "inicioAcordado" timestamptz,
  ADD COLUMN "finAcordado" timestamptz,
  ADD COLUMN "condicionesUso" text,
  ADD COLUMN "propuesta" jsonb,
  ADD COLUMN "resueltaEn" timestamptz,
  ADD CONSTRAINT "fk_solicitudEspacio_espacioAcordado" FOREIGN KEY ("espacioAcordadoId")
    REFERENCES public."espacio" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT "ck_solicitudEspacio_acuerdo" CHECK (
    ("inicioAcordado" IS NULL) = ("finAcordado" IS NULL)
    AND ("inicioAcordado" IS NULL OR "inicioAcordado" < "finAcordado")),
  ADD CONSTRAINT "ck_solicitudEspacio_aprobada" CHECK ("estadoSolicitud" <> 'aprobada' OR "inicioAcordado" IS NOT NULL),
  ADD CONSTRAINT "ck_solicitudEspacio_propuesta" CHECK (
    ("estadoSolicitud" = 'requiere_correccion') = ("propuesta" IS NOT NULL)
    AND ("propuesta" IS NULL OR jsonb_typeof("propuesta") = 'object')),
  ADD CONSTRAINT "ck_solicitudEspacio_condiciones" CHECK (length("condicionesUso") <= 500),
  ADD CONSTRAINT "ck_solicitudEspacio_observaciones" CHECK (length("observaciones") <= 500);

CREATE INDEX "ix_solicitudEspacio_aprobadas" ON public."solicitudEspacio" ("espacioAcordadoId", "inicioAcordado")
  WHERE "estadoSolicitud" = 'aprobada';
CREATE INDEX "ix_solicitudEspacio_estado" ON public."solicitudEspacio" ("estadoSolicitud", "creadaEn");

-- ---------------------------------------------------------------------------
-- 2. Bitácora: la persona también responde a una propuesta
-- ---------------------------------------------------------------------------
-- Hora real de cada paso (no la del inicio de la transacción), para que el orden de la bitácora sea exacto
ALTER TABLE public."historialSolicitudEspacio" ALTER COLUMN "realizadoEn" SET DEFAULT clock_timestamp();
ALTER TABLE public."historialSolicitudEspacio" DROP CONSTRAINT "ck_historialSolicitudEspacio_accion";
ALTER TABLE public."historialSolicitudEspacio" ADD CONSTRAINT "ck_historialSolicitudEspacio_accion" CHECK ("accion" IN
  ('envio', 'cancelacion', 'observaciones', 'alternativa', 'respuesta', 'aprobacion', 'rechazo'));

-- ---------------------------------------------------------------------------
-- 3. Piezas compartidas
-- ---------------------------------------------------------------------------
-- Espacio y horario en JSON (para acuerdo y propuesta)
CREATE FUNCTION privado.tramo_espacio(p_espacio uuid, p_inicio timestamptz, p_fin timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT CASE WHEN p_inicio IS NULL THEN NULL ELSE jsonb_build_object(
    'espacio', (SELECT jsonb_build_object('slug', e."slug", 'nombre', e."nombre")
                FROM public."espacio" e WHERE e.id = p_espacio),
    'inicio', p_inicio, 'fin', p_fin) END;
$$;
REVOKE ALL ON FUNCTION privado.tramo_espacio(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

-- Vista de la persona usuaria: ahora incluye acuerdo y propuesta (sin datos del personal)
CREATE OR REPLACE FUNCTION privado.solicitud_espacio_para_usuario(s public."solicitudEspacio")
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT jsonb_build_object(
    'folio', s."folio",
    'tipo', s."tipoSolicitud",
    'estado', s."estadoSolicitud",
    'espacio', (SELECT jsonb_build_object('slug', e."slug", 'nombre', e."nombre")
                FROM public."espacio" e WHERE e.id = s."espacioSolicitadoId"),
    'inicio', s."fechaInicioSolicitado",
    'fin', s."fechaFinSolicitado",
    'personas', s."cantidadPersonas",
    'motivo', s."propositoVisita",
    'institucion', s."nombreInstitucion",
    'observaciones', s."observaciones",
    'acuerdo', CASE WHEN s."inicioAcordado" IS NULL THEN NULL ELSE
      privado.tramo_espacio(s."espacioAcordadoId", s."inicioAcordado", s."finAcordado")
      || jsonb_build_object('condiciones', s."condicionesUso") END,
    'propuesta', CASE WHEN s."propuesta" IS NULL THEN NULL ELSE
      privado.tramo_espacio((s."propuesta"->>'espacioId')::uuid, (s."propuesta"->>'inicio')::timestamptz,
                            (s."propuesta"->>'fin')::timestamptz)
      || jsonb_build_object('mensaje', s."propuesta"->>'mensaje') END,
    'creadaEn', s."creadaEn",
    'actualizadoEn', s."actualizadoEn",
    'resueltaEn', s."resueltaEn",
    'canceladaEn', s."canceladaEn",
    'motivoCancelacion', s."motivoCancelacion",
    'historial', coalesce((
      SELECT jsonb_agg(jsonb_build_object('accion', h."accion", 'nota', h."nota", 'fecha', h."realizadoEn",
                                          'porPersonal', h."realizadoPor" <> s."solicitadoPor")
                       ORDER BY h."realizadoEn", h.id)
      FROM public."historialSolicitudEspacio" h WHERE h."solicitudId" = s.id), '[]'::jsonb));
$$;

-- Vista del personal: datos de contacto, acuerdo, propuesta e historial con quién hizo cada acción
CREATE FUNCTION privado.solicitud_espacio_para_personal(s public."solicitudEspacio")
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT (privado.solicitud_espacio_para_usuario(s) - 'historial') || jsonb_build_object(
    'solicitante', jsonb_build_object('nombre', s."nombreResponsable", 'telefono', s."telefonoContacto",
                                      'correo', s."correoContacto"),
    'autorizadoPor', (SELECT concat_ws(' ', p."nombres", p."primerApellido")
                      FROM public.perfil p WHERE p.id = s."autorizadoPor"),
    'historial', coalesce((
      SELECT jsonb_agg(jsonb_build_object('accion', h."accion", 'nota', h."nota", 'detalles', h."detalles",
               'fecha', h."realizadoEn",
               'realizadoPor', (SELECT concat_ws(' ', p."nombres", p."primerApellido")
                                FROM public.perfil p WHERE p.id = h."realizadoPor"))
             ORDER BY h."realizadoEn", h.id)
      FROM public."historialSolicitudEspacio" h WHERE h."solicitudId" = s.id), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION privado.solicitud_espacio_para_personal(public."solicitudEspacio") FROM PUBLIC, anon, authenticated;

-- Qué ocupa un espacio en un horario: solicitudes aprobadas y sesiones de actividades programadas
CREATE FUNCTION privado.ocupacion_espacio(p_espacio uuid, p_inicio timestamptz, p_fin timestamptz, p_excluir uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT coalesce(jsonb_agg(o ORDER BY o->>'inicio'), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('tipo', 'solicitud', 'folio', s."folio", 'inicio', s."inicioAcordado",
                              'fin', s."finAcordado") AS o
    FROM public."solicitudEspacio" s
    WHERE s."estadoSolicitud" = 'aprobada' AND s."espacioAcordadoId" = p_espacio AND s.id <> p_excluir
      AND s."inicioAcordado" < p_fin AND s."finAcordado" > p_inicio
    UNION ALL
    SELECT jsonb_build_object('tipo', 'actividad', 'titulo', a."titulo", 'inicio', x."inicio", 'fin', x."fin")
    FROM public."sesionActividad" x JOIN public."actividad" a ON a.id = x."actividadId"
    WHERE x."espacioId" = p_espacio AND x."estado" IN ('programada', 'en_curso')
      AND x."inicio" < p_fin AND x."fin" > p_inicio
  ) t;
$$;
REVOKE ALL ON FUNCTION privado.ocupacion_espacio(uuid, timestamptz, timestamptz, uuid) FROM PUBLIC, anon, authenticated;

-- Aviso para la persona en sus notificaciones del portal
CREATE FUNCTION privado.avisar_solicitud_espacio(s public."solicitudEspacio", p_titulo text, p_cuerpo text)
RETURNS void LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = pg_catalog AS $$
  INSERT INTO public."avisoNotificacion" ("usuarioId", "titulo", "cuerpoAviso", "tipoAviso", "estadoEnvio", "canalUtilizado")
  VALUES (s."solicitadoPor", p_titulo, p_cuerpo || ' Folio: ' || s."folio" || '.', 'solicitud_espacio', 'pendiente', 'portal');
$$;
REVOKE ALL ON FUNCTION privado.avisar_solicitud_espacio(public."solicitudEspacio", text, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Función del personal
-- ---------------------------------------------------------------------------
CREATE FUNCTION privado.atender_solicitudes_espacio(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $$
#variable_conflict use_variable
DECLARE
  actor uuid;
  claves text[];
  solicitud public."solicitudEspacio"%ROWTYPE;
  v_espacio public."espacio"%ROWTYPE;
  v_estado text; v_buscar text; limite integer; desplazamiento integer; total integer;
  resultado jsonb; conteos jsonb; v_mensaje text; v_motivo text; v_condiciones text;
  v_espacio_id uuid; v_inicio timestamptz; v_fin timestamptz; v_fecha date; v_hora_inicio time; v_hora_fin time;
  v_ocupado jsonb; v_cotejo jsonb;
BEGIN
  IF operacion IS NULL OR operacion NOT IN ('bandeja', 'obtener', 'aprobar', 'proponer', 'rechazar', 'cancelar')
     OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
  END IF;

  actor := privado.comprobar_sesion_cuenta();
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor, true)) p
                 WHERE p->>'capacidad' = 'registrar_resoluciones_actividades' AND p->>'ambito' = 'global') THEN
    RAISE EXCEPTION 'Sin permiso para atender solicitudes de espacio.' USING ERRCODE = '42501';
  END IF;

  claves := CASE operacion
    WHEN 'bandeja'  THEN ARRAY['estado', 'buscar', 'limite', 'desplazamiento']
    WHEN 'obtener'  THEN ARRAY['folio']
    WHEN 'aprobar'  THEN ARRAY['folio', 'verificacion', 'condiciones', 'mensaje']
    WHEN 'proponer' THEN ARRAY['folio', 'espacio', 'fecha', 'horaInicio', 'horaFin', 'mensaje']
    WHEN 'rechazar' THEN ARRAY['folio', 'motivo', 'mensaje']
    WHEN 'cancelar' THEN ARRAY['folio', 'motivo', 'mensaje'] END;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE k <> ALL (claves)) THEN
    RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE = '22023';
  END IF;

  -- Bandeja: todas las solicitudes, con filtro por estado y búsqueda por folio o nombre
  IF operacion = 'bandeja' THEN
    v_estado := nullif(datos->>'estado', '');
    IF v_estado IS NOT NULL AND v_estado NOT IN
       ('en_revision', 'requiere_correccion', 'aprobada', 'rechazada', 'cancelada') THEN
      RAISE EXCEPTION 'Estado inválido.' USING ERRCODE = '22023';
    END IF;
    v_buscar := nullif(btrim(coalesce(datos->>'buscar', '')), '');
    IF length(v_buscar) > 80 THEN
      RAISE EXCEPTION 'Búsqueda muy larga.' USING ERRCODE = '22023';
    END IF;
    BEGIN
      limite := coalesce((datos->>'limite')::integer, 25);
      desplazamiento := coalesce((datos->>'desplazamiento')::integer, 0);
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE = '22023';
    END;
    IF limite NOT BETWEEN 1 AND 100 OR desplazamiento NOT BETWEEN 0 AND 100000 THEN
      RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE = '22023';
    END IF;

    SELECT jsonb_object_agg(e, (SELECT count(*) FROM public."solicitudEspacio" s WHERE s."estadoSolicitud" = e))
    INTO conteos FROM unnest(ARRAY['en_revision', 'requiere_correccion', 'aprobada', 'rechazada', 'cancelada']) e;

    SELECT count(*) INTO total FROM public."solicitudEspacio" s
    WHERE s."estadoSolicitud" <> 'borrador' AND (v_estado IS NULL OR s."estadoSolicitud" = v_estado)
      AND (v_buscar IS NULL OR s."folio" ILIKE '%' || v_buscar || '%' OR s."nombreResponsable" ILIKE '%' || v_buscar || '%');
    -- Las que esperan revisión primero (las más antiguas arriba); luego las demás, recientes primero
    SELECT coalesce(jsonb_agg(privado.solicitud_espacio_para_personal(s) - 'historial'
                              ORDER BY (s."estadoSolicitud" = 'en_revision') DESC,
                                       CASE WHEN s."estadoSolicitud" = 'en_revision' THEN s."creadaEn" END,
                                       s."creadaEn" DESC, s.id), '[]'::jsonb)
    INTO resultado
    FROM (SELECT * FROM public."solicitudEspacio" s
          WHERE s."estadoSolicitud" <> 'borrador' AND (v_estado IS NULL OR s."estadoSolicitud" = v_estado)
            AND (v_buscar IS NULL OR s."folio" ILIKE '%' || v_buscar || '%' OR s."nombreResponsable" ILIKE '%' || v_buscar || '%')
          ORDER BY (s."estadoSolicitud" = 'en_revision') DESC,
                   CASE WHEN s."estadoSolicitud" = 'en_revision' THEN s."creadaEn" END,
                   s."creadaEn" DESC, s.id
          LIMIT limite OFFSET desplazamiento) s;
    RETURN jsonb_build_object('total', total, 'conteos', conteos, 'solicitudes', resultado);
  END IF;

  -- Las demás operaciones trabajan sobre una solicitud
  SELECT * INTO solicitud FROM public."solicitudEspacio" s
  WHERE s."folio" = datos->>'folio' AND s."estadoSolicitud" <> 'borrador'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF operacion = 'obtener' THEN
    -- Ocupación del espacio en el horario que se revisaría (acordado o, si no hay, el solicitado)
    v_espacio_id := coalesce(solicitud."espacioAcordadoId", solicitud."espacioSolicitadoId");
    v_inicio := coalesce(solicitud."inicioAcordado", solicitud."fechaInicioSolicitado");
    v_fin := coalesce(solicitud."finAcordado", solicitud."fechaFinSolicitado");
    RETURN privado.solicitud_espacio_para_personal(solicitud) || jsonb_build_object(
      'ocupacion', CASE WHEN v_espacio_id IS NULL THEN '[]'::jsonb
                        ELSE privado.ocupacion_espacio(v_espacio_id, v_inicio, v_fin, solicitud.id) END);
  END IF;

  v_mensaje := nullif(btrim(coalesce(datos->>'mensaje', '')), '');
  IF length(v_mensaje) > 500 THEN
    RAISE EXCEPTION 'El mensaje para la persona es muy largo.' USING ERRCODE = '22001';
  END IF;

  -- Aprobar: solo en revisión, con la lista de disponibilidad completa y sin choques
  IF operacion = 'aprobar' THEN
    IF solicitud."estadoSolicitud" <> 'en_revision' THEN
      RAISE EXCEPTION 'Solo se aprueba una solicitud en revisión.' USING ERRCODE = '55000';
    END IF;
    v_cotejo := datos->'verificacion';
    IF jsonb_typeof(v_cotejo) IS DISTINCT FROM 'array' OR jsonb_array_length(v_cotejo) NOT BETWEEN 1 AND 10
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_cotejo) x WHERE x <> 'true'::jsonb) THEN
      RAISE EXCEPTION 'Marca todos los puntos de disponibilidad antes de aprobar.' USING ERRCODE = '23514';
    END IF;
    v_condiciones := nullif(btrim(coalesce(datos->>'condiciones', '')), '');
    IF length(v_condiciones) > 500 THEN
      RAISE EXCEPTION 'Las condiciones son muy largas.' USING ERRCODE = '22001';
    END IF;

    -- Lo acordado: lo que aceptó la persona o, si no hubo cambios, lo que pidió
    v_espacio_id := coalesce(solicitud."espacioAcordadoId", solicitud."espacioSolicitadoId");
    v_inicio := coalesce(solicitud."inicioAcordado", solicitud."fechaInicioSolicitado");
    v_fin := coalesce(solicitud."finAcordado", solicitud."fechaFinSolicitado");
    IF v_inicio <= now() THEN
      RAISE EXCEPTION 'La fecha de la solicitud ya pasó. Propón otra fecha.' USING ERRCODE = '23514';
    END IF;
    IF v_espacio_id IS NOT NULL THEN
      -- Bloquea el espacio (igual que al programar sesiones) para que dos aprobaciones no choquen
      SELECT * INTO v_espacio FROM public."espacio" e WHERE e.id = v_espacio_id FOR UPDATE;
      IF NOT v_espacio."activo" THEN
        RAISE EXCEPTION 'El área ya no está disponible. Propón otra.' USING ERRCODE = '23514';
      END IF;
      IF v_espacio."capacidad" > 0 AND solicitud."cantidadPersonas" > v_espacio."capacidad" THEN
        RAISE EXCEPTION 'El área admite hasta % personas.', v_espacio."capacidad" USING ERRCODE = '23514';
      END IF;
      v_ocupado := privado.ocupacion_espacio(v_espacio_id, v_inicio, v_fin, solicitud.id);
      IF jsonb_array_length(v_ocupado) > 0 THEN
        RAISE EXCEPTION 'El área ya está ocupada en ese horario. Propón otro.' USING ERRCODE = '55000';
      END IF;
    END IF;

    UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'aprobada', "autorizadoPor" = actor,
      "espacioAcordadoId" = v_espacio_id, "inicioAcordado" = v_inicio, "finAcordado" = v_fin,
      "condicionesUso" = v_condiciones, "observaciones" = v_mensaje, "resueltaEn" = now()
    WHERE id = solicitud.id RETURNING * INTO solicitud;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "nota", "detalles", "realizadoPor")
    VALUES (solicitud.id, 'aprobacion', v_mensaje,
            jsonb_build_object('verificacion', v_cotejo, 'condiciones', v_condiciones), actor);
    PERFORM privado.avisar_solicitud_espacio(solicitud, 'Solicitud de espacio aprobada',
      'Tu solicitud fue aprobada.' || CASE WHEN v_condiciones IS NULL THEN '' ELSE ' Condiciones: ' || v_condiciones END);
    RETURN privado.solicitud_espacio_para_personal(solicitud);
  END IF;

  -- Proponer otro espacio, fecha u horario (también para reprogramar una aprobada)
  IF operacion = 'proponer' THEN
    IF solicitud."estadoSolicitud" NOT IN ('en_revision', 'aprobada') THEN
      RAISE EXCEPTION 'Esta solicitud no admite una propuesta en su estado actual.' USING ERRCODE = '55000';
    END IF;
    IF v_mensaje IS NULL THEN
      RAISE EXCEPTION 'Explica a la persona el motivo del cambio.' USING ERRCODE = '23514';
    END IF;
    IF NOT (datos ?| ARRAY['espacio', 'fecha', 'horaInicio', 'horaFin']) THEN
      RAISE EXCEPTION 'Indica el espacio, la fecha o el horario que propones.' USING ERRCODE = '23514';
    END IF;

    -- Se parte de lo vigente (acordado o solicitado) y se cambia lo indicado
    v_espacio_id := coalesce(solicitud."espacioAcordadoId", solicitud."espacioSolicitadoId");
    v_inicio := coalesce(solicitud."inicioAcordado", solicitud."fechaInicioSolicitado");
    v_fin := coalesce(solicitud."finAcordado", solicitud."fechaFinSolicitado");
    IF nullif(datos->>'espacio', '') IS NOT NULL THEN
      SELECT * INTO v_espacio FROM public."espacio" e WHERE e."slug" = datos->>'espacio' AND e."activo";
      IF NOT FOUND THEN
        RAISE EXCEPTION 'El área no existe o no se puede solicitar.' USING ERRCODE = '23514';
      END IF;
      v_espacio_id := v_espacio.id;
    ELSIF v_espacio_id IS NOT NULL THEN
      SELECT * INTO v_espacio FROM public."espacio" e WHERE e.id = v_espacio_id;
    END IF;
    BEGIN
      v_fecha := coalesce((datos->>'fecha')::date, (v_inicio AT TIME ZONE 'America/Mexico_City')::date);
      v_hora_inicio := coalesce((datos->>'horaInicio')::time, (v_inicio AT TIME ZONE 'America/Mexico_City')::time);
      v_hora_fin := coalesce((datos->>'horaFin')::time, (v_fin AT TIME ZONE 'America/Mexico_City')::time);
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation THEN
      RAISE EXCEPTION 'Revisa la fecha y el horario.' USING ERRCODE = '23514';
    END;
    v_inicio := (v_fecha + v_hora_inicio) AT TIME ZONE 'America/Mexico_City';
    v_fin := (v_fecha + v_hora_fin) AT TIME ZONE 'America/Mexico_City';
    IF v_fin <= v_inicio THEN
      RAISE EXCEPTION 'La hora de término debe ser después de la de inicio.' USING ERRCODE = '23514';
    END IF;
    IF v_inicio <= now() THEN
      RAISE EXCEPTION 'Elige una fecha y hora futuras.' USING ERRCODE = '23514';
    END IF;
    IF v_fecha > (now() AT TIME ZONE 'America/Mexico_City')::date + 365 THEN
      RAISE EXCEPTION 'Solo se reciben solicitudes para los próximos 12 meses.' USING ERRCODE = '23514';
    END IF;
    IF v_espacio.id IS NOT NULL AND v_espacio."capacidad" > 0 AND solicitud."cantidadPersonas" > v_espacio."capacidad" THEN
      RAISE EXCEPTION 'El área admite hasta % personas.', v_espacio."capacidad" USING ERRCODE = '23514';
    END IF;
    IF v_espacio_id IS NOT DISTINCT FROM coalesce(solicitud."espacioAcordadoId", solicitud."espacioSolicitadoId")
       AND v_inicio = coalesce(solicitud."inicioAcordado", solicitud."fechaInicioSolicitado")
       AND v_fin = coalesce(solicitud."finAcordado", solicitud."fechaFinSolicitado") THEN
      RAISE EXCEPTION 'La propuesta es igual a lo que ya está registrado.' USING ERRCODE = '23514';
    END IF;

    -- La reserva aprobada se libera: el cambio vuelve a revisión cuando la persona responda
    UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'requiere_correccion', "autorizadoPor" = actor,
      "propuesta" = jsonb_build_object('espacioId', v_espacio_id, 'inicio', v_inicio, 'fin', v_fin, 'mensaje', v_mensaje),
      "observaciones" = v_mensaje, "resueltaEn" = NULL
    WHERE id = solicitud.id RETURNING * INTO solicitud;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "nota", "detalles", "realizadoPor")
    VALUES (solicitud.id, 'alternativa', v_mensaje,
            jsonb_build_object('espacio', v_espacio."slug", 'inicio', v_inicio, 'fin', v_fin), actor);
    PERFORM privado.avisar_solicitud_espacio(solicitud, 'Propuesta de cambio en tu solicitud',
      'El personal propone otro espacio, fecha u horario. Revisa la propuesta y respóndela.');
    RETURN privado.solicitud_espacio_para_personal(solicitud);
  END IF;

  -- Rechazar (en revisión o esperando respuesta) o cancelar (ya aprobada)
  v_motivo := nullif(btrim(coalesce(datos->>'motivo', '')), '');
  IF v_motivo IS NULL OR length(v_motivo) > 120 THEN
    RAISE EXCEPTION 'Elige un motivo.' USING ERRCODE = '23514';
  END IF;
  IF v_mensaje IS NULL THEN
    RAISE EXCEPTION 'Escribe un mensaje para la persona.' USING ERRCODE = '23514';
  END IF;

  IF operacion = 'rechazar' THEN
    IF solicitud."estadoSolicitud" NOT IN ('en_revision', 'requiere_correccion') THEN
      RAISE EXCEPTION 'Esta solicitud ya no se puede rechazar.' USING ERRCODE = '55000';
    END IF;
    UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'rechazada', "autorizadoPor" = actor,
      "propuesta" = NULL, "observaciones" = v_mensaje, "resueltaEn" = now()
    WHERE id = solicitud.id RETURNING * INTO solicitud;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "nota", "detalles", "realizadoPor")
    VALUES (solicitud.id, 'rechazo', v_mensaje, jsonb_build_object('motivo', v_motivo), actor);
    PERFORM privado.avisar_solicitud_espacio(solicitud, 'Solicitud de espacio no aprobada',
      'Tu solicitud no se aprobó. Motivo: ' || v_motivo || '.');
    RETURN privado.solicitud_espacio_para_personal(solicitud);
  END IF;

  IF operacion = 'cancelar' THEN
    IF solicitud."estadoSolicitud" <> 'aprobada' THEN
      RAISE EXCEPTION 'Solo se cancela aquí una solicitud aprobada.' USING ERRCODE = '55000';
    END IF;
    UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'cancelada', "canceladaEn" = now(),
      "motivoCancelacion" = v_motivo, "observaciones" = v_mensaje, "autorizadoPor" = actor
    WHERE id = solicitud.id RETURNING * INTO solicitud;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "nota", "detalles", "realizadoPor")
    VALUES (solicitud.id, 'cancelacion', v_mensaje, jsonb_build_object('motivo', v_motivo), actor);
    PERFORM privado.avisar_solicitud_espacio(solicitud, 'Solicitud de espacio cancelada',
      'La biblioteca canceló tu solicitud aprobada. Motivo: ' || v_motivo || '.');
    RETURN privado.solicitud_espacio_para_personal(solicitud);
  END IF;

  RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION privado.atender_solicitudes_espacio(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION privado.atender_solicitudes_espacio(text, jsonb) TO authenticated;

CREATE FUNCTION public.atender_solicitudes_espacio(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT privado.atender_solicitudes_espacio(operacion, datos);
$$;
REVOKE ALL ON FUNCTION public.atender_solicitudes_espacio(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atender_solicitudes_espacio(text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Persona usuaria: responder la propuesta (y cancelar limpia la propuesta)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION privado.solicitudes_espacio(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $$
#variable_conflict use_variable
DECLARE
  actor uuid;
  claves text[];
  solicitud public."solicitudEspacio"%ROWTYPE;
  v_tipo text; v_espacio public."espacio"%ROWTYPE; v_fecha date; v_inicio time; v_fin time;
  v_desde timestamptz; v_hasta timestamptz; v_personas integer; v_motivo text; v_institucion text;
  v_nombre text; v_telefono text; v_correo text; v_nota text; v_comentarios text;
  v_estado text; limite integer; desplazamiento integer; resultado jsonb; total integer;
BEGIN
  IF operacion IS NULL OR operacion NOT IN ('areas', 'enviar', 'listar', 'obtener', 'cancelar', 'responder')
     OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
  END IF;

  -- Cualquier cuenta con sesión vigente, perfil activo y correo confirmado.
  -- HU-16: no se exige credencial bibliotecaria.
  actor := privado.comprobar_sesion_cuenta();

  claves := CASE operacion
    WHEN 'areas'     THEN ARRAY[]::text[]
    WHEN 'enviar'    THEN ARRAY['tipo', 'espacio', 'fecha', 'horaInicio', 'horaFin', 'personas', 'motivo', 'institucion']
    WHEN 'listar'    THEN ARRAY['estado', 'limite', 'desplazamiento']
    WHEN 'obtener'   THEN ARRAY['folio']
    WHEN 'cancelar'  THEN ARRAY['folio', 'motivo', 'comentarios']
    WHEN 'responder' THEN ARRAY['folio', 'acepta', 'comentarios'] END;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE k <> ALL (claves)) THEN
    RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE = '22023';
  END IF;

  -- Áreas que se pueden solicitar (las activas)
  IF operacion = 'areas' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('slug', e."slug", 'nombre', e."nombre",
             'capacidad', e."capacidad", 'descripcion', e."descripcion") ORDER BY e."nombre"), '[]'::jsonb)
    INTO resultado FROM public."espacio" e WHERE e."activo";
    RETURN resultado;
  END IF;

  IF operacion = 'enviar' THEN
    v_tipo := coalesce(nullif(datos->>'tipo', ''), 'uso_espacio');
    IF v_tipo NOT IN ('visita', 'uso_espacio') THEN
      RAISE EXCEPTION 'Tipo de solicitud inválido.' USING ERRCODE = '23514';
    END IF;

    -- El espacio es obligatorio para uso de espacio y opcional para una visita.
    IF nullif(datos->>'espacio', '') IS NOT NULL THEN
      SELECT * INTO v_espacio FROM public."espacio" e WHERE e."slug" = datos->>'espacio' AND e."activo";
      IF NOT FOUND THEN
        RAISE EXCEPTION 'El área no existe o no se puede solicitar.' USING ERRCODE = '23514';
      END IF;
    ELSIF v_tipo = 'uso_espacio' THEN
      RAISE EXCEPTION 'Elige el área que quieres solicitar.' USING ERRCODE = '23514';
    END IF;

    BEGIN
      v_fecha := (datos->>'fecha')::date;
      v_inicio := (datos->>'horaInicio')::time;
      v_fin := (datos->>'horaFin')::time;
      v_personas := (datos->>'personas')::integer;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation
              OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Revisa la fecha, el horario y el número de personas.' USING ERRCODE = '23514';
    END;
    IF v_fecha IS NULL OR v_inicio IS NULL OR v_fin IS NULL OR v_personas IS NULL THEN
      RAISE EXCEPTION 'Faltan campos obligatorios.' USING ERRCODE = '23514';
    END IF;
    -- Horario de la biblioteca (Tepic)
    v_desde := (v_fecha + v_inicio) AT TIME ZONE 'America/Mexico_City';
    v_hasta := (v_fecha + v_fin) AT TIME ZONE 'America/Mexico_City';
    IF v_hasta <= v_desde THEN
      RAISE EXCEPTION 'La hora de término debe ser después de la de inicio.' USING ERRCODE = '23514';
    END IF;
    IF v_desde <= now() THEN
      RAISE EXCEPTION 'Elige una fecha y hora futuras.' USING ERRCODE = '23514';
    END IF;
    IF v_fecha > (now() AT TIME ZONE 'America/Mexico_City')::date + 365 THEN
      RAISE EXCEPTION 'Solo se reciben solicitudes para los próximos 12 meses.' USING ERRCODE = '23514';
    END IF;
    IF v_personas < 1 OR v_personas > 200 THEN
      RAISE EXCEPTION 'El número de personas debe estar entre 1 y 200.' USING ERRCODE = '23514';
    END IF;
    IF v_espacio.id IS NOT NULL AND v_espacio."capacidad" > 0 AND v_personas > v_espacio."capacidad" THEN
      RAISE EXCEPTION 'El área admite hasta % personas.', v_espacio."capacidad" USING ERRCODE = '23514';
    END IF;

    v_motivo := btrim(coalesce(datos->>'motivo', ''));
    IF v_motivo = '' OR length(v_motivo) > 300 THEN
      RAISE EXCEPTION 'Describe la actividad en 300 caracteres o menos.' USING ERRCODE = '23514';
    END IF;
    v_institucion := nullif(btrim(coalesce(datos->>'institucion', '')), '');
    IF length(v_institucion) > 150 THEN
      RAISE EXCEPTION 'El nombre de la institución es muy largo.' USING ERRCODE = '22001';
    END IF;

    -- Evita llenar la bandeja del personal: hasta 5 solicitudes abiertas por cuenta.
    IF (SELECT count(*) FROM public."solicitudEspacio" s
        WHERE s."solicitadoPor" = actor AND s."estadoSolicitud" IN ('borrador', 'en_revision', 'requiere_correccion')) >= 5 THEN
      RAISE EXCEPTION 'Ya tienes 5 solicitudes en revisión. Espera respuesta o cancela alguna.' USING ERRCODE = '55000';
    END IF;

    -- Contacto desde el perfil y la cuenta (no se acepta del navegador)
    SELECT concat_ws(' ', p."nombres", p."primerApellido", p."segundoApellido"), p."telefono", u."email"
    INTO v_nombre, v_telefono, v_correo
    FROM public.perfil p JOIN auth.users u ON u.id = p.id WHERE p.id = actor;

    INSERT INTO public."solicitudEspacio" ("tipoSolicitud", "propositoVisita", "cantidadPersonas",
      "espacioSolicitadoId", "fechaInicioSolicitado", "fechaFinSolicitado", "estadoSolicitud",
      "solicitadoPor", "nombreInstitucion", "nombreResponsable", "telefonoContacto", "correoContacto")
    VALUES (v_tipo, v_motivo, v_personas, v_espacio.id, v_desde, v_hasta, 'en_revision',
      actor, v_institucion, v_nombre, v_telefono, v_correo)
    RETURNING * INTO solicitud;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "realizadoPor")
    VALUES (solicitud.id, 'envio', actor);
    RETURN privado.solicitud_espacio_para_usuario(solicitud);
  END IF;

  -- Mis solicitudes, de la más reciente a la más antigua
  IF operacion = 'listar' THEN
    v_estado := nullif(datos->>'estado', '');
    IF v_estado IS NOT NULL AND v_estado NOT IN
       ('en_revision', 'requiere_correccion', 'aprobada', 'rechazada', 'cancelada') THEN
      RAISE EXCEPTION 'Estado inválido.' USING ERRCODE = '22023';
    END IF;
    BEGIN
      limite := coalesce((datos->>'limite')::integer, 25);
      desplazamiento := coalesce((datos->>'desplazamiento')::integer, 0);
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE = '22023';
    END;
    IF limite NOT BETWEEN 1 AND 100 OR desplazamiento NOT BETWEEN 0 AND 100000 THEN
      RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO total FROM public."solicitudEspacio" s
    WHERE s."solicitadoPor" = actor AND (v_estado IS NULL OR s."estadoSolicitud" = v_estado);
    SELECT coalesce(jsonb_agg(privado.solicitud_espacio_para_usuario(s) - 'historial'
                              ORDER BY s."creadaEn" DESC, s.id DESC), '[]'::jsonb)
    INTO resultado
    FROM (SELECT * FROM public."solicitudEspacio" s
          WHERE s."solicitadoPor" = actor AND (v_estado IS NULL OR s."estadoSolicitud" = v_estado)
          ORDER BY s."creadaEn" DESC, s.id DESC LIMIT limite OFFSET desplazamiento) s;
    RETURN jsonb_build_object('total', total, 'solicitudes', resultado);
  END IF;

  -- Una solicitud propia por folio
  SELECT * INTO solicitud FROM public."solicitudEspacio" s
  WHERE s."folio" = datos->>'folio' AND s."solicitadoPor" = actor
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF operacion = 'obtener' THEN
    RETURN privado.solicitud_espacio_para_usuario(solicitud);
  END IF;

  v_comentarios := nullif(btrim(coalesce(datos->>'comentarios', '')), '');
  IF length(v_comentarios) > 300 THEN
    RAISE EXCEPTION 'Los comentarios son muy largos.' USING ERRCODE = '22001';
  END IF;

  IF operacion = 'cancelar' THEN
    IF solicitud."estadoSolicitud" NOT IN ('borrador', 'en_revision', 'requiere_correccion') THEN
      RAISE EXCEPTION 'Esta solicitud ya no se puede cancelar desde aquí.' USING ERRCODE = '55000';
    END IF;
    v_nota := nullif(btrim(coalesce(datos->>'motivo', '')), '');
    IF length(v_nota) > 120 THEN
      RAISE EXCEPTION 'El motivo o los comentarios son muy largos.' USING ERRCODE = '22001';
    END IF;
    UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'cancelada', "canceladaEn" = now(),
      "motivoCancelacion" = v_nota, "propuesta" = NULL
    WHERE id = solicitud.id RETURNING * INTO solicitud;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "nota", "detalles", "realizadoPor")
    VALUES (solicitud.id, 'cancelacion', v_nota,
            CASE WHEN v_comentarios IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('comentarios', v_comentarios) END,
            actor);
    RETURN privado.solicitud_espacio_para_usuario(solicitud);
  END IF;

  -- Responder la propuesta del personal. En ambos casos vuelve a revisión (criterio 4):
  -- si acepta, lo propuesto pasa a ser el acuerdo por confirmar; si no, el personal vuelve a decidir.
  IF operacion = 'responder' THEN
    IF solicitud."estadoSolicitud" <> 'requiere_correccion' THEN
      RAISE EXCEPTION 'Esta solicitud no tiene una propuesta por responder.' USING ERRCODE = '55000';
    END IF;
    IF jsonb_typeof(datos->'acepta') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'Indica si aceptas la propuesta.' USING ERRCODE = '23514';
    END IF;
    IF (datos->>'acepta')::boolean THEN
      UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'en_revision',
        "espacioAcordadoId" = (solicitud."propuesta"->>'espacioId')::uuid,
        "inicioAcordado" = (solicitud."propuesta"->>'inicio')::timestamptz,
        "finAcordado" = (solicitud."propuesta"->>'fin')::timestamptz,
        "propuesta" = NULL
      WHERE id = solicitud.id RETURNING * INTO solicitud;
    ELSE
      UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'en_revision', "propuesta" = NULL
      WHERE id = solicitud.id RETURNING * INTO solicitud;
    END IF;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "nota", "detalles", "realizadoPor")
    VALUES (solicitud.id, 'respuesta', v_comentarios,
            jsonb_build_object('acepta', (datos->>'acepta')::boolean), actor);
    RETURN privado.solicitud_espacio_para_usuario(solicitud);
  END IF;

  RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
END;
$$;

COMMIT;
