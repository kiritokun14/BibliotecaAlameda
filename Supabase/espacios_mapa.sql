-- Espacios del mapa de la biblioteca (PARA_BACKEND.md, punto 7; levantamiento de Aldahir, 20 nov 2026).
-- Registra en public.espacio los seis espacios que el mapa deja pedir para un evento, con el mismo `slug`
-- que usa el frontend (Front/src/pages/publico/espacios/datos.ts). Así GET /espacios/areas los devuelve
-- y la página ya no dice «Este espacio todavía no se puede pedir en línea».
--
-- «Sala de lectura» (sala-lectura) no está en el mapa: es la Sala general. Si existe y aún no hay
-- sala-general, se convierte en ella (mismo registro), para no perder las sesiones ni las solicitudes que ya la usan.
-- Las capacidades son aproximadas (según el tamaño de cada área); la biblioteca puede ajustarlas.
-- Se puede ejecutar más de una vez. Si cargas datos_prueba.sql, hazlo ANTES de este script.
BEGIN;

UPDATE public.espacio SET slug = 'sala-general'
 WHERE slug = 'sala-lectura'
   AND NOT EXISTS (SELECT 1 FROM public.espacio WHERE slug = 'sala-general');

INSERT INTO public.espacio (slug, nombre, capacidad, descripcion, activo) VALUES
 ('sala-general', 'Sala general', 120,
  'Presentaciones de libro, lecturas, conferencias y eventos amplios. Se comparte con las personas usuarias en horario de servicio.', true),
 ('sala-usos-multiples', 'Sala Braille y de usos múltiples', 40,
  'Talleres, conferencias, presentaciones y actividades inclusivas (unas 24 personas con mesas).', true),
 ('vestibulo', 'Vestíbulo', 35,
  'Inauguraciones, exposiciones temporales y recepción de invitados. Espacio exterior techado.', true),
 ('coliseo-bibliografico', 'Coliseo bibliográfico', 25,
  'Círculos de lectura, charlas y presentaciones en formato íntimo.', true),
 ('area-infantil', 'Área infantil', 30,
  'Solo actividades lúdicas: lectura de cuentos, visitas de preescolar y talleres infantiles.', true),
 ('mesanim', 'Mesanim (planta alta)', 50,
  'Eventos pequeños. Piso de duela, sin alimentos ni bebidas, acceso solo por escalera y sujeto a aprobación de la Dirección.', true)
ON CONFLICT (slug) DO UPDATE
 SET nombre = EXCLUDED.nombre, capacidad = EXCLUDED.capacidad, descripcion = EXCLUDED.descripcion, activo = true;

-- Comprobación: los seis quedan activos.
DO $$
BEGIN
 IF (SELECT count(*) FROM public.espacio WHERE activo AND slug IN
     ('sala-general','sala-usos-multiples','vestibulo','coliseo-bibliografico','area-infantil','mesanim')) <> 6 THEN
  RAISE EXCEPTION 'No quedaron registrados los seis espacios del mapa.';
 END IF;
END $$;

COMMIT;
