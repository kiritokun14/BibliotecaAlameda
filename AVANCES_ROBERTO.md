# Trabajo realizado por Roberto — Sprint 2

## Lo que realicé

- Apoyé la configuración de FastAPI y su conexión con la nueva base CECANbd en Supabase (T-025, cuyo titular es Luis).
- Implementé el registro de usuarios en el backend: validación de datos, domicilio, aceptación del aviso y datos del tutor para menores. Comprobé el guardado y la confirmación del correo.
- Implementé la administración de cuentas: consulta, cambio de estado, asignación y retiro de roles y capacidades, ámbito, vigencia y registro de cambios.
- Ajusté los roles y permisos con base en la documentación y las pantallas de Alda: Usuario / Cliente, Editor, Responsable de actividades y Administrador del portal. Servicios Digitales y Préstamos se manejan mediante capacidades específicas.
- Corregí la exposición de datos en errores de validación y la copia de datos personales del registro en la información adicional de autenticación.
- Ejecuté 32 pruebas del backend, 12 pruebas de integración del frontend con transporte simulado y las comprobaciones de compilación y estilo. También comprobé la comunicación local frontend → FastAPI → Supabase sin mostrar claves ni datos personales.

## Mis ocho tarjetas del Sprint 2

| Tarjeta | Tarea | Mi avance |
|---|---|---|
| BDLAG-15 · HU-05 | Crear cuenta mediante autorregistro | Pantalla conectada al backend; falta comprobar un registro nuevo y su enlace con un correo real. |
| BDLAG-16 · HU-06 | Iniciar y cerrar sesión | Conecté la pantalla a Supabase Auth y validé la sesión con el backend; falta comprobación con credenciales reales y coordinación con Luis. |
| BDLAG-20 · HU-10 | Administrar cuentas y permisos | Backend implementado; falta probar con un administrador real e integrar la pantalla. |
| BDLAG-122 · T-020 | Revisar consistencia de requisitos, modelo de datos y contratos API | Revisé cuentas, registro y permisos; falta cerrar la revisión completa de la tarea. |
| BDLAG-59 · T-027 | Implementar el registro de usuarios en el backend | Terminada; ya aparece como Done en Jira. |
| BDLAG-125 · T-029 | Implementar formularios de registro, inicio y cierre de sesión | Integré los formularios diseñados por Alda con los servicios reales. Añadí los campos faltantes del domicilio del tutor y manejo de errores; conservé el diseño. |
| BDLAG-89 · T-032 | Implementar administración de cuentas, roles y permisos | Implementada; falta la comprobación con una sesión real de administrador. |
| BDLAG-134 · T-042 | Asignar responsables y corregir defectos del Sprint 2 | Corregí defectos del backend; falta el cierre conjunto de los defectos del sprint. |

## Pendientes de mi trabajo

- Probar la administración con una cuenta designada expresamente como administrador.
- Comprobar con una cuenta real el acceso y cierre de sesión, y coordinar esta integración con Luis.
- Verificar en Supabase Auth que se permitan http://localhost:5173/auth/retorno?flujo=confirmacion y http://localhost:5173/auth/retorno?flujo=recuperacion. El código ya usa esas rutas, pero no se pudo comprobar la lista de URLs permitidas porque el navegador integrado pidió iniciar sesión y el control del navegador de Windows se detuvo. Probar después los correos de confirmación y recuperación desde el mismo navegador/equipo de desarrollo.
- Cerrar la revisión de consistencia y las correcciones del sprint con el equipo.

La conexión inicial ya se subió a main. El código del avance se entrega en la rama Roberto; las correcciones de base de datos sí están aplicadas en CECANbd. Integré las pantallas existentes con autorización, sin rediseñarlas. Definir permisos de eventos e inscripciones no significa que esos módulos ya estén implementados.

## Integración local del frontend de Alda

- Registro real por FastAPI, sin detectar ni revelar correos existentes desde la pantalla.
- Sesión real mediante el cliente oficial de Supabase; comprobación de cuenta activa y permisos en el backend, renovación de tokens y cierre de la sesión actual.
- Recordarme selecciona almacenamiento persistente; sin marcarlo, la sesión se conserva solo en la pestaña. Las contraseñas del formulario no se guardan en almacenamiento del navegador.
- Reenvío de confirmación y recuperación por correo conectados a Supabase; retorno de enlaces y cambio de contraseña protegidos por una sesión verificada. Las pruebas de esta integración no enviaron correos ni cambiaron contraseñas reales.
- La autorización por correo del tutor era una simulación sin soporte en el flujo documentado: la sustituí por captura de contacto/domicilio del responsable y confirmación del correo del titular.
- Retiré el botón de Google sin conexión: ese método aún no está configurado y el alta de Auth exige los datos completos del perfil.
- La configuración del frontend recibe solo URL y clave publicable desde FastAPI. Vite comunica /api con el backend local; no se copian claves secretas al frontend.
- Preparé la llamada autenticada a administración para las futuras pantallas del panel. El frontend descargado trae inicio y acceso, no el panel administrativo; no se inventaron pantallas adicionales.
- Noticias, actividades, lecturas y otras secciones de ejemplo de la página de inicio conservan sus datos ilustrativos: no hay endpoints de esos módulos implementados todavía.

Para ejecutar: backend con .\.venv\Scripts\python.exe -m uvicorn Back.main:app --reload desde la raíz; frontend con npm ci y npm run dev desde Front. Abrir http://localhost:5173. La rama de entrega de este avance es Roberto.

## Cuenta para probar acceso sin envío de correo

Con autorización se creó prueba.integracion@biblioteca.test en CECANbd, con datos ficticios, perfil activo, identidad de correo y únicamente rol Usuario / Cliente. Se confirmó expresamente solo esta cuenta; no se desactivó la confirmación general ni se modificaron las cuentas de Valeria. Su contraseña de prueba se entregó en el chat y no se guarda en el repositorio.

Se ejecutó el servicio real del frontend contra Supabase y el backend local: inicio de sesión correcto, lectura de acceso propio, rechazo de administración (403), renovación de sesión correcta y rechazo del token tras cerrar sesión. No se enviaron correos. Esta prueba no cubre alta desde el formulario ni entrega, confirmación o recuperación por correo, ni sustituye la comprobación pendiente con un administrador real.

## Integración de T-034 de Stephanie

Se incorporó únicamente la consulta de solicitudes propias de la rama Stephanie (base c0f56e8, solicitudes.py), adaptada al backend de Roberto. No se trajeron registro_menores.py, auth_prueba.py ni el frontend de esa rama. T-034 sigue siendo trabajo de Stephanie; mi aportación fue integrarla y corregir los puntos encontrados en la revisión.

- Ruta GET /mis-solicitudes con Authorization: Bearer de una sesión real.
- Consulta espacios, credenciales y propuestas de eventos filtrando exclusivamente por el titular de la sesión, sin recibir un UUID del cliente como identidad.
- Reutiliza la comprobación de sesión vigente, cuenta activa y correo confirmado de la BD. No exige rol Administrador ni depende de habilitar la administración.
- Selecciona únicamente los campos de respuesta, oculta errores internos y evita almacenar la respuesta privada en caché.
- Paginación: limite (1 a 100, por defecto 25) y desplazamiento (0 a 100000), aplicados por separado a cada categoría. total_solicitudes y totales_por_tipo cuentan todos los registros propios, no solo la página. Una página posterior al final devuelve listas vacías.
- Devuelve solicitudes y estados actuales ordenados por creación; no se afirma que exista una bitácora de transiciones ni se añadieron tablas para inventarla.
- Verificación: 43 pruebas de backend correctas (11 nuevas de T-034). Comprobación adicional contra Supabase real con la cuenta de prueba: dos páginas vacías respondieron 200 y acceso anónimo respondió 401; se cerró únicamente la sesión abierta para esa prueba. No se crearon ni modificaron solicitudes.
- El frontend no cambió. La pantalla para mostrar estas solicitudes queda pendiente; el endpoint se puede consultar desde /docs. Se incorporó únicamente este módulo de Stephanie, sin fusionar su rama completa. La entrega del avance se realiza en Roberto.

## Adaptación de recuperación de BOBA

- Revisé y adapté el módulo de recuperación del commit 0c7c1b4 de BOBA en Roberto, conservando la autoría de su aportación. No se fusionó el resto de la rama ni se reemplazó main.py por su versión anterior.
- POST /auth/recuperar solicita el enlace por Supabase y responde de forma genérica para correos registrados o inexistentes. El límite de envíos devuelve 429; los fallos del servicio devuelven 503, sin fingir éxito ni exponer errores internos.
- El correo vuelve a FRONTEND_URL/auth/retorno?flujo=recuperacion. Se reutiliza FRONTEND_URL; no se requiere RESET_REDIRECT_URL ni se copió la clave publicable concreta de BOBA al archivo de ejemplo.
- POST /auth/restablecer recibe tokens y una contraseña de 8 a 128 caracteres, verifica la identidad con Supabase y actualiza únicamente esa cuenta. Es una operación autenticada: no afirma distinguir en el servidor una sesión de recuperación de una sesión normal. La pantalla conserva su comprobación del retorno de recuperación.
- Después del cambio intenta cerrar globalmente las sesiones de Auth. La respuesta sesionesCerradas informa si este cierre tuvo éxito; un fallo al cerrar no se presenta como un fallo de la contraseña ya guardada. El navegador también cierra y limpia su sesión local. La revocación de tokens de actualización no implica invalidar inmediatamente todos los JWT ya emitidos.
- Conecté las pantallas existentes a ambos endpoints mediante el proxy /api, manteniendo su diseño. El retorno sigue admitiendo código PKCE y tokens en fragmento; el envío desde el SDK Python usa el retorno con fragmento que ya contempla el frontend.
- Verificación: 53 pruebas de backend y 14 de frontend correctas, lint y compilación correctos. Las pruebas nuevas simulan Supabase: no enviaron correos ni cambiaron contraseñas de cuentas reales.
- Pendiente: prueba completa de correo → enlace → nueva contraseña → inicio de sesión. El límite compartido de correo continúa aplicando. Estos cambios permanecen locales en Roberto, sin commit ni push nuevo.

## Integración de Valeria

- Incorporé el trabajo de Valeria desde b73bdb9: T-033 (backend, pantalla de personal, validación de menores, revisión de duplicados, cancelación y reintento de invitación) y T-026 (receta de esquema, semillas y limpieza). Se mantiene su autoría; mi aportación es la integración y los ajustes.
- Conservé la recuperación de BOBA y nuestros módulos de registro, permisos y solicitudes. No se fusionaron versiones antiguas de archivos compartidos ni cambios de otras ramas.
- El acceso a alta asistida se muestra según la capacidad validada, sin forzar al personal a esa pantalla después de iniciar sesión. Los fallos del servicio se distinguen de la falta de permiso.
- Evité interpretar todos los errores 422 de invitación como correo duplicado: únicamente los códigos específicos de cuenta existente producen ese conflicto.
- Acoté la limpieza a identificadores de semilla explícitos y siete pares exactos UUID/correo; no selecciona la cuenta prueba.integracion@biblioteca.test. El script no se ejecutó: requiere copia de prueba y revisión de dependencias/cascadas.
- Consulté CECANbd: la tabla altaAsistida, RPC y soporte del trigger ya están presentes. No reconstruí, limpié ni sembré la base y no modifiqué roles ni usuarios.
- El módulo permanece desactivado localmente hasta configurar SUPABASE_SECRET_KEY en Back/.env y ALTA_ASISTIDA_HABILITADA=true. La clave de Brevo no sirve para este propósito. Queda pendiente probar una invitación real y su elección de contraseña.
- Los cambios continúan locales en Roberto, sin commit ni push de esta integración.

Verificación final de la integración de Valeria: 67 pruebas de backend y 18 de frontend correctas; lint, compilación y git diff --check correctos. Las pruebas usan transporte simulado y no envían invitaciones reales.

Configuración posterior: se comprobó SUPABASE_SECRET_KEY en Back/.env sin mostrar su valor y ALTA_ASISTIDA_HABILITADA=true. Auth Admin aceptó la clave mediante consulta de solo lectura. El backend activo incluye alta asistida y rechaza el acceso anónimo con 401. Back/.env está excluido de Git. No se enviaron invitaciones ni se crearon cuentas; queda pendiente la prueba completa con personal autorizado.

## Pantallas nuevas de Aldahir

Se incorporó el commit 1541774 de Aldahir mediante sus archivos nuevos de panel, componentes, recursos y rutas, conservando las rutas previas de Roberto. Incluye bandejas y detalles de credenciales, espacios y propuestas, modales, filtros y vista previa. Se conserva su diseño.

Se agregó comprobación de sesión y capacidades desde FastAPI antes de montar las pantallas. Administrar cuentas no concede atención ni publicación automáticamente; publicar requiere publicar_contenidos. Se muestran solo enlaces de atención autorizados y el enlace al alta asistida existente. El encabezado muestra correo y roles de la sesión; se retiraron el texto de acceso total y el contador ficticio de notificaciones.

Las listas, resoluciones, cotejos y publicación de Atención siguen siendo simulaciones en memoria de Aldahir, claramente identificadas en pantalla: no guardan en Supabase. Esta integración no agrega backend de credenciales, espacios o propuestas ni el panel de cuentas de HU-10. Las comprobaciones de interfaz no reemplazan la autorización que deberán tener los futuros endpoints. Los permisos limitados a una actividad no abren bandejas globales.

Cambios locales en Roberto, sin commit ni push. No se modificó la base ni se enviaron correos.

Verificación: 23 pruebas de frontend correctas, lint y compilación correctos. No se ejecutaron operaciones reales de Atención.

Entrega del avance integrado: se prepara la publicación de las pantallas de Aldahir y sus controles de acceso en main, con autorización de Roberto. Las referencias anteriores a cambios locales describen el estado previo a esta entrega. Las operaciones de Atención continúan con datos de ejemplo. La cuenta ficticia prueba.panel@biblioteca.test tiene los tres permisos globales autorizados para esta prueba; su contraseña no se guarda en el repositorio.

## Integración del editor de Valeria — 2 de noviembre

Incorporé los 33 archivos del avance de Valeria (05dc15a) en Roberto: backend de contenidos, pruebas, pantallas conectadas, estilos/recursos, rutas, servicio y SQL del editor y memoria pública. Conservé registro, recuperación de BOBA, alta asistida y Atención. El panel admite preparar_contenidos sin habilitar permisos ficticios de desarrollo.

Ajustes de integración: separé los tipos que admite la creación de los tipos existentes que se pueden listar; alineé los filtros de estado con el backend; corregí la navegación de reseñas, memoria y Acerca con observaciones para que no abra el formulario de noticias. Añadí pruebas de llamadas autenticadas y manejo de errores. La selección de imágenes indica expresamente que solo sirve de vista previa y todavía no se almacena.

Verificación: 78 pruebas de backend, 29 de frontend, lint y compilación correctos. Las pruebas automatizadas usan transporte simulado. Consulté CECANbd y confirmé la RPC editor_contenidos, validación de memoria, bitácora y columnas ya instaladas; no ejecuté migraciones ni modifiqué usuarios, permisos o contenidos. No se ejecutó el script SQL de pruebas en la base compartida.

Pendientes funcionales que ya existían en la aportación: almacenamiento de imágenes, revisiones privadas sobre contenidos publicados, visualización detallada de enviados/publicados y conexión con la revisión/publicación institucional de T-055. No se acredita el flujo real completo de un editor solo con estas pruebas. Estas limitaciones no se presentan como terminadas. Cambios locales sin commit ni push.

## Fluidez del panel y editor — 2 de noviembre

- Añadí reutilización en memoria de la consulta de permisos durante 15 segundos, separada por token. Las llamadas simultáneas comparten petición. Se invalida al iniciar/cerrar sesión, modificar administración, recibir 401/403 o recuperar el foco. El backend continúa autorizando cada operación; no se amplían capacidades.
- Retiré la consulta remota redundante getUser del acceso al panel: después de comprobar permisos en el servidor se usa la sesión local y se compara su identificador. Protegí las comprobaciones frente a respuestas que llegan fuera de orden.
- Las lecturas simultáneas idénticas del editor comparten petición, sin conservar resultados terminados. Las escrituras no se reutilizan y limpian las consultas pendientes.
- Separé errores del resumen y del listado. Al cambiar filtros/página se muestra carga en lugar de datos anteriores; la paginación espera la respuesta. Añadí etiquetas correctas para aprobado, retirado y archivado.
- Bloqueé guardados/envíos simultáneos en el mismo formulario y conservé inmediatamente el folio creado para evitar otra creación antes del siguiente renderizado.
- Separé las pantallas administrativas y de personal en archivos que se descargan al abrirlas. El JavaScript inicial compilado pasó de 836.48 a 651.53 kB (aproximadamente 22 % menos; gzip de 206.03 a 173.61 kB). Todavía existe el aviso de paquete inicial mayor a 500 kB.

Verificación: 36 pruebas de frontend correctas y una prueba de latencia manual omitida por defecto; lint y compilación correctos. La prueba manual se ejecutó aparte contra el backend existente: cuatro consultas consecutivas de permisos produjeron una sola petición HTTP, con 1288.9 ms en la primera y menos de 0.1 ms en las siguientes dentro del servicio con sesión local simulada. No representa tiempo completo de pantalla ni guardado. La primera consulta real sigue rondando 1.3 segundos. Las 78 pruebas de backend habían pasado en la integración anterior; este ajuste no modifica el backend.

No se aplicaron migraciones ni se cambiaron contenidos, usuarios o permisos. No se iniciaron servidores y no se realizó commit ni push. Quedan fuera de este ajuste la reutilización segura de conexiones del backend y unir guardado/envío en una operación; requieren cambios y pruebas específicos. La prueba completa del editor con cuenta autorizada sigue pendiente.
