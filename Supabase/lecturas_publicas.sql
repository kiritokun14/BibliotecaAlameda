-- HU-03 / T-056 / BDLAG-86: lectura anónima de lecturas, reseñas y memoria.
-- CA-03.1 a CA-03.4: solo SELECT de recursos publicados/autorizados.
-- No crea funciones, triggers ni permisos de escritura para progreso/asistencia.

GRANT SELECT ON TABLE public."Contenido" TO anon, authenticated;
ALTER POLICY "lectura_publicada_Contenido" ON public."Contenido"
  TO anon, authenticated
  USING (estado = 'publicado');

GRANT SELECT ON TABLE public."resena" TO anon, authenticated;
ALTER POLICY "lectura_publicada_resena" ON public."resena"
  TO anon, authenticated
  USING (
    estado = 'publicada'
    AND EXISTS (
      SELECT 1
      FROM public."Contenido" c
      WHERE c.id = "resena"."contenidoId"
        AND c.estado = 'publicado'
    )
  );

GRANT SELECT ON TABLE public."adjuntoContenido" TO anon, authenticated;
ALTER POLICY "lectura_publicada_adjuntoContenido" ON public."adjuntoContenido"
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."Contenido" c
      WHERE c.id = "adjuntoContenido"."contenidoId"
        AND c.estado = 'publicado'
    )
  );

ALTER TABLE public."evidenciaActividad" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public."evidenciaActividad" TO anon, authenticated;
DROP POLICY IF EXISTS "lectura_publica_evidenciaActividad"
  ON public."evidenciaActividad";
CREATE POLICY "lectura_publica_evidenciaActividad"
  ON public."evidenciaActividad"
  FOR SELECT
  TO anon, authenticated
  USING (visibilidad = 'publica' AND "autorizadaEn" IS NOT NULL);
