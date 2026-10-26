-- Borra SOLO los datos cargados por supabase/seed.sql.
-- Uso: pegar en el SQL Editor de Supabase y ejecutar (todo corre en una sola transacción).
-- Los datos de prueba se identifican por sus identificadores fijos 00000000-0000-4000-…
-- y por los correos @biblioteca.test; cualquier otro registro queda intacto.
-- Si alguien creó registros nuevos que apuntan a datos de prueba (por ejemplo, una
-- inscripción real en una actividad de prueba), el script se detiene sin borrar nada.

BEGIN;

CREATE TEMP TABLE usuarios_prueba ON COMMIT DROP AS
  SELECT id FROM auth.users WHERE email LIKE '%@biblioteca.test';

DELETE FROM public.inscripcion
  WHERE id::text LIKE '00000000-0000-4000-%' OR "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public."solicitudEspacio"
  WHERE id::text LIKE '00000000-0000-4000-%' OR "solicitadoPor" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public."mensajeContacto"
  WHERE id::text LIKE '00000000-0000-4000-%' OR "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public."temaForo"
  WHERE "temaId"::text LIKE '00000000-0000-4000-%' OR "creadoPor" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public."Contenido"
  WHERE id::text LIKE '00000000-0000-4000-%' OR "creadoPor" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public.recompensa
  WHERE id::text LIKE '00000000-0000-4000-%' OR "creadoPor" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public."sesionActividad" WHERE id::text LIKE '00000000-0000-4000-%';
DELETE FROM public."permisoCuenta" WHERE "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public.actividad WHERE id::text LIKE '00000000-0000-4000-%';
DELETE FROM public.espacio WHERE id::text LIKE '00000000-0000-4000-%';
DELETE FROM public."credencialBibliotecaria" WHERE "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public."rolUsuario" WHERE "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public."contactoTutor" WHERE "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public.perfil WHERE id IN (SELECT id FROM usuarios_prueba);
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM usuarios_prueba);
DELETE FROM auth.users WHERE id IN (SELECT id FROM usuarios_prueba);

COMMIT;
