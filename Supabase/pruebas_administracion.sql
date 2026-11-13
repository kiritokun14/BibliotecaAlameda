-- Ejecutar después de administración, endurecimiento y alineación con 3.1b y Figma. ROLLBACK.
-- Cuenta y sesión ficticias dentro de BEGIN/ROLLBACK; no concede permisos permanentes.
BEGIN;
DO $$
DECLARE
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); u uuid:=gen_random_uuid();
 sa uuid:=gen_random_uuid(); sb uuid:=gen_random_uuid(); su uuid:=gen_random_uuid(); id_actual uuid;
 actividad uuid:=gen_random_uuid(); n integer; rechazo boolean; respuesta jsonb;
 datos jsonb:='{"nombres":"Prueba T032","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 IF (SELECT count(*) FROM public.rol)<>4 THEN RAISE EXCEPTION 'El catálogo no coincide con los cuatro actores con cuenta.'; END IF;
 FOREACH id_actual IN ARRAY ARRAY[a,b,u] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
   VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',datos));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(sa,a,now()),(sb,b,now()),(su,u,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion")
  VALUES(a,'administrador',a,'Arranque ficticio de prueba reversible');
 INSERT INTO public.actividad(id,slug,titulo,descripcion,categoria,audiencia,requerimientos,"creadoPor")
  VALUES(actividad,actividad::text,'Actividad ficticia','Prueba','prueba','general','ninguno',a);

 -- Usuario básico: sus datos de metadata no conceden facultades.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',su)::text,true);
 UPDATE auth.users SET raw_user_meta_data='{"rol":"administrador"}' WHERE id=u;
 rechazo:=false;
 BEGIN PERFORM public.administrar_cuentas('listar_cuentas');
 EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Un usuario básico obtuvo acceso administrativo.'; END IF;
 IF jsonb_array_length(public.administrar_cuentas('mi_acceso')->'roles')<>1 THEN
  RAISE EXCEPTION 'La metadata elevó privilegios.'; END IF;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','session_id',sa)::text,true);
 respuesta:=public.administrar_cuentas('listar_cuentas','{"limite":1}');
 IF jsonb_array_length(respuesta->'cuentas')<>1 OR (respuesta->>'total')::integer<3 THEN
  RAISE EXCEPTION 'Listado paginado incorrecto.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.administrar_cuentas('asignar_rol',jsonb_build_object('usuarioId',u,'rol','editor','motivo','Prueba','asignadoPor',u));
 EXCEPTION WHEN invalid_parameter_value THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Se aceptó un actor recibido del cliente.'; END IF;

 -- La excepción revierte el retiro y conserva el último administrador cuando es el único.
 IF (SELECT count(*) FROM public."rolUsuario" r JOIN public.perfil p ON p.id=r."usuarioId"
     WHERE r."rolCodigo"='administrador' AND p.estatus='activo' AND r."vigenteDesde"<=now()
       AND (r."vigenteHasta" IS NULL OR r."vigenteHasta">now()))=1 THEN
  rechazo:=false;
  BEGIN PERFORM public.administrar_cuentas('retirar_rol',jsonb_build_object('usuarioId',a,'rol','administrador','motivo','Prueba negativa'));
  EXCEPTION WHEN check_violation THEN rechazo:=true; END;
  IF NOT rechazo OR NOT EXISTS(SELECT 1 FROM public."rolUsuario" WHERE "usuarioId"=a AND "rolCodigo"='administrador') THEN
   RAISE EXCEPTION 'No se protegió al último administrador.'; END IF;
 END IF;

 PERFORM public.administrar_cuentas('asignar_rol',jsonb_build_object('usuarioId',b,'rol','administrador','motivo','Segundo administrador ficticio'));
 PERFORM public.administrar_cuentas('asignar_rol',jsonb_build_object('usuarioId',u,'rol','responsable_actividades','motivo','Gestionar actividades'));
 PERFORM public.administrar_cuentas('asignar_capacidad',jsonb_build_object('usuarioId',u,'capacidad','gestionar_actividades',
  'ambito','actividades_asignadas','actividades',jsonb_build_array(actividad),'motivo','Actividad asignada',
  'vigenteDesde',now()-interval '1 minute','vigenteHasta',now()+interval '1 day'));
 IF NOT EXISTS (SELECT 1 FROM public."permisoCuenta" WHERE "usuarioId"=u AND "actividadId"=actividad) THEN
  RAISE EXCEPTION 'El ámbito no se guardó.'; END IF;
 PERFORM public.administrar_cuentas('retirar_capacidad',jsonb_build_object('usuarioId',u,'capacidad','gestionar_actividades','motivo','Termina la función'));
 IF EXISTS (SELECT 1 FROM public."permisoCuenta" WHERE "usuarioId"=u) THEN RAISE EXCEPTION 'Quedaron ámbitos huérfanos.'; END IF;
 respuesta:=public.administrar_cuentas('historial',jsonb_build_object('usuarioId',u));
 IF (respuesta->>'total')::integer<>3 THEN RAISE EXCEPTION 'Bitácora incompleta.'; END IF;
 IF EXISTS (SELECT 1 FROM public."historialCuenta" WHERE "usuarioId"=u AND "realizadoPor"<>a) THEN
  RAISE EXCEPTION 'La bitácora no identifica al actor real.'; END IF;
 rechazo:=false;
 BEGIN UPDATE public."historialCuenta" SET motivo='Intento de alteración' WHERE "usuarioId"=u;
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'La bitácora fue alterada.'; END IF;

 -- Las casillas se guardan juntas y las capacidades son independientes.
 PERFORM public.administrar_cuentas('guardar_acceso',jsonb_build_object('usuarioId',u,
  'roles',jsonb_build_array('responsable_actividades'),'capacidades',jsonb_build_array('registrar_asistencia'),
  'motivo','Selección completa de prueba'));
 IF (SELECT count(*) FROM public."permisoCuenta" WHERE "usuarioId"=u)<>1
  OR NOT EXISTS(SELECT 1 FROM public."permisoCuenta" WHERE "usuarioId"=u AND capacidad='registrar_asistencia') THEN
  RAISE EXCEPTION 'Las capacidades no son independientes.'; END IF;
 rechazo:=false;
 BEGIN PERFORM public.administrar_cuentas('guardar_acceso',jsonb_build_object('usuarioId',u,
  'roles',jsonb_build_array(),'capacidades',jsonb_build_array('registrar_asistencia'),'motivo','Prueba inválida'));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo OR (SELECT count(*) FROM public."permisoCuenta" WHERE "usuarioId"=u)<>1 THEN
  RAISE EXCEPTION 'Una selección inválida alteró permisos.'; END IF;
 PERFORM public.administrar_cuentas('guardar_acceso',jsonb_build_object('usuarioId',u,
  'roles',jsonb_build_array(),'capacidades',jsonb_build_array(),'motivo','Retirar funciones de prueba'));
 IF EXISTS(SELECT 1 FROM public."permisoCuenta" WHERE "usuarioId"=u)
  OR EXISTS(SELECT 1 FROM public."rolUsuario" WHERE "usuarioId"=u AND "rolCodigo"<>'usuario') THEN
  RAISE EXCEPTION 'No se retiraron las funciones.'; END IF;

 -- Servicios Digitales y Préstamos no requieren Editor, pero sí una concesión explícita.
 PERFORM public.administrar_cuentas('guardar_acceso',jsonb_build_object('usuarioId',u,
  'roles',jsonb_build_array(),'capacidades',jsonb_build_array('alta_asistida','validar_credenciales'),
  'motivo','Funciones específicas de atención y préstamos'));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',su)::text,true);
 IF jsonb_array_length(public.administrar_cuentas('mi_acceso')->'permisosAdicionales')<>2 THEN
  RAISE EXCEPTION 'Atención o préstamos dependen indebidamente de Editor.'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','session_id',sa)::text,true);
 rechazo:=false;
 BEGIN PERFORM public.administrar_cuentas('guardar_acceso',jsonb_build_object('usuarioId',u,
  'roles',jsonb_build_array('editor'),'capacidades',jsonb_build_array('moderar_foro'),'motivo','Prueba negativa'));
 EXCEPTION WHEN check_violation THEN rechazo:=true; END;
 IF NOT rechazo OR (SELECT count(*) FROM public."permisoCuenta" WHERE "usuarioId"=u)<>2 THEN
  RAISE EXCEPTION 'Editor pudo moderar o una selección inválida alteró permisos.'; END IF;
 -- Administrador no publica automáticamente; una concesión expresa sí habilita esa sección de Figma.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','session_id',sb)::text,true);
 IF jsonb_array_length(public.administrar_cuentas('mi_acceso')->'permisosAdicionales')<>0 THEN
  RAISE EXCEPTION 'Se concedió publicación automática al administrador.'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','session_id',sa)::text,true);
 PERFORM public.administrar_cuentas('asignar_capacidad',jsonb_build_object('usuarioId',b,
  'capacidad','publicar_contenidos','motivo','Publicación autorizada expresamente'));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','session_id',sb)::text,true);
 IF jsonb_array_length(public.administrar_cuentas('mi_acceso')->'permisosAdicionales')<>1 THEN
  RAISE EXCEPTION 'Se rechazó publicación expresamente autorizada.'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','session_id',sa)::text,true);
 PERFORM public.administrar_cuentas('guardar_acceso',jsonb_build_object('usuarioId',u,
  'roles',jsonb_build_array(),'capacidades',jsonb_build_array(),'motivo','Limpiar selección de prueba'));

 -- Vigencia futura excluida del acceso actual.
 PERFORM public.administrar_cuentas('asignar_rol',jsonb_build_object('usuarioId',u,'rol','responsable_actividades','motivo','Prueba futura',
  'vigenteDesde',now()+interval '1 day'));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',su)::text,true);
 IF jsonb_array_length(public.administrar_cuentas('mi_acceso')->'roles')<>1 THEN RAISE EXCEPTION 'Se concedió un rol antes de su vigencia.'; END IF;

 -- Desactivar y reactivar no devuelve validez a la sesión anterior.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','session_id',sa)::text,true);
 PERFORM public.administrar_cuentas('cambiar_estado',jsonb_build_object('usuarioId',u,'estatus','inactivo','motivo','Desactivación temporal'));
 PERFORM public.administrar_cuentas('cambiar_estado',jsonb_build_object('usuarioId',u,'estatus','activo','motivo','Reactivación'));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',su)::text,true);
 rechazo:=false;
 BEGIN PERFORM public.administrar_cuentas('mi_acceso');
 EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
 IF NOT rechazo THEN RAISE EXCEPTION 'Una sesión anterior recuperó acceso.'; END IF;
 IF has_function_privilege('anon','public.administrar_cuentas(text,jsonb)','EXECUTE')
    OR has_table_privilege('authenticated','public."rolUsuario"','INSERT')
    OR has_table_privilege('authenticated','public."historialCuenta"','UPDATE') THEN
   RAISE EXCEPTION 'Se abrió acceso directo no autorizado.';
 END IF;
END;
$$;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT 'Administración, permisos, ámbitos, vigencia, auditoría y revocación: correctos' as resultado;
ROLLBACK;
