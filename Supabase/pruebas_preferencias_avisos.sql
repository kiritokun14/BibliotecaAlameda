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
 PERFORM set_config('request.jwt.claims','{}',true);
 SET LOCAL ROLE anon;
 bloqueo:=false;
 BEGIN PERFORM public.mis_preferencias_avisos('consultar','{}'); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Consulta anónima'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',usuario,'role','authenticated','session_id',sesion_usuario)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.mis_preferencias_avisos('consultar','{}');
 p:=r||'{"canalPreferido":"whatsapp_manual","recibirAvisosComunidad":true}'::jsonb;
 bloqueo:=false;
 BEGIN PERFORM public.mis_preferencias_avisos('guardar',p||jsonb_build_object('id',personal));
 EXCEPTION WHEN invalid_parameter_value THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Aceptó identidad ajena'; END IF;
 r:=public.mis_preferencias_avisos('guardar',p);
 IF (public.mis_preferencias_avisos('consultar','{}'))->>'recibirAvisosComunidad' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'No se guardó la preferencia'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.mis_preferencias_avisos('guardar',p||'{"actualizadoEn":"2000-01-01T00:00:00Z"}'::jsonb);
 EXCEPTION WHEN serialization_failure THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Aceptó versión obsoleta'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 PERFORM public.avisos_whatsapp('crear',jsonb_build_object('id',identificador,'usuarioId',usuario,'titulo','Difusión','cuerpoAviso','Mensaje ficticio','tipoAviso','comunidad'));
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',usuario,'role','authenticated','session_id',sesion_usuario)::text,true);
 SET LOCAL ROLE authenticated;
 PERFORM public.mis_preferencias_avisos('guardar',r||'{"recibirAvisosComunidad":false}'::jsonb);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 bloqueo:=false;
 BEGIN PERFORM public.avisos_whatsapp('preparar',jsonb_build_object('id',identificador));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Ignoró preferencia revocada'; END IF;
 RESET ROLE;
END; $$;
ROLLBACK;
