-- T-094: pruebas reversibles de los cuatro criterios. Sin correos ni datos persistentes.
BEGIN;
DO $$
#variable_conflict use_variable
DECLARE titular uuid:=gen_random_uuid(); ajeno uuid:=gen_random_uuid(); personal uuid:=gen_random_uuid();
 st uuid:=gen_random_uuid(); sa uuid:=gen_random_uuid(); sp uuid:=gen_random_uuid(); u uuid; sala uuid:=gen_random_uuid();
 r jsonb; anterior jsonb; datos jsonb; acuerdo jsonb; identificador uuid; folio text; rechazo boolean; id_espacio uuid; dia date:=(statement_timestamp() AT TIME ZONE 'America/Mazatlan')::date+30;
 registro jsonb:='{"nombres":"Prueba T094","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH u IN ARRAY ARRAY[titular,ajeno,personal] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES(u,u::text||'@example.invalid',now(),jsonb_build_object('registro',registro));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(st,titular,now()),(sa,ajeno,now()),(sp,personal,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion") VALUES(personal,'responsable_actividades',personal,'Prueba reversible');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo) VALUES(personal,'registrar_resoluciones_actividades',personal,'Prueba reversible'),(personal,'publicar_contenidos',personal,'Prueba reversible');
 INSERT INTO public.espacio(id,slug,nombre,capacidad,descripcion) VALUES(sala,sala::text,'Sala T094 '||sala,30,'Temporal');
 datos:=jsonb_build_object('tituloPropuesta','Propuesta T094','descripcion','Primera versión','tipoPropuesta','Evento','publicoDirigido','General','necesidadEspacio','Sala',
  'frecuenciaReunion','Única','diasSolicitados','2035-06-12','horarioSolicitado','10:00 a 11:00','abiertaAlPublico',true,'sinFinesDeLucro',true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',titular,'role','authenticated','session_id',st)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.atencion_solicitudes('propuesta','crear',datos); identificador:=(r->>'id')::uuid; anterior:=r;
 r:=public.atencion_solicitudes('propuesta','corregir',datos||jsonb_build_object('id',identificador,'actualizadoEn',r->>'actualizadoEn','motivoCambio','Ajustar descripción','descripcion','Segunda versión'));
 IF r->>'estadoRevision'<>'en_revision' OR r->>'descripcion'<>'Segunda versión' OR jsonb_array_length(r->'versiones')<>1 THEN RAISE EXCEPTION 'No corrigió con versión y revisión'; END IF;
 rechazo:=false; BEGIN PERFORM public.atencion_solicitudes('propuesta','corregir',datos||jsonb_build_object('id',identificador,'actualizadoEn',anterior->>'actualizadoEn','motivoCambio','Versión anterior')); EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó versión vieja de propuesta'; END IF;
 rechazo:=false; BEGIN PERFORM public.atencion_solicitudes('propuesta','corregir',datos||jsonb_build_object('id',identificador,'actualizadoEn',r->>'actualizadoEn')); EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó corrección sin motivo'; END IF;
 RESET ROLE;
 IF NOT EXISTS(SELECT 1 FROM privado."versionSolicitud" v WHERE tipo='propuesta' AND "solicitudId"=identificador AND v.anterior->>'descripcion'='Primera versión' AND v.posterior->>'descripcion'='Segunda versión') THEN RAISE EXCEPTION 'No conservó ambos contenidos'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ajeno,'role','authenticated','session_id',sa)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.atencion_solicitudes('propuesta','cancelar',jsonb_build_object('id',identificador,'actualizadoEn',r->>'actualizadoEn','motivoCambio','Ajeno')); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Canceló propuesta ajena'; END IF;
 rechazo:=false; BEGIN PERFORM public.atencion_solicitudes('propuesta','corregir',datos||jsonb_build_object('id',identificador,'actualizadoEn',r->>'actualizadoEn','motivoCambio','Ajeno')); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Corrigió propuesta ajena'; END IF;
 RESET ROLE;
 acuerdo:=jsonb_build_object('responsable','Dirección','fecha',(now() AT TIME ZONE 'America/Mazatlan')::date,'referencia','Minuta T094');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',sp)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.atencion_solicitudes('propuesta','resolver',jsonb_build_object('id',identificador,'actualizadoEn',r->>'actualizadoEn','estadoRevision','aprobada','observacionesInstitucionales','Autorizada','acuerdoDireccion',acuerdo));
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',titular,'role','authenticated','session_id',st)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.atencion_solicitudes('propuesta','corregir',datos||jsonb_build_object('id',identificador,'actualizadoEn',r->>'actualizadoEn','motivoCambio','Cambio relevante de horario','horarioSolicitado','12:00 a 13:00'));
 IF r->>'estadoRevision'<>'en_revision' OR jsonb_array_length(r->'versiones')<>2 THEN RAISE EXCEPTION 'Cambio relevante conservó la aprobación'; END IF;
 r:=public.atencion_solicitudes('propuesta','cancelar',jsonb_build_object('id',identificador,'actualizadoEn',r->>'actualizadoEn','motivoCambio','Retiro la propuesta'));
 IF r->>'estadoRevision'<>'cancelada' OR jsonb_array_length(r->'versiones')<>3 OR jsonb_array_length(r->'historial')<5 THEN RAISE EXCEPTION 'Cancelación perdió expediente o historial'; END IF;
 RESET ROLE;
 IF NOT EXISTS(SELECT 1 FROM public."propuestaEvento" WHERE id=identificador) THEN RAISE EXCEPTION 'Borró expediente de propuesta'; END IF;

 -- Solicitud de espacio: corregir no reserva, cancela con versión y no admite identidad ajena.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',titular,'role','authenticated','session_id',st)::text,true);
 SET LOCAL ROLE authenticated;
 datos:=jsonb_build_object('tipo','uso_espacio','espacio',sala::text,'fecha',dia,'horaInicio','10:00','horaFin','11:00','personas',10,'motivo','Taller');
 r:=public.solicitudes_espacio('enviar',datos); folio:=r->>'folio'; anterior:=r;
 r:=public.modificar_solicitud_espacio('corregir',datos||jsonb_build_object('folio',folio,'actualizadoEn',r->>'actualizadoEn','motivoCambio','Cambió la fecha','fecha',dia+1));
 IF r->>'estado'<>'en_revision' OR jsonb_array_length(r->'versiones')<>1 OR (r->>'inicio')::timestamptz<>((dia+1)+time '10:00') AT TIME ZONE 'America/Mazatlan' THEN RAISE EXCEPTION 'No corrigió espacio y lo devolvió a revisión'; END IF;
 rechazo:=false; BEGIN PERFORM public.solicitudes_espacio('cancelar',jsonb_build_object('folio',folio,'actualizadoEn',anterior->>'actualizadoEn','motivo','Cambio de planes')); EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'RPC anterior permitió cancelar versión vieja'; END IF;
 RESET ROLE;
 SELECT id INTO id_espacio FROM public."solicitudEspacio" WHERE "solicitudEspacio".folio=folio;
 IF jsonb_array_length(privado.ocupacion_espacio(sala,((dia+1)+time '10:00') AT TIME ZONE 'America/Mazatlan',((dia+1)+time '11:00') AT TIME ZONE 'America/Mazatlan',gen_random_uuid()))<>0 THEN RAISE EXCEPTION 'Corrección reservó automáticamente'; END IF;
 IF NOT EXISTS(SELECT 1 FROM privado."versionSolicitud" v WHERE tipo='espacio' AND "solicitudId"=id_espacio AND motivo='Cambió la fecha' AND v.anterior->>'fechaInicioSolicitado' IS DISTINCT FROM v.posterior->>'fechaInicioSolicitado') THEN RAISE EXCEPTION 'No conservó versión de espacio'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ajeno,'role','authenticated','session_id',sa)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.modificar_solicitud_espacio('corregir',datos||jsonb_build_object('folio',folio,'actualizadoEn',r->>'actualizadoEn','motivoCambio','Ajeno')); EXCEPTION WHEN no_data_found THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Corrigió solicitud de espacio ajena'; END IF;
 RESET ROLE;
 -- La respuesta a una alternativa también usa versión y conserva copia.
 UPDATE public."solicitudEspacio" SET "estadoSolicitud"='requiere_correccion',propuesta=jsonb_build_object('espacioId',sala,'inicio',((dia+2)+time '10:00') AT TIME ZONE 'America/Mazatlan','fin',((dia+2)+time '11:00') AT TIME ZONE 'America/Mazatlan','mensaje','Alternativa') WHERE id=id_espacio;
 SELECT privado.solicitud_espacio_para_usuario(x) INTO r FROM public."solicitudEspacio" x WHERE id=id_espacio;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',titular,'role','authenticated','session_id',st)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.modificar_solicitud_espacio('responder',jsonb_build_object('folio',folio,'actualizadoEn',r->>'actualizadoEn','acepta',true));
 IF r->>'estado'<>'en_revision' OR jsonb_array_length(r->'versiones')<>2 THEN RAISE EXCEPTION 'Respuesta no volvió a revisión con versión'; END IF;
 r:=public.modificar_solicitud_espacio('cancelar',jsonb_build_object('folio',folio,'actualizadoEn',r->>'actualizadoEn','motivo','Cambio de planes'));
 IF r->>'estado'<>'cancelada' OR jsonb_array_length(r->'versiones')<>3 THEN RAISE EXCEPTION 'No canceló espacio con historial'; END IF;
 RESET ROLE;
 IF NOT EXISTS(SELECT 1 FROM public."solicitudEspacio" WHERE id=id_espacio) THEN RAISE EXCEPTION 'Borró expediente de espacio'; END IF;
 -- Las solicitudes ya aprobadas siguen requiriendo una decisión del personal.
 SET LOCAL ROLE authenticated;
 r:=public.solicitudes_espacio('enviar',datos||jsonb_build_object('fecha',dia+10)); folio:=r->>'folio';
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',sp)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.atender_solicitudes_espacio('aprobar',jsonb_build_object('folio',folio,'actualizadoEn',r->>'actualizadoEn','verificacion',jsonb_build_array(true,true,true,true),'mensaje','Disponibilidad comprobada'));
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',titular,'role','authenticated','session_id',st)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.modificar_solicitud_espacio('corregir',datos||jsonb_build_object('folio',folio,'actualizadoEn',r->>'actualizadoEn','motivoCambio','Cambiar aprobada')); EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Titular cambió condiciones aprobadas directamente'; END IF;
 rechazo:=false; BEGIN PERFORM public.modificar_solicitud_espacio('cancelar',jsonb_build_object('folio',folio,'actualizadoEn',r->>'actualizadoEn','motivo','Cambio de planes')); EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Titular canceló reserva aprobada sin revisión'; END IF;
 RESET ROLE;
 IF jsonb_array_length(privado.ocupacion_espacio(sala,((dia+10)+time '10:00') AT TIME ZONE 'America/Mazatlan',((dia+10)+time '11:00') AT TIME ZONE 'America/Mazatlan',gen_random_uuid()))<>1 THEN RAISE EXCEPTION 'Intento de cambio liberó reserva aprobada'; END IF;
 UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=st;
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.modificar_solicitud_espacio('cancelar',jsonb_build_object('folio',folio,'actualizadoEn',r->>'actualizadoEn','motivo','Revocada')); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó sesión revocada'; END IF;
 RESET ROLE;
 RAISE NOTICE 'T-094: titularidad, versiones, motivos, reingreso a revisión y conservación de expedientes correctos.';
END $$;
ROLLBACK;
