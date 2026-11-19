# Para el equipo de backend: lo que el frontend ya dejó listo y espera del backend

**Para quién:** las personas de backend y sus agentes.
**De quién:** frontend (rama `Aldahir`).
**Fecha:** 18 nov 2026.

Este archivo junta **todo lo que el frontend necesita del backend** después del rediseño del portal. El frontend **no tocó `Back/` ni `Supabase/`**. Cada punto de abajo trae:

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

## 2. Reacciones de noticias («Me gusta», «Me sirvió», «Compartir») — prioridad media

**Lo que hay hoy.** El frontend ya llama a estas rutas (`Front/src/servicios/reacciones.ts`). Como todavía no existen:

- usa los conteos que trae la noticia;
- guarda en el navegador la marca de cada persona (por cuenta) y las veces compartida.

**Pantalla lista:** `Front/src/pages/publico/noticias/DetalleNoticia.tsx`. Las reacciones van al final del texto. Con sesión, se marcan y desmarcan; sin sesión, aparece «Inicia sesión para reaccionar».

**Tabla sugerida:**

- `reacciones_noticia (noticia_id, usuario_id, tipo ∈ {me_gusta, me_sirvio}, creado_en)`, con llave única `(noticia_id, usuario_id, tipo)`;
- un contador `compartidos` por noticia.

**Contrato:**

| Método y ruta | Sesión | Respuesta |
|---|---|---|
| `GET /noticias/{id}/reacciones` | opcional | `{ meGusta, meSirvio, compartir, mias: ("me_gusta" \| "me_sirvio")[] }` (`mias` vacío sin sesión) |
| `PUT /noticias/{id}/reacciones/{tipo}` | obligatoria | Igual que el GET, ya con la marca puesta (idempotente) |
| `DELETE /noticias/{id}/reacciones/{tipo}` | obligatoria | Igual que el GET, ya sin la marca (idempotente) |
| `POST /noticias/{id}/compartidos` | no | Igual que el GET, con `compartir` + 1 |

- `{id}` es el mismo identificador del detalle público (`/contenidos/publicos/{identificador}`, p. ej. `CN-0045`). Si prefieren montarlo bajo `/contenidos/publicos/{identificador}/reacciones`, avisen y el frontend cambia solo la función `ruta()` de `reacciones.ts`.
- **Errores:** `401` sin sesión en PUT y DELETE; `404` si la noticia no existe o no está publicada.
- Una persona cuenta una sola vez por tipo y puede tener las dos marcas.

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
| Actividades | Cambios y cancelaciones, Asistencia, Calendario (editar salas y bloqueos), Visitas (uso de espacios), Inscripciones (mostrador y cupo) |
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

## Cómo probar

- **Backend local:** `.\.venv\Scripts\python.exe -m uvicorn Back.main:app --reload` desde la raíz (puerto 8000).
- **Frontend:** `cd Front && npm run dev`.
- **Pantallas con sesión sin backend:** en desarrollo, `?simular=sesion` las muestra con datos de ejemplo (p. ej. `/mi-perfil/mensajes?simular=sesion`).
