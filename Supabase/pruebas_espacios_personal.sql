-- Ejecutar después de espacios_personal.sql. ROLLBACK: no deja registros.
-- Cuentas, sesiones, áreas y actividades ficticias dentro de BEGIN/ROLLBACK.
BEGIN;
CREATE FUNCTION pg_temp.atender_espacios_prueba(operacion text, datos jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql AS $$
 SELECT public.atender_solicitudes_espacio(operacion,
  CASE WHEN operacion IN ('aprobar','proponer','rechazar','cancelar') AND NOT datos ? 'actualizadoEn'
  THEN datos||jsonb_build_object('actualizadoEn',(SELECT "actualizadoEn" FROM public."solicitudEspacio" WHERE folio=datos->>'folio')) ELSE datos END);
$$;
DO $$
DECLARE
 ana uuid:=gen_random_uuid(); beto uuid:=gen_random_uuid(); resp uuid:=gen_random_uuid(); edi uuid:=gen_random_uuid();
 s_ana uuid:=gen_random_uuid(); s_beto uuid:=gen_random_uuid(); s_resp uuid:=gen_random_uuid(); s_edi uuid:=gen_random_uuid();
 actividad uuid:=gen_random_uuid(); sala uuid;
 id_actual uuid; r jsonb; fa text; fb text; fc text; fd text; rechazo boolean; manana date; n integer;
 todo_bien jsonb:='[true,true,true,true]';
 datos jsonb:='{"nombres":"Prueba T076","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH id_actual IN ARRAY ARRAY[ana,beto,resp,edi] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',datos));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(s_ana,ana,now()),(s_beto,beto,now()),(s_resp,resp,now()),(s_edi,edi,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion") VALUES
  (resp,'responsable_actividades',resp,'Prueba reversible'),(edi,'editor',resp,'Prueba reversible');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo) VALUES
  (resp,'registrar_resoluciones_actividades',resp,'Prueba reversible'),(edi,'preparar_contenidos',resp,'Prueba reversible');
 INSERT INTO public.espacio(slug,nombre,capacidad,descripcion,activo) VALUES
  ('prueba-t076-sala','Sala de prueba T076',10,'Prueba reversible',true),
  ('prueba-t076-patio','Patio de prueba T076',40,'Prueba reversible',true);
 SELECT id INTO sala FROM public.espacio WHERE slug='prueba-t076-sala';
 manana:=(now() AT TIME ZONE 'America/Mazatlan')::date+1;

 -- Dos personas piden el mismo horario (CA-16.2)
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ana,'role','authenticated','session_id',s_ana)::text,true);
 fa:=public.solicitudes_espacio('enviar',jsonb_build_object('espacio','prueba-t076-sala','fecha',manana,
   'horaInicio','10:00','horaFin','12:00','personas',8,'motivo','Taller de lectura'))->>'folio';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',beto,'role','authenticated','session_id',s_beto)::text,true);
 fb:=public.solicitudes_espacio('enviar',jsonb_build_object('espacio','prueba-t076-sala','fecha',manana,
   'horaInicio','10:00','horaFin','12:00','personas',5,'motivo','Club de tareas'))->>'folio';

 -- Sin la capacidad no se entra a la atención (persona usuaria y editor)
 FOREACH id_actual IN ARRAY ARRAY[ana,edi] LOOP
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',id_actual,'role','authenticated',
    'session_id',CASE WHEN id_actual=ana THEN s_ana ELSE s_edi END)::text,true);
  rechazo:=false;
  BEGIN PERFORM pg_temp.atender_espacios_prueba('bandeja');
  EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
  IF NOT rechazo THEN RAISE EXCEPTION 'Entró a la bandeja sin capacidad.'; END IF;
 END LOOP;

 -- Bandeja y detalle
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',resp,'role','authenticated','session_id',s_resp)::text,true);
 r:=pg_temp.atender_espacios_prueba('bandeja',jsonb_build_object('buscar',fa));
 IF (r->>'total')::integer<>1 OR r->'solicitudes'->0->>'folio'<>fa OR (r->'conteos'->>'en_revision')::integer<2 THEN
  RAISE EXCEPTION 'Bandeja incorrecta: %',r; END IF;
 r:=pg_temp.atender_espacios_prueba('obtener',jsonb_build_object('folio',fa));
 IF r->'solicitante'->>'nombre'<>'Prueba T076 Temporal' OR jsonb_array_length(r->'ocupacion')<>0
    OR r->'historial'->0->>'realizadoPor'<>'Prueba T076 Temporal' THEN RAISE EXCEPTION 'Detalle incorrecto: %',r; END IF;
 rechazo:=false;
 BEGIN PERFORM pg_temp.atender_espacios_prueba('aprobar',jsonb_build_object('folio',fa,'estado','aprobada'));
 EXCEPTION WHEN invalid_parameter_value THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó un campo no permitido.'; END IF;

 -- Criterio 3: aprobar exige la verificación completa y registra quién la hizo
 FOR r IN SELECT x FROM jsonb_array_elements('[null,[],[true],[true,false],["si"]]'::jsonb) x LOOP
  rechazo:=false;
  BEGIN PERFORM pg_temp.atender_espacios_prueba('aprobar',jsonb_build_object('folio',fa,'verificacion',r));
  EXCEPTION WHEN check_violation THEN rechazo:=true; END;
  IF NOT rechazo THEN RAISE EXCEPTION 'Aprobó sin verificación completa: %',r; END IF;
 END LOOP;
 r:=pg_temp.atender_espacios_prueba('aprobar',jsonb_build_object('folio',fa,'verificacion',todo_bien,
   'condiciones','Respetar el cupo máximo del área','mensaje','Te esperamos'));
 IF r->>'estado'<>'aprobada' OR r->>'autorizadoPor'<>'Prueba T076 Temporal' OR r->'acuerdo'->'espacio'->>'slug'<>'prueba-t076-sala'
    OR r->'acuerdo'->>'condiciones'<>'Respetar el cupo máximo del área' THEN RAISE EXCEPTION 'Aprobación incorrecta: %',r; END IF;
 IF (SELECT "autorizadoPor"<>resp OR "inicioAcordado"<>"fechaInicioSolicitado" FROM public."solicitudEspacio" WHERE folio=fa)
    OR NOT EXISTS(SELECT 1 FROM public."historialSolicitudEspacio" h JOIN public."solicitudEspacio" s ON s.id=h."solicitudId"
                  WHERE s.folio=fa AND h.accion='aprobacion' AND h."realizadoPor"=resp AND h.detalles->'verificacion'=todo_bien)
    OR NOT EXISTS(SELECT 1 FROM public."avisoNotificacion" WHERE "usuarioId"=ana AND "tipoAviso"='solicitud_espacio') THEN
  RAISE EXCEPTION 'La aprobación no quedó registrada con su verificación o aviso.'; END IF;

 -- CA-16.2: la segunda solicitud del mismo horario no se puede aprobar también
 r:=pg_temp.atender_espacios_prueba('obtener',jsonb_build_object('folio',fb));
 IF jsonb_array_length(r->'ocupacion')<>1 OR r->'ocupacion'->0->>'folio'<>fa THEN RAISE EXCEPTION 'No mostró la ocupación: %',r; END IF;
 rechazo:=false;
 BEGIN PERFORM pg_temp.atender_espacios_prueba('aprobar',jsonb_build_object('folio',fb,'verificacion',todo_bien));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aprobó dos solicitudes en el mismo horario.'; END IF;

 -- Criterios 1, 2 y 4: proponer otro horario; lo solicitado no cambia; la persona responde y vuelve a revisión
 FOR r IN SELECT x FROM jsonb_array_elements(jsonb_build_array(
   jsonb_build_object('folio',fb,'horaInicio','14:00','horaFin','16:00'),
   jsonb_build_object('folio',fb,'mensaje','Sin cambios'),
   jsonb_build_object('folio',fb,'horaInicio','10:00','mensaje','Igual que antes'),
   jsonb_build_object('folio',fb,'fecha',manana-3,'mensaje','Fecha pasada'),
   jsonb_build_object('folio',fb,'espacio','no-existe','mensaje','Área falsa')
 )) x LOOP
  rechazo:=false;
  BEGIN PERFORM pg_temp.atender_espacios_prueba('proponer',r);
  EXCEPTION WHEN check_violation THEN rechazo:=true; END;
  IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó una propuesta inválida: %',r; END IF;
 END LOOP;
 r:=pg_temp.atender_espacios_prueba('proponer',jsonb_build_object('folio',fb,'horaInicio','14:00','horaFin','16:00',
   'mensaje','Ese horario ya está ocupado'));
 IF r->>'estado'<>'requiere_correccion' OR r->'propuesta'->>'mensaje'<>'Ese horario ya está ocupado' OR r->'acuerdo'<>'null'::jsonb THEN
  RAISE EXCEPTION 'Propuesta incorrecta: %',r; END IF;
 rechazo:=false;
 BEGIN PERFORM pg_temp.atender_espacios_prueba('aprobar',jsonb_build_object('folio',fb,'verificacion',todo_bien));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aprobó sin la respuesta de la persona.'; END IF;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',beto,'role','authenticated','session_id',s_beto)::text,true);
 r:=public.solicitudes_espacio('obtener',jsonb_build_object('folio',fb));
 IF r->'propuesta'->>'mensaje'<>'Ese horario ya está ocupado' OR r->'historial'->-1->>'porPersonal'<>'true'
    OR r->'historial'->-1 ? 'realizadoPor' THEN RAISE EXCEPTION 'La persona no ve bien la propuesta: %',r; END IF;
 rechazo:=false;
 BEGIN PERFORM public.solicitudes_espacio('responder',jsonb_build_object('folio',fb,'acepta','si'));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó una respuesta no booleana.'; END IF;
 r:=public.solicitudes_espacio('responder',jsonb_build_object('folio',fb,'acepta',true,'comentarios','Gracias'));
 IF r->>'estado'<>'en_revision' OR r->'propuesta'<>'null'::jsonb OR r->'acuerdo' IS NULL OR r->'acuerdo'='null'::jsonb THEN
  RAISE EXCEPTION 'Respuesta incorrecta: %',r; END IF;
 IF (SELECT "fechaInicioSolicitado"<>((manana+time '10:00') AT TIME ZONE 'America/Mazatlan')
        OR "inicioAcordado"<>((manana+time '14:00') AT TIME ZONE 'America/Mazatlan')
     FROM public."solicitudEspacio" WHERE folio=fb) THEN RAISE EXCEPTION 'Se mezcló lo solicitado con lo acordado.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.solicitudes_espacio('responder',jsonb_build_object('folio',fb,'acepta',true));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Respondió dos veces.'; END IF;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',resp,'role','authenticated','session_id',s_resp)::text,true);
 r:=pg_temp.atender_espacios_prueba('aprobar',jsonb_build_object('folio',fb,'verificacion',todo_bien));
 IF r->>'estado'<>'aprobada' OR (r->'acuerdo'->>'inicio')::timestamptz<>((manana+time '14:00') AT TIME ZONE 'America/Mazatlan') THEN
  RAISE EXCEPTION 'No aprobó lo acordado: %',r; END IF;
 IF (SELECT count(*) FROM public."historialSolicitudEspacio" h JOIN public."solicitudEspacio" s ON s.id=h."solicitudId"
     WHERE s.folio=fb)<>4 THEN RAISE EXCEPTION 'Faltan pasos en la bitácora.'; END IF;

 -- Choque con una sesión de actividad programada
 INSERT INTO public.actividad(id,slug,titulo,descripcion,categoria,audiencia,requerimientos,"creadoPor")
  VALUES(actividad,actividad::text,'Actividad ficticia T076','Prueba','prueba','general','ninguno',resp);
 INSERT INTO public."sesionActividad"("actividadId","espacioId",inicio,fin,capacidad,estado)
  VALUES(actividad,sala,(manana+3+time '09:00') AT TIME ZONE 'America/Mazatlan',
         (manana+3+time '11:00') AT TIME ZONE 'America/Mazatlan',10,'programada');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ana,'role','authenticated','session_id',s_ana)::text,true);
 fc:=public.solicitudes_espacio('enviar',jsonb_build_object('espacio','prueba-t076-sala','fecha',manana+3,
   'horaInicio','10:00','horaFin','12:00','personas',4,'motivo','Lectura en voz alta'))->>'folio';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',resp,'role','authenticated','session_id',s_resp)::text,true);
 rechazo:=false;
 BEGIN PERFORM pg_temp.atender_espacios_prueba('aprobar',jsonb_build_object('folio',fc,'verificacion',todo_bien));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aprobó encima de una actividad.'; END IF;

 -- Rechazar pide motivo y mensaje; no se rechaza dos veces
 rechazo:=false;
 BEGIN PERFORM pg_temp.atender_espacios_prueba('rechazar',jsonb_build_object('folio',fc,'mensaje','Sin motivo'));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Rechazó sin motivo.'; END IF;
 r:=pg_temp.atender_espacios_prueba('rechazar',jsonb_build_object('folio',fc,'motivo','El área no está disponible',
   'mensaje','Hay una actividad ese día'));
 IF r->>'estado'<>'rechazada' OR r->>'observaciones'<>'Hay una actividad ese día' THEN RAISE EXCEPTION 'Rechazo incorrecto: %',r; END IF;
 rechazo:=false;
 BEGIN PERFORM pg_temp.atender_espacios_prueba('rechazar',jsonb_build_object('folio',fc,'motivo','Otro motivo','mensaje','x'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Rechazó dos veces.'; END IF;

 -- Reprogramar una aprobada libera el espacio; si la persona no acepta, se conserva el acuerdo anterior
 r:=pg_temp.atender_espacios_prueba('proponer',jsonb_build_object('folio',fa,'fecha',manana+1,'mensaje','Cambio en la agenda'));
 IF r->>'estado'<>'requiere_correccion' THEN RAISE EXCEPTION 'No reprogramó: %',r; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ana,'role','authenticated','session_id',s_ana)::text,true);
 r:=public.solicitudes_espacio('responder',jsonb_build_object('folio',fa,'acepta',false,'comentarios','Prefiero la fecha original'));
 IF r->>'estado'<>'en_revision' OR (r->'acuerdo'->>'inicio')::timestamptz<>((manana+time '10:00') AT TIME ZONE 'America/Mazatlan') THEN
  RAISE EXCEPTION 'No conservó el acuerdo anterior: %',r; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',resp,'role','authenticated','session_id',s_resp)::text,true);
 PERFORM pg_temp.atender_espacios_prueba('aprobar',jsonb_build_object('folio',fa,'verificacion',todo_bien));

 -- Cancelar solo una aprobada
 rechazo:=false;
 BEGIN PERFORM pg_temp.atender_espacios_prueba('cancelar',jsonb_build_object('folio',fc,'motivo','Otro motivo','mensaje','x'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Canceló una no aprobada.'; END IF;
 r:=pg_temp.atender_espacios_prueba('cancelar',jsonb_build_object('folio',fa,'motivo','Cambio en la agenda de la biblioteca',
   'mensaje','Lo sentimos'));
 IF r->>'estado'<>'cancelada' OR r->>'motivoCancelacion'<>'Cambio en la agenda de la biblioteca' THEN
  RAISE EXCEPTION 'Cancelación del personal incorrecta: %',r; END IF;

 -- Si la persona cancela con una propuesta pendiente, la propuesta se limpia
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ana,'role','authenticated','session_id',s_ana)::text,true);
 fd:=public.solicitudes_espacio('enviar',jsonb_build_object('espacio','prueba-t076-patio','fecha',manana+5,
   'horaInicio','10:00','horaFin','11:00','personas',20,'motivo','Ensayo'))->>'folio';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',resp,'role','authenticated','session_id',s_resp)::text,true);
 rechazo:=false;
 BEGIN PERFORM pg_temp.atender_espacios_prueba('proponer',jsonb_build_object('folio',fd,'espacio','prueba-t076-sala','mensaje','Otra sala'));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Propuso un área sin cupo suficiente.'; END IF;
 PERFORM pg_temp.atender_espacios_prueba('proponer',jsonb_build_object('folio',fd,'horaInicio','12:00','horaFin','13:00','mensaje','Más tarde'));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ana,'role','authenticated','session_id',s_ana)::text,true);
 r:=public.solicitudes_espacio('cancelar',jsonb_build_object('folio',fd,'motivo','Ya no lo necesito'));
 IF r->>'estado'<>'cancelada' OR r->'propuesta'<>'null'::jsonb THEN RAISE EXCEPTION 'Cancelación con propuesta incorrecta: %',r; END IF;

 SELECT count(*) INTO n FROM public."avisoNotificacion" WHERE "usuarioId"=ana AND "tipoAviso"='solicitud_espacio';
 IF n<>6 THEN RAISE EXCEPTION 'Avisos para la persona: % (se esperaban 6).',n; END IF;

 -- No se puede resolver una solicitud propia aun teniendo permiso institucional.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',resp,'role','authenticated','session_id',s_resp)::text,true);
 r:=public.solicitudes_espacio('enviar',jsonb_build_object('espacio','prueba-t076-patio','fecha',manana+6,
   'horaInicio','10:00','horaFin','11:00','personas',5,'motivo','Solicitud propia reversible'));
 rechazo:=false;
 BEGIN PERFORM public.atender_solicitudes_espacio('aprobar',jsonb_build_object('folio',r->>'folio','actualizadoEn',r->>'actualizadoEn','verificacion',todo_bien));
 EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Autoaprobación permitida'; END IF;
 -- El contrato público exige la versión leída, incluso al decidir sobre otra persona.
 rechazo:=false;
 BEGIN PERFORM public.atender_solicitudes_espacio('rechazar',jsonb_build_object('folio',fb,'actualizadoEn','2000-01-01T00:00:00Z','motivo','Prueba','mensaje','Prueba'));
 EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó versión obsoleta'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.atender_solicitudes_espacio('rechazar',jsonb_build_object('folio',fb,'motivo','Prueba','mensaje','Prueba'));
 EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó decisión sin versión'; END IF;

 RAISE NOTICE 'Pruebas de atención de solicitudes de espacio: OK';
END $$;
ROLLBACK;
SELECT 'Espacios: disponibilidad, alternativas, permisos, versiones y horario de Tepic OK; registros de prueba revertidos' resultado;
