# T-093 · Guía de validación: inscripciones, asistencia y avisos

> **Estado: Pendiente de validación con la biblioteca.**
> Este documento es material de revisión. Nadie de la biblioteca ni del equipo lo ha aprobado todavía.
> Titular: Jesús Aldahir Hernández Medina. Apoyo: Stephanie. Revisión: Valeria. Ninguna revisión está registrada aquí.

Archivo de Figma: `g2RddLfdNhbEoKIY2l45PA`. Fecha de preparación: 9 de noviembre de 2026.

## 1. Insumos de T-092 (predecesora)

| Insumo | Disponible | Nota |
|---|---|---|
| Lista oficial (Google Sheets, fila 95) | **No revisado** | Hace falta iniciar sesión en Google. No se consultó. |
| Diagrama de dependencias (Drive) | **No revisado** | También hace falta iniciar sesión. |
| Jira (HU y estados) | **Sin acceso** | No se cambiaron fechas, estimaciones, responsables ni estados. |
| Figma, panel A-05 y usuario A-02 | Sí | Los marcos ya existen (ver la sección 2). |

Como no se revisó la lista oficial, **no se sabe qué criterios exactos exige cada HU**. Los estados de abajo salen de lo que ya está en Figma, no de la HU.

## 2. Pantallas que ya existen (se reutilizan)

En esta entrega no se crearon marcos nuevos en Figma. Los recorridos que piden las HU de inscripciones, asistencia y avisos ya tienen sus estados dibujados:

### Inscripciones y cupos (`569:26405`)
- Lista de actividades `569:26406`. Inscritos `569:26920`. Ficha de inscripción `569:27860`. Lista de espera `569:27395`.
- Inscribir persona `569:29020`, que termina en Persona inscrita `569:29927`. Cupo completo `569:29468`.
- Ajustar cupo `569:28301`, que termina en Cupo ajustado `625:50258` o en Error al guardar cupo `625:50410`.
- Ofrecer lugar `569:28421`, que termina en Lugar ofrecido `569:28524`.
- Cancelar inscripción `569:28939`, que termina en Inscripción cancelada `624:51437`.
- Sin actividades `569:30342`. Sin resultados `569:30589`.

### Asistencia (`570:24905`)
- Hoy `570:24906`. Pasar lista `570:25383`. Error al guardar `570:25860`.
- Confirmar cierre `570:26348`, que termina en Lista cerrada `570:26467`. Detalle de lista cerrada `570:26909`.
- Corregir asistencia `570:27370`. Agregar persona sin inscripción `570:27478`. Resumen `570:27596`.
- Sin actividades hoy `570:28074`. Sin resultados `570:28284`.

### Avisos (`578:39911`)
- Lista `578:39912`. Vacía `578:40338`. Sin resultados `578:40569`.
- Nuevo aviso `578:40802`. Faltan datos `578:41193`. Vista previa `578:41586`. Borrador guardado `655:53308`.
- Confirmar publicación `578:41947`, que termina en Aviso publicado `578:42014` o en Error al publicar `655:53465`.
- Detalle `578:42361`. Retirar aviso `578:42733`, que termina en Aviso retirado `578:42808`.

### Lado de la persona usuaria (A-02), revisado el 9 de noviembre
**Notificaciones (`476:13270`):**
- Lista `476:13271`, panel de la campana `476:13433`, vacío `476:14343` y confirmar eliminar leídas `476:14444`.
- Las notificaciones de ejemplo son:
  - «Tu inscripción quedó registrada… El personal confirmará tu lugar».
  - «Hay una actividad con inscripción abierta».
  - «Aviso institucional».
  - También hay avisos de propuesta, espacio y credencial.
- La pantalla aclara que eliminar una notificación «no cancela tu solicitud ni tu inscripción», y que no se envían SMS ni mensajes de WhatsApp.

**Eventos y actividades (`476:11135`):**
- Lista, todas, calendario y vista en lista: `476:11136`, `476:11303`, `476:11442` y `534:16014`.
- Filtros: `535:16031`, `535:16547` y `535:17063`.
- Sin resultados `476:12835`, cargando `476:13016` y sin inscripciones `476:13112`.
- Detalle con inscripción disponible `476:11794`.
- Confirmar inscripción `476:11925`, que termina en «Inscripción enviada» `476:12087`. Su texto dice: «El personal confirmará tu lugar según el cupo».
- Ya inscrito `476:12231` y Mi inscripción `476:12366`.
- Cancelar mi inscripción `476:12479` y «Cancelación no disponible · actividad iniciada» `476:12603`.
- Cupo completo `476:12703`: dice «Completo · 20 de 20» y no ofrece ninguna acción.
- Actividad cancelada `476:12925`.

**Diferencias entre el panel y la vista de la persona usuaria.** Son observaciones; no se resolvieron:
1. **Lista de espera.** El panel tiene «Lista de espera», «Ofrecer lugar» y «Lugar ofrecido» (`569:27395`, `569:28421` y `569:28524`). La persona usuaria lee en «Mi inscripción» (`476:12366`): «No hay lista de espera automática». En «Cupo completo» no hay forma de apuntarse.
   - No queda claro cómo entra alguien a la lista de espera ni cómo se entera de que le ofrecieron un lugar.
2. **Notificaciones que faltan en A-02 para los recorridos del panel.** No hay ejemplos para:
   - inscripción confirmada;
   - lugar ofrecido;
   - inscripción cancelada por la biblioteca;
   - cambio de cupo;
   - aviso retirado.
   No se sabe si la HU las exige. Ver las preguntas 1, 6 y 7.
3. **Asistencia.** No hay nada en A-02 sobre la asistencia registrada. Puede ser correcto, porque el panel aclara que confirmar una inscripción no acredita asistencia. Se deja como pregunta.

**Decisiones del titular (Aldahir, 9 nov 2026), aplicadas en Figma.** Siguen pendientes de validación con la biblioteca.
1. **No hay lista de espera.** Los 7 marcos de lista de espera no se borraron: se renombraron «DESCARTADO (sin lista de espera, 9 nov 2026) · …» y se dejaron atenuados (opacidad 0.35). Para revertirlo basta con quitar el prefijo y la opacidad.
   - Del panel: Lista de espera `569:27395`, Ofrecer lugar `569:28421` y Lugar ofrecido `569:28524`.
   - De la persona usuaria («Estados del sistema»): Cupo completo con lista de espera `585:53816`, Modal anotarme `585:53965`, En lista de espera `585:54103` y Lugar disponible `585:54252`.
   - En los demás marcos de Inscripciones del panel se ocultaron (`visible = false`, sin borrar) 15 elementos: la columna «ESPERA» de la tabla, los filtros «Lista de espera (0)» y los botones «Ver lista de espera» y «Anotar en lista de espera».
   - Se cambiaron 10 textos que mencionaban la lista de espera, por ejemplo:
     - «Con lista de espera» pasó a «Sin lugares libres».
     - El mensaje de Ajustar cupo ahora dice que los lugares nuevos quedan libres para quien quiera inscribirse.
     - El mensaje de Cancelar inscripción ahora dice que el lugar se libera y queda disponible.
     - En Cupo completo `569:29468`, el panel indica que la persona puede regresar después por si se libera un lugar.
2. **La persona usuaria ve su asistencia en su perfil.** No hizo falta cambiar nada: «Perfil · mis eventos» `476:24107` ya tiene el filtro «Asistidos (3)» y la etiqueta «Asistencia registrada».
3. **Cupo lleno: el usuario ve que está lleno y que regrese después.** En «Evento · detalle · cupo completo» `476:12703` se agregó la nota `834:92933` debajo de «Ver otras actividades»: «El cupo está lleno por ahora. Regresa más tarde: si alguien cancela y queda un lugar libre, podrás inscribirte desde aquí.»

Siguen sin decidirse las notificaciones que faltan en A-02 (inscripción confirmada, cancelación por la biblioteca, cambio de cupo y aviso retirado). Ver la pregunta 7.

## 3. Revisión de calidad sobre lo programado

Esto se revisó en el código del panel. Los marcos de Figma no se pueden probar con teclado.

| Aspecto | Observación |
|---|---|
| Identidad | Usa el tema del Editor de contenidos (`PanelLayout tema="contenidos"`). No se cambiaron colores. |
| Textos | Los textos de confirmación dicen qué pasa y qué no pasa. Ejemplo: «Las pendientes se conservan y ninguna solicitud ni inscripción cambia». |
| Foco y teclado | Las ventanas de confirmación usan `Ventana` (con `role="dialog"` y cierre con Esc). Los filtros son botones con `aria-pressed`. |
| Etiquetas | Los buscadores tienen una etiqueta oculta para lectores de pantalla («Buscar notificación»). |
| Contraste | Medido el 9 de noviembre con un script sobre las páginas ya programadas, con la cuenta autorizada y a 1440 px. Los detalles están en la sección 3.1. |
| Errores | Hay estados de error en Figma (Error al guardar, Error al publicar, Error al guardar cupo). En el código, Avisos todavía es demo. |

### 3.1 Contraste medido (WCAG AA: 4.5 a 1 para texto normal; 3 a 1 para texto grande)

Figma no tiene variables de color, así que se midió el color calculado de cada texto visible contra su fondo. Cuando el fondo es un degradado, se tomó el peor color del degradado.

| Página | Textos revisados | Resultado |
|---|---|---|
| `/admin/resumen` | 111 | Ninguno por debajo de lo mínimo. |
| `/notificaciones` | 85 | Todo cumple (\*). |
| `/eventos` | 102 | 1 falla: la etiqueta «TALLER». |
| `/eventos/:id` | 79 | 1 falla: la etiqueta «CREA TU CUENTA». |
| `/mi-perfil/eventos` | 85 | 1 falla: la etiqueta «MI PERFIL». |
| `/club-alameda` | 68 | Todo cumple (\*). |

- **Falla real, ya corregida en el código (decisión de Aldahir, 9 nov 2026):** las etiquetas pequeñas (11–13 px, negrita) en dorado `#e6d194` sobre el verde `#1f6b5c` daban **4.20 a 1**, y se pide 4.5.
  - Se revisaron 26 páginas públicas. Las etiquetas que fallaban, en 8 páginas, ahora usan `#f2e3b8`, que da 4.96 a 1 sobre el verde más claro y más sobre los verdes oscuros.
  - Reglas cambiadas:
    - `Catalogo.css` `.catalogo-tarjeta__etiqueta`
    - `Servicios.css` `__tipo` y `__enlace` de la tarjeta destacada
    - `Contacto.css` `.tarjeta-datos__etiqueta`
    - `Perfil.css` `.perfil-sobretitulo--claro`
    - `Noticias.css` `.punto-categoria--claro`
    - `Asistente.css` `.sobretitulo-asistente`
    - `Agenda.css` `.agenda-destacada__etiqueta`
    - `Visitante.css` `.llamado-visitante__sobretitulo`
  - Se volvió a medir: ya no queda ninguna etiqueta dorada por debajo de lo mínimo. Los títulos grandes en dorado ya cumplían (3 a 1) y no se tocaron.
  - **En Figma no se cambió el color.** Las etiquetas de los marcos siguen en `#e6d194`; habría que actualizarlas para que diseño y código coincidan.
- **Otras fallas encontradas fuera de las etiquetas doradas.** No se corrigieron:
  - Textos blancos al 88 % y al 70 % sobre verde en Inicio y Asistente: 4.33 y 4.01 a 1.
  - Etiquetas «Dirección», «Horario», «Teléfono» y «Correo» en `#c9bfa6` sobre guinda en Inicio: 4.23 a 1.
  - Leyenda «Imagen ilustrativa» blanca sobre gris: de 2.85 a 3.35 a 1.
- (\*) **Falso positivo:** el script marcó el botón «¿Tienes dudas? · Pregunta al asistente». El dorado claro de ese botón solo pinta su contorno animado; el texto está sobre el verde, donde el blanco da 6.3 a 1.
- **No se midió:** las pantallas del panel de Inscripciones, Asistencia y Avisos. La cuenta de prueba autorizada (editor) no tiene esos permisos. Usan el mismo tema que el Resumen, que no tuvo fallas.

## 4. Escenarios para validar con la biblioteca

Cada escenario indica: los pasos, el resultado que se espera según el prototipo y el marco donde se ve.

### Inscripciones
1. **Inscribir a una persona en una actividad con cupo.**
   - Pasos: Actividades › Inscripciones › elegir actividad › Inscribir persona › capturar datos › confirmar.
   - Se espera: aparece en Inscritos y el cupo disponible baja en 1.
   - Marcos: `569:29020` y `569:29927`.
2. **Actividad con cupo lleno.**
   - Pasos: intentar inscribir a alguien más.
   - Se espera: aviso de Cupo completo y la opción de pasar a lista de espera.
   - Marcos: `569:29468` y `569:27395`.
3. **Ofrecer un lugar liberado.**
   - Pasos: cancelar una inscripción y luego Ofrecer lugar a la primera persona de la lista de espera.
   - Marcos: `569:28939`, `569:28421` y `569:28524`.
4. **Ajustar el cupo.**
   - Pasos: subir o bajar el cupo de una actividad.
   - Se espera: confirmación, o un error comprensible si no se guarda.
   - Marcos: `569:28301`, `625:50258` y `625:50410`.

### Asistencia
5. **Pasar lista de una actividad de hoy y cerrarla.**
   - Marcos: `570:24906`, `570:25383`, `570:26348` y `570:26467`.
6. **Registrar a una persona que llegó sin inscripción.**
   - Marco: `570:27478`.
7. **Corregir la asistencia de una lista ya cerrada.**
   - Marcos: `570:26909` y `570:27370`.
8. **Falla al guardar.**
   - Se espera: no se pierde lo marcado y se puede reintentar.
   - Marco: `570:25860`.

### Avisos
9. **Crear un aviso con datos incompletos.**
   - Se espera: se indican los campos que faltan.
   - Marcos: `578:40802` y `578:41193`.
10. **Vista previa, guardar borrador y publicar.**
    - Marcos: `578:41586`, `655:53308`, `578:41947` y `578:42014`.
11. **Retirar un aviso publicado.**
    - Marcos: `578:42733` y `578:42808`.
12. **Ver lo que recibe la persona usuaria.**
    - Pasos: después de publicar un aviso o confirmar una inscripción, revisar Notificaciones (A-02 `476:13270`).

## 5. Preguntas pendientes para la biblioteca

Todas son **supuestos del prototipo**. Ninguna es un acuerdo.

1. ¿Cuántas personas puede tener la lista de espera? ¿Cuánto tiempo tiene una persona para aceptar un lugar ofrecido?
2. ¿Quién puede ajustar el cupo? ¿Se puede bajar por debajo del número de personas ya inscritas?
3. ¿Se puede registrar asistencia de alguien sin inscripción en todas las actividades, o solo en algunas?
4. ¿Hasta cuándo se puede corregir una lista cerrada? ¿Queda registro de quién hizo la corrección?
5. ¿A quién llega un aviso? ¿A todas las personas usuarias, a las de una actividad o a las de un grupo?
6. ¿Un aviso retirado debe borrarse de la bandeja de quien ya lo recibió?
7. ¿Qué notificaciones recibe la persona usuaria? ¿Inscripción confirmada, lugar ofrecido, cancelación?
Las preguntas 8 a 11 ya tienen una propuesta del titular (Aldahir, 9 nov 2026). Falta que la biblioteca la confirme.

8. ¿Existe la lista de espera? **Propuesta: no.** Ya se aplicó en Figma (sección 2).
9. Cuando el cupo está completo, ¿qué ve la persona usuaria? **Propuesta: que está lleno y que regrese después por si se libera un lugar.** Ya se aplicó en `476:12703`.
10. ¿Dónde ve la persona usuaria su asistencia? **Propuesta: en su perfil, en Mis eventos.** Ya existía en `476:24107`.
11. ¿Se ajusta el dorado de las etiquetas para cumplir el contraste? **Propuesta: sí.** Se aplicó `#f2e3b8` en el código.

## 6. Dependencias (no se resuelven desde el frontend)

- **Avisos:** el panel está en modo demo. Hace falta un contrato de backend para crear, publicar y retirar avisos y para indicar a quién llegan.
- **Notificaciones por persona:** existe la tabla `avisoNotificacion`, pero no hay endpoints. Faltan GET de la lista, PATCH para marcar leída y DELETE para quitar leídas.
- **Lista oficial y diagrama:** hay que revisarlos con sesión de Google para confirmar los criterios de las HU.

## 7. Registro

- **Observaciones:**
  - Los tres módulos ya tienen en Figma sus estados de error, vacío y sin resultados.
  - El panel y la vista de la persona usuaria no coinciden en la lista de espera (sección 2).
  - Las etiquetas doradas sobre verde no cumplen el contraste (sección 3.1).
- **Decisiones tomadas:** las del titular (Aldahir, 9 nov 2026) sobre la lista de espera, el cupo lleno, la asistencia en el perfil y el contraste (preguntas 8 a 11). La biblioteca no las ha validado. Las preguntas 1 a 7 siguen abiertas.
- **Ajustes en Figma (9 nov 2026):**
  - 7 marcos de lista de espera marcados como DESCARTADO.
  - 15 elementos ocultos y 10 textos cambiados en Inscripciones del panel.
  - Nota de cupo lleno `834:92933` en `476:12703`.
  - No se borró nada, así que todo se puede revertir.
- **Flujos nuevos:** no se programaron flujos sujetos a esta validación. T-093 **no se cierra**.
