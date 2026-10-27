# Receta de la base de datos (Supabase)

Estos scripts reconstruyen desde una base vacía la misma estructura que tiene hoy CECANbd
(34 tablas, 26 funciones, 37 políticas RLS y sus triggers). Se comprobó el 27 de octubre de 2026
en un PostgreSQL 16 vacío: la estructura resultante es idéntica a la de CECANbd.

> **No vuelvas a ejecutarlos sobre CECANbd.** Ahí ya están aplicados. Sirven para crear una base
> nueva (por ejemplo, la que se entregue a la biblioteca) o una copia local de pruebas.

## Orden

Ejecuta cada archivo completo, en este orden, desde el SQL Editor de un proyecto de Supabase nuevo:

| # | Archivo | Qué hace | Ticket |
|---|---|---|---|
| 1 | `Main.sql` | Estructura base: tablas, reglas, triggers y políticas de lectura | T-026 |
| 2 | `registro_usuarios.sql` | Autorregistro atómico: Auth + perfil + tutor | T-027 |
| 3 | `administracion_cuentas.sql` | Roles, capacidades, vigencias y bitácora | T-032 |
| 4 | `endurecimiento_administracion.sql` | Aísla la operación administrativa | T-032 |
| 5 | `corregir_roles_y_capacidades.sql` | Corrección de roles y capacidades | T-032 |
| 6 | `alinear_actores_documentados.sql` | Catálogo vigente de actores (3.1b y Figma) | T-032 |
| 7 | `alta_asistida_cuentas.sql` | Alta de cuentas asistida por el personal | T-033 |
| 8 | `datos_prueba.sql` | **Opcional.** Datos ficticios de prueba | T-026 |

Los pasos 3 a 5 contienen modelos provisionales que el paso 6 sustituye; deben ejecutarse igual,
porque el 6 parte de ellos.

## Datos de prueba

`datos_prueba.sql` crea 7 cuentas `@biblioteca.test` (una por rol o capacidad), actividades,
sesiones, inscripciones, contenidos, foro, mensajes y una recompensa. Todos usan identificadores
fijos `00000000-0000-4000-…` para poder encontrarlos y borrarlos.

- La contraseña escrita en el archivo es solo para bases locales. **El repositorio es público**:
  antes de cargarlos en una base en internet, cambia la contraseña en tu copia y no la subas.
- CECANbd ya tiene estos datos, con otra contraseña que el equipo comparte por un canal privado.
- Para quitarlos: `limpiar_datos_prueba.sql`. Solo borra los datos de prueba y se detiene sin
  borrar nada si algún registro real depende de ellos.

## Pruebas

`pruebas_registro.sql` y `pruebas_administracion.sql` usan `ROLLBACK`: comprueban el registro y la
administración de cuentas sin dejar registros. Se pueden ejecutar después del paso 7.

## Cambios nuevos a la base

Agrega un script nuevo con nombre descriptivo, anótalo al final de la tabla de arriba y aplícalo en
CECANbd solo después de revisarlo con el equipo.
