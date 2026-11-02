# Avances de Aldahir: frontend del portal público

Última actualización: 1 de noviembre de 2026 · Rama: `Aldahir`

Este archivo explica a cualquier persona o agente qué se está haciendo en el frontend de Aldahir, qué ya está hecho y qué falta en cada tarjeta del sprint. Léelo completo antes de cambiar algo.

> **Importante:** el trabajo descrito aquí **todavía no tiene commit**. Está en la rama `Aldahir` como cambios locales. Antes de hacer otra cosa, revisa `git status` y pregunta a Aldahir si ya quiere hacer el commit.

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
npm test        # vitest, 26 pruebas
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

## 5. Pendientes por tarjeta del sprint

Todas las tarjetas vencieron el 30 de octubre.

| Tarjeta | Estado | Qué falta |
|---|---|---|
| **BDLAG-14 · HU-04** Catálogo Koha | ✅ Hecha | Solo poner la dirección real en `.env` cuando la entreguen. |
| **BDLAG-54 · T-051** Info institucional + Koha | ✅ Casi | Revisión de Aldahir. Opcional: pantalla «Acerca de · error al cargar» (`584:47347`), útil cuando el contenido venga de backend. |
| **BDLAG-11 · HU-01** Info institucional y servicios | 🟡 Falta | **Página `/servicios`** (Figma `280:888`, Bibliocomunidad `280:1065`, contenido no disponible `280:1183`). CA-01.2: un borrador no debe verse por URL pública; depende de que backend tenga gestión de contenidos. Mientras tanto, prepara el estado «contenido no disponible». |
| **BDLAG-97 · T-053** Formulario de contacto (8 h) | ⬜ Sin empezar | **Página `/contacto`**: formulario, foco, validación, enviando, error, sugerencia, enviando sugerencia y enviado (Figma `283:925`, `283:1103`, `283:1292`, `283:1492`, `283:1669`, `283:1853`, `283:2031`, `283:2208`). Deja una función de servicio con tipos para que backend conecte el envío. |
| **BDLAG-56 · T-052** Agenda pública (20 h, la más grande) | ⬜ Sin empezar | **`/eventos` y `/eventos/:id`**: lista, todas, calendario, detalle con inscripción, cupo completo, sin resultados, cancelada, cargando, vista de lista, filtros y filtro por fecha (Figma `547:29679` a `547:33519`). Los filtros deben coincidir con la API; confirma con backend qué campos manda. |
| **BDLAG-22 · HU-12** Autorizar, publicar y retirar contenido | ⬜ Sin empezar | Panel › Contenidos › Revisión y publicación (Figma `560:17410` a `610:48631`): bandeja, por autorizar, pedir cambios, rechazar, confirmar, publicado, historial (`561:19695`) y retirar (`561:20179`). CA-12.1: mostrar al responsable. CA-12.2: sin autorización no se publica. Depende del backend. |
| **BDLAG-140 · T-048** Prototipos | No es código | Validar el Figma con la biblioteca y adjuntar evidencia. |

**Orden recomendado:** `/servicios` → `/contacto` → `/eventos` → panel HU-12.

### Pendientes chicos que ya existen en el código
- **Rutas que todavía no existen** (hoy te regresan a Inicio): `/lecturas`, `/lecturas/:id`, `/eventos/:id`, `/noticias`, `/credencial`, `/espacios`, `/contacto`, `/servicios` y `/asistente`.
- **Redes sociales:** no tienen enlace porque la biblioteca no ha confirmado sus cuentas.
- **Información del pie:** «Declaración de accesibilidad», «Términos» y «Alerta» son solo texto, sin página.
- **Admin › Resumen:** quedó en pausa, sin terminar.

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
- **Verificación visual:** para comprobar la interfaz se usaron Edge en modo sin ventana y el protocolo de herramientas de desarrollo (puerto 9333) con scripts de Node. Las capturas no se guardan en el repositorio.
