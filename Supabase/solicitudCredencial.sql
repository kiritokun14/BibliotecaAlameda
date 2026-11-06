-- HU-13 / T-072: acceso seguro a las solicitudes de credencial.
-- No crea, altera ni elimina tablas o registros.

BEGIN;

ALTER TABLE public."solicitudCredencial" ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public."solicitudCredencial" FROM PUBLIC, anon, authenticated;

REVOKE INSERT (
  "id", "usuarioId", "tipoSolicitud", "estadoSolicitud", "fechaCita",
  "atendidaPor", "observaciones", "creadaEn", "actualizadaEn"
), UPDATE (
  "id", "usuarioId", "tipoSolicitud", "estadoSolicitud", "fechaCita",
  "atendidaPor", "observaciones", "creadaEn", "actualizadaEn"
) ON TABLE public."solicitudCredencial" FROM authenticated;

GRANT SELECT ON TABLE public."solicitudCredencial" TO authenticated;
GRANT INSERT ("usuarioId", "tipoSolicitud", "observaciones")
  ON TABLE public."solicitudCredencial" TO authenticated;
GRANT UPDATE ("estadoSolicitud", "fechaCita", "atendidaPor", "observaciones")
  ON TABLE public."solicitudCredencial" TO authenticated;

CREATE OR REPLACE FUNCTION privado.puede_validar_credenciales()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := privado.comprobar_sesion_cuenta();
  RETURN EXISTS (
    SELECT 1
    FROM jsonb_array_elements(privado.permisos_de_cuenta(actor, true)) permiso
    WHERE permiso->>'capacidad' = 'validar_credenciales'
      AND permiso->>'ambito' = 'global'
  );
END;
$$;

REVOKE ALL ON FUNCTION privado.puede_validar_credenciales() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA privado TO authenticated;
GRANT EXECUTE ON FUNCTION privado.puede_validar_credenciales() TO authenticated;

-- perfil mantiene su RLS de lectura propia. Esta función expone al personal
-- únicamente la proyección mínima requerida, validando capacidad en la BD.
CREATE OR REPLACE FUNCTION public.listar_solicitudes_credencial_personal(p_estado text DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT privado.puede_validar_credenciales() THEN
    RAISE EXCEPTION 'Se requiere la capacidad validar_credenciales.'
      USING ERRCODE = '42501';
  END IF;

  IF p_estado IS NOT NULL AND p_estado NOT IN (
    'recibida', 'en_atencion', 'cita_programada', 'atendida', 'rechazada', 'cancelada'
  ) THEN
    RAISE EXCEPTION 'Estado de solicitud inválido.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', solicitud.id,
    'usuarioId', solicitud."usuarioId",
    'tipoSolicitud', solicitud."tipoSolicitud",
    'estadoSolicitud', solicitud."estadoSolicitud",
    'fechaCita', solicitud."fechaCita",
    'atendidaPor', solicitud."atendidaPor",
    'observaciones', solicitud.observaciones,
    'creadaEn', solicitud."creadaEn",
    'actualizadaEn', solicitud."actualizadaEn",
    'perfil', jsonb_build_object(
      'id', perfil.id,
      'nombres', perfil.nombres,
      'primerApellido', perfil."primerApellido",
      'segundoApellido', perfil."segundoApellido",
      'telefono', perfil.telefono,
      'municipio', perfil.municipio
    )
  )
  FROM public."solicitudCredencial" AS solicitud
  JOIN public.perfil AS perfil ON perfil.id = solicitud."usuarioId"
  WHERE p_estado IS NULL OR solicitud."estadoSolicitud" = p_estado
  ORDER BY solicitud."creadaEn" DESC, solicitud.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_solicitudes_credencial_personal(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_solicitudes_credencial_personal(text)
  TO authenticated;

DROP POLICY IF EXISTS "lectura_propia_solicitudCredencial"
  ON public."solicitudCredencial";
CREATE POLICY "lectura_propia_solicitudCredencial"
  ON public."solicitudCredencial"
  FOR SELECT TO authenticated
  USING ("usuarioId" = (SELECT auth.uid()));

DROP POLICY IF EXISTS "insertar_solicitud_credencial_propia"
  ON public."solicitudCredencial";
CREATE POLICY "insertar_solicitud_credencial_propia"
  ON public."solicitudCredencial"
  FOR INSERT TO authenticated
  WITH CHECK (
    "usuarioId" = (SELECT auth.uid())
    AND "estadoSolicitud" = 'recibida'
    AND "fechaCita" IS NULL
    AND "atendidaPor" IS NULL
  );

DROP POLICY IF EXISTS "lectura_solicitudes_credencial_personal"
  ON public."solicitudCredencial";
CREATE POLICY "lectura_solicitudes_credencial_personal"
  ON public."solicitudCredencial"
  FOR SELECT TO authenticated
  USING (privado.puede_validar_credenciales());

DROP POLICY IF EXISTS "actualizar_solicitudes_credencial_personal"
  ON public."solicitudCredencial";
CREATE POLICY "actualizar_solicitudes_credencial_personal"
  ON public."solicitudCredencial"
  FOR UPDATE TO authenticated
  USING (privado.puede_validar_credenciales())
  WITH CHECK (
    privado.puede_validar_credenciales()
    AND "atendidaPor" = (SELECT auth.uid())
  );

COMMIT;
