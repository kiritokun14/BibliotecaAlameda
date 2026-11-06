-- HU-11 / T-054. Memoria pública en el editor de contenidos.
-- Se ejecuta después de contenidos_editor.sql (paso 8 del README).
--
-- Qué cambia:
--   1. Las piezas de Memoria pública aceptan sus propios datos (autoría o fuente, tipo de pieza,
--      año o periodo, registro en archivo, dónde se publica, tema y permiso de uso de la imagen).
--   2. Los campos obligatorios para enviar a autorización quedan en una sola función,
--      privado.contenido_completo, y editor_contenidos la usa. Las demás reglas no cambian.

CREATE OR REPLACE FUNCTION privado.campos_datos_contenido(tipo text)
RETURNS text[] LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT CASE tipo
    WHEN 'noticia' THEN ARRAY['categoria', 'fecha', 'destacar', 'verMas', 'textoAlternativo']
    WHEN 'resena'  THEN ARRAY['autoria', 'genero', 'anio', 'clasificacion', 'vista', 'tema', 'memoriaPublica']
    WHEN 'acerca'  THEN ARRAY['seccion', 'lineaTiempo']
    WHEN 'memoria' THEN ARRAY['autoria', 'tipoPieza', 'periodo', 'registroArchivo', 'publicacion', 'tema', 'permisoImagen']
  END;
$$;
REVOKE ALL ON FUNCTION privado.campos_datos_contenido(text) FROM PUBLIC, anon, authenticated;

-- Lo mínimo para que el Administrador pueda revisar un contenido
CREATE FUNCTION privado.contenido_completo(c public."Contenido")
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT btrim(c."titulo") <> '' AND btrim(c."cuerpo") <> ''
    AND (c."tipo" NOT IN ('noticia', 'resena', 'memoria') OR btrim(c."resumen") <> '')
    AND (c."tipo" <> 'noticia' OR (nullif(c."datos"->>'categoria', '') IS NOT NULL AND nullif(c."datos"->>'fecha', '') IS NOT NULL))
    AND (c."tipo" <> 'resena' OR (nullif(c."datos"->>'autoria', '') IS NOT NULL AND nullif(c."datos"->>'vista', '') IS NOT NULL))
    AND (c."tipo" <> 'acerca' OR nullif(c."datos"->>'seccion', '') IS NOT NULL)
    AND (c."tipo" <> 'memoria' OR (nullif(c."datos"->>'autoria', '') IS NOT NULL AND nullif(c."datos"->>'publicacion', '') IS NOT NULL));
$$;
REVOKE ALL ON FUNCTION privado.contenido_completo(public."Contenido") FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION privado.editor_contenidos(operacion text, datos jsonb DEFAULT '{}'::jsonb)
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

    IF NOT privado.contenido_completo(contenido) THEN
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
