-- HU-17 / CU-17 / T-094. Migración nueva; revisar antes de aplicar a la base compartida.
-- Requiere agenda_actividades.sql, espacios_personal.sql y publicacion_propuestas.sql.
BEGIN;
CREATE SEQUENCE privado.folio_cambio_actividad;
CREATE TABLE privado."cambioActividad" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 folio text NOT NULL UNIQUE DEFAULT ('CB-'||lpad(nextval('privado.folio_cambio_actividad')::text,6,'0')),
 "actividadId" uuid NOT NULL REFERENCES public.actividad(id),
 "solicitadoPor" uuid NOT NULL REFERENCES public.perfil(id),
 tipo text NOT NULL CHECK(tipo IN ('reprogramacion','cancelacion')),
 motivo text NOT NULL CHECK(length(btrim(motivo)) BETWEEN 1 AND 1000),
 sesiones uuid[] NOT NULL CHECK(cardinality(sesiones) BETWEEN 1 AND 50),
 anterior jsonb NOT NULL, programacion jsonb NOT NULL,
 estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','autorizado','rechazado','aplicado')),
 version integer NOT NULL DEFAULT 1,
 acuerdo jsonb, "resueltoPor" uuid REFERENCES public.perfil(id), "resueltoEn" timestamptz,
 "aplicadoPor" uuid REFERENCES public.perfil(id), "aplicadoEn" timestamptz,
 "creadoEn" timestamptz NOT NULL DEFAULT clock_timestamp(),
 historial jsonb NOT NULL DEFAULT '[]'
);
CREATE INDEX ON privado."cambioActividad"("actividadId", "creadoEn");
CREATE TABLE privado."avisoCambioActividad" (
 "cambioId" uuid NOT NULL REFERENCES privado."cambioActividad"(id),
 "usuarioId" uuid NOT NULL REFERENCES public.perfil(id),
 "avisoId" uuid UNIQUE REFERENCES public."avisoNotificacion"(id),
 estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','registrado','fallido')),
 intentos integer NOT NULL DEFAULT 0,
 PRIMARY KEY ("cambioId","usuarioId")
);
ALTER TABLE privado."cambioActividad" ENABLE ROW LEVEL SECURITY;
ALTER TABLE privado."avisoCambioActividad" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."cambioActividad",privado."avisoCambioActividad" FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE privado.folio_cambio_actividad FROM PUBLIC,anon,authenticated;

-- Se registra un aviso del portal; nunca se acredita entrega de correo.
-- Cada destinatario tiene una clave única. Un fallo se conserva y permite reintentar.
CREATE FUNCTION privado.registrar_avisos_cambio(p_cambio uuid)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE c privado."cambioActividad"%ROWTYPE; d record; aviso uuid; titulo text; cuerpo text; horarios text;
BEGIN
 SELECT * INTO STRICT c FROM privado."cambioActividad" WHERE id=p_cambio;
 SELECT a.titulo INTO titulo FROM public.actividad a WHERE a.id=c."actividadId";
 cuerpo:=CASE WHEN c.estado='rechazado' THEN 'La solicitud fue rechazada. Se conserva la programación oficial.'
  WHEN c.tipo='cancelacion' THEN 'Se autorizó y aplicó la cancelación de las sesiones indicadas.'
  ELSE 'Se autorizó y aplicó una nueva programación de las sesiones indicadas.' END;
 SELECT string_agg(to_char((p->>'inicio')::timestamptz AT TIME ZONE 'America/Mazatlan','DD/MM/YYYY HH24:MI')||
  ' a '||to_char((p->>'fin')::timestamptz AT TIME ZONE 'America/Mazatlan','HH24:MI')||' · '||(p->>'espacio'),'; ' ORDER BY p->>'inicio') INTO horarios
  FROM jsonb_array_elements(c.anterior) p;
 cuerpo:=cuerpo||' Actividad: '||titulo||'. Solicitud: '||c.folio||'. Programación anterior (hora de Tepic): '||horarios||'.';
 IF c.tipo='reprogramacion' AND c.estado='aplicado' THEN
  SELECT string_agg((p->>'fecha')||' '||(p->>'inicio')||' a '||(p->>'fin')||' · '||(p->>'espacio'),'; ' ORDER BY p->>'fecha',p->>'inicio') INTO horarios FROM jsonb_array_elements(c.programacion) p;
  cuerpo:=cuerpo||' Nueva programación (hora de Tepic): '||horarios||'.';
 END IF;
 FOR d IN SELECT * FROM privado."avisoCambioActividad" WHERE "cambioId"=c.id AND "avisoId" IS NULL ORDER BY "usuarioId" FOR UPDATE LOOP
  BEGIN
   INSERT INTO public."avisoNotificacion"("usuarioId",titulo,"cuerpoAviso","tipoAviso","canalUtilizado","estadoEnvio")
   VALUES(d."usuarioId",'Resolución de actividad · '||c.folio,cuerpo,'actividad','portal','pendiente') RETURNING id INTO aviso;
   UPDATE privado."avisoCambioActividad" SET "avisoId"=aviso,estado='registrado',intentos=intentos+1
    WHERE "cambioId"=c.id AND "usuarioId"=d."usuarioId";
  EXCEPTION WHEN OTHERS THEN
   -- El subbloque revierte solo este intento; conserva la decisión de la actividad.
   UPDATE privado."avisoCambioActividad" SET estado='fallido',intentos=intentos+1
    WHERE "cambioId"=c.id AND "usuarioId"=d."usuarioId";
  END;
 END LOOP;
END; $$;

CREATE FUNCTION privado.cambio_actividad_json(c privado."cambioActividad", actor uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('folio',c.folio,'actividad',a.folio,'nombre',a.titulo,'tipo',c.tipo,
 'motivo',c.motivo,'sesiones',c.sesiones,'anterior',c.anterior,'programacion',c.programacion,
 'estado',c.estado,'version',c.version,'acuerdo',c.acuerdo,'historial',
 (SELECT coalesce(jsonb_agg(h.valor||jsonb_build_object('responsable',concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido")) ORDER BY h.orden),'[]'::jsonb)
  FROM jsonb_array_elements(c.historial) WITH ORDINALITY h(valor,orden) LEFT JOIN public.perfil p ON p.id=(h.valor->>'actor')::uuid),
 'solicitado',c."creadoEn",
 'puedeResolver',privado.permiso_agenda(actor,'registrar_resoluciones_actividades',a.id),
 'avisos',jsonb_build_object('registrados',(SELECT count(*) FROM privado."avisoCambioActividad" n WHERE n."cambioId"=c.id AND n.estado='registrado'),
 'fallidos',(SELECT count(*) FROM privado."avisoCambioActividad" n WHERE n."cambioId"=c.id AND n.estado='fallido')))
 FROM public.actividad a WHERE a.id=c."actividadId";
$$;

CREATE FUNCTION privado.cambios_actividad(operacion text, datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid; a public.actividad%ROWTYPE; c privado."cambioActividad"%ROWTYPE;
 s public."sesionActividad"%ROWTYPE; e public.espacio%ROWTYPE; cambio jsonb; anterior jsonb; actual jsonb;
 ids uuid[]; salas uuid[]; desde timestamptz; hasta timestamptz; nota text; acuerdo jsonb;
 puede boolean; total integer; filas jsonb; limite integer; desplazamiento integer;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF jsonb_typeof(datos) IS DISTINCT FROM 'object' OR operacion IS NULL
  OR operacion NOT IN ('actividades','listar','obtener','solicitar','resolver','aplicar','reintentar_avisos','avisos','leer_aviso')
 THEN RAISE EXCEPTION 'Petición inválida' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE NOT (k=ANY(CASE operacion
  WHEN 'actividades' THEN ARRAY[]::text[] WHEN 'listar' THEN ARRAY['propias','limite','desplazamiento']
  WHEN 'avisos' THEN ARRAY['limite','desplazamiento'] WHEN 'leer_aviso' THEN ARRAY['id']
  WHEN 'obtener' THEN ARRAY['folio'] WHEN 'solicitar' THEN ARRAY['actividad','actualizado','tipo','sesiones','programacion','motivo']
  WHEN 'resolver' THEN ARRAY['folio','version','decision','motivo','acuerdo'] ELSE ARRAY['folio','version'] END)))
 THEN RAISE EXCEPTION 'Campos no permitidos' USING ERRCODE='22023'; END IF;
 IF operacion='leer_aviso' THEN
  UPDATE public."avisoNotificacion" n SET "leidoEn"=coalesce(n."leidoEn",clock_timestamp())
   WHERE n.id=(datos->>'id')::uuid AND n."usuarioId"=actor AND EXISTS(
    SELECT 1 FROM privado."avisoCambioActividad" ac WHERE ac."avisoId"=n.id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Aviso inexistente' USING ERRCODE='P0002'; END IF;
  RETURN jsonb_build_object('leido',true);
 END IF;
 IF operacion='avisos' THEN
  limite:=coalesce((datos->>'limite')::integer,20); desplazamiento:=coalesce((datos->>'desplazamiento')::integer,0);
  IF limite NOT BETWEEN 1 AND 50 OR desplazamiento NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Página inválida' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO total FROM privado."avisoCambioActividad" ac JOIN public."avisoNotificacion" n ON n.id=ac."avisoId" WHERE n."usuarioId"=actor;
  SELECT coalesce(jsonb_agg(x.dato ORDER BY x.fecha DESC,x.id),'[]'::jsonb) INTO filas FROM (
   SELECT n.id,n."creadoEn" fecha,jsonb_build_object('id',n.id,'titulo',n.titulo,'texto',n."cuerpoAviso",'fecha',n."creadoEn",'leida',n."leidoEn" IS NOT NULL) dato
   FROM privado."avisoCambioActividad" ac JOIN public."avisoNotificacion" n ON n.id=ac."avisoId"
   WHERE n."usuarioId"=actor ORDER BY n."creadoEn" DESC,n.id LIMIT limite OFFSET desplazamiento) x;
  RETURN jsonb_build_object('total',total,'avisos',filas);
 END IF;
 IF operacion='actividades' THEN
  -- La titularidad puede venir de la propuesta; quien la publicó no sustituye al proponente.
  RETURN (SELECT coalesce(jsonb_agg((privado.actividad_agenda(x)-ARRAY['creadoPor','autorizo','historial','inscritos','espera'])||jsonb_build_object('actualizado',x."actualizadoEn") ORDER BY x.folio),'[]'::jsonb)
   FROM public.actividad x WHERE x."estadoPublicacion" IN ('aprobada','publicada')
   AND EXISTS(SELECT 1 FROM public."sesionActividad" ss WHERE ss."actividadId"=x.id AND ss.estado IN ('borrador','programada') AND ss.inicio>statement_timestamp()) AND
   (x."creadoPor"=actor OR EXISTS(SELECT 1 FROM public."propuestaEvento" p WHERE p."actividadId"=x.id AND p."propuestoPor"=actor)
    OR privado.permiso_agenda(actor,'registrar_resoluciones_actividades',x.id)));
 END IF;
 IF operacion='listar' THEN
  limite:=coalesce((datos->>'limite')::integer,20); desplazamiento:=coalesce((datos->>'desplazamiento')::integer,0);
  IF limite NOT BETWEEN 1 AND 50 OR desplazamiento NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Página inválida' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO total FROM privado."cambioActividad" x WHERE x."solicitadoPor"=actor OR
   (NOT coalesce((datos->>'propias')::boolean,false) AND privado.permiso_agenda(actor,'registrar_resoluciones_actividades',x."actividadId"));
  SELECT coalesce(jsonb_agg(privado.cambio_actividad_json(x,actor) ORDER BY x."creadoEn" DESC,x.id),'[]'::jsonb) INTO filas
   FROM (SELECT * FROM privado."cambioActividad" x WHERE x."solicitadoPor"=actor OR
    (NOT coalesce((datos->>'propias')::boolean,false) AND privado.permiso_agenda(actor,'registrar_resoluciones_actividades',x."actividadId"))
    ORDER BY x."creadoEn" DESC,x.id LIMIT limite OFFSET desplazamiento) x;
  RETURN jsonb_build_object('total',total,'cambios',filas);
 END IF;
 -- Mismo orden de bloqueo en todas las mutaciones: actividad, solicitud, espacios, sesiones.
 IF operacion='solicitar' THEN
  SELECT * INTO a FROM public.actividad WHERE folio=datos->>'actividad' FOR UPDATE;
 ELSE
  SELECT * INTO c FROM privado."cambioActividad" WHERE folio=datos->>'folio';
  SELECT * INTO a FROM public.actividad WHERE id=c."actividadId" FOR UPDATE;
 END IF;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Actividad inexistente' USING ERRCODE='P0002'; END IF;
 puede:=privado.permiso_agenda(actor,'registrar_resoluciones_actividades',a.id);
 IF operacion='solicitar' THEN
  IF NOT puede AND a."creadoPor"<>actor AND NOT EXISTS(SELECT 1 FROM public."propuestaEvento" p WHERE p."actividadId"=a.id AND p."propuestoPor"=actor)
   THEN RAISE EXCEPTION 'Actividad ajena' USING ERRCODE='42501'; END IF;
  IF a."estadoPublicacion" NOT IN ('aprobada','publicada') THEN RAISE EXCEPTION 'Actividad no aprobada' USING ERRCODE='55000'; END IF;
  IF (datos->>'actualizado')::timestamptz IS DISTINCT FROM a."actualizadoEn" THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
  nota:=btrim(coalesce(datos->>'motivo',''));
  IF length(nota) NOT BETWEEN 1 AND 1000 OR coalesce(datos->>'tipo','') NOT IN ('reprogramacion','cancelacion')
   OR jsonb_typeof(datos->'sesiones') IS DISTINCT FROM 'array' OR jsonb_typeof(datos->'programacion') IS DISTINCT FROM 'array'
   THEN RAISE EXCEPTION 'Solicitud inválida' USING ERRCODE='23514'; END IF;
  ids:=ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(datos->'sesiones'));
  IF cardinality(ids) NOT BETWEEN 1 AND 50 OR cardinality(ids)<>(SELECT count(DISTINCT id) FROM unnest(ids) id)
   THEN RAISE EXCEPTION 'Sesiones inválidas' USING ERRCODE='23514'; END IF;
  PERFORM 1 FROM public."sesionActividad" WHERE "actividadId"=a.id AND id=ANY(ids) ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public."sesionActividad" WHERE "actividadId"=a.id AND id=ANY(ids) AND estado IN ('borrador','programada') AND inicio>statement_timestamp())<>cardinality(ids)
   THEN RAISE EXCEPTION 'Sesiones ajenas, iniciadas o cerradas' USING ERRCODE='55000'; END IF;
  IF EXISTS(SELECT 1 FROM privado."cambioActividad" x WHERE x."actividadId"=a.id AND x.estado IN ('pendiente','autorizado') AND x.sesiones&&ids)
   THEN RAISE EXCEPTION 'Sesión con solicitud pendiente' USING ERRCODE='55000'; END IF;
  IF datos->>'tipo'='cancelacion' AND jsonb_array_length(datos->'programacion')<>0 THEN RAISE EXCEPTION 'Cancelación con horario' USING ERRCODE='23514'; END IF;
  IF datos->>'tipo'='reprogramacion' THEN
   IF jsonb_array_length(datos->'programacion')<>cardinality(ids)
    OR (SELECT count(DISTINCT (p->>'sesionId')::uuid) FROM jsonb_array_elements(datos->'programacion') p WHERE (p->>'sesionId')::uuid=ANY(ids))<>cardinality(ids)
    THEN RAISE EXCEPTION 'Falta programación por sesión' USING ERRCODE='23514'; END IF;
   FOR cambio IN SELECT value FROM jsonb_array_elements(datos->'programacion') LOOP
    IF cambio-ARRAY['sesionId','fecha','inicio','fin','espacio']<>'{}'::jsonb
     OR coalesce(cambio->>'inicio','') !~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$'
     OR coalesce(cambio->>'fin','') !~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$'
     THEN RAISE EXCEPTION 'Programación inválida' USING ERRCODE='23514'; END IF;
    desde:=((cambio->>'fecha')::date+(cambio->>'inicio')::time) AT TIME ZONE 'America/Mazatlan';
    hasta:=((cambio->>'fecha')::date+(cambio->>'fin')::time) AT TIME ZONE 'America/Mazatlan';
    IF desde IS NULL OR hasta IS NULL OR hasta<=desde OR desde<=statement_timestamp()
     OR NOT EXISTS(SELECT 1 FROM public.espacio WHERE nombre=cambio->>'espacio' AND activo)
     THEN RAISE EXCEPTION 'Horario o espacio inválido' USING ERRCODE='23514'; END IF;
   END LOOP;
  END IF;
  SELECT jsonb_agg(jsonb_build_object('sesionId',ss.id,'espacioId',ss."espacioId",'espacio',ee.nombre,'inicio',ss.inicio,'fin',ss.fin,
   'estado',ss.estado,'capacidad',ss.capacidad,'registroAbierto',ss."registroAbierto") ORDER BY ss.id) INTO anterior
   FROM public."sesionActividad" ss JOIN public.espacio ee ON ee.id=ss."espacioId" WHERE ss.id=ANY(ids);
  INSERT INTO privado."cambioActividad"("actividadId","solicitadoPor",tipo,motivo,sesiones,anterior,programacion,historial)
   VALUES(a.id,actor,datos->>'tipo',nota,ids,anterior,datos->'programacion',
    jsonb_build_array(jsonb_build_object('accion','solicitar','actor',actor,'fecha',clock_timestamp(),'motivo',nota))) RETURNING * INTO c;
  -- CA-17.1: no se actualiza actividad ni sesionActividad al solicitar.
  RETURN privado.cambio_actividad_json(c,actor);
 END IF;
 SELECT * INTO c FROM privado."cambioActividad" WHERE id=c.id FOR UPDATE;
 IF NOT puede AND c."solicitadoPor"<>actor THEN RAISE EXCEPTION 'Solicitud ajena' USING ERRCODE='42501'; END IF;
 IF operacion='obtener' THEN RETURN privado.cambio_actividad_json(c,actor); END IF;
 IF NOT puede THEN RAISE EXCEPTION 'Sin permiso de resolución' USING ERRCODE='42501'; END IF;
 -- Repetir una aplicación ya completada no duplica avisos ni cambia sesiones.
 IF operacion='aplicar' AND c.estado='aplicado' THEN RETURN privado.cambio_actividad_json(c,actor); END IF;
 IF (datos->>'version')::integer IS DISTINCT FROM c.version THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
 IF operacion='resolver' THEN
  IF c.estado<>'pendiente' THEN RAISE EXCEPTION 'Ya resuelta' USING ERRCODE='55000'; END IF;
  nota:=btrim(coalesce(datos->>'motivo','')); acuerdo:=datos->'acuerdo';
  IF length(nota) NOT BETWEEN 1 AND 1000 OR coalesce(datos->>'decision','') NOT IN ('autorizar','rechazar') THEN RAISE EXCEPTION 'Resolución inválida' USING ERRCODE='23514'; END IF;
  IF datos->>'decision'='autorizar' THEN
   IF jsonb_typeof(acuerdo) IS DISTINCT FROM 'object' OR acuerdo-ARRAY['referencia','autoridad','fecha']<>'{}'::jsonb
    OR length(btrim(coalesce(acuerdo->>'referencia',''))) NOT BETWEEN 1 AND 200
    OR length(btrim(coalesce(acuerdo->>'autoridad',''))) NOT BETWEEN 1 AND 150
    OR (acuerdo->>'fecha')::date IS NULL OR (acuerdo->>'fecha')::date>(statement_timestamp() AT TIME ZONE 'America/Mazatlan')::date
    THEN RAISE EXCEPTION 'Falta acuerdo institucional válido' USING ERRCODE='23514'; END IF;
  ELSIF acuerdo IS DISTINCT FROM 'null'::jsonb AND acuerdo IS NOT NULL THEN RAISE EXCEPTION 'Rechazo con acuerdo' USING ERRCODE='23514'; END IF;
  UPDATE privado."cambioActividad" SET estado=CASE WHEN datos->>'decision'='autorizar' THEN 'autorizado' ELSE 'rechazado' END,
   acuerdo=CASE WHEN datos->>'decision'='autorizar' THEN acuerdo ELSE NULL END,"resueltoPor"=actor,"resueltoEn"=clock_timestamp(),version=version+1,
   historial=historial||jsonb_build_array(jsonb_build_object('accion',datos->>'decision','actor',actor,'fecha',clock_timestamp(),'motivo',nota,'acuerdo',acuerdo))
   WHERE id=c.id RETURNING * INTO c;
  IF c.estado='rechazado' THEN
   INSERT INTO privado."avisoCambioActividad"("cambioId","usuarioId") VALUES(c.id,c."solicitadoPor");
   PERFORM privado.registrar_avisos_cambio(c.id);
  END IF;
 ELSIF operacion='reintentar_avisos' THEN
  IF c.estado NOT IN ('aplicado','rechazado') THEN RAISE EXCEPTION 'Sin resolución comunicable' USING ERRCODE='55000'; END IF;
  PERFORM privado.registrar_avisos_cambio(c.id);
 ELSE
  IF c.estado<>'autorizado' OR c.acuerdo IS NULL OR a."estadoPublicacion" NOT IN ('aprobada','publicada') THEN RAISE EXCEPTION 'Primero debe autorizarse' USING ERRCODE='55000'; END IF;
  ids:=c.sesiones;
  salas:=ARRAY(SELECT (p->>'espacioId')::uuid FROM jsonb_array_elements(c.anterior) p);
  salas:=salas||ARRAY(SELECT ee.id FROM public.espacio ee WHERE ee.nombre IN (SELECT p->>'espacio' FROM jsonb_array_elements(c.programacion) p));
  PERFORM 1 FROM public.espacio WHERE id=ANY(salas) ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public."sesionActividad" WHERE id=ANY(ids) ORDER BY id FOR UPDATE;
  SELECT jsonb_agg(jsonb_build_object('sesionId',ss.id,'espacioId',ss."espacioId",'espacio',ee.nombre,'inicio',ss.inicio,'fin',ss.fin,
   'estado',ss.estado,'capacidad',ss.capacidad,'registroAbierto',ss."registroAbierto") ORDER BY ss.id) INTO actual
   FROM public."sesionActividad" ss JOIN public.espacio ee ON ee.id=ss."espacioId" WHERE ss.id=ANY(ids);
  IF actual IS DISTINCT FROM c.anterior OR EXISTS(SELECT 1 FROM public."sesionActividad" WHERE id=ANY(ids) AND inicio<=statement_timestamp())
   THEN RAISE EXCEPTION 'Cambió la programación oficial o ya inició' USING ERRCODE='40001'; END IF;
  IF c.tipo='cancelacion' THEN
   -- ocupacion_espacio solo cuenta programada/en_curso: cancelar libera el espacio sin borrar.
   UPDATE public."sesionActividad" SET estado='cancelada',"registroAbierto"=false,"actualizadoEn"=clock_timestamp() WHERE id=ANY(ids);
  ELSE
   -- Primero retirar las sesiones afectadas del cálculo de ocupación, dentro de la transacción.
   UPDATE public."sesionActividad" SET estado='borrador' WHERE id=ANY(ids);
   FOR cambio IN SELECT value FROM jsonb_array_elements(c.programacion) ORDER BY value->>'sesionId' LOOP
    SELECT * INTO s FROM public."sesionActividad" WHERE id=(cambio->>'sesionId')::uuid;
    SELECT * INTO e FROM public.espacio WHERE nombre=cambio->>'espacio' AND activo;
    desde:=((cambio->>'fecha')::date+(cambio->>'inicio')::time) AT TIME ZONE 'America/Mazatlan';
    hasta:=((cambio->>'fecha')::date+(cambio->>'fin')::time) AT TIME ZONE 'America/Mazatlan';
    IF e.id IS NULL OR e.capacidad<s.capacidad OR desde<=statement_timestamp() OR hasta<=desde
     OR jsonb_array_length(privado.ocupacion_espacio(e.id,desde,hasta,'00000000-0000-0000-0000-000000000000'))>0
     OR EXISTS(SELECT 1 FROM public."sesionActividad" x WHERE x.id<>s.id AND x.id=ANY(ids) AND x."espacioId"=e.id
      AND x.inicio<hasta AND x.fin>desde AND EXISTS(SELECT 1 FROM jsonb_array_elements(c.programacion) p WHERE (p->>'sesionId')::uuid=x.id AND p->>'sesionId'<cambio->>'sesionId'))
     THEN RAISE EXCEPTION 'Espacio ocupado o programación inválida' USING ERRCODE='55000'; END IF;
    UPDATE public."sesionActividad" SET "espacioId"=e.id,inicio=desde,fin=hasta,
     estado=(SELECT p->>'estado' FROM jsonb_array_elements(c.anterior) p WHERE (p->>'sesionId')::uuid=s.id),
     "referenciaAutorizacion"=c.acuerdo->>'referencia',"actualizadoEn"=clock_timestamp() WHERE id=s.id;
   END LOOP;
  END IF;
  UPDATE public.actividad SET "actualizadoEn"=clock_timestamp() WHERE id=a.id;
  UPDATE privado."cambioActividad" SET estado='aplicado',version=version+1,"aplicadoPor"=actor,"aplicadoEn"=clock_timestamp(),
   historial=historial||jsonb_build_array(jsonb_build_object('accion','aplicar','actor',actor,'fecha',clock_timestamp(),'acuerdo',c.acuerdo)) WHERE id=c.id RETURNING * INTO c;
  INSERT INTO privado."historialActividad"("actividadId",accion,motivo,referencia,"realizadoPor")
   VALUES(a.id,c.tipo,c.motivo,c.acuerdo->>'referencia',actor);
  INSERT INTO privado."avisoCambioActividad"("cambioId","usuarioId")
   SELECT c.id,t.usuario FROM (
    SELECT c."solicitadoPor" usuario UNION SELECT a."creadoPor"
    UNION SELECT p."propuestoPor" FROM public."propuestaEvento" p WHERE p."actividadId"=a.id
    UNION SELECT i."usuarioId" FROM public.inscripcion i WHERE i."sesionId"=ANY(ids) AND i.status IN ('pendiente','confirmada')) t
   ON CONFLICT DO NOTHING;
  PERFORM privado.registrar_avisos_cambio(c.id);
 END IF;
 RETURN privado.cambio_actividad_json(c,actor);
END; $$;
CREATE FUNCTION public.cambios_actividad(operacion text, datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT privado.cambios_actividad(operacion,datos); $$;
REVOKE ALL ON FUNCTION privado.registrar_avisos_cambio(uuid),privado.cambio_actividad_json(privado."cambioActividad",uuid),
 privado.cambios_actividad(text,jsonb),public.cambios_actividad(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.cambios_actividad(text,jsonb),public.cambios_actividad(text,jsonb) TO authenticated;
-- Conserva publicación y trazabilidad; el estado operativo se deriva de sus sesiones.
CREATE OR REPLACE FUNCTION privado.actividad_agenda(a public.actividad,publica boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('folio',a.folio,'slug',a.slug,'nombre',a.titulo,'tipo',CASE lower(a.categoria) WHEN 'club_lectura' THEN 'Club' ELSE initcap(replace(a.categoria,'_',' ')) END,
 'descripcion',a.descripcion,'publico',a.audiencia,'materiales',a.requerimientos,
 'responsable',a.responsable,'inscripcion',a."requiereInscripcion",
 'estado',replace(CASE WHEN EXISTS(SELECT 1 FROM public."sesionActividad" t WHERE t."actividadId"=a.id) AND NOT EXISTS(SELECT 1 FROM public."sesionActividad" t WHERE t."actividadId"=a.id AND t.estado<>'cancelada') THEN 'cancelada' WHEN a."estadoPublicacion"='retirada' THEN 'archivada' ELSE a."estadoPublicacion" END,'_','-'),
 'fecha',CASE WHEN a."estadoPublicacion"='borrador' AND m."datosBorrador" ? 'fecha' THEN coalesce(m."datosBorrador"->>'fecha','') ELSE coalesce(to_char(s.inicio AT TIME ZONE 'America/Mazatlan','YYYY-MM-DD'),m."datosBorrador"->>'fecha','') END,
 'inicio',CASE WHEN a."estadoPublicacion"='borrador' AND m."datosBorrador" ? 'inicio' THEN coalesce(m."datosBorrador"->>'inicio','') ELSE coalesce(to_char(s.inicio AT TIME ZONE 'America/Mazatlan','HH24:MI'),m."datosBorrador"->>'inicio','') END,
 'fin',CASE WHEN a."estadoPublicacion"='borrador' AND m."datosBorrador" ? 'fin' THEN coalesce(m."datosBorrador"->>'fin','') ELSE coalesce(to_char(s.fin AT TIME ZONE 'America/Mazatlan','HH24:MI'),m."datosBorrador"->>'fin','') END,
 'espacio',CASE WHEN a."estadoPublicacion"='borrador' AND m."datosBorrador" ? 'espacio' THEN coalesce(m."datosBorrador"->>'espacio','') ELSE coalesce(e.nombre,m."datosBorrador"->>'espacio','') END,
 'cupo',CASE WHEN a."estadoPublicacion"='borrador' AND m."datosBorrador" ? 'cupo' THEN coalesce(m."datosBorrador"->>'cupo','') ELSE coalesce(s.capacidad::text,m."datosBorrador"->>'cupo','') END,
 'actualizado',a."actualizadoEn",'publicadaEl',m."publicadoEn",
 'sesiones',coalesce((SELECT jsonb_agg(jsonb_build_object('id',ss.id,'fecha',to_char(ss.inicio AT TIME ZONE 'America/Mazatlan','YYYY-MM-DD'),
  'inicio',to_char(ss.inicio AT TIME ZONE 'America/Mazatlan','HH24:MI'),'fin',to_char(ss.fin AT TIME ZONE 'America/Mazatlan','HH24:MI'),
  'espacio',ee.nombre,'cupo',ss.capacidad,'estado',ss.estado,'registroAbierto',ss."registroAbierto") ORDER BY ss.inicio,ss.id)
 FROM public."sesionActividad" ss JOIN public.espacio ee ON ee.id=ss."espacioId" WHERE ss."actividadId"=a.id
 AND (NOT publica OR ss.estado IN ('programada','en_curso','finalizada','cancelada'))),'[]'::jsonb))
 || CASE WHEN publica THEN '{}'::jsonb ELSE jsonb_build_object('creadoPor',a."creadoPor",
 'autorizo',CASE WHEN nullif(a."referenciaAutorizacion",'') IS NOT NULL THEN jsonb_build_object('quien',a."referenciaAutorizacion",'fecha',a."actualizadoEn") END,
 'inscritos',(SELECT count(*) FROM public.inscripcion i JOIN public."sesionActividad" ss ON ss.id=i."sesionId" WHERE ss."actividadId"=a.id AND i.status='confirmada'),
 'espera',0,'historial',coalesce((SELECT jsonb_agg(jsonb_build_object('accion',h.accion,'motivo',h.motivo,'referencia',h.referencia,'fecha',h.fecha) ORDER BY h.fecha,h.id)
 FROM privado."historialActividad" h WHERE h."actividadId"=a.id),'[]'::jsonb)) END
 FROM (SELECT 1) base LEFT JOIN LATERAL (SELECT * FROM public."sesionActividad" ss WHERE ss."actividadId"=a.id
 AND (NOT publica OR ss.estado IN ('programada','en_curso','finalizada','cancelada')) ORDER BY ss.inicio,ss.id LIMIT 1) s ON true
 LEFT JOIN public.espacio e ON e.id=s."espacioId" LEFT JOIN privado."estadoAgenda" m ON m."actividadId"=a.id;
$$;

COMMIT;
