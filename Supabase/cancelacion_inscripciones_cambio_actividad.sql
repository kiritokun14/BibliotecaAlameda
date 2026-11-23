-- T-104. Requiere cambios_actividad.sql. Sincroniza la cancelación institucional con la inscripción.
BEGIN;

CREATE OR REPLACE FUNCTION privado.cancelar_inscripciones_por_cambio(cambio privado."cambioActividad")
RETURNS void LANGUAGE sql SET search_path = pg_catalog AS $$
 WITH activas AS (
  SELECT i.id,i.status
  FROM public.inscripcion i JOIN public."sesionActividad" s ON s.id=i."sesionId"
  WHERE s.id=ANY(cambio.sesiones) AND s."actividadId"=cambio."actividadId" AND s.estado='cancelada'
   AND i.status IN ('pendiente','confirmada')
  FOR UPDATE OF i
 ), canceladas AS (
  UPDATE public.inscripcion i SET status='cancelada',"decisionPor"=cambio."aplicadoPor",
   "decisionRazon"='Sesión cancelada',"decididoA"=cambio."aplicadoEn"
  FROM activas WHERE i.id=activas.id
  RETURNING i.id,activas.status
 )
 INSERT INTO public."historiaInscripcion" ("inscripcionId","estadoPrevio","estadoNuevo","cambiadoPor",razon,"cambiadoA")
 SELECT id,status,'cancelada',cambio."aplicadoPor",'Sesión cancelada',cambio."aplicadoEn"
 FROM canceladas;
$$;

CREATE OR REPLACE FUNCTION privado.ejecutar_cambios_actividad(operacion text,datos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE resultado jsonb;
BEGIN
 -- La resolución original valida los permisos y guarda los destinatarios antes de cancelar sus inscripciones.
 resultado:=privado.cambios_actividad(operacion,datos);
 IF operacion='aplicar' AND resultado->>'tipo'='cancelacion' THEN
  PERFORM privado.cancelar_inscripciones_por_cambio(c)
  FROM privado."cambioActividad" c WHERE c.folio=resultado->>'folio';
 END IF;
 RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.cambios_actividad(operacion text,datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog AS $$
 SELECT privado.ejecutar_cambios_actividad(operacion,datos);
$$;

REVOKE ALL ON FUNCTION privado.cancelar_inscripciones_por_cambio(privado."cambioActividad"),
 privado.cambios_actividad(text,jsonb),privado.ejecutar_cambios_actividad(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.ejecutar_cambios_actividad(text,jsonb) TO authenticated;

-- Recupera inscripciones que quedaron activas tras una cancelación ya aplicada.
SELECT privado.cancelar_inscripciones_por_cambio(c)
FROM privado."cambioActividad" c WHERE c.tipo='cancelacion' AND c.estado='aplicado'
 AND c."aplicadoPor" IS NOT NULL AND c."aplicadoEn" IS NOT NULL;

COMMIT;
