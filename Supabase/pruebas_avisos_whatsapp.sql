-- Prueba real y reversible: nunca abre WhatsApp ni envía correos o mensajes.
BEGIN;
DO $$
DECLARE personal uuid:=gen_random_uuid(); usuario uuid:=gen_random_uuid(); sesion uuid:=gen_random_uuid();
 sesion_usuario uuid:=gen_random_uuid(); identificador uuid:=gen_random_uuid(); r jsonb; p jsonb; bloqueo boolean;
 registro jsonb:='{"nombres":"Avisos reversible","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
  (personal,personal::text||'@example.invalid',now(),jsonb_build_object('registro',registro)),
  (usuario,usuario::text||'@example.invalid',now(),jsonb_build_object('registro',registro));
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(sesion,personal,now()),(sesion_usuario,usuario,now());
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo)
  VALUES(personal,'enviar_avisos',personal,'Prueba reversible T074');
 PERFORM set_config('request.jwt.claims','{}',true); SET LOCAL ROLE anon;
 bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('listar'); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Anon accede a avisos'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',usuario,'role','authenticated','session_id',sesion_usuario)::text,true);
 SET LOCAL ROLE authenticated;
 bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('destinatarios','{"busqueda":"Avisos"}'); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Usuario sin capacidad ve teléfonos'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('crear',jsonb_build_object('id',identificador,'usuarioId',usuario,'titulo','Prueba','cuerpoAviso','Mensaje','tipoAviso','comunidad'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Difusión sin preferencia'; END IF;
 r:=public.avisos_whatsapp('crear',jsonb_build_object('id',identificador,'usuarioId',usuario,'titulo','Prueba','cuerpoAviso','Mensaje','tipoAviso','atencion'));
 IF r->>'estadoEnvio'<>'pendiente' OR (r->>'version')::int<>1 THEN RAISE EXCEPTION 'Estado inicial incorrecto'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('crear',jsonb_build_object('id',identificador,'usuarioId',usuario,'titulo','Prueba','cuerpoAviso','Mensaje','tipoAviso','atencion'));
 EXCEPTION WHEN unique_violation THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Duplicó aviso al reintentar'; END IF;
 p:=public.avisos_whatsapp('preparar',jsonb_build_object('id',identificador));
 IF p->>'telefono'<>'523110000000' THEN RAISE EXCEPTION 'Teléfono mal normalizado'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('resultado',jsonb_build_object('id',identificador,'version',1,'estadoEnvio','entregado','nota','No enviado'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Entrega fingida antes de envío'; END IF;
 r:=public.avisos_whatsapp('listar');
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(r->'avisos') a WHERE a->>'id'=identificador::text AND a->>'estadoEnvio'='pendiente') THEN
  RAISE EXCEPTION 'Abrir WhatsApp modificó el estado'; END IF;
 r:=public.avisos_whatsapp('resultado',jsonb_build_object('id',identificador,'version',1,'estadoEnvio','fallido','nota','Intento manual fallido'));
 bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('resultado',jsonb_build_object('id',identificador,'version',1,'estadoEnvio','enviado','nota','Versión vieja'));
 EXCEPTION WHEN serialization_failure THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Aceptó actualización concurrente obsoleta'; END IF;
 r:=public.avisos_whatsapp('resultado',jsonb_build_object('id',identificador,'version',2,'estadoEnvio','pendiente','nota','Reintento autorizado'));
 r:=public.avisos_whatsapp('resultado',jsonb_build_object('id',identificador,'version',3,'estadoEnvio','enviado','nota','Envío manual observado'));
 r:=public.avisos_whatsapp('resultado',jsonb_build_object('id',identificador,'version',4,'estadoEnvio','entregado','nota','Confirmación observada manualmente'));
 IF jsonb_array_length(r->'historial')<>5 THEN RAISE EXCEPTION 'Se perdió historial'; END IF;
 bloqueo:=false;
 BEGIN UPDATE privado."seguimientoAvisoManual" SET version=99 WHERE "avisoId"=identificador;
 EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Escritura directa del seguimiento'; END IF;
 RESET ROLE;
 -- Preferencias: autoriza difusión, luego revoca antes de preparar el enlace.
 INSERT INTO public."preferenciaUsuario"(id,"recibirAvisosComunidad","canalPreferido") VALUES(usuario,true,'whatsapp_manual')
  ON CONFLICT(id) DO UPDATE SET "recibirAvisosComunidad"=true,"canalPreferido"='whatsapp_manual';
 identificador:=gen_random_uuid(); SET LOCAL ROLE authenticated;
 r:=public.avisos_whatsapp('crear',jsonb_build_object('id',identificador,'usuarioId',usuario,'titulo','Difusión','cuerpoAviso','Mensaje','tipoAviso','comunidad'));
 RESET ROLE;
 UPDATE public."preferenciaUsuario" SET "recibirAvisosComunidad"=false WHERE id=usuario;
 SET LOCAL ROLE authenticated; bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('preparar',jsonb_build_object('id',identificador));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Ignoró preferencia revocada'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('preparar',jsonb_build_object('id',identificador,'tipoAviso','actividad'));
 EXCEPTION WHEN invalid_parameter_value THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Permite imponer tipo al preparar enlace'; END IF;
 RESET ROLE;
 UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=sesion;
 SET LOCAL ROLE authenticated; bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('listar'); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Sesión revocada conserva acceso'; END IF;
 RESET ROLE;
END; $$;
ROLLBACK;
