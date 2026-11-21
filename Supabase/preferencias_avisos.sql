-- T-095: el usuario consulta y actualiza sus propias preferencias.
BEGIN;
CREATE OR REPLACE FUNCTION privado.mis_preferencias_avisos(operacion text, datos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid := privado.comprobar_sesion_cuenta();
 fila public."preferenciaUsuario"%ROWTYPE;
 version timestamptz;
BEGIN
 IF operacion = 'consultar' AND datos = '{}'::jsonb THEN
  SELECT * INTO fila FROM public."preferenciaUsuario" WHERE id = actor;
 ELSIF operacion = 'guardar' AND jsonb_typeof(datos) = 'object' THEN
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN
     ('canalPreferido','recibirAvisosComunidad','recibirAvisosActividades','actualizadoEn'))
     OR jsonb_typeof(datos->'canalPreferido') IS DISTINCT FROM 'string'
     OR datos->>'canalPreferido' NOT IN ('portal','correo','telefono','whatsapp_manual')
     OR jsonb_typeof(datos->'recibirAvisosComunidad') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(datos->'recibirAvisosActividades') IS DISTINCT FROM 'boolean'
     OR coalesce(jsonb_typeof(datos->'actualizadoEn'),'') NOT IN ('string','null') THEN
   RAISE EXCEPTION 'Preferencias inválidas' USING ERRCODE='22023';
  END IF;
  version := (datos->>'actualizadoEn')::timestamptz;
  IF version IS NULL THEN
   INSERT INTO public."preferenciaUsuario"(id,"canalPreferido","recibirAvisosComunidad","recibirAvisosActividades")
   VALUES(actor,datos->>'canalPreferido',(datos->>'recibirAvisosComunidad')::boolean,(datos->>'recibirAvisosActividades')::boolean)
   ON CONFLICT (id) DO NOTHING RETURNING * INTO fila;
  ELSE
   UPDATE public."preferenciaUsuario" SET "canalPreferido"=datos->>'canalPreferido',
    "recibirAvisosComunidad"=(datos->>'recibirAvisosComunidad')::boolean,
    "recibirAvisosActividades"=(datos->>'recibirAvisosActividades')::boolean
   WHERE id=actor AND "actualizadoEn"=version RETURNING * INTO fila;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Versión obsoleta' USING ERRCODE='40001'; END IF;
 ELSE
  RAISE EXCEPTION 'Petición inválida' USING ERRCODE='22023';
 END IF;
 RETURN jsonb_build_object('canalPreferido',coalesce(fila."canalPreferido",'correo'),
  'recibirAvisosComunidad',coalesce(fila."recibirAvisosComunidad",false),
  'recibirAvisosActividades',coalesce(fila."recibirAvisosActividades",false),
  'actualizadoEn',fila."actualizadoEn");
END;
$$;

CREATE OR REPLACE FUNCTION public.mis_preferencias_avisos(operacion text, datos jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.mis_preferencias_avisos(operacion,datos);
$$;
REVOKE ALL ON FUNCTION privado.mis_preferencias_avisos(text,jsonb),public.mis_preferencias_avisos(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.mis_preferencias_avisos(text,jsonb),public.mis_preferencias_avisos(text,jsonb) TO authenticated;
COMMIT;
