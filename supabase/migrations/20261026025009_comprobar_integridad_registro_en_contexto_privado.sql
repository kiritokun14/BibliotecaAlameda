CREATE OR REPLACE FUNCTION privado.crear_perfil_autorregistro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  datos jsonb := NEW.raw_user_meta_data->'registro';
  domicilio jsonb;
  tutor jsonb;
  direccion_tutor jsonb;
  nacimiento date;
  campo text;
  hoy date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::date;
BEGIN
  IF jsonb_typeof(datos) IS DISTINCT FROM 'object' OR octet_length(datos::text) > 16000 THEN
    RAISE EXCEPTION 'Datos de registro obligatorios o demasiado extensos.' USING ERRCODE = '23514';
  END IF;
  IF NOT (datos->'aceptaAviso' = 'true'::jsonb) OR datos->'aceptaAviso' IS NULL THEN
    RAISE EXCEPTION 'Se requiere aceptar el aviso de privacidad.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) AS k(campo)
     WHERE k.campo NOT IN ('nombres','primerApellido','segundoApellido','fechaNacimiento','telefono','domicilio','aceptaAviso','tutor')) THEN
    RAISE EXCEPTION 'Campos de registro no permitidos.' USING ERRCODE = '23514';
  END IF;
  FOREACH campo IN ARRAY ARRAY['nombres','primerApellido','fechaNacimiento','telefono'] LOOP
    IF jsonb_typeof(datos->campo) IS DISTINCT FROM 'string'
       OR length(btrim(datos->>campo)) NOT BETWEEN 1 AND 150 THEN
      RAISE EXCEPTION 'Datos personales incompletos o inválidos.' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  IF datos ? 'segundoApellido' AND (jsonb_typeof(datos->'segundoApellido') IS DISTINCT FROM 'string'
    OR length(btrim(datos->>'segundoApellido')) NOT BETWEEN 1 AND 150) THEN
    RAISE EXCEPTION 'Segundo apellido inválido.' USING ERRCODE = '23514';
  END IF;
  IF (datos->>'telefono') !~ '^[0-9]{10}$' OR (datos->>'fechaNacimiento') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Teléfono o fecha inválidos.' USING ERRCODE = '23514';
  END IF;
  nacimiento := (datos->>'fechaNacimiento')::date;
  IF nacimiento > hoy THEN
    RAISE EXCEPTION 'Fecha de nacimiento futura.' USING ERRCODE = '23514';
  END IF;
  domicilio := datos->'domicilio';
  PERFORM privado.validar_domicilio_registro(domicilio);
  IF nacimiento > (hoy - INTERVAL '18 years')::date THEN
    tutor := datos->'tutor';
    IF jsonb_typeof(tutor) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Se requiere el contacto del tutor.' USING ERRCODE = '23514';
    END IF;
    FOREACH campo IN ARRAY ARRAY['nombres','apellidos','telefono','correo','relacion'] LOOP
      IF jsonb_typeof(tutor->campo) IS DISTINCT FROM 'string'
         OR length(btrim(tutor->>campo)) NOT BETWEEN 1 AND 254 THEN
        RAISE EXCEPTION 'Datos del tutor incompletos o inválidos.' USING ERRCODE = '23514';
      END IF;
    END LOOP;
    IF (tutor->>'telefono') !~ '^[0-9]{10}$'
       OR (tutor->>'correo') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       OR (tutor->>'relacion') NOT IN ('madre','padre','tutor') THEN
      RAISE EXCEPTION 'Contacto del tutor inválido.' USING ERRCODE = '23514';
    END IF;
    direccion_tutor := tutor->'domicilio';
    PERFORM privado.validar_domicilio_registro(direccion_tutor);
  ELSIF datos ? 'tutor' THEN
    RAISE EXCEPTION 'El adulto no requiere contacto de tutor.' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.perfil (id,nombres,"primerApellido","segundoApellido","fechaNacimiento",telefono,
    calle,"numeroExterior","numeroInterior","coloniaLocalidad","codigoPostal",municipio,"estadoProvincia","avisoAceptadoEn")
  VALUES (NEW.id,btrim(datos->>'nombres'),btrim(datos->>'primerApellido'),datos->>'segundoApellido',nacimiento,datos->>'telefono',
    domicilio->>'calle',domicilio->>'numeroExterior',domicilio->>'numeroInterior',domicilio->>'coloniaLocalidad',
    domicilio->>'codigoPostal',domicilio->>'municipio',domicilio->>'estadoProvincia',CURRENT_TIMESTAMP);
  IF tutor IS NOT NULL THEN
    INSERT INTO public."contactoTutor" ("usuarioId",nombres,apellidos,telefono,correo,direccion,relacion)
    VALUES (NEW.id,btrim(tutor->>'nombres'),btrim(tutor->>'apellidos'),tutor->>'telefono',tutor->>'correo',
      concat_ws(', ',direccion_tutor->>'calle',direccion_tutor->>'numeroExterior',
        direccion_tutor->>'numeroInterior',direccion_tutor->>'coloniaLocalidad',direccion_tutor->>'codigoPostal',
        direccion_tutor->>'municipio',direccion_tutor->>'estadoProvincia'),tutor->>'relacion');
  END IF;
  -- Ejecutar las comprobaciones diferidas con el contexto privado de esta función.
  -- Auth no necesita permisos de lectura/escritura sobre las tablas de perfiles.
  SET CONSTRAINTS public.comprobar_tutor_perfil, public.conservar_tutor_menor IMMEDIATE;
  SET CONSTRAINTS public.comprobar_tutor_perfil, public.conservar_tutor_menor DEFERRED;
  -- Los datos personales quedan en tablas protegidas, no se duplican en JWT/user_metadata.
  UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data - 'registro' WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION privado.crear_perfil_autorregistro() FROM PUBLIC, anon, authenticated;
