-- HU-19 / CU-19 / T-097. Ejecutar después de inscripciones_responsables.sql.
-- SQL Editor con permisos de administrador. Datos temporales: termina con ROLLBACK.
-- No acredita la carrera de dos conexiones simultáneas; ver README_STEPHANIE.md.
BEGIN;
DO $$
DECLARE
 responsable uuid:=gen_random_uuid(); proponente uuid:=gen_random_uuid();
 participante uuid:=gen_random_uuid(); participante_dos uuid:=gen_random_uuid();
 sesion_responsable uuid:=gen_random_uuid(); sesion_proponente uuid:=gen_random_uuid();
 actividad_id uuid:=gen_random_uuid(); actividad_ajena uuid:=gen_random_uuid();
 sesion_id uuid:=gen_random_uuid(); sesion_ajena uuid:=gen_random_uuid();
 espacio_id uuid:=gen_random_uuid(); solicitud uuid:=gen_random_uuid(); segunda uuid:=gen_random_uuid();
 actual uuid; r jsonb; rechazado boolean; cantidad integer;
 registro jsonb:='{"nombres":"Prueba HU19","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH actual IN ARRAY ARRAY[responsable,proponente,participante,participante_dos] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(actual,actual::text||'@example.invalid',now(),jsonb_build_object('registro',registro));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at)
 VALUES(sesion_responsable,responsable,now()),(sesion_proponente,proponente,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion")
 VALUES(responsable,'responsable_actividades',responsable,'Prueba reversible HU19');
 INSERT INTO public.espacio(id,slug,nombre,capacidad,descripcion)
 VALUES(espacio_id,espacio_id::text,'Prueba HU19 '||espacio_id,2,'Prueba reversible');
 INSERT INTO public.actividad(id,slug,titulo,descripcion,categoria,audiencia,requerimientos,
  "estadoPublicacion","referenciaAutorizacion","referenciaPublicacion","creadoPor","requiereInscripcion")
 VALUES(actividad_id,actividad_id::text,'HU19 propia','Prueba reversible','taller','General','Revisión humana',
  'publicada','Acta de prueba','Publicación de prueba',responsable,true),
 (actividad_ajena,actividad_ajena::text,'HU19 ajena','Prueba reversible','taller','General','Revisión humana',
  'publicada','Acta de prueba','Publicación de prueba',proponente,true);
 INSERT INTO public."propuestaEvento"("tituloPropuesta",descripcion,"tipoPropuesta","publicoDirigido",
  "necesidadEspacio","estadoRevision","propuestoPor","revisadoPor","actividadId",
  "frecuenciaReunion","diasSolicitados","horarioSolicitado")
 VALUES('Propuesta HU19','Prueba reversible','taller','General','Sala','aprobada',proponente,
  responsable,actividad_id,'Una vez','Por acordar','Por acordar');
 INSERT INTO public."sesionActividad"(id,"actividadId","espacioId",inicio,fin,capacidad,estado,"registroAbierto")
 VALUES(sesion_id,actividad_id,espacio_id,now()+interval '10 days',now()+interval '10 days 1 hour',1,'programada',true),
 (sesion_ajena,actividad_ajena,espacio_id,now()+interval '11 days',now()+interval '11 days 1 hour',1,'programada',true);
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"actividadId","asignadoPor",motivo)
 VALUES(responsable,'confirmar_inscripciones',actividad_id,responsable,'Prueba limitada a una actividad');
 INSERT INTO public.inscripcion(id,"sesionId","usuarioId")
 VALUES(solicitud,sesion_id,participante),(segunda,sesion_id,participante_dos);

 -- Proponente sin capacidad: ni listado nominal ni cupos privados ni decisiones.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',proponente,'role','authenticated','session_id',sesion_proponente)::text,true);
 SET LOCAL ROLE authenticated;
 rechazado:=false;
 BEGIN PERFORM public.gestionar_inscripciones('listar',jsonb_build_object('sesionId',sesion_id));
 EXCEPTION WHEN insufficient_privilege THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'CA-19.2: proponente obtuvo participantes'; END IF;
 rechazado:=false;
 BEGIN PERFORM public.gestionar_inscripciones('confirmar',jsonb_build_object('inscripcionId',solicitud,'motivo','Sin permiso'));
 EXCEPTION WHEN insufficient_privilege THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Proponente confirmó sin permiso'; END IF;
 r:=public.gestionar_inscripciones('conteos',jsonb_build_object('sesionId',sesion_id));
 IF r->>'pendientes'<>'2' OR (SELECT count(*) FROM jsonb_object_keys(r))<>5
 OR NOT r ?& ARRAY['sesionId','pendientes','confirmados','rechazados','cancelados'] THEN
  RAISE EXCEPTION 'CA-19.2: conteos incorrectos o campos privados'; END IF;
 SELECT count(*) INTO cantidad FROM public.perfil WHERE id IN (participante,participante_dos);
 IF cantidad<>0 THEN RAISE EXCEPTION 'CA-19.2: RLS expone perfiles de participantes'; END IF;
 SELECT count(*) INTO cantidad FROM public.inscripcion WHERE id IN (solicitud,segunda);
 IF cantidad<>0 THEN RAISE EXCEPTION 'CA-19.2: acceso directo a inscripciones ajenas'; END IF;
 RESET ROLE;

 -- El permiso específico abre solo la actividad asignada; no basta ser personal.
 INSERT INTO public.personal("sesionId","usuarioId","asignadoPor") VALUES(sesion_ajena,responsable,responsable);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',responsable,'role','authenticated','session_id',sesion_responsable)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.gestionar_inscripciones('actividades');
 IF jsonb_array_length(r)<>1 OR r->0->>'id'<>actividad_id::text
 OR r->0->>'requerimientos'<>'Revisión humana' OR r->0->'sesiones'->0->>'id'<>sesion_id::text THEN
  RAISE EXCEPTION 'Ámbito o requerimientos incorrectos'; END IF;
 rechazado:=false;
 BEGIN PERFORM public.gestionar_inscripciones('listar',jsonb_build_object('sesionId',sesion_ajena));
 EXCEPTION WHEN insufficient_privilege THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Personal sin capacidad vio actividad ajena'; END IF;
 r:=public.gestionar_inscripciones('listar',jsonb_build_object('sesionId',sesion_id,'limite',1));
 IF jsonb_array_length(r)<>1 OR (SELECT count(*) FROM jsonb_object_keys(r->0))<>5
 OR NOT (r->0) ?& ARRAY['id','usuarioId','nombre','status','creadoA'] THEN
  RAISE EXCEPTION 'Proyección mínima o paginación incorrecta'; END IF;
 rechazado:=false;
 BEGIN PERFORM public.gestionar_inscripciones('confirmar',jsonb_build_object('inscripcionId',solicitud,'motivo',' '));
 EXCEPTION WHEN invalid_parameter_value THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Aceptó confirmación sin revisión documentada'; END IF;
 RESET ROLE;

 -- Solicitud no elegible: participante inactivo y registro cerrado.
 UPDATE public.perfil SET estatus='inactivo' WHERE id=participante;
 SET LOCAL ROLE authenticated;
 rechazado:=false;
 BEGIN PERFORM public.gestionar_inscripciones('confirmar',jsonb_build_object('inscripcionId',solicitud,'motivo','Revisado'));
 EXCEPTION WHEN check_violation THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Confirmó participante inactivo'; END IF;
 RESET ROLE;
 UPDATE public.perfil SET estatus='activo' WHERE id=participante;
 UPDATE public."sesionActividad" SET "registroAbierto"=false WHERE id=sesion_id;
 SET LOCAL ROLE authenticated;
 rechazado:=false;
 BEGIN PERFORM public.gestionar_inscripciones('confirmar',jsonb_build_object('inscripcionId',solicitud,'motivo','Revisado'));
 EXCEPTION WHEN check_violation THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Confirmó con registro cerrado'; END IF;
 RESET ROLE;
 UPDATE public."sesionActividad" SET "registroAbierto"=true WHERE id=sesion_id;

 -- CA-19.1: confirmación elegible, responsable real, motivo e historial atómicos.
 SET LOCAL ROLE authenticated;
 r:=public.gestionar_inscripciones('confirmar',jsonb_build_object('inscripcionId',solicitud,'motivo','Requisitos revisados'));
 IF r->>'status'<>'confirmada' OR r->>'decisionPor'<>responsable::text OR r->>'decididoA' IS NULL THEN
  RAISE EXCEPTION 'CA-19.1: falta estado o responsable'; END IF;
 r:=public.gestionar_inscripciones('cupos',jsonb_build_object('sesionId',sesion_id));
 IF r->>'confirmados'<>'1' OR r->>'disponibles'<>'0' THEN RAISE EXCEPTION 'Cupo incorrecto'; END IF;
 rechazado:=false;
 BEGIN PERFORM public.gestionar_inscripciones('confirmar',jsonb_build_object('inscripcionId',segunda,'motivo','Revisado'));
 EXCEPTION WHEN check_violation THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Sobrepasó la capacidad'; END IF;
 rechazado:=false;
 BEGIN PERFORM public.gestionar_inscripciones('confirmar',jsonb_build_object('inscripcionId',solicitud,'motivo','Duplicado'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Confirmación duplicada'; END IF;
 RESET ROLE;
 IF NOT EXISTS(SELECT 1 FROM public.inscripcion WHERE id=solicitud AND status='confirmada'
  AND "decisionPor"=responsable AND "decisionRazon"='Requisitos revisados' AND "decididoA" IS NOT NULL) THEN
  RAISE EXCEPTION 'CA-19.1: decisión no persistida'; END IF;
 IF (SELECT count(*) FROM public."historiaInscripcion" WHERE "inscripcionId"=solicitud
  AND "estadoPrevio"='pendiente' AND "estadoNuevo"='confirmada' AND "cambiadoPor"=responsable
  AND razon='Requisitos revisados')<>1 THEN RAISE EXCEPTION 'CA-19.1: historial incompleto'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inscripcion WHERE id=segunda AND status='pendiente' AND "decisionPor" IS NULL)
 OR EXISTS(SELECT 1 FROM public."historiaInscripcion" WHERE "inscripcionId"=segunda) THEN
  RAISE EXCEPTION 'El fallo de cupo dejó cambios parciales'; END IF;

 -- Cancelar libera el lugar, sin alterar asistencia. Sesión revocada no puede consultar.
 SET LOCAL ROLE authenticated;
 PERFORM public.gestionar_inscripciones('cancelar',jsonb_build_object('inscripcionId',solicitud,'motivo','Cancelación revisada'));
 r:=public.gestionar_inscripciones('cupos',jsonb_build_object('sesionId',sesion_id));
 IF r->>'disponibles'<>'1' THEN RAISE EXCEPTION 'Cancelación no liberó lugar'; END IF;
 RESET ROLE;
 DELETE FROM auth.sessions WHERE id=sesion_responsable;
 SET LOCAL ROLE authenticated;
 rechazado:=false;
 BEGIN PERFORM public.gestionar_inscripciones('listar',jsonb_build_object('sesionId',sesion_id));
 EXCEPTION WHEN insufficient_privilege OR invalid_authorization_specification THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Aceptó sesión revocada'; END IF;
 RESET ROLE;
END;
$$;
ROLLBACK;
SELECT 'HU-19: confirmación, cupo, actor, ámbito y privacidad OK; todo revertido' AS resultado;
