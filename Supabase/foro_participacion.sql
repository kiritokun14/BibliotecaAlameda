-- HU-26 / HU-27: participación persistente y revisión previa del foro.
BEGIN;
CREATE TABLE privado."historialRevisionForo" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 "temaId" uuid REFERENCES public."temaForo"("temaId"),
 "comentarioId" uuid REFERENCES public."comentarioForo"(id),
 accion text NOT NULL CHECK(accion IN ('crear','editar','retirar_propio','publicar','rechazar')),
 motivo text NOT NULL, "realizadoPor" uuid NOT NULL REFERENCES public.perfil(id),
 fecha timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(num_nonnulls("temaId","comentarioId")=1)
);
ALTER TABLE privado."historialRevisionForo" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."historialRevisionForo" FROM PUBLIC,anon,authenticated;
CREATE INDEX revision_foro_comentario ON privado."historialRevisionForo"("comentarioId",fecha);
CREATE INDEX revision_foro_tema ON privado."historialRevisionForo"("temaId",fecha);
CREATE INDEX revision_foro_responsable ON privado."historialRevisionForo"("realizadoPor");

CREATE FUNCTION privado.foro_lectura(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid; total bigint; filas jsonb; tema uuid;
BEGIN
 IF auth.uid() IS NOT NULL THEN actor:=privado.comprobar_sesion_cuenta(); END IF;
 IF jsonb_typeof(datos) IS DISTINCT FROM 'object' OR datos-ARRAY['temaId','desplazamiento']<>'{}'::jsonb
  OR coalesce((datos->>'desplazamiento')::int,0) NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
 IF operacion='tema' THEN
  SELECT jsonb_build_object('id',f."temaId",'titulo',f.titulo,'descripcion',f.descripcion,'fecha',f."creadoEn",
    'respuestas',(SELECT count(*) FROM public."comentarioForo" c WHERE c."temaId"=f."temaId" AND c."estadoModeracion"='publicado'),
    'ultimaActividad',coalesce((SELECT max(c."creadoEn") FROM public."comentarioForo" c WHERE c."temaId"=f."temaId" AND c."estadoModeracion"='publicado'),f."creadoEn"))
   INTO filas FROM public."temaForo" f WHERE f."temaId"=(datos->>'temaId')::uuid AND f."estadoModeracion"='publicado';
  IF filas IS NULL THEN RAISE EXCEPTION 'Tema no disponible' USING ERRCODE='P0002'; END IF;
  RETURN filas;
 ELSIF operacion='temas' THEN
  SELECT count(*) INTO total FROM public."temaForo" WHERE "estadoModeracion"='publicado';
  SELECT coalesce(jsonb_agg(t.dato ORDER BY t.fecha,t.id),'[]'::jsonb) INTO filas FROM (
   SELECT f."temaId" id,f."creadoEn" fecha,jsonb_build_object('id',f."temaId",'titulo',f.titulo,'descripcion',f.descripcion,
    'fecha',f."creadoEn",'respuestas',(SELECT count(*) FROM public."comentarioForo" c WHERE c."temaId"=f."temaId" AND c."estadoModeracion"='publicado'),
    'ultimaActividad',coalesce((SELECT max(c."creadoEn") FROM public."comentarioForo" c WHERE c."temaId"=f."temaId" AND c."estadoModeracion"='publicado'),f."creadoEn")) dato
   FROM public."temaForo" f WHERE f."estadoModeracion"='publicado' ORDER BY f."creadoEn",f."temaId"
   LIMIT 20 OFFSET coalesce((datos->>'desplazamiento')::int,0)) t;
  RETURN jsonb_build_object('total',total,'temas',filas);
 ELSIF operacion='respuestas' THEN
  tema:=(datos->>'temaId')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public."temaForo" WHERE "temaId"=tema AND "estadoModeracion"='publicado') THEN
   RAISE EXCEPTION 'Tema no disponible' USING ERRCODE='P0002'; END IF;
  SELECT count(*) INTO total FROM public."comentarioForo" c WHERE c."temaId"=tema AND (c."estadoModeracion"='publicado' OR (c."creadoPor"=actor AND c."estadoModeracion"='pendiente'));
  SELECT coalesce(jsonb_agg(t.dato ORDER BY t.fecha,t.id),'[]'::jsonb) INTO filas FROM (
   SELECT c.id,c."creadoEn" fecha,jsonb_build_object('id',c.id,'temaId',c."temaId",'texto',c."cuerpoComentario",'fecha',c."creadoEn",
    'estado',c."estadoModeracion",'propia',coalesce(c."creadoPor"=actor,false),
    'autor',coalesce(nullif(split_part(btrim(p.nombres),' ',1),''),'Participante'),
    'version',CASE WHEN c."creadoPor"=actor THEN md5(to_jsonb(c)::text) END,
    'reportada',EXISTS(SELECT 1 FROM public."reporteModeracion" r WHERE r."comentarioId"=c.id AND r."reportadoPor"=actor AND r."estadoReporte" IN ('pendiente','en_revision'))) dato
   FROM public."comentarioForo" c JOIN public.perfil p ON p.id=c."creadoPor"
   WHERE c."temaId"=tema AND (c."estadoModeracion"='publicado' OR (c."creadoPor"=actor AND c."estadoModeracion"='pendiente'))
   ORDER BY c."creadoEn",c.id LIMIT 20 OFFSET coalesce((datos->>'desplazamiento')::int,0)) t;
  RETURN jsonb_build_object('total',total,'respuestas',filas);
 END IF;
 RAISE EXCEPTION 'Operación inválida' USING ERRCODE='22023';
END; $$;
REVOKE ALL ON FUNCTION privado.foro_lectura(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.foro_lectura(text,jsonb) TO anon,authenticated;
CREATE FUNCTION public.foro_lectura(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT privado.foro_lectura(operacion,datos); $$;
REVOKE ALL ON FUNCTION public.foro_lectura(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.foro_lectura(text,jsonb) TO anon,authenticated;

CREATE FUNCTION privado.foro_participacion(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid; tipo text; objetivo uuid; tema uuid; texto text; titulo text; estado text; nota text;
 previo jsonb; autor uuid; accion text; filas jsonb; total bigint; permite boolean; version text;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF jsonb_typeof(datos) IS DISTINCT FROM 'object' OR operacion IS NULL OR operacion NOT IN ('crear','editar','retirar','pendientes','revisar') THEN
  RAISE EXCEPTION 'Operación inválida' USING ERRCODE='22023'; END IF;
 IF operacion IN ('pendientes','revisar') THEN
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) p
    WHERE p->>'capacidad'='moderar_foro' AND p->>'ambito'='global') THEN
   RAISE EXCEPTION 'Moderación no autorizada' USING ERRCODE='42501'; END IF;
 END IF;
 IF operacion='pendientes' THEN
  IF datos-ARRAY['desplazamiento']<>'{}'::jsonb OR coalesce((datos->>'desplazamiento')::int,0) NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Página inválida' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO total FROM (SELECT "temaId" FROM public."temaForo" WHERE "estadoModeracion"='pendiente'
   UNION ALL SELECT c.id FROM public."comentarioForo" c JOIN public."temaForo" t ON t."temaId"=c."temaId" WHERE c."estadoModeracion"='pendiente' AND t."estadoModeracion"='publicado') f;
  SELECT coalesce(jsonb_agg(f.dato ORDER BY f.fecha,f.id),'[]'::jsonb) INTO filas FROM (
   SELECT t."temaId" id,t."creadoEn" fecha,privado.contenido_para_moderacion('tema',t."temaId") dato FROM public."temaForo" t WHERE t."estadoModeracion"='pendiente'
   UNION ALL SELECT c.id,c."creadoEn",privado.contenido_para_moderacion('comentario',c.id)
   FROM public."comentarioForo" c JOIN public."temaForo" t ON t."temaId"=c."temaId" WHERE c."estadoModeracion"='pendiente' AND t."estadoModeracion"='publicado'
   ORDER BY fecha,id LIMIT 20 OFFSET coalesce((datos->>'desplazamiento')::int,0)) f;
  RETURN jsonb_build_object('total',total,'contenidos',filas);
 END IF;
 IF datos-ARRAY['tipo','id','temaId','texto','titulo','version','medida','motivo']<>'{}'::jsonb THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
 tipo:=datos->>'tipo'; objetivo:=(datos->>'id')::uuid;
 IF tipo IS NULL OR tipo NOT IN ('tema','comentario') OR objetivo IS NULL THEN RAISE EXCEPTION 'Contenido inválido' USING ERRCODE='22023'; END IF;
 texto:=btrim(coalesce(datos->>'texto','')); titulo:=btrim(coalesce(datos->>'titulo',''));
 IF operacion='crear' THEN
  IF (tipo='comentario' AND length(texto) NOT BETWEEN 1 AND 1000) OR (tipo='tema' AND (length(texto) NOT BETWEEN 1 AND 2000 OR length(titulo) NOT BETWEEN 1 AND 150)) THEN
   RAISE EXCEPTION 'Texto inválido' USING ERRCODE='23514'; END IF;
  IF tipo='comentario' THEN
   tema:=(datos->>'temaId')::uuid;
   PERFORM 1 FROM public."temaForo" WHERE "temaId"=tema AND "estadoModeracion"='publicado' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Tema no disponible' USING ERRCODE='P0002'; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,74));
  previo:=privado.contenido_para_moderacion(tipo,objetivo);
  IF previo IS NOT NULL THEN
   IF tipo='comentario' THEN SELECT "creadoPor" INTO autor FROM public."comentarioForo" WHERE id=objetivo;
   ELSE SELECT "creadoPor" INTO autor FROM public."temaForo" WHERE "temaId"=objetivo; END IF;
   IF autor=actor AND previo->>'texto'=texto AND (tipo='tema' OR previo->>'temaId'=tema::text) AND (tipo='comentario' OR previo->>'titulo'=titulo) THEN RETURN previo; END IF;
   RAISE EXCEPTION 'Identificador ya utilizado' USING ERRCODE='23505';
  END IF;
  estado:='pendiente';
  IF tipo='comentario' AND EXISTS(SELECT 1 FROM privado."historialRevisionForo" h JOIN public."comentarioForo" c ON c.id=h."comentarioId"
    WHERE c."creadoPor"=actor AND h.accion='publicar') THEN estado:='publicado'; END IF;
  IF tipo='comentario' THEN INSERT INTO public."comentarioForo"(id,"temaId","cuerpoComentario","creadoPor","estadoModeracion") VALUES(objetivo,tema,texto,actor,estado);
  ELSE INSERT INTO public."temaForo"("temaId",titulo,descripcion,"creadoPor","estadoModeracion") VALUES(objetivo,titulo,texto,actor,estado); END IF;
  accion:='crear'; nota:='Participación registrada; estado determinado por el servidor.';
 ELSE
  IF tipo='comentario' THEN SELECT "creadoPor" INTO autor FROM public."comentarioForo" WHERE id=objetivo FOR UPDATE;
  ELSE SELECT "creadoPor" INTO autor FROM public."temaForo" WHERE "temaId"=objetivo FOR UPDATE; END IF;
  previo:=privado.contenido_para_moderacion(tipo,objetivo);
  IF previo IS NULL THEN RAISE EXCEPTION 'Contenido inexistente' USING ERRCODE='P0002'; END IF;
  IF operacion<>'revisar' AND autor<>actor THEN RAISE EXCEPTION 'Contenido ajeno' USING ERRCODE='42501'; END IF;
  IF previo->>'version' IS DISTINCT FROM datos->>'version' THEN RAISE EXCEPTION 'Contenido desactualizado' USING ERRCODE='40001'; END IF;
  IF operacion='revisar' THEN
   nota:=btrim(coalesce(datos->>'motivo','')); accion:=datos->>'medida';
   IF previo->>'estado'<>'pendiente' THEN RAISE EXCEPTION 'Contenido ya revisado' USING ERRCODE='55000'; END IF;
   IF length(nota) NOT BETWEEN 1 AND 2000 OR accion IS NULL OR accion NOT IN ('publicar','rechazar') THEN RAISE EXCEPTION 'Medida o motivo inválido' USING ERRCODE='23514'; END IF;
   IF tipo='comentario' AND NOT EXISTS(SELECT 1 FROM public."temaForo" WHERE "temaId"=(previo->>'temaId')::uuid AND "estadoModeracion"='publicado') THEN
    RAISE EXCEPTION 'Tema no publicado' USING ERRCODE='55000'; END IF;
   estado:=CASE accion WHEN 'publicar' THEN 'publicado' ELSE 'retirado' END;
  ELSE
   IF previo->>'estado' NOT IN ('pendiente','publicado') THEN RAISE EXCEPTION 'Contenido moderado o retirado' USING ERRCODE='55000'; END IF;
   IF operacion='editar' THEN
    IF (tipo='comentario' AND length(texto) NOT BETWEEN 1 AND 1000) OR (tipo='tema' AND (length(texto) NOT BETWEEN 1 AND 2000 OR length(titulo) NOT BETWEEN 1 AND 150)) THEN
     RAISE EXCEPTION 'Texto inválido' USING ERRCODE='23514'; END IF;
    estado:='pendiente'; accion:='editar'; nota:='Edición propia enviada de nuevo a revisión.';
   ELSE estado:='retirado'; accion:='retirar_propio'; nota:='Retiro solicitado por el autor.'; END IF;
  END IF;
  IF tipo='comentario' THEN UPDATE public."comentarioForo" SET "estadoModeracion"=estado,
    "cuerpoComentario"=CASE WHEN accion='editar' THEN texto ELSE "cuerpoComentario" END,
    "moderadoPor"=CASE WHEN operacion='revisar' OR operacion='retirar' THEN actor ELSE NULL END WHERE id=objetivo;
  ELSE UPDATE public."temaForo" SET "estadoModeracion"=estado,
    titulo=CASE WHEN accion='editar' THEN titulo ELSE public."temaForo".titulo END,
    descripcion=CASE WHEN accion='editar' THEN texto ELSE descripcion END,
    "moderadoPor"=CASE WHEN operacion='revisar' OR operacion='retirar' THEN actor ELSE NULL END WHERE "temaId"=objetivo; END IF;
 END IF;
 INSERT INTO privado."historialRevisionForo"("temaId","comentarioId",accion,motivo,"realizadoPor")
  VALUES(CASE WHEN tipo='tema' THEN objetivo END,CASE WHEN tipo='comentario' THEN objetivo END,accion,nota,actor);
 RETURN privado.contenido_para_moderacion(tipo,objetivo);
END; $$;
REVOKE ALL ON FUNCTION privado.foro_participacion(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.foro_participacion(text,jsonb) TO authenticated;
CREATE FUNCTION public.foro_participacion(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT privado.foro_participacion(operacion,datos); $$;
REVOKE ALL ON FUNCTION public.foro_participacion(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.foro_participacion(text,jsonb) TO authenticated;
COMMIT;
