-- Registros para estadísticas del portal y lecturas de contenidos.
-- Actividades e inscripciones se consultan desde sus tablas existentes.
CREATE TABLE privado.registro_estadisticas_visita (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo text NOT NULL CHECK (tipo IN ('visita', 'lectura')),
    pagina text NOT NULL CHECK (length(btrim(pagina)) BETWEEN 1 AND 500),
    contenido_id uuid REFERENCES public."Contenido"(id) ON DELETE SET NULL,
    fecha_hora timestamptz NOT NULL DEFAULT now(),
    visita_anonima_id uuid,
    duracion_segundos integer CHECK (duracion_segundos BETWEEN 0 AND 86400)
);

CREATE INDEX registro_estadisticas_visita_fecha_idx
    ON privado.registro_estadisticas_visita (fecha_hora);
CREATE INDEX registro_estadisticas_visita_contenido_fecha_idx
    ON privado.registro_estadisticas_visita (contenido_id, fecha_hora)
    WHERE contenido_id IS NOT NULL;

ALTER TABLE privado.registro_estadisticas_visita ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE privado.registro_estadisticas_visita FROM PUBLIC, anon, authenticated;
