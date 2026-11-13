-- Ejecutar después de contenidos_editor.sql y contenidos_memoria.sql. ROLLBACK: no deja registros.
-- Cuentas y sesiones ficticias dentro de BEGIN/ROLLBACK.
BEGIN;
DO $$
DECLARE
 admin uuid:=gen_random_uuid(); ed uuid:=gen_random_uuid(); otro uuid:=gen_random_uuid(); lector uuid:=gen_random_uuid();
 s_ed uuid:=gen_random_uuid(); s_otro uuid:=gen_random_uuid(); s_lector uuid:=gen_random_uuid();
 s_admin uuid:=gen_random_uuid(); tipo_prueba text; id_actual uuid; viejo jsonb; r jsonb; v_folio text; rechazo boolean; n integer;
 datos jsonb:='{"nombres":"Prueba HU11","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH id_actual IN ARRAY ARRAY[admin,ed,otro,lector] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',datos));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(s_admin,admin,now()),(s_ed,ed,now()),(s_otro,otro,now()),(s_lector,lector,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion") VALUES
  (admin,'administrador',admin,'Prueba reversible'),(ed,'editor',admin,'Prueba reversible'),(otro,'editor',admin,'Prueba reversible');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo) VALUES
  (admin,'publicar_contenidos',admin,'Prueba reversible'),(ed,'preparar_contenidos',admin,'Prueba reversible'),(otro,'preparar_contenidos',admin,'Prueba reversible');


 -- Editor crea el borrador real. No es público ni aparece en revisión.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ed,'role','authenticated','session_id',s_ed)::text,true);
 r:=public.editor_contenidos('guardar','{"tipo":"noticia","titulo":"Prueba T055 reversible","resumen":"Resumen de prueba","cuerpo":"Texto de prueba","datos":{"categoria":"Avisos","fecha":"2026-11-02"}}');
 v_folio:=r->>'folio';
 rechazo:=false;
 BEGIN PERFORM public.revision_contenidos('listar'); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Editor sin publicación pudo revisar.'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','session_id',s_admin)::text,true);
 r:=public.revision_contenidos('listar',jsonb_build_object('busqueda',v_folio));
 IF r->>'total'<>'0' THEN RAISE EXCEPTION 'Revisor ve borradores privados.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.revision_contenidos('obtener',jsonb_build_object('folio',v_folio)); EXCEPTION WHEN no_data_found THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Revisor abrió borrador.'; END IF;
 PERFORM set_config('request.jwt.claims','',true); SET LOCAL ROLE anon;
 r:=public.contenidos_publicados('noticia',v_folio);
 RESET ROLE;
 IF jsonb_array_length(r)<>0 THEN RAISE EXCEPTION 'Borrador público.'; END IF;
 -- Envío y observaciones en la misma tabla de Valeria.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ed,'role','authenticated','session_id',s_ed)::text,true);
 r:=public.editor_contenidos('enviar',jsonb_build_object('folio',v_folio));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','session_id',s_admin)::text,true);
 r:=public.revision_contenidos('obtener',jsonb_build_object('folio',v_folio));
 IF r->>'estado'<>'en_revision' OR r->>'autor' IS NULL THEN RAISE EXCEPTION 'No se integró el envío.'; END IF;
 viejo:=r;
 rechazo:=false;
 BEGIN PERFORM public.revision_contenidos('publicar',jsonb_build_object('folio',v_folio,'actualizadoEn',r->>'actualizadoEn','referencia',''));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Publicó sin referencia.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.revision_contenidos('publicar',jsonb_build_object('folio',v_folio,'actualizadoEn','2000-01-01T00:00:00Z','referencia','Prueba'));
 EXCEPTION WHEN serialization_failure THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Aceptó versión obsoleta.'; END IF;
 r:=public.revision_contenidos('observaciones',jsonb_build_object('folio',v_folio,'actualizadoEn',r->>'actualizadoEn','observaciones',jsonb_build_array('Corregir texto')));
 IF r->>'estado'<>'con_observaciones' THEN RAISE EXCEPTION 'No guardó observaciones.'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ed,'role','authenticated','session_id',s_ed)::text,true);
 r:=public.editor_contenidos('obtener',jsonb_build_object('folio',v_folio));
 IF r->'observaciones'->'lista'->>0<>'Corregir texto' THEN RAISE EXCEPTION 'Valeria no recibe observaciones.'; END IF;
 PERFORM public.editor_contenidos('guardar',jsonb_build_object('folio',v_folio,'cuerpo','Texto corregido'));
 r:=public.editor_contenidos('enviar',jsonb_build_object('folio',v_folio));
 -- Autorización y publicación atómicas.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','session_id',s_admin)::text,true);
 r:=public.revision_contenidos('publicar',jsonb_build_object('folio',v_folio,'actualizadoEn',r->>'actualizadoEn','referencia','Acta de prueba T055'));
 IF r->>'estado'<>'publicado' THEN RAISE EXCEPTION 'No publicó.'; END IF;
 SELECT count(*) INTO n FROM public."revisionContenido" v JOIN public."Contenido" c ON c.id=v."contenidoId" WHERE c.folio=v_folio AND v.accion IN ('aprobacion','publicacion') AND v.detalles->>'referencia'='Acta de prueba T055';
 IF n<>2 THEN RAISE EXCEPTION 'Falta auditoría de aprobación y publicación.'; END IF;
 -- Repetir la decisión no duplica publicación.
 rechazo:=false;
 BEGIN PERFORM public.revision_contenidos('publicar',jsonb_build_object('folio',v_folio,'actualizadoEn',r->>'actualizadoEn','referencia','Acta de prueba T055'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Duplicó una publicación.'; END IF;
 viejo:=r;
 PERFORM set_config('request.jwt.claims','',true); SET LOCAL ROLE anon;
 r:=public.contenidos_publicados('noticia',v_folio);
 RESET ROLE;
 IF jsonb_array_length(r)<>1 OR r->0->>'cuerpo'<>'Texto corregido' OR r->0 ? 'historial' OR r->0 ? 'autor' THEN RAISE EXCEPTION 'Proyección pública incorrecta.'; END IF;
 -- Retiro conserva historia pero deja de ser público.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','session_id',s_admin)::text,true);
 r:=public.revision_contenidos('retirar',jsonb_build_object('folio',v_folio,'actualizadoEn',viejo->>'actualizadoEn','nota','Retiro de prueba'));
 IF r->>'estado'<>'retirado' THEN RAISE EXCEPTION 'No retiró.'; END IF;
 PERFORM set_config('request.jwt.claims','',true); SET LOCAL ROLE anon;
 r:=public.contenidos_publicados('noticia',v_folio);
 RESET ROLE;
 IF jsonb_array_length(r)<>0 THEN RAISE EXCEPTION 'Retirado todavía público.'; END IF;
 -- Historial propio y protección de contenido ajeno.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ed,'role','authenticated','session_id',s_ed)::text,true);
 IF public.historial_contenido_propio(v_folio)->>'estado'<>'retirado' THEN RAISE EXCEPTION 'Autor no consulta resolución.'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',s_otro)::text,true);
 rechazo:=false;
 BEGIN PERFORM public.historial_contenido_propio(v_folio); EXCEPTION WHEN no_data_found THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Otro editor vio historial ajeno.'; END IF;
 -- Segundo contenido: rechazo con motivo, sin publicación.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ed,'role','authenticated','session_id',s_ed)::text,true);
 r:=public.editor_contenidos('guardar','{"tipo":"acerca","titulo":"Historia de prueba","cuerpo":"Texto","datos":{"seccion":"historia"}}'); v_folio:=r->>'folio';
 r:=public.editor_contenidos('enviar',jsonb_build_object('folio',v_folio));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','session_id',s_admin)::text,true);
 r:=public.revision_contenidos('rechazar',jsonb_build_object('folio',v_folio,'actualizadoEn',r->>'actualizadoEn','nota','Información sin confirmar'));
 IF r->>'estado'<>'rechazado' THEN RAISE EXCEPTION 'Rechazo no registrado.'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ed,'role','authenticated','session_id',s_ed)::text,true);
 IF public.historial_contenido_propio(v_folio)->>'estado'<>'rechazado' THEN RAISE EXCEPTION 'Autor no puede consultar rechazo.'; END IF;
 -- Reseñas, memoria y Acerca comparten el mismo circuito real.
 FOREACH tipo_prueba IN ARRAY ARRAY['resena','memoria','acerca'] LOOP
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',ed,'role','authenticated','session_id',s_ed)::text,true);
  r:=public.editor_contenidos('guardar',jsonb_build_object('tipo',tipo_prueba,'titulo','Prueba reversible de publicación','resumen','Resumen','cuerpo','Texto',
   'datos',CASE tipo_prueba WHEN 'resena' THEN '{"autoria":"Autor de prueba","vista":"Por autor"}'::jsonb WHEN 'memoria' THEN '{"autoria":"Archivo de prueba","publicacion":"Memoria pública","permisoImagen":true}'::jsonb ELSE '{"seccion":"historia"}'::jsonb END));
  v_folio:=r->>'folio'; r:=public.editor_contenidos('enviar',jsonb_build_object('folio',v_folio));
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','session_id',s_admin)::text,true);
  r:=public.revision_contenidos('publicar',jsonb_build_object('folio',v_folio,'actualizadoEn',r->>'actualizadoEn','referencia','Prueba reversible'));
  viejo:=r;
  PERFORM set_config('request.jwt.claims','',true); SET LOCAL ROLE anon;
  r:=public.contenidos_publicados(tipo_prueba,v_folio); RESET ROLE;
  IF jsonb_array_length(r)<>1 THEN RAISE EXCEPTION 'Publicación falló para %',tipo_prueba; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','session_id',s_admin)::text,true);
  PERFORM public.revision_contenidos('retirar',jsonb_build_object('folio',v_folio,'actualizadoEn',viejo->>'actualizadoEn','nota','Retiro reversible'));
 END LOOP;
 -- Una sesión revocada tampoco puede decidir.
 DELETE FROM auth.sessions WHERE id=s_admin;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','session_id',s_admin)::text,true);
 rechazo:=false;
 BEGIN PERFORM public.revision_contenidos('listar'); EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Sesión revocada pudo entrar.'; END IF;
 RAISE NOTICE 'T055: integración, permisos, versión, observaciones, publicación, retiro, rechazo y privacidad OK';
END $$;
ROLLBACK;
