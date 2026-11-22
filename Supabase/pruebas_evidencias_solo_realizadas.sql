-- Ejecutar después de evidencias_solo_realizadas.sql. ROLLBACK: no deja registros.
-- Comprueba que solo se ofrecen y aceptan sesiones ya realizadas: ni canceladas ni pendientes.
BEGIN;
DO $$
DECLARE
 coord uuid:=gen_random_uuid(); s_coord uuid:=gen_random_uuid(); actividad uuid; espacio uuid;
 realizada uuid:=gen_random_uuid(); pendiente uuid:=gen_random_uuid(); cancelada uuid:=gen_random_uuid(); en_curso uuid:=gen_random_uuid();
 lista jsonb; r jsonb; mensaje text;
 datos jsonb:='{"nombres":"Prueba HU21","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 SELECT a.id INTO actividad FROM public.actividad a LIMIT 1;
 SELECT e.id INTO espacio FROM public.espacio e WHERE e.activo ORDER BY e.capacidad DESC LIMIT 1;
 IF actividad IS NULL OR espacio IS NULL THEN RAISE EXCEPTION 'Se necesita una actividad y un espacio activo'; END IF;
 INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
  VALUES(coord,coord::text||'@example.invalid',now(),jsonb_build_object('registro',datos));
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(s_coord,coord,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion")
  VALUES(coord,'responsable_actividades',coord,'Prueba reversible');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"actividadId","asignadoPor",motivo)
  VALUES(coord,'gestionar_evidencias',NULL,coord,'Prueba reversible');

 -- Sesiones de prueba sin activar los disparadores de validación (fechas pasadas y estados fijos)
 SET LOCAL session_replication_role = replica;
 INSERT INTO public."sesionActividad"(id,"actividadId","espacioId",inicio,fin,capacidad,estado) VALUES
  (realizada,actividad,espacio,now()-interval '3 hours',now()-interval '1 hour',5,'programada'),
  (en_curso,actividad,espacio,now()-interval '1 hour',now()+interval '1 hour',5,'programada'),
  (pendiente,actividad,espacio,now()+interval '2 hours',now()+interval '4 hours',5,'programada'),
  (cancelada,actividad,espacio,now()-interval '3 hours',now()-interval '1 hour',5,'cancelada');
 SET LOCAL session_replication_role = origin;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',coord,'role','authenticated','session_id',s_coord)::text,true);
 lista:=public.evidencias_actividad('sesiones');
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(lista) x WHERE (x->>'sesionId')::uuid=realizada) THEN
  RAISE EXCEPTION 'La sesión que ya terminó no aparece'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(lista) x WHERE (x->>'sesionId')::uuid IN (pendiente,cancelada,en_curso)) THEN
  RAISE EXCEPTION 'Aparece una sesión pendiente, en curso o cancelada'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(lista) x WHERE x->>'estado'='cancelada') THEN
  RAISE EXCEPTION 'La lista trae sesiones canceladas'; END IF;

 r:=jsonb_build_object('tipo','fotografia','acceso','personal','tipoArchivo','image/jpeg','nombreArchivo','foto.jpg','tamanoBytes',100);
 IF public.evidencias_actividad('preparar',r||jsonb_build_object('sesionId',realizada))->>'carpeta' IS NULL THEN
  RAISE EXCEPTION 'No preparó la subida de una sesión realizada'; END IF;
 mensaje:=NULL;
 BEGIN PERFORM public.evidencias_actividad('preparar',r||jsonb_build_object('sesionId',pendiente));
 EXCEPTION WHEN check_violation THEN mensaje:=SQLERRM; END;
 IF mensaje IS DISTINCT FROM 'La actividad aún no se realiza.' THEN RAISE EXCEPTION 'Aceptó una sesión pendiente (%)',mensaje; END IF;
 mensaje:=NULL;
 BEGIN PERFORM public.evidencias_actividad('preparar',r||jsonb_build_object('sesionId',en_curso));
 EXCEPTION WHEN check_violation THEN mensaje:=SQLERRM; END;
 IF mensaje IS DISTINCT FROM 'La actividad aún no se realiza.' THEN RAISE EXCEPTION 'Aceptó una sesión en curso (%)',mensaje; END IF;
 mensaje:=NULL;
 BEGIN PERFORM public.evidencias_actividad('preparar',r||jsonb_build_object('sesionId',cancelada));
 EXCEPTION WHEN check_violation THEN mensaje:=SQLERRM; END;
 IF mensaje IS DISTINCT FROM 'No se suben evidencias de actividades canceladas.' THEN RAISE EXCEPTION 'Aceptó una sesión cancelada (%)',mensaje; END IF;
 RAISE NOTICE 'Pruebas de evidencias solo de actividades realizadas: correctas';
END $$;
ROLLBACK;
