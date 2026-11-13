-- HU-02 / T-055: reutiliza actividad, sesionActividad y espacio, sin borrar registros.
BEGIN;
CREATE SEQUENCE IF NOT EXISTS privado.folio_actividad;
ALTER TABLE public.actividad ADD COLUMN IF NOT EXISTS folio text
 DEFAULT ('AC-'||lpad(nextval('privado.folio_actividad')::text,6,'0'));
CREATE UNIQUE INDEX IF NOT EXISTS actividad_folio_unico ON public.actividad(folio);
ALTER TABLE public.actividad ADD COLUMN IF NOT EXISTS responsable text NOT NULL DEFAULT '';
ALTER TABLE public.actividad ADD COLUMN IF NOT EXISTS "requiereInscripcion" boolean NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS privado."estadoAgenda" (
 "actividadId" uuid PRIMARY KEY REFERENCES public.actividad(id),
 "datosBorrador" jsonb NOT NULL DEFAULT '{}',
 "autorizadoPor" uuid REFERENCES public.perfil(id), "publicadoEn" timestamptz
);
ALTER TABLE privado."estadoAgenda" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."estadoAgenda" FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS privado."historialActividad" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "actividadId" uuid NOT NULL REFERENCES public.actividad(id),
 accion text NOT NULL, motivo text NOT NULL DEFAULT '', referencia text NOT NULL DEFAULT '',
 "realizadoPor" uuid NOT NULL REFERENCES public.perfil(id), fecha timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE privado."historialActividad" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."historialActividad" FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS historial_actividad_fecha ON privado."historialActividad"("actividadId",fecha);
CREATE INDEX IF NOT EXISTS agenda_publicada ON public.actividad("estadoPublicacion",folio);
CREATE INDEX IF NOT EXISTS agenda_sesion_fecha ON public."sesionActividad"("actividadId",inicio);

CREATE OR REPLACE FUNCTION privado.permiso_agenda(actor uuid,capacidad text,actividad uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) p
 WHERE p->>'capacidad'=capacidad AND (p->>'ambito'='global' OR p->>'actividadId'=actividad::text));
$$;

CREATE OR REPLACE FUNCTION privado.actividad_agenda(a public.actividad,publica boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('folio',a.folio,'slug',a.slug,'nombre',a.titulo,'tipo',CASE lower(a.categoria) WHEN 'club_lectura' THEN 'Club' ELSE initcap(replace(a.categoria,'_',' ')) END,
 'descripcion',a.descripcion,'publico',a.audiencia,'materiales',a.requerimientos,
 'responsable',a.responsable,'inscripcion',a."requiereInscripcion",
 'estado',replace(CASE WHEN a."estadoPublicacion"='retirada' THEN 'archivada' ELSE a."estadoPublicacion" END,'_','-'),
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

CREATE OR REPLACE FUNCTION privado.agenda_publica(filtros jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE desde date; hasta date; pagina integer; limite integer; filas jsonb; total integer;
BEGIN
 IF jsonb_typeof(filtros) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(filtros) k WHERE k NOT IN ('identificador','desde','hasta','tipo','busqueda','pagina','limite'))
 THEN RAISE EXCEPTION 'Filtros inválidos' USING ERRCODE='22023'; END IF;
 desde:=(filtros->>'desde')::date; hasta:=(filtros->>'hasta')::date;
 pagina:=coalesce((filtros->>'pagina')::integer,0); limite:=coalesce((filtros->>'limite')::integer,20);
 IF pagina NOT BETWEEN 0 AND 5000 OR limite NOT BETWEEN 1 AND 50 OR desde>hasta OR length(filtros->>'busqueda')>100 OR length(filtros->>'tipo')>80
 THEN RAISE EXCEPTION 'Filtros inválidos' USING ERRCODE='22023'; END IF;
 WITH elegidas AS (
 SELECT a.*,min(s.inicio) primera FROM public.actividad a JOIN public."sesionActividad" s ON s."actividadId"=a.id
 WHERE a."estadoPublicacion"='publicada' AND nullif(btrim(a."referenciaAutorizacion"),'') IS NOT NULL AND nullif(btrim(a."referenciaPublicacion"),'') IS NOT NULL
 AND s.estado IN ('programada','en_curso','finalizada','cancelada')
 AND (desde IS NULL OR (s.inicio AT TIME ZONE 'America/Mazatlan')::date>=desde)
 AND (hasta IS NULL OR (s.inicio AT TIME ZONE 'America/Mazatlan')::date<=hasta)
 AND (nullif(filtros->>'identificador','') IS NULL OR a.folio=filtros->>'identificador' OR a.slug=filtros->>'identificador')
 AND (nullif(filtros->>'tipo','') IS NULL OR translate(lower(replace(a.categoria,'club_lectura','club')),'áéíóú','aeiou')=translate(lower(filtros->>'tipo'),'áéíóú','aeiou'))
 AND (nullif(btrim(filtros->>'busqueda'),'') IS NULL OR a.titulo ILIKE '%'||(filtros->>'busqueda')||'%')
 GROUP BY a.id
 ), pagina_datos AS (SELECT * FROM elegidas ORDER BY primera,id LIMIT limite OFFSET pagina*limite)
 SELECT (SELECT count(*) FROM elegidas),coalesce(jsonb_agg(privado.actividad_agenda(p0.a,true) ORDER BY p0.primera,p0.id),'[]'::jsonb)
 INTO total,filas FROM (SELECT (SELECT a FROM public.actividad a WHERE a.id=d.id) a,d.primera,d.id FROM pagina_datos d) p0
 ;
 RETURN jsonb_build_object('total',total,'actividades',filas,'pagina',pagina);
END;
$$;

-- Proyección pública limitada: no se conceden nuevos SELECT ni escrituras directas.
CREATE OR REPLACE FUNCTION public.gestionar_agenda(operacion text,datos jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT privado.gestionar_agenda(operacion,datos); $$;
CREATE OR REPLACE FUNCTION public.agenda_publica(filtros jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT privado.agenda_publica(filtros); $$;
REVOKE ALL ON FUNCTION privado.permiso_agenda(uuid,text,uuid),privado.actividad_agenda(public.actividad,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION privado.gestionar_agenda(text,jsonb),public.gestionar_agenda(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.gestionar_agenda(text,jsonb),public.gestionar_agenda(text,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION privado.agenda_publica(jsonb),public.agenda_publica(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.agenda_publica(jsonb),public.agenda_publica(jsonb) TO anon,authenticated;
COMMIT;
