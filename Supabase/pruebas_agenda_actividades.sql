-- Prueba real de permisos, filtros, autorización, persistencia y retiro. Todo se revierte.
BEGIN;
DO $$
#variable_conflict use_variable
DECLARE autor uuid:=gen_random_uuid(); personal uuid:=gen_random_uuid(); otro uuid:=gen_random_uuid();
 s_autor uuid:=gen_random_uuid(); s_personal uuid:=gen_random_uuid(); s_otro uuid:=gen_random_uuid();
 id_actual uuid; espacio_id uuid:=gen_random_uuid(); r jsonb; viejo jsonb; folio text; rechazo boolean;
 registro jsonb:='{"nombres":"Prueba agenda","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
 datos jsonb;
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
 PERFORM set_config('request.jwt.claims','{}',true); SET LOCAL ROLE anon;
 rechazo:=false;
 BEGIN PERFORM public.gestionar_agenda('listar'); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Acceso privado anónimo'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',autor,'role','authenticated','session_id',s_autor)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.gestionar_agenda('crear',datos); folio:=r->>'folio'; viejo:=r;
 IF r->>'estado'<>'borrador' OR r->>'nombre'<>datos->>'nombre' THEN RAISE EXCEPTION 'No guardó borrador'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.gestionar_agenda('guardar',(datos-'estado')||jsonb_build_object('folio',folio,'actualizado','2000-01-01T00:00:00Z'));
 EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó versión obsoleta'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',s_otro)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.gestionar_agenda('obtener',jsonb_build_object('folio',folio)); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Otro usuario ve borrador ajeno'; END IF;
 RESET ROLE;
 SET LOCAL ROLE anon;
 r:=public.agenda_publica(jsonb_build_object('identificador',folio));
 IF r->>'total'<>'0' THEN RAISE EXCEPTION 'Borrador público'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',autor,'role','authenticated','session_id',s_autor)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.gestionar_agenda('enviar',jsonb_build_object('folio',folio,'actualizado',viejo->>'actualizado'));
 IF r->>'estado'<>'en-revision' OR jsonb_array_length(r->'sesiones')<>1 THEN RAISE EXCEPTION 'No persiste la programación'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.gestionar_agenda('aprobar',jsonb_build_object('folio',folio,'actualizado',r->>'actualizado','referencia','Autorización falsa'));
 EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Autor se aprobó sin permiso'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',s_personal)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.gestionar_agenda('rechazar',jsonb_build_object('folio',folio,'actualizado',r->>'actualizado','motivo','Corregir fecha'));
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',autor,'role','authenticated','session_id',s_autor)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.gestionar_agenda('guardar',(datos-'estado')||jsonb_build_object('folio',folio,'actualizado',r->>'actualizado','fecha','2035-06-13'));
 IF r->>'fecha'<>'2035-06-13' THEN RAISE EXCEPTION 'Mostró programación antigua en borrador corregido'; END IF;
 r:=public.gestionar_agenda('guardar',(datos-'estado')||jsonb_build_object('folio',folio,'actualizado',r->>'actualizado'));
 r:=public.gestionar_agenda('enviar',jsonb_build_object('folio',folio,'actualizado',r->>'actualizado'));
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',s_personal)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.gestionar_agenda('publicar',jsonb_build_object('folio',folio,'actualizado',r->>'actualizado'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Publicó sin aprobación'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.gestionar_agenda('aprobar',jsonb_build_object('folio',folio,'actualizado',r->>'actualizado','referencia',''));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aprobó sin referencia'; END IF;
 r:=public.gestionar_agenda('aprobar',jsonb_build_object('folio',folio,'actualizado',r->>'actualizado','referencia','Acta reversible'));
 r:=public.gestionar_agenda('publicar',jsonb_build_object('folio',folio,'actualizado',r->>'actualizado'));
 IF r->>'estado'<>'publicada' THEN RAISE EXCEPTION 'No publicó'; END IF;
 viejo:=r;
 rechazo:=false;
 BEGIN PERFORM public.gestionar_agenda('publicar',jsonb_build_object('folio',folio,'actualizado',r->>'actualizado'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Publicación duplicada'; END IF;
 RESET ROLE;
 INSERT INTO public."sesionActividad"("actividadId","espacioId",inicio,fin,capacidad,estado)
 SELECT id,espacio_id,'2035-07-01T10:00:00-07:00','2035-07-01T11:00:00-07:00',20,'borrador' FROM public.actividad WHERE actividad.folio=folio;
 SET LOCAL ROLE anon;
 r:=public.agenda_publica(jsonb_build_object('identificador',folio,'desde','2035-06-12','hasta','2035-06-12','tipo','Taller'));
 IF r->>'total'<>'1' OR r->'actividades'->0->'sesiones'->0->>'inicio'<>'10:00' THEN RAISE EXCEPTION 'Filtro o zona horaria incorrectos'; END IF;
 IF jsonb_array_length(r->'actividades'->0->'sesiones')<>1 THEN RAISE EXCEPTION 'Sesión en borrador visible'; END IF;
 IF r->'actividades'->0 ? 'historial' OR r->'actividades'->0 ? 'creadoPor' OR r->'actividades'->0 ? 'autorizo' THEN RAISE EXCEPTION 'Proyección pública filtra datos privados'; END IF;
 r:=public.agenda_publica(jsonb_build_object('identificador',folio,'desde','2035-06-13'));
 IF r->>'total'<>'0' THEN RAISE EXCEPTION 'Filtro de fechas incorrecto'; END IF;
 RESET ROLE; SET LOCAL ROLE authenticated;
 r:=public.gestionar_agenda('retirar',jsonb_build_object('folio',folio,'actualizado',viejo->>'actualizado','motivo','Retiro reversible'));
 IF r->>'estado'<>'archivada' THEN RAISE EXCEPTION 'No retiró'; END IF;
 RESET ROLE; SET LOCAL ROLE anon;
 r:=public.agenda_publica(jsonb_build_object('identificador',folio));
 IF r->>'total'<>'0' THEN RAISE EXCEPTION 'Retirada visible'; END IF;
 RESET ROLE;
 IF (SELECT count(*) FROM privado."historialActividad" h JOIN public.actividad a ON a.id=h."actividadId" WHERE a.folio=folio AND h.accion IN ('aprobar','publicar','retirar'))<>3 THEN RAISE EXCEPTION 'Historial incompleto'; END IF;
 DELETE FROM auth.sessions WHERE id=s_personal;
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.gestionar_agenda('listar'); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó sesión revocada'; END IF;
 RESET ROLE;
END;
$$;
ROLLBACK;
SELECT 'Agenda, permisos, fechas, publicación y retiro OK; todo revertido' resultado;
