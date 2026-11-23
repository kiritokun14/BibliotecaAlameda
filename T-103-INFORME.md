# T-103 · Pruebas de inscripciones, cupos, asistencia y avisos

La ejecución local del 22 de noviembre de 2026 terminó con **296 pruebas de backend y PostgreSQL, 377 de frontend y 8 suites SQL aprobadas**. La prueba de concurrencia confirmó que solo una de dos solicitudes simultáneas obtuvo el último lugar. Se corrigió un defecto de aislamiento de las preferencias en el navegador.

Sprint 5, «Participación y avisos». Titular Luis, apoyo Roberto y revisora Valeria. Las predecesoras oficiales son T-096 y T-099. [Tarjeta BDLAG-174](https://ittepic-team-gps.atlassian.net/browse/BDLAG-174) · [Lista oficial, tarea 103](https://docs.google.com/spreadsheets/d/1usYlWgiBeOwlDf1NIwQe5tK2_5Gt2qr7ATMrRmLq4oU/edit#gid=1241699155&range=A105:K105)

## Cobertura y resultado

| Reglas | Resultado observado | Evidencia reproducible |
|---|---|---|
| Cambios y cancelaciones de actividades | Las sesiones y espacios se actualizan al aplicar la resolución. Se rechazan sesiones repetidas, versiones obsoletas, horarios en conflicto y operaciones fuera del ámbito. La cancelación cierra el registro y el reintento conserva un aviso por destinatario. | `Back/tests/test_cambios_actividad.py`, `Supabase/pruebas_cambios_actividad.sql`, `Supabase/pruebas_cambios_avisos_actividades.sql` |
| Inscripción propia | Solicitar dos veces conserva una sola inscripción. Un cupo lleno, un registro cerrado o un cambio con versión obsoleta impiden la operación correspondiente. La cancelación propia de una inscripción confirmada libera su lugar. | `Supabase/pruebas_inscripcion_propia.sql` |
| Inscripciones del personal y cupos | Se verificaron la confirmación, el rechazo, la cancelación y su historial, la paginación, los conteos y los permisos globales o por actividad. Ante dos confirmaciones simultáneas con un lugar disponible, PostgreSQL guardó una confirmación y rechazó la otra con SQLSTATE `23514`. El conteo final de confirmadas fue uno. | `Back/tests/test_inscripciones.py`, `Back/tests/test_inscripciones_postgres.py`, `Supabase/pruebas_inscripciones_responsables.sql` |
| Asistencia por sesión | Una inscripción confirmada comienza sin marca. Se rechazaron marcas duplicadas en un lote y correcciones incompatibles con la versión vigente. Repetir una marca o la última corrección exacta conservó una sola fila o entrada de historial, según la operación. | `Back/tests/test_asistencia.py`, `Supabase/pruebas_asistencia_actividades.sql` |
| Avisos y preferencias | Se verificaron el canal, los tipos de aviso, el aislamiento por cuenta, el control de versiones y las reglas de preparación y registro manual por WhatsApp. La prueba del servicio de perfil simuló un cambio de cuenta dentro de la vigencia de la consulta en memoria. | `Back/tests/test_avisos.py`, `Back/tests/test_perfil.py`, `Front/tests/perfil.test.ts`, `Supabase/pruebas_preferencias_avisos.sql`, `Supabase/pruebas_avisos_whatsapp.sql` |
| Agenda y publicación | Los cambios se reflejan en la proyección pública. La agenda filtra publicaciones y conserva el control de acceso a borradores. | `Back/tests/test_actividades.py`, `Supabase/pruebas_agenda_actividades.sql` |

## Defecto corregido y regresión

Al consultar las preferencias inmediatamente después de cambiar de cuenta, el frontend reutilizaba durante cinco segundos la consulta de la sesión anterior. La regresión devolvió el canal y la versión de esa primera cuenta al ejecutar el caso antes de la corrección. El servicio ahora valida la sesión antes de consultar la memoria y comparte la petición únicamente con la misma sesión. La regresión pasó para dos cuentas consecutivas y para una consulta después de cerrar sesión. [Servicio de perfil](Front/src/servicios/perfil.ts) · [Prueba de regresión](Front/tests/perfil.test.ts)

El defecto de coherencia entre la cancelación institucional y las inscripciones, junto con su regresión SQL, se documenta en el informe de integración. [Informe T-104](T-104-INFORME.md)

## Ejecución y revisión

- La suite de Python se ejecutó con `python -m unittest discover -s Back/tests`. El total de 296 incluye 20 casos sobre PostgreSQL 16.16 habilitados con `psycopg` y `HU19_TEST_DSN` en una base desechable terminada en `_hu19_test`. Preparar esa copia con las migraciones del informe T-104 y aplicar `Supabase/datos_prueba.sql` para esos 20 casos.
- Las ocho suites SQL de la tabla se ejecutaron en la misma base. Sus datos temporales se revirtieron con `ROLLBACK`.
- En `Front`, `npm test -- --reporter=dot` dio 377 aprobadas y una omitida. La omitida es la medición manual de latencia, que requiere `BIBLIOTECA_TOKEN_MEDICION`. `npm run lint` y `npm run build` finalizaron correctamente.
- **Valeria · revisión pendiente.** Revisar la cobertura y la regresión de preferencias. La evidencia corresponde al repositorio y a una base local con datos ficticios.
