# Para el equipo de backend: lo que el frontend ya dejó listo y espera del backend

**Para quién:** las personas de backend y sus agentes.
**De quién:** frontend (rama `Aldahir`).
**Fecha:** 18 nov 2026.

Este archivo junta **todo lo que el frontend necesita del backend** después del rediseño del portal. El frontend **no tocó `Back/` ni `Supabase/`**, salvo la cancelación de credencial del punto 6 (borrador para que backend lo revise). Cada punto de abajo trae:

- lo que ya hace la pantalla;
- el contrato que espera (rutas, entradas, respuestas y errores);
- qué archivo del frontend cambia cuando el endpoint exista.

La tabla completa del **panel de administración** (≈25 pantallas con datos de ejemplo) está en `Front/docs/pendientes-backend.md`, sección «Estado por módulo». Este archivo resume lo nuevo del portal y apunta a esa tabla.

## Convenciones que el frontend ya usa

- **Llamadas a la API:** todas pasan por `pedirApi()` (`Front/src/servicios/api.ts`).
- **Sesión:** cuando hay sesión, va `Authorization: Bearer <access_token de Supabase>`. En el backend corresponde a `seguridad_opcional` / `seguridad_obligatoria` (ver `Back/contacto.py`).
- **Nombres:** los campos van en **camelCase**.
- **Fechas:** en ISO 8601. El frontend las muestra en hora de Tepic (`America/Mazatlan`).
- **Listas:** `{ items, total }`.
- **Errores:** con `detail` en español, porque el frontend lo muestra tal cual. Códigos:
  - `401` sin sesión;
  - `403` sin permiso;
  - `404` si no existe;
  - `409` si hay conflicto;
  - `503` si falla la base.

---

## 0. Límite de mensajes de contacto — prioridad alta (decisión de Aldahir, 18 nov 2026)

Para no llenar la base, **Contacto y sugerencias pide sesión siempre** y cada cuenta puede tener **hasta 3 mensajes en proceso a la vez** (`estadoAtencion` en `recibido` o `en_atencion`). Cuando el personal cierra uno (`cerrado`), se libera un lugar.

- **`POST /v1/public/contacto`** debe:
  - responder `401` si no hay sesión (hoy acepta anónimos);
  - contar los mensajes de la cuenta con estado distinto de `cerrado`. Si ya son 3, responder **`429`** con `detail: "Ya tienes 3 mensajes en proceso. Podrás escribir de nuevo cuando atendamos alguno."`, sin guardar nada.
  - Conviene hacerlo en la misma RPC `registrar_contacto_publico`, dentro de la transacción, para que dos envíos al mismo tiempo no se brinquen el límite.
- El límite debe ser **configurable** (p. ej. en `GET/PUT /configuracion` del panel, campo `limiteMensajesEnProceso`, por defecto 3).
- Para que el frontend sepa el cupo antes de mostrar el formulario, `GET /v1/me/contacto` (punto 1) debe traer `conteos.abiertos` y `limite`.
- **Frontend ya listo:** `Front/src/pages/publico/contacto/limite.ts` y `Contacto.tsx`:
  - sin sesión, en lugar del formulario aparece «Inicia sesión para escribirnos»;
  - con 3 en proceso, aparece «Tienes 3 mensajes en proceso» con «Ver mis mensajes»;
  - con cupo, una nota dice cuántos le quedan;
  - si el POST responde `429`, se muestra el aviso de cupo lleno.
  - Hoy cuenta con los folios guardados en el navegador; cuando exista el punto 1, pasa a `conteos.abiertos`.

## 1. Mis mensajes (Mi perfil → Mis mensajes) — prioridad alta

**Lo que hay hoy.**

- `POST /v1/public/contacto` **ya guarda** `usuario_id` cuando el mensaje llega con sesión (RPC `registrar_contacto_publico`, `p_usuario_id`).
- **Falta una ruta para listar los mensajes de la cuenta.** El frontend guarda en el navegador los folios que la persona envía y consulta cada uno con `GET /v1/public/contacto/seguimiento/{folio}`.
- Por eso, desde otro equipo o navegador, «Mis mensajes» sale vacío.

**Pantalla lista:** `Front/src/pages/publico/perfil/MisMensajes.tsx`.

- Filtros: Todos · En proceso · Atendidos, con contador.
- Tarjeta por mensaje, con su seguimiento desplegable (pasos, respuesta y folio).
- «¿Falta un mensaje?» para agregar uno con su folio.

**Contrato que espera:**

| Método y ruta | Sesión | Entrada | Respuesta |
|---|---|---|---|
| `GET /v1/me/contacto?estado=&pagina=&porPagina=` | obligatoria | `estado`: `abiertos` (recibido + en_atencion) · `atendidos` (cerrado) · vacío = todos | `{ items: ContactoSeguimiento[], total, conteos: { todos, abiertos, atendidos }, limite: 3 }`, del más reciente al más antiguo |
| `POST /v1/me/contacto/{folio}` | obligatoria | — | `ContactoSeguimiento`. Liga a la cuenta un mensaje enviado **sin sesión** (cuando `usuario_id` es nulo). `404` si el folio no existe; `409` si ya pertenece a otra cuenta |

- **Forma de `ContactoSeguimiento`:** la misma que ya devuelve el seguimiento por folio (`Back/contacto.py`):

  ```
  { id: UUID, asunto: str, estadoAtencion: 'recibido' | 'en_atencion' | 'cerrado', creadoEn: datetime, respuestaFinal?: str }
  ```

  Opcional, pero útil: `actualizadoEn`.
- **Seguridad:** solo devuelve los mensajes donde `usuario_id = sesión`. Nunca un listado público.
- **Aviso en la campana:** cuando el personal cambie el estado o responda, crear el aviso para la cuenta. La tarjeta abierta le dice a la persona «Te avisaremos en la campana de notificaciones cuando el personal responda».

**Cuando exista, en el frontend:**

1. Agregar `misMensajes()` y `ligarMensaje()` en `Front/src/servicios/atencionComunidad.ts`.
2. En `MisMensajes.tsx`, cargar la lista con `misMensajes()` en lugar de `foliosDe()`, y que «Agregar» llame a `ligarMensaje()`.
3. Borrar `Front/src/pages/publico/perfil/mensajesGuardados.ts` y su prueba (`Front/tests/mensajesGuardados.test.ts`).

---

## 2. Reacciones («Me gusta», «Me sirvió / Me fue útil», «Compartir») — prioridad media

**Aplica a noticias, reseñas y registros de memoria** (19 nov 2026). Los tres son contenidos publicados con folio (`CN-0045`), así que la ruta es **una sola** bajo `/contenidos/publicos/{folio}`.

**Lo que hay hoy.**

- El frontend ya llama a estas rutas (`Front/src/servicios/reacciones.ts`) desde una sola pieza, `Front/src/components/portal/Reacciones.tsx`. La usan:
  - `noticias/DetalleNoticia.tsx`, con «Me sirvió»;
  - `lecturas/DetalleResena.tsx` y `lecturas/DetalleMemoria.tsx`, con «Me fue útil». Es el mismo tipo, `me_sirvio`.
- Como todavía no existen, la pantalla usa los conteos que trae el contenido y guarda en el navegador la marca de cada persona (por cuenta) y las veces compartida.
- Con sesión, las reacciones se marcan y desmarcan; sin sesión, aparece «Inicia sesión para reaccionar». Compartir funciona sin cuenta.

**Tabla sugerida:**

- `reacciones_contenido (contenido_id, usuario_id, tipo ∈ {me_gusta, me_sirvio}, creado_en)`, con llave única `(contenido_id, usuario_id, tipo)`;
- un contador `compartidos` por contenido.

**Contrato:**

| Método y ruta | Sesión | Respuesta |
|---|---|---|
| `GET /contenidos/publicos/{folio}/reacciones` | opcional | `{ meGusta, meSirvio, compartir, mias: ("me_gusta" \| "me_sirvio")[] }` (`mias` vacío sin sesión) |
| `PUT /contenidos/publicos/{folio}/reacciones/{tipo}` | obligatoria | Igual que el GET, ya con la marca puesta (idempotente) |
| `DELETE /contenidos/publicos/{folio}/reacciones/{tipo}` | obligatoria | Igual que el GET, ya sin la marca (idempotente) |
| `POST /contenidos/publicos/{folio}/compartidos` | no | Igual que el GET, con `compartir` + 1 |

- `{folio}` es el mismo del detalle público (`/contenidos/publicos/{identificador}`). `{tipo}` es `me_gusta` o `me_sirvio`.
- **Errores:** `401` sin sesión en PUT y DELETE; `404` si el contenido no existe o no está publicado.
- Una persona cuenta una sola vez por tipo y puede tener las dos marcas.
- **Opcional:** incluir `reacciones: { meGusta, meSirvio, compartir }` en `GET /contenidos/publicos` para mostrar los conteos en las tarjetas sin una llamada por contenido.

**Cuando exista, en el frontend:** nada que programar; `reacciones.ts` ya intenta el backend primero. Solo hay que quitar el respaldo en el navegador (`reaccionesLocales`, `conteoLocal`).

---

## 3. Contacto (página pública)

**Ya conectado**, salvo el límite del punto 0 (sesión obligatoria y máximo 3 en proceso).

- `POST /v1/public/contacto` y `GET /v1/public/contacto/seguimiento/{folio}` funcionan tal cual.
- Con sesión, la confirmación lleva a «Mis mensajes» con `?folio=`.
- Sin sesión ya no se muestra el formulario (punto 0).
- La página ya no tiene la sección «Otras formas de comunicarte». No había backend detrás.

**Opcional:** guardar el **tipo** del mensaje (contacto o sugerencia). Hoy el frontend lo pone en el asunto («Sugerencia: …»). Si se agrega `tipo` a la entrada y a `ContactoSeguimiento`, «Mis mensajes» puede filtrar por tipo.

---

## 4. Panel de administración (resumen)

Las pantallas con datos de ejemplo y su contrato están en `Front/docs/pendientes-backend.md`, tabla «Estado por módulo». En cada `datos.ts` indicado hay un comentario `TODO backend` con la forma exacta de los datos. Las principales:

| Pantalla | Contrato |
|---|---|
| Resumen y Notificaciones del panel | `pages/admin/resumen/datos.ts`, `pages/admin/notificaciones/datos.ts` |
| Actividades | Cambios y cancelaciones, Calendario (editar salas y bloqueos), Visitas (uso de espacios), Inscripciones (mostrador y cupo) |
| Participantes | Progreso y recompensas, Cotejo de credenciales, normas y silencios del foro |
| Atención | Avisos del portal, Recuperación asistida, conteos por estado en Credenciales, Espacios y Propuestas, notas internas de Espacios, motivo en bitácora para Consulta de cuentas |
| Administración | Estadísticas, Bitácora y Configuración del portal (incluye modo mantenimiento) en `pages/admin/administracion/datos.ts` |

**Rendimiento** (en el mismo archivo): cada petición tarda ~2 s porque se crea el cliente de Supabase y se valida el token por red en cada llamada. Crear el cliente una vez y validar el JWT localmente lo baja a cientos de milisegundos.

---

## 5. Otros `TODO backend` del portal

| Dónde | Qué falta |
|---|---|
| `Front/src/pages/publico/inicio/horarioBiblioteca.ts` | Días festivos o especiales. El letrero «Abierto ahora / Cerrado ahora» usa solo el horario fijo (L–V 8:00–19:30, sáb 9:00–14:00). Puede salir de `GET /configuracion` (punto 4) |
| Avisos del portal (`pages/admin/atencion/avisos/datos.ts`) | Que el portal lea los avisos vigentes. Hoy la pantalla es solo de demostración |

## 6. Credencial: la persona cancela su propia solicitud — **prioridad alta: NO FUNCIONA, tarea para backend** (19 nov 2026)

Si la persona se equivocó o ya no quiere la credencial, la cancela desde **Seguimiento de tu credencial**
(botón «Cancelar solicitud» → «¿Cancelar tu solicitud?» → «Sí, cancelar»).

### Tarea para el agente de backend

Aldahir lo probó con su cuenta el 19 nov y **no cancela**: bajo «Sí, cancelar» sale
«No pudimos conectar con el servidor. Comprueba que el backend esté encendido.». Ese texto lo pone `pedirApi()` cuando
`fetch` falla o pasa de 20 s sin respuesta (`Front/src/servicios/api.ts`), así que la petición no recibió respuesta del backend.
Lo que sí se comprobó: el backend local estaba encendido, `/openapi.json` incluye la ruta y, sin sesión, `POST …/cancelar` responde `401`.
No se sabe si `cancelacion_credencial_propia.sql` ya se ejecutó en CECANbd.

1. **Revisar** el borrador de abajo (lo hizo Claude, desde frontend, con permiso de Aldahir): cambiar lo que no siga las reglas del equipo.
2. **Ejecutar** `Supabase/cancelacion_credencial_propia.sql` en CECANbd y después `Supabase/pruebas_cancelacion_credencial_propia.sql` (`ROLLBACK`).
3. **Reproducir** con una cuenta que tenga una solicitud `recibida`: entrar a `/credencial/seguimiento` → «Cancelar solicitud» → «Sí, cancelar»,
   viendo la terminal de uvicorn. Averiguar por qué no responde (¿se cuelga la RPC, se bloquea la fila con `FOR UPDATE`, el proxy de Vite
   `/api` → `127.0.0.1:8000` corta el `POST`, o uvicorn se reinició con `--reload`?) y corregirlo.
4. **Confirmar** que responde `200` con la solicitud en `cancelada`, que la pantalla vuelve a la información con «Cancelaste tu solicitud»
   y que después se puede solicitar otra. Avisar a Aldahir y marcar este punto como hecho.

El frontend no necesita cambios si la ruta respeta el contrato de abajo.

### Borrador que ya está en la rama `Aldahir`

- **`Supabase/cancelacion_credencial_propia.sql`** (paso 22 del README de Supabase): recrea `privado.atencion_solicitudes` igual que
  `resolucion_institucional_propuestas.sql` más la operación `cancelar`, solo para credenciales:
  - solo la persona titular (ni otra persona ni el personal por esta vía; el personal sigue usando `resolver` con motivo): si no, `42501`;
  - solo desde `recibida`, `en_atencion`, `cita_programada` o `rechazada` (el frontend llama «Corrección solicitada» a `rechazada`); si no, `55000`;
  - no pide `actualizadaEn` (la fila se bloquea con `FOR UPDATE`) y no acepta más campos que `id`;
  - deja `estadoSolicitud = 'cancelada'` sin tocar las observaciones del personal y lo anota en el historial
    (`accion = 'cancelar'`, nota «La persona canceló su solicitud desde el portal.»).
- **`Supabase/pruebas_cancelacion_credencial_propia.sql`** (con `ROLLBACK`): otra persona y el personal no pueden, la titular sí,
  no se cancela dos veces, después puede solicitar otra y las propuestas no se cancelan por esta vía.
- **`Back/credenciales.py`**: `POST /credenciales/solicitudes/{id}/cancelar` → `200` con la solicitud; `403` ajena, `404` no existe,
  `409` ya atendida o cancelada, `401` sin sesión. Pruebas en `Back/tests/test_atencion_tramites.py`.
- **Frontend:** `cancelarSolicitudCredencial` (`tramites.ts`), `cancelarSolicitud` y `puedeCancelar` (`credencial/datos.ts`) y
  `CancelarSolicitud` (`credencial/Tramite.tsx`). Si la base todavía no tiene el SQL, el servidor responde `422` y la pantalla dice
  «Por ahora no se puede cancelar en línea…» con el teléfono; un `409` dice que la solicitud ya cambió de estado.
- **Pendiente:** todo lo de «Tarea para el agente de backend», arriba.

## 7. Espacios: registrar los seis espacios del mapa — prioridad alta (Aldahir, 20 nov 2026)

La página **Espacios** (`/espacios`) ahora es un **mapa 2D de la biblioteca** (levantamiento de Aldahir) donde la persona elige el espacio
para su evento y luego llena fecha y datos (`/espacios/solicitar?espacio=<slug>`). El formulario sigue usando
`POST /espacios/solicitudes` sin cambios (`areaId` = `slug`). Lo que falta es que **la base tenga los espacios del mapa**:
hoy `public.espacio` solo tiene tres provisionales (`sala-lectura`, `sala-usos-multiples`, `area-infantil`).

| Número en el plano | `slug` | Nombre | Capacidad | Descripción (uso) |
|---|---|---|---|---|
| 04 | `sala-general` | Sala general | 120 | Presentaciones de libro, lecturas, conferencias y eventos amplios. Se comparte con las personas usuarias en horario de servicio. |
| 14 | `sala-usos-multiples` | Sala Braille y de usos múltiples | 40 | Talleres, conferencias, presentaciones y actividades inclusivas (≈24 con mesas). |
| 10 | `vestibulo` | Vestíbulo | 35 | Inauguraciones, exposiciones temporales y recepción de invitados. Exterior techado. |
| 05 | `coliseo-bibliografico` | Coliseo bibliográfico | 25 | Círculos de lectura, charlas y presentaciones en formato íntimo. |
| 06 | `area-infantil` | Área infantil | 30 | Solo actividades lúdicas: cuentos, visitas de preescolar y talleres infantiles. |
| M | `mesanim` | Mesanim (planta alta) | 50 | Eventos pequeños; piso de duela, sin alimentos, solo por escalera y sujeto a aprobación de la Dirección. |

- **Qué hacer:** un SQL que inserte o actualice esos seis (`ON CONFLICT (slug) DO UPDATE`) y desactive `sala-lectura` (`activo = false`),
  que no está en el mapa. Las capacidades son aproximadas (según el tamaño del área); la biblioteca puede ajustarlas.
- **Mientras tanto:** con una cuenta real, el mapa pregunta `GET /espacios/areas`; si un espacio aún no está registrado,
  su detalle dice «Este espacio todavía no se puede pedir en línea. Llama al 311 212 8989» en lugar del botón.
- **Horario de la biblioteca:** el frontend ya solo deja pedir de **lunes a viernes, de 8:00 a 19:30 h** (`HORARIO` en
  `Front/src/pages/publico/espacios/datosSesion.ts`). `POST /espacios/solicitudes` debería rechazar lo mismo (`422` con un `detail` claro)
  por si alguien llama la API directo; y si la biblioteca cambia su horario, avisar al frontend.
- **A futuro (opcional):** el mapa original permitía elegir **varios espacios** para un mismo evento. Hoy una solicitud es por un espacio
  (`areaId`). Si la biblioteca lo quiere, haría falta aceptar una lista (`areaIds`) y revisar la disponibilidad de todos.
- **Frontend:** `Front/src/pages/publico/espacios/datos.ts` (zonas y espacios del mapa, con su `slug`), `MapaBiblioteca.tsx`,
  `Espacios.tsx` (paso 1) y `Solicitar.tsx` (paso 2). Para verlo sin backend: `/espacios?simular=sesion`.

## 8. Propuestas: la persona edita y cancela su propia propuesta — prioridad media (Aldahir, 21 nov 2026)

En **Seguimiento de tu propuesta** (`/proponer/:id`) hay dos botones nuevos: «Editar propuesta» (abre `/proponer/:id/editar`, el mismo
formulario ya lleno) y «Cancelar propuesta» (confirmación en el lugar, igual que en Credencial). Hoy la base no deja hacer todo:

- **Editar mientras está `en_revision`:** `privado.atencion_solicitudes`, operación `corregir`, solo acepta `borrador` y
  `requiere_correccion` (`55000` si no). Pedido: aceptar también `en_revision` cuando lo hace la persona titular, siempre que el personal
  no haya resuelto (mismo `PUT /propuestas/{id}/corregir` con `actualizadoEn`; `409` si cambió). Queda en `en_revision` y se anota en el historial.
  Cuando exista, en el frontend se cambia `EDITAR_EN_REVISION = true` en `Front/src/pages/publico/proponer/datos.ts` (hoy el botón solo sale con cambios pedidos o en borrador).
- **Cancelar:** no existe. Pedido: `POST /propuestas/{id}/cancelar` con `{ "actualizadoEn": "<fecha>" }` → `200` con la propuesta en
  `cancelada`. Solo la titular (`403` si no), solo desde `borrador`, `en_revision` o `requiere_correccion` (`409` si ya se aprobó,
  rechazó o canceló), `404` si no existe, `401` sin sesión. En el historial: `accion = 'cancelar'`, nota «La persona canceló su propuesta desde el portal.».
  Mientras no exista, el botón responde `404` y la pantalla dice «Por ahora no se puede cancelar en línea…» con el teléfono.
- **Frontend:** `cancelarPropuestaPropia` (`Front/src/servicios/tramites.ts`), `editarPropuestaUsuario` (`servicios/propuestasUsuario.ts`),
  `puedeEditar`, `puedeCancelar` y `propuestaDesdeSolicitud` (`proponer/datos.ts`), `EditarPropuesta` y `CancelarPropuesta` (`proponer/Proponer.tsx`).
  Para verlo sin backend: `/proponer?simular=sesion`, enviar, y en el seguimiento usar los dos botones.

## Cómo probar

- **Backend local:** `.\.venv\Scripts\python.exe -m uvicorn Back.main:app --reload` desde la raíz (puerto 8000).
- **Frontend:** `cd Front && npm run dev`.
- **Pantallas con sesión sin backend:** en desarrollo, `?simular=sesion` las muestra con datos de ejemplo (p. ej. `/mi-perfil/mensajes?simular=sesion`).
