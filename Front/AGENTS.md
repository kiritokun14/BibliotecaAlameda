# Reparto de trabajo entre agentes (frontend)

Este archivo dice qué hace cada terminal que trabaja en `Front/` al mismo tiempo, para no pisarse.
**Léelo completo antes de cambiar algo**, y después `Front/AVANCES_ALDAHIR.md` (estado, estructura y convenciones).
El orquestador (T1) mantiene este archivo; las demás terminales no lo editan: si necesitan un cambio, se lo piden a Aldahir.

## Reglas para todas las terminales

- Todo en **español**: código, nombres, comentarios y respuestas. Fuente Noto Sans. El panel es solo de escritorio (1280 a 1920 px); acceso y portal siguen la sección **«Diseño responsivo»** de abajo. Todo sigue la **«Normalización de diseño»**.
- **Excepción: las pantallas de acceso ya son responsivas** (17 nov 2026): Iniciar sesión, Crear cuenta, menor de 18 años, Recuperar acceso,
  Confirmar correo, Cuenta deshabilitada y el aviso de Altas asistidas (`AccesoLayout` + `src/pages/acceso/Acceso.css`).
  Teléfono hasta 600 px, tableta de 601 a 1024 px; en táctil los campos usan 16 px para que iOS no haga zoom.
  No quites esas reglas `@media` (sección «Responsivo» de `Acceso.css`); si cambias algo en acceso, revísalo también a 390 px y 820 px.
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

## Normalización de diseño (obligatoria en todo el frontend)

El inicio de sesión (`AccesoLayout` + `src/pages/acceso/Acceso.css`) y la página de inicio
(`src/pages/publico/inicio/` + `src/components/portal/Detalles.css`) son **la referencia**. Todo lo demás
(portal, perfil con sesión y panel) debe verse de la misma familia: mismas medidas, mismos colores, mismas animaciones.
Si una pantalla se ve distinta a esas dos, se ajusta a ellas, no al revés. Los colores permitidos están en `docs/guia-diseno.md`.

### 1. Escala y medidas
- **Escritorio del portal:** franja, menú, contenido y pie con `zoom: 0.9` (≥ 1025 px, en `Detalles.css`). Si usas `100vh` dentro del portal, divídelo entre 0.9. El botón del asistente no se escala.
- **Ancho de contenido:** bloques de máximo 1360 px (≈ 1224 px en pantalla), centrados, con 24 px mínimos a los lados.
- **Tipografía:** Noto Sans en portal y panel (DM Sans solo en acceso). Títulos de sección del portal de 40–44 px con una palabra en dorado (`<span>`); título de tarjeta de acceso 24 px; títulos de tarjeta 16–20 px; texto 14–16 px; ayudas 12–13 px. Panel: la escala de `docs/guia-diseno.md` (título 25 px, texto 14 px).
- **Radios:** bloques de color 40 px · tarjetas 24–28 px · tarjeta de acceso 24 px · campos 12 px · botones, chips y pastillas 999 px.
- **Campos:** 44 px de alto en escritorio (48 px en táctil), borde `#b9b3a5` / `#e2ded5`, radio 12 px, texto de 15 px (16 px en táctil).
- **Botones** (píldora, solo texto):
  - Principal de formulario: 46 px de alto, a todo lo ancho, degradado verde `#1d6354 → #123f37` con sombra verde.
  - Botones de sección («Ver todas las …», «Ver servicios y programas», «Contacto y sugerencias»): **≈ 214 × 39 px en pantalla**, dorados `#e6d194` o con contorno; todos los de una misma página miden lo mismo.
  - Botones grandes de portada: 54 px, repartidos a lo ancho de su fila.
  - Secundario: contorno verde de 1.5 px, mismo alto que el principal de su grupo.
- **Secciones del inicio:** cada una mide el alto visible bajo el menú, con su bloque centrado y `scroll-snap` en *proximity*. **Todos los bloques miden lo mismo de alto** (el alto visible menos 64 px), así entre un bloque y el siguiente quedan **siempre 64 px** en cualquier pantalla; la única excepción es la franja dorada de cifras, que conserva su propio espacio. Si agregas una sección al inicio, usa la misma regla (`Detalles.css`, «Misma separación entre todos los bloques»). Si un bloque no cabe, primero se quita aire (gaps, rellenos) y solo después se encoge su contenido; los bloques hermanos (Lecturas, Actividades, Noticias) van a la **misma escala**.
- **Aire dentro de los bloques:** la etiqueta de sección queda a **≈ 45 px del borde de arriba** del bloque en pantalla (nunca pegada); el pie del bloque (nota + botón) a ≈ 20 px del borde de abajo. Si falta espacio, se quita de los huecos entre título, filtros y tarjetas, no del borde de arriba.
- **Carruseles:** elementos del mismo tamaño en carruseles hermanos (libro = tarjeta de actividad: 360 px de ancho, 24 px entre ellos); flechas ‹ › a media altura de la pista, 64 px hacia dentro de la orilla.

### 2. Elementos de identidad (los «detalles del login»)
- **Franja guinda → dorado** (`linear-gradient(90deg, #9b2247, #c9a24a 55%, #e6d194)`): arriba de las tarjetas de acceso y de los bloques de color, y bajo la franja superior. En bloques guinda o dorados va verde → dorado.
- **Luces:** degradados radiales tenues, dorado arriba a la izquierda y verde o guinda abajo a la derecha (franja superior, pie, portada, encabezados verdes, pantallas de acceso). Nunca fondos de color en los enlaces del menú.
- **Logos:** México | Nayarit | Solón Argüello juntos, separados por una línea fina (franja superior del portal y pantallas de acceso). **Los logos institucionales nunca se animan** (ni entrada ni desvanecido al cambiar de pantalla).
- **Insignia:** ícono en círculo verde `#164f44` con aro dorado `#f2e3b8` arriba del título de una tarjeta principal (acceso, Crear cuenta, menor de edad).
- **Recuadros de ayuda:** fondo crema `#f7f5f0`, borde `#e2ded5` y **borde izquierdo dorado de 4 px**; notas positivas en verde claro `#e4efeb`.
- **Ilustraciones** (`assets/inicio/adorno-*.svg`): plantas y troncos propios en los colores de la institución, detrás del contenido o en esquinas vacías, nunca tapando texto; se quitan si estorban en teléfono.
  - **Guías con flores** dentro de los bloques de color: `adorno-guia-flores.svg` con las clases `guia-flores` + `guia-flores--arriba-izquierda | arriba-derecha | izquierda | derecha` (y `guia-flores--chica` si el bloque tiene contenido cerca de las esquinas). Se usan en «¿Qué quieres hacer hoy?» y «Cómo encontrarnos»; para otro bloque, reutiliza las mismas clases, no dibujes otras flores.
  - Afuera de los bloques (en el fondo de la sección) van las plantas de los costados; en la portada, los troncos.
- **Sin flechas ni íconos dentro de botones o enlaces** (excepciones: el ícono de carga, el ojo de «Mostrar» y el ícono de «Cerrar sesión» del menú del perfil, pedido por Aldahir el 18 nov). Los íconos van en encabezados, insignias, recuadros y estados.
- **Etiquetas de bloque (pastilla con ícono):** pastilla dorada (`#f6eeda → #f2e3b8`, aro `#e6d194`, texto `#6b4f12`, 12.5 px, negrita) con su ícono blanco dentro de un círculo verde `#164f44` de 22 px; sobre fondo verde, la versión clara. **Nunca texto en mayúsculas suelto** como etiqueta. En el perfil y notificaciones es el componente `EtiquetaPerfil` (`perfil/piezas.tsx`); todas las etiquetas de una pantalla son iguales.
- **Tarjetas de contenido:** blancas, borde `#e2ded5`, radio 24 px, sombra suave y **franja de color de 4 px arriba** según su tipo (verde, dorada, guinda o la franja guinda → dorado); la cabecera (ícono en círculo + título) separada del contenido por una línea.
- **Datos de solo lectura en fichas:** cada dato en una ficha con el color de su tarjeta (verde claro, dorado claro o rosa claro, radio 14 px); la etiqueta arriba en minúsculas, en negrita y del color de la tarjeta, **con el ícono del dato** (persona, fecha, correo, teléfono, lugar); el valor en negrita (15 px) y su nota (12 px). Cuadrícula de 4 columnas en escritorio, 2 en tableta y 1 en teléfono; **correo, teléfono, calle y colonia en fichas anchas** (`ancho={2}`) para que no se partan. En los formularios de edición, las etiquetas de los campos llevan el mismo ícono y color que en la vista.
- **Antes de un formulario de edición:** tarjeta verde con luces que dice qué se edita (iniciales y nombre), cómo se guarda y, en pastillas, qué se puede cambiar y qué se hace con el personal.
- **Encabezado de sección:** insignia (ícono en círculo verde con aro dorado), título y texto; la acción principal de la sección («Editar mis datos») va a la derecha del encabezado, no suelta al final.
- **Notas:** de ayuda en crema con borde dorado a la izquierda; **positivas o de privacidad** en verde claro con borde verde a la izquierda e insignia; de error o corrección en rosa con borde guinda a la izquierda.
- **Formularios largos:** barra de guardar que acompaña al bajar (`position: sticky`, abajo) en una tarjeta blanca con borde izquierdo gris, que pasa a dorado con un punto que late cuando hay cambios. Dice el estado («Tienes cambios sin guardar» / «Sin cambios por ahora»). **Botones a la izquierda, «Guardar» primero** (degradado verde `#1d6354 → #123f37` con sombra verde) y «Cancelar» con contorno, para que el botón del asistente no los tape. En teléfono la barra va al final del formulario (no fija), con «Guardar» arriba y ambos a todo lo ancho.
- **Vistas de solo lectura sin ayudas grises:** las notas («Para cambiarla, acude con el personal», «Es el que usas para iniciar sesión») van solo en los formularios de edición; en la vista inflan las fichas.
- **Estados vacíos importantes** (p. ej. Mis eventos): fondo con luces dorada y verde, franja guinda → dorado arriba, insignia grande (círculo verde con aro dorado), sugerencias en pastillas de colores y el botón principal.
- **Trámites por estados:** a la izquierda el objeto (la credencial o su lugar punteado mientras no existe) y a la derecha el estado (chip), qué pasa y la acción; debajo, los pasos del trámite con el actual marcado.
- **Listas de actividades o fechas:** cada elemento con su bloque de fecha (día grande y mes), como en la agenda.
- **Sin etiquetas pequeñas sobre los títulos** que repitan las migas o el título. Las etiquetas de sección del portal (pastilla con ícono arriba del título del bloque) sí se usan.

### 3. Animaciones (solo `transform` y `opacity`)
| Qué | Cómo |
|---|---|
| Entrada de tarjetas y encabezados (nunca los logos) | sube 8–14 px y aparece; 0.5 s `ease-out` |
| Pasar el mouse sobre **cualquier** botón | se eleva 2 px con sombra en 0.2 s y regresa al presionar. **Una sola animación por botón**: sin brillos ni rellenos extra |
| Tarjetas clicables | se elevan 4 px con sombra; 0.2 s |
| Enlaces | subrayado dorado que aparece o se engrosa |
| Elementos vivos (abierto, «ahora») | punto que late; 1.8 s |
| Ilustraciones | se mecen ±2–3° en 8–9 s desde su punto de apoyo, cada una a destiempo |
| Foco con teclado | contorno dorado `#c9a24a` de 3 px |

Todo se apaga con `@media (prefers-reduced-motion: reduce)`, salvo el ícono de carga.

### 4. Cómo aplicarlo en otras partes
- Antes de diseñar, abre el login y el inicio a 1366 × 768 y compara: encabezado, tarjetas, botones, chips, espacios y animaciones.
- Reutiliza clases y piezas existentes. Si una medida no está aquí, toma la más cercana; no agregues colores ni tamaños nuevos.
- Retoques del portal → `Detalles.css`; acceso → `Acceso.css`; panel → `Panel.css` y las piezas de `componentes.tsx`.
- Al terminar, **mide en el navegador** (no a ojo): botones hermanos del mismo tamaño, bloques del mismo ancho, nada desbordado ni cortado.
- **En teléfono y tableta**, lo que va en fila se apila: avisos con botones, llamados finales, títulos con botón a un lado y barras de búsqueda + filtros. Los grupos de botones van uno debajo del otro a todo lo ancho (44 px mínimo). Revisa que `document.documentElement.scrollWidth` sea igual al ancho de la pantalla (390 y 820).
- **Botones «Volver a …»** también van solo con texto (sin flecha), igual que los demás.

### 5. Catálogo de piezas (reutilizar, no inventar)

**Regla (Aldahir, 18 nov 2026): el diseño ya está definido. No se crean estilos ni piezas nuevas:** toda pantalla nueva o que se rehaga se arma con estas piezas.
Si algo no encaja, usa la más parecida y pregunta antes de inventar otra. Los retoques van en `src/components/portal/Detalles.css`.
**Lo responsivo se hace después**, en una pasada aparte: por ahora diseña y revisa solo en escritorio (1366 × 768), sin agregar ni ajustar `@media`.

| Pieza | Dónde | Para qué |
|---|---|---|
| `EncabezadoPublico` | `components/portal/PaginaPublica.tsx` | Franja verde de título de cada página: centrada, con luces y etiqueta |
| `Bloque` + `Etiqueta` | `pages/publico/inicio/Bloque.tsx` | Bloques de color del inicio con su etiqueta de sección; adornos `guia-flores` en las esquinas |
| `EtiquetaPerfil` | `pages/publico/perfil/piezas.tsx` | Etiqueta en pastilla dorada con ícono blanco en círculo verde (`claro` sobre verde) |
| `EncabezadoSeccion` | `pages/publico/perfil/piezas.tsx` | Encabezado de sección: insignia con el ícono (`--icono-seccion`), título, texto y `accion` a la derecha |
| `TarjetaPerfil` | `pages/publico/perfil/piezas.tsx` | Tarjeta blanca con franja de color arriba (`verde`, `dorada`, `rosa`, `blanca`) y cabecera con ícono |
| `Dato` en `dl.perfil-datos` | `pages/publico/perfil/piezas.tsx` | Datos de solo lectura en fichas de color, con `icono` y `ancho={2 \| 4}`; sin notas grises |
| `Campo` en `.perfil-fila` | `pages/publico/perfil/secciones.tsx` | Campo de 44 px con etiqueta con ícono y color; ayudas solo aquí |
| `.perfil-editar-intro` | `Detalles.css` | Tarjeta verde antes de un formulario de edición: quién, cómo se guarda, qué se puede cambiar |
| `.perfil-guardar` | `Detalles.css` | Barra de guardar fija abajo: estado de cambios, «Guardar» (degradado verde) primero, «Cancelar» con contorno |
| `.perfil-nota` · `--dorada` · `--guinda` | `Perfil.css` + `Detalles.css` | Recuadros de ayuda (crema, borde dorado), aviso (dorado) y error o corrección (rosa, borde guinda) |
| `.perfil-protegidos` | `Detalles.css` | Nota positiva o de privacidad: verde claro, borde verde e insignia |
| `.perfil-vacio` | `Detalles.css` | Estado vacío centrado con el ícono de la sección |
| `.perfil-vacio--eventos` | `Detalles.css` | Estado vacío importante: luces, franja, insignia grande (`.perfil-vacio__insignia`) y sugerencias (`.perfil-vacio__sugerencias`) |
| `.perfil-solicitudes` + `.perfil-solicitud--{color}` | `Detalles.css` | **Lista de tarjetas** (eventos, propuestas, espacios, solicitudes): ver «Tarjetas de lista» abajo |
| `.perfil-evento__fecha` | `Detalles.css` | Bloque de fecha (día y mes) a la izquierda de un elemento con fecha |
| `.perfil-panel` | `Detalles.css` | **Panel de lista**: tarjeta crema con franja que llega hasta el alto del menú; reúne filtros, lista de tarjetas o el vacío |
| `.perfil-panel--ajustado` | `Detalles.css` | El mismo panel cuando va arriba de otra tarjeta: mide lo que su contenido |
| `Filtros` segmentados (`.perfil-filtros` + `.perfil-filtro__cuenta`) | `perfil/seccionesCuenta.tsx` | Una pastilla blanca con las opciones; el activo en verde y el número en un círculo («Todas 5») |
| `.perfil-opciones` + `.perfil-opcion` | `Detalles.css` | Elegir una opción entre pocas (canal de avisos): tarjetas con radio, título y descripción; la elegida en verde claro |
| `.perfil-interruptor` | `Detalles.css` | Activar o desactivar algo (tipos de aviso): fila con título, descripción e interruptor verde |
| `.perfil-requisitos` | `Detalles.css` | Requisitos en vivo (contraseña): pastillas grises que se ponen verdes al cumplirse |
| `.perfil-niveles--ruta` | `Detalles.css` | Niveles o etapas numeradas en fila, unidas por una línea, con su chip de estado |
| `Chip` | `pages/publico/credencial/piezas.tsx` | Estado en pastilla con punto (`verde`, `dorado`, `guinda`, `gris`) |
| `.perfil-filtro` | `Perfil.css` | Filtros en pastilla con contador; el activo en verde |
| `.perfil-credencial-estado` + `EtapasTramite` | `Detalles.css` · `credencial/piezas.tsx` | Trámite por estados: objeto a la izquierda, estado y acción a la derecha; pasos debajo |
| `.perfil-boton` (`--contorno`, `--chico`, `--guardar`) | `Perfil.css` + `Detalles.css` | Botones del perfil (46 px, solo texto) |
| Panel: `EncabezadoPagina`, tablas, chips | `pages/admin/componentes.tsx` | Todo el panel; ver `docs/guia-diseno.md` |

**Estructura de una sección del perfil** (todas la siguen): `EncabezadoSeccion` con la acción principal a la derecha → contenido (tarjetas, o un `perfil-panel` con filtros y lista que llega al alto del menú) → nota de ayuda al final. Formularios: la barra `perfil-guardar` siempre hasta abajo. El menú lateral mide 212 px, con la etiqueta «Secciones del perfil» y las opciones **alineadas a la izquierda** (Aldahir probó centrado y prefiere así); «Progreso y recompensas» va en dos renglones. **Se comporta como la barra de navegación principal:** sin relleno de color, al pasar el mouse se dibuja una rayita dorada fina y la sección activa queda en verde con la rayita dorada gruesa, que entra dibujándose al elegirla. «Cerrar sesión» va en guinda y con su ícono.

**Tarjetas de lista** (las de Mis eventos; Aldahir las aprobó, 18 nov): úsalas para **cualquier lista de elementos con estado**.
- Cada elemento es **su propia tarjeta**: blanca, borde `#e2ded5`, radio 20 px, sombra suave que crece al pasar el mouse; 10 px entre tarjetas y sin marco alrededor de la lista.
- **Borde izquierdo de 4 px según el estado:** verde `#1f6b5c` = confirmado o aprobado · dorado `#c9a24a` = en curso o por confirmar · guinda `#9b2247` = requiere acción o no aprobado · gris `#b9b3a5` = cancelado o borrador (fondo `#fbfaf7` y título gris).
- A la izquierda, el **bloque de fecha** (58 × 62 px, día en 22 px y mes en mayúsculas pequeñas): verde claro si está confirmado, dorado claro si está pendiente, gris si se canceló. Si el elemento no tiene fecha, un ícono en círculo verde claro.
- En medio, el título (17 px, negrita) y el detalle (14 px, gris). A la derecha, el `Chip` de estado y las acciones como `perfil-boton--chico` (la principal llena, la secundaria con contorno).
- Arriba de la lista, los filtros (`perfil-filtro`) con contador. Si la lista está vacía, `perfil-vacio` (o `perfil-vacio--eventos` si es la lista principal de la sección, con sugerencias y su botón).

### 6. Recursos reutilizables (Mi perfil terminado, 18 nov 2026)

**Mi perfil quedó oficialmente terminado** (Aldahir, 18 nov 2026). Sus piezas son la base para las demás pantallas con sesión (Notificaciones, Mis trámites…): úsalas tal cual.

**Colores con significado** (los mismos en chips, bordes de tarjetas, fichas y franjas):
| Color | Hex | Significa |
|---|---|---|
| Verde | `#164f44` · `#1f6b5c` (claro `#e4efeb`) | confirmado, aprobado, vigente, activo; insignias y botones principales |
| Dorado | `#c9a24a` · `#e6d194` (claro `#f6eeda`) | en curso, por confirmar, pendiente; etiquetas y rayitas |
| Guinda | `#9b2247` · `#611232` (claro `#f6eaee`) | requiere acción, no aprobado, vencido, cerrar sesión |
| Gris | `#b9b3a5` (claro `#f1efea`) | cancelado, borrador, bloqueado |

**Íconos** (verdes de trazo; se pintan de otro color con `mask` y la variable `--icono`):
- `perfil/iconos.ts` → `iconosSeccion`: `resumen` (lista), `datos` (persona), `credencial` y `propuestas` (archivo), `eventos` (calendario), `espacios` (pin), `progreso` (estrella), `mensajes` (correo), `avisos` (campana), `seguridad` (candado).
- Otros: `assets/inicio/etiqueta-accesos.svg` (brújula, para etiquetas de navegación), `assets/inicio/contacto-telefono.svg` (teléfono), `assets/perfil/menu-salir.svg` (cerrar sesión), `assets/perfil/tarjeta-*.svg` (íconos blancos para los círculos de color de `TarjetaPerfil`).
- Un ícono en un círculo de color claro va en verde (`iconosSeccion`); en un círculo verde o guinda, blanco (`tarjeta-*.svg` o `mask` con fondo blanco).

**Variables de CSS:** `--icono-seccion` (la pone `Perfil.tsx` en `.perfil-seccion`; la usan la insignia del encabezado y los vacíos) y `--icono` (la ponen `EtiquetaPerfil`, `Dato` y las etiquetas de `Campo`).

**Componentes y funciones:** `EtiquetaPerfil`, `EncabezadoSeccion` (con `accion`), `TarjetaPerfil`, `Dato` (`icono`, `ancho`) y `MenuPerfil` en `perfil/piezas.tsx`; `Filtros` y `ListaSolicitudes` (`vacio`, `vacioTexto`, `vacioAccion`) en `perfil/seccionesCuenta.tsx`; `Chip`, `EtapasTramite`, `TarjetaCredencial` y `SelectorEstados` en `credencial/piezas.tsx`; `useSesion` y `sesionSimulada` en `perfil/usarSesion.ts`; `useTramite` y `verEjemplo` en `credencial/datos.ts`; `useNotificaciones` en `notificaciones/datos.ts`; folios de mensajes en `perfil/mensajesGuardados.ts`.

**Para revisar sin backend (solo en desarrollo):** `?simular=sesion` (persona adulta) y `?simular=sesion-menor` muestran el perfil, notificaciones, inscripciones, preferencias de avisos y mensajes de ejemplo; en Mi credencial, el selector «Vista de ejemplo de estados» cambia el estado del trámite.

**Al hacer una pantalla nueva con sesión:** encabezado de sección con insignia y acción → tarjetas o panel de lista → nota al final; estados con `Chip` y borde de color; vacío con `perfil-vacio--eventos`; formularios con `Campo`, interruptores u opciones y la barra `perfil-guardar`. Todo en escritorio; lo responsivo, después.

## Diseño responsivo

Puntos de corte comunes: **teléfono ≤ 600 px**, **tableta 601–1024 px**, **escritorio ≥ 1025 px** (laptop de referencia 1366 × 768; pantalla grande 1920 × 1080).
- **Ya es responsivo:** las pantallas de acceso (completas), el inicio y **todas las páginas internas del portal** (revisadas el 18 nov 2026 a 390 × 844 y 820 × 1180: ninguna se sale de la pantalla). Los arreglos comunes están en `Detalles.css`, sección «Páginas internas en tableta y teléfono»:
  - Teléfono: el aviso «Inicia sesión o crea una cuenta» y el llamado verde final se apilan, con sus botones uno debajo del otro a todo lo ancho; los títulos de Noticias bajan el botón y el resumen («Mostrando…», Cuadrícula | Lista) debajo del título; el buscador de `BarraFiltros` ocupa toda la fila y «Filtros» va abajo.
  - Tableta: tarjetas de actividades a dos columnas.
  - Pie (tableta y teléfono): los tres logos en fila arriba de las columnas, con la línea dorada abajo.
- **Reglas para cualquier pantalla nueva o que se rehaga:**
  - Teléfono: una sola columna, márgenes de 16 px, sin desplazamiento horizontal; filas de campos y grillas de tarjetas a una columna; el botón principal a todo lo ancho; enlaces que no quepan juntos se apilan centrados.
  - Tableta: hasta dos columnas; bloques al ancho disponible con 32 px de margen.
  - Táctil (≤ 1024 px): texto de **16 px** en los campos (iOS no hace zoom), objetivos táctiles de **44 px mínimo**, casillas de 22 px.
  - El `zoom: 0.9` del portal y el ajuste de secciones a la pantalla son **solo de escritorio**; en táctil la página fluye normal.
  - Ilustraciones y adornos se ocultan o encogen si quedarían detrás del texto.
  - Revisa siempre a **390 × 844** (teléfono), **820 × 1180** (tableta) y **1366 × 768** (escritorio).
- **Por ahora no se ajusta lo responsivo** (Aldahir, 18 nov): se diseña y revisa en escritorio; teléfono y tableta se harán en una pasada aparte con estas reglas.
- **Pendiente:** el panel de administración sigue siendo solo de escritorio (1280–1920 px). Las pantallas con sesión (perfil, mis trámites, notificaciones) se revisan con estas reglas cuando se toquen.
- **Pendiente (Aldahir lo pidió para después):** a **1280 × 720** los bloques del inicio no miden lo mismo (Accesos ≈ 735 px, Lecturas 595, Actividades ≈ 635, Noticias ≈ 980 porque su lista se apila debajo de la destacada). Ya pasaba antes del 18 nov. Arreglo esperado: que a ese tamaño todos midan el alto visible menos 64 px, como a 1366 × 768 (Noticias con la destacada y la lista lado a lado, o más compacta), sin encoger Lecturas, Actividades ni Noticias por debajo del 84 %.

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
- **Terminado (T1, 18 nov 2026): Mi perfil completo** (todas sus secciones, con el catálogo de piezas). Sigue: Notificaciones con sesión.
- En curso: T4 · Actor 2 (`476:9982`).
- Pendientes que dependen del backend, no de nuevas pantallas frontend: Estadísticas, Bitácora y Configuración (`administracion/datos.ts`), Resumen y Notificaciones del panel, y Recuperación asistida conservan datos de ejemplo señalados con `TODO backend`.
- 3 nov 2026: `main` y `Aldahir` ya tienen la organización de carpetas corregida después del merge.

## Registro de cambios de diseño (T1, 17 y 18 nov 2026)

Lo que ya se decidió y está hecho. **No lo deshagas**; si algo no te cuadra, pregúntale a Aldahir.

### Panel de administración
- Auditoría completa (≈95 pantallas, 150 rutas) con las cuentas de prueba: todas usan la misma estructura (migas, encabezado, tema «contenidos», esqueletos de carga, estados vacíos). Lo que falta es solo backend: `docs/pendientes-backend.md` (contrato por pantalla).
- **Sin franja dorada «Datos de ejemplo»** y sin «(ejemplo)» en textos, contadores y pies de tabla. Lo que aún usa datos locales se marca solo con `TODO backend` en su `datos.ts`.
- **Sin la etiqueta pequeña sobre los títulos** («ATENCIÓN · SOLICITUDES…»): repetía las migas. `EncabezadoPagina`, `Encabezado` y `EncabezadoTarjeta` aceptan `etiqueta` pero ya no la muestran.
- Inscripciones y cupos: la columna «Cupo» va en dos renglones (cifra arriba, barra corta abajo).
- Publicar propuesta (`atencion/propuestas/PublicarPropuesta.tsx`) con el diseño común del panel.

### Pantallas de acceso (`AccesoLayout` + `src/pages/acceso/Acceso.css`)
- **Un solo diseño:** tarjeta centrada sobre la foto de la biblioteca, con luces dorada y guinda, franja guinda → dorado arriba de la tarjeta, entrada suave y los logos de México, Nayarit y Solón Argüello encima. Se eliminó el diseño de dos columnas, las franjas guindas y «Volver al inicio» (y sus recursos).
- Compacto: tarjeta de 470 px (Crear cuenta 680 px), campos de 44 px, botones de 46 px. Iniciar sesión cabe sin scroll a 1366 × 700.
- **Responsivo** (excepción a «solo escritorio», ver Reglas). Teléfono ≤ 600 px, tableta 601–1024 px.
- Enlaces: subrayado dorado; «Crear cuenta» / «Iniciar sesión» del pie como pastilla verde clara.
- Crear cuenta: nombres en una fila de tres; fecha y teléfono juntos; aviso de privacidad en recuadro con casilla grande (estados normal, marcada y error); en menor de edad, relación y teléfono del tutor juntos y su domicilio en dos columnas.
- Pantalla «Eres menor de 18 años»: qué se pedirá del tutor en una lista, nota de privacidad, «Continuar con datos del tutor» como botón principal y «Cambiar fecha» como secundario.
- Recupera tu acceso: recuadro de recuperación asistida con tres pasos numerados y botón.

### Portal público (`src/components/portal/Detalles.css`, importado en `PaginaPublica`)
- Todo el retoque del portal vive en `Detalles.css`; si se quita, el portal vuelve a como estaba. No repitas esos estilos en otros archivos.
- **Tamaño:** en escritorio (≥ 1025 px) franja, menú, contenido y pie se dibujan con `zoom: 0.9`. El botón del asistente queda fuera (se arrastra con coordenadas de pantalla). Si usas `100vh` dentro del portal, divídelo entre 0.9.
- **Franja superior:** guinda con **las mismas luces del pie** (dorada a la izquierda, verde a la derecha), línea guinda → dorado abajo y **los tres logos**: México | Nayarit | Solón Argüello (este último enlaza al inicio). El logo ya no va en la barra de navegación.
- **Barra de navegación:** opciones a la izquierda; cuenta a la derecha (Ingresar/Crear cuenta, o campana y «Mi perfil»). **Sin fondos de color en los enlaces** (Aldahir no los quiere): solo detalles mínimos, una luz dorada/verde muy tenue como la del pie, una rama decorativa casi transparente y una rayita dorada que se dibuja al pasar el mouse (más gruesa en la sección activa).
- **Campana y «Mi perfil»:** campana en círculo verde claro con la insignia arriba a la derecha; «Mi perfil» en pastilla blanca con borde verde y avatar con aro dorado.
- **Pie:** fondo guinda con luces dorada y verde, franja guinda → dorado arriba, rayita dorada bajo cada título de columna, enlaces con subrayado dorado al pasar el mouse y redes en círculos que se elevan.
- **Inicio:** la portada llena la pantalla bajo la franja y el menú; los botones «Explora el catálogo Koha» y «Acerca de la biblioteca» miden 54 px y ocupan juntos el ancho de las tres cajas de arriba. Cada sección mide el alto visible bajo el menú, con su bloque centrado, y el scroll se acomoda al inicio de cada una (`scroll-snap` en modo *proximity*). Todos los bloques miden lo mismo de ancho. Lecturas, Actividades y Noticias se dibujan al 84 % en pantallas bajas (≤ 900 px de alto) para que quepan completas; no las reduzcas más, Aldahir las quiere así de grandes.
- **Carruseles del inicio:** las flechas ‹ › van hacia dentro (el carrusel deja 64 px a cada lado), no pegadas a la orilla del bloque. Los libros de «Para leer esta semana» son más grandes y van centrados; para que quepan se redujo el aire entre título, libros y estante, no los libros. El aviso «La disponibilidad… se consulta en el catálogo» es una pastilla compacta, no un recuadro a todo lo ancho; su botón «Ver en el catálogo» es chico (30 px).
- **Letrero de la portada:** dice «Abierto ahora · cierra a las …» o «Cerrado ahora · abre … a las …» según el horario (L–V 8:00–19:30, sáb 9:00–14:00, hora de Tepic); lógica y pruebas en `inicio/horarioBiblioteca.ts` y `tests/horarioBiblioteca.test.ts`. Se recalcula cada minuto; entra con animación y el punto late en verde si está abierto. Días festivos: `TODO backend`.
- **Troncos de la portada:** dos ilustraciones con diseño distinto, como seudoelementos de `.portada` detrás del texto: `adorno-tronco-pared.svg` sale de la pared izquierda y se curva hacia arriba; `adorno-tronco-esquina.svg` baja desde la esquina superior derecha con lianas y flores doradas. Se mecen despacio desde donde nacen. Se quitan en teléfono y tableta.
- **«¿Qué quieres hacer hoy?»:** tarjetas centradas (ícono en círculo con aro, título y texto al centro) con una rayita de color abajo que se alarga al pasar el mouse; tarjetas al 112 % en escritorio y guías (enredaderas) con flores de cinco pétalos, botones y hojas con nervadura (`assets/inicio/adorno-guia-flores.svg`, dibujada para la esquina superior izquierda) que corren por la orilla del bloque y bajan por el costado en las cuatro esquinas (volteadas con `scale` sobre su centro) y se mecen despacio. Las mismas guías, más chicas (`guia-flores--chica`), adornan «Cómo encontrarnos». Clases comunes: `guia-flores` + `guia-flores--arriba-izquierda | arriba-derecha | izquierda | derecha`. La etiqueta «Accesos» lleva ícono de brújula (`etiqueta-accesos.svg`): **toda etiqueta de sección del inicio lleva ícono**.
- **Aire arriba del título en Actividades y Noticias:** en pantallas bajas (≤ 900 px de alto) la etiqueta queda a ~45 px del borde de arriba, como en Lecturas; el espacio sale de los huecos internos y del margen de abajo, así el bloque mide lo mismo.
- **Separación entre bloques del inicio:** 64 px entre todos los bloques (incluido el primero después de la portada); los bloques al 95 % compensan su escala para medir lo mismo. Excepción: la franja dorada de cifras.
- **Botones del mismo tamaño en todo el inicio:** «Ver todas las …», «Ver servicios y programas» y «Contacto y sugerencias» miden lo mismo en pantalla (≈ 214 × 39 px). Si agregas otro botón de ese tipo, usa la misma medida.
- **«Cómo encontrarnos»:** datos en tarjetas de vidrio (horario y dirección a todo lo ancho; el horario va en **una sola línea** y el estado «Abierto/Cerrado ahora» junto a la palabra «Horario», con `useEstadoBiblioteca`); etiqueta, título y botón «Contacto y sugerencias» centrados, teléfono y correo como enlaces `tel:` y `mailto:`, y el mapa de Google con marco dorado y una placa con el nombre arriba a la derecha (a la izquierda Google pone su ficha).
- **Pie de bloque igual en Lecturas, Actividades y Noticias:** nota o aviso a la izquierda y el botón dorado «Ver todas las …» a la derecha, los tres del mismo tamaño (los tres bloques al 95 %). Ningún «Ver todas…» va bajo el título.
- **Carruseles parejos:** los libros de Lecturas miden lo mismo que las tarjetas de Actividades (360 px de ancho, mismo espacio entre ellos, mismo alto) y los dos bloques se dibujan a la misma escala (95 %); las flechas de ambos carruseles van a media altura de la pista, en la misma posición.
- **Noticias:** «Ver todas las noticias» va al pie del bloque, junto a la nota, igual que en Actividades. La lista de la derecha muestra cada noticia con miniatura, categoría y fecha, título (2 líneas) y **su descripción** (2 líneas).
- **Campana de notificaciones:** blanca con borde claro (no verde).
- **Actividades del inicio:** «Ver todas las actividades» va abajo a la derecha, junto a la nota de programación (no bajo el título). El bloque es más bajo (menos aire, foto de 170 px) y por eso se dibuja al 95 %, con tarjetas más grandes.
- **Plantas a los costados del inicio:** dos ilustraciones propias (`assets/inicio/adorno-planta-verde.svg` y `adorno-planta-dorada.svg`): rama verde con bayas doradas en una esquina superior del bloque y ramita dorada con flores, inclinada 20°, en la inferior opuesta, alternando lado en cada sección. Salen de la orilla de la pantalla y montan unos 60 px sobre la esquina del bloque (vacía), para que se vean también en laptops. El espejo se hace sobre su centro (`transform-origin: 50% …`) o se sale de la pantalla.
- **Bloques de color del inicio** y franjas verdes de título de cada página: luces dorada y guinda; los bloques llevan franja de color en el borde de arriba.
- **Botones:** una sola animación en todo el portal (se elevan 2 px con sombra y regresan al presionar). Botones principales del inicio de 46 px y «Ver todas…» de 36 px. No agregues otras animaciones a un botón (brillos, rellenos): pierde la coherencia.
- **Mi perfil y Notificaciones** (retoque en `Detalles.css`, secciones «Mi perfil y Notificaciones» y «Submódulos de Mi perfil»):
  - Franja verde con luces y entrada suave; «Mi perfil» y «Notificaciones» como pastilla. Notificaciones usa `EncabezadoPublico` (centrado), igual que las demás páginas.
  - **Todos los submódulos con la misma estructura:** encabezado con insignia (ícono de la sección en círculo verde con aro dorado, tomado de `perfil/iconos.ts` por la variable `--icono-seccion`), título y texto, sin etiqueta que repita el título; tarjetas con el mismo radio y sombra; recuadros de ayuda crema con borde dorado a la izquierda; errores en rosa con borde guinda; estados vacíos centrados con el ícono de la sección.
  - **Etiquetas en pastilla y sin mayúsculas** («Secciones del perfil», «Resumen de mi cuenta», «Mi progreso», «Accesos rápidos», «Cómo te avisamos» y la categoría de cada notificación).
  - **El menú lateral acompaña al scroll** (decisión final de Aldahir, 18 nov): se queda visible justo debajo de la barra de arriba (`position: sticky; top: 84px`) mientras se baja por el contenido; si la pantalla es baja, se desplaza por dentro. La barra de navegación de arriba también es fija. La columna del contenido mide al menos lo que el menú, así los estados vacíos no se ven chiquitos. En teléfono el menú es una fila de pastillas que se desliza de lado, con la sección activa centrada.
  - Solo se elevan las tarjetas que se pueden tocar; botones de 46 px y sin íconos («Editar mis datos», «Cerrar sesión», «Marcar todas como leídas», paginación sin ‹ ›).
  - Formulario de Avisos con los campos comunes (select de 44 px, casillas de 22 px). Las notificaciones no leídas llevan borde dorado a la izquierda.
  - En desarrollo, `?simular=sesion` muestra notificaciones y preferencias de avisos de ejemplo.
  - **Segunda vuelta (18 nov):** franja verde más baja (avatar de 76 px, nombre de 34 px). «Mi perfil», «Secciones del perfil», «Resumen de mi cuenta», «Mi progreso», «Accesos rápidos» y «Cómo te avisamos» usan la misma `EtiquetaPerfil`.
  - **Mis datos:** tarjetas blancas con franja de color, datos en fichas sin desbordes, «Editar mis datos» en el encabezado y recuadro «Tus datos están protegidos». **Editar mis datos** usa las mismas tarjetas, campos de 44 px y la barra de guardar que acompaña al bajar.
  - **Mi credencial:** un bloque por estado (sin solicitud, en revisión, corrección, vigente, vencida) con la credencial o su lugar punteado, el chip de estado, la observación del personal si la hay y la acción; debajo, «Cómo avanza tu trámite» con los cuatro pasos. En desarrollo, el selector «Vista de ejemplo de estados» permite verlos todos.
  - **Tercera vuelta (18 nov):** datos en 4 columnas con íconos y color (el correo ya no se parte), «Editar mis datos» con tarjeta de inicio y las mismas etiquetas con ícono, menú lateral que se desplaza con el contenido y estado vacío de Mis eventos al alto del menú.
  - **Cuarta vuelta (18 nov):** barra de guardar rediseñada en Editar mis datos, Mis datos sin notas grises y Mis eventos vacío con luces, insignia y sugerencias; las tarjetas de inscripción llevan borde de color a la izquierda según su estado.
  - **Quinta vuelta (18 nov, catálogo aplicado):** menú de 236 px; Mis propuestas, Mis espacios y Mis eventos con acción en el encabezado y `perfil-panel` (filtros segmentados con contador en círculo, tarjetas de lista o vacío con insignia); Progreso con niveles en ruta y recompensas como tarjetas de lista; Mis mensajes con vacío de pasos (Recibido · En revisión · Atendido); Avisos con canales en tarjetas de opción, tipos con interruptores y la barra de guardar hasta abajo; Seguridad con requisitos en vivo, sesión como tarjeta de lista y consejos en nota positiva.
  - **Mis mensajes (18 nov):** al enviar un mensaje de contacto con sesión, su folio se guarda en este navegador para esa cuenta (`perfil/mensajesGuardados.ts`, pruebas en `tests/mensajesGuardados.test.ts`); también al consultar un folio válido. Mis mensajes los lista solos como tarjetas de lista con su estado y «Ver seguimiento»; el buscador por folio queda para mensajes enviados desde otro equipo. `TODO backend`: cuando `GET /mis-solicitudes` incluya los mensajes de contacto, la lista sale de ahí.
  - **Mis eventos:** cada inscripción es una tarjeta con su bloque de fecha (verde si está confirmada, gris si se canceló); el estado vacío trae «Explorar actividades». Con `?simular=sesion` hay inscripciones de ejemplo.
- **Sin flechas** en botones, pastillas ni enlaces (se quitaron unas 70 en 38 archivos, y el 18 nov las que quedaban en los botones «Volver a …» de Noticias, Lecturas, Servicios, Eventos y el encabezado de visitante, y en las acciones de las tarjetas de Servicios). Solo conservan flecha los controles ‹ › de los carruseles y el globo del asistente.
