-- T-094 complementa HU-17: versiones completas y motivo de corrección/cancelación.
-- Requiere las migraciones vigentes de propuestas, espacios y cambios_actividad.sql.
-- Migración preparada para revisión; no ejecutar reconstrucciones históricas en CECANbd.
BEGIN;
-- Cada actualización produce una versión distinta, incluso dentro de una transacción.
CREATE FUNCTION privado.actualizar_version_solicitud_t094()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 NEW."actualizadoEn":=greatest(clock_timestamp(),OLD."actualizadoEn"+interval '1 microsecond');
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION privado.actualizar_version_solicitud_t094() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."propuestaEvento"
 FOR EACH ROW EXECUTE FUNCTION privado.actualizar_version_solicitud_t094();
CREATE OR REPLACE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."solicitudEspacio"
 FOR EACH ROW EXECUTE FUNCTION privado.actualizar_version_solicitud_t094();
CREATE TABLE privado."versionSolicitud" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tipo text NOT NULL CHECK(tipo IN ('propuesta','espacio')),
 "solicitudId" uuid NOT NULL,
 numero integer NOT NULL CHECK(numero>0),
 accion text NOT NULL,
 motivo text NOT NULL CHECK(length(btrim(motivo)) BETWEEN 1 AND 1000),
 anterior jsonb NOT NULL, posterior jsonb NOT NULL,
 "realizadoPor" uuid NOT NULL REFERENCES public.perfil(id),
 fecha timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(tipo,"solicitudId",numero)
);
ALTER TABLE privado."versionSolicitud" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."versionSolicitud" FROM PUBLIC,anon,authenticated;

CREATE FUNCTION privado.guardar_version_solicitud(p_tipo text, p_id uuid, p_accion text, p_motivo text, p_anterior jsonb, p_posterior jsonb, p_actor uuid)
RETURNS void LANGUAGE sql SET search_path=pg_catalog AS $$
 INSERT INTO privado."versionSolicitud"(tipo,"solicitudId",numero,accion,motivo,anterior,posterior,"realizadoPor")
 SELECT p_tipo,p_id,coalesce(max(v.numero),0)+1,p_accion,p_motivo,p_anterior,p_posterior,p_actor
 FROM privado."versionSolicitud" v WHERE v.tipo=p_tipo AND v."solicitudId"=p_id;
$$;
REVOKE ALL ON FUNCTION privado.guardar_version_solicitud(text,uuid,text,text,jsonb,jsonb,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION privado.modificar_solicitud_espacio(operacion text, datos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid; s public."solicitudEspacio"%ROWTYPE; e public.espacio%ROWTYPE;
 antes jsonb; desde timestamptz; hasta timestamptz; motivo text;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF operacion IN ('cancelar','responder') THEN RETURN privado.solicitudes_espacio(operacion,datos); END IF;
 IF operacion IS DISTINCT FROM 'corregir' OR jsonb_typeof(datos) IS DISTINCT FROM 'object'
  OR datos-ARRAY['folio','actualizadoEn','tipo','espacio','fecha','horaInicio','horaFin','personas','motivo','institucion','motivoCambio']<>'{}'::jsonb
  THEN RAISE EXCEPTION 'Petición inválida' USING ERRCODE='22023'; END IF;
 SELECT * INTO s FROM public."solicitudEspacio" x WHERE x.folio=datos->>'folio' AND x."solicitadoPor"=actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud inexistente' USING ERRCODE='P0002'; END IF;
 IF (datos->>'actualizadoEn')::timestamptz IS DISTINCT FROM s."actualizadoEn" THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
 IF s."estadoSolicitud" NOT IN ('borrador','en_revision','requiere_correccion') THEN RAISE EXCEPTION 'La solicitud aprobada requiere atención del personal' USING ERRCODE='55000'; END IF;
 motivo:=btrim(coalesce(datos->>'motivoCambio',''));
 IF length(motivo) NOT BETWEEN 1 AND 1000 OR jsonb_typeof(datos->'personas') IS DISTINCT FROM 'number'
  OR (datos->>'personas')::integer NOT BETWEEN 1 AND 200 OR coalesce(datos->>'tipo','') NOT IN ('visita','uso_espacio')
  OR length(btrim(coalesce(datos->>'motivo',''))) NOT BETWEEN 1 AND 300 OR length(coalesce(datos->>'institucion',''))>150
  OR coalesce(datos->>'horaInicio','') !~ '^[0-9]{2}:[0-9]{2}$' OR coalesce(datos->>'horaFin','') !~ '^[0-9]{2}:[0-9]{2}$'
  THEN RAISE EXCEPTION 'Datos o motivo inválidos' USING ERRCODE='23514'; END IF;
 desde:=((datos->>'fecha')::date+(datos->>'horaInicio')::time) AT TIME ZONE 'America/Mazatlan';
 hasta:=((datos->>'fecha')::date+(datos->>'horaFin')::time) AT TIME ZONE 'America/Mazatlan';
 IF desde IS NULL OR hasta IS NULL OR hasta<=desde OR desde<=statement_timestamp() OR desde>statement_timestamp()+interval '12 months'
  THEN RAISE EXCEPTION 'Horario inválido; usa los próximos doce meses' USING ERRCODE='23514'; END IF;
 IF datos->>'tipo'='uso_espacio' OR nullif(datos->>'espacio','') IS NOT NULL THEN
  SELECT * INTO e FROM public.espacio WHERE slug=datos->>'espacio' AND activo;
  IF e.id IS NULL OR e.capacidad<(datos->>'personas')::integer THEN RAISE EXCEPTION 'Espacio o capacidad inválidos' USING ERRCODE='23514'; END IF;
 END IF;
 antes:=to_jsonb(s);
 UPDATE public."solicitudEspacio" SET "tipoSolicitud"=datos->>'tipo',"espacioSolicitadoId"=e.id,
  "fechaInicioSolicitado"=desde,"fechaFinSolicitado"=hasta,"cantidadPersonas"=(datos->>'personas')::integer,
  "propositoVisita"=btrim(datos->>'motivo'),"nombreInstitucion"=nullif(btrim(datos->>'institucion'),''),
  "estadoSolicitud"='en_revision',propuesta=NULL,"espacioAcordadoId"=NULL,"inicioAcordado"=NULL,"finAcordado"=NULL,
  "condicionesUso"=NULL,"resueltaEn"=NULL,"autorizadoPor"=NULL,"actualizadoEn"=clock_timestamp()
  WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public."historialSolicitudEspacio"("solicitudId",accion,nota,detalles,"realizadoPor")
  VALUES(s.id,'correccion',motivo,jsonb_build_object('anterior',antes,'posterior',to_jsonb(s)),actor);
 PERFORM privado.guardar_version_solicitud('espacio',s.id,'corregir',motivo,antes,to_jsonb(s),actor);
 RETURN privado.solicitud_espacio_para_usuario(s);
END; $$;
CREATE FUNCTION public.modificar_solicitud_espacio(operacion text,datos jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT privado.modificar_solicitud_espacio(operacion,datos); $$;
REVOKE ALL ON FUNCTION privado.modificar_solicitud_espacio(text,jsonb),public.modificar_solicitud_espacio(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.modificar_solicitud_espacio(text,jsonb),public.modificar_solicitud_espacio(text,jsonb) TO authenticated;

ALTER TABLE public."historialSolicitudEspacio" DROP CONSTRAINT "ck_historialSolicitudEspacio_accion";
ALTER TABLE public."historialSolicitudEspacio" ADD CONSTRAINT "ck_historialSolicitudEspacio_accion"
 CHECK(accion IN ('envio','cancelacion','observaciones','alternativa','respuesta','aprobacion','rechazo','correccion'));
-- Las definiciones actualizadas de las RPC existentes se incluyen a continuación.

CREATE OR REPLACE FUNCTION privado.atencion_solicitudes(tipo_solicitud text,operacion text,datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid; personal boolean; titular uuid; identificador uuid; anterior text; nuevo text; version_actual timestamptz;
 c public."solicitudCredencial"%ROWTYPE; p public."propuestaEvento"%ROWTYPE; nota text;
 limite integer; desplazamiento integer; filtro text; buscar text; total integer; filas jsonb; cita timestamptz; acuerdo jsonb; fecha_acuerdo date;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF tipo_solicitud IS NULL OR tipo_solicitud NOT IN ('credencial','propuesta') OR operacion IS NULL
 OR operacion NOT IN ('crear','mias','listar','obtener','resolver','corregir','cancelar') OR jsonb_typeof(datos) IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'Petición inválida' USING ERRCODE='22023'; END IF;
 personal:=EXISTS(SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) permiso
  WHERE permiso->>'capacidad'=CASE WHEN tipo_solicitud='credencial' THEN 'validar_credenciales' ELSE 'registrar_resoluciones_actividades' END
  AND permiso->>'ambito'='global');
 IF operacion IN ('listar','resolver') AND NOT personal THEN RAISE EXCEPTION 'Falta permiso de atención' USING ERRCODE='42501'; END IF;
 IF operacion IN ('mias','listar') THEN
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('limite','desplazamiento','estado','busqueda')) THEN RAISE EXCEPTION 'Filtros inválidos' USING ERRCODE='22023'; END IF;
  limite:=coalesce((datos->>'limite')::integer,20); desplazamiento:=coalesce((datos->>'desplazamiento')::integer,0);
  filtro:=nullif(datos->>'estado',''); buscar:=nullif(btrim(datos->>'busqueda'),'');
  IF limite NOT BETWEEN 1 AND 50 OR desplazamiento NOT BETWEEN 0 AND 100000 OR length(buscar)>100
  OR (filtro IS NOT NULL AND ((tipo_solicitud='credencial' AND filtro NOT IN ('recibida','en_atencion','cita_programada','atendida','rechazada','cancelada'))
    OR (tipo_solicitud='propuesta' AND filtro NOT IN ('borrador','en_revision','requiere_correccion','aprobada','rechazada','cancelada'))))
  THEN RAISE EXCEPTION 'Filtros inválidos' USING ERRCODE='22023'; END IF;
  IF tipo_solicitud='credencial' THEN
   SELECT count(*) INTO total FROM public."solicitudCredencial" s JOIN public.perfil pr ON pr.id=s."usuarioId"
    WHERE (operacion='listar' OR s."usuarioId"=actor) AND (filtro IS NULL OR s."estadoSolicitud"=filtro)
    AND (buscar IS NULL OR s.id::text ILIKE '%'||buscar||'%' OR (pr.nombres||' '||pr."primerApellido") ILIKE '%'||buscar||'%');
   SELECT coalesce(jsonb_agg(privado.solicitud_para_atencion('credencial',s.id,operacion='listar') ORDER BY s."creadaEn" DESC,s.id),'[]'::jsonb) INTO filas
    FROM (SELECT s.id,s."creadaEn" FROM public."solicitudCredencial" s JOIN public.perfil pr ON pr.id=s."usuarioId"
    WHERE (operacion='listar' OR s."usuarioId"=actor) AND (filtro IS NULL OR s."estadoSolicitud"=filtro)
    AND (buscar IS NULL OR s.id::text ILIKE '%'||buscar||'%' OR (pr.nombres||' '||pr."primerApellido") ILIKE '%'||buscar||'%')
    ORDER BY s."creadaEn" DESC,s.id LIMIT limite OFFSET desplazamiento) s;
  ELSE
   SELECT count(*) INTO total FROM public."propuestaEvento" s WHERE (operacion='listar' OR s."propuestoPor"=actor)
    AND (filtro IS NULL OR s."estadoRevision"=filtro) AND (buscar IS NULL OR s.id::text ILIKE '%'||buscar||'%' OR s."tituloPropuesta" ILIKE '%'||buscar||'%');
   SELECT coalesce(jsonb_agg(privado.solicitud_para_atencion('propuesta',s.id,operacion='listar') ORDER BY s."creadaEn" DESC,s.id),'[]'::jsonb) INTO filas
    FROM (SELECT * FROM public."propuestaEvento" s WHERE (operacion='listar' OR s."propuestoPor"=actor)
    AND (filtro IS NULL OR s."estadoRevision"=filtro) AND (buscar IS NULL OR s.id::text ILIKE '%'||buscar||'%' OR s."tituloPropuesta" ILIKE '%'||buscar||'%')
    ORDER BY s."creadaEn" DESC,s.id LIMIT limite OFFSET desplazamiento) s;
  END IF;
  RETURN jsonb_build_object('total',total,'solicitudes',filas);
 END IF;
 IF operacion<>'crear' THEN
  identificador:=(datos->>'id')::uuid;
  IF tipo_solicitud='credencial' THEN
   SELECT * INTO c FROM public."solicitudCredencial" WHERE id=identificador FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'No encontrada' USING ERRCODE='P0002'; END IF;
   titular:=c."usuarioId"; anterior:=c."estadoSolicitud"; version_actual:=c."actualizadaEn";
  ELSE
   SELECT * INTO p FROM public."propuestaEvento" WHERE id=identificador FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'No encontrada' USING ERRCODE='P0002'; END IF;
   titular:=p."propuestoPor"; anterior:=p."estadoRevision"; version_actual:=p."actualizadoEn";
  END IF;
  IF titular<>actor AND NOT personal THEN RAISE EXCEPTION 'Solicitud ajena' USING ERRCODE='42501'; END IF;
  IF operacion='obtener' THEN
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k<>'id') THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
   RETURN privado.solicitud_para_atencion(tipo_solicitud,identificador,personal);
  END IF;
  IF (CASE WHEN tipo_solicitud='credencial' THEN datos->>'actualizadaEn' ELSE datos->>'actualizadoEn' END)::timestamptz IS DISTINCT FROM version_actual
  THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
 END IF;
 IF tipo_solicitud='credencial' THEN
  IF operacion='crear' THEN
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('tipoSolicitud','observaciones'))
   OR coalesce(datos->>'tipoSolicitud','') NOT IN ('obtencion','renovacion') THEN RAISE EXCEPTION 'Tipo inválido' USING ERRCODE='22023'; END IF;
   nota:=nullif(btrim(datos->>'observaciones'),'');
   IF length(nota)>1000 OR (datos ? 'observaciones' AND jsonb_typeof(datos->'observaciones') NOT IN ('string','null')) THEN RAISE EXCEPTION 'Observaciones inválidas' USING ERRCODE='22023'; END IF;
   INSERT INTO public."solicitudCredencial"("usuarioId","tipoSolicitud",observaciones)
    VALUES(actor,datos->>'tipoSolicitud',nota) RETURNING id INTO identificador;
   nuevo:='recibida';
  ELSIF operacion='resolver' THEN
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('id','actualizadaEn','estadoSolicitud','fechaCita','observaciones')) THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
   nuevo:=datos->>'estadoSolicitud'; nota:=nullif(btrim(datos->>'observaciones'),'');
   IF nuevo IS NULL OR nuevo NOT IN ('en_atencion','cita_programada','atendida','rechazada','cancelada')
   OR anterior NOT IN ('recibida','en_atencion','cita_programada') OR (nuevo=anterior AND nuevo<>'cita_programada')
   OR (anterior='recibida' AND nuevo='atendida') THEN RAISE EXCEPTION 'Transición no permitida' USING ERRCODE='55000'; END IF;
   IF (datos ? 'observaciones' AND jsonb_typeof(datos->'observaciones') NOT IN ('string','null'))
   OR length(nota)>1000 OR (nuevo IN ('rechazada','cancelada') AND nota IS NULL) THEN RAISE EXCEPTION 'Motivo requerido' USING ERRCODE='23514'; END IF;
   IF nuevo='cita_programada' THEN
    IF coalesce(datos->>'fechaCita','') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' THEN RAISE EXCEPTION 'Cita con zona horaria requerida' USING ERRCODE='23514'; END IF;
    cita:=(datos->>'fechaCita')::timestamptz;
    IF cita<=statement_timestamp() THEN RAISE EXCEPTION 'La cita debe ser futura' USING ERRCODE='23514'; END IF;
    IF nuevo=anterior AND cita IS NOT DISTINCT FROM c."fechaCita" THEN RAISE EXCEPTION 'La cita no cambió' USING ERRCODE='55000'; END IF;
   ELSE cita:=CASE WHEN nuevo IN ('atendida','rechazada','cancelada') THEN c."fechaCita" ELSE NULL END; END IF;
   UPDATE public."solicitudCredencial" SET "estadoSolicitud"=nuevo,"fechaCita"=cita,"atendidaPor"=actor,
    observaciones=nota WHERE id=identificador;
  ELSE RAISE EXCEPTION 'Operación inválida' USING ERRCODE='22023'; END IF;
 ELSE
  IF operacion IN ('crear','corregir') THEN
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('id','actualizadoEn','tituloPropuesta','descripcion','tipoPropuesta','publicoDirigido','necesidadEspacio','frecuenciaReunion','diasSolicitados','horarioSolicitado','abiertaAlPublico','sinFinesDeLucro','motivoCambio'))
   OR (operacion='crear' AND (datos ? 'id' OR datos ? 'actualizadoEn' OR datos ? 'motivoCambio'))
   THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM unnest(ARRAY['tituloPropuesta','descripcion','tipoPropuesta','publicoDirigido','necesidadEspacio','frecuenciaReunion','diasSolicitados','horarioSolicitado']) k
    WHERE jsonb_typeof(datos->k) IS DISTINCT FROM 'string' OR length(btrim(datos->>k))<1
    OR length(datos->>k)>CASE k WHEN 'tituloPropuesta' THEN 200 WHEN 'tipoPropuesta' THEN 100 WHEN 'publicoDirigido' THEN 500 WHEN 'frecuenciaReunion' THEN 200 WHEN 'diasSolicitados' THEN 200 WHEN 'horarioSolicitado' THEN 200 ELSE 5000 END)
   OR datos->'abiertaAlPublico' IS DISTINCT FROM 'true'::jsonb OR datos->'sinFinesDeLucro' IS DISTINCT FROM 'true'::jsonb
   THEN RAISE EXCEPTION 'Datos o confirmaciones incompletos' USING ERRCODE='23514'; END IF;
   nuevo:='en_revision';
   nota:='La persona confirmó que la actividad es abierta al público y sin fines de lucro.';
   IF operacion='crear' THEN
    INSERT INTO public."propuestaEvento"("tituloPropuesta",descripcion,"tipoPropuesta","publicoDirigido","necesidadEspacio","estadoRevision","propuestoPor","frecuenciaReunion","diasSolicitados","horarioSolicitado")
    VALUES(btrim(datos->>'tituloPropuesta'),btrim(datos->>'descripcion'),btrim(datos->>'tipoPropuesta'),btrim(datos->>'publicoDirigido'),btrim(datos->>'necesidadEspacio'),nuevo,actor,btrim(datos->>'frecuenciaReunion'),btrim(datos->>'diasSolicitados'),btrim(datos->>'horarioSolicitado')) RETURNING id INTO identificador;
   ELSE
    IF titular<>actor THEN RAISE EXCEPTION 'Solo corrige su titular' USING ERRCODE='42501'; END IF;
    IF p."actividadId" IS NOT NULL OR anterior NOT IN ('borrador','en_revision','requiere_correccion','aprobada') THEN RAISE EXCEPTION 'No admite correcciones' USING ERRCODE='55000'; END IF;
    nota:=btrim(coalesce(datos->>'motivoCambio',''));
    IF jsonb_typeof(datos->'motivoCambio') IS DISTINCT FROM 'string' OR length(nota) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Explica el motivo de la corrección' USING ERRCODE='23514'; END IF;
    UPDATE public."propuestaEvento" SET "tituloPropuesta"=btrim(datos->>'tituloPropuesta'),descripcion=btrim(datos->>'descripcion'),
     "tipoPropuesta"=btrim(datos->>'tipoPropuesta'),"publicoDirigido"=btrim(datos->>'publicoDirigido'),"necesidadEspacio"=btrim(datos->>'necesidadEspacio'),
     "frecuenciaReunion"=btrim(datos->>'frecuenciaReunion'),"diasSolicitados"=btrim(datos->>'diasSolicitados'),"horarioSolicitado"=btrim(datos->>'horarioSolicitado'),
     "estadoRevision"=nuevo,"revisadoPor"=NULL,"observacionesInstitucionales"=NULL,"actualizadoEn"=clock_timestamp() WHERE id=identificador;
   END IF;
  ELSIF operacion='cancelar' THEN
   IF titular<>actor THEN RAISE EXCEPTION 'Solo cancela su titular' USING ERRCODE='42501'; END IF;
   IF p."actividadId" IS NOT NULL OR anterior NOT IN ('borrador','en_revision','requiere_correccion') THEN RAISE EXCEPTION 'La propuesta aprobada requiere el flujo autorizado de cambios' USING ERRCODE='55000'; END IF;
   IF datos-ARRAY['id','actualizadoEn','motivoCambio']<>'{}'::jsonb THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
   nota:=btrim(coalesce(datos->>'motivoCambio',''));
   IF jsonb_typeof(datos->'motivoCambio') IS DISTINCT FROM 'string' OR length(nota) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Motivo requerido' USING ERRCODE='23514'; END IF;
   nuevo:='cancelada';
   UPDATE public."propuestaEvento" SET "estadoRevision"=nuevo,"actualizadoEn"=clock_timestamp() WHERE id=identificador;
  ELSIF operacion='resolver' THEN
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('id','actualizadoEn','estadoRevision','observacionesInstitucionales','acuerdoDireccion')) THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
   IF titular=actor THEN RAISE EXCEPTION 'No puedes resolver tu propia propuesta' USING ERRCODE='42501'; END IF;
   nuevo:=datos->>'estadoRevision'; nota:=nullif(btrim(datos->>'observacionesInstitucionales'),'');
   IF nuevo IS NULL OR nuevo NOT IN ('requiere_correccion','aprobada','rechazada') OR anterior<>'en_revision' THEN RAISE EXCEPTION 'Transición no permitida' USING ERRCODE='55000'; END IF;
   IF (datos ? 'observacionesInstitucionales' AND jsonb_typeof(datos->'observacionesInstitucionales') NOT IN ('string','null'))
   OR length(nota)>5000 OR nota IS NULL THEN RAISE EXCEPTION 'Motivo requerido' USING ERRCODE='23514'; END IF;
   -- A04 registra un acuerdo externo; el permiso no lo convierte en dirección.
   IF nuevo IN ('aprobada','rechazada') THEN
    acuerdo:=datos->'acuerdoDireccion';
    IF jsonb_typeof(acuerdo) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Registra el acuerdo de dirección' USING ERRCODE='23514'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_object_keys(acuerdo) k WHERE k NOT IN ('responsable','fecha','referencia'))
    OR EXISTS(SELECT 1 FROM unnest(ARRAY['responsable','fecha','referencia']) k
      WHERE jsonb_typeof(acuerdo->k) IS DISTINCT FROM 'string' OR length(btrim(acuerdo->>k))<1
      OR length(acuerdo->>k)>CASE k WHEN 'responsable' THEN 200 WHEN 'referencia' THEN 500 ELSE 10 END)
    OR coalesce(acuerdo->>'fecha','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    THEN RAISE EXCEPTION 'Acuerdo de dirección incompleto' USING ERRCODE='23514'; END IF;
    BEGIN fecha_acuerdo:=(acuerdo->>'fecha')::date;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
     RAISE EXCEPTION 'Fecha del acuerdo inválida' USING ERRCODE='23514'; END;
    IF NOT isfinite(fecha_acuerdo) OR fecha_acuerdo>(statement_timestamp() AT TIME ZONE 'America/Mazatlan')::date
    THEN RAISE EXCEPTION 'Fecha del acuerdo futura o inválida' USING ERRCODE='23514'; END IF;
    acuerdo:=jsonb_build_object('responsable',btrim(acuerdo->>'responsable'),'fecha',fecha_acuerdo,'referencia',btrim(acuerdo->>'referencia'));
   ELSIF datos->'acuerdoDireccion' IS NOT NULL AND datos->'acuerdoDireccion'<>'null'::jsonb THEN
    RAISE EXCEPTION 'Pedir correcciones no es una resolución de dirección' USING ERRCODE='23514';
   END IF;
   UPDATE public."propuestaEvento" SET "estadoRevision"=nuevo,"observacionesInstitucionales"=nota,"revisadoPor"=actor WHERE id=identificador;
  ELSE RAISE EXCEPTION 'Operación inválida' USING ERRCODE='22023'; END IF;
 END IF;
 IF tipo_solicitud='propuesta' AND operacion IN ('corregir','cancelar') THEN
  PERFORM privado.guardar_version_solicitud('propuesta',identificador,operacion,nota,to_jsonb(p),
   (SELECT to_jsonb(pp) FROM public."propuestaEvento" pp WHERE pp.id=identificador),actor);
 END IF;
 INSERT INTO privado."historialSolicitud"("solicitudCredencialId","propuestaEventoId",accion,"estadoAnterior","estadoNuevo",nota,"realizadoPor","acuerdoDireccion")
 VALUES(CASE WHEN tipo_solicitud='credencial' THEN identificador END,CASE WHEN tipo_solicitud='propuesta' THEN identificador END,operacion,anterior,nuevo,nota,actor,acuerdo);
 RETURN privado.solicitud_para_atencion(tipo_solicitud,identificador,personal AND operacion='resolver');
END; $$;

CREATE OR REPLACE FUNCTION privado.solicitudes_espacio(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $$
#variable_conflict use_variable
DECLARE
  actor uuid;
  claves text[];
  solicitud public."solicitudEspacio"%ROWTYPE;
  v_tipo text; v_espacio public."espacio"%ROWTYPE; v_fecha date; v_inicio time; v_fin time;
  v_desde timestamptz; v_hasta timestamptz; v_personas integer; v_motivo text; v_institucion text; v_anterior jsonb;
  v_nombre text; v_telefono text; v_correo text; v_nota text; v_comentarios text;
  v_estado text; limite integer; desplazamiento integer; resultado jsonb; total integer;
BEGIN
  IF operacion IS NULL OR operacion NOT IN ('areas', 'enviar', 'listar', 'obtener', 'cancelar', 'responder')
     OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
  END IF;

  -- Cualquier cuenta con sesión vigente, perfil activo y correo confirmado.
  -- HU-16: no se exige credencial bibliotecaria.
  actor := privado.comprobar_sesion_cuenta();

  claves := CASE operacion
    WHEN 'areas'     THEN ARRAY[]::text[]
    WHEN 'enviar'    THEN ARRAY['tipo', 'espacio', 'fecha', 'horaInicio', 'horaFin', 'personas', 'motivo', 'institucion']
    WHEN 'listar'    THEN ARRAY['estado', 'limite', 'desplazamiento']
    WHEN 'obtener'   THEN ARRAY['folio']
    WHEN 'cancelar'  THEN ARRAY['folio', 'motivo', 'comentarios', 'actualizadoEn']
    WHEN 'responder' THEN ARRAY['folio', 'acepta', 'comentarios', 'actualizadoEn'] END;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE k <> ALL (claves)) THEN
    RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE = '22023';
  END IF;

  -- Áreas que se pueden solicitar (las activas)
  IF operacion = 'areas' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('slug', e."slug", 'nombre', e."nombre",
             'capacidad', e."capacidad", 'descripcion', e."descripcion") ORDER BY e."nombre"), '[]'::jsonb)
    INTO resultado FROM public."espacio" e WHERE e."activo";
    RETURN resultado;
  END IF;

  IF operacion = 'enviar' THEN
    v_tipo := coalesce(nullif(datos->>'tipo', ''), 'uso_espacio');
    IF v_tipo NOT IN ('visita', 'uso_espacio') THEN
      RAISE EXCEPTION 'Tipo de solicitud inválido.' USING ERRCODE = '23514';
    END IF;

    -- El espacio es obligatorio para uso de espacio y opcional para una visita.
    IF nullif(datos->>'espacio', '') IS NOT NULL THEN
      SELECT * INTO v_espacio FROM public."espacio" e WHERE e."slug" = datos->>'espacio' AND e."activo";
      IF NOT FOUND THEN
        RAISE EXCEPTION 'El área no existe o no se puede solicitar.' USING ERRCODE = '23514';
      END IF;
    ELSIF v_tipo = 'uso_espacio' THEN
      RAISE EXCEPTION 'Elige el área que quieres solicitar.' USING ERRCODE = '23514';
    END IF;

    BEGIN
      v_fecha := (datos->>'fecha')::date;
      v_inicio := (datos->>'horaInicio')::time;
      v_fin := (datos->>'horaFin')::time;
      v_personas := (datos->>'personas')::integer;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation
              OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Revisa la fecha, el horario y el número de personas.' USING ERRCODE = '23514';
    END;
    IF v_fecha IS NULL OR v_inicio IS NULL OR v_fin IS NULL OR v_personas IS NULL THEN
      RAISE EXCEPTION 'Faltan campos obligatorios.' USING ERRCODE = '23514';
    END IF;
    -- Horario de la biblioteca (Tepic)
    v_desde := (v_fecha + v_inicio) AT TIME ZONE 'America/Mazatlan';
    v_hasta := (v_fecha + v_fin) AT TIME ZONE 'America/Mazatlan';
    IF v_hasta <= v_desde THEN
      RAISE EXCEPTION 'La hora de término debe ser después de la de inicio.' USING ERRCODE = '23514';
    END IF;
    IF v_desde <= now() THEN
      RAISE EXCEPTION 'Elige una fecha y hora futuras.' USING ERRCODE = '23514';
    END IF;
    IF v_fecha > (now() AT TIME ZONE 'America/Mazatlan')::date + 365 THEN
      RAISE EXCEPTION 'Solo se reciben solicitudes para los próximos 12 meses.' USING ERRCODE = '23514';
    END IF;
    IF v_personas < 1 OR v_personas > 200 THEN
      RAISE EXCEPTION 'El número de personas debe estar entre 1 y 200.' USING ERRCODE = '23514';
    END IF;
    IF v_espacio.id IS NOT NULL AND v_espacio."capacidad" > 0 AND v_personas > v_espacio."capacidad" THEN
      RAISE EXCEPTION 'El área admite hasta % personas.', v_espacio."capacidad" USING ERRCODE = '23514';
    END IF;

    v_motivo := btrim(coalesce(datos->>'motivo', ''));
    IF v_motivo = '' OR length(v_motivo) > 300 THEN
      RAISE EXCEPTION 'Describe la actividad en 300 caracteres o menos.' USING ERRCODE = '23514';
    END IF;
    v_institucion := nullif(btrim(coalesce(datos->>'institucion', '')), '');
    IF length(v_institucion) > 150 THEN
      RAISE EXCEPTION 'El nombre de la institución es muy largo.' USING ERRCODE = '22001';
    END IF;

    -- Evita llenar la bandeja del personal: hasta 5 solicitudes abiertas por cuenta.
    IF (SELECT count(*) FROM public."solicitudEspacio" s
        WHERE s."solicitadoPor" = actor AND s."estadoSolicitud" IN ('borrador', 'en_revision', 'requiere_correccion')) >= 5 THEN
      RAISE EXCEPTION 'Ya tienes 5 solicitudes en revisión. Espera respuesta o cancela alguna.' USING ERRCODE = '55000';
    END IF;

    -- Contacto desde el perfil y la cuenta (no se acepta del navegador)
    SELECT concat_ws(' ', p."nombres", p."primerApellido", p."segundoApellido"), p."telefono", u."email"
    INTO v_nombre, v_telefono, v_correo
    FROM public.perfil p JOIN auth.users u ON u.id = p.id WHERE p.id = actor;

    INSERT INTO public."solicitudEspacio" ("tipoSolicitud", "propositoVisita", "cantidadPersonas",
      "espacioSolicitadoId", "fechaInicioSolicitado", "fechaFinSolicitado", "estadoSolicitud",
      "solicitadoPor", "nombreInstitucion", "nombreResponsable", "telefonoContacto", "correoContacto")
    VALUES (v_tipo, v_motivo, v_personas, v_espacio.id, v_desde, v_hasta, 'en_revision',
      actor, v_institucion, v_nombre, v_telefono, v_correo)
    RETURNING * INTO solicitud;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "realizadoPor")
    VALUES (solicitud.id, 'envio', actor);
    RETURN privado.solicitud_espacio_para_usuario(solicitud);
  END IF;

  -- Mis solicitudes, de la más reciente a la más antigua
  IF operacion = 'listar' THEN
    v_estado := nullif(datos->>'estado', '');
    IF v_estado IS NOT NULL AND v_estado NOT IN
       ('en_revision', 'requiere_correccion', 'aprobada', 'rechazada', 'cancelada') THEN
      RAISE EXCEPTION 'Estado inválido.' USING ERRCODE = '22023';
    END IF;
    BEGIN
      limite := coalesce((datos->>'limite')::integer, 25);
      desplazamiento := coalesce((datos->>'desplazamiento')::integer, 0);
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE = '22023';
    END;
    IF limite NOT BETWEEN 1 AND 100 OR desplazamiento NOT BETWEEN 0 AND 100000 THEN
      RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO total FROM public."solicitudEspacio" s
    WHERE s."solicitadoPor" = actor AND (v_estado IS NULL OR s."estadoSolicitud" = v_estado);
    SELECT coalesce(jsonb_agg(privado.solicitud_espacio_para_usuario(s) - 'historial'
                              ORDER BY s."creadaEn" DESC, s.id DESC), '[]'::jsonb)
    INTO resultado
    FROM (SELECT * FROM public."solicitudEspacio" s
          WHERE s."solicitadoPor" = actor AND (v_estado IS NULL OR s."estadoSolicitud" = v_estado)
          ORDER BY s."creadaEn" DESC, s.id DESC LIMIT limite OFFSET desplazamiento) s;
    RETURN jsonb_build_object('total', total, 'solicitudes', resultado);
  END IF;

  -- Una solicitud propia por folio
  SELECT * INTO solicitud FROM public."solicitudEspacio" s
  WHERE s."folio" = datos->>'folio' AND s."solicitadoPor" = actor
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF operacion = 'obtener' THEN
    RETURN privado.solicitud_espacio_para_usuario(solicitud);
  END IF;

  IF (datos->>'actualizadoEn')::timestamptz IS DISTINCT FROM solicitud."actualizadoEn" THEN
   RAISE EXCEPTION 'La solicitud cambió. Recarga antes de continuar.' USING ERRCODE='40001'; END IF;
  v_anterior:=to_jsonb(solicitud);
  v_comentarios := nullif(btrim(coalesce(datos->>'comentarios', '')), '');
  IF length(v_comentarios) > 300 THEN
    RAISE EXCEPTION 'Los comentarios son muy largos.' USING ERRCODE = '22001';
  END IF;

  IF operacion = 'cancelar' THEN
    IF solicitud."estadoSolicitud" NOT IN ('borrador', 'en_revision', 'requiere_correccion') THEN
      RAISE EXCEPTION 'Esta solicitud ya no se puede cancelar desde aquí.' USING ERRCODE = '55000';
    END IF;
    v_nota := nullif(btrim(coalesce(datos->>'motivo', '')), '');
    IF v_nota IS NULL OR length(v_nota) > 120 THEN
      RAISE EXCEPTION 'El motivo o los comentarios son muy largos.' USING ERRCODE = '22001';
    END IF;
    UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'cancelada', "canceladaEn" = now(),
      "motivoCancelacion" = v_nota, "propuesta" = NULL
    WHERE id = solicitud.id RETURNING * INTO solicitud;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "nota", "detalles", "realizadoPor")
    VALUES (solicitud.id, 'cancelacion', v_nota,
            CASE WHEN v_comentarios IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('comentarios', v_comentarios) END,
            actor);
    PERFORM privado.guardar_version_solicitud('espacio',solicitud.id,operacion,
      coalesce(v_nota,v_comentarios,CASE WHEN coalesce((datos->>'acepta')::boolean,false) THEN 'Acepta la alternativa del personal' ELSE 'Solicita otra revisión' END),
      v_anterior,to_jsonb(solicitud),actor);
    RETURN privado.solicitud_espacio_para_usuario(solicitud);
  END IF;

  -- Responder la propuesta del personal. En ambos casos vuelve a revisión (criterio 4):
  -- si acepta, lo propuesto pasa a ser el acuerdo por confirmar; si no, el personal vuelve a decidir.
  IF operacion = 'responder' THEN
    IF solicitud."estadoSolicitud" <> 'requiere_correccion' THEN
      RAISE EXCEPTION 'Esta solicitud no tiene una propuesta por responder.' USING ERRCODE = '55000';
    END IF;
    IF jsonb_typeof(datos->'acepta') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'Indica si aceptas la propuesta.' USING ERRCODE = '23514';
    END IF;
    IF (datos->>'acepta')::boolean THEN
      UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'en_revision',
        "espacioAcordadoId" = (solicitud."propuesta"->>'espacioId')::uuid,
        "inicioAcordado" = (solicitud."propuesta"->>'inicio')::timestamptz,
        "finAcordado" = (solicitud."propuesta"->>'fin')::timestamptz,
        "propuesta" = NULL
      WHERE id = solicitud.id RETURNING * INTO solicitud;
    ELSE
      UPDATE public."solicitudEspacio" SET "estadoSolicitud" = 'en_revision', "propuesta" = NULL
      WHERE id = solicitud.id RETURNING * INTO solicitud;
    END IF;
    INSERT INTO public."historialSolicitudEspacio" ("solicitudId", "accion", "nota", "detalles", "realizadoPor")
    VALUES (solicitud.id, 'respuesta', v_comentarios,
            jsonb_build_object('acepta', (datos->>'acepta')::boolean), actor);
    PERFORM privado.guardar_version_solicitud('espacio',solicitud.id,operacion,
      coalesce(v_nota,v_comentarios,CASE WHEN coalesce((datos->>'acepta')::boolean,false) THEN 'Acepta la alternativa del personal' ELSE 'Solicita otra revisión' END),
      v_anterior,to_jsonb(solicitud),actor);
    RETURN privado.solicitud_espacio_para_usuario(solicitud);
  END IF;

  RAISE EXCEPTION 'Petición inválida.' USING ERRCODE = '22023';
END;
$$;


CREATE OR REPLACE FUNCTION privado.solicitud_para_atencion(tipo text,identificador uuid,personal boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE r jsonb; titular uuid; p public.perfil%ROWTYPE;
BEGIN
 IF tipo='credencial' THEN
  SELECT jsonb_build_object('id',s.id,'usuarioId',s."usuarioId",'tipoSolicitud',s."tipoSolicitud",
   'estadoSolicitud',s."estadoSolicitud",'fechaCita',s."fechaCita",'atendidaPor',s."atendidaPor",
   'observaciones',s.observaciones,'creadaEn',s."creadaEn",'actualizadaEn',s."actualizadaEn"),s."usuarioId"
  INTO r,titular FROM public."solicitudCredencial" s WHERE s.id=identificador;
 ELSE
  SELECT jsonb_build_object('id',s.id,'tituloPropuesta',s."tituloPropuesta",'descripcion',s.descripcion,
   'tipoPropuesta',s."tipoPropuesta",'publicoDirigido',s."publicoDirigido",'necesidadEspacio',s."necesidadEspacio",
   'estadoRevision',s."estadoRevision",'observacionesInstitucionales',s."observacionesInstitucionales",
   'propuestoPor',s."propuestoPor",'revisadoPor',s."revisadoPor",'actividadId',s."actividadId",
   'creadaEn',s."creadaEn",'actualizadoEn',s."actualizadoEn",'frecuenciaReunion',s."frecuenciaReunion",
   'diasSolicitados',s."diasSolicitados",'horarioSolicitado',s."horarioSolicitado"),s."propuestoPor"
  INTO r,titular FROM public."propuestaEvento" s WHERE s.id=identificador;
 END IF;
 IF personal THEN
  SELECT * INTO p FROM public.perfil WHERE id=titular;
  r:=r||jsonb_build_object('perfil',jsonb_build_object('nombres',p.nombres,'primerApellido',p."primerApellido",
   'segundoApellido',p."segundoApellido",'telefono',p.telefono)||CASE WHEN tipo='credencial' THEN jsonb_build_object('municipio',p.municipio) ELSE '{}'::jsonb END);
 END IF;
 RETURN r||jsonb_build_object('versiones',coalesce((SELECT jsonb_agg(jsonb_build_object('numero',v.numero,'accion',v.accion,'motivo',v.motivo,'fecha',v.fecha) ORDER BY v.numero) FROM privado."versionSolicitud" v WHERE v.tipo='propuesta' AND v."solicitudId"=identificador AND solicitud_para_atencion.tipo='propuesta'),'[]'::jsonb))||jsonb_build_object('historial',coalesce((SELECT jsonb_agg(jsonb_build_object('accion',h.accion,
  'estadoAnterior',h."estadoAnterior",'estadoNuevo',h."estadoNuevo",'nota',h.nota,'fecha',h.fecha)
   ||CASE WHEN personal THEN jsonb_build_object('registradoPor',h."realizadoPor",'acuerdoDireccion',h."acuerdoDireccion") ELSE '{}'::jsonb END ORDER BY h.fecha,h.id)
  FROM privado."historialSolicitud" h WHERE (tipo='credencial' AND h."solicitudCredencialId"=identificador)
   OR (tipo='propuesta' AND h."propuestaEventoId"=identificador)),'[]'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION privado.solicitud_espacio_para_usuario(s public."solicitudEspacio")
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT jsonb_build_object(
    'folio', s."folio",
    'tipo', s."tipoSolicitud",
    'estado', s."estadoSolicitud",
    'espacio', (SELECT jsonb_build_object('slug', e."slug", 'nombre', e."nombre")
                FROM public."espacio" e WHERE e.id = s."espacioSolicitadoId"),
    'inicio', s."fechaInicioSolicitado",
    'fin', s."fechaFinSolicitado",
    'personas', s."cantidadPersonas",
    'motivo', s."propositoVisita",
    'institucion', s."nombreInstitucion",
    'observaciones', s."observaciones",
    'acuerdo', CASE WHEN s."inicioAcordado" IS NULL THEN NULL ELSE
      privado.tramo_espacio(s."espacioAcordadoId", s."inicioAcordado", s."finAcordado")
      || jsonb_build_object('condiciones', s."condicionesUso") END,
    'propuesta', CASE WHEN s."propuesta" IS NULL THEN NULL ELSE
      privado.tramo_espacio((s."propuesta"->>'espacioId')::uuid, (s."propuesta"->>'inicio')::timestamptz,
                            (s."propuesta"->>'fin')::timestamptz)
      || jsonb_build_object('mensaje', s."propuesta"->>'mensaje') END,
    'creadaEn', s."creadaEn",
    'actualizadoEn', s."actualizadoEn",
    'resueltaEn', s."resueltaEn",
    'canceladaEn', s."canceladaEn",
    'motivoCancelacion', s."motivoCancelacion",
    'versiones',coalesce((SELECT jsonb_agg(jsonb_build_object('numero',v.numero,'accion',v.accion,'motivo',v.motivo,'fecha',v.fecha) ORDER BY v.numero) FROM privado."versionSolicitud" v WHERE v.tipo='espacio' AND v."solicitudId"=s.id),'[]'::jsonb),
    'historial', coalesce((
      SELECT jsonb_agg(jsonb_build_object('accion', h."accion", 'nota', h."nota", 'fecha', h."realizadoEn",
                                          'porPersonal', h."realizadoPor" <> s."solicitadoPor")
                       ORDER BY h."realizadoEn", h.id)
      FROM public."historialSolicitudEspacio" h WHERE h."solicitudId" = s.id), '[]'::jsonb));
$$;
COMMIT;
