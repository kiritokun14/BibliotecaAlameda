-- HU-14 / HU-28. Al marcar como «atendida» una solicitud de credencial (cotejo presencial hecho),
-- se registra la credencial bibliotecaria validada con vigencia de 2 años (RN-05).
-- Antes solo cambiaba la solicitud: la pantalla «Mi credencial» la mostraba vigente, pero
-- public."credencialBibliotecaria" seguía vacía, y progreso y recompensas no la reconocían.
-- Aplicar después de atencion_credenciales_propuestas.sql (y de progreso_recompensas.sql).
BEGIN;

CREATE OR REPLACE FUNCTION privado.registrar_credencial(usuario uuid, validador uuid, momento timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
    dia date := (momento AT TIME ZONE 'America/Mazatlan')::date;
BEGIN
    -- Una credencial por persona (llave primaria «usuarioId»): la obtención o renovación la deja validada
    -- con emisión el día del cotejo y vencimiento a los 2 años. El número se conserva al renovar.
    INSERT INTO public."credencialBibliotecaria" ("usuarioId", "numeroCredencial", "fechaEmision", "fechaVencimiento",
        "estadoValidacion", "validadaPor", "validadaEn")
    VALUES (usuario, 'BSA-' || upper(left(replace(usuario::text, '-', ''), 12)), dia, (dia + interval '2 years')::date,
        'validada', validador, momento)
    ON CONFLICT ("usuarioId") DO UPDATE SET "fechaEmision" = EXCLUDED."fechaEmision",
        "fechaVencimiento" = EXCLUDED."fechaVencimiento", "estadoValidacion" = 'validada',
        "validadaPor" = EXCLUDED."validadaPor", "validadaEn" = EXCLUDED."validadaEn";
END;
$$;

CREATE OR REPLACE FUNCTION privado.credencial_al_atender()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
    PERFORM privado.registrar_credencial(NEW."usuarioId", NEW."atendidaPor", clock_timestamp());
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS credencial_al_atender ON public."solicitudCredencial";
CREATE TRIGGER credencial_al_atender AFTER UPDATE OF "estadoSolicitud" ON public."solicitudCredencial"
    FOR EACH ROW WHEN (NEW."estadoSolicitud" = 'atendida' AND OLD."estadoSolicitud" IS DISTINCT FROM 'atendida'
                       AND NEW."atendidaPor" IS NOT NULL)
    EXECUTE FUNCTION privado.credencial_al_atender();

-- Solicitudes ya atendidas que se quedaron sin credencial: se registra con la fecha en que se atendieron.
DO $$ BEGIN
    PERFORM privado.registrar_credencial(s."usuarioId", s."atendidaPor", s."actualizadaEn")
    FROM (SELECT DISTINCT ON ("usuarioId") * FROM public."solicitudCredencial"
          WHERE "estadoSolicitud" = 'atendida' AND "atendidaPor" IS NOT NULL
          ORDER BY "usuarioId", "actualizadaEn" DESC) s
    WHERE NOT EXISTS (SELECT 1 FROM public."credencialBibliotecaria" c WHERE c."usuarioId" = s."usuarioId");
END $$;

REVOKE ALL ON FUNCTION privado.registrar_credencial(uuid, uuid, timestamptz), privado.credencial_al_atender()
    FROM PUBLIC, anon, authenticated;

COMMIT;
