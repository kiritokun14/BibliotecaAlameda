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
| 8 | `contenidos_editor.sql` | Editor de contenidos: folio, borradores, envío a autorización y observaciones | T-054 |
| 9 | `contenidos_memoria.sql` | Memoria pública en el editor de contenidos | T-054 |
| 10 | `publicacion_contenidos.sql` | Revisión y publicación de contenidos por el Administrador | T-055 |
| 11 | `imagenes_contenidos.sql` | Imágenes privadas de los contenidos (Storage) | HU-11 |
| 12 | `contacto_publico.sql` | Mensajes de contacto con folio y acuse | T-053 |
| 13 | `bibliocomunidad.sql` | Solicitudes de Bibliocomunidad e intentos de contacto | T-057 |
| 14 | `fuentes_rag.sql` | Fuentes aprobadas del asistente | T-049 |
| 15 | `perfil_propio.sql` | Edición del perfil propio | T-031 |
| 16 | `solicitudes_espacio.sql` | Solicitudes de visita o uso de espacio: folio, envío, consulta y cancelación | T-076 |
| 17 | `espacios_personal.sql` | Atención de solicitudes de espacio: aprobar, proponer otro espacio o fecha, rechazar y cancelar | T-076 |
| 18 | `resolucion_institucional_propuestas.sql` | Acuerdo institucional y trazabilidad de las resoluciones de propuestas | T-075 |
| 19 | `correcciones_integracion_espacios.sql` | Permisos, versiones y horario de Tepic para solicitudes de espacios | T-076 |
| 20 | `publicacion_propuestas.sql` | Vincular una propuesta aprobada con su actividad y publicarla sin duplicados | T-075 / T-055 |
| 21 | `evidencias_actividades.sql` | Evidencias privadas de actividades: bucket privado, folio, nivel de acceso, retiro y registro de consultas | HU-21 / BDLAG-95 |
| 22 | `cancelacion_credencial_propia.sql` | La persona titular cancela su propia solicitud de credencial (operación `cancelar`) | T-072 |
| 23 | `datos_prueba.sql` | **Opcional.** Datos ficticios de prueba | T-026 |
| 24 | `espacios_mapa.sql` | Los seis espacios del mapa que se pueden pedir para un evento (Sala general, Sala Braille y de usos múltiples, Vestíbulo, Coliseo, Área infantil y Mesanim); la «Sala de lectura» pasa a ser la Sala general | T-076 |
| 25 | `evidencias_solo_realizadas.sql` | Evidencias privadas solo de actividades que ya se realizaron (ni pendientes, ni en curso, ni canceladas) | HU-21 |
| 26 | `asistencia_actividades.sql` | Presencia real por sesión y correcciones con historial. Requiere `agenda_actividades.sql` e `inscripciones_responsables.sql` | HU-20 / T-099 |
| 27 | `cancelacion_inscripciones_cambio_actividad.sql` | Cancela inscripciones activas de sesiones canceladas por acuerdo institucional y registra su historial. Requiere `cambios_actividad.sql` | T-104 |
| 28 | `progreso_recompensas.sql` | Progreso por participación (una por sesión con asistencia «presente» y credencial vigente ese día), niveles Inicial / Lector activo / Lector constante, ajustes con motivo, y recompensas: asignación con autorización de la Dirección, entrega y cancelación. Requiere `asistencia_actividades.sql` | HU-28 / HU-29 |

Los pasos 3 a 5 contienen modelos provisionales que el paso 6 sustituye; deben ejecutarse igual,
porque el 6 parte de ellos.

## Datos de prueba

`datos_prueba.sql` crea 7 cuentas `@biblioteca.test` (una por rol o capacidad), actividades,
sesiones, inscripciones, contenidos, foro, mensajes y una recompensa. Todos usan identificadores
fijos `00000000-0000-4000-…` para poder encontrarlos y borrarlos.

- La contraseña escrita en el archivo es solo para bases locales. **El repositorio es público**:
  antes de cargarlos en una base en internet, cambia la contraseña en tu copia y no la subas.
- CECANbd ya tiene estos datos, con otra contraseña que el equipo comparte por un canal privado.
- Para quitarlos en una copia de pruebas: `limpiar_datos_prueba.sql`. Selecciona UUID explícitos
  y los siete pares exactos UUID/correo de las semillas. No selecciona otras cuentas
  `@biblioteca.test`, como la de integración. No ejecutarlo sobre CECANbd.
  Deben revisarse antes las dependencias y los borrados en cascada del esquema.
- `datos_prueba.sql` va antes de `espacios_mapa.sql` (paso 24): sus tres espacios provisionales son la base que ese script
  completa. En una copia con datos de prueba, `limpiar_datos_prueba.sql` también borra esos tres espacios.

## Pruebas

`pruebas_registro.sql` y `pruebas_administracion.sql` usan `ROLLBACK`: comprueban el registro y la
administración de cuentas sin dejar registros. Se pueden ejecutar después del paso 7.
`pruebas_contenidos_editor.sql` (también con `ROLLBACK`) comprueba el editor de contenidos después del paso 9.
`pruebas_solicitudes_espacio.sql` (también con `ROLLBACK`) comprueba las solicitudes de espacio después del paso 16.
`pruebas_espacios_personal.sql` (también con `ROLLBACK`) comprueba la atención del personal después del paso 17.

`pruebas_publicacion_propuestas.sql` comprueba publicación, permisos, cupo, vínculos, reintentos y conflictos de horario con `ROLLBACK`, después del paso 20.
`pruebas_evidencias_actividades.sql` (también con `ROLLBACK`) comprueba permisos por actividad, acceso de Coordinación, registro de consultas, retiro y que las listas firmadas nunca se publiquen, después del paso 21.
`pruebas_cancelacion_credencial_propia.sql` (también con `ROLLBACK`) comprueba que solo la persona titular cancela su solicitud de credencial, después del paso 22.
`pruebas_evidencias_solo_realizadas.sql` (también con `ROLLBACK`) comprueba que solo se suben evidencias de sesiones ya realizadas, después del paso 25.

En CECANbd ya se aplicaron los pasos 18 a 20; no hace falta repetirlos para ejecutar el proyecto contra esa base compartida.

## Cambios nuevos a la base

HU-20 / T-099: `asistencia_actividades.sql` registra asistencia por sesión y sus correcciones con historial; requiere agenda e inscripciones. `pruebas_asistencia_actividades.sql` verifica permisos, sesiones, cierre y correcciones con `ROLLBACK` en una copia de pruebas. Revisa su aplicación antes de utilizar esta función en la base compartida.

HU-28 / HU-29: `progreso_recompensas.sql` calcula el progreso desde la asistencia y registra asignación, entrega y cancelación de recompensas. `pruebas_progreso_recompensas.sql` (con `ROLLBACK`) comprueba niveles, sesiones sin credencial, correcciones, ajustes, existencias, doble asignación y permisos, después del paso 28.

T-094, complemento de solicitudes: `t094_correcciones_solicitudes.sql` agrega versiones completas, motivo obligatorio, corrección propia y control de concurrencia para propuestas y espacios. Aplicar después de las migraciones vigentes de propuestas y espacios y revisar con el equipo. `pruebas_t094_solicitudes.sql` comprueba los cuatro criterios con ROLLBACK. Ver `../T-094-INFORME.md`; la aplicación en CECANbd y la revisión de Aldahir siguen pendientes.

HU-17 / T-094: `cambios_actividad.sql` agrega solicitudes por sesiones, registro del acuerdo institucional, aplicación transaccional, historial y avisos del portal con reintento. Se prepara para revisión; no se ha aplicado a CECANbd desde esta implementación. Requiere las migraciones vigentes de agenda, espacios y propuestas indicadas en `../HU-17.md`. La suite `pruebas_cambios_actividad.sql` se ejecuta después del paso 25 y termina con `ROLLBACK`.

Agrega un script nuevo con nombre descriptivo, anótalo al final de la tabla de arriba y aplícalo en
CECANbd solo después de revisarlo con el equipo.
