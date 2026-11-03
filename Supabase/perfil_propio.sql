-- T-031: edición del perfil propio, adaptada de BOBA.
-- No modifica Auth metadata, roles, estado, credencial ni datos de otras cuentas.
BEGIN;
CREATE OR REPLACE FUNCTION privado.mi_perfil(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid; fila public.perfil%ROWTYPE; correo text; version_leida timestamptz;
BEGIN
 actor:=privado.comprobar_sesion_cuenta();
 IF operacion IS NULL OR operacion NOT IN ('consultar','guardar')
 OR datos IS NULL OR jsonb_typeof(datos)<>'object'
 THEN RAISE EXCEPTION 'Operación inválida.' USING ERRCODE='22023'; END IF;
 IF operacion='guardar' THEN
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) clave WHERE clave NOT IN ('nombres','telefono','actualizadoA'))
  OR NOT datos ? 'actualizadoA' OR NOT (datos ? 'nombres' OR datos ? 'telefono')
  OR jsonb_typeof(datos->'actualizadoA') IS DISTINCT FROM 'string'
  THEN RAISE EXCEPTION 'Campos no editables o cambios vacíos.' USING ERRCODE='22023'; END IF;
  IF datos ? 'nombres' AND (jsonb_typeof(datos->'nombres') IS DISTINCT FROM 'string'
       OR length(btrim(datos->>'nombres')) NOT BETWEEN 1 AND 150)
  OR datos ? 'telefono' AND (jsonb_typeof(datos->'telefono') IS DISTINCT FROM 'string'
       OR (datos->>'telefono') !~ '^[0-9]{10}$')
  THEN RAISE EXCEPTION 'Nombre o teléfono inválido.' USING ERRCODE='23514'; END IF;
  version_leida:=(datos->>'actualizadoA')::timestamptz;
  SELECT * INTO fila FROM public.perfil WHERE id=actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado.' USING ERRCODE='P0002'; END IF;
  IF version_leida IS DISTINCT FROM fila."actualizadoA" THEN
    RAISE EXCEPTION 'Versión de perfil obsoleta.' USING ERRCODE='40001'; END IF;
  UPDATE public.perfil SET nombres=CASE WHEN datos ? 'nombres' THEN btrim(datos->>'nombres') ELSE nombres END,
   telefono=CASE WHEN datos ? 'telefono' THEN datos->>'telefono' ELSE telefono END
  WHERE id=actor RETURNING * INTO fila;
 ELSE
  IF datos<>'{}'::jsonb THEN RAISE EXCEPTION 'La consulta no acepta una identidad.' USING ERRCODE='22023'; END IF;
  SELECT * INTO fila FROM public.perfil WHERE id=actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado.' USING ERRCODE='P0002'; END IF;
 END IF;
 SELECT email INTO correo FROM auth.users WHERE id=actor;
 RETURN jsonb_build_object('id',fila.id,'correo',correo,'nombres',fila.nombres,
  'primerApellido',fila."primerApellido",'segundoApellido',fila."segundoApellido",
  'fechaNacimiento',fila."fechaNacimiento",'telefono',fila.telefono,'actualizadoA',fila."actualizadoA");
END;
$$;
REVOKE ALL ON FUNCTION privado.mi_perfil(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION privado.mi_perfil(text,jsonb) TO authenticated;
GRANT USAGE ON SCHEMA privado TO authenticated;
CREATE OR REPLACE FUNCTION public.mi_perfil(operacion text,datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog
AS $$ SELECT privado.mi_perfil(operacion,datos); $$;
REVOKE ALL ON FUNCTION public.mi_perfil(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mi_perfil(text,jsonb) TO authenticated;
COMMIT;
