# Frontend · Biblioteca Solón Argüello

Portal público, acceso con cuenta y panel de administración. React 19 + TypeScript + Vite.
Todo el código, los nombres y los comentarios están en español.

## Cómo correrlo

```
cd Front
npm install
npm run dev      # http://localhost:5173
npm run lint
npm test         # vitest
npm run build
```

El portal público funciona sin backend (usa datos de ejemplo). Para **iniciar sesión** y el **panel**
hace falta el backend (FastAPI, carpeta `Back/`) en `127.0.0.1:8000`; Vite le manda todo lo de `/api`.
Desde la raíz del proyecto:

```
py -3.11 -m venv .venv                                   # solo la primera vez
.\.venv\Scripts\python.exe -m pip install -r Back\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn Back.main:app --reload
```

`Back/.env` necesita `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `ADMINISTRACION_HABILITADA=true`
(sin esto último el inicio de sesión falla, porque al final consulta los permisos).

### Variables del frontend

| Archivo | Variable | Para qué |
|---|---|---|
| `.env` | `VITE_KOHA_URL` | Dirección pública del catálogo Koha (plantilla en `.env.example`). |
| `.env.development.local` | `VITE_PANEL_COMPLETO=true` | **Solo desarrollo.** Abre todas las secciones del panel con cualquier cuenta que inicie sesión, mientras backend asigna los permisos reales. No existe en el build de producción. Bórralo cuando ya no haga falta. |

Solo variables `VITE_*` públicas: nunca pongas claves secretas en el frontend.

## Estructura de carpetas

```
src/
  main.tsx              entrada; monta <App />
  App.tsx               todas las rutas
  index.css             estilos base mínimos
  servicios/            comunicación con el backend y reglas compartidas
    api.ts              pedirApi() hacia /api y cliente de Supabase Auth
    auth.ts             sesión: iniciar, registrar, recuperar, mi acceso
    accesoPanel.ts      qué sección del panel puede ver cada cuenta
    altaAsistida.ts  catalogo.ts  validaciones.ts
  components/
    portal/             estructura de las páginas públicas
      PaginaPublica     franja, menú, <main>, pie y asistente (+ EncabezadoPublico)
      Portal            encabezado institucional y pie
      Navegacion        menú principal (muestra «Panel» si la cuenta tiene acceso)
      BotonAsistente    botón flotante arrastrable que abre el asistente
      Visitante         piezas para páginas que piden cuenta (aviso, pasos, llamado)
    acceso/             piezas de las pantallas de acceso
      AccesoLayout  Institucional  Campo  Aviso
    asistente/          asistente (RAG): servicio, conversación y panel
  pages/
    publico/            lo que ve cualquier visitante, una carpeta por página
      inicio  acerca  servicios  contacto  noticias  eventos
      lecturas  catalogo  credencial  espacios  asistente
    acceso/             iniciar sesión, crear cuenta, confirmar correo, …
      recuperar/        recuperación de contraseña
    personal/           herramientas del personal (alta asistida)
    admin/              panel de administración
      AccesoPanel       guardia de sesión y permisos
      PanelLayout       menú lateral y cabecera del panel
      atencion/         credenciales, espacios y propuestas
      contenidos/       editor y revisión de contenidos (HU-12)
  assets/
    comun/              lo que usa más de una pantalla
      iconos/  logos/  fotos/
    <pantalla>/         lo exclusivo de cada pantalla (inicio, acerca, login, admin, …)
tests/                  pruebas (vitest), una por tema
```

### Dónde va cada cosa nueva

- **Página pública nueva:** `src/pages/publico/<nombre>/` con su `.tsx`, su `.css` y, si usa datos, un
  `datos.ts`. Envuélvela en `<PaginaPublica>` y agrega su ruta en `App.tsx`.
- **Pantalla del panel:** `src/pages/admin/<area>/`, envuelta en `<AccesoPanel>` en `App.tsx`, y su
  permiso en `capacidadPanel()` de `servicios/accesoPanel.ts`.
- **Imagen o ícono:** si solo lo usa una pantalla, en `src/assets/<pantalla>/`. Si lo usan dos o más, en
  `src/assets/comun/iconos/` (o `logos/`, `fotos/`). Antes de agregarlo, revisa que no exista ya
  (por ejemplo con `md5sum`).
- **Llamada al backend:** una función con tipos en el `datos.ts` de la página o en `src/servicios/`,
  siempre por `pedirApi()` (pasa por `/api`).

## Convenciones

- **Componentes:** un archivo por sección. Clases CSS en español con BEM (`bloque__elemento--variante`).
  Cada archivo empieza con un comentario que dice qué es; los comentarios explican el porqué.
- **Estilo:** fuente Noto Sans, colores de Inicio (verde `#164f44`, guinda `#9b2247`, dorado `#c9a24a`,
  crema `#f7f5f0`). Todos los CSS se cargan juntos: usa nombres de clase propios de tu página para no
  chocar con otros (ya pasó con `.datos-actividad`).
- **Solo escritorio:** de 1280 a 1920 px. La versión de celular y tableta se diseñará después.
- **Accesibilidad:** contorno dorado con teclado, imágenes decorativas con `alt=""`, `aria-expanded`
  en lo que abre o cierra, y `role="status"` / `role="alert"` en los avisos.
- **Datos de ejemplo:** mientras no exista el backend, cada página tiene su `datos.ts` con un
  comentario `TODO backend` que dice qué se espera. En desarrollo, `?simular=error` o
  `?simular=cargando` (según la página) muestran esos estados.
- **Estados del sistema:** `components/portal/EstadoPagina` es la tarjeta de error (anillo dorado).
  Rutas: cualquier dirección desconocida muestra la 404; `/error`, `/sin-conexion` y `/mantenimiento`
  existen para redirigir ahí cuando backend lo indique. `?simular=error` muestra el «error al cargar»
  en Acerca y Eventos, y `/?simular=aviso` el aviso del portal en Inicio. Para simular en una página
  nueva usa `simulacion()` de `servicios/simulacion.ts`.

## Pendientes de backend (`TODO backend`)

| Dónde | Qué falta |
|---|---|
| `pages/publico/servicios/datos.ts` | Servicios publicados (sin borradores). |
| `pages/publico/contacto/datos.ts` | Envío del formulario de contacto y sugerencias. |
| `pages/publico/noticias/datos.ts` | Noticias publicadas y detalle por id. |
| `pages/publico/eventos/datos.ts` | Agenda pública de eventos. |
| `pages/publico/lecturas/datos.ts` | Lecturas y reseñas. |
| `pages/publico/espacios/datos.ts`, `credencial/Credencial.tsx` | Información de espacios y credencial. |
| `pages/publico/acerca/datos.ts`, `inicio/datos.ts` | Contenido institucional e Inicio. |
| `components/asistente/servicio.ts` | RAG del asistente y envío de consultas al personal. |
| `pages/admin/contenidos/` | Contenidos del panel (HU-12). |
