-- Borra SOLO los datos cargados por Supabase/datos_prueba.sql.
-- Uso: pegar en el SQL Editor de Supabase y ejecutar (todo corre en una sola transacción).
-- Los datos de prueba se identifican por sus identificadores fijos 00000000-0000-4000-…
-- y por sus pares exactos de UUID/correo: no se seleccionan otras cuentas @biblioteca.test.
-- Los registros de negocio se seleccionan por UUID explícito, no por su propietario.
-- No ejecutar sobre CECANbd; revisar dependencias y usar una copia de pruebas.
-- Si alguien creó registros nuevos que apuntan a datos de prueba (por ejemplo, una
-- inscripción real en una actividad de prueba), el script se detiene sin borrar nada.

BEGIN;

CREATE TEMP TABLE ids_semilla (id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO ids_semilla VALUES
 ('00000000-0000-4000-a000-000000000001'::uuid),
 ('00000000-0000-4000-a000-000000000002'::uuid),
 ('00000000-0000-4000-a000-000000000003'::uuid),
 ('00000000-0000-4000-a000-000000000004'::uuid),
 ('00000000-0000-4000-a000-000000000005'::uuid),
 ('00000000-0000-4000-a000-000000000006'::uuid),
 ('00000000-0000-4000-a000-000000000007'::uuid),
 ('00000000-0000-4000-a100-000000000001'::uuid),
 ('00000000-0000-4000-a100-000000000002'::uuid),
 ('00000000-0000-4000-a100-000000000003'::uuid),
 ('00000000-0000-4000-a100-000000000004'::uuid),
 ('00000000-0000-4000-a100-000000000005'::uuid),
 ('00000000-0000-4000-a200-000000000001'::uuid),
 ('00000000-0000-4000-a200-000000000002'::uuid),
 ('00000000-0000-4000-a300-000000000001'::uuid),
 ('00000000-0000-4000-a300-000000000002'::uuid),
 ('00000000-0000-4000-a400-000000000001'::uuid),
 ('00000000-0000-4000-b000-000000000001'::uuid),
 ('00000000-0000-4000-b000-000000000002'::uuid),
 ('00000000-0000-4000-b000-000000000003'::uuid),
 ('00000000-0000-4000-c000-000000000001'::uuid),
 ('00000000-0000-4000-c000-000000000002'::uuid),
 ('00000000-0000-4000-c000-000000000003'::uuid),
 ('00000000-0000-4000-d000-000000000001'::uuid),
 ('00000000-0000-4000-d000-000000000002'::uuid),
 ('00000000-0000-4000-d000-000000000003'::uuid),
 ('00000000-0000-4000-e000-000000000001'::uuid),
 ('00000000-0000-4000-e000-000000000002'::uuid),
 ('00000000-0000-4000-f000-000000000001'::uuid);

CREATE TEMP TABLE usuarios_prueba ON COMMIT DROP AS
 SELECT u.id FROM auth.users u JOIN (VALUES
 ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@biblioteca.test'),
 ('00000000-0000-4000-a000-000000000002'::uuid, 'editor@biblioteca.test'),
 ('00000000-0000-4000-a000-000000000003'::uuid, 'responsable@biblioteca.test'),
 ('00000000-0000-4000-a000-000000000004'::uuid, 'personal@biblioteca.test'),
 ('00000000-0000-4000-a000-000000000005'::uuid, 'lector@biblioteca.test'),
 ('00000000-0000-4000-a000-000000000007'::uuid, 'prestamos@biblioteca.test'),
 ('00000000-0000-4000-a000-000000000006'::uuid, 'menor@biblioteca.test')
 ) AS semilla(id,correo) ON u.id=semilla.id AND u.email=semilla.correo;

DELETE FROM public.inscripcion
  WHERE id IN (SELECT id FROM ids_semilla);
DELETE FROM public."solicitudEspacio"
  WHERE id IN (SELECT id FROM ids_semilla);
DELETE FROM public."mensajeContacto"
  WHERE id IN (SELECT id FROM ids_semilla);
DELETE FROM public."temaForo"
  WHERE "temaId" IN (SELECT id FROM ids_semilla);
DELETE FROM public."Contenido"
  WHERE id IN (SELECT id FROM ids_semilla);
DELETE FROM public.recompensa
  WHERE id IN (SELECT id FROM ids_semilla);
DELETE FROM public."sesionActividad" WHERE id IN (SELECT id FROM ids_semilla);
DELETE FROM public."permisoCuenta" WHERE "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public.actividad WHERE id IN (SELECT id FROM ids_semilla);
DELETE FROM public.espacio WHERE id IN (SELECT id FROM ids_semilla);
DELETE FROM public."credencialBibliotecaria" WHERE "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public."rolUsuario" WHERE "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public."contactoTutor" WHERE "usuarioId" IN (SELECT id FROM usuarios_prueba);
DELETE FROM public.perfil WHERE id IN (SELECT id FROM usuarios_prueba);
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM usuarios_prueba);
DELETE FROM auth.users WHERE id IN (SELECT id FROM usuarios_prueba);

COMMIT;
