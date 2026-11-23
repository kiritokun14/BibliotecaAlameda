"""Guías de navegación por el portal."""

import re
from typing import NamedTuple


class Guia(NamedTuple):
    titulo: str
    ruta: str
    texto: str
    frases: tuple[str, ...]
    requiere_contexto: bool = False


MI_PERFIL = Guia(
    'Mi perfil', '/mi-perfil',
    'Desde Mi perfil puedes consultar tus trámites y configurar tu cuenta después de iniciar sesión.',
    ('mi perfil', 'mis tramites', 'mis solicitudes', 'mis datos', 'notificaciones'),
)
NAVEGA_PERFIL = re.compile(
    r'\b(?:(?:como|donde) (?:\w+ ){0,3}'
    r'(?:veo|ver|consulto|consultar|reviso|revisar|checo|checar|encuentro|encontrar|busco|buscar|accedo)|'
    r'donde (?:esta|estan|aparece|aparecen|quedo|quedaron)|en que (?:seccion|apartado|parte|pagina|menu)|'
    r'(?:quiero|quisiera) (?:ver|revisar|consultar|checar))\b'
)
SECCIONES_PERFIL = (
    (
        re.compile(r'\b(?:(?:mi|mis) propuestas?|mis solicitudes de (?:eventos?|actividades?)|'
                   r'(?:propuestas?|eventos?|actividades?|talleres?) que (?:yo )?(?:propuse|envie|presente|mande))\b'),
        Guia('Mis propuestas', '/mi-perfil/propuestas',
             'Inicia sesión y abre Mis propuestas en tu perfil. Ahí puedes revisar las propuestas que enviaste y su estado.', ()),
    ),
    (
        re.compile(r'\b(?:(?:mi|mis) (?:inscripciones?|eventos?(?! que (?:yo )?(?:propuse|envie|presente|mande)))|'
                   r'me (?:inscribi|apunte))\b'),
        Guia('Mis eventos', '/mi-perfil/eventos',
             'Inicia sesión y abre Mis eventos en tu perfil para ver las actividades en las que te inscribiste.', ()),
    ),
    (
        re.compile(r'\b(?:(?:mi|mis) reservas?|mis espacios|mis solicitudes de (?:espacio|sala)|'
                   r'(?:salas?|espacios?) que (?:yo )?(?:reserve|solicite))\b'),
        Guia('Mis espacios', '/mi-perfil/espacios',
             'Inicia sesión y abre Mis espacios en tu perfil para consultar tus solicitudes y reservas de espacios.', ()),
    ),
    (
        re.compile(r'\bmi credencial\b'),
        Guia('Mi credencial', '/mi-perfil/credencial',
             'Inicia sesión y abre Mi credencial en tu perfil para consultar tu credencial o el avance del trámite.', ()),
    ),
    (
        re.compile(r'\bmis mensajes\b'),
        Guia('Mis mensajes', '/mi-perfil/mensajes',
             'Inicia sesión y abre Mis mensajes en tu perfil para revisar tus conversaciones con la biblioteca.', ()),
    ),
)
TRAMITES_PERFIL = re.compile(r'\b(?:mi|mis) (?:tramites?|solicitud(?:es)?)\b')


def guias_del_perfil(pregunta: str) -> list[Guia]:
    busca_pagina = NAVEGA_PERFIL.search(pregunta)
    guias = [guia for patron, guia in SECCIONES_PERFIL
             if patron.fullmatch(pregunta) or (busca_pagina and patron.search(pregunta))]
    if not guias and busca_pagina and TRAMITES_PERFIL.search(pregunta):
        return [MI_PERFIL]
    return guias


PROPONER_CLUB = Guia(
    'Proponer un club nuevo', '/proponer',
    'Inicia sesión, abre Proponer una actividad y selecciona «Un club». Completa el nombre, de qué '
    'trata, para quién es y los datos de la persona responsable. Puedes sugerir fecha y espacio. '
    'Envía la propuesta para que el personal la revise y consulta el avance en Mis propuestas.',
    ('hacer club', 'hago club', 'armar club', 'armo club', 'armamos club', 'crear club', 'creo club',
     'formar club', 'formo club', 'fundar club', 'iniciar club', 'inicio club', 'empezar club',
     'empiezo club', 'abrir club', 'abro club', 'organizar club', 'organizo club', 'montar club',
     'proponer club', 'propongo club', 'club nuevo', 'armar grupo de lectura', 'formar grupo de lectura',
     'iniciar circulo de lectura'),
)
FORO_CLUB = Guia(
    'Foro Club Alameda', '/club-alameda',
    'En Club Alameda puedes leer las conversaciones del foro de la biblioteca. Inicia sesión para '
    'participar en los temas.',
    ('club alameda', 'foro', 'bibliocomunidad', 'conversaciones del club'),
)
BUSCAR_CLUBES = Guia(
    'Buscar clubes de lectura e inscribirse', '/eventos/todas',
    'Abre Todas las actividades y elige «Club de lectura» en el filtro Tipo de actividad. En el detalle '
    'de cada actividad puedes consultar la fecha y el horario. Si la inscripción está abierta, inicia sesión para continuar.',
    ('clubes', 'hay club', 'busco club', 'ver club', 'encontrar club', 'unirme a club', 'unirme al club',
     'sumarme a club', 'apuntarme a club', 'participar en club', 'inscribirme a club', 'inscribo a club',
     'inscribo en club', 'inscribirme en club', 'inscribir en club', 'me uno a club', 'cuando es club',
     'horario de clubes', 'horarios de clubes', 'cuando se reune club', 'cuando se reunen clubes'),
)


class Aclaracion(NamedTuple):
    pregunta: str
    opciones: tuple[Guia, ...]


ACLARACIONES = dict.fromkeys(('club', 'club de lectura'), Aclaracion(
    '¿Quieres proponer un club, encontrar un club de lectura para participar o abrir el foro Club Alameda?',
    (PROPONER_CLUB, BUSCAR_CLUBES, FORO_CLUB),
))


GUIAS = (
    Guia(
        'Contacto y ubicación', '/contacto',
        'En Contacto y ubicación puedes consultar el horario publicado, la dirección y los canales de atención de la biblioteca.',
        ('horario', 'horarios', 'abren', 'abre', 'cierran', 'cierra', 'a que hora', 'ubicacion', 'direccion',
         'donde queda', 'como llegar', 'a que hora abre', 'a que hora abren', 'a que hora cierra',
         'a que hora cierran'),
        requiere_contexto=True,
    ),
    Guia(
        'Contacto y sugerencias', '/contacto',
        'En Contacto y sugerencias encuentras los canales de la biblioteca. Para escribir desde '
        'el formulario del portal, inicia sesión y elige Contacto o Sugerencia.',
        ('contacto', 'contactar', 'telefono', 'llamar', 'sugerencia', 'hablar con el personal', 'escribirles',
         'comunicarme con la biblioteca'),
    ),
    Guia(
        'Credencial de la biblioteca', '/credencial',
        'Abre Credencial para consultar los pasos y requisitos. Inicia sesión para solicitar '
        'o renovar tu credencial y para revisar el avance del trámite.',
        ('credencial', 'credenciales', 'tarjeta de la biblioteca', 'renovar', 'renovacion', 'cotejo'),
    ),
    Guia(
        'Catálogo de la biblioteca', '/catalogo',
        'Abre Catálogo y, cuando esté disponible el enlace, elige «Abrir el catálogo». '
        'En Koha puedes buscar por título, autor, tema o ISBN y consultar el estado de un ejemplar.',
        ('catalogo', 'koha', 'buscar un libro', 'busco un libro', 'buscar libros', 'encontrar un libro',
         'titulo', 'isbn', 'ejemplar', 'ejemplares'),
    ),
    Guia(
        'Préstamo de libros', '/catalogo',
        'Abre Catálogo para consultar la información sobre préstamos. El personal de la biblioteca puede confirmar los requisitos vigentes.',
        ('prestamo', 'prestamos', 'pedir prestado', 'sacar un libro', 'llevarme un libro'),
    ),
    Guia(
        'Eventos y actividades', '/eventos',
        'Abre Eventos y actividades para ver la agenda. En el detalle de cada actividad puedes consultar '
        'su fecha, lugar y requisitos. Si la actividad admite inscripción, inicia sesión para continuar.',
        ('actividad', 'actividades', 'agenda', 'evento', 'eventos', 'taller', 'talleres', 'inscribirme', 'inscripcion'),
    ),
    Guia(
        'Calendario de actividades', '/eventos/calendario',
        'En el Calendario de actividades puedes recorrer los meses para encontrar eventos por fecha.',
        ('calendario', 'ver por fecha', 'programacion mensual'),
    ),
    Guia(
        'Espacios de la biblioteca', '/espacios',
        'En Espacios puedes explorar el mapa y ver los detalles de cada área. '
        'Para solicitar un espacio disponible para eventos, elige el área e inicia sesión.',
        ('espacio', 'espacios', 'mapa de la biblioteca', 'sala', 'salas', 'auditorio', 'reservar un espacio'),
    ),
    PROPONER_CLUB,
    Guia(
        'Proponer una actividad', '/proponer',
        'En Proponer una actividad puedes consultar cómo presentar una propuesta. '
        'Entra con tu cuenta para llenar el formulario y seguir el trámite.',
        ('proponer', 'propuesta', 'proponer una actividad', 'organizar un evento', 'proponer un taller',
         'propongo evento', 'propongo evento nuevo', 'proponer evento nuevo', 'propongo actividad', 'propongo taller'),
    ),
    FORO_CLUB,
    BUSCAR_CLUBES,
    Guia(
        'Servicios y programas', '/servicios',
        'En Servicios y programas puedes ver qué ofrece la biblioteca. Abre un servicio para consultar su descripción.',
        ('servicio', 'servicios', 'programa', 'programas', 'que ofrece la biblioteca'),
    ),
    Guia(
        'Lecturas y reseñas', '/lecturas',
        'En Lecturas y reseñas encontrarás recomendaciones de lectura y reseñas publicadas por la biblioteca.',
        ('lectura', 'lecturas', 'resena', 'resenas', 'recomiendas leer', 'recomendaciones de lectura'),
    ),
    Guia(
        'Crear una cuenta', '/crear-cuenta',
        'Elige Crear cuenta y completa el formulario de registro. '
        'Después, revisa tu correo para confirmar la cuenta.',
        ('crear cuenta', 'crear una cuenta', 'registrarme', 'registro', 'darme de alta'),
    ),
    Guia(
        'Iniciar sesión', '/iniciar-sesion',
        'Abre Iniciar sesión y entra con el correo y la contraseña que usaste al registrarte.',
        ('iniciar sesion', 'inicio de sesion', 'entrar a mi cuenta', 'ingresar a mi cuenta', 'login'),
    ),
    Guia(
        'Recuperar contraseña', '/recuperar',
        'Abre Recuperar contraseña e indica el correo de tu cuenta en ese formulario. '
        'Luego revisa tu correo para seguir el enlace de recuperación.',
        ('contrasena', 'olvide mi clave', 'recuperar mi cuenta', 'recuperar acceso', 'restablecer'),
    ),
    MI_PERFIL,
    Guia(
        'Acerca de la biblioteca', '/acerca',
        'En Acerca de puedes conocer la historia de la biblioteca, su misión y la trayectoria de Solón Argüello.',
        ('historia de la biblioteca', 'mision', 'solon arguello', 'acerca de'),
    ),
    Guia(
        'Noticias', '/noticias',
        'En Noticias puedes consultar los anuncios y publicaciones recientes del portal.',
        ('noticias', 'anuncios', 'avisos de la biblioteca'),
    ),
)
