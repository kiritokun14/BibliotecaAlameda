-- Casos reales reversibles. ROLLBACK elimina cuentas, temas y reportes temporales.
BEGIN;
DO $$
DECLARE usuario uuid:=gen_random_uuid(); otro uuid:=gen_random_uuid(); moderador uuid:=gen_random_uuid();
 s_usuario uuid:=gen_random_uuid(); s_otro uuid:=gen_random_uuid(); s_moderador uuid:=gen_random_uuid();
 tema uuid:=gen_random_uuid(); comentario uuid:=gen_random_uuid(); actividad uuid:=gen_random_uuid(); cuenta uuid; r jsonb; anterior jsonb;
 id_reporte uuid; bloqueo boolean; registro jsonb:='{"nombres":"Foro reversible","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH cuenta IN ARRAY ARRAY[usuario,otro,moderador] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES(cuenta,cuenta::text||'@example.invalid',now(),jsonb_build_object('registro',registro));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(s_usuario,usuario,now()),(s_otro,otro,now()),(s_moderador,moderador,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion") VALUES(moderador,'responsable_actividades',moderador,'Prueba reversible');
 -- Incluso con puntos, nivel 2 y una asignación incompatible, el usuario A-02 no modera.
 INSERT INTO public."progresoUsuario"(id,"nivelActual","participacionesValidas","puntosDisponibles") VALUES(usuario,2,100,1000)
  ON CONFLICT(id) DO UPDATE SET "nivelActual"=2,"participacionesValidas"=100,"puntosDisponibles"=1000;
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo) VALUES
  (usuario,'moderar_foro',moderador,'Prueba de rol incompatible'),(moderador,'moderar_foro',moderador,'Prueba reversible');
 INSERT INTO public.actividad(id,slug,titulo,descripcion,categoria,audiencia,requerimientos,"creadoPor",folio)
  VALUES(actividad,actividad::text,'Ámbito reversible','Prueba','Taller','General','Ninguno',moderador,NULL);
 INSERT INTO public."temaForo"("temaId",titulo,descripcion,"estadoModeracion","creadoPor") VALUES(tema,'Tema reversible','Texto original','publicado',otro);
 INSERT INTO public."comentarioForo"(id,"temaId","cuerpoComentario","estadoModeracion","creadoPor") VALUES(comentario,tema,'Comentario de prueba','publicado',otro);
 SET LOCAL ROLE anon; bloqueo:=false;
 BEGIN PERFORM public.foro_moderacion('listar'); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Anon modera'; END IF;
 bloqueo:=false;
 BEGIN PERFORM 1 FROM public."reporteModeracion"; EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Reportes públicos'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',usuario,'role','authenticated','session_id',s_usuario)::text,true);
 SET LOCAL ROLE authenticated; bloqueo:=false;
 BEGIN PERFORM public.foro_moderacion('listar'); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Nivel o logro concedió moderación'; END IF;
 r:=public.foro_moderacion('reportar',jsonb_build_object('tipoContenido','comentario','contenidoId',comentario,'motivo','Reporte de prueba'));
 id_reporte:=(r->>'reporteId')::uuid;
 IF r ? 'reportadoPor' OR r->>'estadoReporte'<>'pendiente' THEN RAISE EXCEPTION 'Respuesta insegura'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.foro_moderacion('reportar',jsonb_build_object('tipoContenido','comentario','contenidoId',comentario,'motivo','Duplicado'));
 EXCEPTION WHEN unique_violation THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Reporte duplicado abierto'; END IF;
 r:=public.foro_moderacion('propios');
 IF r->>'total'<>'1' OR r->'reportes'->0 ? 'historial' THEN RAISE EXCEPTION 'Listado propio inválido'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otro,'role','authenticated','session_id',s_otro)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.foro_moderacion('propios');
 IF r->>'total'<>'0' THEN RAISE EXCEPTION 'Otro usuario ve reportes ajenos'; END IF;
 IF EXISTS(SELECT 1 FROM public."reporteModeracion" WHERE "reporteId"=id_reporte) THEN RAISE EXCEPTION 'Autor descubre denunciante por RLS'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',moderador,'role','authenticated','session_id',s_moderador)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.foro_moderacion('obtener',jsonb_build_object('id',id_reporte)); anterior:=r;
 IF r ? 'reportadoPor' THEN RAISE EXCEPTION 'Se expone denunciante en bandeja'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.foro_moderacion('resolver',jsonb_build_object('id',id_reporte,'actualizadoEn',r->>'actualizadoEn','versionContenido',r->'contenido'->>'version','medida','ocultar','motivo',' '));
 EXCEPTION WHEN check_violation THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Moderación sin motivo'; END IF;
 RESET ROLE;
 UPDATE public."comentarioForo" SET "cuerpoComentario"='Editado después de abrir el reporte' WHERE id=comentario;
 SET LOCAL ROLE authenticated; bloqueo:=false;
 BEGIN PERFORM public.foro_moderacion('resolver',jsonb_build_object('id',id_reporte,'actualizadoEn',anterior->>'actualizadoEn','versionContenido',anterior->'contenido'->>'version','medida','ocultar','motivo','Prueba'));
 EXCEPTION WHEN serialization_failure THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Moderó una versión editada sin revisar'; END IF;
 r:=public.foro_moderacion('obtener',jsonb_build_object('id',id_reporte));
 r:=public.foro_moderacion('resolver',jsonb_build_object('id',id_reporte,'actualizadoEn',r->>'actualizadoEn','versionContenido',r->'contenido'->>'version','medida','revisar','motivo','Tomado en revisión'));
 r:=public.foro_moderacion('resolver',jsonb_build_object('id',id_reporte,'actualizadoEn',r->>'actualizadoEn','versionContenido',r->'contenido'->>'version','medida','ocultar','motivo','Incumple las reglas del foro'));
 IF r->>'estadoReporte'<>'resuelto' OR r->'contenido'->>'estado'<>'oculto' OR r->>'atendidoPor'<>moderador::text OR jsonb_array_length(r->'historial')<>2 THEN
  RAISE EXCEPTION 'Medida o trazabilidad incorrecta'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.foro_moderacion('resolver',jsonb_build_object('id',id_reporte,'actualizadoEn',r->>'actualizadoEn','versionContenido',r->'contenido'->>'version','medida','descartar','motivo','Reabrir'));
 EXCEPTION WHEN object_not_in_prerequisite_state THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Reabrió reporte cerrado'; END IF;
 RESET ROLE; SET LOCAL ROLE anon;
 IF EXISTS(SELECT 1 FROM public."comentarioForo" WHERE id=comentario) THEN RAISE EXCEPTION 'Comentario oculto sigue público'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',usuario,'role','authenticated','session_id',s_usuario)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.foro_moderacion('reportar',jsonb_build_object('tipoContenido','tema','contenidoId',tema,'motivo','Tema de prueba')); id_reporte:=(r->>'reporteId')::uuid;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',moderador,'role','authenticated','session_id',s_moderador)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.foro_moderacion('obtener',jsonb_build_object('id',id_reporte));
 r:=public.foro_moderacion('resolver',jsonb_build_object('id',id_reporte,'actualizadoEn',r->>'actualizadoEn','versionContenido',r->'contenido'->>'version','medida','descartar','motivo','No incumple reglas'));
 IF r->>'estadoReporte'<>'descartado' OR r->'contenido'->>'estado'<>'publicado' THEN RAISE EXCEPTION 'Descartar alteró el contenido'; END IF;
 RESET ROLE;
 -- El esquema actual del foro no vincula temas con actividades: un permiso limitado no es global.
 UPDATE public."permisoCuenta" SET "actividadId"=actividad WHERE "usuarioId"=moderador AND capacidad='moderar_foro';
 SET LOCAL ROLE authenticated; bloqueo:=false;
 BEGIN PERFORM public.foro_moderacion('listar'); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Ámbito limitado se convirtió en global'; END IF;
 RESET ROLE;
 UPDATE public."permisoCuenta" SET "actividadId"=NULL WHERE "usuarioId"=moderador AND capacidad='moderar_foro';
 UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=s_moderador;
 SET LOCAL ROLE authenticated; bloqueo:=false;
 BEGIN PERFORM public.foro_moderacion('listar'); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Sesión expirada conserva moderación'; END IF;
 RESET ROLE;
END; $$;
ROLLBACK;
