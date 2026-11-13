-- Aplicado con autorización después de administracion_cuentas.sql. Pruebas reversibles correctas.
-- Aísla la operación con privilegios elevados y limita la bitácora incluso para service_role.
ALTER FUNCTION public.administrar_cuentas(text,jsonb) SET SCHEMA privado;
REVOKE ALL ON FUNCTION privado.administrar_cuentas(text,jsonb) FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA privado TO authenticated;
GRANT EXECUTE ON FUNCTION privado.administrar_cuentas(text,jsonb) TO authenticated;
CREATE FUNCTION public.administrar_cuentas(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.administrar_cuentas(operacion,datos);
$$;
REVOKE ALL ON FUNCTION public.administrar_cuentas(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.administrar_cuentas(text,jsonb) TO authenticated;
REVOKE ALL ON public."historialCuenta" FROM service_role;
GRANT SELECT,INSERT ON public."historialCuenta" TO service_role;
CREATE POLICY sin_acceso_directo_historial ON public."historialCuenta" FOR ALL TO authenticated
 USING(false) WITH CHECK(false);
