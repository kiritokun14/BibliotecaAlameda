# Pruebas manuales de lo que hizo T4 (para la revisión de Aldahir)

En desarrollo (`npm run dev`) se puede revisar casi todo sin cuenta con `?simular=sesion` (o `?simular=sesion-menor`).
La barra de arriba solo cambia con una sesión real (backend levantado y una cuenta).

## Barra con sesión (cuenta real)
- A la derecha: campana con insignia y «Mi perfil · Sesión activa».
- La campana abre el panel con 3 sin leer; al presionar una, baja la insignia y lleva a su pantalla. «Ver todas las notificaciones» → `/notificaciones`.
- «Mi perfil» abre el menú (nombre, correo, tipo de cuenta, opciones y Cerrar sesión). Escape o clic fuera cierran; solo uno abierto a la vez.

## Inicio
- Con sesión, en «¿Qué quieres hacer hoy?» salen «Solicitar uso de espacio» y «Programa de actividades»; sin sesión, los textos de visitante.

## Notificaciones `/notificaciones`
- Filtros Todas / No leídas (n) / Credencial / Actividades / Avisos. La X quita una.
- «Marcar todas como leídas» deja la campana sin número. «Eliminar las leídas» abre el modal (Escape, clic fuera o Cancelar cierran).
- Sin ninguna → «Aún no tienes notificaciones».

## Credencial
- `/credencial?simular=sesion`: pasos y «Aún no tienes una solicitud». «Solicitar credencial» sin marcar «Leí en qué consiste…» → error.
- `/credencial/solicitud`: datos de la cuenta en solo lectura; enviar sin las dos casillas → error; con ellas → «Solicitud enviada» → «Ver seguimiento».
- `/credencial/seguimiento`: el selector cambia a Corrección (nombre e identificación obligatorios; al enviar vuelve a En revisión),
  Credencial disponible y Vencida («Solicitar renovación» abre la solicitud con «Renovar» elegido).

## Perfil `/mi-perfil?simular=sesion`
- Sin sesión → «Inicia sesión para ver tu perfil».
- Mis datos → Editar: nombre vacío, teléfono de menos de 10 dígitos o CP de 4 → error y foco; guardar → «Tus datos se guardaron correctamente.»
- «Cambiar correo» con el mismo correo → error; con otro → «Verifica tu nuevo correo»; «Cancelar cambio» lo quita.
- Mi credencial cambia con el estado elegido en `/credencial/seguimiento`.
- Mis eventos: filtros 5 · 2 · 3 · 0. Mis propuestas y Mis espacios: con sesión real leen `/mis-solicitudes` (vacío → «Aún no has…»; error → Reintentar).
- Progreso: sin credencial vigente sale bloqueado; con vigente, 3 de 6 y nivel 1 alcanzado.
- Avisos: los «Siempre activo» no cambian; «Guardar preferencias» → «Tus preferencias se guardaron.»; Cancelar regresa a lo guardado.
- Seguridad (cuenta real): contraseña actual mal → «La contraseña actual no es correcta.»; bien → «Tu contraseña se cambió…».
- «Cerrar sesión» (menú lateral o Seguridad) abre el modal; «Sí, cerrar sesión» sale y lleva al inicio.
- `?simular=sesion-menor`: sin Mis propuestas ni Mis espacios (`/mi-perfil/espacios` regresa al resumen); Resumen con aviso y persona
  responsable; Mis datos y Editar con persona responsable (teléfono de 10 dígitos obligatorio).

## Eventos y actividades (T-052)
- `/eventos`: categorías filtran la destacada y «Más actividades» (máx. 4); «Ver todas las actividades»; selector «Lista | Calendario».
  Con sesión (`?simular=sesion`) aparece «¿Tienes una idea para la biblioteca?».
- `/eventos/todas`: buscar «poesia» (sin acento) → Taller de poesía; fecha exacta 14/11/2026 → 2 actividades; Filtros → Cupo completo →
  Iniciación al dibujo; Tarjetas/Lista; meses Noviembre (Próximas · 6) y Octubre (Pasadas · 6); sin resultados → «Limpiar búsqueda y filtros».
- `/eventos/calendario`: flechas cambian de mes; el 14 de noviembre muestra 2 actividades; mes sin actividades → «Sin actividades este mes».
- Detalle `/eventos/agenda-circulo?simular=sesion`: «Inscribirme» → modal (Escape o clic fuera cierran) → «Confirmar inscripción» →
  «Quedaste inscrito» → «Ver mi inscripción» → «Cancelar mi inscripción» → modal → «Sí, cancelar…» regresa al detalle con «Inscripción abierta».
  Sin sesión, «Inscribirme» lleva a iniciar sesión. `/eventos/agenda-dibujo` → Cupo completo · 20 de 20. `?simular=cancelada` → actividad cancelada.

## Espacios con sesión
- `/espacios?simular=sesion`: sin credencial vigente → aviso dorado y formulario deshabilitado. Ve a `/credencial/seguimiento`, elige
  «Credencial disponible» y regresa: aviso verde y formulario activo.
- Elegir un área (cubículos no se pueden), enviar vacío → errores; fecha pasada, término antes del inicio o 0 personas → error.
  Completo → «Solicitud enviada» → «Ver mis solicitudes» → «Mi solicitud de espacio» → «Cancelar solicitud» (modal con motivo opcional) → Cancelada.
- `/espacios/solicitud/e4` → «Sala de proyección (ejemplo)» no aprobada. Desde Mis espacios del perfil los botones abren estas pantallas.

## Proponer una actividad
- `/proponer?simular=sesion`: el responsable y el teléfono vienen de la cuenta; enviar vacío marca título, descripción, público, participantes y la casilla.
  Completo → «Propuesta enviada» y una notificación nueva.
- `/proponer/p2`: observaciones del personal; «Reenviar propuesta» sin cupo → error; con cupo → vuelve a revisión. `/proponer/p5` → no aprobada.
- Sin sesión, `/proponer` pide iniciar sesión.

## Lista de espera y estados con sesión
- `/eventos/agenda-dibujo?simular=sesion` (cupo completo): «Anotarme en lista de espera» → modal → «Anotarme» → «Lugar 3 en la lista de espera»
  → «Salir de la lista de espera». Estando anotado, el enlace «Vista de ejemplo: se liberó un lugar» (solo en desarrollo) muestra
  «Lugar disponible» → «Confirmar mi lugar» → queda inscrito.
- `/cuenta-suspendida`: «Escríbenos» lleva a Contacto. `/sesion-caducada`: aviso sobre el Inicio; Escape o clic fuera lo cierran; «Iniciar sesión».

## Credencial con datos reales (cuenta real y backend levantado)
- Con una solicitud de credencial en la base: `/credencial/seguimiento`, el encabezado del perfil y Mi credencial muestran el mismo estado
  (recibida/en atención/cita → En revisión; atendida → Vigente; rechazada → Corrección con las observaciones). Sin solicitudes → «Aún no tienes una solicitud».

## Club Alameda (foro)
- `/club-alameda`: 4 temas en 2×2 con su color, número de respuestas y última actividad; «Entrar a la conversación» abre el hilo.
- `/club-alameda/cuentos-de-la-alameda` sin sesión: se leen las respuestas, no hay «Reportar» y la caja invita a iniciar sesión.
- Con `?simular=sesion`: publicar vacío o con más de 1,000 caracteres marca error. La primera respuesta sale con «En revisión»
  y no suma al contador; «Vista de ejemplo: el personal aprueba mis respuestas» la publica y la siguiente ya sale directa.
- «Reportar» → elegir norma (obligatoria) → «Enviar reporte» → «Gracias por avisarnos»; la tarjeta queda «Reportada».
- «Vista de ejemplo: cuenta silenciada» cambia la caja por «Por ahora no puedes publicar».
- Una dirección de tema que no existe regresa a `/club-alameda`.
- `/servicios`: la tarjeta Bibliocomunidad ya no dice «Próximamente»; en `/servicios/bibliocomunidad` el botón «Entrar al foro Club Alameda» abre el foro.
