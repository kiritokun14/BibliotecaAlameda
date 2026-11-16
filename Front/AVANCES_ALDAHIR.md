# Avances de Aldahir: frontend del portal público

Última actualización: 9 de noviembre de 2026 · Rama: `Aldahir`

Este archivo explica a cualquier persona o agente qué se está haciendo en el frontend de Aldahir, qué ya está hecho y qué falta en cada tarjeta del sprint. Léelo completo antes de cambiar algo.

> **Importante:** lo que va hasta el commit `bb00043` ya está en la rama. La entrega del 9 de noviembre (sección 4, al final) **todavía no tiene commit**. Antes de hacer otra cosa, revisa `git status` y pregunta a Aldahir si ya quiere hacer el commit.

---

## 1. Forma de trabajar con Aldahir

- Aldahir **solo hace frontend**; el backend (FastAPI en `Back/`) lo hacen Roberto, Luis, Stephanie y Valeria.
- Todo se escribe y explica **en español**: código, nombres, comentarios y respuestas.
- **Por pasos:** se genera el código de un paso y se le dan instrucciones para probarlo (`npm run dev`, qué revisar y con qué tamaño de pantalla). Él revisa y pide ajustes.
- **Solo escritorio:** hay que ajustar de 1280 a 1920 px, centrado. **No hagas la versión de celular ni de tableta**; Aldahir la diseñará después.
- **Figma es la referencia:** se copia el diseño, pero se **normaliza con Inicio**, con los mismos tamaños, bloques, botones y tipografía. Inicio es el modelo a seguir.
- Si un dato viene de backend y aún no existe, deja datos de ejemplo en un `datos.ts` con un comentario `TODO backend` que diga qué se espera.

## 2. Cómo correr y probar

```
cd Front
npm run dev     # http://localhost:5173 (sin backend también funciona: se ve como visitante)
npm run lint
npm test        # vitest: 275 pruebas aprobadas y 1 omitida (9 nov 2026)
npm run build
```

- El backend local es opcional para el portal público. Para probar sesión: `.\.venv\Scripts\python.exe -m uvicorn Back.main:app --reload` desde la raíz (Vite redirige `/api` a `127.0.0.1:8000`).
- `Front/.env` tiene `VITE_KOHA_URL=` con una dirección de ejemplo. La plantilla está en `.env.example`.
- Si levantas un servidor para pruebas, usa **otro puerto** (por ejemplo 5174) y **apágalo al terminar**. Aldahir usa el 5173 con `--strictPort`. Para apagarlo, detén solo ese proceso confirmando su PID; nunca uses un filtro amplio de `netstat` con `taskkill /T`.

## 3. Figma

- Archivo: `g2RddLfdNhbEoKIY2l45PA`, página **«Diseño Libre»** (`181:1596`). Las pantallas del visitante están en la sección «Actor 1 · Visitante (A-01)».
- Las imágenes se pueden descargar con `get_design_context` y `curl`; los enlaces caducan en 7 días.
- **Algunas fotos en Figma están dañadas** (salen como ruido o en blanco). Revísalas antes de usarlas. Si una está dañada, pide `get_screenshot` del nodo o usa el recuadro «Imagen ilustrativa · por confirmar».
- **No todo está como pantalla.** Algunos estados son **variantes de componentes**. Por ejemplo, el «Ver más» de la biografía es el componente `516:15936` con la variante «Estado=Completo». Si no encuentras un estado, busca en la metadata por nombre de componente.
- A veces la conexión con el servidor de Figma se cae («MCP server connection lost»). Basta con reintentar.

## 4. Lo que ya está hecho

### Estructura común del portal público
| Archivo | Qué hace |
|---|---|
| `src/components/PaginaPublica.tsx` y `.css` | Estructura de todas las páginas públicas: «Saltar al contenido», encabezado, navegación, `<main>`, pie y asistente. También exporta `EncabezadoPublico`, la franja verde con título. |
| `src/components/Portal.tsx` y `.css` | `EncabezadoPortal` (franja guinda con logos y redes) y `PiePortal` (logos apilados con columnas de enlaces). Las pantallas de login siguen usando `Institucional.tsx`. |
| `src/components/Navegacion.tsx` y `.css` | Barra en grid `1fr auto 1fr`: los enlaces quedan al centro exacto de la pantalla. Incluye el enlace «Acerca de»; «Inicio» usa `end` y los demás enlaces se marcan también en sus subrutas. |
| `src/components/BotonAsistente.tsx` y `.css` | Asistente flotante: se arrastra con el mouse, se minimiza a una burbuja que se pega a la orilla más cercana, guarda posición y estado en `localStorage` y tiene animación de contorno dorado. Respeta la opción de reducir animaciones. Todavía no existe la página `/asistente`. |

### Inicio (`/`): rediseño de Figma, terminado
- **Portada:** «Biblioteca Solón Argüello», con tres perfiles y los botones Koha y Acerca de.
- **Lecturas:** cada libro se puede presionar (`/lecturas/:id`); el carrusel da la vuelta al llegar al final; la etiqueta «Consulta en sala» y el aviso «Ver en el catálogo».
- **Actividades:** filtros por categoría que sí filtran; tarjetas que se pueden presionar (`/eventos/:id`) con efecto al pasar el mouse.
- **Noticias:** cambio suave entre noticias.
- **Contacto:** mapa real de Google Maps (iframe sin clave de API). La búsqueda está en `BUSQUEDA_MAPA` de `Contacto.tsx`.
- **«Crea tu cuenta»:** solo aparece para visitantes. Sin backend se trata como visitante.
- **Tamaños:** reducidos para escritorio; los ajustes por ancho están al final de `Inicio.css`.
- **Datos:** todo el contenido de ejemplo está en `src/pages/inicio/datos.ts`, con `TODO backend` (`portadaUrl` de libros, `id` de lecturas y actividades).

### Catálogo Koha (`/catalogo`): terminado (HU-04)
- Botón a Koha en pestaña nueva, marcado como sitio externo, y estado «Catálogo no disponible».
- La dirección sale de `VITE_KOHA_URL` (`src/servicios/catalogo.ts`) y tiene pruebas en `tests/catalogo.test.ts`.
- Se llega en 2 clics desde Inicio.
- **Solo falta la dirección real de Koha**, que la biblioteca todavía no entrega. No es un pendiente de código.

### Acerca de (`/acerca/:seccion`): terminado (T-051)
- Las pestañas son rutas propias: `historia`, `mision-vision`, `solon-arguello` y `rol`. `/acerca` o cualquier pestaña inválida llevan a `historia`.
- **Historia:** introducción, galería y línea del tiempo de **12 etapas**. Cada una se abre y cierra, solo una a la vez, con `aria-expanded`. Las etapas 3, 6, 7, 9 y 10 muestran «por confirmar» porque su foto está dañada en Figma.
- **Solón Argüello:** semblanza con «Ver más / Ver menos», que despliega la biografía completa y agrega 2 filas a la ficha. Usa un solo botón para no perder el foco del teclado. También tiene la trayectoria y las obras.
- **Misión y visión, y Rol de la biblioteca:** completas.
- **Archivos:** `src/pages/acerca/` (`Acerca.tsx`, `piezas.tsx`, una pestaña por archivo, `datos.ts` y `Acerca.css`). Reutiliza `Bloque` y `EncabezadoSeccion` de Inicio. `EncabezadoSeccion` acepta ahora un subtítulo con `texto`.

### Servicios y programas (`/servicios`, `/servicios/:id`) — terminado (HU-01)
- Lista con grupos «Servicios» y «Programas»; tarjetas clicables (Credencial → `/credencial`, Agenda → `/espacios`, Actividades → `/eventos`, Visitas grupales → `/contacto` por ahora, Bibliocomunidad → `/servicios/bibliocomunidad`).
- Detalle de Bibliocomunidad: ya no dice «Próximamente» ni pide credencial; su botón «Entrar a Bibliocomunidad» lleva al foro (9 nov 2026).
- Estados: cargando, **error al cargar** (con «Intentar de nuevo») y **contenido no disponible**.
- **CA-01.2 resuelto en el frontend:** `soloPublicados` / `buscarPublicado` en `src/pages/servicios/datos.ts` filtran todo lo que no esté `publicado`. Hay un borrador de ejemplo (`/servicios/prestamo-a-domicilio`) que no aparece en la lista y por URL muestra «Contenido no disponible». Pruebas en `tests/servicios.test.ts`.
- Para revisar estados sin backend (solo en desarrollo): `/servicios?simular=error` o `?simular=cargando`.
- `obtenerServicios()` / `obtenerServicio(id)` simulan la API (`TODO backend`): backend debe responder solo contenido publicado y 404 para borradores.

### Páginas de visitante sin cuenta: Eventos, Credencial y Espacios (terminadas)
- Diseño según las capturas de Aldahir (`EventosSinLogin.png`, `CredencialSinLogin.png`, `EspaciosSinLogin.png`), **no** según toda la agenda de Figma: por ahora solo lo que ve un visitante sin cuenta.
- Piezas comunes en `src/components/Visitante.tsx` + `.css`: `EncabezadoVisitante` (con «Volver»), `SeccionVisitante`, `AvisoCuenta` (aviso dorado + «Sin cuenta / Con cuenta puedes»), `PasosVisitante` (con pastilla opcional «Tú / Biblioteca») y `LlamadoVisitante`. Los botones llevan a `/iniciar-sesion` y `/crear-cuenta`.
- **Eventos (`/eventos`, `/eventos/:id`, T-052 versión visitante):** `/eventos/:id` llega desde el carrusel de Inicio y muestra «Esta es la actividad que elegiste» (datos de `pages/inicio/datos.ts`). **`/eventos` sin elegir no muestra ningún evento**: invita a elegir una en Inicio; un id inexistente dice «No encontramos esa actividad». Incluye el apartado informativo «Cómo te inscribes a una actividad». La inscripción real, listados, calendario y filtros quedan para después (con sesión). Login no regresa a la actividad tras iniciar sesión (no existe ese parámetro todavía).
- **Credencial (`/credencial`):** aviso de cuenta, «¿Qué es y para qué sirve?», «¿Cómo funciona el trámite?» (4 pasos) y «Lo que necesitas y lo que debes saber». Costo y tiempos son de ejemplo.
- **Espacios (`/espacios`):** aviso de cuenta, «Cómo se solicita un espacio» y «Áreas de la biblioteca» (se pueden / no se solicitan) desde `src/pages/espacios/datos.ts` (`TODO backend`). No confundir con `pages/admin/atencion/espacios/` del panel.
- Pruebas: `tests/eventos.test.ts`, `tests/espacios.test.ts`.

### Lecturas y reseñas (`/lecturas…`): terminada, vista de visitante
- Basada en Figma **Actor 2 · Lecturas, reseñas y catálogo** (`476:15774`), sin nada de sesión (no hay acciones de usuario en estas pantallas).
- Rutas: `/lecturas` (por autor: buscar, filtros de género y orden en la URL `q`, `genero`, `orden`), `/lecturas/temas` (`?tema=`; mezcla reseñas y memoria), `/lecturas/memoria` (`?anio=`), `/lecturas/:id` (reseña) y `/lecturas/memoria/:id` (registro). `?desde=tema` cambia el botón de regreso.
- Estados: **acceso restringido** (material `privado`), **recurso no disponible** (en revisión, retirado o inexistente) y **sin resultados**. «Catálogo no disponible» ya lo resuelve `/catalogo`; «Buscar en el catálogo» abre Koha si hay `VITE_KOHA_URL`.
- Datos de ejemplo y reglas en `src/pages/lecturas/datos.ts` (`TODO backend`); pruebas en `tests/lecturas.test.ts`.
- Ojo: las tarjetas «Para leer esta semana» de Inicio enlazan a `/lecturas/lectura-1…8`, que no existen en estos datos → muestran «Recurso no disponible» hasta que backend unifique los ids.

### Panel › Contenidos › Editor de contenidos (HU-12, parte 1 de 2): terminado
- Figma `557:16084`. Rutas: `/admin/contenidos/editor` (bandeja «Mis contenidos»), `/editor/nuevo` (¿Qué quieres redactar?), `/editor/:folio` (formulario), `/editor/:folio/vista-previa` y `/editor/:folio/enviado`.
- Cuatro tipos: Noticia, Reseña, Acerca de y Memoria pública. Los campos de cada uno se definen en `src/pages/admin/contenidos/esquemas.ts` (formulario, validación y vista previa salen de ahí).
- Estados: borrador → por autorizar → (con observaciones) → publicado / rechazado. Solo se editan borradores y con observaciones; lo demás abre la vista de consulta.
- Pantallas de estado: faltan campos obligatorios, error al guardar (con Reintentar; se simula con `?simular=error-guardar`), con observaciones, bandeja vacía y sin resultados. Confirmación de envío en ventana con nota opcional.
- Datos simulados en memoria (`datos.ts`, `TODO backend`); se reinician al recargar. Las imágenes no se suben: solo se valida JPG/PNG ≤ 5 MB y se guarda el nombre.
- Permisos: `/admin/contenidos/editor` exige `preparar_contenidos`; `/admin/contenidos/revision` exigirá `publicar_contenidos` (agregado en `src/servicios/accesoPanel.ts`). El menú lateral muestra Contenidos solo con esos permisos.
- Pruebas: `tests/contenidos.test.ts`.
- **Parte 2 (Revisión y publicación, `560:17409`):** ya está conectada al backend y tiene el diseño del Editor (`pages/admin/revision/`, pruebas en `tests/revision.test.ts`).

### Entrega del 9 de noviembre de 2026 (sin commit)
Informe completo: `docs/entrega-2026-11-09/INFORME.md`. Las capturas de esta entrega están en `docs/entrega-2026-11-09/capturas/`, con las referencias de Figma en `capturas/figma/`.
- **Bibliocomunidad unificada:**
  - El nombre «Bibliocomunidad» aparece en el portal y en el panel. El libro «Cuentos de la Alameda» no se tocó.
  - En el panel hay una sola entrada: Participantes → Bibliocomunidad (`/admin/participantes/foro`), con las pestañas Respuestas, Normas y Personas silenciadas.
  - La ruta anterior `/admin/atencion/bibliocomunidad` redirige a la nueva (`src/pages/admin/rutasAnteriores.ts`).
  - Página pública `/club-alameda`: un visitante ve la vista de Figma A-01 (`280:1065`) y el acceso lo lleva al inicio de sesión. Con sesión se abre el foro.
  - Se quitaron «Próximamente» y la exigencia de credencial.
- **Resumen del panel:**
  - Las tarjetas tienen columnas iguales.
  - **Las prioridades y los botones «Abrir» y «Pasar lista» se ocultan si la cuenta no tiene permiso** para esa sección (`vistaEnlace` en `resumen/datos.ts`). Si no queda ninguna prioridad, no sale la franja.
- **Fuentes del asistente (HU-31):**
  - Tiene ventanas de confirmación, filtro por tipo, búsqueda en la página y detalle. Las reglas por estado están en `comunidad/reglasFuentes.ts`.
  - Subir archivos, sincronizar y probar el asistente no tienen endpoint en el backend.
- **Notificaciones:** se aclaró el texto de «Eliminar leídas». Para guardarlas por persona faltan los endpoints de `avisoNotificacion`.
- **T-093:** la guía de validación está en `docs/entrega-2026-11-09/GUIA-VALIDACION-T093.md`.
  - **Está pendiente de validación con la biblioteca. No se cierra.**
  - No se crearon marcos nuevos en Figma.
- **Pruebas nuevas:** `tests/unificacion.test.ts`.
- **Pendiente:**
  - Capturas de Bibliocomunidad del panel, Avisos, Configuración y Fuentes. La cuenta de editor no tiene esos permisos: hace falta una cuenta de prueba autorizada.
  - Revisar el Resumen con una cuenta de acceso total.
  - Decidir si la moderación de Participantes se conecta a `/v1/admin/bibliocomunidad` (hoy usa datos de ejemplo).

## 5. Pendientes por tarjeta del sprint

Todas las tarjetas vencieron el 30 de octubre.

| Tarjeta | Estado | Qué falta |
|---|---|---|
| **BDLAG-14 · HU-04** Catálogo Koha | ✅ Hecha | Solo poner la dirección real en `.env` cuando la entreguen. |
| **BDLAG-54 · T-051** Info institucional + Koha | ✅ Casi | Revisión de Aldahir. Opcional: pantalla «Acerca de · error al cargar» (`584:47347`), útil cuando el contenido venga de backend. |
| **BDLAG-11 · HU-01** Info institucional y servicios | ✅ Hecha | `/servicios` terminada con sus estados. Falta que backend sirva el contenido real respetando «solo publicado». |
| **BDLAG-97 · T-053** Formulario de contacto (8 h) | ⬜ Sin empezar | **Página `/contacto`**: formulario, foco, validación, enviando, error, sugerencia, enviando sugerencia y enviado (Figma `283:925`, `283:1103`, `283:1292`, `283:1492`, `283:1669`, `283:1853`, `283:2031`, `283:2208`). Deja una función de servicio con tipos para que backend conecte el envío. |
| **BDLAG-56 · T-052** Agenda pública (20 h, la más grande) | 🟡 Parte de visitante hecha | `/eventos` y `/eventos/:id` en versión visitante (ver arriba). Lo que requiere sesión (inscribirse, cupos reales, listados con filtros, calendario; Figma `547:29679` a `547:33519`) queda para cuando Aldahir lo pida. |
| **BDLAG-22 · HU-12** Autorizar, publicar y retirar contenido | ✅ En código | Revisión y publicación conectada al backend con el diseño del Editor. Falta la prueba manual de Aldahir. |
| **BDLAG-140 · T-048** Prototipos | No es código | Validar el Figma con la biblioteca y adjuntar evidencia. |
| **T-093** Prototipos de inscripciones, asistencia y avisos (sprint 5) | 🟡 Pendiente de validación con la biblioteca | La guía está lista, con la revisión de las pantallas A-02 y el contraste medido. Decisiones de Aldahir (9 nov), ya aplicadas en Figma: no hay lista de espera (sus marcos quedaron como DESCARTADO), el cupo lleno pide regresar después y la asistencia se ve en el perfil. En el código, las etiquetas doradas pasaron a `#f2e3b8` para cumplir el contraste. Falta que la biblioteca valide esto y quitar la lista de espera del código. No se cierra sin esa validación. |

Las fechas, estimaciones y estados oficiales se ven en Jira. Este archivo no los cambia.

### Pendientes chicos que ya existen en el código
- **Rutas que todavía no existen** (hoy te regresan a Inicio): `/noticias` (en curso en otra terminal) y `/asistente`.
- **Redes sociales:** no tienen enlace porque la biblioteca no ha confirmado sus cuentas.
- **Información del pie:** «Declaración de accesibilidad», «Términos» y «Alerta» son solo texto, sin página.
- **Admin › Resumen:** usa datos de ejemplo (`TODO backend` en `resumen/datos.ts`). Ya oculta los accesos para los que la cuenta no tiene permiso.

## 6. Convenciones

- **Componentes:** un archivo por sección. Clases CSS en español con estilo BEM (`bloque__elemento--variante`). Los comentarios explican el porqué.
- **Imágenes e íconos:**
  - Van en `src/assets/<pantalla>/`.
  - **Regla acordada a futuro:** los íconos que se repiten van en `assets/comun/iconos/` y los logos en `assets/comun/logos/`; hoy están en `assets/portal/`. Lo existente no se mueve hasta después del sprint.
  - Antes de agregar una foto, revisa que no esté repetida (por ejemplo con `md5sum`).
- **Accesibilidad:**
  - Contorno dorado al navegar con teclado.
  - Imágenes decorativas con `alt=""`.
  - Botones que abren o cierran algo llevan `aria-expanded` y `aria-controls`.
  - `hidden` necesita además una regla `[hidden] { display: none; }` cuando el elemento tiene su propio `display`.
- **Especificidad:** `.pagina-inicio p, h1, h2, h3 { margin: 0 }` le gana a una sola clase. Si necesitas margen en un `p` o `h3`, antepón el contenedor, por ejemplo `.acerca .mi-clase`.
- **Seguridad:**
  - Nada de claves secretas en el frontend; solo `VITE_*` públicas.
  - Los enlaces externos llevan `target="_blank" rel="noopener noreferrer"`.
- **Verificación visual:** para comprobar la interfaz se usaron Edge en modo sin ventana y el protocolo de herramientas de desarrollo (puerto 9333) con scripts de Node. Las capturas de trabajo no se guardan en el repositorio; solo las de una entrega, en `docs/entrega-<fecha>/capturas/`.
