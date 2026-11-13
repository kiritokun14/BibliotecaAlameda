-- Ejecutar después de solicitudes_espacio.sql. ROLLBACK: no deja registros.
-- Cuentas, sesiones y áreas ficticias dentro de BEGIN/ROLLBACK.
BEGIN;
DO $$
DECLARE
 ana uuid:=gen_random_uuid(); beto uuid:=gen_random_uuid(); s_ana uuid:=gen_random_uuid(); s_beto uuid:=gen_random_uuid();
 id_actual uuid; r jsonb; v_folio text; v_folio2 text; rechazo boolean; i integer; manana date;
 datos jsonb:='{"nombres":"Prueba HU16","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH id_actual IN ARRAY ARRAY[ana,beto] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',datos));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(s_ana,ana,now()),(s_beto,beto,now());
 INSERT INTO public.espacio(slug,nombre,capacidad,descripcion,activo) VALUES
  ('prueba-hu16-sala','Sala de prueba HU16',10,'Prueba reversible',true),
  ('prueba-hu16-cerrada','Sala cerrada HU16',10,'Prueba reversible',false);
 manana:=(now() AT TIME ZONE 'America/Mazatlan')::date+1;

 -- Sin sesión no se entra
 PERFORM set_config('request.jwt.claims','',true);
 rechazo:=false;
 BEGIN PERFORM public.solicitudes_espacio('areas');
 EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se consultó sin sesión.'; END IF;

 -- CA-16.1: una cuenta SIN credencial puede enviar; queda en revisión, sin reserva
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ana,'role','authenticated','session_id',s_ana)::text,true);
 IF EXISTS(SELECT 1 FROM public."credencialBibliotecaria" WHERE "usuarioId"=ana) THEN RAISE EXCEPTION 'La cuenta tiene credencial.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.solicitudes_espacio('areas')) a WHERE a->>'slug'='prueba-hu16-sala')
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(public.solicitudes_espacio('areas')) a WHERE a->>'slug'='prueba-hu16-cerrada') THEN
  RAISE EXCEPTION 'La lista de áreas no respeta activo.'; END IF;
 r:=public.solicitudes_espacio('enviar',jsonb_build_object('tipo','uso_espacio','espacio','prueba-hu16-sala',
   'fecha',manana,'horaInicio','10:00','horaFin','12:00','personas',8,'motivo','Taller de lectura'));
 v_folio:=r->>'folio';
 IF v_folio !~ '^SE-[0-9]{4,}$' OR r->>'estado'<>'en_revision' OR r->'espacio'->>'slug'<>'prueba-hu16-sala'
    OR jsonb_array_length(r->'historial')<>1 THEN RAISE EXCEPTION 'Solicitud mal creada: %',r; END IF;
 IF (SELECT "sesionAsignadaId" IS NOT NULL OR "autorizadoPor" IS NOT NULL OR "nombreResponsable"<>'Prueba HU16 Temporal'
     OR "telefonoContacto"<>'3110000000' FROM public."solicitudEspacio" WHERE folio=v_folio) THEN
  RAISE EXCEPTION 'La solicitud se asignó sola o tomó mal el contacto.'; END IF;

 -- CA-16.2: otra persona pide el mismo horario; ambas quedan en revisión
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',beto,'role','authenticated','session_id',s_beto)::text,true);
 r:=public.solicitudes_espacio('enviar',jsonb_build_object('espacio','prueba-hu16-sala',
   'fecha',manana,'horaInicio','10:00','horaFin','12:00','personas',5,'motivo','Club de tareas'));
 v_folio2:=r->>'folio';
 IF (SELECT count(*) FROM public."solicitudEspacio" WHERE folio IN (v_folio,v_folio2) AND "estadoSolicitud"='en_revision'
     AND "sesionAsignadaId" IS NULL)<>2 THEN RAISE EXCEPTION 'El mismo horario no quedó en revisión para ambas.'; END IF;

 -- Visita sin área: se acepta
 r:=public.solicitudes_espacio('enviar',jsonb_build_object('tipo','visita','fecha',manana,'horaInicio','09:00',
   'horaFin','10:00','personas',25,'motivo','Visita guiada escolar','institucion','Primaria de prueba'));
 IF r->>'tipo'<>'visita' OR r->'espacio'<>'null'::jsonb THEN RAISE EXCEPTION 'Visita mal creada: %',r; END IF;

 -- No se ve la solicitud de otra persona
 rechazo:=false;
 BEGIN PERFORM public.solicitudes_espacio('obtener',jsonb_build_object('folio',v_folio));
 EXCEPTION WHEN no_data_found THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se consultó una solicitud ajena.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.solicitudes_espacio('cancelar',jsonb_build_object('folio',v_folio));
 EXCEPTION WHEN no_data_found THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se canceló una solicitud ajena.'; END IF;

 -- Validaciones del envío
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ana,'role','authenticated','session_id',s_ana)::text,true);
 FOR r IN SELECT x FROM jsonb_array_elements(jsonb_build_array(
   jsonb_build_object('espacio','prueba-hu16-sala','fecha',manana-2,'horaInicio','10:00','horaFin','11:00','personas',3,'motivo','Pasado'),
   jsonb_build_object('espacio','prueba-hu16-sala','fecha',manana,'horaInicio','11:00','horaFin','10:00','personas',3,'motivo','Al revés'),
   jsonb_build_object('espacio','prueba-hu16-sala','fecha',manana,'horaInicio','10:00','horaFin','11:00','personas',11,'motivo','Excede capacidad'),
   jsonb_build_object('espacio','prueba-hu16-cerrada','fecha',manana,'horaInicio','10:00','horaFin','11:00','personas',3,'motivo','Inactiva'),
   jsonb_build_object('fecha',manana,'horaInicio','10:00','horaFin','11:00','personas',3,'motivo','Uso sin área'),
   jsonb_build_object('espacio','prueba-hu16-sala','fecha',manana,'horaInicio','10:00','horaFin','11:00','personas',3,'motivo','   '),
   jsonb_build_object('espacio','prueba-hu16-sala','fecha','no-es-fecha','horaInicio','10:00','horaFin','11:00','personas',3,'motivo','Fecha mala')
 )) x LOOP
  rechazo:=false;
  BEGIN PERFORM public.solicitudes_espacio('enviar',r);
  EXCEPTION WHEN check_violation THEN rechazo:=true; END;
  IF NOT rechazo THEN RAISE EXCEPTION 'Se aceptó un envío inválido: %',r; END IF;
 END LOOP;
 rechazo:=false;
 BEGIN PERFORM public.solicitudes_espacio('enviar','{"solicitadoPor":"00000000-0000-0000-0000-000000000000"}');
 EXCEPTION WHEN invalid_parameter_value THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se aceptó un campo no permitido.'; END IF;

 -- Listar y cancelar la propia
 r:=public.solicitudes_espacio('listar');
 IF (r->>'total')::integer<>1 OR r->'solicitudes'->0->>'folio'<>v_folio THEN RAISE EXCEPTION 'Lista propia incorrecta: %',r; END IF;
 r:=public.solicitudes_espacio('cancelar',jsonb_build_object('folio',v_folio,'motivo','Cambio de planes','comentarios','Gracias'));
 IF r->>'estado'<>'cancelada' OR r->>'motivoCancelacion'<>'Cambio de planes' OR jsonb_array_length(r->'historial')<>2 THEN
  RAISE EXCEPTION 'Cancelación incorrecta: %',r; END IF;
 rechazo:=false;
 BEGIN PERFORM public.solicitudes_espacio('cancelar',jsonb_build_object('folio',v_folio));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se canceló dos veces.'; END IF;

 -- Tope de 5 solicitudes abiertas
 FOR i IN 1..5 LOOP
  PERFORM public.solicitudes_espacio('enviar',jsonb_build_object('espacio','prueba-hu16-sala','fecha',manana+i,
    'horaInicio','10:00','horaFin','11:00','personas',2,'motivo','Tope '||i));
 END LOOP;
 rechazo:=false;
 BEGIN PERFORM public.solicitudes_espacio('enviar',jsonb_build_object('espacio','prueba-hu16-sala','fecha',manana+9,
    'horaInicio','10:00','horaFin','11:00','personas',2,'motivo','Sexta'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se pasó el tope de solicitudes abiertas.'; END IF;

 -- Sin escritura directa a la tabla
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN UPDATE public."solicitudEspacio" SET "estadoSolicitud"='aprobada' WHERE folio=v_folio;
 EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 RESET ROLE;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se escribió directo en solicitudEspacio.'; END IF;

 RAISE NOTICE 'Pruebas de solicitudes de espacio: OK';
END $$;
ROLLBACK;
