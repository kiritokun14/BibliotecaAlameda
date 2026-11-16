-- Borra exclusivamente la semilla de datos_prueba_inscripciones.sql.
-- Conserva responsable@biblioteca.test, sus roles/permisos y las funciones de HU-19.
-- Ejecutar completo en Supabase > SQL Editor. No se ejecuta automáticamente.
-- Si hay nuevas dependencias o identificadores modificados, falla y revierte todo.
-- Si falla dentro de una sesión SQL abierta, ejecuta ROLLBACK antes de continuar.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('hu19.datos_prueba_inscripciones',0));

CREATE TEMP TABLE hu19_usuarios(id uuid PRIMARY KEY, correo text) ON COMMIT DROP;
INSERT INTO hu19_usuarios VALUES
 ('19000000-0000-4000-a300-000000000001','participante1.hu19@example.invalid'),
 ('19000000-0000-4000-a300-000000000002','participante2.hu19@example.invalid'),
 ('19000000-0000-4000-a300-000000000003','participante3.hu19@example.invalid');
CREATE TEMP TABLE hu19_actividades(id uuid PRIMARY KEY, slug text) ON COMMIT DROP;
INSERT INTO hu19_actividades VALUES
 ('19000000-0000-4000-a100-000000000001','prueba-hu19-con-cupo'),
 ('19000000-0000-4000-a100-000000000002','prueba-hu19-cupo-lleno');
CREATE TEMP TABLE hu19_sesiones(id uuid PRIMARY KEY, actividad uuid) ON COMMIT DROP;
INSERT INTO hu19_sesiones VALUES
 ('19000000-0000-4000-a200-000000000001','19000000-0000-4000-a100-000000000001'),
 ('19000000-0000-4000-a200-000000000002','19000000-0000-4000-a100-000000000002');
CREATE TEMP TABLE hu19_inscripciones(id uuid PRIMARY KEY, sesion uuid, usuario uuid) ON COMMIT DROP;
INSERT INTO hu19_inscripciones VALUES
 ('19000000-0000-4000-a400-000000000001','19000000-0000-4000-a200-000000000001','19000000-0000-4000-a300-000000000001'),
 ('19000000-0000-4000-a400-000000000002','19000000-0000-4000-a200-000000000001','19000000-0000-4000-a300-000000000002'),
 ('19000000-0000-4000-a400-000000000003','19000000-0000-4000-a200-000000000002','19000000-0000-4000-a300-000000000001'),
 ('19000000-0000-4000-a400-000000000004','19000000-0000-4000-a200-000000000002','19000000-0000-4000-a300-000000000003');

DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM auth.users u JOIN hu19_usuarios p ON p.id=u.id WHERE u.email IS DISTINCT FROM p.correo)
 OR EXISTS(SELECT 1 FROM public.actividad a JOIN hu19_actividades p ON p.id=a.id WHERE a.slug IS DISTINCT FROM p.slug)
 OR EXISTS(SELECT 1 FROM public.espacio WHERE id='19000000-0000-4000-a000-000000000001' AND slug<>'prueba-hu19-sala')
 OR EXISTS(SELECT 1 FROM public."sesionActividad" s JOIN hu19_sesiones p ON p.id=s.id
  WHERE s."actividadId" IS DISTINCT FROM p.actividad OR s."espacioId"<>'19000000-0000-4000-a000-000000000001')
 OR EXISTS(SELECT 1 FROM public.inscripcion i JOIN hu19_inscripciones p ON p.id=i.id
  WHERE i."sesionId" IS DISTINCT FROM p.sesion OR i."usuarioId" IS DISTINCT FROM p.usuario) THEN
  RAISE EXCEPTION 'Un identificador ya no coincide con la semilla HU-19. No se borra nada.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.inscripcion WHERE "sesionId" IN (SELECT id FROM hu19_sesiones)
  AND id NOT IN (SELECT id FROM hu19_inscripciones))
 OR EXISTS(SELECT 1 FROM auth.sessions WHERE user_id IN (SELECT id FROM hu19_usuarios))
 OR EXISTS(SELECT 1 FROM auth.identities WHERE user_id IN (SELECT id FROM hu19_usuarios))
 OR EXISTS(SELECT 1 FROM public."rolUsuario" WHERE "usuarioId" IN (SELECT id FROM hu19_usuarios) AND "rolCodigo"<>'usuario')
 OR EXISTS(SELECT 1 FROM public."permisoCuenta" WHERE "usuarioId" IN (SELECT id FROM hu19_usuarios)) THEN
  RAISE EXCEPTION 'Hay nuevas inscripciones o las cuentas ficticias adquirieron acceso. Revisa las dependencias antes de borrar.';
 END IF;
END;
$$;

-- Solo historiales de las cuatro inscripciones explícitas, incluidas las decisiones de prueba.
DELETE FROM public."historiaInscripcion" WHERE "inscripcionId" IN (SELECT id FROM hu19_inscripciones);
DELETE FROM public.inscripcion WHERE id IN (SELECT id FROM hu19_inscripciones);
DELETE FROM public."sesionActividad" WHERE id IN (SELECT id FROM hu19_sesiones);
-- Tablas privadas de la agenda: si se editaron los talleres durante las pruebas.
DELETE FROM privado."historialActividad" WHERE "actividadId" IN (SELECT id FROM hu19_actividades);
DELETE FROM privado."estadoAgenda" WHERE "actividadId" IN (SELECT id FROM hu19_actividades);
DELETE FROM public.actividad WHERE id IN (SELECT id FROM hu19_actividades);
DELETE FROM public.espacio WHERE id='19000000-0000-4000-a000-000000000001' AND slug='prueba-hu19-sala';

-- Solo el rol básico generado por el trigger para los tres participantes ficticios.
DELETE FROM public."rolUsuario" WHERE "usuarioId" IN (SELECT id FROM hu19_usuarios) AND "rolCodigo"='usuario';
DELETE FROM public.perfil WHERE id IN (SELECT id FROM hu19_usuarios);
DELETE FROM auth.users u USING hu19_usuarios p WHERE u.id=p.id AND u.email=p.correo;
COMMIT;

SELECT 'Eliminados únicamente los datos de prueba HU-19. La cuenta responsable y la implementación se conservan.' AS resultado;
