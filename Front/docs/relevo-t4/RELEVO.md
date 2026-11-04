# Relevo de T4 · Actor 2 (usuario con sesión) → opencode

Fecha: 3 nov 2026. Lo escribió T4 (Claude Code) porque se le acaba el uso semanal.
Léelo completo junto con `Front/AGENTS.md`. **opencode no tiene Figma**: todo lo que necesitas de diseño está en
`fichas/` (textos exactos) y `capturas/` (cómo se ve). Si algo no está ahí, pregunta a Aldahir antes de inventarlo.

---

## 1. Puntos del sprint y en qué estado quedan

| Sprint | Clave | Tarea | Estado | Qué falta |
|---|---|---|---|---|
| S3 | BDLAG-54 · T-051 | Información institucional + enlace a Koha | **Casi hecho** (no lo hizo T4) | `Acerca` (`src/pages/publico/acerca/`) y el enlace a Koha (`src/pages/publico/catalogo/Catalogo.tsx`, abre en pestaña nueva) ya existen. Solo comparar con `fichas/acerca.md`. Con sesión, Acerca no cambia salvo la barra. |
| S3 | BDLAG-56 · T-052 | Listado, calendario y filtros de la agenda pública | **En curso** | **Casi hecho** (3-4 nov): listado, «Todas», calendario, detalle con inscripción y «Mi inscripción». Falta: lista de espera (Estados del sistema) y conectar con backend. Ver §3.1. |
| S3 | BDLAG-140 · T-048 | Diseñar y validar prototipos de agenda, contenidos y contacto | No es código | Es validación en Figma. Las capturas de `capturas/eventos/` sirven de evidencia de la agenda. |
| S4 | BDLAG-36 · HU-26 | Participar en el foro Club Alameda | **Bloqueado: el diseño aún no existe** (Aldahir, 4 nov) | En la sección A-02 de Figma **no hay pantallas del foro** (solo aparece el texto «Club Alameda: comunidad de lectores con foro y actividades propias.» en Servicios). Pide a Aldahir el nodo de Figma del foro antes de empezar. Ver §3.4. |
| S4 | BDLAG-63 | Apoyo · Integración de pantallas de solicitud y seguimiento | **Hecho en frontend** (4 nov) | Credencial, Espacios con sesión (`/espacios`, `/espacios/enviada`, `/espacios/solicitud/:id`), Proponer (`/proponer`, `/proponer/enviada`, `/proponer/:id`) y el historial del perfil. Falta solo backend para crear, corregir y cancelar. Ver §3.2 y §3.3. |
| S4 | BDLAG-153 · T-071 | Diseñar y validar prototipos de credenciales, solicitudes y foro | No es código | Validación en Figma. Evidencia: pantallas de Credencial ya programadas y `capturas/espacios/`, `capturas/proponer/`. |

**Hecho también (4 nov):** lista de espera en el detalle de Eventos (`Anotarme en lista de espera` → modal → «Lugar 3 en la lista de espera» →
«Salir de la lista de espera»; en desarrollo el enlace «Vista de ejemplo: se liberó un lugar» muestra «Lugar disponible» → «Confirmar mi lugar»), `/cuenta-suspendida` y
`/sesion-caducada` (aviso sobre el Inicio) en `src/pages/publico/sesion/EstadosSesion.tsx`.

**Revisión del resto de A-02 (4 nov):** Contacto, Noticias, Servicios, Bibliocomunidad, Acerca y Koha con sesión son iguales a los de visitante salvo la barra
(ya hecha) y pequeñas diferencias de títulos entre los dos diseños de Figma. Pendientes reales: (1) «Material privado · acceso restringido»
(`476:17037`, Lecturas: «Tu cuenta no tiene acceso a este material»), (2) variantes del Asistente con sesión (`476:18280`; el asistente es de T1),
(3) el foro HU-26 cuando exista el diseño, (4) conectar todo con el backend (`TODO backend` en cada `datos.ts`).

**Orden sugerido para opencode:** lo que queda del sprint es el foro HU-26 (cuando haya diseño) y la lista de espera de Eventos (Estados del sistema).
Inscribirse ya crea notificación y aparece en Mis eventos; enviar solicitud de espacio y propuesta también crean notificación.

---

## 2. Lo que ya hizo T4 (para reutilizar, no para rehacer)

Todo es solo frontend. Lo que el backend aún no da está en el `datos.ts` de cada carpeta con `TODO backend`.

### Rutas nuevas (`src/App.tsx`, solo se agregaron)
- `/mi-perfil`, `/mi-perfil/:seccion` (datos, credencial, eventos, propuestas, espacios, progreso, avisos, seguridad),
  `/mi-perfil/datos/editar`, `/mi-perfil/datos/correo-pendiente`.
- `/credencial` (con sesión muestra pasos + «Mi trámite»), `/credencial/solicitud`, `/credencial/enviada`, `/credencial/seguimiento`.
- `/notificaciones`.

### Carpetas y piezas reutilizables
- `src/pages/publico/perfil/`
  - `usarSesion.ts`: `useSesion()` (¿hay sesión?) y `usePerfil(usuario)` (GET /perfil). **Úsalos en toda pantalla con sesión.**
  - `piezas.tsx`: `EncabezadoSeccion`, `TarjetaPerfil` (verde, dorada, blanca, rosa), `Dato`, `ModalCerrarSesion`.
  - `Perfil.css`: clases `perfil-boton` (+ `--contorno`, `--dorado`, `--guinda`, `--negro`, `--chico`), `perfil-nota` (+ `--dorada`, `--guinda`),
    `perfil-filtros`/`perfil-filtro`, `perfil-campo`, `perfil-fila`, `perfil-exito`, `perfil-error`, `perfil-vacio`.
  - `solicitudes.ts`: cliente de `GET /mis-solicitudes` y cómo se pinta cada estado (`estadoEspacio`, `estadoPropuesta`).
  - `MenuCuenta.tsx`: campana + «Mi perfil» + menú de cuenta. Ya está conectado en `components/portal/Navegacion.tsx`.
- `src/pages/publico/credencial/`
  - `piezas.tsx`: `PasosTramite` (1 Información · 2 Solicitud · 3 Seguimiento), `Chip` (dorado, verde, gris, guinda),
    `Nota`, `DatoCred`, `EtapasTramite`, `TarjetaCredencial`, `SelectorEstados` (solo en desarrollo).
  - `CredencialSesion.css`: `cred-tarjeta`, `cred-columnas` (contenido + lateral de 320 px), `cred-campo`, `cred-casilla`,
    `cred-opcion` (radio en tarjeta), `cred-etapas`, `cred-acciones`, `cred-boton-contorno`. **Sirven igual para Espacios y Proponer.**
  - `datos.ts`: estado del trámite (ejemplo en memoria). La credencial vigente desbloquea Progreso y debería desbloquear Espacios.
- `src/pages/publico/notificaciones/`: `datos.ts` con un estado compartido (`useNotificaciones`, `notificaciones.marcarLeida(...)`).
  Si una acción nueva (inscribirse, enviar solicitud) debe avisar, agrega ahí una notificación.
- Comunes del portal (de T1, no los edites): `PaginaPublica`, `EncabezadoVisitante`, `SeccionVisitante`, `AvisoCuenta`, `boton-visitante`.

### Simulaciones (solo en `npm run dev`)
- `?simular=sesion` / `?simular=sesion-menor`: finge una sesión con datos de ejemplo (perfil, credencial, notificaciones).
  Sirve para revisar pantallas sin backend. La barra de arriba **no** se simula: con sesión real sí cambia.
- En `/credencial/seguimiento` aparece el selector «Vista de ejemplo de estados» para cambiar el estado del trámite.

### Conexiones reales al backend
- **Estado de la credencial (4 nov):** con sesión real se lee de `GET /mis-solicitudes` → `solicitudes_credencial[0]` (`credencial/datos.ts →
  useTramite()`, `mapearCredencial()`). Lo usan el seguimiento, el encabezado y Resumen del perfil, Mi credencial, Progreso y Espacios.
  Regla de estados (revisar con backend): recibida / en_atencion / cita_programada → en revisión; atendida → vigente (vencida a los 2 años
  de la cita o, si no hay cita, de la solicitud); rechazada → corrección con las observaciones; cancelada o ninguna → sin solicitud.
  Crear la solicitud y la corrección siguen siendo locales (no hay endpoint).
- `GET/PATCH /perfil` (nombre y teléfono).
- `GET /mis-solicitudes` (Back/solicitudes.py): espacios, credenciales y propuestas de la persona. Estados posibles:
  espacios y propuestas `borrador | en_revision | requiere_correccion | aprobada | rechazada | cancelada`;
  credencial `recibida | en_atencion | cita_programada | atendida | rechazada | cancelada`.
- Cambio de contraseña con Supabase Auth (`perfil/seguridad.ts`).

---

## 3. Qué hacer en cada pendiente

### 3.1 T-052 · Eventos y actividades (agenda pública) — `fichas/eventos.md`, `capturas/eventos/`
Carpeta: `src/pages/publico/eventos/` (es de T4; puedes trabajar ahí). Datos de ejemplo: `src/pages/publico/inicio/datos.ts` (`actividades`).

**Ya hecho por T4 (3 nov):**
- `eventos/Agenda.tsx` + `Agenda.css` + `datosAgenda.ts` (se llama así y no `agenda.ts` porque en Windows choca con `Agenda.tsx`).
  `/eventos` sin id muestra la agenda (se resolvió dentro de `Eventos.tsx`, sin tocar rutas). `/eventos/:id` sigue mostrando el detalle de siempre
  y ya reconoce las actividades de la agenda (`datos.ts → actividadElegida`).
- Pantalla `lista.png`: encabezado centrado (`EncabezadoPublico`), tarjeta «PROPÓN» (solo con sesión; enlaza a `/proponer` y `/mi-perfil/propuestas`),
  «Próximas actividades» con categorías Todas/Talleres/Club de lectura/Visitas guiadas/Eventos, actividad destacada (la más próxima) y «Más actividades».
- Sin resultados en una categoría: tarjeta «No hay actividades de este tipo por ahora» (texto de T4; Figma tiene `sin-resultados.png`, cámbialo por ese).
- Pruebas: `tests/agenda.test.ts`. Íconos en `src/assets/eventos/`.
- **«Todas las actividades» (`/eventos/todas`, `TodasActividades.tsx`)**: puntos 2 y 3 hechos. Reutiliza de Noticias
  `EncabezadoNoticias`, `ChipCategoria`, `CalendarioFecha` y las clases `buscador-noticias`, `panel-filtros-noticias`, `selector-vista`
  (importa `../noticias/Noticias.css`). Filtros: categoría, disponibilidad (abierta, cupo completo, «Ya estoy inscrito» solo con sesión)
  y horario (mañana < 14 h ≤ tarde). Lógica pura en `datosAgenda.ts` (`filtrarTodas`, `agruparPorMes`, `estadoActividad`).
- **Calendario (`/eventos/calendario`, `CalendarioActividades.tsx`)**: punto 4 hecho. Mes con flechas, días con puntos por categoría,
  panel verde del día elegido con «Ver detalle», «Mis actividades» y «+ Proponer un evento» (solo con sesión). Selector «Lista | Calendario»
  (`SelectorVistaAgenda` en `Agenda.tsx`) en el listado y opción «Calendario» en «Todas». Lógica: `semanasDelMes`, `diaInicial`, `moverMes`, `diaLargo`.
  Los íconos se tomaron de los que ya existían (la conexión con Figma se cayó): si al compararlo con `calendario.png` alguno se ve distinto, cámbialo.
- **Detalle (`DetalleActividad.tsx`)**: punto 5 hecho para las actividades de la agenda (`agenda-*`). Estados: inscripción abierta (sin sesión
  «Inscribirme» lleva a iniciar sesión), modal «Confirma tu inscripción» → modal «Quedaste inscrito», «Ya estás inscrito» (por ejemplo el taller
  de escritura, que viene inscrito), cupo completo (sin botón), finalizada y cancelada (`?simular=cancelada`). Las demás `/eventos/:id`
  (las del carrusel de Inicio) siguen con la página vieja de `Eventos.tsx`.
- **Mi inscripción (`/eventos/:id/mi-inscripcion`, `MiInscripcion.tsx`, ruta agregada en `App.tsx`)**: datos, «Cancelar mi inscripción» con modal,
  y la vista «Ya no puedes cancelar desde el portal» (selector de ejemplo en desarrollo). `ModalAgenda` es reutilizable.
- Inscripciones: `datosAgenda.ts → inscripciones` + `useInscripcion(id)` (estado compartido de la pestaña, `TODO backend`).
- **Pendiente:** (a) que inscribirse/cancelar agregue la actividad en `perfil/datos.ts → inscripcionesEjemplo` (Mis eventos) y una notificación
  en `notificaciones/datos.ts`; (b) la lista de espera del cupo completo está en «Estados del sistema» de Figma (`585:53816`, `585:53965`,
  `585:54103`, `585:54252`); (c) botones de «Inscripción enviada» y «Ya estás inscrito» que no venían en el texto de Figma: T4 puso
  «Ver mi inscripción» y «Cerrar»; compáralos con `capturas/eventos/`.
- Rutas `/eventos/todas` y `/eventos/calendario` se resuelven dentro de `Eventos.tsx`.
- En ejemplos «hoy» es el 3 nov 2026 (`HOY_EJEMPLO`) para que haya próximas y pasadas; con backend usar `hoyLocal()`.
1. **Listado** (`lista.png`): encabezado, pestañas o filtros por tipo, tarjetas de actividad. Para visitante es la misma página
   con el aviso de cuenta; con sesión, cada tarjeta muestra si ya estás inscrito.
2. **Todas** (`todas.png`, `todas-vista-lista.png`): cuadrícula y vista en lista; botón para cambiar de vista.
3. **Filtros** (`filtros-abiertos.png`, `filtro-fecha-abierto.png`, `filtradas-por-fecha.png`): panel de filtros y selector de fecha.
   Pon la lógica de filtrado en `eventos/datos.ts` como funciones puras y pruébala en `tests/eventos.test.ts`.
4. **Calendario** (`calendario.png`): vista mensual con las actividades por día.
5. **Detalle** con sesión: `detalle-inscripcion-disponible` → `modal-confirmar-inscripcion` → `modal-inscripcion-enviada` →
   `detalle-ya-inscrito` / `mi-inscripcion` → `modal-cancelar-inscripcion`; casos `cancelacion-no-disponible`, `cupo-completo`,
   `actividad-cancelada`, `sin-resultados`, `cargando`, `lista-sin-inscripciones`.
6. Sin sesión, los botones de inscribirse llevan a «Inicia sesión» (como hoy). Usa `useSesion()`.
7. `TODO backend`: no hay servicio de actividades ni de inscripciones. Deja en `eventos/datos.ts` qué se espera
   (lista con filtros, detalle, inscribir, cancelar). Al inscribirte, actualiza también `perfil/datos.ts` → `inscripcionesEjemplo`
   (Mis eventos del perfil) para que se vea coherente.
8. Rutas sugeridas (agrégalas en `App.tsx`): `/eventos` (listado), `/eventos/todas`, `/eventos/calendario`, `/eventos/:id` (detalle),
   `/eventos/:id/mi-inscripcion`. Hoy `/eventos/:id` ya llega desde el carrusel de Inicio: no lo rompas.

### 3.2 Espacios con sesión — `fichas/espacios.md`, `capturas/espacios/`

**Hecho por T4 (4 nov):** `espacios/AgendaEspacios.tsx` (con sesión `/espacios` muestra pasos, aviso de credencial, plano de áreas y formulario;
sin credencial vigente el formulario queda deshabilitado), `espacios/SolicitudEspacio.tsx` (enviada, gestionar con modal de cancelación y
«no aprobada»), lógica en `espacios/datosSesion.ts` y pruebas en `tests/espaciosSesion.test.ts`. Ejemplos: `/espacios/solicitud/e1` (en revisión)
y `/espacios/solicitud/e4` (no aprobada). «Solicitar un cambio» lleva a Contacto (no hay pantalla en Figma). Lo de abajo queda como referencia.

Carpeta: `src/pages/publico/espacios/` (hoy solo la vista de visitante).
1. Con sesión y credencial vigente: `agenda.png` (pasos 1-4: credencial verificada, elegir área, fecha y horario, enviar).
2. Sin credencial vigente: `agenda-credencial-sin-validar.png` (enlace a `/credencial`). El estado sale de `credencial/datos.ts → consultarTramite()`.
3. `solicitud-enviada.png`, `gestionar-solicitud.png` y `modal-cancelar.png`.
4. Cuando exista, «Mis espacios» del perfil (`perfil/seccionesCuenta.tsx → MisEspacios`) debe enlazar al detalle en vez de `/espacios`.
5. `TODO backend`: no hay endpoint para crear o cancelar solicitudes de espacio; la lista sí sale de `GET /mis-solicitudes`.

### 3.3 Proponer una actividad — `fichas/proponer.md`, `capturas/proponer/`

**Hecho por T4 (4 nov):** `proponer/Proponer.tsx` (formulario, enviada, detalle con observaciones y corrección, «no aprobada» reutilizable
para espacios), datos en `proponer/datos.ts`, pruebas en `tests/proponer.test.ts`. Ejemplos: `/proponer/p2` (con observaciones) y `/proponer/p5`
(no aprobada). Textos que puso T4 porque Figma no los traía: botón «Reenviar propuesta», vista «Tu propuesta está en revisión», opciones de público
y motivos de cancelación de espacios. En `App.tsx` la ruta usa `DetallePropuestaUsuario` porque `DetallePropuesta` ya era del panel.

1. Crear `src/pages/publico/proponer/` y la ruta `/proponer` (**ya hay enlaces a `/proponer` en Mis propuestas del perfil**).
2. Pantallas: `formulario`, `enviado`, `mis-propuestas`, `con-observaciones`, `propuesta-no-aprobada`, `espacio-no-aprobado`.
3. «Mis propuestas» ya existe dentro del perfil (`/mi-perfil/propuestas`, conectado a `/mis-solicitudes`): reutilízalo, no lo dupliques.
4. Las cuentas de persona menor de edad **no** tienen propuestas ni espacios (`perfil/datos.ts → seccionesDe(menor)`).

### 3.4 HU-26 · Foro Club Alameda
- No hay diseño en A-02. Pídelo antes de programar.
- Ya existe la moderación del panel (T2): `src/pages/admin/participantes/moderacion.ts` (publicaciones, normas `NORMAS`,
  estados, personas silenciadas). La vista pública debe usar el **mismo modelo de datos** (normas, estados «aprobada/retirada»).

---

## 4. Reglas que no hay que olvidar
- Solo frontend; nada en `Back/` ni `Supabase/`. Sin commits ni pushes. No edites `AVANCES_ALDAHIR.md`.
- No edites `src/components/portal/*` (de T1). Excepción ya hecha: T4 conectó `MenuCuenta` en `Navegacion.tsx` a pedido de Aldahir.
- Imágenes: antes de agregar una, revisa con md5 que no exista. Exclusivas en `src/assets/<pantalla>/`, compartidas en `src/assets/comun/`.
  Los íconos de Figma solo se descargan con Figma; si te falta uno, pídelo o usa uno idéntico que ya exista.
- Al terminar: `npm run lint`, `npm test`, `npm run build` sin errores. Hoy pasan los tres (206 pruebas).

## 5. Pendientes para otros
- **T1:** decidir si el enlace «Contacto» de la barra pasa a «Buzón de sugerencias» (así está en Figma con sesión);
  mover a `comun/` los íconos que ya usan varias pantallas: `noticias/mes-siguiente.svg`, `acerca/circulo-grande.svg`,
  `inicio/lecturas-flecha-verde.svg`, `admin/resumen/file-verde.svg`.
- **Backend:** domicilio, persona responsable y cambio de correo en `/perfil`; credencial; notificaciones; inscripciones y progreso;
  crear/cancelar solicitudes de espacio y propuestas. Cada uno está descrito en su `datos.ts` con `TODO backend`.
- **Aldahir:** agregar a `AVANCES_ALDAHIR.md`: «T4: Perfil completo (adulta y menor), Credencial con sesión, Notificaciones y menú de
  cuenta; Mis espacios/propuestas conectados a /mis-solicitudes; relevo en Front/docs/relevo-t4/».

## 6. Qué probar de lo que ya hizo T4
Ver `PRUEBAS.md` en esta misma carpeta.
