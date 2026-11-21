-- T-094 / T-096: resolución de una sesión y avisos transaccionales.
BEGIN;
CREATE OR REPLACE FUNCTION privado.resolver_cambio_sesion(folio text, sesion uuid, datos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid := privado.comprobar_sesion_cuenta();
 a public.actividad%ROWTYPE;
 s public."sesionActividad"%ROWTYPE;
 sala public.espacio%ROWTYPE;
 accion text := datos->>'accion';
 motivo text := btrim(datos->>'motivo');
 inicio_nuevo timestamptz;
 fin_nuevo timestamptz;
 anterior text;
 cambio text;
 identificador uuid;
 avisados integer;
BEGIN
 IF accion IS NULL OR accion NOT IN ('reprogramar','cancelar') OR coalesce(length(motivo),0) NOT BETWEEN 1 AND 1000
    OR datos->'confirmacion' IS DISTINCT FROM 'true'::jsonb
 THEN RAISE EXCEPTION 'Decisión incompleta' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM public.actividad x WHERE x.folio=resolver_cambio_sesion.folio FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Actividad inexistente' USING ERRCODE='P0002'; END IF;
 IF NOT privado.permiso_agenda(actor,'registrar_resoluciones_actividades',a.id)
 THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM public."sesionActividad" WHERE id=sesion AND "actividadId"=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sesión inexistente' USING ERRCODE='P0002'; END IF;
 IF (datos->>'actualizado')::timestamptz IS DISTINCT FROM a."actualizadoEn"
 THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
 IF a."estadoPublicacion"<>'publicada' OR s.estado<>'programada' OR s.inicio<=clock_timestamp()
 THEN RAISE EXCEPTION 'Solo se modifican sesiones futuras publicadas' USING ERRCODE='55000'; END IF;
 SELECT nombre INTO anterior FROM public.espacio WHERE id=s."espacioId";
 anterior:=to_char(s.inicio AT TIME ZONE 'America/Mazatlan','DD/MM/YYYY HH24:MI')||'–'||
   to_char(s.fin AT TIME ZONE 'America/Mazatlan','HH24:MI')||' · '||anterior;
 IF accion='reprogramar' THEN
  inicio_nuevo:=((datos->>'fecha')::date+(datos->>'inicio')::time) AT TIME ZONE 'America/Mazatlan';
  fin_nuevo:=((datos->>'fecha')::date+(datos->>'fin')::time) AT TIME ZONE 'America/Mazatlan';
  IF inicio_nuevo IS NULL OR fin_nuevo IS NULL OR inicio_nuevo<=clock_timestamp() OR fin_nuevo<=inicio_nuevo
  THEN RAISE EXCEPTION 'Horario inválido' USING ERRCODE='23514'; END IF;
  SELECT * INTO sala FROM public.espacio WHERE nombre=datos->>'espacio' AND activo FOR UPDATE;
  IF NOT FOUND OR sala.capacidad<s.capacidad
  THEN RAISE EXCEPTION 'Espacio o capacidad inválidos' USING ERRCODE='23514'; END IF;
  IF (s.inicio,s.fin,s."espacioId")=(inicio_nuevo,fin_nuevo,sala.id)
  THEN RAISE EXCEPTION 'No hay cambios' USING ERRCODE='22023'; END IF;
  IF EXISTS (SELECT 1 FROM public."solicitudEspacio" e WHERE e."espacioAcordadoId"=sala.id
     AND e."estadoSolicitud"='aprobada' AND e."inicioAcordado"<fin_nuevo AND e."finAcordado">inicio_nuevo)
  THEN RAISE EXCEPTION 'Espacio reservado' USING ERRCODE='23514'; END IF;
  UPDATE public."sesionActividad" SET inicio=inicio_nuevo,fin=fin_nuevo,"espacioId"=sala.id WHERE id=s.id;
  cambio:='Nueva sesión: '||to_char(inicio_nuevo AT TIME ZONE 'America/Mazatlan','DD/MM/YYYY HH24:MI')||'–'||
    to_char(fin_nuevo AT TIME ZONE 'America/Mazatlan','HH24:MI')||' · '||sala.nombre||'. Antes: '||anterior||'.';
 ELSE
  UPDATE public."sesionActividad" SET estado='cancelada',"registroAbierto"=false WHERE id=s.id;
  cambio:='Sesión cancelada: '||anterior||'.';
 END IF;
 INSERT INTO public."solicitudCambioActividad" ("actividadId","sesionId","tipoSolicitud","detalleSolicitado",motivo,
  "estadoSolicitud","solicitadaPor","revisadaPor",resolucion,"resueltaEn")
 VALUES(a.id,s.id,CASE WHEN accion='cancelar' THEN 'cancelacion' ELSE 'cambio' END,cambio,motivo,
  'aprobada',actor,actor,cambio,clock_timestamp()) RETURNING id INTO identificador;
 INSERT INTO privado."historialActividad" ("actividadId",accion,motivo,referencia,"realizadoPor")
 VALUES(a.id,CASE WHEN accion='cancelar' THEN 'cancelar_sesion' ELSE 'reprogramar_sesion' END,motivo,cambio,actor);
 INSERT INTO public."avisoNotificacion" ("usuarioId",titulo,"cuerpoAviso","tipoAviso","estadoEnvio","canalUtilizado")
 SELECT i."usuarioId",CASE WHEN accion='cancelar' THEN 'Sesión cancelada · ' ELSE 'Sesión reprogramada · ' END||a.titulo,
  cambio||' Horario de Tepic.', 'cambio_actividad','entregado','portal'
 FROM public.inscripcion i WHERE i."sesionId"=s.id AND i.status IN ('pendiente','confirmada');
 GET DIAGNOSTICS avisados = ROW_COUNT;
 IF accion='cancelar' THEN
  INSERT INTO public."historiaInscripcion" ("inscripcionId","estadoPrevio","estadoNuevo","cambiadoPor",razon)
   SELECT id,status,'cancelada',actor,'Sesión cancelada' FROM public.inscripcion
   WHERE "sesionId"=s.id AND status IN ('pendiente','confirmada');
  UPDATE public.inscripcion SET status='cancelada',"decisionPor"=actor,"decisionRazon"='Sesión cancelada',
   "decididoA"=clock_timestamp(),"actualizadoA"=clock_timestamp()
   WHERE "sesionId"=s.id AND status IN ('pendiente','confirmada');
 END IF;
 UPDATE public.actividad SET "actualizadoEn"=clock_timestamp() WHERE id=a.id;
 RETURN jsonb_build_object('folioCambio',identificador,'avisos',avisados);
END;
$$;
CREATE OR REPLACE FUNCTION public.resolver_cambio_sesion(folio text,sesion uuid,datos jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.resolver_cambio_sesion(folio,sesion,datos);
$$;
REVOKE ALL ON FUNCTION privado.resolver_cambio_sesion(text,uuid,jsonb),public.resolver_cambio_sesion(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.resolver_cambio_sesion(text,uuid,jsonb),public.resolver_cambio_sesion(text,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION privado.mis_avisos_actividad(pagina integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid := privado.comprobar_sesion_cuenta();
BEGIN
 IF pagina IS NULL OR pagina NOT BETWEEN 0 AND 5000
 THEN RAISE EXCEPTION 'Página inválida' USING ERRCODE='22023'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x."creadoEn" DESC,x.id DESC),'[]'::jsonb)
 FROM (SELECT id,titulo,"cuerpoAviso","creadoEn" FROM public."avisoNotificacion"
  WHERE "usuarioId"=actor AND "tipoAviso"='cambio_actividad' AND "canalUtilizado"='portal'
  ORDER BY "creadoEn" DESC,id DESC LIMIT 21 OFFSET pagina*20) x);
END;
$$;
CREATE OR REPLACE FUNCTION public.mis_avisos_actividad(pagina integer)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.mis_avisos_actividad(pagina);
$$;
REVOKE ALL ON FUNCTION privado.mis_avisos_actividad(integer),public.mis_avisos_actividad(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.mis_avisos_actividad(integer),public.mis_avisos_actividad(integer) TO authenticated;
COMMIT;
