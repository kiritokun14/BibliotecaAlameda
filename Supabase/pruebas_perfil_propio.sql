-- T-031: verifica edición propia, validaciones y sesión. No deja usuarios ni cambios.
BEGIN;
DO $$
DECLARE actor uuid:=gen_random_uuid(); otro uuid:=gen_random_uuid(); sesion uuid:=gen_random_uuid();
 sesion_otro uuid:=gen_random_uuid(); id_actual uuid; r jsonb; v text; rechazo boolean; nombres_ajenos text;
 datos jsonb:='{"nombres":"Prueba HU11","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH id_actual IN ARRAY ARRAY[actor,otro] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
  VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',datos));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(sesion,actor,now()),(sesion_otro,otro,now());
 SELECT nombres INTO nombres_ajenos FROM public.perfil WHERE id=otro;
 PERFORM set_config('request.jwt.claims','{}',true);
 SET LOCAL ROLE anon;
 rechazo:=false;
 BEGIN PERFORM public.mi_perfil('consultar'); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Consulta de perfil sin sesión.'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.mi_perfil('consultar');
 IF r->>'id'<>actor::text OR r ? 'roles' OR r ? 'estatus' OR r ? 'calle' THEN RAISE EXCEPTION 'Proyección de perfil incorrecta.'; END IF;
 v:=r->>'actualizadoA';
 rechazo:=false;
 BEGIN PERFORM public.mi_perfil('guardar',jsonb_build_object('id',otro,'nombres','Suplantado','actualizadoA',v));
 EXCEPTION WHEN invalid_parameter_value THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó otra identidad.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.mi_perfil('guardar',jsonb_build_object('rol','administrador','nombres','Prueba','actualizadoA',v));
 EXCEPTION WHEN invalid_parameter_value THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó rol desde perfil.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.mi_perfil('guardar',jsonb_build_object('telefono','123','actualizadoA',v));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó teléfono inválido.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.mi_perfil('guardar',jsonb_build_object('nombres',NULL,'actualizadoA',v));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó nombre nulo.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.mi_perfil('guardar',jsonb_build_object('nombres','Cambio','actualizadoA','2000-01-01T00:00:00Z'));
 EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó versión vieja.'; END IF;
 r:=public.mi_perfil('guardar',jsonb_build_object('nombres',' Perfil actualizado ','telefono','3111234567','actualizadoA',v));
 IF r->>'nombres'<>'Perfil actualizado' OR r->>'telefono'<>'3111234567' THEN RAISE EXCEPTION 'No guardó datos.'; END IF;
 r:=public.mi_perfil('consultar');
 IF r->>'nombres'<>'Perfil actualizado' THEN RAISE EXCEPTION 'No persiste la edición.'; END IF;
 RESET ROLE;
 IF (SELECT nombres FROM public.perfil WHERE id=otro) IS DISTINCT FROM nombres_ajenos THEN RAISE EXCEPTION 'Cambió otra cuenta.'; END IF;
 IF (SELECT "primerApellido" FROM public.perfil WHERE id=actor)<>'Temporal'
 OR (SELECT estatus FROM public.perfil WHERE id=actor)<>'activo'
 OR (SELECT "avisoAceptadoEn" FROM public.perfil WHERE id=actor) IS NULL THEN RAISE EXCEPTION 'Cambió campos protegidos.'; END IF;
 DELETE FROM auth.sessions WHERE id=sesion;
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.mi_perfil('consultar'); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó sesión revocada.'; END IF;
 RESET ROLE;
 UPDATE public.perfil SET estatus='bloqueado' WHERE id=otro;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',sesion_otro)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.mi_perfil('consultar'); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó cuenta bloqueada.'; END IF;
 RESET ROLE;
END;
$$;
ROLLBACK;
SELECT 'Perfil propio OK; todo revertido' AS resultado;
