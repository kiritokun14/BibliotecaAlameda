-- HU-15 / T-075: acceso seguro a las propuestas de eventos y clubes.
-- No crea, altera ni elimina tablas o registros.

BEGIN;

ALTER TABLE public."propuestaEvento" ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public."propuestaEvento" FROM PUBLIC, anon, authenticated;

REVOKE INSERT (
  "id", "tituloPropuesta", "descripcion", "tipoPropuesta", "publicoDirigido",
  "necesidadEspacio", "estadoRevision", "observacionesInstitucionales",
  "propuestoPor", "revisadoPor", "actividadId", "creadaEn", "actualizadoEn",
  "frecuenciaReunion", "diasSolicitados", "horarioSolicitado"
), UPDATE (
  "id", "tituloPropuesta", "descripcion", "tipoPropuesta", "publicoDirigido",
  "necesidadEspacio", "estadoRevision", "observacionesInstitucionales",
  "propuestoPor", "revisadoPor", "actividadId", "creadaEn", "actualizadoEn",
  "frecuenciaReunion", "diasSolicitados", "horarioSolicitado"
) ON TABLE public."propuestaEvento" FROM authenticated;

GRANT SELECT ON TABLE public."propuestaEvento" TO authenticated;
GRANT INSERT (
  "tituloPropuesta", "descripcion", "tipoPropuesta", "publicoDirigido",
  "necesidadEspacio", "estadoRevision", "propuestoPor",
  "frecuenciaReunion", "diasSolicitados", "horarioSolicitado"
) ON TABLE public."propuestaEvento" TO authenticated;
GRANT UPDATE ("estadoRevision", "observacionesInstitucionales", "revisadoPor")
  ON TABLE public."propuestaEvento" TO authenticated;

CREATE OR REPLACE FUNCTION privado.puede_gestionar_propuestas_evento()
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
    WHERE permiso->>'capacidad' IN ('gestionar_actividades', 'moderar_foro')
      AND permiso->>'ambito' = 'global'
  );
END;
$$;

REVOKE ALL ON FUNCTION privado.puede_gestionar_propuestas_evento() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA privado TO authenticated;
GRANT EXECUTE ON FUNCTION privado.puede_gestionar_propuestas_evento() TO authenticated;

-- perfil conserva su RLS de lectura propia. El RPC devuelve al personal
-- únicamente los campos mínimos del proponente que requiere el seguimiento.
CREATE OR REPLACE FUNCTION public.listar_propuestas_evento_personal(p_estado text DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT privado.puede_gestionar_propuestas_evento() THEN
    RAISE EXCEPTION 'Se requiere capacidad para gestionar propuestas.'
      USING ERRCODE = '42501';
  END IF;

  IF p_estado IS NOT NULL AND p_estado NOT IN (
    'borrador', 'en_atencion', 'en_revision', 'requiere_correccion',
    'aprobada', 'rechazada', 'cancelada'
  ) THEN
    RAISE EXCEPTION 'Estado de revisión inválido.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', propuesta.id,
    'tituloPropuesta', propuesta."tituloPropuesta",
    'descripcion', propuesta.descripcion,
    'tipoPropuesta', propuesta."tipoPropuesta",
    'publicoDirigido', propuesta."publicoDirigido",
    'necesidadEspacio', propuesta."necesidadEspacio",
    'estadoRevision', propuesta."estadoRevision",
    'observacionesInstitucionales', propuesta."observacionesInstitucionales",
    'propuestoPor', propuesta."propuestoPor",
    'revisadoPor', propuesta."revisadoPor",
    'actividadId', propuesta."actividadId",
    'creadaEn', propuesta."creadaEn",
    'actualizadoEn', propuesta."actualizadoEn",
    'frecuenciaReunion', propuesta."frecuenciaReunion",
    'diasSolicitados', propuesta."diasSolicitados",
    'horarioSolicitado', propuesta."horarioSolicitado",
    'perfil', jsonb_build_object(
      'id', perfil.id,
      'nombres', perfil.nombres,
      'primerApellido', perfil."primerApellido",
      'segundoApellido', perfil."segundoApellido",
      'telefono', perfil.telefono
    )
  )
  FROM public."propuestaEvento" AS propuesta
  JOIN public.perfil AS perfil ON perfil.id = propuesta."propuestoPor"
  WHERE p_estado IS NULL OR propuesta."estadoRevision" = p_estado
  ORDER BY propuesta."creadaEn" DESC, propuesta.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_propuestas_evento_personal(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_propuestas_evento_personal(text)
  TO authenticated;

DROP POLICY IF EXISTS "lectura_propia_propuestaEvento"
  ON public."propuestaEvento";
CREATE POLICY "lectura_propia_propuestaEvento"
  ON public."propuestaEvento"
  FOR SELECT TO authenticated
  USING ("propuestoPor" = (SELECT auth.uid()));

DROP POLICY IF EXISTS "lectura_personal_propuestaEvento"
  ON public."propuestaEvento";
CREATE POLICY "lectura_personal_propuestaEvento"
  ON public."propuestaEvento"
  FOR SELECT TO authenticated
  USING (privado.puede_gestionar_propuestas_evento());

DROP POLICY IF EXISTS "insertar_propuestaEvento_propia"
  ON public."propuestaEvento";
CREATE POLICY "insertar_propuestaEvento_propia"
  ON public."propuestaEvento"
  FOR INSERT TO authenticated
  WITH CHECK (
    "propuestoPor" = (SELECT auth.uid())
    AND "estadoRevision" = 'en_revision'
    AND "revisadoPor" IS NULL
    AND "actividadId" IS NULL
  );

DROP POLICY IF EXISTS "actualizar_propuestaEvento_personal"
  ON public."propuestaEvento";
CREATE POLICY "actualizar_propuestaEvento_personal"
  ON public."propuestaEvento"
  FOR UPDATE TO authenticated
  USING (privado.puede_gestionar_propuestas_evento())
  WITH CHECK (
    privado.puede_gestionar_propuestas_evento()
    AND "revisadoPor" = (SELECT auth.uid())
  );

COMMIT;
