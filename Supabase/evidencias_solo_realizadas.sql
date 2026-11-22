-- HU-21: solo se suben evidencias de actividades que ya se realizaron (22 nov 2026).
-- Antes se aceptaban sesiones que empezaban en las próximas 24 horas y las canceladas.
-- Ahora la sesión debe estar 'finalizada' o haber terminado (fin ya pasó), y nunca 'cancelada'.
-- Aplica a la lista de actividades del formulario (operación 'sesiones') y al subir (preparar/registrar).
-- Las evidencias que ya existen no cambian. Ejecutar después de evidencias_actividades.sql; recrea la función completa.
BEGIN;
CREATE OR REPLACE FUNCTION privado.evidencias_actividad(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid; permisos jsonb; es_global boolean; e public."evidenciaActividad"%ROWTYPE; s public."sesionActividad"%ROWTYPE;
 alcance text; visible boolean; d jsonb:=coalesce(datos,'{}'::jsonb); ruta text; tipo_archivo text; nombre text;
 tamano integer; nivel text; tipo text; nota text; motivo text; resultado jsonb;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 permisos:=privado.permisos_de_cuenta(actor,true);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(permisos) p WHERE p->>'capacidad'='gestionar_evidencias') THEN
  RAISE EXCEPTION 'Sin permiso para gestionar evidencias.' USING ERRCODE='42501'; END IF;
 es_global:=EXISTS(SELECT 1 FROM jsonb_array_elements(permisos) p WHERE p->>'capacidad'='gestionar_evidencias' AND p->>'ambito'='global');
 IF operacion IS NULL OR operacion NOT IN ('sesiones','listar','obtener','preparar','registrar','descargar','acceso','retirar','solicitar_acceso') THEN
  RAISE EXCEPTION 'Operación inválida.' USING ERRCODE='22023'; END IF;

 -- Sesiones a las que se les puede subir evidencia: solo las que ya se realizaron (terminaron y no se cancelaron).
 IF operacion='sesiones' THEN
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('sesionId',x.id,'actividad',x.folio,'titulo',x.titulo,
   'inicio',x.inicio,'estado',x.estado) ORDER BY x.inicio DESC) FROM (
   SELECT s2.id,a.folio,a.titulo,s2.inicio,s2.estado FROM public."sesionActividad" s2 JOIN public.actividad a ON a.id=s2."actividadId"
   WHERE s2.estado<>'cancelada' AND (s2.estado='finalizada' OR s2.fin<=statement_timestamp())
    AND (es_global OR privado.alcance_evidencias(actor,a.id) IS NOT NULL)
   ORDER BY s2.inicio DESC LIMIT 200) x),'[]'::jsonb);
 END IF;

 IF operacion='listar' THEN
  RETURN coalesce((SELECT jsonb_agg(x.fila ORDER BY x.folio DESC) FROM (
   SELECT ev.folio, jsonb_build_object('folio',ev.folio,'actividad',a.folio,'titulo',a.titulo,'sesionInicio',s2.inicio,
    'tipo',ev."tipoEvidencia",'acceso',ev."nivelAcceso",'subio',privado.nombre_persona(ev."subidaPor"),'subidaEn',ev."creadaEn",
    'retirada',ev."retiradaEn" IS NOT NULL,
    'puedeVer',(es_global OR ev."nivelAcceso"='personal')) AS fila
   FROM public."evidenciaActividad" ev JOIN public."sesionActividad" s2 ON s2.id=ev."sesionId" JOIN public.actividad a ON a.id=s2."actividadId"
   WHERE (es_global OR privado.alcance_evidencias(actor,a.id) IS NOT NULL)
    AND (ev."retiradaEn" IS NULL OR coalesce((d->>'incluirRetiradas')::boolean,false))
   ORDER BY ev.folio DESC LIMIT 500) x),'[]'::jsonb);
 END IF;

 IF operacion IN ('preparar','registrar') THEN
  BEGIN
   SELECT * INTO s FROM public."sesionActividad" WHERE id=(d->>'sesionId')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Elige la actividad.' USING ERRCODE='23514'; END;
  IF NOT FOUND THEN RAISE EXCEPTION 'Elige la actividad.' USING ERRCODE='23514'; END IF;
  IF privado.alcance_evidencias(actor,s."actividadId") IS NULL THEN
   RAISE EXCEPTION 'Sin permiso sobre esta actividad.' USING ERRCODE='42501'; END IF;
  IF s.estado='cancelada' THEN
   RAISE EXCEPTION 'No se suben evidencias de actividades canceladas.' USING ERRCODE='23514'; END IF;
  IF NOT (s.estado='finalizada' OR s.fin<=statement_timestamp()) THEN
   RAISE EXCEPTION 'La actividad aún no se realiza.' USING ERRCODE='23514'; END IF;
  tipo:=d->>'tipo'; nivel:=coalesce(d->>'acceso','personal'); tipo_archivo:=d->>'tipoArchivo';
  nombre:=btrim(d->>'nombreArchivo'); nota:=coalesce(btrim(d->>'nota'),'');
  tamano:=CASE WHEN jsonb_typeof(d->'tamanoBytes')='number' THEN (d->>'tamanoBytes')::integer END;
  IF tipo IS NULL OR tipo NOT IN ('fotografia','lista_firmada','informe') THEN RAISE EXCEPTION 'Elige el tipo de evidencia.' USING ERRCODE='23514'; END IF;
  IF nivel NOT IN ('personal','coordinacion') THEN RAISE EXCEPTION 'Elige quién puede verla.' USING ERRCODE='23514'; END IF;
  IF tipo_archivo IS NULL OR tipo_archivo NOT IN ('application/pdf','image/jpeg','image/png') THEN
   RAISE EXCEPTION 'Solo se aceptan archivos PDF, JPG o PNG.' USING ERRCODE='23514'; END IF;
  IF tamano IS NULL OR tamano NOT BETWEEN 1 AND 10485760 THEN RAISE EXCEPTION 'El archivo pesa más de 10 MB.' USING ERRCODE='23514'; END IF;
  IF nombre IS NULL OR length(nombre) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Revisa el nombre del archivo.' USING ERRCODE='23514'; END IF;
  IF length(nota)>500 THEN RAISE EXCEPTION 'La nota admite hasta 500 caracteres.' USING ERRCODE='23514'; END IF;
  IF operacion='preparar' THEN
   RETURN jsonb_build_object('carpeta',coalesce((SELECT a.folio FROM public.actividad a WHERE a.id=s."actividadId" AND a.folio ~ '^AC-[0-9]+$'),'AC-0')||'/'||s.id::text);
  END IF;
  ruta:=d->>'ruta';
  IF ruta IS NULL OR ruta !~ ('^AC-[0-9]+/'||s.id::text||'/[0-9a-f-]{36}\.(pdf|jpg|png)$')
   OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='evidencias-actividades' AND o.name=ruta AND o.metadata->>'mimetype'=tipo_archivo)
   OR EXISTS(SELECT 1 FROM public."evidenciaActividad" x WHERE x."rutaArchivo"=ruta) THEN
   RAISE EXCEPTION 'Archivo inválido o no almacenado.' USING ERRCODE='22023'; END IF;
  INSERT INTO public."evidenciaActividad"("sesionId","rutaArchivo","tipoArchivo",descripcion,visibilidad,"subidaPor",
   "tipoEvidencia","nombreArchivo","tamanoBytes","nivelAcceso")
  VALUES(s.id,ruta,tipo_archivo,nota,'privada',actor,tipo,nombre,tamano,nivel) RETURNING * INTO e;
  INSERT INTO public."historialEvidencia"("evidenciaId","realizadoPor",accion,detalle)
   VALUES(e.id,actor,'subio',jsonb_build_object('acceso',nivel));
  d:=jsonb_build_object('folio',e.folio); operacion:='obtener_sin_registro';
 END IF;

 -- Operaciones sobre una evidencia existente.
 SELECT * INTO e FROM public."evidenciaActividad" WHERE folio=d->>'folio' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evidencia no encontrada.' USING ERRCODE='P0002'; END IF;
 SELECT * INTO s FROM public."sesionActividad" WHERE id=e."sesionId";
 alcance:=privado.alcance_evidencias(actor,s."actividadId");
 IF alcance IS NULL THEN RAISE EXCEPTION 'Evidencia no encontrada.' USING ERRCODE='P0002'; END IF;
 visible:=(alcance='global' OR e."nivelAcceso"='personal');

 IF operacion='solicitar_acceso' THEN
  IF visible THEN RAISE EXCEPTION 'Ya puedes abrir esta evidencia.' USING ERRCODE='55000'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public."historialEvidencia" h WHERE h."evidenciaId"=e.id AND h."realizadoPor"=actor AND h.accion='solicito_acceso') THEN
   INSERT INTO public."historialEvidencia"("evidenciaId","realizadoPor",accion) VALUES(e.id,actor,'solicito_acceso');
  END IF;
 ELSIF operacion IN ('descargar','acceso','retirar') THEN
  IF NOT visible THEN RAISE EXCEPTION 'Sin permiso para abrir esta evidencia.' USING ERRCODE='42501'; END IF;
  IF e."retiradaEn" IS NOT NULL THEN RAISE EXCEPTION 'La evidencia ya fue retirada.' USING ERRCODE='55000'; END IF;
  IF operacion='descargar' THEN
   INSERT INTO public."historialEvidencia"("evidenciaId","realizadoPor",accion) VALUES(e.id,actor,'descargo');
   RETURN jsonb_build_object('ruta',e."rutaArchivo",'tipoArchivo',e."tipoArchivo",'nombreArchivo',e."nombreArchivo");
  ELSIF operacion='acceso' THEN
   nivel:=d->>'acceso';
   IF nivel IS NULL OR nivel NOT IN ('personal','coordinacion') THEN RAISE EXCEPTION 'Elige quién puede verla.' USING ERRCODE='23514'; END IF;
   IF nivel<>e."nivelAcceso" THEN
    UPDATE public."evidenciaActividad" SET "nivelAcceso"=nivel WHERE id=e.id RETURNING * INTO e;
    INSERT INTO public."historialEvidencia"("evidenciaId","realizadoPor",accion,detalle)
     VALUES(e.id,actor,'cambio_acceso',jsonb_build_object('acceso',nivel));
   END IF;
   visible:=(alcance='global' OR e."nivelAcceso"='personal');
  ELSE
   motivo:=btrim(d->>'motivo');
   IF motivo IS NULL OR length(motivo) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'Escribe el motivo (hasta 300 caracteres).' USING ERRCODE='23514'; END IF;
   UPDATE public."evidenciaActividad" SET "retiradaEn"=statement_timestamp(),"retiradaPor"=actor,"motivoRetiro"=motivo,visibilidad='privada'
    WHERE id=e.id RETURNING * INTO e;
   INSERT INTO public."historialEvidencia"("evidenciaId","realizadoPor",accion,detalle)
    VALUES(e.id,actor,'retiro',jsonb_build_object('motivo',motivo));
  END IF;
 ELSIF operacion='obtener' AND visible THEN
  -- Cada consulta queda registrada; se omite una repetición de la misma persona en 5 minutos.
  IF NOT EXISTS(SELECT 1 FROM public."historialEvidencia" h WHERE h."evidenciaId"=e.id AND h."realizadoPor"=actor
   AND h.accion='consulto' AND h."creadoEn">statement_timestamp()-interval '5 minutes') THEN
   INSERT INTO public."historialEvidencia"("evidenciaId","realizadoPor",accion) VALUES(e.id,actor,'consulto');
  END IF;
 END IF;

 resultado:=jsonb_build_object('folio',e.folio,'actividad',(SELECT a.folio FROM public.actividad a WHERE a.id=s."actividadId"),
  'titulo',(SELECT a.titulo FROM public.actividad a WHERE a.id=s."actividadId"),'sesionInicio',s.inicio,
  'tipo',e."tipoEvidencia",'acceso',e."nivelAcceso",'subio',privado.nombre_persona(e."subidaPor"),'subidaEn',e."creadaEn",
  'retirada',e."retiradaEn" IS NOT NULL,'puedeVer',visible,
  'solicitada',EXISTS(SELECT 1 FROM public."historialEvidencia" h WHERE h."evidenciaId"=e.id AND h."realizadoPor"=actor AND h.accion='solicito_acceso'));
 IF visible THEN
  resultado:=resultado||jsonb_build_object('nombreArchivo',e."nombreArchivo",'tamanoBytes',e."tamanoBytes",'tipoArchivo',e."tipoArchivo",
   'nota',nullif(e.descripcion,''),
   'retiro',CASE WHEN e."retiradaEn" IS NOT NULL THEN jsonb_build_object('fecha',e."retiradaEn",'motivo',e."motivoRetiro",
    'por',privado.nombre_persona(e."retiradaPor")) END,
   'historial',coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',h."creadoEn",'persona',privado.nombre_persona(h."realizadoPor"),
    'accion',h.accion,'detalle',h.detalle) ORDER BY h."creadoEn",h.id) FROM public."historialEvidencia" h WHERE h."evidenciaId"=e.id),'[]'::jsonb));
 END IF;
 RETURN resultado;
END;
$$;

-- CREATE OR REPLACE conserva los permisos de la función (solo authenticated la ejecuta).
COMMIT;
