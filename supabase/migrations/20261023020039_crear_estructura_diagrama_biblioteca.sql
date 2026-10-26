-- Estructura de CECANbd basada en la pagina rsqLt1oVSeJE5hEtZwWd del diagrama compartido.

-- 31 tablas nuevas. auth.users permanece administrada por Supabase.

-- Se conservan exactamente los nombres, incluidos camelCase, Contenido, slug y status.

-- No incluye registros de usuarios ni datos de prueba permanentes.

CREATE SCHEMA IF NOT EXISTS privado;

REVOKE ALL ON SCHEMA privado FROM PUBLIC, anon, authenticated;

CREATE TABLE public."perfil" (
  "id" uuid NOT NULL,
  "nombres" text NOT NULL,
  "primerApellido" text NOT NULL,
  "segundoApellido" text,
  "fechaNacimiento" date NOT NULL,
  "telefono" text NOT NULL,
  "calle" text NOT NULL,
  "numeroExterior" text NOT NULL,
  "numeroInterior" text,
  "coloniaLocalidad" text NOT NULL,
  "codigoPostal" text NOT NULL,
  "municipio" text NOT NULL,
  "estadoProvincia" text NOT NULL,
  "estatus" text NOT NULL DEFAULT 'activo',
  "creadoPor" uuid,
  "creadoA" timestamptz NOT NULL DEFAULT now(),
  "actualizadoA" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_perfil" PRIMARY KEY ("id"),
  CONSTRAINT "ck_perfil_1" CHECK ("fechaNacimiento" <= CURRENT_DATE),
  CONSTRAINT "ck_perfil_2" CHECK ("codigoPostal" ~ '^[0-9]{5}$'),
  CONSTRAINT "ck_perfil_3" CHECK ("estatus" IN ('activo', 'inactivo', 'bloqueado'))
);

CREATE TABLE public."rol" (
  "codigo" text NOT NULL,
  "nombre" text NOT NULL,
  "descripcion" text NOT NULL,
  CONSTRAINT "pk_rol" PRIMARY KEY ("codigo")
);

CREATE TABLE public."actividad" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "titulo" text NOT NULL,
  "descripcion" text NOT NULL,
  "categoria" text NOT NULL,
  "audiencia" text NOT NULL,
  "requerimientos" text NOT NULL,
  "estadoPublicacion" text NOT NULL DEFAULT 'borrador',
  "referenciaAutorizacion" text NOT NULL DEFAULT '',
  "referenciaPublicacion" text NOT NULL DEFAULT '',
  "creadoPor" uuid NOT NULL,
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_actividad" PRIMARY KEY ("id"),
  CONSTRAINT "uq_actividad_1" UNIQUE ("slug"),
  CONSTRAINT "ck_actividad_1" CHECK ("estadoPublicacion" NOT IN ('aprobada','publicada') OR nullif(btrim("referenciaAutorizacion"),'') IS NOT NULL),
  CONSTRAINT "ck_actividad_2" CHECK ("estadoPublicacion" <> 'publicada' OR nullif(btrim("referenciaPublicacion"),'') IS NOT NULL),
  CONSTRAINT "ck_actividad_3" CHECK ("estadoPublicacion" IN ('borrador', 'en_revision', 'aprobada', 'publicada', 'retirada', 'archivada'))
);

CREATE TABLE public."rolUsuario" (
  "usuarioId" uuid NOT NULL,
  "rolCodigo" text NOT NULL,
  "asignadoPor" uuid NOT NULL,
  "asignadoEn" timestamptz NOT NULL DEFAULT now(),
  "motivoAsignacion" text NOT NULL,
  CONSTRAINT "pk_rolUsuario" PRIMARY KEY ("usuarioId", "rolCodigo")
);

CREATE TABLE public."sesionActividad" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "actividadId" uuid NOT NULL,
  "espacioId" uuid NOT NULL,
  "inicio" timestamptz NOT NULL,
  "fin" timestamptz NOT NULL,
  "capacidad" int4 NOT NULL,
  "estado" text NOT NULL DEFAULT 'borrador',
  "registroAbierto" bool NOT NULL DEFAULT false,
  "referenciaAutorizacion" text NOT NULL DEFAULT '',
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_sesionActividad" PRIMARY KEY ("id"),
  CONSTRAINT "ck_sesionActividad_1" CHECK (inicio < fin),
  CONSTRAINT "ck_sesionActividad_2" CHECK (capacidad >= 0),
  CONSTRAINT "ck_sesionActividad_3" CHECK ("estado" IN ('borrador', 'programada', 'en_curso', 'finalizada', 'cancelada'))
);

CREATE TABLE public."espacio" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "nombre" text NOT NULL,
  "capacidad" int4 NOT NULL,
  "descripcion" text NOT NULL,
  "activo" bool NOT NULL DEFAULT true,
  CONSTRAINT "pk_espacio" PRIMARY KEY ("id"),
  CONSTRAINT "uq_espacio_1" UNIQUE ("slug"),
  CONSTRAINT "ck_espacio_1" CHECK (capacidad >= 0)
);

CREATE TABLE public."inscripcion" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sesionId" uuid NOT NULL,
  "usuarioId" uuid NOT NULL,
  "status" text NOT NULL DEFAULT 'pendiente',
  "decisionPor" uuid,
  "decisionRazon" text,
  "decididoA" timestamptz,
  "creadoA" timestamptz NOT NULL DEFAULT now(),
  "actualizadoA" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_inscripcion" PRIMARY KEY ("id"),
  CONSTRAINT "uq_inscripcion_1" UNIQUE ("sesionId", "usuarioId"),
  CONSTRAINT "ck_inscripcion_1" CHECK (status NOT IN ('confirmada','rechazada') OR ("decisionPor" IS NOT NULL AND "decididoA" IS NOT NULL)),
  CONSTRAINT "ck_inscripcion_2" CHECK (status <> 'rechazada' OR nullif(btrim("decisionRazon"),'') IS NOT NULL),
  CONSTRAINT "ck_inscripcion_3" CHECK ("status" IN ('pendiente', 'confirmada', 'rechazada', 'cancelada'))
);

CREATE TABLE public."personal" (
  "sesionId" uuid NOT NULL,
  "usuarioId" uuid NOT NULL,
  "asignadoPor" uuid NOT NULL,
  "asignadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_personal" PRIMARY KEY ("sesionId", "usuarioId")
);

CREATE TABLE public."historiaInscripcion" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "inscripcionId" uuid NOT NULL,
  "estadoPrevio" text,
  "estadoNuevo" text NOT NULL,
  "cambiadoPor" uuid NOT NULL,
  "razon" text NOT NULL,
  "cambiadoA" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_historiaInscripcion" PRIMARY KEY ("id"),
  CONSTRAINT "ck_historiaInscripcion_1" CHECK ("estadoNuevo" IN ('pendiente','confirmada','rechazada','cancelada')),
  CONSTRAINT "ck_historiaInscripcion_2" CHECK ("estadoPrevio" IS NULL OR "estadoPrevio" IN ('pendiente','confirmada','rechazada','cancelada'))
);

CREATE TABLE public."asistencia" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sesionId" uuid NOT NULL,
  "usuarioId" uuid NOT NULL,
  "estatus" text NOT NULL,
  "registradoPor" uuid NOT NULL,
  "horaRegistro" timestamptz NOT NULL DEFAULT now(),
  "razonCorreccion" text,
  CONSTRAINT "pk_asistencia" PRIMARY KEY ("id"),
  CONSTRAINT "uq_asistencia_1" UNIQUE ("sesionId", "usuarioId"),
  CONSTRAINT "ck_asistencia_1" CHECK ("estatus" IN ('presente', 'ausente'))
);

CREATE TABLE public."contactoTutor" (
  "usuarioId" uuid NOT NULL,
  "nombres" text NOT NULL,
  "apellidos" text NOT NULL,
  "telefono" text NOT NULL,
  "correo" text NOT NULL,
  "direccion" text NOT NULL,
  "relacion" text NOT NULL,
  CONSTRAINT "pk_contactoTutor" PRIMARY KEY ("usuarioId"),
  CONSTRAINT "ck_contactoTutor_1" CHECK ("relacion" IN ('madre', 'padre', 'tutor'))
);

CREATE TABLE public."credencialBibliotecaria" (
  "usuarioId" uuid NOT NULL,
  "numeroCredencial" text NOT NULL,
  "fechaEmision" date NOT NULL,
  "fechaVencimiento" date NOT NULL,
  "estadoValidacion" text NOT NULL DEFAULT 'pendiente',
  "validadaPor" uuid,
  "validadaEn" timestamptz,
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_credencialBibliotecaria" PRIMARY KEY ("usuarioId"),
  CONSTRAINT "uq_credencialBibliotecaria_1" UNIQUE ("numeroCredencial"),
  CONSTRAINT "ck_credencialBibliotecaria_1" CHECK ("fechaVencimiento" >= "fechaEmision"),
  CONSTRAINT "ck_credencialBibliotecaria_2" CHECK (("validadaPor" IS NULL) = ("validadaEn" IS NULL)),
  CONSTRAINT "ck_credencialBibliotecaria_3" CHECK ("estadoValidacion" <> 'validada' OR ("validadaPor" IS NOT NULL AND "validadaEn" IS NOT NULL)),
  CONSTRAINT "ck_credencialBibliotecaria_4" CHECK ("estadoValidacion" IN ('pendiente', 'validada', 'rechazada', 'vencida'))
);

CREATE TABLE public."Contenido" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "titulo" text NOT NULL,
  "tipo" text NOT NULL,
  "cuerpo" text NOT NULL,
  "autorOriginal" text NOT NULL,
  "estado" text NOT NULL DEFAULT 'borrador',
  "creadoPor" uuid NOT NULL,
  "autorizadoPor" uuid,
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "publicadoEn" timestamptz,
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_Contenido" PRIMARY KEY ("id"),
  CONSTRAINT "uq_Contenido_1" UNIQUE ("slug"),
  CONSTRAINT "ck_Contenido_1" CHECK (estado NOT IN ('aprobado','publicado') OR "autorizadoPor" IS NOT NULL),
  CONSTRAINT "ck_Contenido_2" CHECK (estado <> 'publicado' OR "publicadoEn" IS NOT NULL),
  CONSTRAINT "ck_Contenido_3" CHECK ("estado" IN ('borrador', 'en_revision', 'aprobado', 'publicado', 'retirado', 'archivado'))
);

CREATE TABLE public."mensajeContacto" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "usuarioId" uuid,
  "nombreRemitente" text NOT NULL,
  "correoContacto" text NOT NULL,
  "asunto" text NOT NULL,
  "cuerpoMensaje" text NOT NULL,
  "estadoAtencion" text NOT NULL DEFAULT 'recibido',
  "atendidoPor" uuid,
  "respuestaFinal" text,
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_mensajeContacto" PRIMARY KEY ("id"),
  CONSTRAINT "ck_mensajeContacto_1" CHECK ("estadoAtencion" <> 'cerrado' OR ("atendidoPor" IS NOT NULL AND nullif(btrim("respuestaFinal"),'') IS NOT NULL)),
  CONSTRAINT "ck_mensajeContacto_2" CHECK ("estadoAtencion" IN ('recibido', 'en_atencion', 'cerrado'))
);

CREATE TABLE public."resena" (
  "resenaId" uuid NOT NULL DEFAULT gen_random_uuid(),
  "contenidoId" uuid NOT NULL,
  "cuerpoResena" text NOT NULL,
  "estado" text NOT NULL DEFAULT 'borrador',
  "creadoPor" uuid NOT NULL,
  "moderadoPor" uuid,
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_resena" PRIMARY KEY ("resenaId"),
  CONSTRAINT "ck_resena_1" CHECK (estado <> 'publicada' OR "moderadoPor" IS NOT NULL),
  CONSTRAINT "ck_resena_2" CHECK ("estado" IN ('borrador', 'en_revision', 'aprobada', 'publicada', 'rechazada', 'retirada'))
);

CREATE TABLE public."preferenciaUsuario" (
  "id" uuid NOT NULL,
  "recibirAvisosComunidad" bool NOT NULL DEFAULT false,
  "recibirAvisosActividades" bool NOT NULL DEFAULT false,
  "canalPreferido" text NOT NULL DEFAULT 'correo',
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_preferenciaUsuario" PRIMARY KEY ("id"),
  CONSTRAINT "ck_preferenciaUsuario_1" CHECK ("canalPreferido" IN ('portal', 'correo', 'telefono', 'whatsapp_manual'))
);

CREATE TABLE public."adjuntoContenido" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "contenidoId" uuid NOT NULL,
  "urlArchivo" text NOT NULL,
  "tipoArchivo" text NOT NULL,
  "subidoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_adjuntoContenido" PRIMARY KEY ("id")
);

CREATE TABLE public."avisoNotificacion" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "usuarioId" uuid NOT NULL,
  "titulo" text NOT NULL,
  "cuerpoAviso" text NOT NULL,
  "tipoAviso" text NOT NULL,
  "estadoEnvio" text NOT NULL DEFAULT 'pendiente',
  "canalUtilizado" text NOT NULL DEFAULT 'portal',
  "evidenciaEnvio" uuid,
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "leidoEn" timestamptz,
  CONSTRAINT "pk_avisoNotificacion" PRIMARY KEY ("id"),
  CONSTRAINT "ck_avisoNotificacion_1" CHECK ("estadoEnvio" IN ('pendiente', 'enviado', 'entregado', 'fallido')),
  CONSTRAINT "ck_avisoNotificacion_2" CHECK ("canalUtilizado" IN ('portal', 'correo', 'telefono', 'whatsapp_manual'))
);

CREATE TABLE public."temaForo" (
  "temaId" uuid NOT NULL DEFAULT gen_random_uuid(),
  "titulo" text NOT NULL,
  "descripcion" text NOT NULL,
  "estadoModeracion" text NOT NULL DEFAULT 'pendiente',
  "creadoPor" uuid NOT NULL,
  "moderadoPor" uuid,
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_temaForo" PRIMARY KEY ("temaId"),
  CONSTRAINT "ck_temaForo_1" CHECK ("estadoModeracion" NOT IN ('oculto','retirado') OR "moderadoPor" IS NOT NULL),
  CONSTRAINT "ck_temaForo_2" CHECK ("estadoModeracion" IN ('pendiente', 'publicado', 'oculto', 'retirado'))
);

CREATE TABLE public."progresoUsuario" (
  "id" uuid NOT NULL,
  "nivelActual" int4 NOT NULL DEFAULT 0,
  "participacionesValidas" int4 NOT NULL DEFAULT 0,
  "puntosDisponibles" int4 NOT NULL DEFAULT 0,
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_progresoUsuario" PRIMARY KEY ("id"),
  CONSTRAINT "ck_progresoUsuario_1" CHECK ("nivelActual" BETWEEN 0 AND 2),
  CONSTRAINT "ck_progresoUsuario_2" CHECK ("participacionesValidas" >= 0),
  CONSTRAINT "ck_progresoUsuario_3" CHECK ("puntosDisponibles" >= 0)
);

CREATE TABLE public."comentarioForo" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "temaId" uuid NOT NULL,
  "cuerpoComentario" text NOT NULL,
  "estadoModeracion" text NOT NULL DEFAULT 'pendiente',
  "creadoPor" uuid NOT NULL,
  "moderadoPor" uuid,
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "leidoEn" timestamptz,
  CONSTRAINT "pk_comentarioForo" PRIMARY KEY ("id"),
  CONSTRAINT "ck_comentarioForo_1" CHECK ("estadoModeracion" NOT IN ('oculto','retirado') OR "moderadoPor" IS NOT NULL),
  CONSTRAINT "ck_comentarioForo_2" CHECK ("estadoModeracion" IN ('pendiente', 'publicado', 'oculto', 'retirado'))
);

CREATE TABLE public."recompensa" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "nombre" text NOT NULL,
  "descripcion" text NOT NULL,
  "nivelRequerido" int4 NOT NULL DEFAULT 0,
  "existencias" int4 NOT NULL DEFAULT 0,
  "fechaVigenciaInicio" timestamptz NOT NULL,
  "fechaVigenciaFin" timestamptz NOT NULL,
  "estado" text NOT NULL DEFAULT 'inactiva',
  "creadoPor" uuid NOT NULL,
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_recompensa" PRIMARY KEY ("id"),
  CONSTRAINT "ck_recompensa_1" CHECK (existencias >= 0),
  CONSTRAINT "ck_recompensa_2" CHECK ("nivelRequerido" >= 0),
  CONSTRAINT "ck_recompensa_3" CHECK ("fechaVigenciaFin" >= "fechaVigenciaInicio"),
  CONSTRAINT "ck_recompensa_4" CHECK ("estado" IN ('activa', 'inactiva', 'agotada', 'archivada'))
);

CREATE TABLE public."reporteModeracion" (
  "reporteId" uuid NOT NULL DEFAULT gen_random_uuid(),
  "temaId" uuid,
  "comentarioId" uuid,
  "motivo" text NOT NULL,
  "estadoReporte" text NOT NULL DEFAULT 'pendiente',
  "reportadoPor" uuid NOT NULL,
  "atendidoPor" uuid,
  "resolucion" text,
  "creadoEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_reporteModeracion" PRIMARY KEY ("reporteId"),
  CONSTRAINT "ck_reporteModeracion_1" CHECK (num_nonnulls("temaId","comentarioId") = 1),
  CONSTRAINT "ck_reporteModeracion_2" CHECK ("estadoReporte" NOT IN ('resuelto','descartado') OR ("atendidoPor" IS NOT NULL AND nullif(btrim(resolucion),'') IS NOT NULL)),
  CONSTRAINT "ck_reporteModeracion_3" CHECK ("estadoReporte" IN ('pendiente', 'en_revision', 'resuelto', 'descartado'))
);

CREATE TABLE public."entregaRecompensa" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "recompensaId" uuid NOT NULL,
  "usuarioId" uuid NOT NULL,
  "entregadoPor" uuid NOT NULL,
  "fechaEntrega" timestamptz NOT NULL DEFAULT now(),
  "notas" text NOT NULL,
  CONSTRAINT "pk_entregaRecompensa" PRIMARY KEY ("id")
);

CREATE TABLE public."propuestaEvento" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tituloPropuesta" text NOT NULL,
  "descripcion" text NOT NULL,
  "tipoPropuesta" text NOT NULL,
  "publicoDirigido" text NOT NULL,
  "necesidadEspacio" text NOT NULL,
  "estadoRevision" text NOT NULL DEFAULT 'borrador',
  "observacionesInstitucionales" text,
  "propuestoPor" uuid NOT NULL,
  "revisadoPor" uuid,
  "actividadId" uuid,
  "creadaEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  "frecuenciaReunion" text NOT NULL,
  "diasSolicitados" text NOT NULL,
  "horarioSolicitado" text NOT NULL,
  CONSTRAINT "pk_propuestaEvento" PRIMARY KEY ("id"),
  CONSTRAINT "ck_propuestaEvento_1" CHECK ("estadoRevision" NOT IN ('aprobada','rechazada') OR "revisadoPor" IS NOT NULL),
  CONSTRAINT "ck_propuestaEvento_2" CHECK ("estadoRevision" IN ('borrador', 'en_revision', 'requiere_correccion', 'aprobada', 'rechazada', 'cancelada'))
);

CREATE TABLE public."fuenteRAG" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tituloFuente" text NOT NULL,
  "tipoFuente" text NOT NULL,
  "contenidoReferencia" text NOT NULL,
  "estadoFuente" text NOT NULL DEFAULT 'borrador',
  "version" int4 NOT NULL DEFAULT 1,
  "subidaPor" uuid NOT NULL,
  "aprobadaPor" uuid,
  "creadaEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadaEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_fuenteRAG" PRIMARY KEY ("id"),
  CONSTRAINT "ck_fuenteRAG_1" CHECK (version > 0),
  CONSTRAINT "ck_fuenteRAG_2" CHECK ("estadoFuente" <> 'aprobada' OR "aprobadaPor" IS NOT NULL),
  CONSTRAINT "ck_fuenteRAG_3" CHECK ("estadoFuente" IN ('borrador', 'en_revision', 'aprobada', 'retirada'))
);

CREATE TABLE public."canalizacionAsistente" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "usuarioId" uuid,
  "nombreContacto" text NOT NULL,
  "correoContacto" text NOT NULL,
  "contextoConversacion" text NOT NULL,
  "motivoCanalizacion" text NOT NULL,
  "estadoCanalizacion" text NOT NULL DEFAULT 'recibida',
  "atendidaPor" uuid,
  "resolucionFinal" text,
  "creadaEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadaEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_canalizacionAsistente" PRIMARY KEY ("id"),
  CONSTRAINT "ck_canalizacionAsistente_1" CHECK ("estadoCanalizacion" <> 'cerrada' OR ("atendidaPor" IS NOT NULL AND nullif(btrim("resolucionFinal"),'') IS NOT NULL)),
  CONSTRAINT "ck_canalizacionAsistente_2" CHECK ("estadoCanalizacion" IN ('recibida', 'en_atencion', 'cerrada'))
);

CREATE TABLE public."solicitudEspacio" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "propositoVisita" text NOT NULL,
  "cantidadPersonas" integer NOT NULL,
  "espacioSolicitadoId" uuid,
  "fechaInicioSolicitado" timestamptz NOT NULL,
  "fechaFinSolicitado" timestamptz NOT NULL,
  "estadoSolicitud" text NOT NULL DEFAULT 'borrador',
  "observaciones" text,
  "solicitadoPor" uuid NOT NULL,
  "autorizadoPor" uuid,
  "sesionAsignadaId" uuid,
  "creadaEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadoEn" timestamptz NOT NULL DEFAULT now(),
  "nombreInstitucion" text,
  "nombreResponsable" text NOT NULL,
  "telefonoContacto" text NOT NULL,
  "correoContacto" text NOT NULL,
  CONSTRAINT "pk_solicitudEspacio" PRIMARY KEY ("id"),
  CONSTRAINT "ck_solicitudEspacio_1" CHECK ("cantidadPersonas" > 0),
  CONSTRAINT "ck_solicitudEspacio_2" CHECK ("fechaInicioSolicitado" < "fechaFinSolicitado"),
  CONSTRAINT "ck_solicitudEspacio_3" CHECK ("estadoSolicitud" NOT IN ('aprobada','rechazada') OR "autorizadoPor" IS NOT NULL),
  CONSTRAINT "ck_solicitudEspacio_4" CHECK ("estadoSolicitud" IN ('borrador', 'en_revision', 'requiere_correccion', 'aprobada', 'rechazada', 'cancelada'))
);

CREATE TABLE public."solicitudCredencial" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "usuarioId" uuid NOT NULL,
  "tipoSolicitud" text NOT NULL,
  "estadoSolicitud" text NOT NULL DEFAULT 'recibida',
  "fechaCita" timestamptz,
  "atendidaPor" uuid,
  "observaciones" text,
  "creadaEn" timestamptz NOT NULL DEFAULT now(),
  "actualizadaEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_solicitudCredencial" PRIMARY KEY ("id"),
  CONSTRAINT "ck_solicitudCredencial_1" CHECK ("estadoSolicitud" <> 'atendida' OR "atendidaPor" IS NOT NULL),
  CONSTRAINT "ck_solicitudCredencial_2" CHECK ("estadoSolicitud" <> 'cita_programada' OR "fechaCita" IS NOT NULL),
  CONSTRAINT "ck_solicitudCredencial_3" CHECK ("tipoSolicitud" IN ('obtencion', 'renovacion')),
  CONSTRAINT "ck_solicitudCredencial_4" CHECK ("estadoSolicitud" IN ('recibida', 'en_atencion', 'cita_programada', 'atendida', 'rechazada', 'cancelada'))
);

CREATE TABLE public."evidenciaActividad" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sesionId" uuid NOT NULL,
  "rutaArchivo" text NOT NULL,
  "tipoArchivo" text NOT NULL,
  "descripcion" text NOT NULL,
  "visibilidad" text NOT NULL DEFAULT 'privada',
  "subidaPor" uuid NOT NULL,
  "autorizadaPor" uuid,
  "autorizadaEn" timestamptz,
  "creadaEn" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_evidenciaActividad" PRIMARY KEY ("id"),
  CONSTRAINT "ck_evidenciaActividad_1" CHECK ("tipoArchivo" IN ('pdf','jpg','jpeg','png','application/pdf','image/jpeg','image/png')),
  CONSTRAINT "ck_evidenciaActividad_2" CHECK (("autorizadaPor" IS NULL) = ("autorizadaEn" IS NULL)),
  CONSTRAINT "ck_evidenciaActividad_3" CHECK (visibilidad <> 'publica' OR ("autorizadaPor" IS NOT NULL AND "autorizadaEn" IS NOT NULL)),
  CONSTRAINT "ck_evidenciaActividad_4" CHECK ("visibilidad" IN ('privada', 'publica'))
);

CREATE TABLE public."solicitudCambioActividad" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "actividadId" uuid NOT NULL,
  "sesionId" uuid,
  "tipoSolicitud" text NOT NULL,
  "detalleSolicitado" text NOT NULL,
  "motivo" text NOT NULL,
  "estadoSolicitud" text NOT NULL DEFAULT 'pendiente',
  "solicitadaPor" uuid NOT NULL,
  "revisadaPor" uuid,
  "resolucion" text,
  "creadaEn" timestamptz NOT NULL DEFAULT now(),
  "resueltaEn" timestamptz,
  CONSTRAINT "pk_solicitudCambioActividad" PRIMARY KEY ("id"),
  CONSTRAINT "ck_solicitudCambioActividad_1" CHECK ("estadoSolicitud" NOT IN ('aprobada','rechazada') OR ("revisadaPor" IS NOT NULL AND "resueltaEn" IS NOT NULL AND nullif(btrim(resolucion),'') IS NOT NULL)),
  CONSTRAINT "ck_solicitudCambioActividad_2" CHECK ("tipoSolicitud" IN ('cambio', 'cancelacion')),
  CONSTRAINT "ck_solicitudCambioActividad_3" CHECK ("estadoSolicitud" IN ('pendiente', 'en_revision', 'aprobada', 'rechazada', 'cancelada'))
);

ALTER TABLE public."perfil" ADD CONSTRAINT "fk_perfil_id" FOREIGN KEY ("id") REFERENCES auth.users ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public."perfil" ADD CONSTRAINT "fk_perfil_creadoPor" FOREIGN KEY ("creadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_perfil_creadoPor" ON public."perfil" ("creadoPor");

ALTER TABLE public."actividad" ADD CONSTRAINT "fk_actividad_creadoPor" FOREIGN KEY ("creadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_actividad_creadoPor" ON public."actividad" ("creadoPor");

ALTER TABLE public."rolUsuario" ADD CONSTRAINT "fk_rolUsuario_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public."rolUsuario" ADD CONSTRAINT "fk_rolUsuario_asignadoPor" FOREIGN KEY ("asignadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_rolUsuario_asignadoPor" ON public."rolUsuario" ("asignadoPor");

ALTER TABLE public."inscripcion" ADD CONSTRAINT "fk_inscripcion_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_inscripcion_usuarioId" ON public."inscripcion" ("usuarioId");

ALTER TABLE public."inscripcion" ADD CONSTRAINT "fk_inscripcion_decisionPor" FOREIGN KEY ("decisionPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_inscripcion_decisionPor" ON public."inscripcion" ("decisionPor");

ALTER TABLE public."personal" ADD CONSTRAINT "fk_personal_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_personal_usuarioId" ON public."personal" ("usuarioId");

ALTER TABLE public."personal" ADD CONSTRAINT "fk_personal_asignadoPor" FOREIGN KEY ("asignadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_personal_asignadoPor" ON public."personal" ("asignadoPor");

ALTER TABLE public."historiaInscripcion" ADD CONSTRAINT "fk_historiaInscripcion_cambiadoPor" FOREIGN KEY ("cambiadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_historiaInscripcion_cambiadoPor" ON public."historiaInscripcion" ("cambiadoPor");

ALTER TABLE public."asistencia" ADD CONSTRAINT "fk_asistencia_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_asistencia_usuarioId" ON public."asistencia" ("usuarioId");

ALTER TABLE public."asistencia" ADD CONSTRAINT "fk_asistencia_registradoPor" FOREIGN KEY ("registradoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_asistencia_registradoPor" ON public."asistencia" ("registradoPor");

ALTER TABLE public."contactoTutor" ADD CONSTRAINT "fk_contactoTutor_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public."credencialBibliotecaria" ADD CONSTRAINT "fk_credencialBibliotecaria_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public."credencialBibliotecaria" ADD CONSTRAINT "fk_credencialBibliotecaria_validadaPor" FOREIGN KEY ("validadaPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_credencialBibliotecaria_validadaPor" ON public."credencialBibliotecaria" ("validadaPor");

ALTER TABLE public."Contenido" ADD CONSTRAINT "fk_Contenido_creadoPor" FOREIGN KEY ("creadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_Contenido_creadoPor" ON public."Contenido" ("creadoPor");

ALTER TABLE public."Contenido" ADD CONSTRAINT "fk_Contenido_autorizadoPor" FOREIGN KEY ("autorizadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_Contenido_autorizadoPor" ON public."Contenido" ("autorizadoPor");

ALTER TABLE public."mensajeContacto" ADD CONSTRAINT "fk_mensajeContacto_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_mensajeContacto_usuarioId" ON public."mensajeContacto" ("usuarioId");

ALTER TABLE public."mensajeContacto" ADD CONSTRAINT "fk_mensajeContacto_atendidoPor" FOREIGN KEY ("atendidoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_mensajeContacto_atendidoPor" ON public."mensajeContacto" ("atendidoPor");

ALTER TABLE public."resena" ADD CONSTRAINT "fk_resena_creadoPor" FOREIGN KEY ("creadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_resena_creadoPor" ON public."resena" ("creadoPor");

ALTER TABLE public."resena" ADD CONSTRAINT "fk_resena_moderadoPor" FOREIGN KEY ("moderadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_resena_moderadoPor" ON public."resena" ("moderadoPor");

ALTER TABLE public."preferenciaUsuario" ADD CONSTRAINT "fk_preferenciaUsuario_id" FOREIGN KEY ("id") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public."avisoNotificacion" ADD CONSTRAINT "fk_avisoNotificacion_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_avisoNotificacion_usuarioId" ON public."avisoNotificacion" ("usuarioId");

ALTER TABLE public."temaForo" ADD CONSTRAINT "fk_temaForo_creadoPor" FOREIGN KEY ("creadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_temaForo_creadoPor" ON public."temaForo" ("creadoPor");

ALTER TABLE public."temaForo" ADD CONSTRAINT "fk_temaForo_moderadoPor" FOREIGN KEY ("moderadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_temaForo_moderadoPor" ON public."temaForo" ("moderadoPor");

ALTER TABLE public."progresoUsuario" ADD CONSTRAINT "fk_progresoUsuario_id" FOREIGN KEY ("id") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public."comentarioForo" ADD CONSTRAINT "fk_comentarioForo_creadoPor" FOREIGN KEY ("creadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_comentarioForo_creadoPor" ON public."comentarioForo" ("creadoPor");

ALTER TABLE public."comentarioForo" ADD CONSTRAINT "fk_comentarioForo_moderadoPor" FOREIGN KEY ("moderadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_comentarioForo_moderadoPor" ON public."comentarioForo" ("moderadoPor");

ALTER TABLE public."recompensa" ADD CONSTRAINT "fk_recompensa_creadoPor" FOREIGN KEY ("creadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_recompensa_creadoPor" ON public."recompensa" ("creadoPor");

ALTER TABLE public."reporteModeracion" ADD CONSTRAINT "fk_reporteModeracion_reportadoPor" FOREIGN KEY ("reportadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_reporteModeracion_reportadoPor" ON public."reporteModeracion" ("reportadoPor");

ALTER TABLE public."reporteModeracion" ADD CONSTRAINT "fk_reporteModeracion_atendidoPor" FOREIGN KEY ("atendidoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_reporteModeracion_atendidoPor" ON public."reporteModeracion" ("atendidoPor");

ALTER TABLE public."entregaRecompensa" ADD CONSTRAINT "fk_entregaRecompensa_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_entregaRecompensa_usuarioId" ON public."entregaRecompensa" ("usuarioId");

ALTER TABLE public."entregaRecompensa" ADD CONSTRAINT "fk_entregaRecompensa_entregadoPor" FOREIGN KEY ("entregadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_entregaRecompensa_entregadoPor" ON public."entregaRecompensa" ("entregadoPor");

ALTER TABLE public."propuestaEvento" ADD CONSTRAINT "fk_propuestaEvento_propuestoPor" FOREIGN KEY ("propuestoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_propuestaEvento_propuestoPor" ON public."propuestaEvento" ("propuestoPor");

ALTER TABLE public."propuestaEvento" ADD CONSTRAINT "fk_propuestaEvento_revisadoPor" FOREIGN KEY ("revisadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_propuestaEvento_revisadoPor" ON public."propuestaEvento" ("revisadoPor");

ALTER TABLE public."fuenteRAG" ADD CONSTRAINT "fk_fuenteRAG_subidaPor" FOREIGN KEY ("subidaPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_fuenteRAG_subidaPor" ON public."fuenteRAG" ("subidaPor");

ALTER TABLE public."fuenteRAG" ADD CONSTRAINT "fk_fuenteRAG_aprobadaPor" FOREIGN KEY ("aprobadaPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_fuenteRAG_aprobadaPor" ON public."fuenteRAG" ("aprobadaPor");

ALTER TABLE public."canalizacionAsistente" ADD CONSTRAINT "fk_canalizacionAsistente_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_canalizacionAsistente_usuarioId" ON public."canalizacionAsistente" ("usuarioId");

ALTER TABLE public."canalizacionAsistente" ADD CONSTRAINT "fk_canalizacionAsistente_atendidaPor" FOREIGN KEY ("atendidaPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_canalizacionAsistente_atendidaPor" ON public."canalizacionAsistente" ("atendidaPor");

ALTER TABLE public."solicitudEspacio" ADD CONSTRAINT "fk_solicitudEspacio_solicitadoPor" FOREIGN KEY ("solicitadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudEspacio_solicitadoPor" ON public."solicitudEspacio" ("solicitadoPor");

ALTER TABLE public."solicitudEspacio" ADD CONSTRAINT "fk_solicitudEspacio_autorizadoPor" FOREIGN KEY ("autorizadoPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudEspacio_autorizadoPor" ON public."solicitudEspacio" ("autorizadoPor");

ALTER TABLE public."solicitudCredencial" ADD CONSTRAINT "fk_solicitudCredencial_usuarioId" FOREIGN KEY ("usuarioId") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudCredencial_usuarioId" ON public."solicitudCredencial" ("usuarioId");

ALTER TABLE public."solicitudCredencial" ADD CONSTRAINT "fk_solicitudCredencial_atendidaPor" FOREIGN KEY ("atendidaPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudCredencial_atendidaPor" ON public."solicitudCredencial" ("atendidaPor");

ALTER TABLE public."evidenciaActividad" ADD CONSTRAINT "fk_evidenciaActividad_subidaPor" FOREIGN KEY ("subidaPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_evidenciaActividad_subidaPor" ON public."evidenciaActividad" ("subidaPor");

ALTER TABLE public."evidenciaActividad" ADD CONSTRAINT "fk_evidenciaActividad_autorizadaPor" FOREIGN KEY ("autorizadaPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_evidenciaActividad_autorizadaPor" ON public."evidenciaActividad" ("autorizadaPor");

ALTER TABLE public."solicitudCambioActividad" ADD CONSTRAINT "fk_solicitudCambioActividad_solicitadaPor" FOREIGN KEY ("solicitadaPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudCambioActividad_solicitadaPor" ON public."solicitudCambioActividad" ("solicitadaPor");

ALTER TABLE public."solicitudCambioActividad" ADD CONSTRAINT "fk_solicitudCambioActividad_revisadaPor" FOREIGN KEY ("revisadaPor") REFERENCES public."perfil" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudCambioActividad_revisadaPor" ON public."solicitudCambioActividad" ("revisadaPor");

ALTER TABLE public."rolUsuario" ADD CONSTRAINT "fk_rolUsuario_rolCodigo" FOREIGN KEY ("rolCodigo") REFERENCES public."rol" ("codigo") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_rolUsuario_rolCodigo" ON public."rolUsuario" ("rolCodigo");

ALTER TABLE public."sesionActividad" ADD CONSTRAINT "fk_sesionActividad_actividadId" FOREIGN KEY ("actividadId") REFERENCES public."actividad" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_sesionActividad_actividadId" ON public."sesionActividad" ("actividadId");

ALTER TABLE public."sesionActividad" ADD CONSTRAINT "fk_sesionActividad_espacioId" FOREIGN KEY ("espacioId") REFERENCES public."espacio" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_sesionActividad_espacioId" ON public."sesionActividad" ("espacioId");

ALTER TABLE public."inscripcion" ADD CONSTRAINT "fk_inscripcion_sesionId" FOREIGN KEY ("sesionId") REFERENCES public."sesionActividad" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public."personal" ADD CONSTRAINT "fk_personal_sesionId" FOREIGN KEY ("sesionId") REFERENCES public."sesionActividad" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public."historiaInscripcion" ADD CONSTRAINT "fk_historiaInscripcion_inscripcionId" FOREIGN KEY ("inscripcionId") REFERENCES public."inscripcion" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_historiaInscripcion_inscripcionId" ON public."historiaInscripcion" ("inscripcionId");

ALTER TABLE public."asistencia" ADD CONSTRAINT "fk_asistencia_sesionId" FOREIGN KEY ("sesionId") REFERENCES public."sesionActividad" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public."resena" ADD CONSTRAINT "fk_resena_contenidoId" FOREIGN KEY ("contenidoId") REFERENCES public."Contenido" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_resena_contenidoId" ON public."resena" ("contenidoId");

ALTER TABLE public."adjuntoContenido" ADD CONSTRAINT "fk_adjuntoContenido_contenidoId" FOREIGN KEY ("contenidoId") REFERENCES public."Contenido" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_adjuntoContenido_contenidoId" ON public."adjuntoContenido" ("contenidoId");

ALTER TABLE public."comentarioForo" ADD CONSTRAINT "fk_comentarioForo_temaId" FOREIGN KEY ("temaId") REFERENCES public."temaForo" ("temaId") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_comentarioForo_temaId" ON public."comentarioForo" ("temaId");

ALTER TABLE public."reporteModeracion" ADD CONSTRAINT "fk_reporteModeracion_temaId" FOREIGN KEY ("temaId") REFERENCES public."temaForo" ("temaId") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_reporteModeracion_temaId" ON public."reporteModeracion" ("temaId");

ALTER TABLE public."reporteModeracion" ADD CONSTRAINT "fk_reporteModeracion_comentarioId" FOREIGN KEY ("comentarioId") REFERENCES public."comentarioForo" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_reporteModeracion_comentarioId" ON public."reporteModeracion" ("comentarioId");

ALTER TABLE public."entregaRecompensa" ADD CONSTRAINT "fk_entregaRecompensa_recompensaId" FOREIGN KEY ("recompensaId") REFERENCES public."recompensa" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_entregaRecompensa_recompensaId" ON public."entregaRecompensa" ("recompensaId");

ALTER TABLE public."propuestaEvento" ADD CONSTRAINT "fk_propuestaEvento_actividadId" FOREIGN KEY ("actividadId") REFERENCES public."actividad" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_propuestaEvento_actividadId" ON public."propuestaEvento" ("actividadId");

ALTER TABLE public."solicitudEspacio" ADD CONSTRAINT "fk_solicitudEspacio_espacioSolicitadoId" FOREIGN KEY ("espacioSolicitadoId") REFERENCES public."espacio" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudEspacio_espacioSolicitadoId" ON public."solicitudEspacio" ("espacioSolicitadoId");

ALTER TABLE public."solicitudEspacio" ADD CONSTRAINT "fk_solicitudEspacio_sesionAsignadaId" FOREIGN KEY ("sesionAsignadaId") REFERENCES public."sesionActividad" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudEspacio_sesionAsignadaId" ON public."solicitudEspacio" ("sesionAsignadaId");

ALTER TABLE public."evidenciaActividad" ADD CONSTRAINT "fk_evidenciaActividad_sesionId" FOREIGN KEY ("sesionId") REFERENCES public."sesionActividad" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_evidenciaActividad_sesionId" ON public."evidenciaActividad" ("sesionId");

ALTER TABLE public."solicitudCambioActividad" ADD CONSTRAINT "fk_solicitudCambioActividad_actividadId" FOREIGN KEY ("actividadId") REFERENCES public."actividad" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudCambioActividad_actividadId" ON public."solicitudCambioActividad" ("actividadId");

ALTER TABLE public."solicitudCambioActividad" ADD CONSTRAINT "fk_solicitudCambioActividad_sesionId" FOREIGN KEY ("sesionId") REFERENCES public."sesionActividad" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX "ix_solicitudCambioActividad_sesionId" ON public."solicitudCambioActividad" ("sesionId");

COMMENT ON TABLE public."perfil" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."perfil"."estatus" IS 'Valores permitidos: activo, inactivo, bloqueado';

COMMENT ON TABLE public."rol" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON TABLE public."actividad" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."actividad"."estadoPublicacion" IS 'Valores permitidos: borrador, en_revision, aprobada, publicada, retirada, archivada';

COMMENT ON TABLE public."rolUsuario" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON TABLE public."sesionActividad" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."sesionActividad"."estado" IS 'Valores permitidos: borrador, programada, en_curso, finalizada, cancelada';

COMMENT ON TABLE public."espacio" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON TABLE public."inscripcion" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."inscripcion"."status" IS 'Valores permitidos: pendiente, confirmada, rechazada, cancelada';

COMMENT ON TABLE public."personal" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON TABLE public."historiaInscripcion" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON TABLE public."asistencia" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."asistencia"."estatus" IS 'Valores permitidos: presente, ausente';

COMMENT ON TABLE public."contactoTutor" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."contactoTutor"."relacion" IS 'Valores permitidos: madre, padre, tutor';

COMMENT ON TABLE public."credencialBibliotecaria" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."credencialBibliotecaria"."estadoValidacion" IS 'Valores permitidos: pendiente, validada, rechazada, vencida';

COMMENT ON TABLE public."Contenido" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."Contenido"."estado" IS 'Valores permitidos: borrador, en_revision, aprobado, publicado, retirado, archivado';

COMMENT ON TABLE public."mensajeContacto" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."mensajeContacto"."estadoAtencion" IS 'Valores permitidos: recibido, en_atencion, cerrado';

COMMENT ON TABLE public."resena" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."resena"."estado" IS 'Valores permitidos: borrador, en_revision, aprobada, publicada, rechazada, retirada';

COMMENT ON TABLE public."preferenciaUsuario" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."preferenciaUsuario"."canalPreferido" IS 'Valores permitidos: portal, correo, telefono, whatsapp_manual';

COMMENT ON TABLE public."adjuntoContenido" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON TABLE public."avisoNotificacion" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."avisoNotificacion"."estadoEnvio" IS 'Valores permitidos: pendiente, enviado, entregado, fallido';

COMMENT ON COLUMN public."avisoNotificacion"."canalUtilizado" IS 'Valores permitidos: portal, correo, telefono, whatsapp_manual';

COMMENT ON TABLE public."temaForo" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."temaForo"."estadoModeracion" IS 'Valores permitidos: pendiente, publicado, oculto, retirado';

COMMENT ON TABLE public."progresoUsuario" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON TABLE public."comentarioForo" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."comentarioForo"."estadoModeracion" IS 'Valores permitidos: pendiente, publicado, oculto, retirado';

COMMENT ON TABLE public."recompensa" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."recompensa"."estado" IS 'Valores permitidos: activa, inactiva, agotada, archivada';

COMMENT ON TABLE public."reporteModeracion" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."reporteModeracion"."estadoReporte" IS 'Valores permitidos: pendiente, en_revision, resuelto, descartado';

COMMENT ON TABLE public."entregaRecompensa" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON TABLE public."propuestaEvento" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."propuestaEvento"."estadoRevision" IS 'Valores permitidos: borrador, en_revision, requiere_correccion, aprobada, rechazada, cancelada';

COMMENT ON TABLE public."fuenteRAG" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."fuenteRAG"."estadoFuente" IS 'Valores permitidos: borrador, en_revision, aprobada, retirada';

COMMENT ON TABLE public."canalizacionAsistente" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."canalizacionAsistente"."estadoCanalizacion" IS 'Valores permitidos: recibida, en_atencion, cerrada';

COMMENT ON TABLE public."solicitudEspacio" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."solicitudEspacio"."estadoSolicitud" IS 'Valores permitidos: borrador, en_revision, requiere_correccion, aprobada, rechazada, cancelada';

COMMENT ON TABLE public."solicitudCredencial" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."solicitudCredencial"."tipoSolicitud" IS 'Valores permitidos: obtencion, renovacion';

COMMENT ON COLUMN public."solicitudCredencial"."estadoSolicitud" IS 'Valores permitidos: recibida, en_atencion, cita_programada, atendida, rechazada, cancelada';

COMMENT ON TABLE public."evidenciaActividad" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."evidenciaActividad"."visibilidad" IS 'Valores permitidos: privada, publica';

COMMENT ON TABLE public."solicitudCambioActividad" IS 'Entidad del diagrama ER Biblioteca, pagina rsqLt1oVSeJE5hEtZwWd. Borrado restringido para conservar relaciones e historial.';

COMMENT ON COLUMN public."solicitudCambioActividad"."tipoSolicitud" IS 'Valores permitidos: cambio, cancelacion';

COMMENT ON COLUMN public."solicitudCambioActividad"."estadoSolicitud" IS 'Valores permitidos: pendiente, en_revision, aprobada, rechazada, cancelada';

COMMENT ON COLUMN public."avisoNotificacion"."evidenciaEnvio" IS 'UUID de correlacion de una evidencia externa de envio. Es opcional mientras no exista evidencia; no es una FK ni acredita entrega por si mismo.';

COMMENT ON COLUMN public."canalizacionAsistente"."contextoConversacion" IS 'Solo consulta o resumen minimo confirmado para canalizar; no almacenar conversaciones completas ni documentos privados.';

COMMENT ON COLUMN public."evidenciaActividad"."rutaArchivo" IS 'Ruta estable del objeto en Storage. El tamaño maximo de 10 MB se valida al cargar; no guardar URLs firmadas temporales.';

COMMENT ON TABLE public."progresoUsuario" IS 'Acumulado derivado de asistencias verificadas y credencial vigente a la participacion. Recalcular transaccionalmente en el backend; no incrementar por reintentos. Puntos no implican premio garantizado.';

COMMENT ON TABLE public."sesionActividad" IS 'Sesion de una actividad. registroAbierto indica apertura de solicitudes, no si la sesion exige inscripcion; esa regla se valida en el flujo autorizado del backend.';

COMMENT ON TABLE public."historiaInscripcion" IS 'El backend registra cada cambio con actor y razon en la misma transaccion que la inscripcion.';

COMMENT ON TABLE public."fuenteRAG" IS 'Catalogo de fuentes y versiones. La fragmentacion, embeddings y proveedor no estan definidos por este diagrama y no agregan tablas en esta migracion.';

ALTER TABLE public."perfil" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."perfil" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."perfil" TO service_role;

GRANT SELECT ON TABLE public."perfil" TO authenticated;

CREATE POLICY "lectura_propia_perfil" ON public."perfil" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "id");

ALTER TABLE public."rol" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."rol" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."rol" TO service_role;

GRANT SELECT ON TABLE public.rol TO authenticated;

CREATE POLICY lectura_catalogo_roles ON public.rol FOR SELECT TO authenticated USING (true);

ALTER TABLE public."actividad" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."actividad" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."actividad" TO service_role;

GRANT SELECT ON TABLE public."actividad" TO anon, authenticated;

CREATE POLICY "lectura_publicada_actividad" ON public."actividad" FOR SELECT TO anon, authenticated USING ("estadoPublicacion" = 'publicada');

ALTER TABLE public."rolUsuario" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."rolUsuario" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."rolUsuario" TO service_role;

GRANT SELECT ON TABLE public."rolUsuario" TO authenticated;

CREATE POLICY "lectura_propia_rolUsuario" ON public."rolUsuario" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."sesionActividad" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."sesionActividad" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."sesionActividad" TO service_role;

GRANT SELECT ON TABLE public."sesionActividad" TO anon, authenticated;

CREATE POLICY "lectura_publicada_sesionActividad" ON public."sesionActividad" FOR SELECT TO anon, authenticated USING (estado IN ('programada','en_curso','finalizada','cancelada') AND EXISTS (SELECT 1 FROM public.actividad a WHERE a.id = "actividadId" AND a."estadoPublicacion" = 'publicada'));

ALTER TABLE public."espacio" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."espacio" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."espacio" TO service_role;

GRANT SELECT ON TABLE public."espacio" TO anon, authenticated;

CREATE POLICY "lectura_publicada_espacio" ON public."espacio" FOR SELECT TO anon, authenticated USING (activo);

ALTER TABLE public."inscripcion" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."inscripcion" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."inscripcion" TO service_role;

GRANT SELECT ON TABLE public."inscripcion" TO authenticated;

CREATE POLICY "lectura_propia_inscripcion" ON public."inscripcion" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."personal" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."personal" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."personal" TO service_role;

GRANT SELECT ON TABLE public."personal" TO authenticated;

CREATE POLICY "lectura_propia_personal" ON public."personal" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."historiaInscripcion" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."historiaInscripcion" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."historiaInscripcion" TO service_role;

GRANT SELECT ON TABLE public."historiaInscripcion" TO authenticated;

CREATE POLICY lectura_historia_propia ON public."historiaInscripcion" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.inscripcion i WHERE i.id = "inscripcionId" AND i."usuarioId" = (SELECT auth.uid())));

ALTER TABLE public."asistencia" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."asistencia" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."asistencia" TO service_role;

GRANT SELECT ON TABLE public."asistencia" TO authenticated;

CREATE POLICY "lectura_propia_asistencia" ON public."asistencia" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."contactoTutor" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."contactoTutor" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."contactoTutor" TO service_role;

GRANT SELECT ON TABLE public."contactoTutor" TO authenticated;

CREATE POLICY "lectura_propia_contactoTutor" ON public."contactoTutor" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."credencialBibliotecaria" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."credencialBibliotecaria" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."credencialBibliotecaria" TO service_role;

GRANT SELECT ON TABLE public."credencialBibliotecaria" TO authenticated;

CREATE POLICY "lectura_propia_credencialBibliotecaria" ON public."credencialBibliotecaria" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."Contenido" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."Contenido" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."Contenido" TO service_role;

GRANT SELECT ON TABLE public."Contenido" TO anon, authenticated;

CREATE POLICY "lectura_publicada_Contenido" ON public."Contenido" FOR SELECT TO anon, authenticated USING (estado = 'publicado' AND "autorizadoPor" IS NOT NULL);

GRANT SELECT ON TABLE public."Contenido" TO authenticated;

CREATE POLICY "lectura_autor_Contenido" ON public."Contenido" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "creadoPor");

ALTER TABLE public."mensajeContacto" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."mensajeContacto" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."mensajeContacto" TO service_role;

GRANT SELECT ON TABLE public."mensajeContacto" TO authenticated;

CREATE POLICY "lectura_propia_mensajeContacto" ON public."mensajeContacto" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."resena" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."resena" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."resena" TO service_role;

GRANT SELECT ON TABLE public."resena" TO anon, authenticated;

CREATE POLICY "lectura_publicada_resena" ON public."resena" FOR SELECT TO anon, authenticated USING (estado = 'publicada' AND EXISTS (SELECT 1 FROM public."Contenido" c WHERE c.id = "contenidoId" AND c.estado = 'publicado'));

GRANT SELECT ON TABLE public."resena" TO authenticated;

CREATE POLICY "lectura_autor_resena" ON public."resena" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "creadoPor");

ALTER TABLE public."preferenciaUsuario" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."preferenciaUsuario" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."preferenciaUsuario" TO service_role;

GRANT SELECT ON TABLE public."preferenciaUsuario" TO authenticated;

CREATE POLICY "lectura_propia_preferenciaUsuario" ON public."preferenciaUsuario" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "id");

ALTER TABLE public."adjuntoContenido" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."adjuntoContenido" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."adjuntoContenido" TO service_role;

GRANT SELECT ON TABLE public."adjuntoContenido" TO anon, authenticated;

CREATE POLICY "lectura_publicada_adjuntoContenido" ON public."adjuntoContenido" FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public."Contenido" c WHERE c.id = "contenidoId" AND c.estado = 'publicado'));

ALTER TABLE public."avisoNotificacion" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."avisoNotificacion" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."avisoNotificacion" TO service_role;

GRANT SELECT ON TABLE public."avisoNotificacion" TO authenticated;

CREATE POLICY "lectura_propia_avisoNotificacion" ON public."avisoNotificacion" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."temaForo" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."temaForo" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."temaForo" TO service_role;

GRANT SELECT ON TABLE public."temaForo" TO anon, authenticated;

CREATE POLICY "lectura_publicada_temaForo" ON public."temaForo" FOR SELECT TO anon, authenticated USING ("estadoModeracion" = 'publicado');

GRANT SELECT ON TABLE public."temaForo" TO authenticated;

CREATE POLICY "lectura_autor_temaForo" ON public."temaForo" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "creadoPor");

ALTER TABLE public."progresoUsuario" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."progresoUsuario" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."progresoUsuario" TO service_role;

GRANT SELECT ON TABLE public."progresoUsuario" TO authenticated;

CREATE POLICY "lectura_propia_progresoUsuario" ON public."progresoUsuario" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "id");

ALTER TABLE public."comentarioForo" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."comentarioForo" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."comentarioForo" TO service_role;

GRANT SELECT ON TABLE public."comentarioForo" TO anon, authenticated;

CREATE POLICY "lectura_publicada_comentarioForo" ON public."comentarioForo" FOR SELECT TO anon, authenticated USING ("estadoModeracion" = 'publicado' AND EXISTS (SELECT 1 FROM public."temaForo" t WHERE t."temaId" = "comentarioForo"."temaId" AND t."estadoModeracion" = 'publicado'));

GRANT SELECT ON TABLE public."comentarioForo" TO authenticated;

CREATE POLICY "lectura_autor_comentarioForo" ON public."comentarioForo" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "creadoPor");

ALTER TABLE public."recompensa" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."recompensa" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."recompensa" TO service_role;

GRANT SELECT ON TABLE public.recompensa TO authenticated;

CREATE POLICY lectura_recompensas_activas ON public.recompensa FOR SELECT TO authenticated USING (estado = 'activa');

ALTER TABLE public."reporteModeracion" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."reporteModeracion" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."reporteModeracion" TO service_role;

GRANT SELECT ON TABLE public."reporteModeracion" TO authenticated;

CREATE POLICY "lectura_propia_reporteModeracion" ON public."reporteModeracion" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "reportadoPor");

ALTER TABLE public."entregaRecompensa" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."entregaRecompensa" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."entregaRecompensa" TO service_role;

GRANT SELECT ON TABLE public."entregaRecompensa" TO authenticated;

CREATE POLICY lectura_entrega_propia ON public."entregaRecompensa" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."propuestaEvento" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."propuestaEvento" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."propuestaEvento" TO service_role;

GRANT SELECT ON TABLE public."propuestaEvento" TO authenticated;

CREATE POLICY "lectura_propia_propuestaEvento" ON public."propuestaEvento" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "propuestoPor");

ALTER TABLE public."fuenteRAG" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."fuenteRAG" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."fuenteRAG" TO service_role;

CREATE POLICY sin_acceso_directo_fuentes ON public."fuenteRAG" FOR SELECT TO authenticated USING (false);

ALTER TABLE public."canalizacionAsistente" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."canalizacionAsistente" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."canalizacionAsistente" TO service_role;

GRANT SELECT ON TABLE public."canalizacionAsistente" TO authenticated;

CREATE POLICY "lectura_propia_canalizacionAsistente" ON public."canalizacionAsistente" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."solicitudEspacio" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."solicitudEspacio" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."solicitudEspacio" TO service_role;

GRANT SELECT ON TABLE public."solicitudEspacio" TO authenticated;

CREATE POLICY "lectura_propia_solicitudEspacio" ON public."solicitudEspacio" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "solicitadoPor");

ALTER TABLE public."solicitudCredencial" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."solicitudCredencial" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."solicitudCredencial" TO service_role;

GRANT SELECT ON TABLE public."solicitudCredencial" TO authenticated;

CREATE POLICY "lectura_propia_solicitudCredencial" ON public."solicitudCredencial" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "usuarioId");

ALTER TABLE public."evidenciaActividad" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."evidenciaActividad" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."evidenciaActividad" TO service_role;

GRANT SELECT ON TABLE public."evidenciaActividad" TO authenticated;

CREATE POLICY "lectura_propia_evidenciaActividad" ON public."evidenciaActividad" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "subidaPor");

ALTER TABLE public."solicitudCambioActividad" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."solicitudCambioActividad" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."solicitudCambioActividad" TO service_role;

GRANT SELECT ON TABLE public."solicitudCambioActividad" TO authenticated;

CREATE POLICY "lectura_propia_solicitudCambioActividad" ON public."solicitudCambioActividad" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = "solicitadaPor");


-- Validaciones transaccionales del modelo compartido. No agrega entidades.
CREATE FUNCTION privado.actualizar_fecha_modificacion()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $$
BEGIN
  NEW := jsonb_populate_record(NEW, jsonb_build_object(TG_ARGV[0], statement_timestamp()));
  RETURN NEW;
END;
$$;

CREATE FUNCTION privado.comprobar_contacto_menor()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $$
DECLARE v_ids uuid[]; v_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'perfil' THEN
    v_ids := ARRAY[NEW.id];
  ELSIF TG_OP = 'DELETE' THEN
    v_ids := ARRAY[OLD."usuarioId"];
  ELSIF TG_OP = 'UPDATE' THEN
    v_ids := ARRAY[OLD."usuarioId", NEW."usuarioId"];
  ELSE
    v_ids := ARRAY[NEW."usuarioId"];
  END IF;
  FOREACH v_id IN ARRAY v_ids LOOP
    IF EXISTS (
      SELECT 1 FROM public.perfil p
      WHERE p.id = v_id AND p."fechaNacimiento" > (CURRENT_DATE - INTERVAL '18 years')::date
      AND NOT EXISTS (SELECT 1 FROM public."contactoTutor" t WHERE t."usuarioId" = p.id)
    ) THEN
      RAISE EXCEPTION 'El perfil menor de edad requiere contacto de madre, padre o tutor en la misma transaccion.' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER comprobar_tutor_perfil
AFTER INSERT OR UPDATE ON public.perfil
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION privado.comprobar_contacto_menor();

CREATE CONSTRAINT TRIGGER conservar_tutor_menor
AFTER INSERT OR UPDATE OR DELETE ON public."contactoTutor"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION privado.comprobar_contacto_menor();

CREATE FUNCTION privado.validar_sesion_actividad()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $$
DECLARE v_capacidad integer; v_activo boolean; v_confirmados bigint;
BEGIN
  -- Serializar asignaciones del mismo espacio evita dobles reservas simultaneas.
  SELECT e.capacidad,e.activo INTO v_capacidad,v_activo
  FROM public.espacio e WHERE e.id = NEW."espacioId" FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF; -- La FK informa el identificador inexistente.
  IF NEW.capacidad > v_capacidad THEN
    RAISE EXCEPTION 'La capacidad de la sesion supera la capacidad del espacio.' USING ERRCODE = '23514';
  END IF;
  IF NEW.estado IN ('programada','en_curso') THEN
    IF NOT v_activo THEN
      RAISE EXCEPTION 'No se puede programar una sesion en un espacio inactivo.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public."sesionActividad" s
      WHERE s."espacioId" = NEW."espacioId" AND s.id <> NEW.id
        AND s.estado IN ('programada','en_curso')
        AND s.inicio < NEW.fin AND s.fin > NEW.inicio
    ) THEN
      RAISE EXCEPTION 'El espacio ya tiene una sesion programada en ese horario.' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.capacidad < OLD.capacidad THEN
    SELECT count(*) INTO v_confirmados FROM public.inscripcion i
    WHERE i."sesionId" = NEW.id AND i.status = 'confirmada';
    IF v_confirmados > NEW.capacidad THEN
      RAISE EXCEPTION 'La capacidad no puede ser menor que las inscripciones confirmadas.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_sesion_actividad
BEFORE INSERT OR UPDATE ON public."sesionActividad"
FOR EACH ROW EXECUTE FUNCTION privado.validar_sesion_actividad();

CREATE FUNCTION privado.validar_capacidad_espacio()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public."sesionActividad" s WHERE s."espacioId" = NEW.id
    AND s.estado IN ('programada','en_curso')
    AND (s.capacidad > NEW.capacidad OR NOT NEW.activo)) THEN
    RAISE EXCEPTION 'El cambio del espacio afecta sesiones activas; reprogramarlas o ajustar sus capacidades primero.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_capacidad_espacio
BEFORE UPDATE OF capacidad, activo ON public.espacio
FOR EACH ROW EXECUTE FUNCTION privado.validar_capacidad_espacio();

CREATE FUNCTION privado.validar_cupo_inscripcion()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $$
DECLARE v_capacidad integer; v_estado text; v_ocupados bigint;
BEGIN
  SELECT s.capacidad,s.estado INTO v_capacidad,v_estado
  FROM public."sesionActividad" s WHERE s.id = NEW."sesionId" FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NEW.status = 'confirmada' THEN
    IF v_estado = 'cancelada' THEN
      RAISE EXCEPTION 'No se puede confirmar una inscripcion en una sesion cancelada.' USING ERRCODE = '23514';
    END IF;
    SELECT count(*) INTO v_ocupados FROM public.inscripcion i
    WHERE i."sesionId" = NEW."sesionId" AND i.status = 'confirmada' AND i.id <> NEW.id;
    IF v_ocupados >= v_capacidad THEN
      RAISE EXCEPTION 'La sesion no tiene cupos disponibles para confirmar la inscripcion.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_cupo_inscripcion
BEFORE INSERT OR UPDATE ON public.inscripcion
FOR EACH ROW EXECUTE FUNCTION privado.validar_cupo_inscripcion();

CREATE FUNCTION privado.validar_correccion_asistencia()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $$
BEGIN
  IF (NEW.estatus,NEW."sesionId",NEW."usuarioId") IS DISTINCT FROM
     (OLD.estatus,OLD."sesionId",OLD."usuarioId")
     AND nullif(btrim(NEW."razonCorreccion"),'') IS NULL THEN
    RAISE EXCEPTION 'Una correccion de asistencia requiere motivo y responsable.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_correccion_asistencia
BEFORE UPDATE ON public.asistencia
FOR EACH ROW EXECUTE FUNCTION privado.validar_correccion_asistencia();

CREATE FUNCTION privado.validar_sesion_del_cambio()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW."sesionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public."sesionActividad" s
    WHERE s.id = NEW."sesionId" AND s."actividadId" = NEW."actividadId"
  ) THEN
    RAISE EXCEPTION 'La sesion indicada no pertenece a la actividad de la solicitud.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_sesion_del_cambio
BEFORE INSERT OR UPDATE ON public."solicitudCambioActividad"
FOR EACH ROW EXECUTE FUNCTION privado.validar_sesion_del_cambio();

CREATE FUNCTION privado.validar_y_descontar_recompensa()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $$
DECLARE v_r public.recompensa%ROWTYPE; v_nivel integer;
BEGIN
  SELECT * INTO v_r FROM public.recompensa WHERE id = NEW."recompensaId" FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF v_r.estado <> 'activa' OR v_r.existencias < 1 THEN
    RAISE EXCEPTION 'La recompensa no esta activa o no tiene existencias.' USING ERRCODE = '23514';
  END IF;
  IF NEW."fechaEntrega" < v_r."fechaVigenciaInicio" OR NEW."fechaEntrega" > v_r."fechaVigenciaFin" THEN
    RAISE EXCEPTION 'La entrega esta fuera de la vigencia de la recompensa.' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."credencialBibliotecaria" c
      WHERE c."usuarioId" = NEW."usuarioId" AND c."estadoValidacion" = 'validada'
      AND c."fechaEmision" <= NEW."fechaEntrega"::date
      AND c."fechaVencimiento" >= NEW."fechaEntrega"::date) THEN
    RAISE EXCEPTION 'La entrega requiere credencial bibliotecaria validada y vigente.' USING ERRCODE = '23514';
  END IF;
  SELECT p."nivelActual" INTO v_nivel FROM public."progresoUsuario" p WHERE p.id = NEW."usuarioId";
  IF coalesce(v_nivel,0) < v_r."nivelRequerido" THEN
    RAISE EXCEPTION 'El usuario no cumple el nivel requerido para la recompensa.' USING ERRCODE = '23514';
  END IF;
  UPDATE public.recompensa SET existencias = existencias - 1 WHERE id = NEW."recompensaId";
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_y_descontar_recompensa
BEFORE INSERT ON public."entregaRecompensa"
FOR EACH ROW EXECUTE FUNCTION privado.validar_y_descontar_recompensa();

CREATE FUNCTION privado.conservar_entrega_recompensa()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'La entrega es un registro historico; no se elimina para devolver existencias.' USING ERRCODE = '23514';
  END IF;
  IF (NEW.id,NEW."recompensaId",NEW."usuarioId",NEW."entregadoPor",NEW."fechaEntrega") IS DISTINCT FROM
     (OLD.id,OLD."recompensaId",OLD."usuarioId",OLD."entregadoPor",OLD."fechaEntrega") THEN
    RAISE EXCEPTION 'Los datos esenciales de una entrega son historicos; solo pueden anotarse aclaraciones.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER conservar_entrega_recompensa
BEFORE UPDATE OR DELETE ON public."entregaRecompensa"
FOR EACH ROW EXECUTE FUNCTION privado.conservar_entrega_recompensa();

-- No se exponen funciones de mantenimiento como RPC publicas.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA privado FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA privado TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA privado TO service_role;

CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."perfil" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoA');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."actividad" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."sesionActividad" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."inscripcion" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoA');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."credencialBibliotecaria" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."Contenido" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."mensajeContacto" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."resena" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."preferenciaUsuario" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."temaForo" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."progresoUsuario" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."recompensa" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."reporteModeracion" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."propuestaEvento" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."fuenteRAG" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadaEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."canalizacionAsistente" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadaEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."solicitudEspacio" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadoEn');
CREATE TRIGGER actualizar_fecha_modificacion BEFORE UPDATE ON public."solicitudCredencial" FOR EACH ROW EXECUTE FUNCTION privado.actualizar_fecha_modificacion('actualizadaEn');
