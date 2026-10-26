-- Sustituye el modelo provisional de tres roles por los actores de 3.1b, sección 2.2.
-- Visitante es acceso público, no una cuenta. No se otorgan roles del personal a personas.
ALTER TABLE public.rol DROP CONSTRAINT solo_tres_roles;
INSERT INTO public.rol(codigo,nombre,descripcion) VALUES
 ('usuario','Usuario / Cliente','Gestiona lo propio, propone eventos o clubes, solicita servicios e inscripciones; no publica ni aprueba automáticamente.'),
 ('editor','Editor','Prepara contenidos institucionales; publicación únicamente con permiso expreso.'),
 ('responsable_actividades','Responsable de actividades','Gestiona actividades, propuestas, inscripciones, asistencia, evidencias, moderación y recompensas dentro de su ámbito autorizado.'),
 ('administrador','Administrador del portal','Administra cuentas, permisos y configuración autorizada; no recibe autoridad institucional automática.')
ON CONFLICT(codigo) DO UPDATE SET nombre=EXCLUDED.nombre,descripcion=EXCLUDED.descripcion;
ALTER TABLE public.rol ADD CONSTRAINT roles_documentados CHECK(codigo IN ('usuario','editor','responsable_actividades','administrador'));
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public."permisoCuenta"'::regclass
  AND contype='c' AND pg_get_constraintdef(oid) LIKE '%capacidad%' LOOP
   EXECUTE format('ALTER TABLE public."permisoCuenta" DROP CONSTRAINT %I',c.conname);
 END LOOP;
END; $$;
ALTER TABLE public."permisoCuenta" ADD CONSTRAINT capacidades_documentadas CHECK(capacidad IN
 ('preparar_contenidos','gestionar_actividades','confirmar_inscripciones','registrar_asistencia',
 'moderar_foro','registrar_recompensas','alta_asistida','orientar_recuperacion','atender_contactos',
 'validar_credenciales','publicar_contenidos','gestionar_evidencias','consultar_estadisticas',
 'gestionar_fuentes_asistente','registrar_resoluciones_actividades','enviar_avisos','consultar_cuentas_atencion','atender_bibliocomunidad'));

CREATE FUNCTION privado.capacidad_admite_roles(capacidad text,roles text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT CASE
 WHEN capacidad IN ('gestionar_actividades','confirmar_inscripciones','registrar_asistencia','moderar_foro',
  'registrar_recompensas','gestionar_evidencias','consultar_estadisticas','registrar_resoluciones_actividades')
 THEN 'responsable_actividades'=ANY(roles)
 WHEN capacidad IN ('preparar_contenidos','gestionar_fuentes_asistente') THEN 'editor'=ANY(roles)
 WHEN capacidad='publicar_contenidos' THEN roles && ARRAY['editor','responsable_actividades','administrador']::text[]
 WHEN capacidad IN ('alta_asistida','orientar_recuperacion','atender_contactos','validar_credenciales','enviar_avisos','consultar_cuentas_atencion','atender_bibliocomunidad') THEN true
 ELSE false END;
$$;
REVOKE ALL ON FUNCTION privado.capacidad_admite_roles(text,text[]) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION privado.capacidad_corresponde(usuario uuid,capacidad text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT privado.capacidad_admite_roles(capacidad,coalesce(array_agg(r."rolCodigo"),ARRAY[]::text[]))
 FROM public."rolUsuario" r WHERE r."usuarioId"=usuario AND r."vigenteDesde"<=statement_timestamp()
 AND (r."vigenteHasta" IS NULL OR r."vigenteHasta">statement_timestamp());
$$;
REVOKE ALL ON FUNCTION privado.capacidad_corresponde(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION privado.permisos_de_cuenta(usuario uuid,efectivos boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('ambito',CASE WHEN p."actividadId" IS NULL THEN 'global' ELSE 'actividades_asignadas' END)
 ORDER BY p.capacidad,p."actividadId"),'[]'::jsonb)
 FROM public."permisoCuenta" p WHERE p."usuarioId"=usuario AND (NOT efectivos OR (
 p."vigenteDesde"<=statement_timestamp() AND (p."vigenteHasta" IS NULL OR p."vigenteHasta">statement_timestamp())
 AND privado.capacidad_corresponde(usuario,p.capacidad)));
$$;
REVOKE ALL ON FUNCTION privado.permisos_de_cuenta(uuid,boolean) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION privado.administrar_roles_cuenta(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid; destino uuid; v_codigo text; motivo text; ambito text;
 desde timestamptz; hasta timestamptz; actividades uuid[] := ARRAY[]::uuid[];
 antes jsonb; despues jsonb; estado text; limite integer; desplazamiento integer; busqueda text;
 salida jsonb; total bigint; claves text[];
BEGIN
 IF operacion NOT IN ('mi_acceso','listar_roles','listar_cuentas','ver_cuenta','asignar_rol','retirar_rol','cambiar_estado','historial')
   OR operacion IS NULL OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'Petición inválida.' USING ERRCODE='22023';
 END IF;
 IF operacion IN ('asignar_rol','retirar_rol','cambiar_estado') THEN
   -- Serializa todas las mutaciones administrativas para evitar retirar los dos últimos admins a la vez.
   PERFORM pg_advisory_xact_lock(hashtextextended('biblioteca.administrar_cuentas',0));
 END IF;
 actor := privado.comprobar_sesion_cuenta();
 IF operacion='mi_acceso' THEN
   IF datos<>'{}'::jsonb THEN RAISE EXCEPTION 'No se reciben campos.' USING ERRCODE='22023'; END IF;
   RETURN jsonb_build_object('usuarioId',actor,'roles',(
     SELECT coalesce(jsonb_agg(valor),'[]'::jsonb) FROM jsonb_array_elements(privado.roles_de_cuenta(actor)) valor
     WHERE (valor->>'vigenteDesde')::timestamptz<=statement_timestamp()
       AND ((valor->>'vigenteHasta') IS NULL OR (valor->>'vigenteHasta')::timestamptz>statement_timestamp())
   ));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public."rolUsuario" r WHERE r."usuarioId"=actor
    AND r."rolCodigo"='administrador' AND r.ambito='global'
    AND r."vigenteDesde"<=statement_timestamp() AND (r."vigenteHasta" IS NULL OR r."vigenteHasta">statement_timestamp())) THEN
   RAISE EXCEPTION 'Sin facultad administrativa.' USING ERRCODE='42501';
 END IF;
 claves := CASE operacion
   WHEN 'listar_roles' THEN ARRAY[]::text[]
   WHEN 'listar_cuentas' THEN ARRAY['busqueda','limite','desplazamiento']
   WHEN 'ver_cuenta' THEN ARRAY['usuarioId']
   WHEN 'historial' THEN ARRAY['usuarioId','limite','desplazamiento']
   WHEN 'asignar_rol' THEN ARRAY['usuarioId','rol','ambito','actividades','vigenteDesde','vigenteHasta','motivo']
   WHEN 'retirar_rol' THEN ARRAY['usuarioId','rol','motivo']
   WHEN 'cambiar_estado' THEN ARRAY['usuarioId','estatus','motivo'] END;
 IF EXISTS (SELECT 1 FROM jsonb_object_keys(datos) k WHERE NOT k=ANY(claves)) THEN
   RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE='22023';
 END IF;
 IF operacion='listar_roles' THEN
   RETURN (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.codigo),'[]'::jsonb) FROM public.rol r);
 END IF;
 IF operacion IN ('listar_cuentas','historial') THEN
   limite:=coalesce((datos->>'limite')::integer,25);
   desplazamiento:=coalesce((datos->>'desplazamiento')::integer,0);
   IF limite NOT BETWEEN 1 AND 100 OR desplazamiento NOT BETWEEN 0 AND 100000 THEN
     RAISE EXCEPTION 'Paginación inválida.' USING ERRCODE='22023'; END IF;
 END IF;
 IF operacion='listar_cuentas' THEN
   busqueda:=coalesce(datos->>'busqueda','');
   IF length(busqueda)>100 THEN RAISE EXCEPTION 'Búsqueda inválida.' USING ERRCODE='22023'; END IF;
   SELECT count(*) INTO total FROM public.perfil p JOIN auth.users u ON u.id=p.id
    WHERE concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido",u.email) ILIKE '%'||busqueda||'%';
   SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]'::jsonb) INTO salida FROM (
     SELECT p.id,p.nombres,p."primerApellido",p."segundoApellido",p.estatus,u.email as correo,
       u.email_confirmed_at IS NOT NULL AS "correoConfirmado",privado.roles_de_cuenta(p.id) as roles
     FROM public.perfil p JOIN auth.users u ON u.id=p.id
     WHERE concat_ws(' ',p.nombres,p."primerApellido",p."segundoApellido",u.email) ILIKE '%'||busqueda||'%'
     ORDER BY p.id LIMIT limite OFFSET desplazamiento
   ) q;
   RETURN jsonb_build_object('total',total,'cuentas',salida,'limite',limite,'desplazamiento',desplazamiento);
 END IF;
 destino:=(datos->>'usuarioId')::uuid;
 IF destino IS NULL OR NOT EXISTS (SELECT 1 FROM public.perfil WHERE id=destino) THEN
   RAISE EXCEPTION 'Cuenta no encontrada.' USING ERRCODE='P0002'; END IF;
 IF operacion='ver_cuenta' THEN
   RETURN (SELECT jsonb_build_object('id',p.id,'nombres',p.nombres,'primerApellido',p."primerApellido",
     'segundoApellido',p."segundoApellido",'estatus',p.estatus,'correo',u.email,
     'correoConfirmado',u.email_confirmed_at IS NOT NULL,'roles',privado.roles_de_cuenta(p.id))
     FROM public.perfil p JOIN auth.users u ON u.id=p.id WHERE p.id=destino);
 ELSIF operacion='historial' THEN
   SELECT count(*) INTO total FROM public."historialCuenta" WHERE "usuarioId"=destino;
   SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q."realizadoEn" DESC,q.id),'[]'::jsonb) INTO salida FROM (
     SELECT * FROM public."historialCuenta" WHERE "usuarioId"=destino ORDER BY "realizadoEn" DESC,id LIMIT limite OFFSET desplazamiento
   ) q;
   RETURN jsonb_build_object('total',total,'cambios',salida);
 END IF;
 motivo:=btrim(datos->>'motivo');
 IF motivo IS NULL OR length(motivo) NOT BETWEEN 1 AND 500 THEN
   RAISE EXCEPTION 'Motivo obligatorio.' USING ERRCODE='22023'; END IF;
 -- Los roles y el estado se escriben con la bitácora en la misma transacción.
 PERFORM 1 FROM public.perfil WHERE id=destino FOR UPDATE;
 IF operacion IN ('asignar_rol','retirar_rol') THEN
   v_codigo:=datos->>'rol';
   IF v_codigo IS NULL OR NOT EXISTS (SELECT 1 FROM public.rol WHERE rol.codigo=v_codigo) THEN
     RAISE EXCEPTION 'Rol no encontrado.' USING ERRCODE='P0002'; END IF;
   IF v_codigo='usuario' THEN RAISE EXCEPTION 'El rol básico no se asigna ni se retira manualmente.' USING ERRCODE='23514'; END IF;
   antes:=jsonb_build_object('roles',privado.roles_de_cuenta(destino),'permisosAdicionales',privado.permisos_de_cuenta(destino));
   IF operacion='asignar_rol' THEN
     IF NOT EXISTS (SELECT 1 FROM public.perfil p JOIN auth.users u ON u.id=p.id
       WHERE p.id=destino AND p.estatus='activo' AND u.email_confirmed_at IS NOT NULL) THEN
       RAISE EXCEPTION 'Se requiere cuenta activa y verificada.' USING ERRCODE='23514'; END IF;
     ambito:=coalesce(datos->>'ambito','global');
     desde:=coalesce((datos->>'vigenteDesde')::timestamptz,statement_timestamp());
     hasta:=(datos->>'vigenteHasta')::timestamptz;
     IF ambito<>'global' OR (hasta IS NOT NULL AND (hasta<=desde OR hasta<=statement_timestamp())) THEN
       RAISE EXCEPTION 'Vigencia o ámbito inválidos.' USING ERRCODE='23514'; END IF;
     IF jsonb_typeof(coalesce(datos->'actividades','[]'::jsonb))<>'array' THEN
       RAISE EXCEPTION 'Actividades inválidas.' USING ERRCODE='22023'; END IF;
     SELECT coalesce(array_agg(value::uuid),ARRAY[]::uuid[]) INTO actividades
       FROM jsonb_array_elements_text(coalesce(datos->'actividades','[]'::jsonb));
     IF cardinality(actividades)>100 OR cardinality(actividades)<>(SELECT count(DISTINCT a) FROM unnest(actividades) a)
        OR (ambito='global' AND cardinality(actividades)<>0)
        OR cardinality(actividades)<>0
        OR (SELECT count(*) FROM public.actividad WHERE id=ANY(actividades))<>cardinality(actividades) THEN
       RAISE EXCEPTION 'Alcance de actividades inválido.' USING ERRCODE='23514'; END IF;
     IF v_codigo='administrador' AND (ambito<>'global' OR hasta IS NOT NULL OR desde>statement_timestamp()) THEN
       RAISE EXCEPTION 'La administración debe ser actual, global y sin vencimiento automático.' USING ERRCODE='23514'; END IF;
     INSERT INTO public."rolUsuario" ("usuarioId","rolCodigo","asignadoPor","motivoAsignacion",ambito,"vigenteDesde","vigenteHasta")
       VALUES(destino,v_codigo,actor,motivo,ambito,desde,hasta)
       ON CONFLICT("usuarioId","rolCodigo") DO UPDATE SET "asignadoPor"=actor,"asignadoEn"=now(),
       "motivoAsignacion"=motivo,ambito=EXCLUDED.ambito,"vigenteDesde"=desde,"vigenteHasta"=hasta;

   ELSE
     IF NOT EXISTS (SELECT 1 FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"=v_codigo) THEN
       RAISE EXCEPTION 'Rol no asignado.' USING ERRCODE='P0002'; END IF;
     DELETE FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"=v_codigo;
     DELETE FROM public."permisoCuenta" p WHERE p."usuarioId"=destino AND NOT privado.capacidad_corresponde(destino,p.capacidad);
   END IF;
   despues:=jsonb_build_object('roles',privado.roles_de_cuenta(destino),'permisosAdicionales',privado.permisos_de_cuenta(destino));
 ELSE
   estado:=datos->>'estatus';
   IF estado IS NULL OR estado NOT IN ('activo','inactivo','bloqueado') THEN
     RAISE EXCEPTION 'Estado inválido.' USING ERRCODE='22023'; END IF;
   SELECT jsonb_build_object('estatus',estatus) INTO antes FROM public.perfil WHERE id=destino;
   IF antes->>'estatus'=estado THEN
     RAISE EXCEPTION 'La cuenta ya tiene ese estado.' USING ERRCODE='23514'; END IF;
   UPDATE public.perfil SET estatus=estado WHERE id=destino;
   IF estado<>'activo' THEN
     -- Las sesiones previas no recuperan vigencia cuando se reactiva la cuenta.
     UPDATE auth.sessions SET not_after=least(coalesce(not_after,statement_timestamp()),statement_timestamp()) WHERE user_id=destino;
   END IF;
   despues:=jsonb_build_object('estatus',estado);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public."rolUsuario" r JOIN public.perfil p ON p.id=r."usuarioId"
   JOIN auth.users u ON u.id=p.id WHERE r."rolCodigo"='administrador' AND p.estatus='activo'
   AND u.email_confirmed_at IS NOT NULL AND r."vigenteDesde"<=statement_timestamp()
   AND (r."vigenteHasta" IS NULL OR r."vigenteHasta">statement_timestamp())) THEN
   RAISE EXCEPTION 'No se puede dejar al portal sin administración recuperable.' USING ERRCODE='23514';
 END IF;
 INSERT INTO public."historialCuenta"("usuarioId","realizadoPor",accion,motivo,anterior,posterior)
 VALUES(destino,actor,operacion,motivo,antes,despues);
 RETURN jsonb_build_object('usuarioId',destino,'accion',operacion,'resultado',despues);
END;
$$;

REVOKE ALL ON FUNCTION privado.administrar_roles_cuenta(text,jsonb) FROM PUBLIC,anon,authenticated;


CREATE OR REPLACE FUNCTION privado.administrar_cuentas(operacion text, datos jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
 actor uuid; destino uuid; respuesta jsonb; antes jsonb; despues jsonb; motivo text; cap text;
 desde timestamptz; hasta timestamptz; ambito text; actividades uuid[]; a uuid; item text;
 catalogo text[]:=ARRAY['preparar_contenidos','gestionar_actividades','confirmar_inscripciones','registrar_asistencia',
 'moderar_foro','registrar_recompensas','alta_asistida','orientar_recuperacion','atender_contactos','validar_credenciales','publicar_contenidos','gestionar_evidencias','consultar_estadisticas','gestionar_fuentes_asistente','registrar_resoluciones_actividades','enviar_avisos','consultar_cuentas_atencion','atender_bibliocomunidad'];
 roles_deseados text[]; capacidades_deseadas text[];
BEGIN
 IF operacion IS NULL OR jsonb_typeof(datos) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'Petición inválida.' USING ERRCODE='22023'; END IF;
 IF operacion IN ('asignar_rol','retirar_rol','cambiar_estado','asignar_capacidad','retirar_capacidad','guardar_acceso') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('biblioteca.administrar_cuentas',0)); END IF;
 actor:=privado.comprobar_sesion_cuenta();
 IF operacion NOT IN ('listar_capacidades','asignar_capacidad','retirar_capacidad','guardar_acceso') THEN
  respuesta:=privado.administrar_roles_cuenta(operacion,datos);
  IF operacion='mi_acceso' THEN RETURN respuesta||jsonb_build_object('permisosAdicionales',privado.permisos_de_cuenta(actor,true)); END IF;
  IF operacion='ver_cuenta' THEN RETURN respuesta||jsonb_build_object('permisosAdicionales',privado.permisos_de_cuenta((datos->>'usuarioId')::uuid)); END IF;
  IF operacion='listar_cuentas' THEN
   RETURN respuesta||jsonb_build_object('cuentas',(SELECT coalesce(jsonb_agg(c||jsonb_build_object('permisosAdicionales',
    privado.permisos_de_cuenta((c->>'id')::uuid))),'[]'::jsonb) FROM jsonb_array_elements(respuesta->'cuentas') c));
  END IF;
  RETURN respuesta;
 END IF;
 -- La misma comprobación de administrador que protege la gestión de roles.
 PERFORM privado.administrar_roles_cuenta('listar_roles');
 IF operacion='listar_capacidades' THEN
  IF datos<>'{}'::jsonb THEN RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE='22023'; END IF;
  RETURN (SELECT jsonb_agg(jsonb_build_object('codigo',c,'admiteActividades',c=ANY(ARRAY['preparar_contenidos','gestionar_actividades',
   'confirmar_inscripciones','registrar_asistencia','registrar_recompensas','publicar_contenidos','gestionar_evidencias','consultar_estadisticas','registrar_resoluciones_actividades','enviar_avisos']))) FROM unnest(catalogo) c);
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(datos) k WHERE k NOT IN ('usuarioId','capacidad','ambito','actividades',
  'vigenteDesde','vigenteHasta','motivo','roles','capacidades')) THEN
  RAISE EXCEPTION 'Campos no permitidos.' USING ERRCODE='22023'; END IF;
 destino:=(datos->>'usuarioId')::uuid; motivo:=btrim(datos->>'motivo');
 IF motivo IS NULL OR length(motivo) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Motivo obligatorio.' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.perfil WHERE id=destino FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta inexistente.' USING ERRCODE='P0002'; END IF;
 antes:=jsonb_build_object('roles',privado.roles_de_cuenta(destino),'permisosAdicionales',privado.permisos_de_cuenta(destino));
 IF operacion='guardar_acceso' THEN
  IF jsonb_typeof(datos->'roles') IS DISTINCT FROM 'array' OR jsonb_typeof(datos->'capacidades') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Selección inválida.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO roles_deseados FROM jsonb_array_elements_text(datos->'roles');
  SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO capacidades_deseadas FROM jsonb_array_elements_text(datos->'capacidades');
  IF cardinality(roles_deseados)>3 OR NOT roles_deseados<@ARRAY['editor','responsable_actividades','administrador']::text[]
   OR cardinality(capacidades_deseadas)>18 OR NOT capacidades_deseadas<@catalogo
   OR cardinality(roles_deseados)<>(SELECT count(DISTINCT x) FROM unnest(roles_deseados) x)
   OR cardinality(capacidades_deseadas)<>(SELECT count(DISTINCT x) FROM unnest(capacidades_deseadas) x) THEN
   RAISE EXCEPTION 'Roles o capacidades inválidos.' USING ERRCODE='23514'; END IF;
  -- Primero incorporar roles; después retirar. Un error revierte la selección completa.
  FOREACH item IN ARRAY roles_deseados LOOP
   IF NOT EXISTS(SELECT 1 FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"=item
     AND "vigenteDesde"<=statement_timestamp() AND ("vigenteHasta" IS NULL OR "vigenteHasta">statement_timestamp())) THEN
    PERFORM privado.administrar_roles_cuenta('asignar_rol',jsonb_build_object('usuarioId',destino,'rol',item,'motivo',motivo)); END IF;
  END LOOP;
  DELETE FROM public."permisoCuenta" WHERE "usuarioId"=destino;
  FOREACH item IN ARRAY capacidades_deseadas LOOP
   IF NOT privado.capacidad_admite_roles(item,roles_deseados) THEN RAISE EXCEPTION 'La capacidad no corresponde a la responsabilidad seleccionada.' USING ERRCODE='23514'; END IF;
   PERFORM privado.administrar_cuentas('asignar_capacidad',(datos-'roles'-'capacidades')||jsonb_build_object('capacidad',item));
  END LOOP;
  FOR item IN SELECT "rolCodigo" FROM public."rolUsuario" WHERE "usuarioId"=destino AND "rolCodigo"<>'usuario' AND NOT "rolCodigo"=ANY(roles_deseados) ORDER BY ("rolCodigo"='administrador') LOOP
   PERFORM privado.administrar_roles_cuenta('retirar_rol',jsonb_build_object('usuarioId',destino,'rol',item,'motivo',motivo));
  END LOOP;

 ELSE
  cap:=datos->>'capacidad';
  IF cap IS NULL OR NOT cap=ANY(catalogo) THEN RAISE EXCEPTION 'Capacidad inexistente.' USING ERRCODE='22023'; END IF;
  IF operacion='asignar_capacidad' THEN
   IF NOT EXISTS(SELECT 1 FROM public.perfil p JOIN auth.users u ON u.id=p.id
    WHERE p.id=destino AND privado.capacidad_corresponde(destino,cap) AND p.estatus='activo' AND u.email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'La capacidad requiere cuenta activa, correo verificado y la responsabilidad documentada.' USING ERRCODE='23514'; END IF;
   ambito:=coalesce(datos->>'ambito','global'); desde:=coalesce((datos->>'vigenteDesde')::timestamptz,statement_timestamp()); hasta:=(datos->>'vigenteHasta')::timestamptz;
   IF ambito NOT IN ('global','actividades_asignadas') OR (hasta IS NOT NULL AND (hasta<=desde OR hasta<=statement_timestamp()))
    OR jsonb_typeof(coalesce(datos->'actividades','[]'::jsonb))<>'array' THEN
    RAISE EXCEPTION 'Ámbito o vigencia inválidos.' USING ERRCODE='23514'; END IF;
   SELECT coalesce(array_agg(value::uuid),ARRAY[]::uuid[]) INTO actividades FROM jsonb_array_elements_text(coalesce(datos->'actividades','[]'::jsonb));
   IF cardinality(actividades)>100 OR cardinality(actividades)<>(SELECT count(DISTINCT x) FROM unnest(actividades) x)
    OR (ambito='global' AND cardinality(actividades)>0)
    OR (ambito='actividades_asignadas' AND (cardinality(actividades)=0 OR NOT cap=ANY(ARRAY['preparar_contenidos','gestionar_actividades',
     'confirmar_inscripciones','registrar_asistencia','registrar_recompensas','publicar_contenidos','gestionar_evidencias','consultar_estadisticas','registrar_resoluciones_actividades','enviar_avisos'])))
    OR (SELECT count(*) FROM public.actividad WHERE id=ANY(actividades))<>cardinality(actividades) THEN
    RAISE EXCEPTION 'Alcance inválido.' USING ERRCODE='23514'; END IF;
   DELETE FROM public."permisoCuenta" WHERE "usuarioId"=destino AND capacidad=cap;
   IF ambito='global' THEN actividades:=ARRAY[NULL::uuid]; END IF;
   FOREACH a IN ARRAY actividades LOOP
    INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"actividadId","vigenteDesde","vigenteHasta","asignadoPor",motivo)
    VALUES(destino,cap,a,desde,hasta,actor,motivo);
   END LOOP;
  ELSE
   DELETE FROM public."permisoCuenta" WHERE "usuarioId"=destino AND capacidad=cap;
   IF NOT FOUND THEN RAISE EXCEPTION 'Capacidad no asignada.' USING ERRCODE='P0002'; END IF;
  END IF;
 END IF;
 despues:=jsonb_build_object('roles',privado.roles_de_cuenta(destino),'permisosAdicionales',privado.permisos_de_cuenta(destino));
 INSERT INTO public."historialCuenta"("usuarioId","realizadoPor",accion,motivo,anterior,posterior)
 VALUES(destino,actor,operacion,motivo,antes,despues);
 RETURN jsonb_build_object('usuarioId',destino,'accion',operacion,'resultado',despues);
END;
$$;
REVOKE ALL ON FUNCTION privado.administrar_cuentas(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION privado.administrar_cuentas(text,jsonb) TO authenticated;
