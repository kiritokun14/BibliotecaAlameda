-- Imágenes principales privadas. El backend es el único que escribe archivos en Storage.
BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('imagenes-contenidos','imagenes-contenidos',false,5242880,ARRAY['image/jpeg','image/png'])
 ON CONFLICT(id) DO NOTHING;
ALTER TABLE public."Contenido" ADD COLUMN IF NOT EXISTS "imagenRuta" text,
 ADD COLUMN IF NOT EXISTS "imagenTipo" text;
ALTER TABLE public."Contenido" ADD CONSTRAINT "ck_Contenido_imagen" CHECK
 (("imagenRuta" IS NULL AND "imagenTipo" IS NULL) OR
 ("imagenRuta" IS NOT NULL AND "imagenTipo" IS NOT NULL AND "imagenTipo" IN ('image/jpeg','image/png')));

CREATE OR REPLACE FUNCTION privado.contenido_para_editor(c public."Contenido")
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('folio',c.folio,'tipo',c.tipo,'estado',c.estado,'titulo',c.titulo,
 'resumen',c.resumen,'cuerpo',c.cuerpo,'datos',c.datos,'creadoEn',c."creadoEn",'actualizadoEn',c."actualizadoEn",
 'enviadoEn',c."enviadoEn",'publicadoEn',c."publicadoEn",'tieneImagen',c."imagenRuta" IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION privado.contenido_para_editor(public."Contenido") FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION privado.imagen_contenido(folio_contenido text, accion text DEFAULT 'leer',
 ruta_archivo text DEFAULT NULL,tipo_archivo text DEFAULT NULL,version_contenido timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid; c public."Contenido"%ROWTYPE; permisos jsonb; anterior text;
BEGIN
 actor:=privado.comprobar_sesion_cuenta(); permisos:=privado.permisos_de_cuenta(actor,true);
 IF accion IS NULL OR accion NOT IN ('leer','preparar','asociar','quitar') THEN
  RAISE EXCEPTION 'Acción inválida.' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public."Contenido" WHERE folio=folio_contenido FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contenido no encontrado.' USING ERRCODE='P0002'; END IF;
 IF NOT ((c."creadoPor"=actor AND EXISTS(SELECT 1 FROM jsonb_array_elements(permisos) p WHERE p->>'capacidad'='preparar_contenidos'))
  OR (accion='leer' AND c.estado NOT IN ('borrador','archivado') AND EXISTS(SELECT 1 FROM jsonb_array_elements(permisos) p
   WHERE p->>'capacidad'='publicar_contenidos' AND p->>'ambito'='global'))) THEN
  RAISE EXCEPTION 'Sin permiso sobre esta imagen.' USING ERRCODE='42501'; END IF;
 IF accion<>'leer' AND (c.estado NOT IN ('borrador','con_observaciones') OR c.tipo NOT IN ('noticia','resena','memoria')) THEN
  RAISE EXCEPTION 'Este contenido no admite cambios de imagen.' USING ERRCODE='55000'; END IF;
 IF accion IN ('asociar','quitar') THEN
  IF version_contenido IS NULL OR version_contenido IS DISTINCT FROM c."actualizadoEn" THEN
   RAISE EXCEPTION 'El contenido cambió durante la carga.' USING ERRCODE='40001'; END IF;
  anterior:=c."imagenRuta";
  IF accion='asociar' THEN
   IF ruta_archivo IS NULL OR ruta_archivo !~ ('^'||c.folio||'/[0-9a-f-]{36}\.(jpg|png)$')
    OR tipo_archivo IS NULL OR tipo_archivo NOT IN ('image/jpeg','image/png')
    OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='imagenes-contenidos' AND o.name=ruta_archivo
     AND o.metadata->>'mimetype'=tipo_archivo) THEN
    RAISE EXCEPTION 'Archivo inválido o no almacenado.' USING ERRCODE='22023'; END IF;
  END IF;
  UPDATE public."Contenido" SET "imagenRuta"=CASE WHEN accion='asociar' THEN ruta_archivo END,
   "imagenTipo"=CASE WHEN accion='asociar' THEN tipo_archivo END WHERE id=c.id RETURNING * INTO c;
 END IF;
 RETURN privado.contenido_para_editor(c)||jsonb_build_object('ruta',c."imagenRuta",'tipoArchivo',c."imagenTipo",'rutaAnterior',anterior);
END;
$$;
REVOKE ALL ON FUNCTION privado.imagen_contenido(text,text,text,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION privado.imagen_contenido(text,text,text,text,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.imagen_contenido(folio_contenido text,accion text DEFAULT 'leer',
 ruta_archivo text DEFAULT NULL,tipo_archivo text DEFAULT NULL,version_contenido timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.imagen_contenido(folio_contenido,accion,ruta_archivo,tipo_archivo,version_contenido);
$$;
REVOKE ALL ON FUNCTION public.imagen_contenido(text,text,text,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.imagen_contenido(text,text,text,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.imagen_publicada(folio_contenido text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('ruta',c."imagenRuta",'tipoArchivo',c."imagenTipo") FROM public."Contenido" c
 WHERE c.folio=folio_contenido AND c.estado='publicado' AND c."autorizadoPor" IS NOT NULL
 AND c."publicadoEn"<=statement_timestamp() AND c."imagenRuta" IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.imagen_publicada(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.imagen_publicada(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.contenidos_publicados(tipo_contenido text DEFAULT NULL,identificador text DEFAULT NULL,
 limite integer DEFAULT 50,desplazamiento integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('folio',c.folio,'slug',c.slug,'tipo',c.tipo,'titulo',c.titulo,
 'resumen',c.resumen,'cuerpo',c.cuerpo,'datos',c.datos,'publicadoEn',c."publicadoEn",
 'imagenUrl',CASE WHEN c."imagenRuta" IS NOT NULL THEN '/api/contenidos/publicos/'||c.folio||'/imagen' END)
 ORDER BY c."publicadoEn" DESC,c.folio),'[]'::jsonb)
 FROM (SELECT * FROM public."Contenido" x WHERE x.estado='publicado' AND x."autorizadoPor" IS NOT NULL
 AND x."publicadoEn"<=statement_timestamp() AND x.tipo IN ('noticia','resena','acerca','memoria')
 AND (tipo_contenido IS NULL OR x.tipo=tipo_contenido)
 AND (identificador IS NULL OR x.slug=identificador OR x.folio=identificador)
 ORDER BY x."publicadoEn" DESC,x.folio LIMIT least(greatest(limite,1),50) OFFSET greatest(desplazamiento,0))c;
$$;
COMMIT;
