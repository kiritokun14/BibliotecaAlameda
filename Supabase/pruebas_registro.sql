-- Pruebas reversibles de T-027. No dejan usuarios ni registros de prueba.
BEGIN;
DO $$
DECLARE
  datos jsonb := '{"nombres":"Prueba","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
  tutor jsonb;
  caso jsonb;
  id_adulto uuid := gen_random_uuid();
  id_menor uuid := gen_random_uuid();
  id_invalido uuid;
  rechazo boolean;
BEGIN
  INSERT INTO auth.users (id,email,raw_user_meta_data)
    VALUES (id_adulto,id_adulto::text || '@example.invalid',jsonb_build_object('registro',datos));
  IF NOT EXISTS (SELECT 1 FROM public.perfil WHERE id=id_adulto AND "avisoAceptadoEn" IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public."contactoTutor" WHERE "usuarioId"=id_adulto)
     OR EXISTS (SELECT 1 FROM public."rolUsuario" WHERE "usuarioId"=id_adulto AND "rolCodigo"<>'usuario')
     OR EXISTS (SELECT 1 FROM auth.users WHERE id=id_adulto AND raw_user_meta_data ? 'registro') THEN
    RAISE EXCEPTION 'Falló el registro de adulto o su aislamiento de privilegios/metadata.';
  END IF;
  tutor := jsonb_build_object('nombres','Contacto','apellidos','Temporal','telefono','3110000001',
    'correo','tutor@example.com','relacion','madre','domicilio',datos->'domicilio');
  INSERT INTO auth.users (id,email,raw_user_meta_data)
    VALUES (id_menor,id_menor::text || '@example.invalid',
      jsonb_build_object('registro',datos || jsonb_build_object('fechaNacimiento','2015-01-01','tutor',tutor)));
  IF NOT EXISTS (SELECT 1 FROM public."contactoTutor" WHERE "usuarioId"=id_menor AND relacion='madre') THEN
    RAISE EXCEPTION 'Falló el registro conjunto de menor y tutor.';
  END IF;
  -- Actualizar metadata no debe modificar identidad ni elevar permisos.
  UPDATE auth.users SET raw_user_meta_data='{"rol":"administrador","registro":{"nombres":"Modificado"}}' WHERE id=id_adulto;
  IF NOT EXISTS (SELECT 1 FROM public.perfil WHERE id=id_adulto AND nombres='Prueba')
     OR EXISTS (SELECT 1 FROM public."rolUsuario" WHERE "usuarioId"=id_adulto AND "rolCodigo"<>'usuario') THEN
    RAISE EXCEPTION 'La metadata modificó el perfil o los permisos.';
  END IF;
  FOR caso IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
    datos || '{"fechaNacimiento":"2015-01-01"}',
    datos || '{"aceptaAviso":false}',
    datos || '{"telefono":"123"}',
    datos || '{"rol":"administrador"}',
    datos || '{"fechaNacimiento":"2999-01-01"}',
    datos || '{"domicilio":{"calle":"Prueba"}}',
    datos || jsonb_build_object('fechaNacimiento','2015-01-01','tutor',tutor - 'correo'),
    datos || jsonb_build_object('fechaNacimiento','2015-01-01','tutor',tutor || '{"relacion":"amigo"}')
  )) LOOP
    rechazo := false;
    id_invalido := gen_random_uuid();
    BEGIN
      INSERT INTO auth.users (id,email,raw_user_meta_data)
        VALUES (id_invalido,id_invalido::text || '@example.invalid',jsonb_build_object('registro',caso));
    EXCEPTION WHEN check_violation THEN
      rechazo := true;
    END;
    IF NOT rechazo OR EXISTS (SELECT 1 FROM auth.users WHERE id=id_invalido)
       OR EXISTS (SELECT 1 FROM public.perfil WHERE id=id_invalido)
       OR EXISTS (SELECT 1 FROM public."contactoTutor" WHERE "usuarioId"=id_invalido) THEN
      RAISE EXCEPTION 'El caso inválido dejó datos o no se rechazó.';
    END IF;
  END LOOP;
  IF has_function_privilege('anon','privado.crear_perfil_autorregistro()','EXECUTE')
     OR has_function_privilege('authenticated','privado.crear_perfil_autorregistro()','EXECUTE')
     OR has_table_privilege('anon','public.perfil','INSERT')
     OR has_table_privilege('authenticated','public.perfil','INSERT') THEN
    RAISE EXCEPTION 'Se abrió acceso de escritura o ejecución pública.';
  END IF;
END;
$$;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT 'Adulto, menor, 8 casos inválidos, atomicidad, metadata y permisos: correctos' AS resultado;
ROLLBACK;
