BEGIN;

CREATE TABLE public.reacciones_contenido (
    contenido_id uuid NOT NULL REFERENCES public."Contenido"(id) ON DELETE CASCADE,
    usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo text NOT NULL CHECK (tipo IN ('me_gusta', 'me_sirvio')),
    creado_en timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (contenido_id, usuario_id, tipo)
);
CREATE INDEX reacciones_contenido_usuario_idx ON public.reacciones_contenido(usuario_id);

CREATE TABLE public.compartidos_contenido (
    contenido_id uuid PRIMARY KEY REFERENCES public."Contenido"(id) ON DELETE CASCADE,
    total bigint NOT NULL CHECK (total > 0)
);

ALTER TABLE public.reacciones_contenido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compartidos_contenido ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reacciones_contenido, public.compartidos_contenido FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.gestionar_reacciones_contenido(
    folio_contenido text, operacion text, tipo_reaccion text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    contenido uuid;
    actor uuid := auth.uid();
BEGIN
    IF operacion IS NULL OR operacion NOT IN ('consultar', 'marcar', 'quitar', 'compartir') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Operacion invalida';
    END IF;

    IF operacion IN ('marcar', 'quitar') THEN
        IF actor IS NULL THEN
            RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sesion requerida';
        END IF;
        IF tipo_reaccion IS NULL OR tipo_reaccion NOT IN ('me_gusta', 'me_sirvio') THEN
            RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Tipo de reaccion invalido';
        END IF;
    END IF;

    SELECT c.id INTO contenido
    FROM public."Contenido" AS c
    WHERE c.folio = folio_contenido
        AND c.tipo IN ('noticia', 'resena', 'memoria')
        AND c.estado = 'publicado'
        AND c."autorizadoPor" IS NOT NULL
        AND c."publicadoEn" <= statement_timestamp();

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Contenido no disponible';
    END IF;

    CASE operacion
        WHEN 'marcar' THEN
            INSERT INTO public.reacciones_contenido (contenido_id, usuario_id, tipo)
            VALUES (contenido, actor, tipo_reaccion)
            ON CONFLICT DO NOTHING;
        WHEN 'quitar' THEN
            DELETE FROM public.reacciones_contenido
            WHERE contenido_id = contenido AND usuario_id = actor AND tipo = tipo_reaccion;
        WHEN 'compartir' THEN
            INSERT INTO public.compartidos_contenido AS contador (contenido_id, total)
            VALUES (contenido, 1)
            ON CONFLICT (contenido_id) DO UPDATE SET total = contador.total + 1;
        ELSE NULL;
    END CASE;

    RETURN (
        SELECT jsonb_build_object(
            'meGusta', count(*) FILTER (WHERE r.tipo = 'me_gusta'),
            'meSirvio', count(*) FILTER (WHERE r.tipo = 'me_sirvio'),
            'compartir', coalesce((SELECT total FROM public.compartidos_contenido WHERE contenido_id = contenido), 0),
            'mias', coalesce(jsonb_agg(r.tipo ORDER BY r.tipo) FILTER (WHERE r.usuario_id = actor), '[]'::jsonb)
        )
        FROM public.reacciones_contenido AS r
        WHERE r.contenido_id = contenido
    );
END;
$$;

REVOKE ALL ON FUNCTION public.gestionar_reacciones_contenido(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gestionar_reacciones_contenido(text, text, text) TO anon, authenticated;

COMMIT;
