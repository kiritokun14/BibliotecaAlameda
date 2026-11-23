# T-104 · Integración de inscripciones, asistencia y notificaciones

El 22 de noviembre de 2026 se verificó el recorrido de integración de Sprint 5 en una base desechable. Las solicitudes de inscripción, el cupo, la asistencia y los avisos conservaron la identidad de cada cuenta y el estado de su sesión. Se corrigió el defecto que dejaba inscripciones activas tras una cancelación institucional de HU-17.

Titular Luis, apoyo Roberto y revisora Valeria. Predecesoras oficiales T-096 y T-099. [Tarjeta BDLAG-175](https://ittepic-team-gps.atlassian.net/browse/BDLAG-175) · [Lista oficial, tarea 104](https://docs.google.com/spreadsheets/d/1usYlWgiBeOwlDf1NIwQe5tK2_5Gt2qr7ATMrRmLq4oU/edit#gid=1241699155&range=A106:K106)

## Recorrido integrado

Se usaron las rutas de FastAPI con `TestClient`, PostgREST 16.4 por HTTP local y PostgreSQL 16.16. Se simuló Supabase Auth y se usaron sesiones y tokens ficticios para una cuenta responsable, una participante y una cuenta ajena. El taller tuvo tres sesiones y un cupo por sesión. [Distribución de PostgREST utilizada](https://github.com/PostgREST/postgrest/releases/tag/v16.4)

| Operación | Resultado observado |
|---|---|
| Abrir la actividad publicada e inscribirse | La agenda mostró las tres sesiones. Una solicitud anónima devolvió `401`. Repetir la solicitud con sesión conservó el mismo ID. El personal vio el mismo registro con los campos de la lista autorizada. |
| Confirmar y comprobar disponibilidad | La confirmación consumió el último lugar de la sesión. Otra cuenta recibió `409` al solicitar ese cupo y `403` al consultar los participantes. La carrera de dos confirmaciones se verificó aparte con dos conexiones PostgreSQL. |
| Registrar y corregir asistencia | Tras ajustar la fecha de una sesión ficticia para simular el paso del tiempo, la inscripción confirmada apareció sin marca. El registro no se duplicó, el cierre persistió y una corrección con motivo cambió el total. Un reintento exacto conservó una entrada de historial y una decisión distinta con la versión anterior devolvió `409`. |
| Aplicar el cambio directo de T-096 | Reprogramar conservó la inscripción. Cancelar esa sesión cerró la inscripción e impidió registrar asistencia. Cada operación dejó un aviso a la persona afectada. La cuenta ajena no recibió esos avisos. Un reintento con versión anterior devolvió `409`. |
| Aplicar la cancelación autorizada de HU-17 | Autorizar conservó la inscripción hasta la aplicación. Aplicar canceló la inscripción afectada, registró un solo cambio en su historial y conservó los avisos al responsable y a la participante. El reintento devolvió el mismo resultado. Mis eventos mostró las dos inscripciones de sesiones canceladas con el estado correcto, y la asistencia de la tercera sesión conservó su corrección. |
| Guardar preferencias y leer un aviso | Cada cuenta conservó sus preferencias. Una actualización con versión anterior devolvió `409`. La participante recibió el aviso transaccional a pesar de desactivar la difusión de actividades. Marcar como leído persistió en la cuenta destinataria y el intento de una cuenta ajena devolvió `404`. |

## Defecto corregido y regresión

La aplicación de HU-17 cancelaba la sesión pero dejaba pendientes o confirmadas sus inscripciones. La regresión falló antes de la corrección. La migración cancela esas inscripciones en la misma transacción que aplica la decisión, después de identificar a quienes deben recibir aviso. Registra el estado anterior, la persona responsable y la fecha. La regresión pasó incluso con un fallo simulado al guardar avisos y reintento posterior.

También pasó la recuperación de una inscripción histórica sembrada para la prueba. Aplicar la migración dos veces conservó una sola entrada de historial con el responsable y la fecha original de aplicación. [Migración](Supabase/cancelacion_inscripciones_cambio_actividad.sql) · [Regresión SQL](Supabase/pruebas_cambios_actividad.sql)

Después de aplicar la migración en Supabase, Luis ejecutó la regresión de HU-17 en el SQL Editor. La captura muestra `Success. No rows returned`. El script finalizó con `ROLLBACK`, que revierte sus datos de prueba. La evidencia acredita el resultado en la base utilizada y queda pendiente confirmar el nombre del proyecto.

## Reproducción y revisión

1. Preparar una copia desechable con la receta de Supabase y las migraciones vigentes de agenda, espacios y propuestas. Para este recorrido, aplicar `agenda_actividades.sql`, `inscripciones_responsables.sql`, `inscripcion_propia.sql`, `asistencia_actividades.sql`, `cambios_actividad.sql`, `cambios_avisos_actividades.sql`, `preferencias_avisos.sql`, `avisos_whatsapp.sql` y finalmente `cancelacion_inscripciones_cambio_actividad.sql`, respetando las dependencias de cada archivo. [Receta Supabase](Supabase/README.md) · [Dependencias de HU-17](HU-17.md)
2. Ejecutar las ocho suites SQL del informe T-103. Para la prueba de regresión del defecto ejecutar `Supabase/pruebas_cambios_actividad.sql` después de la migración nueva. [Resultados T-103](T-103-INFORME.md)
3. Para repetir el recorrido HTTP, usar una actividad publicada con tres sesiones y las cuentas de prueba. Solicitar desde `/sesiones/{id}/mi-inscripcion`, confirmar desde `/inscripciones/{id}/confirmar` y registrar y corregir en `/sesiones/{id}/asistencia`. Aplicar los cambios con las rutas de gestión de la actividad y de HU-17. Volver a consultar `/mis-inscripciones`, `/perfil/preferencias-avisos`, `/notificaciones/actividades` y `/actividades/cambios/avisos` desde cada cuenta.

**Valeria · revisión pendiente.** Revisar la migración y los resultados de su regresión en Supabase. El recorrido integrado fue por HTTP local. La interfaz se verificó mediante Vitest, lint y compilación.
