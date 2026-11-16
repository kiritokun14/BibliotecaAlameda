-- HU-18 / T-098. Las solicitudes usan la misma inscripción que gestiona el personal.
BEGIN;
CREATE OR REPLACE FUNCTION privado.inscripcion_propia(operacion text, sesion uuid, version timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid := privado.comprobar_sesion_cuenta();
 a public.actividad%ROWTYPE;
 s public."sesionActividad"%ROWTYPE;
 i public.inscripcion%ROWTYPE;
 previo text;
 disponible boolean;
 abierta boolean;
BEGIN
 IF operacion IS NULL OR operacion NOT IN ('consultar','solicitar','cancelar')
 THEN RAISE EXCEPTION 'Operación inválida' USING ERRCODE='22023'; END IF;
 SELECT x.* INTO a FROM public.actividad x JOIN public."sesionActividad" y ON y."actividadId"=x.id
 WHERE y.id=sesion FOR SHARE OF x;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sesión inexistente' USING ERRCODE='P0002'; END IF;
 SELECT * INTO s FROM public."sesionActividad" WHERE id=sesion FOR UPDATE;
 IF NOT FOUND OR s."actividadId"<>a.id THEN RAISE EXCEPTION 'Sesión inexistente' USING ERRCODE='P0002'; END IF;
 SELECT * INTO i FROM public.inscripcion WHERE "sesionId"=sesion AND "usuarioId"=actor;
 IF a."estadoPublicacion"<>'publicada' AND i.id IS NULL
 THEN RAISE EXCEPTION 'Sesión inexistente' USING ERRCODE='P0002'; END IF;
 disponible:=(SELECT count(*) FROM public.inscripcion WHERE "sesionId"=sesion AND status='confirmada')<s.capacidad;
 abierta:=a."estadoPublicacion"='publicada' AND a."requiereInscripcion" AND s."registroAbierto"
          AND s.estado='programada' AND s.inicio>clock_timestamp();
 IF operacion='solicitar' AND (i.status IS NULL OR i.status='cancelada') THEN
  IF NOT abierta THEN RAISE EXCEPTION 'Registro cerrado' USING ERRCODE='55000'; END IF;
  IF NOT disponible THEN RAISE EXCEPTION 'Cupo agotado' USING ERRCODE='23514'; END IF;
  previo:=i.status;
  IF i.id IS NULL THEN
   INSERT INTO public.inscripcion("sesionId","usuarioId") VALUES(sesion,actor) RETURNING * INTO i;
  ELSE
   UPDATE public.inscripcion SET status='pendiente',"decisionPor"=NULL,"decisionRazon"=NULL,
    "decididoA"=NULL,"actualizadoA"=clock_timestamp() WHERE id=i.id RETURNING * INTO i;
  END IF;
  INSERT INTO public."historiaInscripcion" ("inscripcionId","estadoPrevio","estadoNuevo","cambiadoPor",razon)
   VALUES(i.id,previo,'pendiente',actor,'Solicitud desde el portal');
 ELSIF operacion='solicitar' AND i.status='rechazada' THEN
  RAISE EXCEPTION 'Solicitud rechazada' USING ERRCODE='55000';
 ELSIF operacion='cancelar' THEN
  IF i.id IS NULL THEN RAISE EXCEPTION 'Inscripción inexistente' USING ERRCODE='P0002'; END IF;
  IF i.status<>'cancelada' THEN
   IF version IS DISTINCT FROM i."actualizadoA" THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
   IF i.status NOT IN ('pendiente','confirmada') OR s.estado<>'programada' OR s.inicio<=clock_timestamp()
   THEN RAISE EXCEPTION 'Cancelación no disponible' USING ERRCODE='55000'; END IF;
   previo:=i.status;
   UPDATE public.inscripcion SET status='cancelada',"decisionPor"=actor,"decisionRazon"='Cancelación desde el portal',
    "decididoA"=clock_timestamp(),"actualizadoA"=clock_timestamp() WHERE id=i.id RETURNING * INTO i;
   INSERT INTO public."historiaInscripcion" ("inscripcionId","estadoPrevio","estadoNuevo","cambiadoPor",razon)
    VALUES(i.id,previo,'cancelada',actor,'Cancelación desde el portal');
   disponible:=(SELECT count(*) FROM public.inscripcion WHERE "sesionId"=sesion AND status='confirmada')<s.capacidad;
  END IF;
 END IF;
 RETURN jsonb_build_object('id',i.id,'estado',i.status,'actualizadoA',i."actualizadoA",
  'registroAbierto',abierta,'hayCupo',disponible,'puedeCancelar',coalesce(i.status IN ('pendiente','confirmada')
  AND s.estado='programada' AND s.inicio>clock_timestamp(),false));
END;
$$;
CREATE OR REPLACE FUNCTION public.inscripcion_propia(operacion text,sesion uuid,version timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.inscripcion_propia(operacion,sesion,version);
$$;
REVOKE ALL ON FUNCTION privado.inscripcion_propia(text,uuid,timestamptz),public.inscripcion_propia(text,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.inscripcion_propia(text,uuid,timestamptz),public.inscripcion_propia(text,uuid,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION privado.mis_inscripciones(pagina integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid := privado.comprobar_sesion_cuenta();
BEGIN
 IF pagina IS NULL OR pagina NOT BETWEEN 0 AND 5000 THEN RAISE EXCEPTION 'Página inválida' USING ERRCODE='22023'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.inicio DESC,x.id),'[]'::jsonb)
 FROM (SELECT i.id,i.status,a.folio,a.titulo,s.inicio,s.id AS "sesionId",a."estadoPublicacion"='publicada' AS publicada
 FROM public.inscripcion i JOIN public."sesionActividad" s ON s.id=i."sesionId"
 JOIN public.actividad a ON a.id=s."actividadId" WHERE i."usuarioId"=actor
 ORDER BY s.inicio DESC,i.id LIMIT 21 OFFSET pagina*20) x);
END;
$$;
CREATE OR REPLACE FUNCTION public.mis_inscripciones(pagina integer)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.mis_inscripciones(pagina);
$$;
REVOKE ALL ON FUNCTION privado.mis_inscripciones(integer),public.mis_inscripciones(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.mis_inscripciones(integer),public.mis_inscripciones(integer) TO authenticated;
COMMIT;
