# Pendientes de backend del panel de administración

> **Resumen para el equipo de backend (y sus agentes): `PARA_BACKEND.md` en la raíz del repositorio.** Junta lo del portal (Mis mensajes, reacciones) y apunta a esta tabla.

El **diseño del panel está terminado**: todas las pantallas usan la misma estructura (ver `docs/guia-diseno.md`).
Las marcadas como «Ejemplo» en la tabla todavía usan datos locales (ya no se anuncia en pantalla) y tienen su **esqueleto de datos** en el frontend:
los tipos y las funciones viven en el `datos.ts` (o `.ts` del módulo) que se indica abajo, con un comentario
`TODO backend` que describe lo que se espera. Para conectar una pantalla basta con:

1. Crear el endpoint con la forma de datos del tipo indicado (mismos nombres de campos, en camelCase).
2. Cambiar la función de ejemplo del `datos.ts` por una llamada con `pedirApi()` (como en `src/servicios/*.ts`).
3. Borrar los datos locales del `datos.ts` y su `TODO backend`.

> Convención de las respuestas: listas como `{ total, items }` o el arreglo directo; errores con `detail` en español
> (el frontend lo muestra tal cual); 401/403 cuando falte sesión o capacidad. Las fechas en ISO y la hora de Tepic.

## Estado por módulo

| Módulo | Pantalla y ruta | Estado | Lo que falta en el backend | Capacidad | Contrato en el frontend |
|---|---|---|---|---|---|
| Resumen | Resumen `/admin/resumen` | Ejemplo | Un endpoint de resumen con los pendientes de todas las áreas a las que la cuenta tiene acceso (folio, asunto, área, responsable, vencimiento, estado), las actividades del día y los indicadores. | cualquiera del panel | `pages/admin/resumen/datos.ts` |
| Panel | Notificaciones `/admin/notificaciones` | Ejemplo | `GET` notificaciones de la cuenta, `PATCH` marcar leídas, `DELETE` eliminar leídas. | cualquiera del panel | `pages/admin/notificaciones/datos.ts` |
| Panel | Sin permiso | Listo | Opcional: endpoint para **solicitar un permiso** (hoy se pide por canales internos). | — | `pages/admin/SinPermiso.tsx` |
| Contenidos | Editor y Revisión `/admin/contenidos/*` | **Conectado** | Programar la fecha de publicación (hoy publica en el momento) y subir la imagen (hoy solo guarda su nombre). | preparar_contenidos / publicar_contenidos | `servicios/contenidos.ts`, `servicios/publicacion.ts` |
| Actividades | Propuestas de actividades `/admin/actividades/propuestas` | **Conectado** | — | registrar_resoluciones_actividades, publicar_contenidos | `servicios/actividades.ts` |
| Actividades | Calendario y salas `/admin/actividades/calendario` | Conectado (lectura) | `GET/PATCH /espacios` (editar sala) y `GET/POST/PATCH/DELETE /bloqueos` (bloquear salas). | gestionar_actividades | `pages/admin/actividades/salas.ts` |
| Actividades | Visitas y uso de espacios `/admin/actividades/visitas` | Visitas conectadas; uso de ejemplo | Registro de uso efectivo: `GET/POST/PATCH /usos-espacio` (sala, fecha, personas, horas, incidencias). Hoy «Por registrar» se arma con el calendario. | gestionar_actividades | `pages/admin/actividades/visitas.ts` |
| Actividades | Cambios y cancelaciones `/admin/actividades/cambios` | Ejemplo | `GET/POST /actividades/cambios`, `POST /actividades/cambios/:folio/{aplicar\|rechazar}`, `POST /actividades/:folio/cancelar` (avisa a las personas inscritas). | registrar_resoluciones_actividades | `pages/admin/actividades/cambios.ts` |
| Actividades | Inscripciones y cupos `/admin/actividades/inscripciones` | **Conectado** | Inscribir en mostrador y ajustar cupo: `POST/PATCH /actividades/:folio/inscripciones`, `PATCH /actividades/:folio/cupo`. | confirmar_inscripciones | `pages/admin/actividades/inscripciones.ts` |
| Actividades | Asistencia `/admin/actividades/asistencia` | **Conectado** | Aplicar `Supabase/asistencia_actividades.sql` en el entorno de destino. | registrar_asistencia | `pages/admin/actividades/asistenciaReal.ts` |
| Actividades | Evidencias privadas `/admin/actividades/evidencias` | **Conectado** | — | gestionar_evidencias | `servicios/evidencias.ts` |
| Participantes | Progreso y recompensas `/admin/participantes/progreso` | Ejemplo | `GET /participantes/progreso`, `POST .../:folio/ajustes` (con motivo), `POST .../:folio/entregas`, `GET/POST/PATCH /participantes/metas` y `/participantes/recompensas`. | registrar_recompensas | `pages/admin/participantes/progreso.ts` |
| Participantes | Cotejo de credenciales `/admin/participantes/cotejo` | Ejemplo | `GET /participantes/cotejos`, `GET .../:folio` (consulta al sistema de la biblioteca), `POST .../:folio/{vincular\|correccion\|rechazo\|aviso-renovacion}`. | validar_credenciales | `pages/admin/participantes/cotejos.ts` |
| Participantes | Bibliocomunidad (moderación) `/admin/participantes/foro` | **Conectado** | Normas y silencios del foro (versión de demostración): `GET /admin/foro/normas`, `GET /admin/foro/silencios`, `POST .../silencios/:persona/restaurar`. | moderar_foro | `pages/admin/participantes/moderacion.ts` |
| Atención | Credenciales, Espacios y Propuestas `/admin/atencion/*` | **Conectado** | Un endpoint de **conteos por estado** (hoy se cuentan las 50 más recientes). Guardar las **notas internas** de Espacios. | validar_credenciales, registrar_resoluciones_actividades | `servicios/tramites.ts`, `servicios/espacios.ts` |
| Atención | Avisos por WhatsApp `/admin/atencion/avisos` | **Conectado** | — | enviar_avisos | `servicios/avisos.ts` |
| Atención | Avisos del portal `/admin/atencion/avisos/demostracion` | Ejemplo | `GET /avisos`, `POST /avisos` (borrador), `PATCH /avisos/:folio`, `POST /avisos/:folio/publicar`, `POST /avisos/:folio/retirar` (con motivo), y que el portal lea los vigentes. | enviar_avisos | `pages/admin/atencion/avisos/datos.ts` |
| Atención | Contactos y Bibliocomunidad `/admin/atencion/contactos` | **Conectado** | — | atender_contactos / atender_bibliocomunidad | `servicios/atencionComunidad.ts` |
| Atención | Consulta de cuentas `/admin/atencion/cuentas` | **Conectado** | Registrar en bitácora el **motivo** de cada consulta de datos sensibles. | consultar_cuentas_atencion | `servicios/cuentasAtencion.ts` |
| Atención | Recuperación asistida `/admin/atencion/recuperacion` | Ejemplo | `GET /recuperacion-asistida/buscar?texto=` (correo enmascarado y estado), `POST /recuperacion-asistida/:id/enviar` (registra quién verificó y envía el enlace), `POST .../fallida`, `GET /recuperacion-asistida/historial`. | orientar_recuperacion | `pages/admin/atencion/recuperacion/datos.ts` |
| Atención | Altas asistidas `/personal/alta-asistida` | **Conectado** | — | alta_asistida | `servicios/altaAsistida.ts` |
| Administración | Cuentas y permisos `/admin/administracion/cuentas` | **Conectado** | — | administrar_cuentas | `servicios/cuentasAtencion.ts`, `servicios/auth.ts` |
| Administración | Fuentes del asistente `/admin/administracion/fuentes` | **Conectado** | — | gestionar_fuentes_asistente | `pages/admin/comunidad/Fuentes.tsx` |
| Administración | Estadísticas `/admin/administracion/estadisticas` | Conectado | Portal y Contenidos usan `GET /administracion/estadisticas`. Actividades usa `/administracion/estadisticas/participacion` y su CSV. Aplicar `Supabase/estadisticas_participacion.sql` en el entorno de destino. | consultar_estadisticas | `servicios/estadisticas.ts` |
| Administración | Bitácora de cambios `/admin/administracion/bitacora` | Ejemplo | `GET /bitacora?modulo=&tipo=&desde=&hasta=&texto=` (solo lectura) y su exportación. | administrar_cuentas | `pages/admin/administracion/datos.ts` |
| Administración | Configuración del portal `/admin/administracion/configuracion` | Ejemplo | `GET/PUT /configuracion` (datos de la biblioteca, horarios, días especiales, reglas de actividades y **modo mantenimiento**; el panel ya muestra la franja de mantenimiento con ese dato). | administrar_cuentas | `pages/admin/administracion/datos.ts` |
| Administración | Estados del sistema `/admin/administracion/estados` | Listo | — (catálogo de los estados; los estados reales aparecen solos). | administrar_cuentas | `pages/admin/EstadosPanel.tsx` |

## Mejoras de rendimiento sugeridas (backend)

Cada petición tarda ~2 s aunque sea sencilla, porque en cada una se crea el cliente de Supabase (`crear_cliente()` con
`load_dotenv`) y se valida el token con `auth.get_user` por red. Crear el cliente una sola vez y validar el JWT localmente
(con la clave pública de Supabase) bajaría cada petición a unos cientos de milisegundos.

## Cuentas para probar

Ninguna de las cuentas de prueba actuales tiene **administración total**; con una cuenta así se pueden revisar en vivo
Cuentas y permisos, Bitácora, Configuración, Recuperación, Consulta de cuentas, Contactos, Altas asistidas y el catálogo
de Estados del sistema (su diseño ya está terminado y revisado en el código).

## Reacciones de noticias, reseñas y memoria — 18 y 19 nov 2026

Una sola ruta para los tres tipos de contenido publicado: `GET/PUT/DELETE /contenidos/publicos/{folio}/reacciones[/{tipo}]` y `POST /contenidos/publicos/{folio}/compartidos`. Contrato completo en **`PARA_BACKEND.md`** (raíz del repositorio), punto 2.

## Mis mensajes (Mi perfil) — 18 nov 2026

`POST /v1/public/contacto` ya guarda `usuario_id` con sesión; falta **listar los mensajes de la cuenta** (`GET /v1/me/contacto`) y **ligar** uno enviado sin sesión (`POST /v1/me/contacto/{folio}`). Contrato completo en **`PARA_BACKEND.md`** (raíz del repositorio), punto 1.

## Credencial: cancelar mi solicitud — 19 nov 2026

Hecho en front, back y base: `POST /credenciales/solicitudes/{id}/cancelar` y `Supabase/cancelacion_credencial_propia.sql`.
**No funciona todavía**: al probarlo, la pantalla dijo «No pudimos conectar con el servidor». Queda como tarea para backend
(revisar el borrador, ejecutar el SQL, reproducir y corregir). Pasos en **`PARA_BACKEND.md`**, punto 6.

## Espacios: los seis espacios del mapa — 20 nov 2026

La página de Espacios es ahora un mapa de la biblioteca con seis espacios para eventos. Falta registrarlos en `public.espacio` con sus `slug`
(sala-general, sala-usos-multiples, vestibulo, coliseo-bibliografico, area-infantil, mesanim). Tabla y detalle en **`PARA_BACKEND.md`**, punto 7.
