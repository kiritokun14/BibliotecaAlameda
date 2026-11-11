-- HU-19 / T-097. Aplicar tras agenda_actividades.sql y alinear_actores_documentados.sql.
-- Sin nuevas tablas ni permisos directos sobre datos personales.
BEGIN;
CREATE OR REPLACE FUNCTION privado.autoriza_inscripciones(actor uuid, sesion uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT EXISTS (
  SELECT 1 FROM public."sesionActividad" s
  WHERE s.id=sesion AND privado.permiso_agenda(actor,'confirmar_inscripciones',s."actividadId")
 );
 -- Una concesión global permite todas las sesiones; una específica, las de esa actividad.
 -- personal o creadoPor sin capacidad NO otorgan acceso. responsable es texto descriptivo.
$$;
REVOKE ALL ON FUNCTION privado.autoriza_inscripciones(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION privado.gestionar_inscripciones(operacion text, datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid; sesion uuid; inscripcion_id uuid;
 s public."sesionActividad"%ROWTYPE; a public.actividad%ROWTYPE;
 i public.inscripcion%ROWTYPE; ocupados bigint; resultado jsonb;
 motivo text; instante timestamptz; limite integer; desplazamiento integer; estado_nuevo text;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF operacion IS NULL OR operacion NOT IN ('actividades','listar','cupos','conteos','confirmar','rechazar','cancelar')
 OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'Solicitud inválida' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE NOT k=ANY(
  CASE operacion WHEN 'actividades' THEN ARRAY['limite','desplazamiento']
  WHEN 'listar' THEN ARRAY['sesionId','limite','desplazamiento']
  WHEN 'cupos' THEN ARRAY['sesionId'] WHEN 'conteos' THEN ARRAY['sesionId']
  ELSE ARRAY['inscripcionId','motivo'] END)) THEN
  RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023';
 END IF;
 limite:=coalesce((datos->>'limite')::integer,20);
 desplazamiento:=coalesce((datos->>'desplazamiento')::integer,0);
 IF limite NOT BETWEEN 1 AND 100 OR desplazamiento NOT BETWEEN 0 AND 100000 THEN
  RAISE EXCEPTION 'Paginación inválida' USING ERRCODE='22023';
 END IF;
 IF operacion='actividades' THEN
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'titulo',x.titulo,
   'requiereInscripcion',x."requiereInscripcion",'requerimientos',x.requerimientos) ORDER BY x.titulo,x.id),'[]'::jsonb)
   FROM (SELECT ac.id,ac.titulo,ac."requiereInscripcion",ac.requerimientos FROM public.actividad ac
    WHERE privado.permiso_agenda(actor,'confirmar_inscripciones',ac.id)
    ORDER BY ac.titulo,ac.id LIMIT limite OFFSET desplazamiento) x);
 END IF;
 IF operacion IN ('confirmar','rechazar','cancelar') THEN
  inscripcion_id:=(datos->>'inscripcionId')::uuid;
  SELECT "sesionId" INTO sesion FROM public.inscripcion WHERE id=inscripcion_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No encontrada' USING ERRCODE='P0002'; END IF;
 ELSE sesion:=(datos->>'sesionId')::uuid;
 END IF;
 IF sesion IS NULL THEN RAISE EXCEPTION 'Falta identificador' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."sesionActividad" WHERE id=sesion) THEN
  RAISE EXCEPTION 'No encontrada' USING ERRCODE='P0002'; END IF;
 IF operacion='conteos' THEN
  IF NOT privado.autoriza_inscripciones(actor,sesion) AND NOT EXISTS(
   SELECT 1 FROM public."sesionActividad" ss JOIN public.actividad ac ON ac.id=ss."actividadId"
   WHERE ss.id=sesion AND (ac."creadoPor"=actor OR EXISTS(
    SELECT 1 FROM public."propuestaEvento" pe WHERE pe."actividadId"=ac.id
    AND pe."propuestoPor"=actor AND pe."estadoRevision"='aprobada')))
  THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501'; END IF;
  RETURN (SELECT jsonb_build_object('sesionId',sesion,
   'pendientes',count(*) FILTER (WHERE status='pendiente'),
   'confirmados',count(*) FILTER (WHERE status='confirmada'),
   'rechazados',count(*) FILTER (WHERE status='rechazada'),
   'cancelados',count(*) FILTER (WHERE status='cancelada'))
   FROM public.inscripcion WHERE "sesionId"=sesion);
 END IF;
 IF NOT privado.autoriza_inscripciones(actor,sesion) THEN
  RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501'; END IF;

 IF operacion='listar' THEN
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'usuarioId',x."usuarioId",
   'nombre',concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido"),
   'status',x.status,'creadoA',x."creadoA") ORDER BY x."creadoA",x.id),'[]'::jsonb)
   FROM (SELECT id,"usuarioId",status,"creadoA" FROM public.inscripcion
    WHERE "sesionId"=sesion ORDER BY "creadoA",id LIMIT limite OFFSET desplazamiento) x
   JOIN public.perfil p ON p.id=x."usuarioId");
 END IF;
 IF operacion='cupos' THEN
  RETURN (SELECT jsonb_build_object('sesionId',ss.id,'capacidad',ss.capacidad,
   'confirmados',count(ii.id),'disponibles',ss.capacidad-count(ii.id))
   FROM public."sesionActividad" ss LEFT JOIN public.inscripcion ii
   ON ii."sesionId"=ss.id AND ii.status='confirmada' WHERE ss.id=sesion GROUP BY ss.id);
 END IF;

 -- Orden de bloqueo: actividad, sesión, inscripción. Releer después de esperar.
 -- El bloqueo de actividad también coordina modificaciones de la agenda existente.
 SELECT ac.* INTO a FROM public.actividad ac JOIN public."sesionActividad" ss
  ON ss."actividadId"=ac.id WHERE ss.id=sesion FOR SHARE OF ac;
 SELECT * INTO s FROM public."sesionActividad" WHERE id=sesion FOR UPDATE;
 SELECT * INTO i FROM public.inscripcion WHERE id=inscripcion_id FOR UPDATE;
 IF NOT FOUND OR i."sesionId"<>sesion THEN
  RAISE EXCEPTION 'La inscripción cambió' USING ERRCODE='40001'; END IF;
 -- Volver a comprobar la sesión y permisos tras cualquier espera de bloqueo.
 actor:=privado.comprobar_sesion_cuenta();
 IF NOT privado.autoriza_inscripciones(actor,sesion) THEN
  RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501'; END IF;
 IF (operacion IN ('confirmar','rechazar') AND i.status<>'pendiente')
 OR (operacion='cancelar' AND i.status NOT IN ('pendiente','confirmada')) THEN
  RAISE EXCEPTION 'Estado incompatible' USING ERRCODE='55000'; END IF;
 IF operacion='confirmar' AND (a."estadoPublicacion"<>'publicada' OR NOT a."requiereInscripcion"
 OR s.estado<>'programada' OR NOT s."registroAbierto" OR s.inicio<=clock_timestamp()
 OR NOT EXISTS(SELECT 1 FROM public.perfil WHERE id=i."usuarioId" AND estatus='activo')) THEN
  RAISE EXCEPTION 'No elegible' USING ERRCODE='23514'; END IF;
 -- requerimientos es texto libre: el motivo documenta la revisión humana, no se interpreta como reglas.
 motivo:=btrim(datos->>'motivo');
 IF motivo IS NULL OR length(motivo) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Se requiere motivo de revisión' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO ocupados FROM public.inscripcion WHERE "sesionId"=sesion AND status='confirmada';
 IF operacion='confirmar' AND ocupados>=s.capacidad THEN
  RAISE EXCEPTION 'Cupo agotado' USING ERRCODE='23514'; END IF;
 estado_nuevo:=CASE operacion WHEN 'confirmar' THEN 'confirmada'
  WHEN 'rechazar' THEN 'rechazada' ELSE 'cancelada' END;
 instante:=clock_timestamp();
 UPDATE public.inscripcion SET status=estado_nuevo,"decisionPor"=actor,"decisionRazon"=motivo,
  "decididoA"=instante,"actualizadoA"=instante WHERE id=inscripcion_id;
 INSERT INTO public."historiaInscripcion" ("inscripcionId","estadoPrevio","estadoNuevo","cambiadoPor",razon,"cambiadoA")
 VALUES(inscripcion_id,i.status,estado_nuevo,actor,motivo,instante);
 SELECT jsonb_build_object('id',id,'status',status,'decisionPor',"decisionPor",
  'decididoA',"decididoA",'actualizadoA',"actualizadoA") INTO resultado
 FROM public.inscripcion WHERE id=inscripcion_id;
 RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION privado.gestionar_inscripciones(text,jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.gestionar_inscripciones(operacion text, datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT privado.gestionar_inscripciones(operacion,datos);
$$;
REVOKE ALL ON FUNCTION public.gestionar_inscripciones(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gestionar_inscripciones(text,jsonb) TO authenticated;
-- Se conservan las RLS: el personal consulta únicamente la proyección mínima de la RPC.
NOTIFY pgrst, 'reload schema';
COMMIT;
