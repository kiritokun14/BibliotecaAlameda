# Reparto de trabajo entre agentes (frontend)

Este archivo dice qué hace cada terminal que trabaja en `Front/` al mismo tiempo, para no pisarse.
**Léelo completo antes de cambiar algo**, y después `Front/README.md` (estructura y convenciones).
El orquestador (T1) mantiene este archivo; las demás terminales no lo editan: si necesitan un cambio, se lo piden a Aldahir.

## Reglas para todas las terminales

- Todo en **español**: código, nombres, comentarios y respuestas. Solo escritorio (1280 a 1920 px), fuente Noto Sans.
- **No hagas commits ni pushes**: los hace Aldahir. **No edites `AVANCES_ALDAHIR.md`**: di qué agregar.
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
- Backend local: `.\.venv\Scripts\python.exe -m uvicorn Back.main:app --reload` desde la raíz (puerto 8000). Para entrar al panel con cualquier cuenta en desarrollo: `VITE_PANEL_COMPLETO=true` en `Front/.env.development.local`.

## Diseño del panel de administración

- El panel se rehace **según Figma** (archivo `g2RddLfdNhbEoKIY2l45PA`, sección «Panel de administración · cuenta con acceso total (A-05)», `357:3835`).
- Se **normaliza** como el portal público: Figma a 1920 px se ve grande, así que se reducen tamaños para que sea cómodo al desplazarse.
  Menú lateral **fijo**; solo el contenido tiene scroll. Usa la escala del armazón (`Panel.css`) para títulos, tarjetas, botones, chips y tablas: **la misma en todas las secciones**.
- Envuelve cada pantalla en `<PanelLayout titulo="…">`. El menú se arma solo desde `menu.ts`: un subítem se activa cuando su ruta tiene capacidad en `accesoPanel.ts`.

## Terminales

| Terminal | Herramienta | Figma | Puertos (Vite / navegador) |
|---|---|---|---|
| **T1 · Orquestador** | Claude Code | Sí | 5175 / 9334 |
| **T2 · Panel (Contenidos y Actividades)** | Claude Code | Sí | 5174 / 9333 |
| **T3 · Integración y calidad** | opencode | **No** | 5176 / 9335 |

### T1 · Orquestador (Claude Code)
- Carpetas: `src/pages/admin/` (armazón, `resumen/`, `notificaciones/`, `perfil/`, `atencion/`), `src/assets/admin/` (excepto `contenidos/` y `actividades/`), `src/components/`, `docs/figma/`.
- Tareas, en orden:
  1. Normalizar el armazón del panel: menú fijo, scroll solo en el contenido, escala de tamaños común.
  2. Admin · Notificaciones (`632:58443`) y Admin · Perfil (`633:58447`).
  3. Admin · Atención (`632:57630`): rediseñar Credenciales, Espacios y Propuestas; nuevas: Contactos y sugerencias, Bibliocomunidad, Altas asistidas, Recuperación asistida, Consulta de cuentas, Avisos.
  4. Preparar **fichas de Figma** para T3 (ver abajo) y revisar lo que entreguen T2 y T3.

### T2 · Panel (Claude Code)
- Carpetas: `src/pages/admin/contenidos/`, `src/pages/admin/actividades/`, `src/pages/admin/participantes/`, sus carpetas en `src/assets/admin/` y sus pruebas (`tests/contenidos.test.ts`, `tests/actividades.test.ts`, `tests/participantes.test.ts`).
- Tareas, en orden:
  1. Admin · Contenidos (`591:48349`): Editor (`557:16084`) y Revisión y publicación (`560:17409`). CA-12.1 responsable visible; CA-12.2 sin autorización no se publica.
  2. Admin · Actividades (`602:49977`): propuestas, calendario y salas, visitas, cambios y cancelaciones, inscripciones y cupos, asistencia, evidencias privadas.
  3. Admin · Participantes (`629:50564`): progreso y recompensas, cotejo de credenciales, moderación del foro.
- Cuando el armazón normalizado de T1 esté listo, ajusta tus pantallas a esa escala.

### T3 · Integración y calidad (opencode, sin Figma)
- **No inventes diseño.** Si una tarea necesita cómo se ve algo, usa la ficha de `docs/figma/` o pregunta.
- Carpetas: `src/servicios/` (excepto `accesoPanel.ts`, solo agregar), `tests/`, y las pantallas que se te asignen por ficha.
- Tareas, en orden:
  1. **Conectar con el backend real.** Revisa los endpoints que ya existen en `Back/` (`registro.py`, `administracion.py`, `solicitudes.py`, `recuperacion.py`, `alta_asistida.py`) y deja en `src/servicios/` funciones con tipos espejo de sus respuestas (por ejemplo `solicitudes.ts`, `cuentas.ts`). No cambies pantallas: deja listo el servicio y una lista de qué pantalla lo usaría y qué falta en el backend.
  2. **Pruebas** (vitest) para la lógica de `datos.ts` y `servicios/` que todavía no tenga.
  3. **Revisión de accesibilidad y calidad** de las páginas públicas: `alt`, foco con teclado, `aria-*`, contraste. Reporta lo que encuentres; corrige solo en archivos que no sean de T1 ni T2 (si no, repórtalo).
  4. **Pantallas por ficha**: cuando T1 deje una ficha en `docs/figma/<area>/`, prográmala siguiendo la ficha al pie de la letra.

## Fichas de Figma (para quien no puede abrir Figma)

T1 las deja en `Front/docs/figma/<area>/<pantalla>/`:
- `captura.png`: la pantalla tal como está en Figma.
- `ficha.md`: textos exactos, colores, medidas **ya normalizadas**, estados, interacciones, íconos (con su ruta en `src/assets/`) y la ruta de la página.
Los íconos de la ficha ya vienen descargados en `src/assets/`. Si algo no está en la ficha, pregunta antes de inventarlo.

## Estado actual

- Hecho: portal público completo, asistente (RAG simulado), estados del sistema, armazón del panel según Figma y Resumen (`/admin/resumen`).
- En curso: T2 · Contenidos. T1 espera a que T2 termine para normalizar el armazón.
