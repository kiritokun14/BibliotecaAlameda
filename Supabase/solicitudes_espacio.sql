-- HU-16 / CU-16 / T-076. Solicitar visita o uso de espacio (lado de la persona usuaria).
-- Se ejecuta después de perfil_propio.sql.
--
-- Reglas de HU-16:
--   * El envío NO confirma la reserva y NO requiere credencial bibliotecaria (CA-16.1).
--   * Solicitudes para el mismo horario quedan en revisión; ninguna se asigna sola (CA-16.2).
--   * El formulario distingue visita y uso de espacio.
--
-- Qué agrega:
--   1. solicitudEspacio: folio (SE-0001…), tipo (visita | uso_espacio) y datos de cancelación.
--   2. Tabla historialSolicitudEspacio: bitácora de envío, cancelación y, después, decisiones del personal.
--   3. Función solicitudes_espacio(operacion, datos) para cualquier cuenta con sesión:
--      areas, enviar, listar, obtener y cancelar. Solo trabaja con las solicitudes propias.
--      Los datos de contacto salen del perfil y de la cuenta, no del navegador.
--
-- La revisión del personal (aprobar, proponer alternativa, rechazar) va en otro script.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Folio, tipo y cancelación
-- ---------------------------------------------------------------------------
CREATE SEQUENCE privado.folio_solicitud_espacio;
REVOKE ALL ON SEQUENCE privado.folio_solicitud_espacio FROM PUBLIC, anon, authenticated;

CREATE FUNCTION privado.siguiente_folio_solicitud_espacio()
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $$
  -- SE-0001 … SE-9999, después SE-10000 (no se recorta)
  SELECT 'SE-' || lpad(n::text, greatest(4, length(n::text)), '0')
  FROM (SELECT nextval('privado.folio_solicitud_espacio') AS n) s;
$$;
REVOKE ALL ON FUNCTION privado.siguiente_folio_solicitud_espacio() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION privado.siguiente_folio_solicitud_espacio() TO service_role;

ALTER TABLE public."solicitudEspacio"
  ADD COLUMN "folio" text,
  ADD COLUMN "tipoSolicitud" text NOT NULL DEFAULT 'uso_espacio',
  ADD COLUMN "canceladaEn" timestamptz,
  ADD COLUMN "motivoCancelacion" text;

-- Folio para las solicitudes que ya existen, en orden de creación
UPDATE public."solicitudEspacio" s SET "folio" = f.folio
FROM (
  SELECT id, privado.siguiente_folio_solicitud_espacio() AS folio
  FROM (SELECT id FROM public."solicitudEspacio" ORDER BY "creadaEn", id) ordenadas
) f
WHERE s.id = f.id;

ALTER TABLE public."solicitudEspacio"
  ALTER COLUMN "folio" SET DEFAULT privado.siguiente_folio_solicitud_espacio(),
  ALTER COLUMN "folio" SET NOT NULL,
  ADD CONSTRAINT "uq_solicitudEspacio_folio" UNIQUE ("folio"),
  ADD CONSTRAINT "ck_solicitudEspacio_tipo" CHECK ("tipoSolicitud" IN ('visita', 'uso_espacio')),
  ADD CONSTRAINT "ck_solicitudEspacio_cancelacion" CHECK (("estadoSolicitud" = 'cancelada') = ("canceladaEn" IS NOT NULL)),
  ADD CONSTRAINT "ck_solicitudEspacio_motivo" CHECK (length("propositoVisita") BETWEEN 1 AND 300);

CREATE INDEX "ix_solicitudEspacio_solicitante" ON public."solicitudEspacio" ("solicitadoPor", "creadaEn" DESC);
CREATE INDEX "ix_solicitudEspacio_espacio_fecha" ON public."solicitudEspacio" ("espacioSolicitadoId", "fechaInicioSolicitado");

-- ---------------------------------------------------------------------------
-- 2. Bitácora
-- ---------------------------------------------------------------------------
CREATE TABLE public."historialSolicitudEspacio" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "solicitudId" uuid NOT NULL,
  "accion" text NOT NULL,
  "nota" text,
  "detalles" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "realizadoPor" uuid NOT NULL,
  "realizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_historialSolicitudEspacio" PRIMARY KEY ("id"),
  CONSTRAINT "fk_historialSolicitudEspacio_solicitud" FOREIGN KEY ("solicitudId")
    REFERENCES public."solicitudEspacio" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_historialSolicitudEspacio_actor" FOREIGN KEY ("realizadoPor")
    REFERENCES public.perfil ("id"),
  CONSTRAINT "ck_historialSolicitudEspacio_accion" CHECK ("accion" IN
    ('envio', 'cancelacion', 'observaciones', 'alternativa', 'aprobacion', 'rechazo')),
  CONSTRAINT "ck_historialSolicitudEspacio_detalles" CHECK (jsonb_typeof("detalles") = 'object')
);
CREATE INDEX "ix_historialSolicitudEspacio_solicitud" ON public."historialSolicitudEspacio" ("solicitudId", "realizadoEn");

ALTER TABLE public."historialSolicitudEspacio" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."historialSolicitudEspacio" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."historialSolicitudEspacio" TO service_role;
GRANT SELECT ON TABLE public."historialSolicitudEspacio" TO authenticated;
CREATE POLICY "lectura_propia_historialSolicitudEspacio" ON public."historialSolicitudEspacio"
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public."solicitudEspacio" s
    WHERE s.id = "solicitudId" AND s."solicitadoPor" = (SELECT auth.uid())));

-- ---------------------------------------------------------------------------
-- 3. Función para la persona usuaria
-- ---------------------------------------------------------------------------
CREATE FUNCTION privado.solicitud_espacio_para_usuario(s public."solicitudEspacio")
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
    'creadaEn', s."creadaEn",
    'actualizadoEn', s."actualizadoEn",
    'canceladaEn', s."canceladaEn",
    'motivoCancelacion', s."motivoCancelacion",
    'historial', coalesce((
      SELECT jsonb_agg(jsonb_build_object('accion', h."accion", 'nota', h."nota", 'fecha', h."realizadoEn")
                       ORDER BY h."realizadoEn", h.id)
      FROM public."historialSolicitudEspacio" h WHERE h."solicitudId" = s.id), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION privado.solicitud_espacio_para_usuario(public."solicitudEspacio") FROM PUBLIC, anon, authenticated;

CREATE FUNCTION privado.solicitudes_espacio(operacion text, datos jsonb DEFAULT '{}'::jsonb)
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
  IF operacion IS NULL OR operacion NOT IN ('areas', 'enviar', 'listar', 'obtener', 'cancelar')
     OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
  END IF;

  -- Cualquier cuenta con sesión vigente, perfil activo y correo confirmado.
  -- HU-16: no se exige credencial bibliotecaria.
  actor := privado.comprobar_sesion_cuenta();

  claves := CASE operacion
    WHEN 'areas'    THEN ARRAY[]::text[]
    WHEN 'enviar'   THEN ARRAY['tipo', 'espacio', 'fecha', 'horaInicio', 'horaFin', 'personas', 'motivo', 'institucion']
    WHEN 'listar'   THEN ARRAY['estado', 'limite', 'desplazamiento']
    WHEN 'obtener'  THEN ARRAY['folio']
    WHEN 'cancelar' THEN ARRAY['folio', 'motivo', 'comentarios'] END;
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
    v_desde := (v_fecha + v_inicio) AT TIME ZONE 'America/Mazatlan';
    v_hasta := (v_fecha + v_fin) AT TIME ZONE 'America/Mazatlan';
    IF v_hasta <= v_desde THEN
      RAISE EXCEPTION 'La hora de término debe ser después de la de inicio.' USING ERRCODE = '23514';
    END IF;
    IF v_desde <= now() THEN
      RAISE EXCEPTION 'Elige una fecha y hora futuras.' USING ERRCODE = '23514';
    END IF;
    IF v_fecha > (now() AT TIME ZONE 'America/Mazatlan')::date + 365 THEN
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

  IF operacion = 'cancelar' THEN
    IF solicitud."estadoSolicitud" NOT IN ('borrador', 'en_revision', 'requiere_correccion') THEN
      RAISE EXCEPTION 'Esta solicitud ya no se puede cancelar desde aquí.' USING ERRCODE = '55000';
    END IF;
    v_nota := nullif(btrim(coalesce(datos->>'motivo', '')), '');
    v_comentarios := nullif(btrim(coalesce(datos->>'comentarios', '')), '');
    IF length(v_nota) > 120 OR length(v_comentarios) > 300 THEN
      RAISE EXCEPTION 'El motivo o los comentarios son muy largos.' USING ERRCODE = '22001';
    END IF;
    UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'cancelada', "canceladaEn" = now(),
      "motivoCancelacion" = v_nota
    WHERE id = solicitud.id RETURNING * INTO solicitud;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "nota", "detalles", "realizadoPor")
    VALUES (solicitud.id, 'cancelacion', v_nota,
            CASE WHEN v_comentarios IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('comentarios', v_comentarios) END,
            actor);
    RETURN privado.solicitud_espacio_para_usuario(solicitud);
  END IF;

  RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION privado.solicitudes_espacio(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION privado.solicitudes_espacio(text, jsonb) TO authenticated;

CREATE FUNCTION public.solicitudes_espacio(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT privado.solicitudes_espacio(operacion, datos);
$$;
REVOKE ALL ON FUNCTION public.solicitudes_espacio(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitudes_espacio(text, jsonb) TO authenticated;

COMMIT;
