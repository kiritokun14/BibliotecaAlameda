-- HU-19 / CU-19: datos persistentes para probar inscripciones desde el panel.
-- Ejecutar COMPLETO en Supabase > SQL Editor, después de inscripciones_responsables.sql.
-- Cambia SOLO correo_responsable por una cuenta existente con permiso de inscripciones.
-- No cambia contraseñas ni concede roles o capacidades a cuentas existentes.
-- Los tres participantes son ficticios y se crean sin contraseña ni identidad de acceso.
-- La transacción guarda los datos con COMMIT. Una segunda ejecución se rechaza sin duplicar.

BEGIN;
DO $$
DECLARE
 correo_responsable text := 'responsable@biblioteca.test'; -- EDITA AQUÍ si usas otra cuenta.
 responsable uuid;
 espacio_id uuid := '19000000-0000-4000-a000-000000000001';
 actividad_con_cupo uuid := '19000000-0000-4000-a100-000000000001';
 actividad_llena uuid := '19000000-0000-4000-a100-000000000002';
 sesion_con_cupo uuid := '19000000-0000-4000-a200-000000000001';
 sesion_llena uuid := '19000000-0000-4000-a200-000000000002';
 persona_uno uuid := '19000000-0000-4000-a300-000000000001';
 persona_dos uuid := '19000000-0000-4000-a300-000000000002';
 persona_tres uuid := '19000000-0000-4000-a300-000000000003';
 confirmada uuid := '19000000-0000-4000-a400-000000000003';
 fila record;
 inicio_prueba timestamptz := ((current_date + 7)::text || ' 10:00:00')::timestamp AT TIME ZONE 'America/Mazatlan';
BEGIN
 -- Evita cargar el mismo conjunto simultáneamente desde dos SQL Editors.
 PERFORM pg_advisory_xact_lock(hashtextextended('hu19.datos_prueba_inscripciones',0));
 IF to_regprocedure('public.gestionar_inscripciones(text,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Primero aplica Supabase/inscripciones_responsables.sql.';
 END IF;
 SELECT u.id INTO responsable FROM auth.users u JOIN public.perfil p ON p.id=u.id
 WHERE lower(u.email)=lower(btrim(correo_responsable)) AND p.estatus='activo'
 AND u.email_confirmed_at IS NOT NULL;
 IF responsable IS NULL THEN
  RAISE EXCEPTION 'No existe una cuenta activa y confirmada para %. Edita correo_responsable.',correo_responsable;
 END IF;
 -- Actualmente el acceso al panel exige permiso global. No se amplía el acceso con esta semilla.
 IF NOT privado.permiso_agenda(responsable,'confirmar_inscripciones',NULL) THEN
  RAISE EXCEPTION 'La cuenta necesita rol vigente y permiso global confirmar_inscripciones para probar desde el panel. El script no concede permisos.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.actividad WHERE id IN (actividad_con_cupo,actividad_llena)
  OR slug IN ('prueba-hu19-con-cupo','prueba-hu19-cupo-lleno'))
 OR EXISTS(SELECT 1 FROM public.espacio WHERE id=espacio_id OR slug='prueba-hu19-sala')
 OR EXISTS(SELECT 1 FROM auth.users WHERE id IN (persona_uno,persona_dos,persona_tres)
  OR email IN ('participante1.hu19@example.invalid','participante2.hu19@example.invalid','participante3.hu19@example.invalid')) THEN
  RAISE EXCEPTION 'Estos datos HU-19 ya existen o hay un identificador ocupado. No se sobrescribieron datos ni decisiones. Consulta las actividades Prueba HU-19.';
 END IF;

 -- El trigger de autorregistro crea perfiles y asigna solamente el rol básico usuario.
 FOR fila IN SELECT * FROM (VALUES
  (persona_uno,'participante1.hu19@example.invalid','Participante Uno'),
  (persona_dos,'participante2.hu19@example.invalid','Participante Dos'),
  (persona_tres,'participante3.hu19@example.invalid','Participante Tres')
 ) AS personas(id,correo,nombre) LOOP
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  VALUES(fila.id,fila.correo,now(),'{"provider":"email","providers":["email"]}'::jsonb,
   jsonb_build_object('registro',jsonb_build_object(
    'nombres',fila.nombre,'primerApellido','Prueba HU19','fechaNacimiento','2000-01-01',
    'telefono','3110000019','aceptaAviso',true,
    'domicilio',jsonb_build_object('calle','Prueba HU19','numeroExterior','S/N',
     'coloniaLocalidad','Centro','codigoPostal','63000','municipio','Tepic','estadoProvincia','Nayarit'))),now(),now());
 END LOOP;
 IF (SELECT count(*) FROM public.perfil WHERE id IN (persona_uno,persona_dos,persona_tres) AND estatus='activo')<>3 THEN
  RAISE EXCEPTION 'No se crearon los perfiles de prueba; revisa el trigger de registro. Se revierte la carga.';
 END IF;

 INSERT INTO public.espacio(id,slug,nombre,capacidad,descripcion)
 VALUES(espacio_id,'prueba-hu19-sala','Sala de prueba HU-19',3,'Espacio ficticio exclusivo para pruebas de inscripciones.');

 INSERT INTO public.actividad(id,slug,titulo,descripcion,categoria,audiencia,requerimientos,
  "estadoPublicacion","referenciaAutorizacion","referenciaPublicacion","creadoPor","requiereInscripcion",responsable)
 VALUES
 (actividad_con_cupo,'prueba-hu19-con-cupo','Prueba HU-19: taller con cupo',
  'Actividad ficticia para confirmar solicitudes y verificar el historial.','taller','Personas adultas',
  'Revisar que la persona sea adulta. Traer cuaderno. Documentar la revisión en el motivo.',
  'publicada','PRUEBA HU19: autorización ficticia','PRUEBA HU19: publicación ficticia',responsable,true,'Responsable de prueba HU-19'),
 (actividad_llena,'prueba-hu19-cupo-lleno','Prueba HU-19: taller sin cupo',
  'Actividad ficticia para comprobar el rechazo de una confirmación por cupo agotado.','taller','Personas adultas',
  'Revisar requisitos y disponibilidad antes de confirmar.',
  'publicada','PRUEBA HU19: autorización ficticia','PRUEBA HU19: publicación ficticia',responsable,true,'Responsable de prueba HU-19');

 INSERT INTO public."sesionActividad"(id,"actividadId","espacioId",inicio,fin,capacidad,estado,"registroAbierto","referenciaAutorizacion")
 VALUES(sesion_con_cupo,actividad_con_cupo,espacio_id,inicio_prueba,inicio_prueba+interval '1 hour',3,'programada',true,'PRUEBA HU19'),
 (sesion_llena,actividad_llena,espacio_id,inicio_prueba+interval '1 day',inicio_prueba+interval '1 day 1 hour',1,'programada',true,'PRUEBA HU19');

 -- Taller con cupo: dos solicitudes pendientes y tres lugares disponibles.
 INSERT INTO public.inscripcion(id,"sesionId","usuarioId",status) VALUES
 ('19000000-0000-4000-a400-000000000001',sesion_con_cupo,persona_uno,'pendiente'),
 ('19000000-0000-4000-a400-000000000002',sesion_con_cupo,persona_dos,'pendiente'),
 ('19000000-0000-4000-a400-000000000004',sesion_llena,persona_tres,'pendiente');

 -- Taller lleno: un lugar, una confirmación ficticia con actor e historial y una pendiente.
 INSERT INTO public.inscripcion(id,"sesionId","usuarioId",status,"decisionPor","decisionRazon","decididoA")
 VALUES(confirmada,sesion_llena,persona_uno,'confirmada',responsable,'Carga inicial ficticia HU-19; no es una confirmación mediante la API.',now());
 INSERT INTO public."historiaInscripcion"("inscripcionId","estadoPrevio","estadoNuevo","cambiadoPor",razon)
 VALUES(confirmada,'pendiente','confirmada',responsable,'Carga inicial ficticia HU-19; no es evidencia de CA-19.1.');
 RAISE NOTICE 'Datos HU-19 cargados para %. Hay dos talleres, dos sesiones y cuatro inscripciones.',correo_responsable;
END;
$$;
COMMIT;

-- Resumen de comprobación. La confirmación inicial es un fixture, no una prueba ejecutada.
SELECT a.titulo,s.id AS "sesionId",s.inicio,s.capacidad,
 count(i.id) FILTER (WHERE i.status='pendiente') AS pendientes,
 count(i.id) FILTER (WHERE i.status='confirmada') AS confirmados,
 s.capacidad-count(i.id) FILTER (WHERE i.status='confirmada') AS disponibles
FROM public.actividad a JOIN public."sesionActividad" s ON s."actividadId"=a.id
LEFT JOIN public.inscripcion i ON i."sesionId"=s.id
WHERE a.id IN ('19000000-0000-4000-a100-000000000001','19000000-0000-4000-a100-000000000002')
GROUP BY a.id,s.id ORDER BY a.titulo;
