-- Une T-075 con la agenda de T-055. No publica registros existentes automáticamente.
BEGIN;
-- Corrige expresiones de fecha y hora que rechazaban valores válidos.
CREATE OR REPLACE FUNCTION privado.gestionar_agenda(operacion text,datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid; a public.actividad%ROWTYPE; s public."sesionActividad"%ROWTYPE; e public.espacio%ROWTYPE;
 d jsonb; permiso boolean; referencia text; motivo text; estado_nuevo text; ini timestamptz; fin_hora timestamptz;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF operacion IS NULL OR operacion NOT IN ('listar','obtener','espacios','crear','guardar','enviar','aprobar','publicar','retirar','archivar','rechazar')
 OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Petición inválida' USING ERRCODE='22023'; END IF;
 IF operacion IN ('enviar','aprobar','publicar','retirar','archivar','rechazar') AND
 EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('folio','actualizado','referencia','motivo'))
 THEN RAISE EXCEPTION 'Campos no permitidos' USING ERRCODE='22023'; END IF;
 IF operacion='espacios' THEN
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('nombre',nombre,'capacidad',capacidad) ORDER BY nombre),'[]'::jsonb) FROM public.espacio WHERE activo);
 END IF;
 IF operacion='listar' THEN
  RETURN (SELECT coalesce(jsonb_agg(privado.actividad_agenda(x) ORDER BY x."creadoEn" DESC,x.id),'[]'::jsonb)
  FROM public.actividad x WHERE x."creadoPor"=actor OR privado.permiso_agenda(actor,'gestionar_actividades',x.id)
  OR (x."estadoPublicacion"<>'borrador' AND (privado.permiso_agenda(actor,'registrar_resoluciones_actividades',x.id) OR privado.permiso_agenda(actor,'publicar_contenidos',x.id))));
 END IF;
 IF operacion<>'crear' THEN
  SELECT * INTO a FROM public.actividad WHERE folio=datos->>'folio' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Actividad no encontrada' USING ERRCODE='P0002'; END IF;
  permiso:=a."creadoPor"=actor OR privado.permiso_agenda(actor,'gestionar_actividades',a.id);
  IF NOT permiso AND NOT (a."estadoPublicacion"<>'borrador' AND
   (privado.permiso_agenda(actor,'registrar_resoluciones_actividades',a.id) OR privado.permiso_agenda(actor,'publicar_contenidos',a.id)))
  THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
  IF operacion='obtener' THEN RETURN privado.actividad_agenda(a); END IF;
  IF (datos->>'actualizado')::timestamptz IS DISTINCT FROM a."actualizadoEn" THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
 END IF;
 IF operacion IN ('crear','guardar') THEN
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('folio','actualizado','nombre','tipo','descripcion','fecha','inicio','fin','espacio','cupo','inscripcion','publico','responsable','materiales','estado'))
  THEN RAISE EXCEPTION 'Campos no permitidos' USING ERRCODE='22023'; END IF;
  IF operacion='guardar' AND NOT permiso THEN RAISE EXCEPTION 'Sin permiso de edición' USING ERRCODE='42501'; END IF;
  IF operacion='guardar' AND a."estadoPublicacion"<>'borrador' THEN RAISE EXCEPTION 'Solo se editan borradores' USING ERRCODE='55000'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(datos) campo WHERE campo.key IN ('nombre','tipo','descripcion','fecha','inicio','fin','espacio','cupo','publico','responsable','materiales','estado')
   AND jsonb_typeof(campo.value)<>'string')
  THEN RAISE EXCEPTION 'Tipos de campos inválidos' USING ERRCODE='22023'; END IF;
  IF length(btrim(coalesce(datos->>'nombre',''))) NOT BETWEEN 1 AND 150 OR length(coalesce(datos->>'tipo','')) NOT BETWEEN 1 AND 80
  OR length(coalesce(datos->>'descripcion',''))>1000 OR length(coalesce(datos->>'materiales',''))>1000
  OR length(coalesce(datos->>'responsable',''))>150 OR length(coalesce(datos->>'publico',''))>150
  OR jsonb_typeof(datos->'inscripcion') IS DISTINCT FROM 'boolean'
  THEN RAISE EXCEPTION 'Datos inválidos' USING ERRCODE='23514'; END IF;
  IF operacion='crear' THEN
   IF datos->>'estado' NOT IN ('borrador','en-revision') OR datos->>'estado' IS NULL THEN RAISE EXCEPTION 'Estado inicial inválido' USING ERRCODE='22023'; END IF;
   INSERT INTO public.actividad(slug,titulo,descripcion,categoria,audiencia,requerimientos,"creadoPor")
    VALUES('actividad-'||gen_random_uuid()::text,btrim(datos->>'nombre'),coalesce(datos->>'descripcion',''),datos->>'tipo',coalesce(datos->>'publico',''),coalesce(datos->>'materiales',''),actor) RETURNING * INTO a;
  END IF;
  IF (SELECT count(*) FROM public."sesionActividad" WHERE "actividadId"=a.id)>1 THEN
   RAISE EXCEPTION 'La programación de varias sesiones se conserva; usa la gestión específica de sesiones.' USING ERRCODE='55000'; END IF;
  d:=jsonb_build_object('fecha',coalesce(datos->>'fecha',''),'inicio',coalesce(datos->>'inicio',''),'fin',coalesce(datos->>'fin',''),'espacio',coalesce(datos->>'espacio',''),'cupo',coalesce(datos->>'cupo',''));
  UPDATE public.actividad SET titulo=btrim(datos->>'nombre'),descripcion=coalesce(datos->>'descripcion',''),categoria=datos->>'tipo',
   audiencia=coalesce(datos->>'publico',''),requerimientos=coalesce(datos->>'materiales',''),responsable=coalesce(datos->>'responsable',''),
   "requiereInscripcion"=(datos->>'inscripcion')::boolean,"actualizadoEn"=clock_timestamp()
   WHERE id=a.id RETURNING * INTO a;
  INSERT INTO privado."estadoAgenda"("actividadId","datosBorrador") VALUES(a.id,d)
   ON CONFLICT ("actividadId") DO UPDATE SET "datosBorrador"=excluded."datosBorrador";
  IF operacion='guardar' OR datos->>'estado'='borrador' THEN
   INSERT INTO privado."historialActividad"("actividadId",accion,"realizadoPor") VALUES(a.id,operacion,actor);
   RETURN privado.actividad_agenda(a);
  END IF;
  operacion:='enviar';
 END IF;
 motivo:=btrim(coalesce(datos->>'motivo','')); referencia:=btrim(coalesce(datos->>'referencia',''));
 IF length(motivo)>1000 OR length(referencia)>200 THEN RAISE EXCEPTION 'Texto demasiado largo' USING ERRCODE='22023'; END IF;
 IF operacion='enviar' THEN
  IF a."creadoPor"<>actor AND NOT privado.permiso_agenda(actor,'gestionar_actividades',a.id) THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
  IF a."estadoPublicacion"<>'borrador' THEN RAISE EXCEPTION 'Solo se envían borradores' USING ERRCODE='55000'; END IF;
  SELECT "datosBorrador" INTO d FROM privado."estadoAgenda" WHERE "actividadId"=a.id;
  IF length(btrim(a.descripcion))=0 OR length(btrim(a.responsable))=0 OR coalesce(d->>'cupo','') !~ '^[0-9]{1,6}$'
  OR (d->>'cupo')::integer<1 OR coalesce(d->>'fecha','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  OR coalesce(d->>'inicio','') !~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$' OR coalesce(d->>'fin','') !~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$'
  THEN RAISE EXCEPTION 'Faltan datos de programación' USING ERRCODE='23514'; END IF;
  SELECT * INTO e FROM public.espacio WHERE nombre=d->>'espacio' AND activo FOR UPDATE;
  IF NOT FOUND OR (d->>'cupo')::integer>e.capacidad THEN RAISE EXCEPTION 'Espacio o cupo inválido' USING ERRCODE='23514'; END IF;
  ini:=((d->>'fecha')::date+(d->>'inicio')::time) AT TIME ZONE 'America/Mazatlan';
  fin_hora:=((d->>'fecha')::date+(d->>'fin')::time) AT TIME ZONE 'America/Mazatlan';
  IF fin_hora<=ini THEN RAISE EXCEPTION 'Horario inválido' USING ERRCODE='23514'; END IF;
  SELECT * INTO s FROM public."sesionActividad" WHERE "actividadId"=a.id FOR UPDATE;
  IF FOUND THEN
   UPDATE public."sesionActividad" SET "espacioId"=e.id,inicio=ini,fin=fin_hora,capacidad=(d->>'cupo')::integer,estado='borrador',"registroAbierto"=false WHERE id=s.id;
  ELSE
   INSERT INTO public."sesionActividad"("actividadId","espacioId",inicio,fin,capacidad) VALUES(a.id,e.id,ini,fin_hora,(d->>'cupo')::integer);
  END IF;
  estado_nuevo:='en_revision';
 ELSIF operacion='aprobar' THEN
  IF NOT privado.permiso_agenda(actor,'registrar_resoluciones_actividades',a.id) THEN RAISE EXCEPTION 'Sin permiso de resolución' USING ERRCODE='42501'; END IF;
  IF a."estadoPublicacion"<>'en_revision' THEN RAISE EXCEPTION 'No está en revisión' USING ERRCODE='55000'; END IF;
  IF referencia='' OR NOT EXISTS(SELECT 1 FROM public."sesionActividad" WHERE "actividadId"=a.id) THEN RAISE EXCEPTION 'Falta autorización o sesión' USING ERRCODE='23514'; END IF;
  UPDATE public.actividad SET "referenciaAutorizacion"=referencia WHERE id=a.id;
  INSERT INTO privado."estadoAgenda"("actividadId","autorizadoPor") VALUES(a.id,actor)
   ON CONFLICT ("actividadId") DO UPDATE SET "autorizadoPor"=excluded."autorizadoPor";
  estado_nuevo:='aprobada';
 ELSIF operacion='publicar' THEN
  IF NOT privado.permiso_agenda(actor,'publicar_contenidos',a.id) THEN RAISE EXCEPTION 'Sin permiso de publicación' USING ERRCODE='42501'; END IF;
  IF a."estadoPublicacion"<>'aprobada' THEN RAISE EXCEPTION 'Primero debe autorizarse' USING ERRCODE='55000'; END IF;
  IF nullif(btrim(a."referenciaAutorizacion"),'') IS NULL OR NOT EXISTS(SELECT 1 FROM public."sesionActividad" WHERE "actividadId"=a.id) THEN RAISE EXCEPTION 'Falta autorización o sesión' USING ERRCODE='23514'; END IF;
  UPDATE public."sesionActividad" SET estado='programada',"registroAbierto"=a."requiereInscripcion","referenciaAutorizacion"=a."referenciaAutorizacion" WHERE "actividadId"=a.id AND estado='borrador';
  UPDATE public.actividad SET "referenciaPublicacion"=a."referenciaAutorizacion" WHERE id=a.id;
  UPDATE privado."estadoAgenda" SET "publicadoEn"=clock_timestamp() WHERE "actividadId"=a.id;
  estado_nuevo:='publicada';
 ELSIF operacion='retirar' THEN
  IF NOT privado.permiso_agenda(actor,'publicar_contenidos',a.id) THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
  IF a."estadoPublicacion"<>'publicada' THEN RAISE EXCEPTION 'No está publicada' USING ERRCODE='55000'; END IF;
  IF motivo='' THEN RAISE EXCEPTION 'Motivo requerido' USING ERRCODE='23514'; END IF;
  UPDATE public."sesionActividad" SET "registroAbierto"=false WHERE "actividadId"=a.id;
  estado_nuevo:='retirada';
 ELSIF operacion='rechazar' THEN
  IF NOT privado.permiso_agenda(actor,'registrar_resoluciones_actividades',a.id) THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
  IF a."estadoPublicacion"<>'en_revision' THEN RAISE EXCEPTION 'No está en revisión' USING ERRCODE='55000'; END IF;
  IF motivo='' THEN RAISE EXCEPTION 'Motivo requerido' USING ERRCODE='23514'; END IF;
  estado_nuevo:='borrador';
 ELSE
  IF NOT permiso OR a."estadoPublicacion" NOT IN ('borrador','en_revision','aprobada') THEN RAISE EXCEPTION 'No se puede archivar' USING ERRCODE='55000'; END IF;
  IF motivo='' THEN RAISE EXCEPTION 'Motivo requerido' USING ERRCODE='23514'; END IF;
  estado_nuevo:='archivada';
 END IF;
 UPDATE public.actividad SET "estadoPublicacion"=estado_nuevo,"actualizadoEn"=clock_timestamp() WHERE id=a.id RETURNING * INTO a;
 INSERT INTO privado."historialActividad"("actividadId",accion,motivo,referencia,"realizadoPor") VALUES(a.id,operacion,motivo,referencia,actor);
 RETURN privado.actividad_agenda(a);
END;
$$;

CREATE OR REPLACE FUNCTION privado.publicar_propuesta(datos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid; p public."propuestaEvento"%ROWTYPE; a public.actividad%ROWTYPE;
 resultado jsonb; acuerdo jsonb; sala public.espacio%ROWTYPE; desde timestamptz; hasta timestamptz;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF jsonb_typeof(datos) IS DISTINCT FROM 'object'
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN
 ('id','actualizadoEn','confirmacion','nombre','tipo','descripcion','fecha','inicio','fin','espacio','cupo','inscripcion','publico','responsable','materiales'))
 OR datos->'confirmacion' IS DISTINCT FROM 'true'::jsonb
 THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
 SELECT * INTO p FROM public."propuestaEvento" WHERE id=(datos->>'id')::uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Propuesta inexistente' USING ERRCODE='P0002'; END IF;
 IF p."propuestoPor"=actor OR NOT privado.permiso_agenda(actor,'registrar_resoluciones_actividades')
 OR NOT privado.permiso_agenda(actor,'publicar_contenidos')
 THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
 IF p."estadoRevision"<>'aprobada' THEN RAISE EXCEPTION 'Primero debe aprobarse' USING ERRCODE='55000'; END IF;
 -- Reintentar una respuesta perdida devuelve la misma publicación, nunca crea otra.
 IF p."actividadId" IS NOT NULL THEN
  SELECT * INTO a FROM public.actividad WHERE id=p."actividadId";
  RETURN privado.actividad_agenda(a);
 END IF;
 IF (datos->>'actualizadoEn')::timestamptz IS DISTINCT FROM p."actualizadoEn"
 THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
 SELECT h."acuerdoDireccion" INTO acuerdo FROM privado."historialSolicitud" h
 WHERE h."propuestaEventoId"=p.id AND h."estadoNuevo"='aprobada' AND h."acuerdoDireccion" IS NOT NULL
 ORDER BY h.fecha DESC,h.id DESC LIMIT 1;
 IF nullif(btrim(acuerdo->>'referencia'),'') IS NULL
 THEN RAISE EXCEPTION 'Falta el acuerdo institucional' USING ERRCODE='23514'; END IF;
 desde:=((datos->>'fecha')::date+(datos->>'inicio')::time) AT TIME ZONE 'America/Mazatlan';
 hasta:=((datos->>'fecha')::date+(datos->>'fin')::time) AT TIME ZONE 'America/Mazatlan';
 IF desde IS NULL OR hasta IS NULL OR hasta<=desde OR desde<=statement_timestamp()
 THEN RAISE EXCEPTION 'Programa una sesión futura' USING ERRCODE='23514'; END IF;
 SELECT * INTO sala FROM public.espacio WHERE nombre=datos->>'espacio' AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Espacio inválido' USING ERRCODE='23514'; END IF;
 IF jsonb_array_length(privado.ocupacion_espacio(sala.id,desde,hasta,'00000000-0000-0000-0000-000000000000'))>0
 THEN RAISE EXCEPTION 'Espacio ocupado' USING ERRCODE='55000'; END IF;
 resultado:=privado.gestionar_agenda('crear',
  (datos-ARRAY['id','actualizadoEn','confirmacion'])||jsonb_build_object('estado','en-revision'));
 resultado:=privado.gestionar_agenda('aprobar',jsonb_build_object('folio',resultado->>'folio',
  'actualizado',resultado->>'actualizado','referencia','Acuerdo de propuesta '||p.id::text));
 resultado:=privado.gestionar_agenda('publicar',jsonb_build_object('folio',resultado->>'folio',
  'actualizado',resultado->>'actualizado'));
 SELECT * INTO a FROM public.actividad WHERE folio=resultado->>'folio';
 UPDATE public."propuestaEvento" SET "actividadId"=a.id WHERE id=p.id;
 INSERT INTO privado."historialSolicitud"("propuestaEventoId",accion,"estadoAnterior","estadoNuevo",nota,"realizadoPor","acuerdoDireccion")
 VALUES(p.id,'publicar','aprobada','aprobada','Publicada en la agenda con folio '||a.folio,actor,acuerdo);
 RETURN resultado;
END; $$;
CREATE OR REPLACE FUNCTION public.publicar_propuesta(datos jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.publicar_propuesta(datos);
$$;
REVOKE ALL ON FUNCTION privado.publicar_propuesta(jsonb),public.publicar_propuesta(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.publicar_propuesta(jsonb),public.publicar_propuesta(jsonb) TO authenticated;
COMMIT;
