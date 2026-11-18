# Reparto de trabajo entre agentes (frontend)

Este archivo dice qué hace cada terminal que trabaja en `Front/` al mismo tiempo, para no pisarse.
**Léelo completo antes de cambiar algo**, y después `Front/AVANCES_ALDAHIR.md` (estado, estructura y convenciones).
El orquestador (T1) mantiene este archivo; las demás terminales no lo editan: si necesitan un cambio, se lo piden a Aldahir.

## Reglas para todas las terminales

- Todo en **español**: código, nombres, comentarios y respuestas. Solo escritorio (1280 a 1920 px), fuente Noto Sans.
- **Solo frontend:** nadie de estas terminales hace backend (`Back/`, `Supabase/`).
- **No hagas commits ni pushes**: los hace Aldahir. **No edites `AVANCES_ALDAHIR.md`**: di qué agregar. Única excepción: T2 escribe ahí la sección «Relevo para opencode» cuando se le está acabando el uso.
- Trabaja **solo en tus carpetas** (tabla de abajo). Si necesitas tocar un archivo compartido, pregunta primero.
- Archivos compartidos y quién los cuida:
  - `src/App.tsx`: cualquiera puede **agregar** sus rutas; nadie reordena ni cambia rutas ajenas.
  - `src/servicios/accesoPanel.ts`: cualquiera puede **agregar** la capacidad de sus rutas en `capacidadPanel()`; el resto, solo T1.
  - `src/pages/admin/PanelLayout.tsx`, `Panel.css`, `menu.ts`, `componentes.tsx`, `Ventana.tsx`, `AccesoPanel.tsx`: **solo T1**.
  - `src/components/portal/*` (PaginaPublica, Portal, Navegacion…): **solo T1**.
- Datos que todavía no da el backend: en el `datos.ts` de tu pantalla, con `TODO backend` que diga qué se espera.
- Nada de claves secretas en el frontend; todo pasa por `/api` con `pedirApi()`.
- Antes de agregar una imagen, revisa con md5 que no exista. Compartidas en `src/assets/comun/`, exclusivas en `src/assets/<pantalla>/`.
- Al terminar una tarea: `npm run lint`, `npm test` y `npm run build` sin errores **en tus archivos**, y un resumen con los pasos para probar.
- Procesos: usa solo tus puertos, apaga solo tus procesos confirmando el PID. Nunca `taskkill /T` con filtros amplios.
- Backend local: `.\.venv\Scripts\python.exe -m uvicorn Back.main:app --reload` desde la raíz (puerto 8000). Para entrar al panel hay que iniciar sesión con una cuenta del personal y usar sus permisos reales; `VITE_PANEL_COMPLETO` ya no existe.

## Guía de diseño (obligatoria)

- Antes de diseñar o cambiar cualquier pantalla, lee y sigue **`docs/guia-diseno.md`**: colores, escala, piezas que se reutilizan,
  carga/vacío/error y lo prohibido. Su prompt sirve para cualquier terminal. Si una pantalla se ve distinta, se ajusta a la guía.
- **Botones y enlaces solo con texto, sin íconos** (decisión de Aldahir, 17 nov 2026): botones principales y secundarios,
  pastillas («Crear cuenta») y enlaces («Volver a iniciar sesión», «¿Olvidaste tu contraseña?») no llevan íconos de ningún tipo,
  ni flechas de texto (→ ←, «Ver todas →», «← Volver»). Excepciones: el ícono de carga que gira mientras se envía y el ojo de «Mostrar» en los campos de contraseña.
  Los íconos van fuera de los botones (encabezados de tarjeta, recuadros de ayuda, estados vacíos).

## Diseño del panel de administración

- El panel se rehace **según Figma** (archivo `g2RddLfdNhbEoKIY2l45PA`, sección «Panel de administración · cuenta con acceso total (A-05)», `357:3835`).
- Se **normaliza** como el portal público: Figma a 1920 px se ve grande, así que se reducen tamaños para que sea cómodo al desplazarse.
  Menú lateral **fijo**; solo el contenido tiene scroll. Usa la escala del armazón (`Panel.css`) para títulos, tarjetas, botones, chips y tablas: **la misma en todas las secciones**.
- Envuelve cada pantalla en `<PanelLayout titulo="…">`. El menú se arma solo desde `menu.ts`: un subítem se activa cuando su ruta tiene capacidad en `accesoPanel.ts`.

## Terminales

| Terminal | Herramienta | Figma | Puertos (Vite / navegador) |
|---|---|---|---|
| **T1 · Orquestador** | Claude Code | Sí | 5175 / 9334 |
| **T2 · Panel (Administración)** | Claude Code | Sí | 5174 / 9333 |
| **T3 · Integración y calidad** | opencode | **No** | 5176 / 9335 |
| **T4 · Actor 2 (usuario con sesión)** | Claude Code | Sí | 5177 / 9336 |

### T1 · Orquestador (Claude Code)
- Carpetas: `src/pages/admin/` (armazón, `resumen/`, `notificaciones/`, `perfil/`, `atencion/`), `src/assets/admin/` (excepto `contenidos/` y `actividades/`), `src/components/`, `docs/figma/`.
- Tareas, en orden:
  1. Normalizar el armazón del panel: menú fijo, scroll solo en el contenido, escala de tamaños común.
  2. Admin · Notificaciones (`632:58443`) y Admin · Perfil (`633:58447`).
  3. Admin · Atención (`632:57630`): rediseñar Credenciales, Espacios y Propuestas; nuevas: Contactos y sugerencias, Bibliocomunidad, Altas asistidas, Recuperación asistida, Consulta de cuentas, Avisos.
  4. Preparar **fichas de Figma** para T3 (ver abajo) y revisar lo que entreguen T2 y T3.

### T2 · Panel (Claude Code)
- Carpetas: `src/pages/admin/contenidos/`, `actividades/`, `participantes/` y la nueva `src/pages/admin/administracion/`; sus carpetas en `src/assets/admin/` y sus pruebas (`tests/contenidos.test.ts`, `tests/actividades.test.ts`, `tests/participantes.test.ts`, `tests/administracion.test.ts`).
- Ya hecho: Contenidos (`591:48349`), Actividades (`602:49977`) y Participantes (`629:50564`). Sigue cuidando esas carpetas si hay correcciones.
- **Admin · Administración** (`632:58445`) terminada y revisada por T3:
  1. Cuentas y permisos (`580:39283`) → `/admin/administracion/cuentas`, conectada al backend.
  2. Fuentes del asistente (`580:45266`) → `/admin/administracion/fuentes`; conserva la conexión de `src/pages/admin/comunidad/Fuentes.tsx`.
  3. Estadísticas (`580:49970`) → `/admin/administracion/estadisticas`.
  4. Bitácora de cambios (`580:53590`) → `/admin/administracion/bitacora`.
  5. Configuración del portal (`580:56315`) → `/admin/administracion/configuracion`.
  6. Estados del sistema (`583:45547`) → `/admin/administracion/estados`.
- Las pantallas ya usan la escala común del armazón normalizado. Estadísticas, Bitácora y Configuración siguen con los datos de ejemplo y `TODO backend` documentados en `administracion/datos.ts`.

### T3 · Integración y calidad (opencode, sin Figma)
- **No inventes diseño.** Si una tarea necesita cómo se ve algo, usa la ficha de `docs/figma/` o pregunta.
- Carpetas: `src/servicios/` (excepto `accesoPanel.ts`, solo agregar), `tests/`, y las pantallas que se te asignen por ficha.
- **Solo frontend.** No toques `Back/` ni `Supabase/` ni hagas tareas de backend: eso lo hace el equipo de backend.
- Tareas, en orden:
  1. **Relevo de T2:** si T2 se queda sin uso, deja la sección «Relevo para opencode» en `AVANCES_ALDAHIR.md`. Síguela al pie de la letra y trabaja en las carpetas de T2 que ahí se indiquen.
  2. **Pruebas** (vitest) para la lógica de `datos.ts` y `servicios/` que todavía no tenga.
  3. **Revisión de accesibilidad y calidad** de las páginas públicas: `alt`, foco con teclado, `aria-*`, contraste. Reporta lo que encuentres; corrige solo en archivos que no sean de T1 ni T2 (si no, repórtalo).
  4. **Pantallas por ficha**: cuando T1 deje una ficha en `docs/figma/<area>/`, prográmala siguiendo la ficha al pie de la letra.

### T4 · Actor 2: usuario con sesión iniciada (Claude Code)
- Figma: «Usuario cliente — sesión iniciada (A-02)» (`476:9982`). **No uses** la sección «RESPALDO · Usuario cliente — versión anterior» (`335:5473`).
- Secciones: Inicio (`476:20739`), Credencial (`476:9983`), Eventos y actividades (`476:11135`), Notificaciones (`476:13270`), Noticias (`476:14616`), Lecturas, reseñas y catálogo (`476:15774`), Contacto y sugerencias (`476:17230`), Asistente (`476:18280`), Servicios y programas (`476:22566`), Perfil · persona adulta (`476:22959`), Perfil · persona menor de edad (`476:26155`), Espacios y agenda (`476:28195`), Proponer una actividad (`476:29028`), Acerca de (`495:15865`) y Estados del sistema (`585:51342`). La ficha del actor está en `476:13269`.
- Carpetas: las pantallas con sesión de `src/pages/publico/` (por ejemplo `perfil/` y las vistas de usuario de credencial, eventos, espacios y notificaciones) y sus pruebas. Lo compartido del portal (`src/components/portal/*`) sigue siendo de T1: si necesitas cambiarlo, pídeselo.
- Muchas páginas son las mismas del visitante con la sesión iniciada: **reutiliza** la página pública y agrega solo lo que cambia con sesión. No dupliques páginas.

## Fichas de Figma (para quien no puede abrir Figma)

T1 las deja en `Front/docs/figma/<area>/<pantalla>/`:
- `captura.png`: la pantalla tal como está en Figma.
- `ficha.md`: textos exactos, colores, medidas **ya normalizadas**, estados, interacciones, íconos (con su ruta en `src/assets/`) y la ruta de la página.
Los íconos de la ficha ya vienen descargados en `src/assets/`. Si algo no está en la ficha, pregunta antes de inventarlo.

## Estado actual

- Hecho: portal público completo, asistente (RAG simulado), estados del sistema, armazón del panel según Figma y Resumen (`/admin/resumen`).
- Hecho (T2): Contenidos (el Editor y la Revisión conectados los integró Roberto; la versión simulada quedó en `contenidoDemo/`) y Actividades completo (7 secciones).
- Hecho (T2, 3 nov 2026): Participantes completo en `src/pages/admin/participantes/`:
  - Progreso y recompensas (`/admin/participantes/progreso`), Cotejo de credenciales (`/cotejo`) y Moderación del foro (`/foro`), con datos de ejemplo y `TODO backend`.
  - Simulaciones en desarrollo: `?simular=error-entrega`, `?simular=sin-sistema` y `?simular=error-decision`. Pruebas en `tests/participantes.test.ts`.
  - El archivo de datos del foro se llama `moderacion.ts` (no `foro.ts`), porque en Windows chocaba con `Foro.tsx`; lo mismo con `cotejos.ts`.
- Hecho (T2, 3 nov 2026, a pedido de Aldahir): estado «Sin información publicada» en Acerca (`src/pages/publico/acerca/`). T1: revisar que coincida con Figma.
- Hecho (T1, en código): Notificaciones y Atención, incluidas Credenciales, Espacios, Propuestas, Contactos y sugerencias, Altas asistidas, Recuperación asistida, Consulta de cuentas y Avisos.
- Hecho (T2): las seis pantallas de Administración tienen rutas, permisos y pruebas. Cuentas y Fuentes conservan su conexión al backend; Estados del sistema incluye su catálogo y vistas previas.
- Hecho (T3, 17 nov 2026 · relevo e integración de T1/T2):
  - Revisó las rutas y permisos del panel y agregó cobertura para Resumen, Notificaciones, Administración, Progreso y Moderación. `tienePanel()` ya acepta `registrar_recompensas` y `moderar_foro`.
  - El acceso a la cuenta de la cabecera abre el perfil conectado ya existente en `/mi-perfil`; no se duplicó la pantalla de perfil.
  - El pie institucional y la nota del panel los renderiza una sola vez `PanelLayout`; el antiguo `<PieDatos />` quedó sin salida para no repetirlos en pantallas heredadas.
  - Eliminó la referencia obsoleta a `VITE_PANEL_COMPLETO` de la documentación y de los tipos de entorno.
  - Unificó los íconos repetidos en `assets/comun/iconos/`, después de comprobar sus MD5, y eliminó las dos copias sin referencias.
  - Agregó «Reintentar» a los estados de error de Estadísticas y Bitácora sin alterar sus datos ni servicios.
  - Verificación: `npm run lint` sin errores, **340 pruebas aprobadas y 1 omitida**, y `npm run build` exitoso.
- En curso: T4 · Actor 2 (`476:9982`).
- Pendientes que dependen del backend, no de nuevas pantallas frontend: Estadísticas, Bitácora y Configuración (`administracion/datos.ts`), Resumen y Notificaciones del panel, y Recuperación asistida conservan datos de ejemplo señalados con `TODO backend`.
- 3 nov 2026: `main` y `Aldahir` ya tienen la organización de carpetas corregida después del merge.
