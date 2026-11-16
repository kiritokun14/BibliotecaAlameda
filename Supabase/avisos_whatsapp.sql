-- T-074: programa de atención MANUAL. No instala tareas automáticas ni proveedores.
BEGIN;
CREATE TABLE privado."seguimientoAvisoManual" (
 "avisoId" uuid PRIMARY KEY REFERENCES public."avisoNotificacion"(id),
 "creadoPor" uuid NOT NULL REFERENCES public.perfil(id),
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 historial jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE privado."seguimientoAvisoManual" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado."seguimientoAvisoManual" FROM PUBLIC,anon,authenticated;

CREATE FUNCTION privado.avisos_whatsapp(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid; identificador uuid; titular uuid; aviso public."avisoNotificacion"%ROWTYPE;
 seguimiento privado."seguimientoAvisoManual"%ROWTYPE; persona public.perfil%ROWTYPE;
 preferencia public."preferenciaUsuario"%ROWTYPE; telefono text; nuevo text; nota text; r jsonb; cantidad bigint;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(privado.permisos_de_cuenta(actor,true)) p
  WHERE p->>'capacidad'='enviar_avisos' AND p->>'ambito'='global') THEN
  RAISE EXCEPTION 'Capacidad requerida' USING ERRCODE='42501';
 END IF;
 IF jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Datos inválidos' USING ERRCODE='22023'; END IF;
 IF operacion NOT IN ('destinatarios','listar','crear','preparar','resultado') OR operacion IS NULL
  OR (operacion='preparar' AND datos-ARRAY['id']<>'{}'::jsonb)
  OR (operacion='listar' AND datos-ARRAY['desplazamiento']<>'{}'::jsonb)
  OR (operacion='destinatarios' AND datos-ARRAY['busqueda']<>'{}'::jsonb) THEN
  RAISE EXCEPTION 'Operación o campos inválidos' USING ERRCODE='22023'; END IF;
 IF operacion='destinatarios' THEN
  IF length(btrim(coalesce(datos->>'busqueda','')))<3 OR length(datos->>'busqueda')>100 THEN
   RAISE EXCEPTION 'Búsqueda inválida' USING ERRCODE='22023'; END IF;
  RETURN (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM (
   SELECT p.id,concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido") AS nombre,p.telefono,
    coalesce(pr."recibirAvisosComunidad",false) AS "recibirAvisosComunidad",
    coalesce(pr."recibirAvisosActividades",false) AS "recibirAvisosActividades",pr."canalPreferido"
   FROM public.perfil p LEFT JOIN public."preferenciaUsuario" pr ON pr.id=p.id
   WHERE p.estatus='activo' AND (position(lower(btrim(datos->>'busqueda')) IN lower(concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido")))>0
    OR p.id::text=datos->>'busqueda') ORDER BY p.nombres,p.id LIMIT 20) t);
 END IF;
 IF operacion='listar' THEN
  IF coalesce((datos->>'desplazamiento')::integer,0) NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Página inválida' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO cantidad FROM privado."seguimientoAvisoManual";
  SELECT coalesce(jsonb_agg(t.r ORDER BY t.fecha DESC,t.id),'[]'::jsonb) INTO r FROM (
   SELECT a.id,a."creadoEn" fecha,to_jsonb(a)||jsonb_build_object('version',s.version,'historial',s.historial,
    'destinatario',concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido")) AS r
   FROM privado."seguimientoAvisoManual" s JOIN public."avisoNotificacion" a ON a.id=s."avisoId"
   JOIN public.perfil p ON p.id=a."usuarioId" ORDER BY a."creadoEn" DESC,a.id
   LIMIT 20 OFFSET coalesce((datos->>'desplazamiento')::integer,0)) t;
  RETURN jsonb_build_object('total',cantidad,'avisos',r);
 END IF;
 identificador:=(datos->>'id')::uuid;
 IF operacion='crear' THEN
  IF datos - ARRAY['id','usuarioId','titulo','cuerpoAviso','tipoAviso'] <> '{}'::jsonb
   OR identificador IS NULL OR length(btrim(coalesce(datos->>'titulo',''))) NOT BETWEEN 1 AND 150
   OR length(btrim(coalesce(datos->>'cuerpoAviso',''))) NOT BETWEEN 1 AND 2000
   OR coalesce(datos->>'tipoAviso','') NOT IN ('atencion','comunidad','actividad') THEN
   RAISE EXCEPTION 'Mensaje inválido' USING ERRCODE='23514'; END IF;
  titular:=(datos->>'usuarioId')::uuid;
 ELSE
  SELECT * INTO aviso FROM public."avisoNotificacion" WHERE id=identificador FOR UPDATE;
  SELECT * INTO seguimiento FROM privado."seguimientoAvisoManual" WHERE "avisoId"=identificador FOR UPDATE;
  IF aviso.id IS NULL OR seguimiento."avisoId" IS NULL THEN RAISE EXCEPTION 'Aviso inexistente' USING ERRCODE='P0002'; END IF;
  titular:=aviso."usuarioId";
 END IF;
 SELECT * INTO persona FROM public.perfil WHERE id=titular;
 IF persona.id IS NULL THEN RAISE EXCEPTION 'Destinatario inexistente' USING ERRCODE='P0002'; END IF;
 IF operacion IN ('crear','preparar') THEN
  IF persona.estatus<>'activo' THEN RAISE EXCEPTION 'Cuenta inactiva' USING ERRCODE='55000'; END IF;
  -- Formato mexicano explícito: diez dígitos nacionales o +52 seguido de diez dígitos.
  telefono:=regexp_replace(persona.telefono,'[\s()+.-]','','g');
  IF telefono ~ '^[0-9]{10}$' THEN telefono:='52'||telefono; END IF;
  IF telefono !~ '^52[0-9]{10}$' THEN RAISE EXCEPTION 'Teléfono mexicano inválido' USING ERRCODE='23514'; END IF;
  SELECT * INTO preferencia FROM public."preferenciaUsuario" WHERE id=titular;
  IF coalesce(CASE WHEN operacion='crear' THEN datos->>'tipoAviso' ELSE aviso."tipoAviso" END,'') IN ('comunidad','actividad')
   AND (preferencia."canalPreferido" IS DISTINCT FROM 'whatsapp_manual'
    OR (CASE WHEN (CASE WHEN operacion='crear' THEN datos->>'tipoAviso' ELSE aviso."tipoAviso" END)='comunidad'
     THEN preferencia."recibirAvisosComunidad" ELSE preferencia."recibirAvisosActividades" END) IS DISTINCT FROM true) THEN
   RAISE EXCEPTION 'Difusión no autorizada' USING ERRCODE='55000'; END IF;
 END IF;
 IF operacion='crear' THEN
  INSERT INTO public."avisoNotificacion"(id,"usuarioId",titulo,"cuerpoAviso","tipoAviso","canalUtilizado","estadoEnvio")
   VALUES(identificador,titular,btrim(datos->>'titulo'),btrim(datos->>'cuerpoAviso'),datos->>'tipoAviso','whatsapp_manual','pendiente') RETURNING * INTO aviso;
  INSERT INTO privado."seguimientoAvisoManual"("avisoId","creadoPor",historial)
   VALUES(identificador,actor,jsonb_build_array(jsonb_build_object('estado','pendiente','actor',actor,'fecha',clock_timestamp(),'nota','Preparado; aún no enviado.')))
   RETURNING * INTO seguimiento;
 ELSIF operacion='preparar' THEN
  IF aviso."estadoEnvio"<>'pendiente' THEN RAISE EXCEPTION 'No pendiente' USING ERRCODE='55000'; END IF;
  -- Abrir el enlace no modifica el estado, no genera evidencia ni supone entrega.
  RETURN jsonb_build_object('telefono',telefono,'titulo',aviso.titulo,'cuerpoAviso',aviso."cuerpoAviso");
 ELSIF operacion='resultado' THEN
  IF datos - ARRAY['id','version','estadoEnvio','nota'] <> '{}'::jsonb THEN RAISE EXCEPTION 'Campos inválidos' USING ERRCODE='22023'; END IF;
  IF (datos->>'version')::integer IS DISTINCT FROM seguimiento.version THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
  nuevo:=datos->>'estadoEnvio'; nota:=btrim(coalesce(datos->>'nota',''));
  IF length(nota) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Falta evidencia descriptiva' USING ERRCODE='23514'; END IF;
  IF NOT coalesce((aviso."estadoEnvio"='pendiente' AND nuevo IN ('enviado','fallido'))
    OR (aviso."estadoEnvio"='enviado' AND nuevo IN ('entregado','fallido'))
    OR (aviso."estadoEnvio"='fallido' AND nuevo='pendiente'),false) THEN
   RAISE EXCEPTION 'Transición inválida' USING ERRCODE='55000'; END IF;
  UPDATE public."avisoNotificacion" SET "estadoEnvio"=nuevo WHERE id=identificador RETURNING * INTO aviso;
  UPDATE privado."seguimientoAvisoManual" SET version=version+1,historial=historial||jsonb_build_array(
   jsonb_build_object('estado',nuevo,'actor',actor,'fecha',clock_timestamp(),'nota',nota))
   WHERE "avisoId"=identificador RETURNING * INTO seguimiento;
 ELSE RAISE EXCEPTION 'Operación inválida' USING ERRCODE='22023';
 END IF;
 RETURN to_jsonb(aviso)||jsonb_build_object('version',seguimiento.version,'historial',seguimiento.historial,
  'destinatario',concat_ws(' ',persona.nombres,persona."primerApellido",persona."segundoApellido"));
END; $$;
REVOKE ALL ON FUNCTION privado.avisos_whatsapp(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.avisos_whatsapp(text,jsonb) TO authenticated;
CREATE FUNCTION public.avisos_whatsapp(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.avisos_whatsapp(operacion,datos);
$$;
REVOKE ALL ON FUNCTION public.avisos_whatsapp(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.avisos_whatsapp(text,jsonb) TO authenticated;
COMMIT;
