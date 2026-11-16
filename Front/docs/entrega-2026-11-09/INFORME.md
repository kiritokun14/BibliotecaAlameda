# Entrega del 9 de noviembre de 2026 · Frontend

- Responsable: Jesús Aldahir Hernández Medina, con apoyo de Stephanie.
- Revisión de T-093: Valeria. **Todavía no hay revisiones ni validaciones registradas.**
- Este informe no marca nada como aprobado por la biblioteca ni por otras personas.

## Acceso a fuentes

| Fuente | Acceso |
|---|---|
| Jira | **Sin acceso.** No se cambió ningún estado, fecha, estimación ni responsable. |
| Lista oficial (Sheets) y diagrama (Drive) | **No revisados**, porque piden iniciar sesión en Google. La matriz de abajo se armó con el texto de la tarea. |
| Figma `g2RddLfdNhbEoKIY2l45PA` | Disponible. Se usó solo para leer y tomar capturas. No se editó. |

## Verificación técnica

- Comandos: `tsc -b` sin errores, `npm run lint` sin errores y `npm run build` correcto.
- Pruebas: `vitest` con **275 aprobadas y 1 omitida** (35 archivos).
- Prueba nueva: `tests/unificacion.test.ts`. Revisa que haya una sola entrada de menú y que la ruta anterior redirija. También revisa las capacidades, las acciones de Fuentes según su estado y la búsqueda.

## Frente 1 · T-093: prototipos de inscripciones, asistencia y avisos

- **Estado: Pendiente de validación con la biblioteca. No se cierra.**
- Antes: los marcos ya estaban en Figma.
  - Inscripciones `569:26405`: 16 estados.
  - Asistencia `570:24905`: 11 estados.
  - Avisos `578:39911`: 13 estados.
- Hecho: se auditaron los marcos y se escribió la guía de validación en [GUIA-VALIDACION-T093.md](GUIA-VALIDACION-T093.md). La guía tiene 12 escenarios, 11 preguntas, las dependencias y enlaces a cada marco.
- Hecho: se revisaron marco por marco las pantallas del usuario A-02: Notificaciones `476:13270` (4 marcos) y Eventos `476:11135` (19 marcos).
  - **Diferencia encontrada:** el panel tiene lista de espera y «Ofrecer lugar», pero la persona usuaria lee «No hay lista de espera automática» (`476:12366`). Tampoco hay notificaciones de lugar ofrecido, inscripción confirmada ni cancelación por la biblioteca. Quedó como pregunta para la biblioteca.
- Hecho: se midió el contraste en las páginas programadas a las que entra la cuenta autorizada.
  - El Resumen del panel no tiene fallas.
  - Las etiquetas doradas `#e6d194` sobre el verde `#1f6b5c` daban 4.20 a 1, y se pide 4.5.
  - **Corregido por decisión de Aldahir:** esas etiquetas usan ahora `#f2e3b8` (4.96 a 1) en 9 reglas de CSS. Se revisaron 26 páginas públicas y ya no queda ninguna etiqueta dorada por debajo de lo mínimo. En Figma el color sigue igual.
- **Decisiones de Aldahir aplicadas en Figma (9 nov).** La biblioteca no las ha validado:
  - Sin lista de espera:
    - 7 marcos marcados como DESCARTADO: 3 del panel y 4 de «Estados del sistema» del usuario.
    - En Inscripciones del panel, 15 elementos ocultos (la columna «ESPERA», los filtros y los botones) y 10 textos ajustados.
    - No se borró nada.
  - Cupo lleno: se agregó la nota «Regresa más tarde…» en `476:12703` (nodo `834:92933`).
  - La asistencia en el perfil ya existía (`476:24107`, «Asistidos» y «Asistencia registrada»).
- **El código todavía tiene la lista de espera y no se cambió:**
  - Panel: `actividades/Inscripciones.tsx`, `inscripciones.ts` y `GestionInscripcion.tsx`.
  - Usuario: `publico/eventos/DetalleActividad.tsx` y `datosAgenda.ts`, con «Anotarme en lista de espera».
  - Hay que alinearlo con la decisión.
- No hecho:
  - Las notificaciones que faltan en A-02 (inscripción confirmada, cancelación por la biblioteca, cambio de cupo y aviso retirado) siguen sin decidirse.
  - No se midió el contraste del panel de Inscripciones, Asistencia y Avisos: la cuenta de editor no tiene esos permisos.
  - No se programaron flujos nuevos.

## Frente 2 · Unificación de Bibliocomunidad

| Criterio | Estado | Dónde |
|---|---|---|
| «Bibliocomunidad» en títulos, navegación, migas y accesos | Cumplido | `ClubAlameda.tsx`, `servicios/datos.ts`, `DetalleServicio.tsx`, `participantes/Foro.tsx` |
| No cambiar el libro «Cuentos de la Alameda» | Cumplido (no se tocó) | — |
| Una sola entrada administrativa: Participantes → Bibliocomunidad | Cumplido | `menu.ts` (en la entrega anterior) y `tests/unificacion.test.ts` |
| Pestañas Respuestas, Normas y Personas silenciadas | Cumplido. «Publicaciones» pasó a «Respuestas», según `574:30186` | `participantes/Foro.tsx` |
| Retirar el acceso duplicado de Atención | Cumplido. La ruta anterior redirige a `/admin/participantes/foro` | `App.tsx`, `rutasAnteriores.ts` (nuevo) |
| Visitante: el acceso lleva al inicio de sesión | Cumplido. Vista de visitante según A-01 `280:1065` | `ClubAlameda.tsx` (`BibliocomunidadVisitante`), `ClubAlameda.css` |
| Con sesión activa se abre el foro | Cumplido. Captura con la cuenta de editor (`bibliocomunidad-sesion-1920.png`) | `ClubAlameda.tsx` |
| Quitar «Próximamente» y la exigencia de credencial | Cumplido | `servicios/datos.ts`, `perfil/datos.ts` (se quitó la preferencia «próximamente») |
| Conservar identificadores, datos, endpoints y permisos | Cumplido. La URL `/club-alameda` y las capacidades se conservan | — |

**Dependencia:** la moderación de Participantes usa datos de ejemplo (`moderacion.ts`). La pantalla que usaba el endpoint real `/v1/admin/bibliocomunidad` era la de Atención, que ya no se puede abrir.
- Pasa lo mismo con las solicitudes de `SolicitudBibliocomunidad` (registro de interés): ya no tienen pantalla en el panel.
- Los titulares del backend y del panel deben decidir si la moderación se conecta a ese endpoint.

## Frente 3 · Ajustes visuales del panel

- **Antes (cambios locales sin commit):** había 24 archivos con el bloque de encabezados y regreso de A-05, referencia `558:16567`. Se conservaron sin cambios.
- **Hecho en `Panel.css`:**
  - Los accesos rápidos tienen una franja guinda compacta.
  - Las tarjetas del resumen ocupan columnas iguales, una por tarjeta, con la misma altura.
  - Debajo de 900 px se acomodan en 2 columnas.
- Se quitó la regla `.ad-resumen`, que ya no se usaba.
- Referencias de Figma guardadas en `capturas/figma/`:
  - Resumen `358:3838`.
  - Bibliocomunidad (admin) `574:30186`.
  - Avisos `578:39912`.
  - Configuración `580:56316`.
- **Resumen, capturado con el backend encendido y la cuenta de editor:** `panel-resumen-1920.png` y `panel-resumen-1280.png`.
  - Comparado con Figma `358:3838`: las 4 tarjetas de prioridades miden lo mismo, y la tabla, las pestañas y las tarjetas laterales coinciden.
  - Diferencias que se deben al rol: el menú solo muestra Contenidos y Administración, y «Roles de la cuenta» solo dice Editor. Figma muestra la cuenta con acceso total.
  - Diferencia de texto: la etiqueta dice «DATOS DE EJEMPLO» y Figma dice «Actualizado hoy a las 08:40 (ejemplo)». No se cambió.
  - Desbordes: la página no se sale de lo ancho a 1280 ni a 1920 px. A 1280 px, la tabla de pendientes se desplaza dentro de su recuadro (la columna «Acción» queda a la derecha). Es una región con foco y nombre, así que se puede recorrer con teclado.
  - Teclado: con Tab se recorren el menú, «Ver portal público», la campana, las pestañas, el buscador, la tabla, «Abrir» y «Ver todos los pendientes». Todos muestran el foco.
  - **Ajuste decidido por Aldahir (9 nov):** antes, una cuenta sin permiso para una sección veía tarjetas de prioridades y botones «Abrir» o «Pasar lista» que parecían enlaces pero no hacían nada. Ahora no se muestran.
    - Si la cuenta no tiene ninguna prioridad que pueda atender, la franja «Prioridades de hoy» completa no aparece. Es el caso del editor en las capturas.
    - Las filas de la tabla se conservan; solo se quita su botón.
    - Una pantalla que todavía no existe conserva el aspecto «Sección en desarrollo».
    - Cambio en `resumen/Resumen.tsx` y `resumen/datos.ts` (`vistaEnlace`). Pruebas en `tests/unificacion.test.ts`.
- **Bloqueado por permisos:** Bibliocomunidad del panel (`/admin/participantes/foro`), Avisos, Configuración y Fuentes.
  - Con la cuenta de editor responden «Tu cuenta no tiene el permiso necesario para esta sección».
  - Hace falta una cuenta de prueba autorizada con esos permisos. No se desactivó la autenticación.
- Se comprobó que `/admin/atencion/bibliocomunidad` redirige a `/admin/participantes/foro`.

## Frente 4 · Fuentes del asistente (HU-31)

- **Contrato disponible** (`/v1/admin/rag/fuentes`):
  - Listar, con filtros de estado, tipo y página.
  - Crear, solo con texto.
  - Aprobar o devolver (solo administrador), activar, retirar y versión.
- **Hecho:**
  - `servicios/fuentes.ts`: filtro por tipo y campos opcionales.
  - `comunidad/reglasFuentes.ts` (nuevo): qué acciones permite cada estado, textos de confirmación y búsqueda.
  - `Fuentes.tsx`: ventanas de confirmación, filtros y un detalle con origen, versión, si está activa, aprobación y fechas.
  - Los mensajes aclaran que una fuente aprobada no se activa sola.
- **Bloqueado, porque el backend no tiene endpoint para:**
  - Subir archivos PDF o DOCX (el límite de 20 MB no está confirmado).
  - Desactivar una fuente sin retirarla.
  - Sincronizar.
  - Probar el asistente.
  - Ver el estado de procesamiento.
  - Además, no se puede comprobar que una fuente retirada deje de usarse en las respuestas, porque el asistente es simulado y no hay consulta RAG.
- No se simuló ninguna de estas funciones.

## Frente 5 · Notificaciones

- **Lo que ya había:**
  - Bandeja del usuario (`publico/notificaciones/`): estado en memoria, con un `TODO backend`.
  - Bandeja del panel (`admin/notificaciones/`): guarda en `sessionStorage`.
  - En las dos, el contador de la campana coincide con la lista y solo se borran las leídas. Las pruebas ya existían.
- **Hecho:** el texto de la confirmación del panel ahora aclara que las pendientes se conservan y que ninguna solicitud ni inscripción cambia.
- **Bloqueado:** no se puede guardar por persona ni mostrar estados reales de carga y error.
  - Existe la tabla `avisoNotificacion`, pero no hay endpoints.
  - Se necesitan: `GET` para la lista de la persona, `PATCH` para marcar como leída (una o todas) y `DELETE` para quitar las leídas.
  - Mientras tanto, no se reemplazó la persistencia real con `localStorage`.

## Capturas

| Archivo | Muestra |
|---|---|
| `capturas/bibliocomunidad-visitante-1920.png` | Vista de visitante. Coincide con A-01 `280:1065`. |
| `capturas/bibliocomunidad-visitante-1280.png` | La misma vista a 1280 px. |
| `capturas/bibliocomunidad-sesion-1920.png` | Foro con sesión iniciada (cuenta de editor). |
| `capturas/panel-resumen-1920.png` y `panel-resumen-1280.png` | Resumen del panel con la cuenta de editor. |
| `capturas/figma/*.png` | Referencias de Figma del Frente 3. |

## Material para la revisión de Valeria y la validación de la biblioteca

- [GUIA-VALIDACION-T093.md](GUIA-VALIDACION-T093.md): escenarios, pasos, resultados esperados y preguntas.
- Las capturas de arriba.
- Las pruebas: `tests/unificacion.test.ts`, `tests/notificaciones.test.ts` y `tests/notificacionesUsuario.test.ts`.

## Resumen para Jira o PR (no enviado)

> **Frontend · 9 nov 2026**
> - **Bibliocomunidad unificada:** nombre visible en todo el portal y el panel, una sola entrada (Participantes → Bibliocomunidad) con redirección desde la ruta anterior, vista de visitante con acceso al inicio de sesión y sin exigir credencial.
> - **Panel:** la franja de accesos rápidos y las tarjetas del resumen tienen columnas iguales.
> - **Fuentes (HU-31):** ventanas de confirmación, filtros, detalle y reglas por estado, dentro del contrato actual. La subida de archivos y la sincronización dependen del backend.
> - **Notificaciones:** se aclaró el texto. La persistencia por persona depende de los endpoints de `avisoNotificacion`.
> - **T-093:** guía de validación lista, **pendiente de validación con la biblioteca** (no se cierra).
> - **Verificación:** tsc, lint y build sin errores; 275 pruebas aprobadas.
