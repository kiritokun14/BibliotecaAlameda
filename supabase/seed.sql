-- Datos ficticios de prueba, basados en la documentación del proyecto
-- (3.1a Alcance y EDT, 3.1b Casos de uso, SRS y Definición de proyecto).
--
-- Base local: se cargan solos con `npx supabase db reset`.
-- CECANbd (base de desarrollo del equipo): se cargan una vez desde el SQL Editor,
-- cambiando antes la contraseña (ver README). `supabase db push` NO ejecuta este archivo.
-- Para quitarlos: supabase/limpiar_datos_prueba.sql.
--
-- En la base local todas las cuentas usan la contraseña: Prueba123!
-- Correos con dominio .test (reservado, nunca existe en internet).
-- Todos los registros usan identificadores fijos 00000000-0000-4000-…
-- para poder localizarlos y borrarlos.

-- ---------------------------------------------------------------------------
-- Cuentas. Al insertar en auth.users, el trigger crear_perfil_autorregistro
-- crea el perfil (y el contacto del tutor si es menor) y asignar_rol_basico
-- le da el rol "usuario".
-- ---------------------------------------------------------------------------
WITH cuentas (id, correo, registro) AS (
  VALUES
  ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@biblioteca.test', jsonb_build_object(
    'nombres','Ana','primerApellido','Administradora','segundoApellido','Prueba',
    'fechaNacimiento','1990-03-15','telefono','3110000001','aceptaAviso',true,
    'domicilio',jsonb_build_object('calle','Av. México','numeroExterior','100','coloniaLocalidad','Centro',
      'codigoPostal','63000','municipio','Tepic','estadoProvincia','Nayarit'))),
  ('00000000-0000-4000-a000-000000000002'::uuid, 'editor@biblioteca.test', jsonb_build_object(
    'nombres','Elena','primerApellido','Editora','fechaNacimiento','1993-07-02','telefono','3110000002','aceptaAviso',true,
    'domicilio',jsonb_build_object('calle','Calle Lerdo','numeroExterior','25','coloniaLocalidad','Centro',
      'codigoPostal','63000','municipio','Tepic','estadoProvincia','Nayarit'))),
  ('00000000-0000-4000-a000-000000000003'::uuid, 'responsable@biblioteca.test', jsonb_build_object(
    'nombres','Raúl','primerApellido','Responsable','fechaNacimiento','1988-11-20','telefono','3110000003','aceptaAviso',true,
    'domicilio',jsonb_build_object('calle','Calle Zacatecas','numeroExterior','8','numeroInterior','B','coloniaLocalidad','Centro',
      'codigoPostal','63000','municipio','Tepic','estadoProvincia','Nayarit'))),
  ('00000000-0000-4000-a000-000000000004'::uuid, 'personal@biblioteca.test', jsonb_build_object(
    'nombres','Sofía','primerApellido','Servicios','segundoApellido','Digitales','fechaNacimiento','1995-01-10','telefono','3110000004','aceptaAviso',true,
    'domicilio',jsonb_build_object('calle','Av. Insurgentes','numeroExterior','300','coloniaLocalidad','Los Fresnos',
      'codigoPostal','63190','municipio','Tepic','estadoProvincia','Nayarit'))),
  ('00000000-0000-4000-a000-000000000005'::uuid, 'lector@biblioteca.test', jsonb_build_object(
    'nombres','Luis','primerApellido','Lector','fechaNacimiento','2000-05-05','telefono','3110000005','aceptaAviso',true,
    'domicilio',jsonb_build_object('calle','Calle Amado Nervo','numeroExterior','42','coloniaLocalidad','San José',
      'codigoPostal','63170','municipio','Tepic','estadoProvincia','Nayarit'))),
  ('00000000-0000-4000-a000-000000000007'::uuid, 'prestamos@biblioteca.test', jsonb_build_object(
    'nombres','Pedro','primerApellido','Préstamos','fechaNacimiento','1985-09-30','telefono','3110000008','aceptaAviso',true,
    'domicilio',jsonb_build_object('calle','Calle Oaxaca','numeroExterior','12','coloniaLocalidad','Centro',
      'codigoPostal','63000','municipio','Tepic','estadoProvincia','Nayarit'))),
  ('00000000-0000-4000-a000-000000000006'::uuid, 'menor@biblioteca.test', jsonb_build_object(
    'nombres','Mateo','primerApellido','Menor','fechaNacimiento',to_char(current_date - interval '12 years','YYYY-MM-DD'),
    'telefono','3110000006','aceptaAviso',true,
    'domicilio',jsonb_build_object('calle','Calle Durango','numeroExterior','15','coloniaLocalidad','Centro',
      'codigoPostal','63000','municipio','Tepic','estadoProvincia','Nayarit'),
    'tutor',jsonb_build_object('nombres','María','apellidos','Tutora Prueba','telefono','3110000007',
      'correo','tutora@biblioteca.test','relacion','madre',
      'domicilio',jsonb_build_object('calle','Calle Durango','numeroExterior','15','coloniaLocalidad','Centro',
        'codigoPostal','63000','municipio','Tepic','estadoProvincia','Nayarit'))))
)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', correo,
  extensions.crypt('Prueba123!', extensions.gen_salt('bf')), now(),
  '', '', '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('registro', registro), now(), now()
FROM cuentas;

-- Identidad de correo para poder iniciar sesión con Supabase Auth.
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
FROM auth.users u
WHERE u.email LIKE '%@biblioteca.test';

-- ---------------------------------------------------------------------------
-- Roles y permisos del personal (además del rol "usuario" automático).
-- ---------------------------------------------------------------------------
INSERT INTO public."rolUsuario" ("usuarioId", "rolCodigo", "asignadoPor", "motivoAsignacion") VALUES
  ('00000000-0000-4000-a000-000000000001', 'administrador',           '00000000-0000-4000-a000-000000000001', 'Datos de prueba'),
  ('00000000-0000-4000-a000-000000000002', 'editor',                  '00000000-0000-4000-a000-000000000001', 'Datos de prueba'),
  ('00000000-0000-4000-a000-000000000003', 'responsable_actividades', '00000000-0000-4000-a000-000000000001', 'Datos de prueba');

-- Capacidades según A-03, A-04 y D-06 (documento 3.1b de casos de uso).
INSERT INTO public."permisoCuenta" ("usuarioId", capacidad, "asignadoPor", motivo)
SELECT p.usuario::uuid, p.capacidad, '00000000-0000-4000-a000-000000000001', p.motivo
FROM (VALUES
  -- A-03 Editor: prepara contenidos y publica solo con permiso expreso.
  ('00000000-0000-4000-a000-000000000002', 'preparar_contenidos',   'Datos de prueba: editor'),
  ('00000000-0000-4000-a000-000000000002', 'publicar_contenidos',   'Datos de prueba: permiso expreso de publicación'),
  -- A-04 Responsable de actividades.
  ('00000000-0000-4000-a000-000000000003', 'gestionar_actividades',              'Datos de prueba: A-04'),
  ('00000000-0000-4000-a000-000000000003', 'confirmar_inscripciones',            'Datos de prueba: A-04'),
  ('00000000-0000-4000-a000-000000000003', 'registrar_asistencia',               'Datos de prueba: A-04'),
  ('00000000-0000-4000-a000-000000000003', 'gestionar_evidencias',               'Datos de prueba: A-04'),
  ('00000000-0000-4000-a000-000000000003', 'moderar_foro',                       'Datos de prueba: A-04'),
  ('00000000-0000-4000-a000-000000000003', 'registrar_recompensas',              'Datos de prueba: A-04'),
  ('00000000-0000-4000-a000-000000000003', 'registrar_resoluciones_actividades', 'Datos de prueba: A-04'),
  ('00000000-0000-4000-a000-000000000003', 'consultar_estadisticas',             'Datos de prueba: A-04'),
  ('00000000-0000-4000-a000-000000000003', 'publicar_contenidos',                'Datos de prueba: A-04 publica según material'),
  -- Servicios Digitales: altas y recuperación asistidas y atención.
  ('00000000-0000-4000-a000-000000000004', 'alta_asistida',         'Datos de prueba: Servicios Digitales'),
  ('00000000-0000-4000-a000-000000000004', 'orientar_recuperacion', 'Datos de prueba: Servicios Digitales'),
  ('00000000-0000-4000-a000-000000000004', 'atender_contactos',     'Datos de prueba: Servicios Digitales'),
  -- Préstamos: valida credenciales presencialmente.
  ('00000000-0000-4000-a000-000000000007', 'validar_credenciales',  'Datos de prueba: módulo de préstamos')
) AS p(usuario, capacidad, motivo);

-- Credencial cotejada por préstamos, vigente dos años desde su emisión (RN-05).
INSERT INTO public."credencialBibliotecaria" ("usuarioId", "numeroCredencial", "fechaEmision", "fechaVencimiento",
  "estadoValidacion", "validadaPor", "validadaEn") VALUES
  ('00000000-0000-4000-a000-000000000005', 'PRUEBA-0001', current_date - 30, (current_date - 30) + interval '2 years',
   'validada', '00000000-0000-4000-a000-000000000007', now());

-- ---------------------------------------------------------------------------
-- Espacios. La documentación no nombra salas concretas: "la biblioteca confirma
-- espacios" (3.1a, 5.4). Nombres provisionales hasta que la biblioteca los confirme.
-- ---------------------------------------------------------------------------
INSERT INTO public.espacio (id, slug, nombre, capacidad, descripcion) VALUES
  ('00000000-0000-4000-b000-000000000001', 'sala-lectura', 'Sala de lectura (provisional)', 40,
   'Espacio para clubes de lectura y lectura en sala. Nombre y capacidad por confirmar con la biblioteca.'),
  ('00000000-0000-4000-b000-000000000002', 'sala-usos-multiples', 'Sala de usos múltiples (provisional)', 30,
   'Espacio para talleres, cursos y visitas escolares. Nombre y capacidad por confirmar con la biblioteca.'),
  ('00000000-0000-4000-b000-000000000003', 'area-infantil', 'Área infantil (provisional)', 20,
   'Espacio para actividades con infancias. Nombre y capacidad por confirmar con la biblioteca.');

-- ---------------------------------------------------------------------------
-- Actividades (CU-02, CU-15, RF-13). Tipos mencionados en la documentación:
-- clubes de lectura, talleres, cursos y visitas. Las publicadas llevan la
-- referencia de autorización de dirección (RN-03).
-- ---------------------------------------------------------------------------
INSERT INTO public.actividad (id, slug, titulo, descripcion, categoria, audiencia, requerimientos,
  "estadoPublicacion", "referenciaAutorizacion", "referenciaPublicacion", "creadoPor") VALUES
  ('00000000-0000-4000-c000-000000000001', 'club-lectura-alameda', 'Club de lectura de la Alameda',
   'Encuentro semanal para comentar una lectura elegida por el grupo. Actividad gratuita y sin fines de lucro.',
   'club_lectura', 'Jóvenes y adultos', 'Ninguno. Se recomienda haber leído el capítulo de la semana.',
   'publicada', 'PRUEBA-DIRECCION-001', 'PRUEBA-PUB-001', '00000000-0000-4000-a000-000000000003'),
  ('00000000-0000-4000-c000-000000000002', 'taller-escritura-creativa', 'Taller de escritura creativa',
   'Taller práctico de cuento breve en cuatro sesiones.',
   'taller', 'Jóvenes de 12 a 17 años', 'Libreta y bolígrafo. Inscripción previa con confirmación del personal.',
   'publicada', 'PRUEBA-DIRECCION-002', 'PRUEBA-PUB-002', '00000000-0000-4000-a000-000000000003'),
  ('00000000-0000-4000-c000-000000000003', 'curso-iniciacion-digital', 'Curso de iniciación digital',
   'Uso básico del portal, el correo y el catálogo en línea para personas con poca experiencia digital.',
   'curso', 'Adultos y personas mayores', 'Ninguno.',
   'en_revision', '', '', '00000000-0000-4000-a000-000000000003');

-- Sesiones: dos del club (una ya realizada) y una del taller.
INSERT INTO public."sesionActividad" (id, "actividadId", "espacioId", inicio, fin, capacidad, estado, "registroAbierto") VALUES
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001',
   date_trunc('day', now()) - interval '7 days' + interval '17 hours', date_trunc('day', now()) - interval '7 days' + interval '19 hours',
   25, 'finalizada', false),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001',
   date_trunc('day', now()) + interval '7 days 17 hours', date_trunc('day', now()) + interval '7 days 19 hours',
   25, 'programada', true),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000002',
   date_trunc('day', now()) + interval '9 days 16 hours', date_trunc('day', now()) + interval '9 days 18 hours',
   15, 'programada', true);

-- Inscripciones (CU-18, CU-19): confirmación manual por A-04; sin credencial también se puede inscribir.
INSERT INTO public.inscripcion (id, "sesionId", "usuarioId", status, "decisionPor", "decididoA") VALUES
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000005',
   'confirmada', '00000000-0000-4000-a000-000000000003', now()),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-d000-000000000003', '00000000-0000-4000-a000-000000000006',
   'pendiente', NULL, NULL);

-- Solicitud de visita escolar (CU-16): enviada, en revisión; no reserva el espacio.
INSERT INTO public."solicitudEspacio" (id, "propositoVisita", "cantidadPersonas", "espacioSolicitadoId",
  "fechaInicioSolicitado", "fechaFinSolicitado", "estadoSolicitud", "solicitadoPor",
  "nombreInstitucion", "nombreResponsable", "telefonoContacto", "correoContacto") VALUES
  ('00000000-0000-4000-f000-000000000001', 'Visita escolar guiada para conocer los servicios de la biblioteca', 25,
   '00000000-0000-4000-b000-000000000002',
   date_trunc('day', now()) + interval '14 days 10 hours', date_trunc('day', now()) + interval '14 days 12 hours',
   'en_revision', '00000000-0000-4000-a000-000000000005',
   'Escuela Primaria de Prueba', 'Luis Lector', '3110000005', 'lector@biblioteca.test');

-- ---------------------------------------------------------------------------
-- Contenidos institucionales (CU-11, CU-12). Los prepara el editor y los autoriza
-- otra persona con permiso de publicación. Textos basados en la documentación.
-- ---------------------------------------------------------------------------
INSERT INTO public."Contenido" (id, slug, titulo, tipo, cuerpo, "autorOriginal", estado, "creadoPor", "autorizadoPor", "publicadoEn") VALUES
  ('00000000-0000-4000-a100-000000000001', 'horario-y-contacto', 'Horario de atención y contacto', 'servicio',
   'Lunes a viernes de 08:00 a 20:00 y sábados de 07:00 a 15:00; domingos cerrado. Correo: bpce165@gmail.com. '
   || 'Horario de referencia del directorio; la biblioteca debe confirmar su vigencia y excepciones.',
   'Biblioteca Pública Central Estatal Solón Argüello', 'publicado',
   '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003', now()),
  ('00000000-0000-4000-a100-000000000002', 'credencial-bibliotecaria', 'Credencial bibliotecaria', 'servicio',
   'La credencial se tramita en el módulo de préstamos, que coteja en persona la credencial original y la identidad. '
   || 'Tiene vigencia de dos años desde su emisión. No es necesaria para crear una cuenta, inscribirse o usar el foro; '
   || 'sí lo es para acumular progreso y recompensas.',
   'Biblioteca Pública Central Estatal Solón Argüello', 'publicado',
   '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003', now()),
  ('00000000-0000-4000-a100-000000000003', 'bibliocomunidad', 'Bibliocomunidad', 'programa',
   'Programa de participación comunitaria de la biblioteca. Texto de prueba: la descripción oficial la proporciona la biblioteca.',
   'Biblioteca Pública Central Estatal Solón Argüello', 'publicado',
   '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003', now()),
  ('00000000-0000-4000-a100-000000000004', 'catalogo-en-linea', 'Catálogo en línea', 'recurso',
   'El catálogo de la biblioteca se consulta en Koha, un sitio externo. El portal no gestiona préstamos ni reservas.',
   'Biblioteca Pública Central Estatal Solón Argüello', 'publicado',
   '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003', now()),
  ('00000000-0000-4000-a100-000000000005', 'memoria-club-lectura', 'Memoria: primera sesión del club de lectura', 'noticia',
   'Borrador de prueba para la memoria pública del club.',
   'Biblioteca Pública Central Estatal Solón Argüello', 'borrador',
   '00000000-0000-4000-a000-000000000002', NULL, NULL);

-- ---------------------------------------------------------------------------
-- Foro Club Alameda (CU-26), contacto (CU-23) y recompensas (CU-29).
-- ---------------------------------------------------------------------------
INSERT INTO public."temaForo" ("temaId", titulo, descripcion, "estadoModeracion", "creadoPor", "moderadoPor") VALUES
  ('00000000-0000-4000-a200-000000000001', 'Recomendaciones de lectura', 'Comparte un libro que te haya gustado y por qué.',
   'publicado', '00000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000003'),
  ('00000000-0000-4000-a200-000000000002', '¿Qué leer en vacaciones?', 'Tema pendiente de revisión por el filtro.',
   'pendiente', '00000000-0000-4000-a000-000000000006', NULL);

INSERT INTO public."mensajeContacto" (id, "usuarioId", "nombreRemitente", "correoContacto", asunto, "cuerpoMensaje",
  "estadoAtencion", "atendidoPor", "respuestaFinal") VALUES
  ('00000000-0000-4000-a300-000000000001', NULL, 'Visitante de prueba', 'visitante@biblioteca.test',
   'Horario en días festivos', '¿Abren el próximo día festivo?', 'recibido', NULL, NULL),
  ('00000000-0000-4000-a300-000000000002', '00000000-0000-4000-a000-000000000005', 'Luis Lector', 'lector@biblioteca.test',
   'Sugerencia', 'Me gustaría un club de lectura los sábados.', 'cerrado', '00000000-0000-4000-a000-000000000004',
   'Gracias, se turnó la sugerencia al responsable de actividades.');

-- nivelRequerido: D-11 nombra los niveles Inicial (0–2), Lector activo (3–5) y
-- Lector constante (6 o más), pero no su número. Aquí 1 = Lector activo; falta acordarlo.
INSERT INTO public.recompensa (id, nombre, descripcion, "nivelRequerido", existencias, "fechaVigenciaInicio", "fechaVigenciaFin", estado, "creadoPor") VALUES
  ('00000000-0000-4000-a400-000000000001', 'Separador conmemorativo', 'Obsequio de fomento a la lectura (prueba). No se descuentan libros del acervo.',
   1, 50, now(), now() + interval '90 days', 'activa', '00000000-0000-4000-a000-000000000003');
