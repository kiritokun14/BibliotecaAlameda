-- Ejecutar después de evidencias_actividades.sql. ROLLBACK: no deja registros.
-- Usa una sesión de actividad ya realizada; cuentas y archivo ficticios dentro de BEGIN/ROLLBACK.
BEGIN;
DO $$
DECLARE
 coord uuid:=gen_random_uuid(); asig uuid:=gen_random_uuid(); otra uuid:=gen_random_uuid(); edi uuid:=gen_random_uuid();
 s_coord uuid:=gen_random_uuid(); s_asig uuid:=gen_random_uuid(); s_otra uuid:=gen_random_uuid(); s_edi uuid:=gen_random_uuid();
 sesion uuid; actividad uuid; otra_actividad uuid; id_actual uuid; r jsonb; carpeta text; ruta text; fol text; bloqueo boolean;
 datos jsonb:='{"nombres":"Prueba HU21","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 SELECT s.id,s."actividadId" INTO sesion,actividad FROM public."sesionActividad" s WHERE s.estado<>'cancelada' AND (s.estado='finalizada' OR s.fin<=now()) ORDER BY s.inicio DESC LIMIT 1;
 IF sesion IS NULL THEN RAISE EXCEPTION 'Se necesita al menos una sesión de actividad ya realizada'; END IF;
 SELECT a.id INTO otra_actividad FROM public.actividad a WHERE a.id<>actividad LIMIT 1;

 FOREACH id_actual IN ARRAY ARRAY[coord,asig,otra,edi] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',datos));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(s_coord,coord,now()),(s_asig,asig,now()),(s_otra,otra,now()),(s_edi,edi,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion") VALUES
  (coord,'responsable_actividades',coord,'Prueba reversible'),(asig,'responsable_actividades',coord,'Prueba reversible'),
  (otra,'responsable_actividades',coord,'Prueba reversible'),(edi,'editor',coord,'Prueba reversible');
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"actividadId","asignadoPor",motivo) VALUES
  (coord,'gestionar_evidencias',NULL,coord,'Prueba reversible'),
  (asig,'gestionar_evidencias',actividad,coord,'Prueba reversible'),
  (otra,'gestionar_evidencias',otra_actividad,coord,'Prueba reversible'),
  (edi,'preparar_contenidos',NULL,coord,'Prueba reversible');

 -- Sin la capacidad no se entra
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',edi,'role','authenticated','session_id',s_edi)::text,true);
 bloqueo:=false;
 BEGIN PERFORM public.evidencias_actividad('listar'); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Editor sin capacidad entró a evidencias'; END IF;

 -- Personal asignado sube una lista firmada (CA-21.1: queda asociada a su actividad y privada)
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',asig,'role','authenticated','session_id',s_asig)::text,true);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.evidencias_actividad('sesiones')) x WHERE (x->>'sesionId')::uuid=sesion) THEN
  RAISE EXCEPTION 'La sesión asignada no aparece para subir'; END IF;
 r:=jsonb_build_object('sesionId',sesion,'tipo','lista_firmada','acceso','personal','tipoArchivo','application/pdf',
  'nombreArchivo','lista.pdf','tamanoBytes',12345,'nota','Lista de asistentes');
 bloqueo:=false;
 BEGIN PERFORM public.evidencias_actividad('preparar',r||'{"tamanoBytes":10485761}'); EXCEPTION WHEN check_violation THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Aceptó un archivo de más de 10 MB'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.evidencias_actividad('preparar',r||'{"tipoArchivo":"image/gif"}'); EXCEPTION WHEN check_violation THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Aceptó un tipo de archivo no permitido'; END IF;
 carpeta:=public.evidencias_actividad('preparar',r)->>'carpeta';
 ruta:=carpeta||'/'||gen_random_uuid()::text||'.pdf';
 bloqueo:=false;
 BEGIN PERFORM public.evidencias_actividad('registrar',r||jsonb_build_object('ruta',ruta)); EXCEPTION WHEN invalid_parameter_value THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Registró una evidencia sin archivo almacenado'; END IF;
 INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('evidencias-actividades',ruta,'{"mimetype":"application/pdf","size":12345}');
 r:=public.evidencias_actividad('registrar',r||jsonb_build_object('ruta',ruta));
 fol:=r->>'folio';
 IF fol !~ '^EV-[0-9]{4,}$' OR (r->>'puedeVer')::boolean IS NOT TRUE OR r->>'tipo'<>'lista_firmada' THEN
  RAISE EXCEPTION 'Respuesta de registro inesperada: %',r; END IF;
 IF (SELECT visibilidad FROM public."evidenciaActividad" WHERE "rutaArchivo"=ruta)<>'privada' THEN
  RAISE EXCEPTION 'La evidencia no quedó privada'; END IF;
 -- La lista firmada nunca se puede publicar (CA-21.2)
 bloqueo:=false;
 BEGIN UPDATE public."evidenciaActividad" SET visibilidad='publica',"autorizadaPor"=coord,"autorizadaEn"=now() WHERE folio=fol;
 EXCEPTION WHEN check_violation THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Una lista firmada pudo marcarse pública'; END IF;

 -- Personal de otra actividad no la ve ni la encuentra
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',otra,'role','authenticated','session_id',s_otra)::text,true);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.evidencias_actividad('listar')) x WHERE x->>'folio'=fol) THEN
  RAISE EXCEPTION 'Personal de otra actividad ve la evidencia'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.evidencias_actividad('descargar',jsonb_build_object('folio',fol)); EXCEPTION WHEN no_data_found THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Personal de otra actividad descargó la evidencia'; END IF;

 -- Consulta y descarga quedan registradas; la consulta repetida en 5 minutos no se duplica
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',asig,'role','authenticated','session_id',s_asig)::text,true);
 PERFORM public.evidencias_actividad('obtener',jsonb_build_object('folio',fol));
 PERFORM public.evidencias_actividad('obtener',jsonb_build_object('folio',fol));
 r:=public.evidencias_actividad('descargar',jsonb_build_object('folio',fol));
 IF r->>'ruta'<>ruta THEN RAISE EXCEPTION 'Descarga sin la ruta correcta'; END IF;
 r:=public.evidencias_actividad('obtener',jsonb_build_object('folio',fol));
 IF (SELECT string_agg(x->>'accion',',' ORDER BY x->>'accion') FROM jsonb_array_elements(r->'historial') x)<>'consulto,descargo,subio' THEN
  RAISE EXCEPTION 'Historial inesperado: %',r->'historial'; END IF;

 -- Al restringirla a Coordinación, el personal asignado ya no la abre y puede pedir acceso
 PERFORM public.evidencias_actividad('acceso',jsonb_build_object('folio',fol,'acceso','coordinacion'));
 r:=public.evidencias_actividad('obtener',jsonb_build_object('folio',fol));
 IF (r->>'puedeVer')::boolean OR r ? 'nombreArchivo' OR r ? 'historial' THEN RAISE EXCEPTION 'Evidencia restringida expone datos: %',r; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.evidencias_actividad('descargar',jsonb_build_object('folio',fol)); EXCEPTION WHEN insufficient_privilege THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Descargó una evidencia restringida'; END IF;
 PERFORM public.evidencias_actividad('solicitar_acceso',jsonb_build_object('folio',fol));
 PERFORM public.evidencias_actividad('solicitar_acceso',jsonb_build_object('folio',fol));
 r:=public.evidencias_actividad('obtener',jsonb_build_object('folio',fol));
 IF NOT (r->>'solicitada')::boolean THEN RAISE EXCEPTION 'No quedó registrada la solicitud de acceso'; END IF;

 -- Coordinación la ve, la reabre al personal y la retira con motivo
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',coord,'role','authenticated','session_id',s_coord)::text,true);
 r:=public.evidencias_actividad('obtener',jsonb_build_object('folio',fol));
 IF NOT (r->>'puedeVer')::boolean THEN RAISE EXCEPTION 'Coordinación no ve la evidencia restringida'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(r->'historial') x WHERE x->>'accion'='solicito_acceso')<>1 THEN
  RAISE EXCEPTION 'La solicitud de acceso se duplicó'; END IF;
 PERFORM public.evidencias_actividad('acceso',jsonb_build_object('folio',fol,'acceso','personal'));
 bloqueo:=false;
 BEGIN PERFORM public.evidencias_actividad('retirar',jsonb_build_object('folio',fol,'motivo','  ')); EXCEPTION WHEN check_violation THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Retiró sin motivo'; END IF;
 r:=public.evidencias_actividad('retirar',jsonb_build_object('folio',fol,'motivo','Se subió por error'));
 IF NOT (r->>'retirada')::boolean OR r->'retiro'->>'motivo'<>'Se subió por error' THEN RAISE EXCEPTION 'Retiro inesperado: %',r; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.evidencias_actividad('listar')) x WHERE x->>'folio'=fol) THEN
  RAISE EXCEPTION 'La evidencia retirada sigue en la lista'; END IF;
 bloqueo:=false;
 BEGIN PERFORM public.evidencias_actividad('descargar',jsonb_build_object('folio',fol)); EXCEPTION WHEN object_not_in_prerequisite_state THEN bloqueo:=true; END;
 IF NOT bloqueo THEN RAISE EXCEPTION 'Descargó una evidencia retirada'; END IF;

 -- Nadie lee el historial directo por la API
 IF has_table_privilege('authenticated','public."historialEvidencia"','SELECT') THEN
  RAISE EXCEPTION 'authenticated puede leer historialEvidencia directo'; END IF;

 RAISE NOTICE 'Pruebas de evidencias privadas: OK';
END $$;
ROLLBACK;
SELECT 'Evidencias: permisos por actividad, acceso de Coordinación, bitácora, retiro y privacidad OK; registros de prueba revertidos' resultado;
