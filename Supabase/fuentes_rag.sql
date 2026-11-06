-- HU-31 / CU-31 / T-049 / BDLAG-105.
-- CA-31.1: solo fuentes aprobadas explícitamente pueden activarse/ser recuperadas.
-- CA-31.2: retirar una fuente la excluye de nuevas consultas RAG.
-- Requiere el modelo de permisos de alinear_actores_documentados.sql.

BEGIN;

ALTER TABLE "fuenteRAG"
  ADD COLUMN IF NOT EXISTS activa boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ix_fuenteRAG_recuperacion
  ON "fuenteRAG" ("actualizadaEn" DESC)
  WHERE "estadoFuente" = 'aprobada'
    AND "aprobadaPor" IS NOT NULL
    AND activa;

ALTER TABLE "fuenteRAG" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "fuenteRAG" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE "fuenteRAG" TO anon, authenticated;
GRANT INSERT ON TABLE "fuenteRAG" TO authenticated;

CREATE OR REPLACE FUNCTION privado.puede_gestionar_fuentes_asistente()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, privado
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := privado.comprobar_sesion_cuenta();
  RETURN EXISTS (
    SELECT 1
    FROM "rolUsuario" r
    WHERE r."usuarioId" = actor
      AND r."rolCodigo" = 'administrador'
      AND r.ambito = 'global'
      AND r."vigenteDesde" <= statement_timestamp()
      AND (r."vigenteHasta" IS NULL OR r."vigenteHasta" > statement_timestamp())
  ) OR (
    privado.capacidad_corresponde(actor, 'gestionar_fuentes_asistente')
    AND EXISTS (
      SELECT 1
      FROM "permisoCuenta" p
      WHERE p."usuarioId" = actor
        AND p.capacidad = 'gestionar_fuentes_asistente'
        AND p."actividadId" IS NULL
        AND p."vigenteDesde" <= statement_timestamp()
        AND (p."vigenteHasta" IS NULL OR p."vigenteHasta" > statement_timestamp())
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION privado.puede_gestionar_fuentes_asistente()
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA privado TO authenticated;
GRANT EXECUTE ON FUNCTION privado.puede_gestionar_fuentes_asistente()
  TO authenticated;

DROP POLICY IF EXISTS sin_acceso_directo_fuentes ON "fuenteRAG";
DROP POLICY IF EXISTS lectura_publica_fuentes_aprobadas ON "fuenteRAG";
DROP POLICY IF EXISTS lectura_administrativa_fuentes ON "fuenteRAG";
DROP POLICY IF EXISTS alta_borrador_fuentes ON "fuenteRAG";

CREATE POLICY lectura_publica_fuentes_aprobadas
  ON "fuenteRAG"
  FOR SELECT
  TO anon, authenticated
  USING (
    "estadoFuente" = 'aprobada'
    AND "aprobadaPor" IS NOT NULL
    AND activa
  );

CREATE POLICY lectura_administrativa_fuentes
  ON "fuenteRAG"
  FOR SELECT
  TO authenticated
  USING (privado.puede_gestionar_fuentes_asistente());

CREATE POLICY alta_borrador_fuentes
  ON "fuenteRAG"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    privado.puede_gestionar_fuentes_asistente()
    AND "subidaPor" = (SELECT auth.uid())
    AND "estadoFuente" = 'borrador'
    AND "version" = 1
    AND "aprobadaPor" IS NULL
    AND NOT activa
  );

CREATE OR REPLACE FUNCTION resolver_fuente_rag(
  p_fuente_id uuid,
  p_aprobar boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, privado
AS $$
DECLARE
  actor uuid;
  salida "fuenteRAG"%ROWTYPE;
BEGIN
  actor := privado.comprobar_sesion_cuenta();
  IF p_aprobar IS NULL THEN
    RAISE EXCEPTION 'La decisión de aprobación es obligatoria.'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM "rolUsuario" r
    WHERE r."usuarioId" = actor
      AND r."rolCodigo" = 'administrador'
      AND r.ambito = 'global'
      AND r."vigenteDesde" <= statement_timestamp()
      AND (r."vigenteHasta" IS NULL OR r."vigenteHasta" > statement_timestamp())
  ) THEN
    RAISE EXCEPTION 'Solo el rol administrador puede aprobar fuentes.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE "fuenteRAG"
  SET "estadoFuente" = CASE WHEN p_aprobar THEN 'aprobada' ELSE 'en_revision' END,
      "aprobadaPor" = CASE WHEN p_aprobar THEN actor ELSE NULL END,
      activa = false,
      "actualizadaEn" = statement_timestamp()
  WHERE id = p_fuente_id
    AND "estadoFuente" <> 'retirada'
  RETURNING * INTO salida;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró una fuente disponible para revisión.'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN to_jsonb(salida);
END;
$$;

CREATE OR REPLACE FUNCTION activar_fuente_rag(p_fuente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, privado
AS $$
DECLARE
  salida "fuenteRAG"%ROWTYPE;
BEGIN
  IF NOT privado.puede_gestionar_fuentes_asistente() THEN
    RAISE EXCEPTION 'Sin permiso para gestionar fuentes RAG.'
      USING ERRCODE = '42501';
  END IF;
  UPDATE "fuenteRAG"
  SET activa = true,
      "actualizadaEn" = statement_timestamp()
  WHERE id = p_fuente_id
    AND "estadoFuente" = 'aprobada'
    AND "aprobadaPor" IS NOT NULL
  RETURNING * INTO salida;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM "fuenteRAG" WHERE id = p_fuente_id) THEN
      RAISE EXCEPTION 'La fuente requiere aprobación explícita antes de activarse.'
        USING ERRCODE = '23514';
    END IF;
    RAISE EXCEPTION 'No se encontró la fuente solicitada.'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN to_jsonb(salida);
END;
$$;

CREATE OR REPLACE FUNCTION retirar_fuente_rag(p_fuente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, privado
AS $$
DECLARE
  salida "fuenteRAG"%ROWTYPE;
BEGIN
  IF NOT privado.puede_gestionar_fuentes_asistente() THEN
    RAISE EXCEPTION 'Sin permiso para gestionar fuentes RAG.'
      USING ERRCODE = '42501';
  END IF;
  UPDATE "fuenteRAG"
  SET "estadoFuente" = 'retirada',
      activa = false,
      "actualizadaEn" = statement_timestamp()
  WHERE id = p_fuente_id
  RETURNING * INTO salida;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la fuente solicitada.'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN to_jsonb(salida);
END;
$$;

CREATE OR REPLACE FUNCTION crear_version_fuente_rag(
  p_fuente_id uuid,
  p_titulo text,
  p_tipo text,
  p_contenido text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, privado
AS $$
DECLARE
  actor uuid;
  anterior "fuenteRAG"%ROWTYPE;
  nueva "fuenteRAG"%ROWTYPE;
BEGIN
  IF NOT privado.puede_gestionar_fuentes_asistente() THEN
    RAISE EXCEPTION 'Sin permiso para gestionar fuentes RAG.'
      USING ERRCODE = '42501';
  END IF;
  actor := privado.comprobar_sesion_cuenta();
  SELECT * INTO anterior
  FROM "fuenteRAG"
  WHERE id = p_fuente_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la fuente solicitada.'
      USING ERRCODE = 'P0002';
  END IF;
  IF nullif(btrim(p_titulo), '') IS NULL
     OR length(p_titulo) > 250
     OR nullif(btrim(p_tipo), '') IS NULL
     OR length(p_tipo) > 80
     OR nullif(btrim(p_contenido), '') IS NULL
     OR length(p_contenido) > 50000 THEN
    RAISE EXCEPTION 'Los datos de la nueva versión no son válidos.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE "fuenteRAG"
  SET "estadoFuente" = 'retirada',
      activa = false,
      "actualizadaEn" = statement_timestamp()
  WHERE id = anterior.id;

  INSERT INTO "fuenteRAG" (
    "tituloFuente", "tipoFuente", "contenidoReferencia", "estadoFuente",
    version, "subidaPor", "aprobadaPor", activa
  )
  VALUES (
    btrim(p_titulo), btrim(p_tipo), btrim(p_contenido), 'borrador',
    anterior.version + 1, actor, NULL, false
  )
  RETURNING * INTO nueva;
  RETURN to_jsonb(nueva);
END;
$$;

REVOKE ALL ON FUNCTION resolver_fuente_rag(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION activar_fuente_rag(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION retirar_fuente_rag(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION crear_version_fuente_rag(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION resolver_fuente_rag(uuid, boolean),
  activar_fuente_rag(uuid), retirar_fuente_rag(uuid),
  crear_version_fuente_rag(uuid, text, text, text)
  TO authenticated;

COMMIT;
