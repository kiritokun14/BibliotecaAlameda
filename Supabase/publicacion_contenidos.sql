-- T-055. Revisión institucional: usa los borradores de T-054, sin duplicarlos.
-- Sin nuevas asignaciones de roles. Cada operación valida sesión y publicar_contenidos.
BEGIN;
ALTER TABLE public."revisionContenido" ADD COLUMN IF NOT EXISTS detalles jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public."Contenido" DROP CONSTRAINT "ck_Contenido_3";
ALTER TABLE public."Contenido" ADD CONSTRAINT "ck_Contenido_3" CHECK (estado IN
 ('borrador','en_revision','con_observaciones','aprobado','publicado','retirado','archivado','rechazado'));

CREATE OR REPLACE FUNCTION privado.contenido_para_revision(c public."Contenido")
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.contenido_para_editor(c) || jsonb_build_object(
 'autor', (SELECT concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido") FROM public.perfil p WHERE p.id=c."creadoPor"),
 'historial', (SELECT coalesce(jsonb_agg(jsonb_build_object('accion',r.accion,'nota',r.nota,
 'observaciones',r.observaciones,'detalles',r.detalles,'fecha',r."realizadoEn",
 'responsable',concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido")) ORDER BY r."realizadoEn",CASE r.accion WHEN 'envio' THEN 0 WHEN 'aprobacion' THEN 1 WHEN 'publicacion' THEN 2 ELSE 3 END,r.id),'[]'::jsonb)
 FROM public."revisionContenido" r JOIN public.perfil p ON p.id=r."realizadoPor" WHERE r."contenidoId"=c.id));
$$;
REVOKE ALL ON FUNCTION privado.contenido_para_revision(public."Contenido") FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION privado.revision_contenidos(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE
 actor uuid; c public."Contenido"%ROWTYPE; anterior public."Contenido"%ROWTYPE;
 claves text[]; nota text; referencia text; obs jsonb; esperado timestamptz;
 filtro text; buscar text; limite integer; desplazamiento integer; total integer; filas jsonb;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) p
 WHERE p->>'capacidad'='publicar_contenidos' AND p->>'ambito'='global') THEN
  RAISE EXCEPTION 'Sin permiso de publicación global.' USING ERRCODE='42501';
 END IF;
 IF operacion IS NULL OR operacion NOT IN ('listar','obtener','publicar','observaciones','rechazar','retirar')
 OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'Petición inválida.' USING ERRCODE='22023';
 END IF;
 claves:=CASE operacion WHEN 'listar' THEN ARRAY['estado','busqueda','limite','desplazamiento']
 WHEN 'obtener' THEN ARRAY['folio'] WHEN 'publicar' THEN ARRAY['folio','actualizadoEn','referencia','nota']
 WHEN 'observaciones' THEN ARRAY['folio','actualizadoEn','observaciones','nota']
 ELSE ARRAY['folio','actualizadoEn','nota'] END;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k<>ALL(claves)) THEN
  RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE='22023';
 END IF;
 IF operacion='listar' THEN
  filtro:=nullif(datos->>'estado',''); buscar:=nullif(btrim(datos->>'busqueda'),'');
  limite:=coalesce((datos->>'limite')::integer,10); desplazamiento:=coalesce((datos->>'desplazamiento')::integer,0);
  IF limite NOT BETWEEN 1 AND 50 OR desplazamiento NOT BETWEEN 0 AND 100000 OR length(buscar)>100
   OR (filtro IS NOT NULL AND filtro NOT IN ('en_revision','con_observaciones','publicado','rechazado','retirado','historial')) THEN
   RAISE EXCEPTION 'Filtro inválido.' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO total FROM public."Contenido" x WHERE x.tipo IN ('noticia','resena','acerca','memoria')
   AND x.estado NOT IN ('borrador','archivado')
   AND (filtro IS NULL OR (filtro='historial' AND x."publicadoEn" IS NOT NULL) OR x.estado=filtro)
   AND (buscar IS NULL OR x.titulo ILIKE '%'||buscar||'%' OR x.folio ILIKE '%'||buscar||'%');
  SELECT coalesce(jsonb_agg(privado.contenido_para_revision(x) ORDER BY x."enviadoEn",x.folio),'[]'::jsonb) INTO filas
  FROM (SELECT * FROM public."Contenido" x WHERE x.tipo IN ('noticia','resena','acerca','memoria')
   AND x.estado NOT IN ('borrador','archivado')
   AND (filtro IS NULL OR (filtro='historial' AND x."publicadoEn" IS NOT NULL) OR x.estado=filtro)
   AND (buscar IS NULL OR x.titulo ILIKE '%'||buscar||'%' OR x.folio ILIKE '%'||buscar||'%')
   ORDER BY x."enviadoEn",x.folio LIMIT limite OFFSET desplazamiento) x;
  RETURN jsonb_build_object('total',total,'contenidos',filas);
 END IF;
 SELECT * INTO c FROM public."Contenido" WHERE folio=datos->>'folio' AND tipo IN ('noticia','resena','acerca','memoria')
 AND estado NOT IN ('borrador','archivado') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contenido no disponible.' USING ERRCODE='P0002'; END IF;
 IF operacion='obtener' THEN RETURN privado.contenido_para_revision(c); END IF;
 esperado:=(datos->>'actualizadoEn')::timestamptz;
 IF esperado IS NULL OR esperado IS DISTINCT FROM c."actualizadoEn" THEN
  RAISE EXCEPTION 'El contenido cambió; recarga antes de decidir.' USING ERRCODE='40001'; END IF;
 nota:=nullif(btrim(datos->>'nota'),'');
 IF length(nota)>1000 THEN RAISE EXCEPTION 'Nota demasiado larga.' USING ERRCODE='22023'; END IF;
 IF (operacion='retirar' AND c.estado<>'publicado') OR (operacion<>'retirar' AND c.estado<>'en_revision') THEN
  RAISE EXCEPTION 'Transición no permitida.' USING ERRCODE='55000'; END IF;
 IF operacion='publicar' THEN
  referencia:=nullif(btrim(datos->>'referencia'),'');
  IF referencia IS NULL OR length(referencia)>200 OR NOT privado.contenido_completo(c) THEN
   RAISE EXCEPTION 'Falta la autorización o el contenido está incompleto.' USING ERRCODE='23514'; END IF;
  -- Una sola versión vigente de cada sección institucional. Serializa publicaciones concurrentes.
  IF c.tipo='acerca' THEN
   PERFORM pg_advisory_xact_lock(hashtext('acerca:'||(c.datos->>'seccion')));
   FOR anterior IN SELECT * FROM public."Contenido" x WHERE x.tipo='acerca' AND x.estado='publicado'
    AND x.datos->>'seccion'=c.datos->>'seccion' AND x.id<>c.id FOR UPDATE LOOP
    UPDATE public."Contenido" SET estado='retirado' WHERE id=anterior.id;
    INSERT INTO public."revisionContenido"("contenidoId",accion,nota,"realizadoPor",detalles)
     VALUES(anterior.id,'retiro','Sustituido por una nueva versión autorizada.',actor,jsonb_build_object('sustituidoPor',c.folio));
   END LOOP;
  END IF;
  INSERT INTO public."revisionContenido"("contenidoId",accion,nota,"realizadoPor",detalles)
   VALUES(c.id,'aprobacion',nota,actor,jsonb_build_object('referencia',referencia));
  UPDATE public."Contenido" SET estado='publicado',"autorizadoPor"=actor,"publicadoEn"=statement_timestamp() WHERE id=c.id RETURNING * INTO c;
  INSERT INTO public."revisionContenido"("contenidoId",accion,nota,"realizadoPor",detalles)
   VALUES(c.id,'publicacion',nota,actor,jsonb_build_object('referencia',referencia));
 ELSIF operacion='observaciones' THEN
  obs:=datos->'observaciones';
  IF jsonb_typeof(obs) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Observaciones inválidas.' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(obs) NOT BETWEEN 1 AND 20 OR EXISTS(SELECT 1 FROM jsonb_array_elements(obs) v
   WHERE jsonb_typeof(v)<>'string' OR length(btrim(v#>>'{}')) NOT BETWEEN 1 AND 500) THEN
   RAISE EXCEPTION 'Observaciones inválidas.' USING ERRCODE='22023'; END IF;
  UPDATE public."Contenido" SET estado='con_observaciones' WHERE id=c.id RETURNING * INTO c;
  INSERT INTO public."revisionContenido"("contenidoId",accion,nota,observaciones,"realizadoPor") VALUES(c.id,'observaciones',nota,obs,actor);
 ELSE
  IF nota IS NULL THEN RAISE EXCEPTION 'Especifica el motivo.' USING ERRCODE='23514'; END IF;
  UPDATE public."Contenido" SET estado=CASE WHEN operacion='rechazar' THEN 'rechazado' ELSE 'retirado' END
   WHERE id=c.id RETURNING * INTO c;
  INSERT INTO public."revisionContenido"("contenidoId",accion,nota,"realizadoPor")
   VALUES(c.id,CASE WHEN operacion='rechazar' THEN 'rechazo' ELSE 'retiro' END,nota,actor);
 END IF;
 RETURN privado.contenido_para_revision(c);
END;
$$;
REVOKE ALL ON FUNCTION privado.revision_contenidos(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.revision_contenidos(text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.revision_contenidos(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.revision_contenidos(operacion,datos);
$$;
REVOKE ALL ON FUNCTION public.revision_contenidos(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revision_contenidos(text,jsonb) TO authenticated;

-- Proyección pública explícita: no entrega notas, responsables de cuentas ni borradores.
CREATE OR REPLACE FUNCTION public.contenidos_publicados(tipo_contenido text DEFAULT NULL, identificador text DEFAULT NULL,
 limite integer DEFAULT 50, desplazamiento integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('folio',c.folio,'slug',c.slug,'tipo',c.tipo,'titulo',c.titulo,
 'resumen',c.resumen,'cuerpo',c.cuerpo,'datos',c.datos,'publicadoEn',c."publicadoEn") ORDER BY c."publicadoEn" DESC,c.folio),'[]'::jsonb)
 FROM (SELECT * FROM public."Contenido" x WHERE x.estado='publicado' AND x."autorizadoPor" IS NOT NULL
  AND x."publicadoEn"<=statement_timestamp() AND x.tipo IN ('noticia','resena','acerca','memoria')
  AND (tipo_contenido IS NULL OR x.tipo=tipo_contenido)
  AND (identificador IS NULL OR x.slug=identificador OR x.folio=identificador)
  ORDER BY x."publicadoEn" DESC,x.folio LIMIT least(greatest(limite,1),50) OFFSET greatest(desplazamiento,0))c;
$$;
REVOKE ALL ON FUNCTION public.contenidos_publicados(text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contenidos_publicados(text,text,integer,integer) TO anon,authenticated;

CREATE OR REPLACE FUNCTION privado.historial_contenido_propio(folio_contenido text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid; c public."Contenido"%ROWTYPE;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) p
  WHERE p->>'capacidad'='preparar_contenidos') THEN
  RAISE EXCEPTION 'Sin permiso de edición.' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public."Contenido" WHERE folio=folio_contenido AND "creadoPor"=actor;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contenido no disponible.' USING ERRCODE='P0002'; END IF;
 RETURN privado.contenido_para_revision(c);
END;
$$;
REVOKE ALL ON FUNCTION privado.historial_contenido_propio(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION privado.historial_contenido_propio(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.historial_contenido_propio(folio_contenido text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.historial_contenido_propio(folio_contenido);
$$;
REVOKE ALL ON FUNCTION public.historial_contenido_propio(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.historial_contenido_propio(text) TO authenticated;
COMMIT;
