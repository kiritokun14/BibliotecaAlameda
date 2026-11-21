-- Verificación de cancelacion_credencial_propia.sql con roles reales. ROLLBACK: no deja cuentas ni solicitudes.
BEGIN;
DO $$
#variable_conflict use_variable
DECLARE usuario uuid:=gen_random_uuid(); otro uuid:=gen_random_uuid(); personal uuid:=gen_random_uuid();
 sesion uuid:=gen_random_uuid(); sesion_otro uuid:=gen_random_uuid(); sesion_personal uuid:=gen_random_uuid();
 id_actual uuid; r jsonb; credencial uuid; rechazo boolean;
 registro jsonb:='{"nombres":"Prueba cancelar","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH id_actual IN ARRAY ARRAY[usuario,otro,personal] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',registro));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(sesion,usuario,now()),(sesion_otro,otro,now()),(sesion_personal,personal,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion")
  VALUES(personal,'responsable_actividades',personal,'Prueba reversible');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo)
  VALUES(personal,'validar_credenciales',personal,'Prueba reversible');

 -- La persona solicita su credencial.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',usuario,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.atencion_solicitudes('credencial','crear','{"tipoSolicitud":"obtencion"}'); credencial:=(r->>'id')::uuid;
 RESET ROLE;

 -- Otra persona no puede cancelarla.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',sesion_otro)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.atencion_solicitudes('credencial','cancelar',jsonb_build_object('id',credencial)); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Otra persona canceló una solicitud ajena'; END IF;
 RESET ROLE;

 -- El personal tampoco la cancela por esta vía (el personal usa resolver, con motivo).
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',sesion_personal)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.atencion_solicitudes('credencial','cancelar',jsonb_build_object('id',credencial)); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'El personal usó la cancelación propia'; END IF;
 RESET ROLE;

 -- La titular la cancela; no acepta campos extra; queda en el historial.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',usuario,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.atencion_solicitudes('credencial','cancelar',jsonb_build_object('id',credencial,'estadoSolicitud','atendida')); EXCEPTION WHEN invalid_parameter_value THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Cancelar aceptó campos extra'; END IF;
 r:=public.atencion_solicitudes('credencial','cancelar',jsonb_build_object('id',credencial));
 IF r->>'estadoSolicitud'<>'cancelada' THEN RAISE EXCEPTION 'No quedó cancelada'; END IF;
 IF r->'historial'->-1->>'accion'<>'cancelar' OR r->'historial'->-1->>'estadoAnterior'<>'recibida' THEN RAISE EXCEPTION 'Historial incorrecto'; END IF;

 -- Cancelar dos veces es una transición no permitida.
 rechazo:=false;
 BEGIN PERFORM public.atencion_solicitudes('credencial','cancelar',jsonb_build_object('id',credencial)); EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Canceló dos veces'; END IF;

 -- Ya cancelada, puede solicitar de nuevo.
 r:=public.atencion_solicitudes('credencial','crear','{"tipoSolicitud":"obtencion"}');
 IF r->>'estadoSolicitud'<>'recibida' THEN RAISE EXCEPTION 'No pudo solicitar de nuevo'; END IF;

 -- Las propuestas no se cancelan por esta vía.
 rechazo:=false;
 BEGIN PERFORM public.atencion_solicitudes('propuesta','cancelar',jsonb_build_object('id',gen_random_uuid())); EXCEPTION WHEN no_data_found OR invalid_parameter_value THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó cancelar una propuesta'; END IF;
 RESET ROLE;
END $$;
ROLLBACK;
