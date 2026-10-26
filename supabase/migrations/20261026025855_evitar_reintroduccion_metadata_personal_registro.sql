-- Auth puede reescribir su copia de metadata al preparar el correo después del INSERT.
-- No necesita leer tablas ni privilegios elevados: solo descarta el payload ya consumido.
CREATE OR REPLACE FUNCTION privado.limpiar_metadata_registro()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  NEW.raw_user_meta_data := NEW.raw_user_meta_data - 'registro';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION privado.limpiar_metadata_registro() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER limpiar_metadata_registro
BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION privado.limpiar_metadata_registro();
