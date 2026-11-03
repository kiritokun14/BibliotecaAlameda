-- HU-11 / T-054. Editor de contenidos: borradores, envío a autorización y observaciones.
-- Se ejecuta después de alta_asistida_cuentas.sql (paso 7 del README).
--
-- Qué agrega:
--   1. Contenido: folio (CN-0001…), resumen, datos propios de cada tipo y fecha de envío.
--   2. Estado nuevo "con_observaciones" (el Administrador pidió cambios).
--      "en_revision" es lo que la pantalla muestra como "Por autorizar".
--   3. Tipos permitidos: los del editor (noticia, resena, acerca, memoria) y los que ya
--      existían en los datos de prueba (servicio, programa, recurso).
--   4. Tabla revisionContenido: bitácora de envíos y decisiones, con las observaciones.
--   5. Función editor_contenidos(operacion, datos) para el Editor (capacidad preparar_contenidos):
--      resumen, listar, obtener, guardar y enviar. Solo trabaja con los contenidos propios.
--
-- La revisión y publicación del Administrador (publicar_contenidos) va en otro script.

-- ---------------------------------------------------------------------------
-- 1. Folio, resumen, datos y fecha de envío
-- ---------------------------------------------------------------------------
CREATE SEQUENCE privado.folio_contenido;
REVOKE ALL ON SEQUENCE privado.folio_contenido FROM PUBLIC, anon, authenticated;

CREATE FUNCTION privado.siguiente_folio_contenido()
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $$
  -- CN-0001 … CN-9999, después CN-10000 (no se recorta)
  SELECT 'CN-' || lpad(n::text, greatest(4, length(n::text)), '0')
  FROM (SELECT nextval('privado.folio_contenido') AS n) s;
$$;
REVOKE ALL ON FUNCTION privado.siguiente_folio_contenido() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION privado.siguiente_folio_contenido() TO service_role;

ALTER TABLE public."Contenido"
  ADD COLUMN "folio" text,
  ADD COLUMN "resumen" text NOT NULL DEFAULT '',
  ADD COLUMN "datos" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "enviadoEn" timestamptz;

-- Folio para los contenidos que ya existen, en orden de creación
UPDATE public."Contenido" c SET "folio" = f.folio
FROM (
  SELECT id, privado.siguiente_folio_contenido() AS folio
  FROM (SELECT id FROM public."Contenido" ORDER BY "creadoEn", id) ordenados
) f
WHERE c.id = f.id;

ALTER TABLE public."Contenido"
  ALTER COLUMN "folio" SET DEFAULT privado.siguiente_folio_contenido(),
  ALTER COLUMN "folio" SET NOT NULL,
  ADD CONSTRAINT "uq_Contenido_folio" UNIQUE ("folio"),
  ADD CONSTRAINT "ck_Contenido_datos" CHECK (jsonb_typeof("datos") = 'object'),
  ADD CONSTRAINT "ck_Contenido_resumen" CHECK (length("resumen") <= 160);

-- ---------------------------------------------------------------------------
-- 2 y 3. Estados y tipos
-- ---------------------------------------------------------------------------
ALTER TABLE public."Contenido" DROP CONSTRAINT "ck_Contenido_3";
ALTER TABLE public."Contenido" ADD CONSTRAINT "ck_Contenido_3" CHECK ("estado" IN
  ('borrador', 'en_revision', 'con_observaciones', 'aprobado', 'publicado', 'retirado', 'archivado'));
ALTER TABLE public."Contenido" ADD CONSTRAINT "ck_Contenido_4" CHECK ("tipo" IN
  ('noticia', 'resena', 'acerca', 'memoria', 'servicio', 'programa', 'recurso'));

COMMENT ON COLUMN public."Contenido"."estado" IS
  'Valores permitidos: borrador, en_revision (por autorizar), con_observaciones, aprobado, publicado, retirado, archivado';
COMMENT ON COLUMN public."Contenido"."folio" IS 'Folio visible para el personal: CN-0001, CN-0002…';
COMMENT ON COLUMN public."Contenido"."datos" IS
  'Campos propios de cada tipo (categoría y fecha de la noticia, datos del libro de la reseña, sección de Acerca de…)';

-- ---------------------------------------------------------------------------
-- 4. Bitácora de revisión
-- ---------------------------------------------------------------------------
CREATE TABLE public."revisionContenido" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "contenidoId" uuid NOT NULL,
  "accion" text NOT NULL,
  "nota" text,
  "observaciones" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "realizadoPor" uuid NOT NULL,
  "realizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_revisionContenido" PRIMARY KEY ("id"),
  CONSTRAINT "fk_revisionContenido_contenidoId" FOREIGN KEY ("contenidoId")
    REFERENCES public."Contenido" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT "fk_revisionContenido_realizadoPor" FOREIGN KEY ("realizadoPor")
    REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT "ck_revisionContenido_1" CHECK ("accion" IN ('envio', 'observaciones', 'aprobacion', 'publicacion', 'rechazo', 'retiro')),
  CONSTRAINT "ck_revisionContenido_2" CHECK (jsonb_typeof("observaciones") = 'array'),
  CONSTRAINT "ck_revisionContenido_3" CHECK ("nota" IS NULL OR length("nota") <= 1000)
);
CREATE INDEX "ix_revisionContenido_contenidoId" ON public."revisionContenido" ("contenidoId", "realizadoEn" DESC);
CREATE INDEX "ix_revisionContenido_realizadoPor" ON public."revisionContenido" ("realizadoPor");
COMMENT ON TABLE public."revisionContenido" IS
  'Bitácora de envíos a autorización y decisiones sobre un contenido (HU-11). Las observaciones son una lista de textos.';

ALTER TABLE public."revisionContenido" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."revisionContenido" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."revisionContenido" TO service_role;
GRANT SELECT ON TABLE public."revisionContenido" TO authenticated;
-- Quien redactó el contenido puede leer su bitácora (para ver las observaciones)
CREATE POLICY "lectura_autor_revisionContenido" ON public."revisionContenido" FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."Contenido" c
                 WHERE c.id = "revisionContenido"."contenidoId" AND c."creadoPor" = (SELECT auth.uid())));

-- ---------------------------------------------------------------------------
-- 5. Operaciones del Editor
-- ---------------------------------------------------------------------------
-- Campos que acepta "datos" según el tipo
CREATE FUNCTION privado.campos_datos_contenido(tipo text)
RETURNS text[] LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT CASE tipo
    WHEN 'noticia' THEN ARRAY['categoria', 'fecha', 'destacar', 'verMas', 'textoAlternativo']
    WHEN 'resena'  THEN ARRAY['autoria', 'genero', 'anio', 'clasificacion', 'vista', 'tema', 'memoriaPublica']
    WHEN 'acerca'  THEN ARRAY['seccion', 'lineaTiempo']
    WHEN 'memoria' THEN ARRAY[]::text[]
  END;
$$;
REVOKE ALL ON FUNCTION privado.campos_datos_contenido(text) FROM PUBLIC, anon, authenticated;

-- Fila de contenido en el formato que usa el panel
CREATE FUNCTION privado.contenido_para_editor(c public."Contenido")
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT jsonb_build_object(
    'folio', c."folio", 'tipo', c."tipo", 'estado', c."estado", 'titulo', c."titulo",
    'resumen', c."resumen", 'cuerpo', c."cuerpo", 'datos', c."datos",
    'creadoEn', c."creadoEn", 'actualizadoEn', c."actualizadoEn", 'enviadoEn', c."enviadoEn",
    'publicadoEn', c."publicadoEn");
$$;
REVOKE ALL ON FUNCTION privado.contenido_para_editor(public."Contenido") FROM PUBLIC, anon, authenticated;

CREATE FUNCTION privado.editor_contenidos(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
#variable_conflict use_variable
DECLARE
  actor uuid;
  claves text[];
  contenido public."Contenido"%ROWTYPE;
  v_tipo text; v_titulo text; v_resumen text; v_cuerpo text; v_datos jsonb; v_nota text;
  v_estado text; v_busqueda text; limite integer; desplazamiento integer;
  resultado jsonb; total integer;
BEGIN
  IF operacion IS NULL OR operacion NOT IN ('resumen', 'listar', 'obtener', 'guardar', 'enviar')
     OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
  END IF;

  actor := privado.comprobar_sesion_cuenta();
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor, true)) p
                 WHERE p->>'capacidad' = 'preparar_contenidos') THEN
    RAISE EXCEPTION 'Sin permiso para preparar contenidos.' USING ERRCODE = '42501';
  END IF;

  claves := CASE operacion
    WHEN 'resumen' THEN ARRAY[]::text[]
    WHEN 'listar'  THEN ARRAY['estado', 'busqueda', 'limite', 'desplazamiento']
    WHEN 'obtener' THEN ARRAY['folio']
    WHEN 'guardar' THEN ARRAY['folio', 'tipo', 'titulo', 'resumen', 'cuerpo', 'datos']
    WHEN 'enviar'  THEN ARRAY['folio', 'nota'] END;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE k <> ALL (claves)) THEN
    RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE = '22023';
  END IF;

  -- Cifras de las tarjetas de inicio del editor
  IF operacion = 'resumen' THEN
    SELECT jsonb_build_object(
      'borrador', count(*) FILTER (WHERE estado = 'borrador'),
      'en_revision', count(*) FILTER (WHERE estado = 'en_revision'),
      'con_observaciones', count(*) FILTER (WHERE estado = 'con_observaciones'),
      'publicado', count(*) FILTER (WHERE estado = 'publicado'),
      'total', count(*))
    INTO resultado
    FROM public."Contenido" WHERE "creadoPor" = actor AND estado <> 'archivado';
    RETURN resultado;
  END IF;

  -- Mis contenidos, del más reciente al más antiguo
  IF operacion = 'listar' THEN
    v_estado := nullif(datos->>'estado', '');
    IF v_estado IS NOT NULL AND v_estado NOT IN ('borrador', 'en_revision', 'con_observaciones', 'publicado') THEN
      RAISE EXCEPTION 'Estado inválido.' USING ERRCODE = '22023';
    END IF;
    v_busqueda := nullif(btrim(coalesce(datos->>'busqueda', '')), '');
    IF length(v_busqueda) > 100 THEN RAISE EXCEPTION 'Búsqueda demasiado larga.' USING ERRCODE = '22023'; END IF;
    BEGIN
      limite := coalesce((datos->>'limite')::integer, 10);
      desplazamiento := coalesce((datos->>'desplazamiento')::integer, 0);
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE = '22023';
    END;
    IF limite NOT BETWEEN 1 AND 50 OR desplazamiento < 0 THEN
      RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO total FROM public."Contenido" c
    WHERE c."creadoPor" = actor AND c.estado <> 'archivado'
      AND (v_estado IS NULL OR c.estado = v_estado)
      AND (v_busqueda IS NULL OR c."folio" ILIKE '%' || v_busqueda || '%' OR c."titulo" ILIKE '%' || v_busqueda || '%');

    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'folio', c."folio", 'tipo', c."tipo", 'estado', c."estado", 'titulo', c."titulo",
             'actualizadoEn', c."actualizadoEn") ORDER BY c."actualizadoEn" DESC, c."folio" DESC), '[]'::jsonb)
    INTO resultado
    FROM (SELECT * FROM public."Contenido" c
          WHERE c."creadoPor" = actor AND c.estado <> 'archivado'
            AND (v_estado IS NULL OR c.estado = v_estado)
            AND (v_busqueda IS NULL OR c."folio" ILIKE '%' || v_busqueda || '%' OR c."titulo" ILIKE '%' || v_busqueda || '%')
          ORDER BY c."actualizadoEn" DESC, c."folio" DESC
          LIMIT limite OFFSET desplazamiento) c;

    RETURN jsonb_build_object('total', total, 'contenidos', resultado);
  END IF;

  -- A partir de aquí se trabaja con un contenido propio (salvo al crear uno nuevo)
  IF datos ? 'folio' THEN
    SELECT * INTO contenido FROM public."Contenido"
    WHERE "folio" = datos->>'folio' AND "creadoPor" = actor
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró el contenido.' USING ERRCODE = 'P0002';
    END IF;
  ELSIF operacion IN ('obtener', 'enviar') THEN
    RAISE EXCEPTION 'Falta el folio.' USING ERRCODE = '22023';
  END IF;

  -- Un contenido con sus últimas observaciones
  IF operacion = 'obtener' THEN
    SELECT privado.contenido_para_editor(contenido) || jsonb_build_object('observaciones', (
      SELECT jsonb_build_object('lista', r."observaciones", 'nota', r."nota", 'realizadoEn', r."realizadoEn")
      FROM public."revisionContenido" r
      WHERE r."contenidoId" = contenido.id AND r."accion" = 'observaciones'
      ORDER BY r."realizadoEn" DESC LIMIT 1))
    INTO resultado;
    RETURN resultado;
  END IF;

  -- Guardar borrador (crea uno nuevo si no se manda folio)
  IF operacion = 'guardar' THEN
    IF contenido.id IS NOT NULL AND contenido.estado NOT IN ('borrador', 'con_observaciones') THEN
      RAISE EXCEPTION 'Este contenido ya se envió y no se puede editar.' USING ERRCODE = '55000';
    END IF;
    v_tipo := coalesce(contenido."tipo", datos->>'tipo');
    IF v_tipo IS NULL OR v_tipo NOT IN ('noticia', 'resena', 'acerca', 'memoria') THEN
      RAISE EXCEPTION 'Tipo de contenido inválido.' USING ERRCODE = '22023';
    END IF;
    IF contenido.id IS NOT NULL AND datos ? 'tipo' AND datos->>'tipo' IS DISTINCT FROM contenido."tipo" THEN
      RAISE EXCEPTION 'El tipo no se puede cambiar.' USING ERRCODE = '22023';
    END IF;
    v_titulo := btrim(coalesce(datos->>'titulo', contenido."titulo", ''));
    v_resumen := btrim(coalesce(datos->>'resumen', contenido."resumen", ''));
    v_cuerpo := coalesce(datos->>'cuerpo', contenido."cuerpo", '');
    v_datos := coalesce(datos->'datos', contenido."datos", '{}'::jsonb);
    IF length(v_titulo) > 150 OR length(v_resumen) > 160 OR length(v_cuerpo) > 20000 THEN
      RAISE EXCEPTION 'Texto demasiado largo.' USING ERRCODE = '22001';
    END IF;
    IF jsonb_typeof(v_datos) IS DISTINCT FROM 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(v_datos) k WHERE k <> ALL (privado.campos_datos_contenido(v_tipo)))
       OR length(v_datos::text) > 4000 THEN
      RAISE EXCEPTION 'Datos del contenido inválidos.' USING ERRCODE = '22023';
    END IF;

    IF contenido.id IS NULL THEN
      INSERT INTO public."Contenido" ("slug", "titulo", "tipo", "cuerpo", "autorOriginal", "estado", "creadoPor", "resumen", "datos", "folio")
      SELECT lower(f.folio), v_titulo, v_tipo, v_cuerpo, 'Equipo de la biblioteca', 'borrador', actor, v_resumen, v_datos, f.folio
      FROM (SELECT privado.siguiente_folio_contenido() AS folio) f
      RETURNING * INTO contenido;
    ELSE
      UPDATE public."Contenido"
      SET "titulo" = v_titulo, "resumen" = v_resumen, "cuerpo" = v_cuerpo, "datos" = v_datos, "actualizadoEn" = now()
      WHERE id = contenido.id
      RETURNING * INTO contenido;
    END IF;
    RETURN privado.contenido_para_editor(contenido);
  END IF;

  -- Enviar a autorización
  IF operacion = 'enviar' THEN
    IF contenido.estado NOT IN ('borrador', 'con_observaciones') THEN
      RAISE EXCEPTION 'Este contenido ya se envió.' USING ERRCODE = '55000';
    END IF;
    v_nota := nullif(btrim(coalesce(datos->>'nota', '')), '');
    IF length(v_nota) > 1000 THEN RAISE EXCEPTION 'La nota es demasiado larga.' USING ERRCODE = '22001'; END IF;

    -- Lo mínimo para que el Administrador pueda revisarlo
    IF btrim(contenido."titulo") = '' OR btrim(contenido."cuerpo") = ''
       OR (contenido."tipo" IN ('noticia', 'resena') AND btrim(contenido."resumen") = '')
       OR (contenido."tipo" = 'noticia' AND (nullif(contenido."datos"->>'categoria', '') IS NULL OR nullif(contenido."datos"->>'fecha', '') IS NULL))
       OR (contenido."tipo" = 'resena' AND (nullif(contenido."datos"->>'autoria', '') IS NULL OR nullif(contenido."datos"->>'vista', '') IS NULL))
       OR (contenido."tipo" = 'acerca' AND nullif(contenido."datos"->>'seccion', '') IS NULL) THEN
      RAISE EXCEPTION 'Faltan campos obligatorios.' USING ERRCODE = '23514';
    END IF;

    UPDATE public."Contenido" SET "estado" = 'en_revision', "enviadoEn" = now(), "actualizadoEn" = now()
    WHERE id = contenido.id RETURNING * INTO contenido;
    INSERT INTO public."revisionContenido" ("contenidoId", "accion", "nota", "realizadoPor")
    VALUES (contenido.id, 'envio', v_nota, actor);
    RETURN privado.contenido_para_editor(contenido);
  END IF;

  RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION privado.editor_contenidos(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION privado.editor_contenidos(text, jsonb) TO authenticated;

CREATE FUNCTION public.editor_contenidos(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT privado.editor_contenidos(operacion, datos);
$$;
REVOKE ALL ON FUNCTION public.editor_contenidos(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editor_contenidos(text, jsonb) TO authenticated;
