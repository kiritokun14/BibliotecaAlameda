-- Ejecutar después de contenidos_editor.sql. ROLLBACK: no deja registros.
-- Cuentas y sesiones ficticias dentro de BEGIN/ROLLBACK.
BEGIN;
DO $$
DECLARE
 admin uuid:=gen_random_uuid(); ed uuid:=gen_random_uuid(); otro uuid:=gen_random_uuid(); lector uuid:=gen_random_uuid();
 s_ed uuid:=gen_random_uuid(); s_otro uuid:=gen_random_uuid(); s_lector uuid:=gen_random_uuid();
 id_actual uuid; r jsonb; v_folio text; rechazo boolean; n integer;
 datos jsonb:='{"nombres":"Prueba HU11","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH id_actual IN ARRAY ARRAY[admin,ed,otro,lector] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',datos));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(s_ed,ed,now()),(s_otro,otro,now()),(s_lector,lector,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion") VALUES
  (admin,'administrador',admin,'Prueba reversible'),(ed,'editor',admin,'Prueba reversible'),(otro,'editor',admin,'Prueba reversible');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo) VALUES
  (ed,'preparar_contenidos',admin,'Prueba reversible'),(otro,'preparar_contenidos',admin,'Prueba reversible');

 -- Sin la capacidad no se entra
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',lector,'role','authenticated','session_id',s_lector)::text,true);
 rechazo:=false;
 BEGIN PERFORM public.editor_contenidos('resumen');
 EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Una cuenta sin preparar_contenidos usó el editor.'; END IF;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ed,'role','authenticated','session_id',s_ed)::text,true);
 IF (public.editor_contenidos('resumen')->>'total')::integer<>0 THEN RAISE EXCEPTION 'El resumen inicial no está vacío.'; END IF;

 -- Guardar un borrador nuevo: recibe folio y queda en borrador
 r:=public.editor_contenidos('guardar','{"tipo":"noticia","titulo":"Prueba","datos":{"categoria":"Avisos"}}');
 v_folio:=r->>'folio';
 IF v_folio !~ '^CN-[0-9]{4,}$' OR r->>'estado'<>'borrador' THEN RAISE EXCEPTION 'Borrador mal creado: %',r; END IF;

 -- Campos ajenos al tipo o a la operación se rechazan
 rechazo:=false;
 BEGIN PERFORM public.editor_contenidos('guardar',jsonb_build_object('folio',v_folio,'datos',jsonb_build_object('seccion','historia')));
 EXCEPTION WHEN invalid_parameter_value THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se aceptó un dato de otro tipo.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.editor_contenidos('guardar',jsonb_build_object('folio',v_folio,'estado','publicado'));
 EXCEPTION WHEN invalid_parameter_value THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'El editor pudo cambiar el estado directamente.'; END IF;

 -- Enviar incompleto falla
 rechazo:=false;
 BEGIN PERFORM public.editor_contenidos('enviar',jsonb_build_object('folio',v_folio));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se envió una noticia incompleta.'; END IF;

 -- Completar y enviar
 PERFORM public.editor_contenidos('guardar',jsonb_build_object('folio',v_folio,'resumen','Resumen','cuerpo','Texto',
   'datos',jsonb_build_object('categoria','Avisos','fecha','2026-11-02')));
 r:=public.editor_contenidos('enviar',jsonb_build_object('folio',v_folio,'nota','Revisar fecha'));
 IF r->>'estado'<>'en_revision' OR r->>'enviadoEn' IS NULL THEN RAISE EXCEPTION 'El envío no cambió el estado.'; END IF;
 SELECT count(*) INTO n FROM public."revisionContenido" v JOIN public."Contenido" c ON c.id=v."contenidoId"
  WHERE c."folio"=v_folio AND v.accion='envio' AND v.nota='Revisar fecha' AND v."realizadoPor"=ed;
 IF n<>1 THEN RAISE EXCEPTION 'El envío no quedó en la bitácora.'; END IF;

 -- Ya enviado: no se edita ni se reenvía
 rechazo:=false;
 BEGIN PERFORM public.editor_contenidos('guardar',jsonb_build_object('folio',v_folio,'titulo','Cambio'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se editó un contenido por autorizar.'; END IF;

 -- Observaciones del Administrador (simuladas: ese flujo va en otro script)
 UPDATE public."Contenido" SET estado='con_observaciones' WHERE "folio"=v_folio;
 INSERT INTO public."revisionContenido"("contenidoId",accion,observaciones,"realizadoPor")
  SELECT id,'observaciones','["Cambiar la imagen"]',admin FROM public."Contenido" WHERE "folio"=v_folio;
 r:=public.editor_contenidos('obtener',jsonb_build_object('folio',v_folio));
 IF r->'observaciones'->'lista'->>0<>'Cambiar la imagen' THEN RAISE EXCEPTION 'No se leen las observaciones: %',r; END IF;
 PERFORM public.editor_contenidos('guardar',jsonb_build_object('folio',v_folio,'titulo','Prueba corregida'));
 r:=public.editor_contenidos('enviar',jsonb_build_object('folio',v_folio));
 IF r->>'estado'<>'en_revision' THEN RAISE EXCEPTION 'No se pudo reenviar tras corregir.'; END IF;

 -- Listado, filtros y búsqueda
 PERFORM public.editor_contenidos('guardar','{"tipo":"acerca","titulo":"Historia","datos":{"seccion":"historia"}}');
 r:=public.editor_contenidos('listar');
 IF (r->>'total')::integer<>2 THEN RAISE EXCEPTION 'Listado incorrecto: %',r; END IF;
 r:=public.editor_contenidos('listar','{"estado":"borrador"}');
 IF (r->>'total')::integer<>1 OR r->'contenidos'->0->>'tipo'<>'acerca' THEN RAISE EXCEPTION 'Filtro por estado incorrecto.'; END IF;
 r:=public.editor_contenidos('listar',jsonb_build_object('busqueda',lower(v_folio)));
 IF (r->>'total')::integer<>1 THEN RAISE EXCEPTION 'Búsqueda por folio incorrecta.'; END IF;
 r:=public.editor_contenidos('resumen');
 IF (r->>'borrador')::integer<>1 OR (r->>'en_revision')::integer<>1 THEN RAISE EXCEPTION 'Resumen incorrecto: %',r; END IF;

 -- Otro editor no ve ni toca contenidos ajenos
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',s_otro)::text,true);
 IF (public.editor_contenidos('listar')->>'total')::integer<>0 THEN RAISE EXCEPTION 'Un editor vio contenidos ajenos.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.editor_contenidos('obtener',jsonb_build_object('folio',v_folio));
 EXCEPTION WHEN no_data_found THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Un editor abrió un contenido ajeno.'; END IF;

 -- Lo pendiente nunca es público (CA-11.2)
 PERFORM set_config('request.jwt.claims','',true);
 SET LOCAL ROLE anon;
 SELECT count(*) INTO n FROM public."Contenido" WHERE "folio"=v_folio;
 RESET ROLE;
 IF n<>0 THEN RAISE EXCEPTION 'Un contenido por autorizar es visible al público.'; END IF;

 RAISE NOTICE 'Pruebas del editor de contenidos: OK';
END $$;
ROLLBACK;
