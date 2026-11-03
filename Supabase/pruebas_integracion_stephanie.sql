-- Pruebas reversibles de Contacto, Bibliocomunidad y Fuentes.
BEGIN;
DO $$
DECLARE
 actor uuid:=gen_random_uuid(); externo uuid:=gen_random_uuid(); sesion uuid:=gen_random_uuid();
 sesion_externa uuid:=gen_random_uuid(); id_actual uuid; contacto uuid; caso uuid; fuente uuid; nueva uuid;
 r jsonb; n integer; rechazado boolean;
 datos jsonb:='{"nombres":"Prueba HU11","primerApellido":"Temporal","fechaNacimiento":"2000-01-01","telefono":"3110000000","aceptaAviso":true,"domicilio":{"calle":"Prueba","numeroExterior":"sin número","coloniaLocalidad":"Prueba","codigoPostal":"63000","municipio":"Tepic","estadoProvincia":"Nayarit"}}';
BEGIN
 FOREACH id_actual IN ARRAY ARRAY[actor,externo] LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
  VALUES(id_actual,id_actual::text||'@example.invalid',now(),jsonb_build_object('registro',datos));
 END LOOP;
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(sesion,actor,now()),(sesion_externa,externo,now());
 INSERT INTO public."rolUsuario"("usuarioId","rolCodigo","asignadoPor","motivoAsignacion")
 VALUES(actor,'administrador',actor,'Prueba reversible'),(actor,'editor',actor,'Prueba reversible');
 PERFORM set_config('request.jwt.claims','{}',true); SET LOCAL ROLE anon;
 r:=public.registrar_contacto_publico(NULL,'Prueba integración','prueba@example.com','Consulta','Texto de prueba','3110000000');
 contacto:=(r->>'id')::uuid;
 r:=public.consultar_contacto_por_folio(contacto);
 IF r->>'estadoAtencion'<>'recibido' OR r ? 'correoContacto' OR r ? 'respuestaFinal' THEN RAISE EXCEPTION 'Seguimiento inicial incorrecto.'; END IF;
 rechazado:=false;
 BEGIN PERFORM * FROM public."mensajeContacto"; EXCEPTION WHEN insufficient_privilege THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Listado público de contactos.'; END IF;
 RESET ROLE;
 IF (SELECT "telefonoContacto" FROM public."mensajeContacto" WHERE id=contacto)<>'3110000000' THEN RAISE EXCEPTION 'Teléfono perdido.'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 rechazado:=false;
 BEGIN PERFORM public.atender_contacto(contacto,'cerrado','Respuesta'); EXCEPTION WHEN insufficient_privilege THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Rol sin capacidad pudo cerrar.'; END IF;
 RESET ROLE;
 INSERT INTO public."permisoCuenta"("usuarioId",capacidad,"asignadoPor",motivo) VALUES
 (actor,'atender_contactos',actor,'Prueba reversible'),(actor,'atender_bibliocomunidad',actor,'Prueba reversible'),
 (actor,'gestionar_fuentes_asistente',actor,'Prueba reversible');
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO n FROM public."mensajeContacto" WHERE id=contacto;
 IF n<>1 THEN RAISE EXCEPTION 'Personal no ve contacto.'; END IF;
 r:=public.atender_contacto(contacto,'en_atencion',NULL);
 r:=public.atender_contacto(contacto,'cerrado','Respuesta final');
 rechazado:=false;
 BEGIN PERFORM public.atender_contacto(contacto,'en_atencion',NULL); EXCEPTION WHEN object_not_in_prerequisite_state THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Reabrió contacto cerrado.'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{}',true); SET LOCAL ROLE anon;
 r:=public.consultar_contacto_por_folio(contacto);
 IF r->>'respuestaFinal'<>'Respuesta final' THEN RAISE EXCEPTION 'No entrega respuesta.'; END IF;
 r:=public.registrar_solicitud_bibliocomunidad(NULL,'Prueba teléfono',NULL,'3110000000','Interés de prueba');
 caso:=(r->>'id')::uuid;
 IF public.consultar_contacto_por_folio(caso) IS NOT NULL THEN RAISE EXCEPTION 'Seguimiento general revela Bibliocomunidad.'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.registrar_intento_bibliocomunidad(caso,'llamada',false,'Sin respuesta');
 rechazado:=false;
 BEGIN PERFORM public.finalizar_solicitud_bibliocomunidad(caso,true,'Aceptar',false); EXCEPTION WHEN check_violation THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Confirmó sin contacto efectivo.'; END IF;
 r:=public.registrar_intento_bibliocomunidad(caso,'correo',true,'Contacto confirmado');
 SELECT count(*) INTO n FROM public.listar_intentos_bibliocomunidad(caso);
 IF n<>2 THEN RAISE EXCEPTION 'Bitácora incompleta.'; END IF;
 r:=public.finalizar_solicitud_bibliocomunidad(caso,true,'Incorporación confirmada',false);
 IF r->>'estadoAtencion'<>'cerrado' OR r->>'incorporacionConfirmada'<>'true' THEN RAISE EXCEPTION 'No cerró caso.'; END IF;
 INSERT INTO public."fuenteRAG"("tituloFuente","tipoFuente","contenidoReferencia","subidaPor")
 VALUES('Prueba reversible','documento','Texto de prueba',actor) RETURNING id INTO fuente;
 rechazado:=false;
 BEGIN PERFORM public.activar_fuente_rag(fuente); EXCEPTION WHEN check_violation THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Activó borrador.'; END IF;
 r:=public.resolver_fuente_rag(fuente,true); r:=public.activar_fuente_rag(fuente);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{}',true); SET LOCAL ROLE anon;
 SELECT count(*) INTO n FROM public."fuenteRAG" WHERE id=fuente;
 IF n<>1 THEN RAISE EXCEPTION 'Fuente activa no recuperable.'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.crear_version_fuente_rag(fuente,'Prueba versión 2','documento','Nuevo texto'); nueva:=(r->>'id')::uuid;
 IF r->>'version'<>'2' OR r->>'estadoFuente'<>'borrador' OR r->>'activa'<>'false' THEN RAISE EXCEPTION 'Versión heredó autorización.'; END IF;
 rechazado:=false;
 BEGIN PERFORM public.crear_version_fuente_rag(fuente,'Duplicada','documento','Texto'); EXCEPTION WHEN check_violation THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Duplicó versión.'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{}',true); SET LOCAL ROLE anon;
 SELECT count(*) INTO n FROM public."fuenteRAG" WHERE id IN (fuente,nueva);
 IF n<>0 THEN RAISE EXCEPTION 'Fuente retirada o borrador públicos.'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',externo,'role','authenticated','session_id',sesion_externa)::text,true);
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO n FROM public."mensajeContacto" WHERE id IN (contacto,caso);
 IF n<>0 THEN RAISE EXCEPTION 'Cuenta ajena ve casos.'; END IF;
 rechazado:=false;
 BEGIN PERFORM public.registrar_intento_bibliocomunidad(caso,'correo',false,'No permitido'); EXCEPTION WHEN insufficient_privilege THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Cuenta ajena modificó bitácora.'; END IF;
 RESET ROLE;
 DELETE FROM auth.sessions WHERE id=sesion;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sesion)::text,true);
 SET LOCAL ROLE authenticated;
 rechazado:=false;
 BEGIN PERFORM public.retirar_fuente_rag(nueva); EXCEPTION WHEN insufficient_privilege THEN rechazado:=true; END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Sesión revocada modificó fuente.'; END IF;
 RESET ROLE;
END;
$$;
ROLLBACK;
SELECT 'Integración Stephanie OK; todo revertido' AS resultado;
