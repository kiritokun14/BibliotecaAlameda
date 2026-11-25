# T-116 · Estadísticas de participación y atención

HU-22 / CU-22 (BDLAG-32). Tarea BDLAG-96 del Sprint 6. Titular Luis, apoyo Roberto y revisión de Aldahir.

## Qué cuenta el reporte

**Administración → Estadísticas → Actividades** permite elegir un periodo y consultar todas las actividades autorizadas o una actividad. Las fechas son inclusivas y corresponden a la hora de Tepic. El detalle muestra los totales, los días y las sesiones del periodo.

| Indicador | Origen y criterio |
|---|---|
| Solicitudes | Registros de `inscripcion`, en cualquier estado, para sesiones del periodo. |
| Confirmaciones | Registros de la misma cohorte cuyo estado vigente es `confirmada`. |
| Asistencias y ausencias | Marcas vigentes de `asistencia` en listas cerradas (`privado.cierreAsistencia`), de sesiones que no están canceladas. |
| Visitas generales | Totales físicos de `privado.visita_general_diaria`, capturados por fecha y con referencia al registro utilizado. Un cero capturado se distingue de un día sin captura. |
| Atenciones cerradas | `mensajeContacto` en estado `cerrado`, agrupado por el día de cierre en `actualizadoEn`. Incluye los canales que usan ese mismo registro de contacto. |
| Incidencias | Totales operativos de `privado.incidencias_sesion`, con referencia por sesión. El informe conserva la distinción entre cero incidencias reportadas y una sesión sin captura. |

El filtro de actividad conserva los conteos de sus sesiones. Las visitas físicas y atenciones generales aparecen en la vista global. Las referencias de captura deben ser identificadores de una bitácora o registro institucional.

## API, permisos y exportación

- `GET /administracion/estadisticas/participacion` recibe `desde` y `hasta` en formato ISO y, opcionalmente, `actividad_id`. El límite es 366 días inclusivos. La base valida el permiso `consultar_estadisticas` global o por actividad. El código del panel ofrece el enlace a la cuenta con permiso asignado.
- `PUT /administracion/estadisticas/visitas-generales/{fecha}` y `PUT /administracion/estadisticas/incidencias/{sesion_id}` reciben `total`, `referencia` y `version`. La primera captura usa `version: null`. Una edición utiliza la versión leída. La base comprueba también el permiso de gestión correspondiente.
- `GET /administracion/estadisticas/participacion.csv` aplica el mismo ámbito y exporta fechas, folios de actividad con formato institucional, categorías fijas y conteos. Las celdas vacías distinguen las capturas ausentes. Quedan fuera los datos de participantes, los títulos, las referencias y los identificadores internos.

## Revisión en el entorno de pruebas

1. Aplica [estadisticas_participacion.sql](Supabase/estadisticas_participacion.sql) después de las dependencias de [Supabase](Supabase/README.md).
2. Abre el informe con una cuenta autorizada y selecciona un periodo con sesiones que tengan solicitudes, confirmaciones y listas cerradas. Revisa que los números se muestren por separado.
3. Captura un día con total cero, deja otro sin captura y registra una incidencia por sesión. Comprueba que los totales y el detalle distingan ambos estados.
4. Descarga el CSV y comprueba las columnas de asistencia, visitas generales y atenciones. Repite con un permiso asignado a una sola actividad y verifica el alcance de la pantalla y del archivo.

La revisión de Aldahir y la validación en el entorno del equipo forman parte del cierre de la tarea.

## Evidencia local

| Verificación | Resultado |
|---|---|
| CA-22.1 · Solicitudes, confirmaciones y asistencia | La regresión SQL reprodujo 4 solicitudes, 2 confirmaciones, 1 presencia y 1 ausencia el mismo día. Las marcas de listas abiertas y sesiones canceladas quedaron fuera de la asistencia verificada. |
| CA-22.2 · Visitas generales y privacidad | La misma jornada tuvo 49 visitas generales. Se probó el reporte generado por PostgreSQL a través del modelo HTTP y la exportación. El CSV mantuvo separados los conteos y excluyó títulos, referencias e identificadores internos. |
| Alcance y capturas | La suite SQL verificó el acceso por actividad, el rechazo de acceso ajeno, el cero registrado, las fechas de Tepic y el conflicto por versión anterior. La revisión técnica detectó que podía quedar visible el informe anterior al cambiar permisos sin cambiar de cuenta. La vista ahora carga de nuevo al cambiar el alcance efectivo. |
| Recorrido en Chrome | Con cuentas y API de prueba, se seleccionó un rango, se descargó el CSV, se registró y editó un cero con su versión y se capturó una incidencia de sesión. Se comprobó que el filtro por actividad y la cuenta con alcance asignado dejan fuera los datos generales. |
| Suites | Backend con 321 pruebas aprobadas y 20 omitidas por requerir `HU19_TEST_DSN`. Frontend con 421 aprobadas y una omitida. Lint y compilación correctos. Pasaron las suites SQL de la HU-22 y de asistencia en una base desechable. |
