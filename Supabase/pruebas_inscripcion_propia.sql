-- Prueba real de permisos, filtros, autorización, persistencia y retiro. Todo se revierte.
BEGIN;
DO $$
#variable_conflict use_variable
DECLARE autor uuid:=gen_random_uuid(); personal uuid:=gen_random_uuid(); otro uuid:=gen_random_uuid();
 s_autor uuid:=gen_random_uuid(); s_personal uuid:=gen_random_uuid(); s_otro uuid:=gen_random_uuid();
 id_actual uuid; espacio_id uuid:=gen_random_uuid(); r jsonb; viejo jsonb; folio text; rechazo boolean;
 registro jsonb:='{"nombres":"Prueba agenda","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
 datos jsonb; id_sesion uuid; propia jsonb;
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
 id_sesion:=(r->'sesiones'->0->>'id')::uuid;
 RESET ROLE;
 UPDATE public."sesionActividad" SET capacidad=1 WHERE id=id_sesion;
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo)
 VALUES(personal,'confirmar_inscripciones',personal,'Prueba reversible HU-18');
 SET LOCAL ROLE anon;
 rechazo:=false;
 BEGIN PERFORM public.inscripcion_propia('solicitar',id_sesion); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Inscripción anónima'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',autor,'role','authenticated','session_id',s_autor)::text,true);
 SET LOCAL ROLE authenticated;
 propia:=public.inscripcion_propia('solicitar',id_sesion);
 IF propia->>'estado' IS DISTINCT FROM 'pendiente' THEN RAISE EXCEPTION 'No quedó pendiente'; END IF;
 IF public.inscripcion_propia('solicitar',id_sesion) IS DISTINCT FROM propia THEN RAISE EXCEPTION 'Solicitud duplicada'; END IF;
 IF jsonb_array_length(public.mis_inscripciones(0))<>1 THEN RAISE EXCEPTION 'No aparece en Mis eventos'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',s_otro)::text,true);
 SET LOCAL ROLE authenticated;
 IF jsonb_array_length(public.mis_inscripciones(0))<>0 THEN RAISE EXCEPTION 'Leyó inscripción ajena'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.inscripcion_propia('cancelar',id_sesion,(propia->>'actualizadoA')::timestamptz);
 EXCEPTION WHEN no_data_found THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Canceló inscripción ajena'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',personal,'role','authenticated','session_id',s_personal)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.gestionar_inscripciones('listar',jsonb_build_object('sesionId',id_sesion));
 IF r->0->>'id' IS DISTINCT FROM propia->>'id' THEN RAISE EXCEPTION 'El personal no ve la solicitud'; END IF;
 PERFORM public.gestionar_inscripciones('confirmar',jsonb_build_object('inscripcionId',propia->>'id','motivo','Requisitos revisados'));
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',s_otro)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.inscripcion_propia('solicitar',id_sesion); EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó una solicitud con cupo lleno'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',autor,'role','authenticated','session_id',s_autor)::text,true);
 SET LOCAL ROLE authenticated;
 rechazo:=false;
 BEGIN PERFORM public.inscripcion_propia('cancelar',id_sesion,'2000-01-01T00:00:00Z'); EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó versión obsoleta'; END IF;
 propia:=public.inscripcion_propia('consultar',id_sesion);
 r:=public.inscripcion_propia('cancelar',id_sesion,(propia->>'actualizadoA')::timestamptz);
 IF r->>'estado' IS DISTINCT FROM 'cancelada' OR r->>'hayCupo' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'No liberó el cupo'; END IF;
 RESET ROLE;
END; $$;
ROLLBACK;
