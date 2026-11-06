-- HU-23 / CU-23 / T-053 / BDLAG-97
-- CA-23.1: envío público, folio y acuse persistidos en una sola transacción.
-- CA-23.2: consultar folio es una lectura exacta y nunca modifica estado.

BEGIN;
ALTER TABLE public."mensajeContacto"
 ADD COLUMN IF NOT EXISTS "telefonoContacto" text,
 ADD COLUMN IF NOT EXISTS "tipoContacto" text NOT NULL DEFAULT 'general';


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
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE actor uuid;
BEGIN
 actor := privado.comprobar_sesion_cuenta();
 RETURN EXISTS (SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) p
 WHERE p->>'capacidad'='atender_contactos' AND p->>'ambito'='global');
END;
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
CREATE OR REPLACE FUNCTION privado.registrar_contacto_publico(
  p_usuario_id uuid,
  p_nombre_remitente text,
  p_correo_contacto text,
  p_asunto text,
  p_cuerpo_mensaje text,
  p_telefono_contacto text DEFAULT NULL
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
     OR (p_telefono_contacto IS NOT NULL AND p_telefono_contacto !~ '^\+?[0-9][0-9 ()-]{5,19}$')
     OR p_correo_contacto !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Los campos del contacto son obligatorios.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public."mensajeContacto" (
    "usuarioId", "nombreRemitente", "correoContacto", asunto, "cuerpoMensaje",
    "estadoAtencion", "telefonoContacto"
  )
  VALUES (
    p_usuario_id, btrim(p_nombre_remitente), btrim(p_correo_contacto),
    btrim(p_asunto), btrim(p_cuerpo_mensaje), 'recibido', nullif(btrim(p_telefono_contacto),'')
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
REVOKE ALL ON FUNCTION privado.registrar_contacto_publico(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.registrar_contacto_publico(uuid,text,text,text,text,text) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.registrar_contacto_publico(
  p_usuario_id uuid,
  p_nombre_remitente text,
  p_correo_contacto text,
  p_asunto text,
  p_cuerpo_mensaje text,
  p_telefono_contacto text DEFAULT NULL
)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog
AS $$ SELECT privado.registrar_contacto_publico(p_usuario_id,p_nombre_remitente,p_correo_contacto,p_asunto,p_cuerpo_mensaje,p_telefono_contacto); $$;
REVOKE ALL ON FUNCTION public.registrar_contacto_publico(uuid, text, text, text, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_contacto_publico(uuid, text, text, text, text, text)
  TO anon, authenticated;

-- SELECT por UUID exacto. No concede SELECT directo de toda la tabla a anon.
CREATE OR REPLACE FUNCTION privado.consultar_contacto_por_folio(p_folio uuid)
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
  WHERE m.id = p_folio AND m."tipoContacto" = 'general';
 $$;
REVOKE ALL ON FUNCTION privado.consultar_contacto_por_folio(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.consultar_contacto_por_folio(uuid) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.consultar_contacto_por_folio(p_folio uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog
AS $$ SELECT privado.consultar_contacto_por_folio(p_folio); $$;
REVOKE ALL ON FUNCTION public.consultar_contacto_por_folio(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_contacto_por_folio(uuid)
  TO anon, authenticated;

COMMENT ON FUNCTION public.consultar_contacto_por_folio(uuid) IS
  'HU-23 / CA-23.2: devuelve únicamente los campos públicos del folio indicado y no actualiza estado.';

REVOKE INSERT, UPDATE ON public."mensajeContacto" FROM anon, authenticated;
REVOKE INSERT ("usuarioId","nombreRemitente","correoContacto",asunto,"cuerpoMensaje")
 ON public."mensajeContacto" FROM anon, authenticated;
REVOKE UPDATE ("estadoAtencion","atendidoPor","respuestaFinal","actualizadoEn")
 ON public."mensajeContacto" FROM authenticated;

CREATE OR REPLACE FUNCTION privado.atender_contacto(p_folio uuid,p_estado text,p_respuesta text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE fila public."mensajeContacto"%ROWTYPE;
BEGIN
 IF NOT privado.puede_atender_contactos() THEN RAISE EXCEPTION 'Sin capacidad.' USING ERRCODE='42501'; END IF;
 SELECT * INTO fila FROM public."mensajeContacto" WHERE id=p_folio AND "tipoContacto"='general' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contacto no encontrado.' USING ERRCODE='P0002'; END IF;
 IF fila."estadoAtencion"='cerrado' OR (p_estado='en_atencion' AND fila."estadoAtencion"<>'recibido')
 THEN RAISE EXCEPTION 'Transición no permitida.' USING ERRCODE='55000'; END IF;
 IF p_estado IS NULL OR p_estado NOT IN ('en_atencion','cerrado')
 OR length(coalesce(p_respuesta,''))>10000
 OR (p_estado='cerrado' AND nullif(btrim(p_respuesta),'') IS NULL)
 THEN RAISE EXCEPTION 'Respuesta o estado inválido.' USING ERRCODE='22023'; END IF;
 UPDATE public."mensajeContacto" SET "estadoAtencion"=p_estado,"atendidoPor"=auth.uid(),
 "respuestaFinal"=CASE WHEN p_estado='cerrado' THEN btrim(p_respuesta) ELSE NULL END,
 "actualizadoEn"=statement_timestamp() WHERE id=p_folio RETURNING * INTO fila;
 RETURN to_jsonb(fila);
END;
 $$;
REVOKE ALL ON FUNCTION privado.atender_contacto(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.atender_contacto(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.atender_contacto(p_folio uuid,p_estado text,p_respuesta text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog
AS $$ SELECT privado.atender_contacto(p_folio,p_estado,p_respuesta); $$;
REVOKE ALL ON FUNCTION public.atender_contacto(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.atender_contacto(uuid,text,text) TO authenticated;
COMMIT;
