-- Requiere un contenido temporal propio y un PNG/JPG temporal ya subido por el backend.
-- Configurar prueba.imagen_folio y prueba.imagen_ruta antes de ejecutar. Todo se revierte.
BEGIN;
DO $$
DECLARE
 f text:=current_setting('prueba.imagen_folio'); ruta text:=current_setting('prueba.imagen_ruta');
 actor uuid; sesion uuid:=gen_random_uuid(); r jsonb; fallo boolean;
BEGIN
 SELECT "creadoPor" INTO STRICT actor FROM public."Contenido" WHERE folio=f AND titulo='Prueba temporal de imagen';
 INSERT INTO auth.sessions(id,user_id,created_at) VALUES(sesion,actor,now());
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sesion)::text,true);
 r:=public.imagen_contenido(f,'preparar');
 fallo:=false;
 BEGIN PERFORM public.imagen_contenido(f,'asociar','CN-0000/00000000-0000-0000-0000-000000000000.png','image/png',(r->>'actualizadoEn')::timestamptz);
 EXCEPTION WHEN invalid_parameter_value THEN fallo:=true; END;
 IF NOT fallo THEN RAISE EXCEPTION 'Aceptó un archivo de otro contenido.'; END IF;
 fallo:=false;
 BEGIN PERFORM public.imagen_contenido(f,'asociar',ruta,'image/png','2000-01-01');
 EXCEPTION WHEN serialization_failure THEN fallo:=true; END;
 IF NOT fallo THEN RAISE EXCEPTION 'Aceptó una carga sobre una versión obsoleta.'; END IF;
 r:=public.imagen_contenido(f,'asociar',ruta,'image/png',(r->>'actualizadoEn')::timestamptz);
 IF r->>'tieneImagen'<>'true' OR public.editor_contenidos('obtener',jsonb_build_object('folio',f))->>'tieneImagen'<>'true' THEN
  RAISE EXCEPTION 'El borrador no conserva la imagen.'; END IF;
 r:=public.imagen_contenido(f,'quitar',null,null,(r->>'actualizadoEn')::timestamptz);
 IF r->>'tieneImagen'<>'false' THEN RAISE EXCEPTION 'No se quitó la referencia.'; END IF;
 r:=public.imagen_contenido(f,'asociar',ruta,'image/png',(r->>'actualizadoEn')::timestamptz);
 -- Incluso con una ruta conocida, el visitante no lee el borrador.
 PERFORM set_config('request.jwt.claims','',true); SET LOCAL ROLE anon;
 IF public.imagen_publicada(f) IS NOT NULL THEN RAISE EXCEPTION 'Imagen de borrador pública.'; END IF;
 fallo:=false;
 BEGIN PERFORM public.imagen_contenido(f); EXCEPTION WHEN insufficient_privilege THEN fallo:=true; END;
 RESET ROLE;
 IF NOT fallo THEN RAISE EXCEPTION 'Anónimo abrió la función privada.'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sesion)::text,true);
 r:=public.editor_contenidos('enviar',jsonb_build_object('folio',f));
 r:=public.revision_contenidos('publicar',jsonb_build_object('folio',f,'actualizadoEn',r->>'actualizadoEn','referencia','Prueba de imagen reversible'));
 fallo:=false;
 BEGIN PERFORM public.imagen_contenido(f,'preparar'); EXCEPTION WHEN object_not_in_prerequisite_state THEN fallo:=true; END;
 IF NOT fallo THEN RAISE EXCEPTION 'Una imagen publicada se pudo cambiar sin revisión.'; END IF;
 PERFORM set_config('request.jwt.claims','',true); SET LOCAL ROLE anon;
 IF public.imagen_publicada(f)->>'ruta' IS DISTINCT FROM ruta THEN RAISE EXCEPTION 'No se publicó la imagen.'; END IF;
 IF public.contenidos_publicados('noticia',f)->0->>'imagenUrl' IS DISTINCT FROM '/api/contenidos/publicos/'||f||'/imagen' THEN
  RAISE EXCEPTION 'Falta la dirección pública de la imagen.'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sesion)::text,true);
 PERFORM public.revision_contenidos('retirar',jsonb_build_object('folio',f,'actualizadoEn',r->>'actualizadoEn','nota','Fin de prueba reversible'));
 PERFORM set_config('request.jwt.claims','',true); SET LOCAL ROLE anon;
 IF public.imagen_publicada(f) IS NOT NULL THEN RAISE EXCEPTION 'La imagen retirada todavía es pública.'; END IF;
 RESET ROLE;
 RAISE NOTICE 'Imágenes: asociación, propiedad de ruta, versión, persistencia, privacidad, publicación y retiro OK';
END $$;
ROLLBACK;
