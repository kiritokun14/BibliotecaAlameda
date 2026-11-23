-- HU-17: pruebas transaccionales reversibles. Ejecutar después de cambios_actividad.sql.
-- No envía correos. Los usuarios, sesiones, actividades y avisos se revierten al final.
BEGIN;
DO $$
#variable_conflict use_variable
DECLARE autor uuid:=gen_random_uuid(); personal uuid:=gen_random_uuid(); otro uuid:=gen_random_uuid();
 sa uuid:=gen_random_uuid(); sp uuid:=gen_random_uuid(); so uuid:=gen_random_uuid(); u uuid;
 actividad uuid:=gen_random_uuid(); competidora uuid:=gen_random_uuid(); sala uuid:=gen_random_uuid();
 s1 uuid:=gen_random_uuid(); s2 uuid:=gen_random_uuid(); sc uuid:=gen_random_uuid();
 r jsonb; v jsonb; solicitud jsonb; acuerdo jsonb; folio text; rechazo boolean; aviso_ajeno text; antes timestamptz;
 registro jsonb:='{"nombres":"Prueba HU17","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH u IN ARRAY ARRAY[autor,personal,otro] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(u,u::text||'@example.invalid',now(),jsonb_build_object('registro',registro));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(sa,autor,now()),(sp,personal,now()),(so,otro,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion")
  VALUES(personal,'responsable_actividades',personal,'Prueba HU17 reversible');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo)
  VALUES(personal,'registrar_resoluciones_actividades',personal,'Prueba HU17 reversible');
 INSERT INTO public.espacio(id,slug,nombre,capacidad,descripcion) VALUES(sala,sala::text,'Sala HU17 '||sala,25,'Temporal');
 INSERT INTO public.actividad(id,slug,titulo,descripcion,categoria,audiencia,requerimientos,"estadoPublicacion","referenciaAutorizacion","referenciaPublicacion","creadoPor")
  VALUES(actividad,actividad::text,'Actividad HU17','Prueba','Taller','General','','publicada','Acuerdo inicial','Publicación',personal),
   (competidora,competidora::text,'Otra actividad','Prueba','Taller','General','','publicada','Acuerdo inicial','Publicación',personal);
 INSERT INTO public."sesionActividad"(id,"actividadId","espacioId",inicio,fin,capacidad,estado,"registroAbierto","referenciaAutorizacion")
  VALUES(s1,actividad,sala,'2035-06-12 10:00-07','2035-06-12 11:00-07',20,'programada',true,'Acuerdo inicial'),
   (s2,actividad,sala,'2035-06-13 10:00-07','2035-06-13 11:00-07',20,'programada',true,'Acuerdo inicial');
 INSERT INTO public."propuestaEvento"("tituloPropuesta",descripcion,"tipoPropuesta","publicoDirigido","necesidadEspacio","frecuenciaReunion","diasSolicitados","horarioSolicitado","propuestoPor","actividadId")
  VALUES('Propuesta propia','Prueba','Evento','General','Sala','Única','Por acordar','Por acordar',autor,actividad);
 INSERT INTO public.inscripcion("sesionId","usuarioId",status) VALUES(s1,otro,'pendiente'),(s2,otro,'pendiente');
 SELECT a.folio,a."actualizadoEn" INTO folio,antes FROM public.actividad a WHERE a.id=actividad;
 solicitud:=jsonb_build_object('actividad',folio,'actualizado',antes,'tipo','reprogramacion','sesiones',jsonb_build_array(s1),
  'programacion',jsonb_build_array(jsonb_build_object('sesionId',s1,'fecha','2035-06-12','inicio','12:00','fin','13:00','espacio','Sala HU17 '||sala)), 'motivo','Necesito otro horario');
 acuerdo:=jsonb_build_object('referencia','Acta HU17','autoridad','Dirección','fecha',(now() AT TIME ZONE 'America/Mazatlan')::date);

 SET LOCAL ROLE anon;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('listar'); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Permitió acceso anónimo'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',so)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('solicitar',solicitud); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Permitió solicitar actividad ajena'; END IF;
 IF jsonb_array_length(public.cambios_actividad('actividades'))<>0 THEN RAISE EXCEPTION 'Filtró actividades ajenas'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',autor,'role','authenticated','session_id',sa)::text,true);
 SET LOCAL ROLE authenticated;
 IF jsonb_array_length(public.cambios_actividad('actividades'))<>1 THEN RAISE EXCEPTION 'Perdió titularidad de la propuesta publicada por personal'; END IF;
 r:=public.cambios_actividad('solicitar',solicitud);
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('solicitar',solicitud); EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Duplicó solicitud pendiente por sesión'; END IF;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('resolver',jsonb_build_object('folio',r->>'folio','version',1,'decision','autorizar','motivo','Autorizo','acuerdo',acuerdo)); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Permitió resolver al titular'; END IF;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('aplicar',jsonb_build_object('folio',r->>'folio','version',1)); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Permitió aplicar al titular'; END IF;
 RESET ROLE;
 IF (SELECT inicio FROM public."sesionActividad" WHERE id=s1)<>'2035-06-12 10:00-07'::timestamptz
  OR (SELECT "actualizadoEn" FROM public.actividad WHERE id=actividad)<>antes THEN RAISE EXCEPTION 'CA17.1: solicitar cambió horario oficial'; END IF;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',sp)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('aplicar',jsonb_build_object('folio',r->>'folio','version',1)); EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aplicó sin autorización'; END IF;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('resolver',jsonb_build_object('folio',r->>'folio','version',1,'decision','autorizar','motivo','Procede'));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó autorización sin acuerdo'; END IF;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('resolver',jsonb_build_object('folio',r->>'folio','version',99,'decision','rechazar','motivo','No procede'));
 EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó versión obsoleta'; END IF;
 r:=public.cambios_actividad('resolver',jsonb_build_object('folio',r->>'folio','version',1,'decision','autorizar','motivo','Procede','acuerdo',acuerdo));
 RESET ROLE;
 IF (SELECT inicio FROM public."sesionActividad" WHERE id=s1)<>'2035-06-12 10:00-07'::timestamptz THEN RAISE EXCEPTION 'Autorizar aplicó implícitamente'; END IF;
 INSERT INTO public."sesionActividad"(id,"actividadId","espacioId",inicio,fin,capacidad,estado,"referenciaAutorizacion")
  VALUES(sc,competidora,sala,'2035-06-12 12:30-07','2035-06-12 13:30-07',10,'programada','Acuerdo');
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('aplicar',jsonb_build_object('folio',r->>'folio','version',2)); EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Reprogramó sobre un horario ocupado'; END IF;
 RESET ROLE;
 IF (SELECT inicio FROM public."sesionActividad" WHERE id=s1)<>'2035-06-12 10:00-07'::timestamptz THEN RAISE EXCEPTION 'Conflicto dejó actualización parcial'; END IF;
 UPDATE public."sesionActividad" SET estado='cancelada' WHERE id=sc;
 SET LOCAL ROLE authenticated;
 r:=public.cambios_actividad('aplicar',jsonb_build_object('folio',r->>'folio','version',2));
 v:=public.cambios_actividad('aplicar',jsonb_build_object('folio',r->>'folio','version',2));
 IF r IS DISTINCT FROM v THEN RAISE EXCEPTION 'Reaplicar no es idempotente'; END IF;
 RESET ROLE;
 IF (SELECT inicio FROM public."sesionActividad" WHERE id=s1)<>'2035-06-12 12:00-07'::timestamptz
  OR (SELECT inicio FROM public."sesionActividad" WHERE id=s2)<>'2035-06-13 10:00-07'::timestamptz THEN RAISE EXCEPTION 'Aplicó programación incorrecta'; END IF;
 IF (r->'avisos'->>'registrados')::integer<>3 THEN RAISE EXCEPTION 'No registró avisos únicos al titular, personal y participante'; END IF;

 -- Rechazar conserva la sesión, y una programación modificada invalida la aplicación.
 SELECT a."actualizadoEn" INTO antes FROM public.actividad a WHERE a.id=actividad;
 solicitud:=jsonb_build_object('actividad',folio,'actualizado',antes,'tipo','cancelacion','sesiones',jsonb_build_array(s2),'programacion','[]'::jsonb,'motivo','Cancelar segunda sesión');
 SET LOCAL ROLE authenticated;
 r:=public.cambios_actividad('solicitar',solicitud);
 r:=public.cambios_actividad('resolver',jsonb_build_object('folio',r->>'folio','version',1,'decision','rechazar','motivo','Se conserva la sesión'));
 RESET ROLE;
 IF (SELECT estado FROM public."sesionActividad" WHERE id=s2)<>'programada' THEN RAISE EXCEPTION 'Rechazar cambió sesión'; END IF;
 SET LOCAL ROLE authenticated;
 r:=public.cambios_actividad('solicitar',solicitud);
 r:=public.cambios_actividad('resolver',jsonb_build_object('folio',r->>'folio','version',1,'decision','autorizar','motivo','Procede','acuerdo',acuerdo));
 RESET ROLE;
 UPDATE public."sesionActividad" SET inicio=inicio+interval '15 minutes' WHERE id=s2;
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('aplicar',jsonb_build_object('folio',r->>'folio','version',2)); EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aplicó sobre programación distinta'; END IF;
 RESET ROLE;
 UPDATE public."sesionActividad" SET inicio=inicio-interval '15 minutes' WHERE id=s2;

 -- Simula fallo de infraestructura al registrar un aviso; la cancelación debe persistir.
 CREATE FUNCTION pg_temp.fallar_aviso_hu17() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RAISE EXCEPTION 'Fallo simulado'; END $f$;
 CREATE TRIGGER prueba_fallo_hu17 BEFORE INSERT ON public."avisoNotificacion" FOR EACH ROW EXECUTE FUNCTION pg_temp.fallar_aviso_hu17();
 SET LOCAL ROLE authenticated;
 r:=public.cambios_actividad('aplicar',jsonb_build_object('folio',r->>'folio','version',2));
 IF r->>'estado'<>'aplicado' OR (r->'avisos'->>'fallidos')::integer<>3 THEN RAISE EXCEPTION 'Fallo de aviso revirtió decisión o acreditó entrega'; END IF;
 RESET ROLE;
 IF (SELECT estado FROM public."sesionActividad" WHERE id=s2)<>'cancelada'
  OR (SELECT "registroAbierto" FROM public."sesionActividad" WHERE id=s2)
  OR jsonb_array_length(privado.ocupacion_espacio(sala,'2035-06-13 10:00-07','2035-06-13 11:00-07',gen_random_uuid()))<>0
  THEN RAISE EXCEPTION 'CA17.2: no canceló, cerró inscripción o liberó espacio'; END IF;
 IF (SELECT estado FROM public."sesionActividad" WHERE id=s1)<>'programada' THEN RAISE EXCEPTION 'Canceló sesión no solicitada'; END IF;
 DROP TRIGGER prueba_fallo_hu17 ON public."avisoNotificacion";
 SET LOCAL ROLE authenticated;
 r:=public.cambios_actividad('reintentar_avisos',jsonb_build_object('folio',r->>'folio','version',3));
 v:=public.cambios_actividad('reintentar_avisos',jsonb_build_object('folio',r->>'folio','version',3));
 IF (r->'avisos'->>'fallidos')::integer<>0 OR (r->'avisos'->>'registrados')::integer<>3 OR r IS DISTINCT FROM v THEN RAISE EXCEPTION 'Reintento perdió o duplicó avisos'; END IF;
 RESET ROLE;
 SELECT a."actualizadoEn" INTO antes FROM public.actividad a WHERE a.id=actividad;
 SET LOCAL ROLE authenticated;
 r:=public.cambios_actividad('solicitar',solicitud||jsonb_build_object('actualizado',antes,'sesiones',jsonb_build_array(s1)));
 r:=public.cambios_actividad('resolver',jsonb_build_object('folio',r->>'folio','version',1,'decision','autorizar','motivo','Procede','acuerdo',acuerdo));
 r:=public.cambios_actividad('aplicar',jsonb_build_object('folio',r->>'folio','version',2));
 RESET ROLE;
 SELECT privado.actividad_agenda(a,true) INTO v FROM public.actividad a WHERE id=actividad;
 IF v->>'estado'<>'cancelada' OR jsonb_array_length(v->'sesiones')<>2 THEN RAISE EXCEPTION 'No identificó cancelación o borró sesiones'; END IF;
 IF NOT EXISTS(SELECT 1 FROM privado."historialActividad" WHERE "actividadId"=actividad AND accion='cancelacion') THEN RAISE EXCEPTION 'No dejó historial'; END IF;
 -- Quien participa recibe sus avisos, aunque no pueda consultar la solicitud del organizador.
 SELECT n.id::text INTO aviso_ajeno FROM public."avisoNotificacion" n WHERE n."usuarioId"=personal LIMIT 1;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',so)::text,true);
 SET LOCAL ROLE authenticated;
 v:=public.cambios_actividad('avisos');
 IF (v->>'total')::integer<>3 THEN RAISE EXCEPTION 'No mostró los avisos del participante'; END IF;
 PERFORM public.cambios_actividad('leer_aviso',jsonb_build_object('id',v->'avisos'->0->>'id'));
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('leer_aviso',jsonb_build_object('id',aviso_ajeno)); EXCEPTION WHEN no_data_found THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Marcó aviso de otra persona'; END IF;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('obtener',jsonb_build_object('folio',r->>'folio')); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Participar permitió consultar solicitud ajena'; END IF;
 RESET ROLE;
 -- El permiso de resolución limitado a otra actividad no habilita ésta.
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion") VALUES(otro,'responsable_actividades',personal,'Prueba de ámbito');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"actividadId","asignadoPor",motivo) VALUES(otro,'registrar_resoluciones_actividades',competidora,personal,'Solo otra actividad');
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('aplicar',jsonb_build_object('folio',r->>'folio','version',3)); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Ignoró ámbito de resolución'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',sp)::text,true);
 UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=sp;
 SET LOCAL ROLE authenticated;
 rechazo:=false; BEGIN PERFORM public.cambios_actividad('listar'); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó sesión revocada'; END IF;
 RESET ROLE;
 RAISE NOTICE 'HU-17: titularidad, permisos, versiones, conflictos, aplicación, cancelación, historial, avisos y reintentos correctos.';
END $$;
ROLLBACK;
