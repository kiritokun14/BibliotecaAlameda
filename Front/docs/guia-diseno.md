# Guía de diseño del frontend

Úsala al inicio de cualquier tarea de diseño (Claude, opencode u otra terminal). Resume cómo está hecho el portal y el panel
para que todas las pantallas se vean iguales. Si una regla choca con Figma, gana Figma, normalizado a esta escala.

## Prompt

```text
Trabajas en el frontend de la Biblioteca Pública Central Estatal Solón Argüello (React + TypeScript + Vite, carpeta Front/).
Todo en español: código, nombres, textos y respuestas. Escritorio de 1280 a 1920 px, fuente Noto Sans.
Tu prioridad es que la pantalla se vea igual que las demás: REUTILIZA piezas existentes y NO inventes estilos nuevos.
Antes de escribir CSS, busca una pantalla parecida ya hecha y copia su estructura.

1. DOS MUNDOS (no los mezcles)
- PORTAL (src/pages/publico, src/components/portal): envuelve en <PaginaPublica>; encabezado con <EncabezadoPublico>
  (franja verde degradada #0b3b33→#1f6b5c, título centrado). Tarjetas blancas de radio 24 px. Botones en píldora.
- PANEL (src/pages/admin): envuelve SIEMPRE en <PanelLayout titulo="<Sección del menú>" tema="contenidos">.
  El título de la barra es el nombre de la sección del menú (Atención, Actividades, Participantes…), nunca el de la pantalla.

2. COLORES (solo estos; en el panel usa las variables --solon-*)
- Verde principal #164f44 (--solon-primario) · verde oscuro #0b3b33 (--solon-oscuro) · verde suave #e4efeb / #e8f0ec.
- Texto #161a1d · texto secundario #4d4d4d · borde #e2ded5 · fondo crema #f7f5f0 · gris suave #f1efea.
- Guinda #9b2247 (errores, rechazos, acciones destructivas) · guinda suave #f6eaee · franja guinda de títulos #611232.
- Dorado #c9a24a / #e6d194 (acento, «ahora», puntos de etiqueta) · dorado suave #f6eeda · texto dorado #8a6414.
- Prohibido agregar colores nuevos. Si dudas, usa el más cercano de esta lista.

3. ESCALA DEL PANEL (normalizada desde Figma; igual en todas las secciones)
- Título de página 25 px · subtítulos de tarjeta 18 px · texto 14 px · ayudas 12–13 px · etiquetas 11–12 px en MAYÚSCULAS.
- Radios: tarjetas 20 px · listas/bloques grandes 22–24 px · filas y campos 12–14 px · chips y botones 999 px.
- Campos de 44 px de alto, borde #e2ded5, radio 12 px. Botones: contenidos-boton (+ --oscuro, --contorno, --chico).

4. PIEZAS DEL PANEL QUE DEBES USAR (src/pages/admin/componentes.tsx y vecinos)
- <Migas raiz="Sección" pasos={[["Pantalla", ruta?], ["Detalle"]]} /> arriba de todo.
- <EncabezadoPagina etiqueta="Sección · Pantalla" titulo texto accion? volver? /> (con «volver» en pantallas internas).
- Franja «Accesos rápidos»: bloque .contenidos-resumen con 3–4 tarjetas de cifras que filtran la lista (ver atencion/Bandeja.tsx).
- Listas: <section className="contenidos-lista"> + cabecera con ícono, .contenidos-filtros (píldoras), .contenidos-buscar (con lupa, a la derecha),
  filas en tarjeta .contenidos-tabla__fila, acción como enlace «Ver →» / «Revisar →», paginación .contenidos-paginas.
- Filtros con varias opciones (sala, estado, tipo…): <BarraFiltros> del portal, igual que en Noticias, con el selector de vista
  en «arriba» (<ChipsFiltro>) y dentro de un bloque .cal-controles. Ejemplos: Actividades › Calendario y salas, y Visitas.
- Estados con <Chip tono="verde|dorado|guinda|gris">. <EstadoVacio icono titulo texto accion?/> para vacío, error y «sin resultados».
- Detalles: dos columnas .contenidos-formulario (contenido + aside .tr-lateral fijo al bajar). Tarjetas con <Tarjeta icono titulo subtitulo>.
  Datos: .tr-datos (3 recuadros clave arriba + filas etiqueta/valor + bloques de texto). Persona: <TarjetaPersona>.
  Etapas del trámite: <Flujo> (atencion/Flujo.tsx) con «Siguiente paso». Historial: lista .tr-eventos con scroll propio.
  Decisión: tarjeta variante="decision"; opciones como píldoras; confirmación con casilla; botón guinda si es destructivo.
- Estados del sistema: EstadosPanel.tsx (404, error, sin conexión, mantenimiento, sesión caducada) y SinPermiso.tsx.

5. PIEZAS DEL PORTAL
- <EncabezadoPublico>, <BarraFiltros> (buscador + «Filtros» desplegable), tarjetas .tarjeta-listado con alturas iguales (Uniforme.css),
  <EstadoPagina> para errores dentro del portal, <PantallaEstado> para pantallas completas (sesión, sin acceso).

6. CARGA, VACÍO Y ERROR (obligatorio en toda pantalla con datos)
- Cargando: esqueletos con <Bloque> (components/portal/Esqueleto) con la forma de lo que viene. NUNCA un <p>Cargando…</p> suelto.
  Atajos: <EsqueletoLista /> para listas y <EsqueletoDetalle /> para detalles (components/portal/Esqueleto).
- Error: <EstadoVacio> (panel) o <EstadoPagina> (portal) con botón «Reintentar». Vacío: <EstadoVacio> con texto que diga qué aparecerá.
- Datos de ejemplo: no se anuncian en pantalla (sin franja ni «(ejemplo)» en los textos); marca lo pendiente con «TODO backend» en datos.ts.

7. MOVIMIENTO Y ACCESIBILIDAD
- Solo anima transform y opacity (entradas de 0.3–0.5 s, hover que eleva 2 px). Respeta prefers-reduced-motion.
- Foco visible dorado, aria-label en botones con solo ícono, role="status"/"alert" en avisos, textos alternativos.

8. PROHIBIDO
- Clases viejas cn-*, boton-panel, cn-enlace, tablas <table> sueltas o selects sin estilo en pantallas nuevas.
- Estilos en línea (style={{…}}) para diseño, tamaños fuera de la escala, colores nuevos, botones grises por defecto del navegador.
- Cambiar la lógica, permisos o llamadas al backend cuando la tarea es solo de diseño. No tocar Back/ ni Supabase/.
- Íconos dentro de botones, pastillas o enlaces (flechas de texto → ←, ::after { content: "→" } o SVG de cualquier tipo):
  solo texto. Única excepción: el ícono de carga que gira mientras se envía. Los íconos van fuera de los botones.

9. AL TERMINAR
- npm run lint, npm test y npm run build sin errores.
- Compara tu pantalla con una hermana ya terminada (por ejemplo Atención › Solicitudes de espacios) en encabezado, tarjetas,
  botones, chips, tabla, carga y vacío. Si algo se ve distinto, ajústalo a la hermana, no al revés.
- Resume qué piezas reutilizaste y qué pasos seguir para probarlo.
```

## Pantallas de referencia

| Tipo de pantalla | Mírala antes de diseñar |
|---|---|
| Lista con resumen y filtros | Atención › Solicitudes de espacios (`pages/admin/atencion/espacios/Espacios.tsx`) |
| Lista con datos del backend y paginación | Atención › Solicitudes de credencial (`pages/admin/atencion/AtencionTramites.tsx`) |
| Detalle con etapas, decisión e historial | Atención › Propuestas de eventos (detalle) y Actividades › Propuestas de actividades |
| Formulario en dos columnas | Actividades › Nueva actividad (`pages/admin/actividades/GestionActividades.tsx`) |
| Filtros con panel, vistas de calendario y listas agrupadas | Actividades › Calendario y salas · Visitas y uso de espacios |
| Estados del sistema | `pages/admin/EstadosPanel.tsx` y Administración › Estados del sistema |
| Página pública con filtros | Noticias (`pages/publico/noticias`) |

## Deuda conocida

- Sistemas de botones del portal que conviven: `agenda-boton` y `perfil-boton`. No crees otro; usa el de la pantalla hermana.
- `boton-panel` y `cn-*` solo quedan en pantallas antiguas del demo; `Panel.css` las acerca a la escala, pero no las uses en pantallas nuevas.
