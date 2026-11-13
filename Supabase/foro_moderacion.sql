-- T-078 / HU-27. Reutiliza las tablas del foro; no publica contenido de T-077.
BEGIN;
CREATE TABLE privado."historialModeracion" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 "reporteId" uuid NOT NULL REFERENCES public."reporteModeracion"("reporteId"),
 medida text NOT NULL CHECK (medida IN ('revisar','ocultar','retirar','descartar')),
 "estadoAnterior" text NOT NULL, "estadoNuevo" text NOT NULL,
 motivo text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 1 AND 2000),
 "realizadoPor" uuid NOT NULL REFERENCES public.perfil(id),
 fecha timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX historial_moderacion_reporte ON privado."historialModeracion"("reporteId",fecha);
CREATE INDEX historial_moderacion_responsable ON privado."historialModeracion"("realizadoPor");
ALTER TABLE privado."historialModeracion" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."historialModeracion" FROM PUBLIC,anon,authenticated;

CREATE FUNCTION privado.contenido_para_moderacion(tipo text,identificador uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE r jsonb;
BEGIN
 IF tipo='tema' THEN
  SELECT jsonb_build_object('tipo','tema','id',t."temaId",'titulo',t.titulo,'texto',t.descripcion,
   'estado',t."estadoModeracion",'version',md5(to_jsonb(t)::text)) INTO r FROM public."temaForo" t WHERE t."temaId"=identificador;
 ELSIF tipo='comentario' THEN
  SELECT jsonb_build_object('tipo','comentario','id',c.id,'temaId',c."temaId",'texto',c."cuerpoComentario",
   'estado',c."estadoModeracion",'version',md5(to_jsonb(c)::text)) INTO r FROM public."comentarioForo" c WHERE c.id=identificador;
 END IF;
 RETURN r;
END; $$;
REVOKE ALL ON FUNCTION privado.contenido_para_moderacion(text,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION privado.reporte_para_moderacion(identificador uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('reporteId',r."reporteId",'motivo',r.motivo,'estadoReporte',r."estadoReporte",
  'creadoEn',r."creadoEn",'actualizadoEn',r."actualizadoEn",'resolucion',r.resolucion,'atendidoPor',r."atendidoPor",
  'contenido',privado.contenido_para_moderacion(CASE WHEN r."temaId" IS NOT NULL THEN 'tema' ELSE 'comentario' END,coalesce(r."temaId",r."comentarioId")),
  'historial',coalesce((SELECT jsonb_agg(to_jsonb(h)-'id'-'reporteId' ORDER BY h.fecha,h.id)
   FROM privado."historialModeracion" h WHERE h."reporteId"=identificador),'[]'::jsonb))
 FROM public."reporteModeracion" r WHERE r."reporteId"=identificador;
$$;
REVOKE ALL ON FUNCTION privado.reporte_para_moderacion(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION privado.foro_moderacion(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid; identificador uuid; objetivo uuid; tipo text; motivo text; contenido jsonb;
 reporte public."reporteModeracion"%ROWTYPE; estado_anterior text; estado_nuevo text; medida text;
 cantidad bigint; filas jsonb; permitido boolean; permiso jsonb;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF jsonb_typeof(datos) IS DISTINCT FROM 'object' OR operacion IS NULL OR operacion NOT IN ('reportar','propios','listar','obtener','resolver') THEN
  RAISE EXCEPTION 'Operación inválida' USING ERRCODE='22023'; END IF;
 IF operacion NOT IN ('reportar','propios') THEN
  -- No se presume ámbito global a partir de una asignación limitada a una actividad.
  permitido:=EXISTS (SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) p
   WHERE p->>'capacidad'='moderar_foro' AND p->>'ambito'='global');
  IF NOT permitido THEN RAISE EXCEPTION 'Moderación fuera del ámbito' USING ERRCODE='42501'; END IF;
 END IF;
 IF operacion='reportar' THEN
  IF datos-ARRAY['tipoContenido','contenidoId','motivo']<>'{}'::jsonb THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
  tipo:=datos->>'tipoContenido'; objetivo:=(datos->>'contenidoId')::uuid; motivo:=btrim(coalesce(datos->>'motivo',''));
  IF tipo IS NULL OR tipo NOT IN ('tema','comentario') OR objetivo IS NULL OR length(motivo) NOT BETWEEN 1 AND 2000 THEN
   RAISE EXCEPTION 'Reporte inválido' USING ERRCODE='23514'; END IF;
  -- Orden uniforme: contenido primero, reporte después, también al resolver.
  IF tipo='tema' THEN PERFORM 1 FROM public."temaForo" WHERE "temaId"=objetivo FOR UPDATE;
  ELSE PERFORM 1 FROM public."comentarioForo" WHERE id=objetivo FOR UPDATE; END IF;
  contenido:=privado.contenido_para_moderacion(tipo,objetivo);
  IF contenido IS NULL OR contenido->>'estado'<>'publicado' OR (tipo='comentario' AND NOT EXISTS (
   SELECT 1 FROM public."temaForo" WHERE "temaId"=(contenido->>'temaId')::uuid AND "estadoModeracion"='publicado')) THEN
   RAISE EXCEPTION 'Contenido no disponible' USING ERRCODE='P0002'; END IF;
  IF EXISTS(SELECT 1 FROM public."reporteModeracion" r WHERE r."reportadoPor"=actor AND r."estadoReporte" IN ('pendiente','en_revision')
   AND ((tipo='tema' AND r."temaId"=objetivo) OR (tipo='comentario' AND r."comentarioId"=objetivo))) THEN
   RAISE EXCEPTION 'Reporte abierto duplicado' USING ERRCODE='23505'; END IF;
  INSERT INTO public."reporteModeracion"("temaId","comentarioId",motivo,"reportadoPor")
   VALUES(CASE WHEN tipo='tema' THEN objetivo END,CASE WHEN tipo='comentario' THEN objetivo END,motivo,actor) RETURNING * INTO reporte;
  RETURN jsonb_build_object('reporteId',reporte."reporteId",'estadoReporte',reporte."estadoReporte",'creadoEn',reporte."creadoEn");
 END IF;
 IF operacion IN ('listar','propios') THEN
  IF datos-ARRAY['desplazamiento','estado']<>'{}'::jsonb OR coalesce((datos->>'desplazamiento')::int,0) NOT BETWEEN 0 AND 100000
   OR (datos->>'estado' IS NOT NULL AND datos->>'estado' NOT IN ('pendiente','en_revision','resuelto','descartado')) THEN
   RAISE EXCEPTION 'Filtro inválido' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO cantidad FROM public."reporteModeracion" r WHERE (operacion='listar' OR r."reportadoPor"=actor)
   AND (datos->>'estado' IS NULL OR r."estadoReporte"=datos->>'estado');
  SELECT coalesce(jsonb_agg(t.r ORDER BY t.fecha DESC,t.id),'[]'::jsonb) INTO filas FROM (
   SELECT r."reporteId" id,r."creadoEn" fecha,CASE WHEN operacion='listar' THEN privado.reporte_para_moderacion(r."reporteId")
    ELSE jsonb_build_object('reporteId',r."reporteId",'estadoReporte',r."estadoReporte",'motivo',r.motivo,'creadoEn',r."creadoEn") END AS r
   FROM public."reporteModeracion" r WHERE (operacion='listar' OR r."reportadoPor"=actor)
    AND (datos->>'estado' IS NULL OR r."estadoReporte"=datos->>'estado') ORDER BY r."creadoEn" DESC,r."reporteId"
   LIMIT 20 OFFSET coalesce((datos->>'desplazamiento')::int,0)) t;
  RETURN jsonb_build_object('total',cantidad,'reportes',filas);
 END IF;
 identificador:=(datos->>'id')::uuid;
 SELECT * INTO reporte FROM public."reporteModeracion" WHERE "reporteId"=identificador;
 IF reporte."reporteId" IS NULL THEN RAISE EXCEPTION 'Reporte inexistente' USING ERRCODE='P0002'; END IF;
 IF operacion='obtener' THEN
  IF datos-ARRAY['id']<>'{}'::jsonb THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
  RETURN privado.reporte_para_moderacion(identificador);
 END IF;
 IF datos-ARRAY['id','actualizadoEn','versionContenido','medida','motivo']<>'{}'::jsonb THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
 tipo:=CASE WHEN reporte."temaId" IS NOT NULL THEN 'tema' ELSE 'comentario' END; objetivo:=coalesce(reporte."temaId",reporte."comentarioId");
 IF tipo='tema' THEN PERFORM 1 FROM public."temaForo" WHERE "temaId"=objetivo FOR UPDATE;
 ELSE PERFORM 1 FROM public."comentarioForo" WHERE id=objetivo FOR UPDATE; END IF;
 SELECT * INTO reporte FROM public."reporteModeracion" WHERE "reporteId"=identificador FOR UPDATE;
 contenido:=privado.contenido_para_moderacion(tipo,objetivo);
 IF reporte."actualizadoEn" IS DISTINCT FROM (datos->>'actualizadoEn')::timestamptz OR contenido->>'version' IS DISTINCT FROM datos->>'versionContenido' THEN
  RAISE EXCEPTION 'Reporte o contenido desactualizado' USING ERRCODE='40001'; END IF;
 IF reporte."estadoReporte" NOT IN ('pendiente','en_revision') THEN RAISE EXCEPTION 'Reporte cerrado' USING ERRCODE='55000'; END IF;
 medida:=datos->>'medida'; motivo:=btrim(coalesce(datos->>'motivo',''));
 IF length(motivo) NOT BETWEEN 1 AND 2000 OR medida IS NULL OR medida NOT IN ('revisar','ocultar','retirar','descartar') THEN
  RAISE EXCEPTION 'Medida inválida' USING ERRCODE='23514'; END IF;
 estado_anterior:=contenido->>'estado'; estado_nuevo:=CASE medida WHEN 'ocultar' THEN 'oculto' WHEN 'retirar' THEN 'retirado' ELSE estado_anterior END;
 IF (medida='ocultar' AND estado_anterior NOT IN ('publicado','oculto'))
  OR (medida='retirar' AND estado_anterior NOT IN ('publicado','oculto','retirado'))
  OR (medida='revisar' AND reporte."estadoReporte"='en_revision') THEN RAISE EXCEPTION 'Medida no permitida' USING ERRCODE='55000'; END IF;
 IF estado_nuevo<>estado_anterior THEN
  IF tipo='tema' THEN UPDATE public."temaForo" SET "estadoModeracion"=estado_nuevo,"moderadoPor"=actor WHERE "temaId"=objetivo;
  ELSE UPDATE public."comentarioForo" SET "estadoModeracion"=estado_nuevo,"moderadoPor"=actor WHERE id=objetivo; END IF;
 END IF;
 UPDATE public."reporteModeracion" SET "estadoReporte"=CASE medida WHEN 'revisar' THEN 'en_revision' WHEN 'descartar' THEN 'descartado' ELSE 'resuelto' END,
  "atendidoPor"=actor,resolucion=motivo,"actualizadoEn"=clock_timestamp() WHERE "reporteId"=identificador;
 INSERT INTO privado."historialModeracion"("reporteId",medida,"estadoAnterior","estadoNuevo",motivo,"realizadoPor")
  VALUES(identificador,medida,estado_anterior,estado_nuevo,motivo,actor);
 RETURN privado.reporte_para_moderacion(identificador);
END; $$;
REVOKE ALL ON FUNCTION privado.foro_moderacion(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.foro_moderacion(text,jsonb) TO authenticated;
CREATE FUNCTION public.foro_moderacion(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT privado.foro_moderacion(operacion,datos); $$;
REVOKE ALL ON FUNCTION public.foro_moderacion(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.foro_moderacion(text,jsonb) TO authenticated;
COMMIT;
