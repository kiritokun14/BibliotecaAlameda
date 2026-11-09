-- Integración adaptada de T-072 / T-075 de Stephanie. Conserva tablas y registros.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS solicitud_credencial_activa_unica
 ON public."solicitudCredencial"("usuarioId") WHERE "estadoSolicitud" IN ('recibida','en_atencion','cita_programada');
CREATE TABLE IF NOT EXISTS privado."historialSolicitud" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 "solicitudCredencialId" uuid REFERENCES public."solicitudCredencial"(id),
 "propuestaEventoId" uuid REFERENCES public."propuestaEvento"(id),
 accion text NOT NULL, "estadoAnterior" text, "estadoNuevo" text NOT NULL,
 nota text, "realizadoPor" uuid NOT NULL REFERENCES public.perfil(id),
 fecha timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (num_nonnulls("solicitudCredencialId","propuestaEventoId")=1)
);
ALTER TABLE privado."historialSolicitud" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."historialSolicitud" FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS historial_solicitud_credencial ON privado."historialSolicitud"("solicitudCredencialId",fecha);
CREATE INDEX IF NOT EXISTS historial_solicitud_propuesta ON privado."historialSolicitud"("propuestaEventoId",fecha);

CREATE OR REPLACE FUNCTION privado.solicitud_propia_vigente(usuario uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 RETURN privado.comprobar_sesion_cuenta()=usuario;
EXCEPTION WHEN insufficient_privilege THEN RETURN false;
END; $$;
REVOKE ALL ON FUNCTION privado.solicitud_propia_vigente(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.solicitud_propia_vigente(uuid) TO authenticated;
-- Mantiene la lectura propia de T-034, comprobando además cuenta y sesión vigentes.
DROP POLICY IF EXISTS "lectura_propia_solicitudCredencial" ON public."solicitudCredencial";
CREATE POLICY "lectura_propia_solicitudCredencial" ON public."solicitudCredencial" FOR SELECT TO authenticated
 USING ("usuarioId"=(SELECT auth.uid()) AND privado.solicitud_propia_vigente("usuarioId"));
DROP POLICY IF EXISTS "lectura_propia_propuestaEvento" ON public."propuestaEvento";
CREATE POLICY "lectura_propia_propuestaEvento" ON public."propuestaEvento" FOR SELECT TO authenticated
 USING ("propuestoPor"=(SELECT auth.uid()) AND privado.solicitud_propia_vigente("propuestoPor"));
-- No se conceden escrituras directas: la RPC realiza validaciones y transiciones atómicas.
REVOKE INSERT,UPDATE,DELETE ON public."solicitudCredencial",public."propuestaEvento" FROM PUBLIC,anon,authenticated;

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
 RETURN r||jsonb_build_object('historial',coalesce((SELECT jsonb_agg(jsonb_build_object('accion',h.accion,
  'estadoAnterior',h."estadoAnterior",'estadoNuevo',h."estadoNuevo",'nota',h.nota,'fecha',h.fecha) ORDER BY h.fecha,h.id)
  FROM privado."historialSolicitud" h WHERE (tipo='credencial' AND h."solicitudCredencialId"=identificador)
   OR (tipo='propuesta' AND h."propuestaEventoId"=identificador)),'[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION privado.solicitud_para_atencion(text,uuid,boolean) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION privado.atencion_solicitudes(tipo_solicitud text,operacion text,datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid; personal boolean; titular uuid; identificador uuid; anterior text; nuevo text; version_actual timestamptz;
 c public."solicitudCredencial"%ROWTYPE; p public."propuestaEvento"%ROWTYPE; nota text;
 limite integer; desplazamiento integer; filtro text; buscar text; total integer; filas jsonb; cita timestamptz;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF tipo_solicitud IS NULL OR tipo_solicitud NOT IN ('credencial','propuesta') OR operacion IS NULL
 OR operacion NOT IN ('crear','mias','listar','obtener','resolver','corregir') OR jsonb_typeof(datos) IS DISTINCT FROM 'object'
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
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('id','actualizadoEn','tituloPropuesta','descripcion','tipoPropuesta','publicoDirigido','necesidadEspacio','frecuenciaReunion','diasSolicitados','horarioSolicitado','abiertaAlPublico','sinFinesDeLucro'))
   OR (operacion='crear' AND (datos ? 'id' OR datos ? 'actualizadoEn'))
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
    IF anterior NOT IN ('borrador','requiere_correccion') THEN RAISE EXCEPTION 'No admite correcciones' USING ERRCODE='55000'; END IF;
    UPDATE public."propuestaEvento" SET "tituloPropuesta"=btrim(datos->>'tituloPropuesta'),descripcion=btrim(datos->>'descripcion'),
     "tipoPropuesta"=btrim(datos->>'tipoPropuesta'),"publicoDirigido"=btrim(datos->>'publicoDirigido'),"necesidadEspacio"=btrim(datos->>'necesidadEspacio'),
     "frecuenciaReunion"=btrim(datos->>'frecuenciaReunion'),"diasSolicitados"=btrim(datos->>'diasSolicitados'),"horarioSolicitado"=btrim(datos->>'horarioSolicitado'),
     "estadoRevision"=nuevo WHERE id=identificador;
   END IF;
  ELSIF operacion='resolver' THEN
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('id','actualizadoEn','estadoRevision','observacionesInstitucionales')) THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
   nuevo:=datos->>'estadoRevision'; nota:=nullif(btrim(datos->>'observacionesInstitucionales'),'');
   IF nuevo IS NULL OR nuevo NOT IN ('requiere_correccion','aprobada','rechazada') OR anterior<>'en_revision' THEN RAISE EXCEPTION 'Transición no permitida' USING ERRCODE='55000'; END IF;
   IF (datos ? 'observacionesInstitucionales' AND jsonb_typeof(datos->'observacionesInstitucionales') NOT IN ('string','null'))
   OR length(nota)>5000 OR (nuevo IN ('requiere_correccion','rechazada') AND nota IS NULL) THEN RAISE EXCEPTION 'Motivo requerido' USING ERRCODE='23514'; END IF;
   UPDATE public."propuestaEvento" SET "estadoRevision"=nuevo,"observacionesInstitucionales"=nota,"revisadoPor"=actor WHERE id=identificador;
  ELSE RAISE EXCEPTION 'Operación inválida' USING ERRCODE='22023'; END IF;
 END IF;
 INSERT INTO privado."historialSolicitud"("solicitudCredencialId","propuestaEventoId",accion,"estadoAnterior","estadoNuevo",nota,"realizadoPor")
 VALUES(CASE WHEN tipo_solicitud='credencial' THEN identificador END,CASE WHEN tipo_solicitud='propuesta' THEN identificador END,operacion,anterior,nuevo,nota,actor);
 RETURN privado.solicitud_para_atencion(tipo_solicitud,identificador,personal AND operacion='resolver');
END; $$;
CREATE OR REPLACE FUNCTION public.atencion_solicitudes(tipo_solicitud text,operacion text,datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog
AS $$ SELECT privado.atencion_solicitudes(tipo_solicitud,operacion,datos); $$;
REVOKE ALL ON FUNCTION privado.atencion_solicitudes(text,text,jsonb),public.atencion_solicitudes(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.atencion_solicitudes(text,text,jsonb),public.atencion_solicitudes(text,text,jsonb) TO authenticated;
COMMIT;
