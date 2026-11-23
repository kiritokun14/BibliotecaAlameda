-- HU-25: cola durable de correo para avisos de cambios de actividades.
BEGIN;
CREATE TABLE IF NOT EXISTS privado.cola_correo_actividad (
 aviso_id uuid PRIMARY KEY REFERENCES public."avisoNotificacion"(id),
 estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','procesando','enviado','fallido','incierto')),
 intento uuid,
 intentos integer NOT NULL DEFAULT 0,
 actualizado timestamptz NOT NULL DEFAULT now(),
 detalle text
);
ALTER TABLE privado.cola_correo_actividad ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON privado.cola_correo_actividad FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION privado.encolar_correo_actividad()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
 IF NEW."canalUtilizado" = 'portal' AND
    (NEW."tipoAviso" = 'cambio_actividad' OR
     (NEW."tipoAviso" = 'actividad' AND NEW.titulo LIKE 'Resolución de actividad · CB-%')) THEN
  INSERT INTO privado.cola_correo_actividad(aviso_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS encolar_correo_actividad ON public."avisoNotificacion";
CREATE TRIGGER encolar_correo_actividad AFTER INSERT ON public."avisoNotificacion"
 FOR EACH ROW EXECUTE FUNCTION privado.encolar_correo_actividad();

CREATE OR REPLACE FUNCTION public.reclamar_correo_actividad()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE trabajo privado.cola_correo_actividad%ROWTYPE; resultado jsonb;
BEGIN
 -- Una interrupción durante SMTP deja el resultado incierto y requiere revisión.
 UPDATE privado.cola_correo_actividad SET estado='incierto', actualizado=clock_timestamp(),
  detalle='El proceso terminó antes de registrar el resultado.'
 WHERE estado='procesando' AND actualizado < clock_timestamp() - interval '5 minutes';
 SELECT * INTO trabajo FROM privado.cola_correo_actividad WHERE estado='pendiente'
  ORDER BY actualizado FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE privado.cola_correo_actividad SET estado='procesando', intento=gen_random_uuid(),
  intentos=intentos+1, actualizado=clock_timestamp() WHERE aviso_id=trabajo.aviso_id
  RETURNING * INTO trabajo;
 SELECT jsonb_build_object('avisoId',n.id,'intento',trabajo.intento,'titulo',n.titulo,
  'cuerpo',n."cuerpoAviso",'correo',u.email) INTO resultado
 FROM public."avisoNotificacion" n JOIN auth.users u ON u.id=n."usuarioId" WHERE n.id=trabajo.aviso_id;
 RETURN resultado;
END; $$;

CREATE OR REPLACE FUNCTION public.finalizar_correo_actividad(p_aviso uuid, p_intento uuid, p_estado text, p_detalle text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
 IF p_estado NOT IN ('enviado','fallido','incierto') THEN RAISE EXCEPTION 'Estado inválido'; END IF;
 UPDATE privado.cola_correo_actividad SET estado=p_estado, detalle=left(p_detalle, 200), actualizado=clock_timestamp()
 WHERE aviso_id=p_aviso AND intento=p_intento AND estado='procesando';
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.reclamar_correo_actividad(), public.finalizar_correo_actividad(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclamar_correo_actividad(), public.finalizar_correo_actividad(uuid,uuid,text,text) TO service_role;
REVOKE ALL ON FUNCTION privado.encolar_correo_actividad() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.correos_cambio_actividad(p_folio text, p_reintentar boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE actor uuid := privado.comprobar_sesion_cuenta(); cambio privado."cambioActividad"%ROWTYPE; resultado jsonb;
BEGIN
 SELECT * INTO cambio FROM privado."cambioActividad" WHERE folio=p_folio;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cambio inexistente' USING ERRCODE='P0002'; END IF;
 IF NOT privado.permiso_agenda(actor,'registrar_resoluciones_actividades',cambio."actividadId") THEN
  RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501';
 END IF;
 IF p_reintentar THEN
  UPDATE privado.cola_correo_actividad q SET estado='pendiente', actualizado=clock_timestamp(), detalle=NULL
  FROM privado."avisoCambioActividad" a WHERE a."cambioId"=cambio.id AND a."avisoId"=q.aviso_id AND q.estado='fallido';
 END IF;
 SELECT jsonb_build_object(
  'pendientes',count(*) FILTER (WHERE q.estado IN ('pendiente','procesando')),
  'enviados',count(*) FILTER (WHERE q.estado='enviado'),
  'fallidos',count(*) FILTER (WHERE q.estado='fallido'),
  'inciertos',count(*) FILTER (WHERE q.estado='incierto')) INTO resultado
 FROM privado."avisoCambioActividad" a JOIN privado.cola_correo_actividad q ON q.aviso_id=a."avisoId"
 WHERE a."cambioId"=cambio.id;
 RETURN resultado;
END; $$;
REVOKE ALL ON FUNCTION public.correos_cambio_actividad(text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correos_cambio_actividad(text,boolean) TO authenticated;
COMMIT;
