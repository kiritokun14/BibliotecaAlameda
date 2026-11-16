-- Prueba real de permisos, filtros, autorización, persistencia y retiro. Todo se revierte.
BEGIN;
DO $$
#variable_conflict use_variable
DECLARE autor uuid:=gen_random_uuid(); personal uuid:=gen_random_uuid(); otro uuid:=gen_random_uuid();
 s_autor uuid:=gen_random_uuid(); s_personal uuid:=gen_random_uuid(); s_otro uuid:=gen_random_uuid();
 id_actual uuid; espacio_id uuid:=gen_random_uuid(); r jsonb; viejo jsonb; folio text; rechazo boolean;
 registro jsonb:='{"nombres":"Prueba agenda","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
 datos jsonb; propuesta_id uuid:=gen_random_uuid(); version_propuesta timestamptz; total_antes integer;
BEGIN
 FOREACH id_actual IN ARRAY ARRAY[autor,personal,otro] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',registro));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(s_autor,autor,now()),(s_personal,personal,now()),(s_otro,otro,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion")
 VALUES(personal,'responsable_actividades',personal,'Prueba reversible');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo)
 VALUES(personal,'gestionar_actividades',personal,'Prueba reversible'),
 (personal,'registrar_resoluciones_actividades',personal,'Prueba reversible'),
 (personal,'publicar_contenidos',personal,'Prueba reversible');
 INSERT INTO public.espacio(id,slug,nombre,capacidad,descripcion)
 VALUES(espacio_id,espacio_id::text,'Espacio prueba '||espacio_id::text,25,'Solo dentro de esta transacción');
 datos:=jsonb_build_object('nombre','Taller reversible '||autor,'tipo','Taller','descripcion','Descripción pública',
 'fecha','2035-06-12','inicio','10:00','fin','11:00','espacio','Espacio prueba '||espacio_id,
 'cupo','20','inscripcion',true,'publico','Público general','responsable','Área pública','materiales','Traer lápiz','estado','borrador');

 INSERT INTO public."propuestaEvento"(id,"tituloPropuesta",descripcion,"tipoPropuesta","publicoDirigido","necesidadEspacio","estadoRevision","propuestoPor","revisadoPor","frecuenciaReunion","diasSolicitados","horarioSolicitado")
 VALUES(propuesta_id,'Propuesta reversible','Texto privado','Evento','General','Sala','aprobada',autor,personal,'Única','2035-06-12','10:00 a 11:00');
 INSERT INTO privado."historialSolicitud"("propuestaEventoId",accion,"estadoAnterior","estadoNuevo",nota,"realizadoPor","acuerdoDireccion")
 VALUES(propuesta_id,'resolver','en_revision','aprobada','Autorizada',personal,jsonb_build_object('responsable','Dirección','fecha',current_date,'referencia','Oficio de prueba'));
 SELECT "actualizadoEn" INTO version_propuesta FROM public."propuestaEvento" WHERE id=propuesta_id;
 datos:=(datos-'estado')||jsonb_build_object('id',propuesta_id,'actualizadoEn',version_propuesta,'confirmacion',true);
 SELECT count(*) INTO total_antes FROM public.actividad;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',autor,'role','authenticated','session_id',s_autor)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.publicar_propuesta(datos); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Autor publicó su propuesta'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',s_personal)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.publicar_propuesta(datos||jsonb_build_object('actualizadoEn','2000-01-01T00:00:00Z')); EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó versión vieja'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.publicar_propuesta(datos||jsonb_build_object('cupo','999')); EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó cupo excesivo'; END IF;
 RESET ROLE;
 IF (SELECT count(*) FROM public.actividad)<>total_antes THEN RAISE EXCEPTION 'Quedó actividad huérfana'; END IF;
 SET LOCAL ROLE authenticated;
 r:=public.publicar_propuesta(datos); folio:=r->>'folio';
 IF r->>'estado'<>'publicada' OR jsonb_array_length(r->'sesiones')<>1 THEN RAISE EXCEPTION 'No publicó la sesión'; END IF;
 viejo:=public.publicar_propuesta(datos);
 IF viejo->>'folio'<>folio THEN RAISE EXCEPTION 'Duplicó reintento'; END IF;
 RESET ROLE;
 IF (SELECT count(*) FROM public.actividad)<>total_antes+1 THEN RAISE EXCEPTION 'Duplicó actividad'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."propuestaEvento" p JOIN public.actividad a ON a.id=p."actividadId" WHERE p.id=propuesta_id AND a.folio=folio) THEN RAISE EXCEPTION 'No vinculó propuesta'; END IF;
 SET LOCAL ROLE anon;
 r:=public.agenda_publica(jsonb_build_object('identificador',folio,'desde','2035-06-12'));
 IF r->>'total'<>'1' THEN RAISE EXCEPTION 'No aparece en agenda pública'; END IF;
 RESET ROLE;
 -- Otra propuesta aprobada no puede ocupar la misma sala y horario.
 propuesta_id:=gen_random_uuid();
 INSERT INTO public."propuestaEvento"(id,"tituloPropuesta",descripcion,"tipoPropuesta","publicoDirigido","necesidadEspacio","estadoRevision","propuestoPor","revisadoPor","frecuenciaReunion","diasSolicitados","horarioSolicitado")
 VALUES(propuesta_id,'Otra reversible','Texto','Evento','General','Sala','aprobada',autor,personal,'Única','2035-06-12','10:00 a 11:00');
 INSERT INTO privado."historialSolicitud"("propuestaEventoId",accion,"estadoNuevo",nota,"realizadoPor","acuerdoDireccion")
 VALUES(propuesta_id,'resolver','aprobada','Autorizada',personal,jsonb_build_object('responsable','Dirección','fecha',current_date,'referencia','Oficio'));
 SELECT "actualizadoEn" INTO version_propuesta FROM public."propuestaEvento" WHERE id=propuesta_id;
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.publicar_propuesta(datos||jsonb_build_object('id',propuesta_id,'actualizadoEn',version_propuesta)); EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Doble reserva'; END IF;
 RESET ROLE;
END; $$;
ROLLBACK;
