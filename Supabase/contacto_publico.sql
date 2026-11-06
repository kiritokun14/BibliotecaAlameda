-- HU-23 / CU-23 / T-053 / BDLAG-97
-- CA-23.1: envío público, folio y acuse persistidos en una sola transacción.
-- CA-23.2: consultar folio es una lectura exacta y nunca modifica estado.

BEGIN;

ALTER TABLE public."mensajeContacto" ENABLE ROW LEVEL SECURITY;

-- RLS controla filas, no puede exigir que una consulta incluya un filtro por
-- PK. Por eso anon no recibe SELECT de tabla; el seguimiento usa la función
-- consultar_contacto_por_folio, que solo retorna el UUID exacto solicitado.
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON TABLE public."mensajeContacto" FROM PUBLIC, anon;
REVOKE INSERT, DELETE
  ON TABLE public."mensajeContacto" FROM authenticated;
GRANT INSERT (
  "usuarioId", "nombreRemitente", "correoContacto", asunto, "cuerpoMensaje"
) ON TABLE public."mensajeContacto" TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public."mensajeContacto" TO authenticated;

CREATE OR REPLACE FUNCTION privado.sesion_contacto_vigente()
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
    );
$$;
REVOKE ALL ON FUNCTION privado.sesion_contacto_vigente() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA privado TO anon, authenticated;
GRANT EXECUTE ON FUNCTION privado.sesion_contacto_vigente() TO anon, authenticated;

DROP POLICY IF EXISTS "insertar_contacto_publico"
  ON public."mensajeContacto";
CREATE POLICY "insertar_contacto_publico"
  ON public."mensajeContacto"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    "usuarioId" IS NOT DISTINCT FROM (SELECT auth.uid())
    AND (
      (SELECT auth.uid()) IS NULL
      OR privado.sesion_contacto_vigente()
    )
    AND "estadoAtencion" = 'recibido'
    AND "atendidoPor" IS NULL
    AND "respuestaFinal" IS NULL
    AND length(btrim("nombreRemitente")) BETWEEN 1 AND 150
    AND length(btrim("correoContacto")) BETWEEN 1 AND 254
    AND "correoContacto" ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    AND length(btrim(asunto)) BETWEEN 1 AND 200
    AND length(btrim("cuerpoMensaje")) BETWEEN 1 AND 10000
  );

-- Ya existe lectura propia para autenticados. Esta política añade lectura
-- general solo a personal con capacidad vigente o rol administrador.
CREATE OR REPLACE FUNCTION privado.puede_atender_contactos()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.perfil p
      WHERE p.id = auth.uid()
        AND p.estatus = 'activo'
    )
    AND EXISTS (
      SELECT 1
      FROM auth.sessions s
      JOIN auth.users u ON u.id = s.user_id
      WHERE s.id::text = (auth.jwt() ->> 'session_id')
        AND s.user_id = auth.uid()
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
        privado.capacidad_corresponde(auth.uid(), 'atender_contactos')
        AND EXISTS (
          SELECT 1
          FROM public."permisoCuenta" p
          WHERE p."usuarioId" = auth.uid()
            AND p.capacidad = 'atender_contactos'
            AND p."vigenteDesde" <= statement_timestamp()
            AND (p."vigenteHasta" IS NULL OR p."vigenteHasta" > statement_timestamp())
        )
      )
    );
$$;
REVOKE ALL ON FUNCTION privado.puede_atender_contactos() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA privado TO authenticated;
GRANT EXECUTE ON FUNCTION privado.puede_atender_contactos() TO authenticated;

DROP POLICY IF EXISTS "lectura_contactos_personal"
  ON public."mensajeContacto";
CREATE POLICY "lectura_contactos_personal"
  ON public."mensajeContacto"
  FOR SELECT
  TO authenticated
  USING (privado.puede_atender_contactos());

REVOKE UPDATE ON TABLE public."mensajeContacto" FROM authenticated;
GRANT UPDATE ("estadoAtencion", "atendidoPor", "respuestaFinal", "actualizadoEn")
  ON TABLE public."mensajeContacto" TO authenticated;
DROP POLICY IF EXISTS "actualizar_contactos_personal"
  ON public."mensajeContacto";
CREATE POLICY "actualizar_contactos_personal"
  ON public."mensajeContacto"
  FOR UPDATE
  TO authenticated
  USING (
    privado.puede_atender_contactos()
    AND "estadoAtencion" IN ('recibido', 'en_atencion')
  )
  WITH CHECK (
    privado.puede_atender_contactos()
    AND "estadoAtencion" IN ('en_atencion', 'cerrado')
    AND "atendidoPor" = (SELECT auth.uid())
    AND (
      "estadoAtencion" <> 'cerrado'
      OR nullif(btrim("respuestaFinal"), '') IS NOT NULL
    )
  );

-- API pública de envío. auth.uid() evita asociar un envío a una cuenta ajena.
-- El aviso se crea solo para remitentes autenticados; los anónimos reciben
-- el folio HTTP como acuse y no se inventa una identidad de destinatario.
CREATE OR REPLACE FUNCTION public.registrar_contacto_publico(
  p_usuario_id uuid,
  p_nombre_remitente text,
  p_correo_contacto text,
  p_asunto text,
  p_cuerpo_mensaje text
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
     OR nullif(btrim(p_correo_contacto), '') IS NULL
     OR nullif(btrim(p_asunto), '') IS NULL
     OR nullif(btrim(p_cuerpo_mensaje), '') IS NULL
     OR length(p_nombre_remitente) > 150
     OR length(p_correo_contacto) > 254
     OR length(p_asunto) > 200
     OR length(p_cuerpo_mensaje) > 10000
     OR p_correo_contacto !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Los campos del contacto son obligatorios.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public."mensajeContacto" (
    "usuarioId", "nombreRemitente", "correoContacto", asunto, "cuerpoMensaje",
    "estadoAtencion"
  )
  VALUES (
    p_usuario_id, btrim(p_nombre_remitente), btrim(p_correo_contacto),
    btrim(p_asunto), btrim(p_cuerpo_mensaje), 'recibido'
  )
  RETURNING id, "creadoEn" INTO v_id, v_creado_en;

  IF p_usuario_id IS NOT NULL THEN
    INSERT INTO public."avisoNotificacion" (
      "usuarioId", titulo, "cuerpoAviso", "tipoAviso",
      "estadoEnvio", "canalUtilizado"
    )
    VALUES (
      p_usuario_id, 'Contacto recibido',
      'Recibimos tu contacto. Folio: ' || v_id::text,
      'contacto_recibido', 'pendiente', 'portal'
    );
  END IF;

  RETURN jsonb_build_object('id', v_id, 'creadoEn', v_creado_en);
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_contacto_publico(uuid, text, text, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_contacto_publico(uuid, text, text, text, text)
  TO anon, authenticated;

-- SELECT por UUID exacto. No concede SELECT directo de toda la tabla a anon.
CREATE OR REPLACE FUNCTION public.consultar_contacto_por_folio(p_folio uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT jsonb_build_object(
    'id', m.id,
    'asunto', m.asunto,
    'estadoAtencion', m."estadoAtencion",
    'creadoEn', m."creadoEn"
  ) || CASE
    WHEN m."estadoAtencion" = 'cerrado'
      THEN jsonb_build_object('respuestaFinal', m."respuestaFinal")
    ELSE '{}'::jsonb
  END
  FROM public."mensajeContacto" m
  WHERE m.id = p_folio;
$$;
REVOKE ALL ON FUNCTION public.consultar_contacto_por_folio(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_contacto_por_folio(uuid)
  TO anon, authenticated;

COMMENT ON FUNCTION public.consultar_contacto_por_folio(uuid) IS
  'HU-23 / CA-23.2: devuelve únicamente los campos públicos del folio indicado y no actualiza estado.';

COMMIT;