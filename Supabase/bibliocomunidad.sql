-- HU-24 / CU-24 / T-057 / BDLAG-98
-- CA-24.1: caso tipificado y contacto por correo y/o teléfono.
-- CA-24.2: intentos auditables no cierran ni confirman una incorporación.
-- Requiere Supabase/contacto_publico.sql y el modelo vigente de capacidades.

BEGIN;

ALTER TABLE public."mensajeContacto"
  ALTER COLUMN "correoContacto" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "tipoContacto" text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS "telefonoContacto" text,
  ADD COLUMN IF NOT EXISTS "areaAsignada" text,
  ADD COLUMN IF NOT EXISTS "incorporacionConfirmada" boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."mensajeContacto"'::regclass
      AND conname = 'ck_mensajeContacto_tipoContacto'
  ) THEN
    ALTER TABLE public."mensajeContacto"
      ADD CONSTRAINT "ck_mensajeContacto_tipoContacto"
      CHECK ("tipoContacto" IN ('general', 'bibliocomunidad'));
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."mensajeContacto"'::regclass
      AND conname = 'ck_mensajeContacto_medioContacto'
  ) THEN
    ALTER TABLE public."mensajeContacto"
      ADD CONSTRAINT "ck_mensajeContacto_medioContacto"
      CHECK (
        "tipoContacto" <> 'bibliocomunidad'
        OR "correoContacto" IS NOT NULL
        OR "telefonoContacto" IS NOT NULL
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."mensajeContacto"'::regclass
      AND conname = 'ck_mensajeContacto_areaAsignada'
  ) THEN
    ALTER TABLE public."mensajeContacto"
      ADD CONSTRAINT "ck_mensajeContacto_areaAsignada"
      CHECK (
        "areaAsignada" IS NULL
        OR "areaAsignada" IN ('servicios_digitales')
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."mensajeContacto"'::regclass
      AND conname = 'ck_mensajeContacto_areaBibliocomunidad'
  ) THEN
    ALTER TABLE public."mensajeContacto"
      ADD CONSTRAINT "ck_mensajeContacto_areaBibliocomunidad"
      CHECK (
        "tipoContacto" <> 'bibliocomunidad'
        OR "areaAsignada" = 'servicios_digitales'
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."mensajeContacto"'::regclass
      AND conname = 'ck_mensajeContacto_telefonoContacto'
  ) THEN
    ALTER TABLE public."mensajeContacto"
      ADD CONSTRAINT "ck_mensajeContacto_telefonoContacto"
      CHECK (
        "telefonoContacto" IS NULL
        OR "telefonoContacto" ~ '^\+?[0-9][0-9 ()-]{5,18}$'
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS "ix_mensajeContacto_tipo_estado_creado"
  ON public."mensajeContacto" ("tipoContacto", "estadoAtencion", "creadoEn" DESC);

CREATE TABLE IF NOT EXISTS public."intentoContactoBibliocomunidad" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "contactoId" uuid NOT NULL
    REFERENCES public."mensajeContacto"(id) ON DELETE RESTRICT,
  "tipoIntento" text NOT NULL
    CHECK ("tipoIntento" IN ('llamada', 'correo', 'presencial')),
  exitoso boolean NOT NULL,
  observaciones text NOT NULL
    CHECK (length(btrim(observaciones)) BETWEEN 1 AND 2000),
  "realizadoPor" uuid NOT NULL
    REFERENCES public.perfil(id) ON DELETE RESTRICT,
  "realizadoEn" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ix_intentoContactoBibliocomunidad_contacto"
  ON public."intentoContactoBibliocomunidad" ("contactoId", "realizadoEn" DESC);

ALTER TABLE public."intentoContactoBibliocomunidad" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."intentoContactoBibliocomunidad"
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public."intentoContactoBibliocomunidad" TO authenticated;

CREATE OR REPLACE FUNCTION privado.puede_atender_bibliocomunidad()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT auth.uid() IS NOT NULL
    AND coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM auth.sessions s
      JOIN auth.users u ON u.id = s.user_id
      JOIN public.perfil p ON p.id = u.id
      WHERE s.id::text = (auth.jwt() ->> 'session_id')
        AND s.user_id = auth.uid()
        AND p.estatus = 'activo'
        AND u.email_confirmed_at IS NOT NULL
        AND (s.not_after IS NULL OR s.not_after > statement_timestamp())
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public."rolUsuario" r
        WHERE r."usuarioId" = auth.uid()
          AND r."rolCodigo" = 'administrador'
          AND r.ambito = 'global'
          AND r."vigenteDesde" <= statement_timestamp()
          AND (r."vigenteHasta" IS NULL OR r."vigenteHasta" > statement_timestamp())
      )
      OR (
        privado.capacidad_corresponde(auth.uid(), 'atender_bibliocomunidad')
        AND EXISTS (
          SELECT 1
          FROM public."permisoCuenta" p
          WHERE p."usuarioId" = auth.uid()
            AND p.capacidad = 'atender_bibliocomunidad'
            AND p."actividadId" IS NULL
            AND p."vigenteDesde" <= statement_timestamp()
            AND (p."vigenteHasta" IS NULL OR p."vigenteHasta" > statement_timestamp())
        )
      )
    );
$$;
REVOKE ALL ON FUNCTION privado.puede_atender_bibliocomunidad()
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA privado TO authenticated;
GRANT EXECUTE ON FUNCTION privado.puede_atender_bibliocomunidad()
  TO authenticated;

-- El seguimiento público por folio se mantiene en consultar_contacto_por_folio.
-- No se permite enumerar solicitudes de Bibliocomunidad por SELECT directo.
DROP POLICY IF EXISTS "lectura_propia_mensajeContacto"
  ON public."mensajeContacto";
CREATE POLICY "lectura_propia_mensajeContacto"
  ON public."mensajeContacto"
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = "usuarioId"
    AND "tipoContacto" <> 'bibliocomunidad'
  );

DROP POLICY IF EXISTS "lectura_contactos_personal"
  ON public."mensajeContacto";
CREATE POLICY "lectura_contactos_personal"
  ON public."mensajeContacto"
  FOR SELECT
  TO authenticated
  USING (
    "tipoContacto" <> 'bibliocomunidad'
    AND privado.puede_atender_contactos()
  );

DROP POLICY IF EXISTS "lectura_solicitudes_bibliocomunidad"
  ON public."mensajeContacto";
CREATE POLICY "lectura_solicitudes_bibliocomunidad"
  ON public."mensajeContacto"
  FOR SELECT
  TO authenticated
  USING (
    "tipoContacto" = 'bibliocomunidad'
    AND privado.puede_atender_bibliocomunidad()
  );

DROP POLICY IF EXISTS "actualizar_contactos_personal"
  ON public."mensajeContacto";
CREATE POLICY "actualizar_contactos_personal"
  ON public."mensajeContacto"
  FOR UPDATE
  TO authenticated
  USING (
    "tipoContacto" <> 'bibliocomunidad'
    AND privado.puede_atender_contactos()
    AND "estadoAtencion" IN ('recibido', 'en_atencion')
  )
  WITH CHECK (
    "tipoContacto" <> 'bibliocomunidad'
    AND privado.puede_atender_contactos()
    AND "estadoAtencion" IN ('en_atencion', 'cerrado')
    AND "atendidoPor" = (SELECT auth.uid())
    AND (
      "estadoAtencion" <> 'cerrado'
      OR nullif(btrim("respuestaFinal"), '') IS NOT NULL
    )
  );

-- Las acciones de Bibliocomunidad solo se modifican mediante RPCs que vuelven
-- a validar el usuario y el permiso dentro de la misma transacción.
REVOKE UPDATE ("estadoAtencion", "atendidoPor", "respuestaFinal", "actualizadoEn")
  ON TABLE public."mensajeContacto" FROM authenticated;
REVOKE SELECT ON TABLE public."intentoContactoBibliocomunidad"
  FROM authenticated;

CREATE OR REPLACE FUNCTION public.registrar_solicitud_bibliocomunidad(
  p_usuario_id uuid,
  p_nombre_remitente text,
  p_correo_contacto text,
  p_telefono_contacto text,
  p_interes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_id uuid;
  v_creado_en timestamptz;
BEGIN
  IF p_usuario_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'La identidad no corresponde a la sesión.'
      USING ERRCODE = '42501';
  END IF;
  IF p_usuario_id IS NOT NULL
     AND privado.comprobar_sesion_cuenta() IS DISTINCT FROM p_usuario_id THEN
    RAISE EXCEPTION 'La sesión ya no está vigente.'
      USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(p_nombre_remitente), '') IS NULL
     OR (nullif(btrim(p_correo_contacto), '') IS NULL
         AND nullif(btrim(p_telefono_contacto), '') IS NULL)
     OR (p_correo_contacto IS NOT NULL AND (
       length(p_correo_contacto) > 254
       OR p_correo_contacto !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     ))
     OR (p_telefono_contacto IS NOT NULL AND
       p_telefono_contacto !~ '^\+?[0-9][0-9 ()-]{5,18}$')
     OR length(p_nombre_remitente) > 150
     OR length(p_interes) > 10000
     OR nullif(btrim(p_interes), '') IS NULL THEN
    RAISE EXCEPTION 'Revisa nombre, medio de contacto e interés.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public."mensajeContacto" (
    "usuarioId", "nombreRemitente", "correoContacto", "telefonoContacto",
    "areaAsignada", asunto, "cuerpoMensaje", "tipoContacto", "estadoAtencion"
  )
  VALUES (
    p_usuario_id,
    btrim(p_nombre_remitente),
    nullif(btrim(p_correo_contacto), ''),
    nullif(btrim(p_telefono_contacto), ''),
    'servicios_digitales',
    'Solicitud de incorporación a Bibliocomunidad',
    btrim(p_interes),
    'bibliocomunidad',
    'recibido'
  )
  RETURNING id, "creadoEn" INTO v_id, v_creado_en;

  IF p_usuario_id IS NOT NULL THEN
    INSERT INTO public."avisoNotificacion" (
      "usuarioId", titulo, "cuerpoAviso", "tipoAviso",
      "estadoEnvio", "canalUtilizado"
    )
    VALUES (
      p_usuario_id,
      'Solicitud de Bibliocomunidad recibida',
      'Recibimos tu interés en Bibliocomunidad. Folio: ' || v_id::text,
      'solicitud_bibliocomunidad',
      'pendiente',
      'portal'
    );
  END IF;

  RETURN jsonb_build_object('id', v_id, 'creadoEn', v_creado_en);
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_solicitud_bibliocomunidad(
  uuid, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_solicitud_bibliocomunidad(
  uuid, text, text, text, text
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_intento_bibliocomunidad(
  p_folio uuid,
  p_tipo_intento text,
  p_exitoso boolean,
  p_observaciones text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_contacto public."mensajeContacto"%ROWTYPE;
  v_intento public."intentoContactoBibliocomunidad"%ROWTYPE;
BEGIN
  IF NOT privado.puede_atender_bibliocomunidad() THEN
    RAISE EXCEPTION 'Sin capacidad para atender Bibliocomunidad.'
      USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_contacto
  FROM public."mensajeContacto"
  WHERE id = p_folio AND "tipoContacto" = 'bibliocomunidad'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la solicitud.'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_contacto."estadoAtencion" = 'cerrado' THEN
    RAISE EXCEPTION 'La solicitud ya está cerrada.'
      USING ERRCODE = '23514';
  END IF;
  IF p_tipo_intento NOT IN ('llamada', 'correo', 'presencial')
     OR p_exitoso IS NULL
     OR nullif(btrim(p_observaciones), '') IS NULL
     OR length(p_observaciones) > 2000 THEN
    RAISE EXCEPTION 'Los datos del intento no son válidos.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public."intentoContactoBibliocomunidad" (
    "contactoId", "tipoIntento", exitoso, observaciones, "realizadoPor"
  )
  VALUES (
    p_folio, p_tipo_intento, p_exitoso, btrim(p_observaciones), auth.uid()
  )
  RETURNING * INTO v_intento;

  UPDATE public."mensajeContacto"
  SET "estadoAtencion" = 'en_atencion',
      "atendidoPor" = auth.uid(),
      "actualizadoEn" = statement_timestamp()
  WHERE id = p_folio;

  RETURN jsonb_build_object(
    'id', v_intento.id,
    'folioId', v_intento."contactoId",
    'tipoIntento', v_intento."tipoIntento",
    'exitoso', v_intento.exitoso,
    'observaciones', v_intento.observaciones,
    'estadoAtencion', 'en_atencion',
    'atendidoPor', v_intento."realizadoPor",
    'realizadoEn', v_intento."realizadoEn"
  );
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_intento_bibliocomunidad(
  uuid, text, boolean, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_intento_bibliocomunidad(
  uuid, text, boolean, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalizar_solicitud_bibliocomunidad(
  p_folio uuid,
  p_incorporacion_confirmada boolean,
  p_respuesta_final text,
  p_resolucion_explicita boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_contacto public."mensajeContacto"%ROWTYPE;
  v_hay_contacto_efectivo boolean;
BEGIN
  IF NOT privado.puede_atender_bibliocomunidad() THEN
    RAISE EXCEPTION 'Sin capacidad para atender Bibliocomunidad.'
      USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_contacto
  FROM public."mensajeContacto"
  WHERE id = p_folio AND "tipoContacto" = 'bibliocomunidad'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la solicitud.'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_contacto."estadoAtencion" = 'cerrado' THEN
    RAISE EXCEPTION 'La solicitud ya está cerrada.'
      USING ERRCODE = '23514';
  END IF;
  IF p_incorporacion_confirmada IS NULL
     OR nullif(btrim(p_respuesta_final), '') IS NULL
     OR length(p_respuesta_final) > 10000
     OR p_resolucion_explicita IS NULL THEN
    RAISE EXCEPTION 'La respuesta final y el resultado son obligatorios.'
      USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public."intentoContactoBibliocomunidad"
    WHERE "contactoId" = p_folio AND exitoso
  ) INTO v_hay_contacto_efectivo;

  IF NOT v_hay_contacto_efectivo AND NOT p_resolucion_explicita THEN
    RAISE EXCEPTION 'Se requiere contacto efectivo o una resolución explícita.'
      USING ERRCODE = '23514';
  END IF;
  IF p_incorporacion_confirmada AND NOT v_hay_contacto_efectivo THEN
    RAISE EXCEPTION 'No se puede confirmar incorporación sin contacto efectivo.'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public."mensajeContacto"
  SET "estadoAtencion" = 'cerrado',
      "atendidoPor" = auth.uid(),
      "respuestaFinal" = btrim(p_respuesta_final),
      "incorporacionConfirmada" = p_incorporacion_confirmada,
      "actualizadoEn" = statement_timestamp()
  WHERE id = p_folio
  RETURNING * INTO v_contacto;

  RETURN to_jsonb(v_contacto);
END;
$$;
REVOKE ALL ON FUNCTION public.finalizar_solicitud_bibliocomunidad(
  uuid, boolean, text, boolean
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalizar_solicitud_bibliocomunidad(
  uuid, boolean, text, boolean
) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_intentos_bibliocomunidad(p_folio uuid)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT privado.puede_atender_bibliocomunidad() THEN
    RAISE EXCEPTION 'Sin capacidad para atender Bibliocomunidad.'
      USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public."mensajeContacto"
    WHERE id = p_folio AND "tipoContacto" = 'bibliocomunidad'
  ) THEN
    RAISE EXCEPTION 'No se encontró la solicitud.'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN QUERY
  SELECT to_jsonb(i)
  FROM public."intentoContactoBibliocomunidad" i
  WHERE i."contactoId" = p_folio
  ORDER BY i."realizadoEn", i.id;
END;
$$;
REVOKE ALL ON FUNCTION public.listar_intentos_bibliocomunidad(uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_intentos_bibliocomunidad(uuid)
  TO authenticated;

COMMENT ON TABLE public."intentoContactoBibliocomunidad" IS
  'HU-24 / CA-24.2: bitácora append-only de intentos; un intento fallido no confirma incorporación ni cierra el caso.';

COMMIT;
