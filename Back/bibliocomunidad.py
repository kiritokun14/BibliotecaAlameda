"""Recepción y seguimiento administrativo de solicitudes de Bibliocomunidad."""

from datetime import datetime
from typing import Annotated, Literal, NamedTuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints, model_validator
from postgrest.exceptions import APIError
from supabase import Client
from supabase_auth.errors import AuthApiError

from Back.administracion import ejecutar
from Back.contacto import _autenticar_opcional
from Back.conexion import crear_cliente

router = APIRouter(
    prefix='/v1',
    tags=['Bibliocomunidad'],
)
seguridad = HTTPBearer(auto_error=False)
TIPO_CASO = 'bibliocomunidad'


class Peticion(BaseModel):
    # Rechaza propiedades desconocidas para evitar aceptar datos no contemplados por la API.
    model_config = ConfigDict(extra='forbid')


class SolicitudBibliocomunidad(Peticion):
    nombreRemitente: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)
    ]
    correoContacto: EmailStr | None = None
    telefonoContacto: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=7,
            max_length=19,
            pattern=r'^\+?[0-9][0-9 ()-]*$',
        ),
    ] | None = None
    interes: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)
    ]
    usuarioId: UUID | None = None

    @model_validator(mode='after')
    def validar_medio_contacto(self):
        # La persona solicitante puede proporcionar correo, teléfono o ambos.
        if self.correoContacto is None and not self.telefonoContacto:
            raise ValueError('Proporciona un correo electrónico o un teléfono.')
        return self


class SolicitudCreada(BaseModel):
    id: UUID
    mensaje: str
    creadoEn: datetime


class IntentoContacto(Peticion):
    tipoIntento: Literal['llamada', 'correo', 'presencial']
    exitoso: bool
    observaciones: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
    ]


class FinalizarSolicitud(Peticion):
    incorporacionConfirmada: bool
    respuestaFinal: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)
    ]
    resolucionExplicita: bool = False


class IntentoRegistrado(BaseModel):
    id: UUID
    folioId: UUID
    tipoIntento: Literal['llamada', 'correo', 'presencial']
    exitoso: bool
    observaciones: str
    estadoAtencion: Literal['recibido', 'en_atencion']
    atendidoPor: UUID
    realizadoEn: datetime


class SolicitudBibliocomunidadResumen(BaseModel):
    id: UUID
    usuarioId: UUID | None
    nombreRemitente: str
    correoContacto: EmailStr | None
    telefonoContacto: str | None
    areaAsignada: Literal['servicios_digitales']
    asunto: str
    cuerpoMensaje: str
    estadoAtencion: Literal['recibido', 'en_atencion', 'cerrado']
    atendidoPor: UUID | None
    respuestaFinal: str | None
    incorporacionConfirmada: bool
    creadoEn: datetime
    actualizadoEn: datetime


class SolicitudesPaginadas(BaseModel):
    items: list[SolicitudBibliocomunidadResumen]
    total: int
    page: int
    limit: int


class SesionBibliocomunidad(NamedTuple):
    cliente: Client
    usuario_id: str


def _http_error(error: APIError) -> HTTPException:
    # Convertir códigos conocidos de PostgreSQL a errores HTTP sin exponer detalles internos.
    if error.code == '42501':
        return HTTPException(403, 'No tienes autorización para esta operación.')
    if error.code in ('P0002',):
        return HTTPException(404, 'No se encontró la solicitud de Bibliocomunidad.')
    if error.code in ('23514', '22023', '22P02'):
        return HTTPException(409, 'La solicitud no admite esta operación o transición.')
    return HTTPException(503, 'No fue posible completar la operación de Bibliocomunidad.')


def _sesion_autorizada(
    credenciales: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(seguridad),
    ],
) -> SesionBibliocomunidad:
    # Validar identidad, estado de cuenta y permiso antes de consultar casos privados.
    if credenciales is None or credenciales.scheme.lower() != 'bearer':
        raise HTTPException(401, 'Se requiere una sesión válida.', headers={'WWW-Authenticate': 'Bearer'})
    try:
        cliente = crear_cliente()
        respuesta = cliente.auth.get_user(credenciales.credentials)
        if not respuesta or not respuesta.user:
            raise HTTPException(401, 'La sesión no es válida o expiró.')
        cliente.postgrest.auth(credenciales.credentials)

        acceso = ejecutar(cliente, 'mi_acceso')
        usuario_id = str(UUID(acceso['usuarioId']))
        if usuario_id != str(respuesta.user.id):
            raise HTTPException(503, 'No fue posible comprobar la sesión.')

        permisos = acceso.get('permisosAdicionales', [])
        puede_gestionar = any(
            p.get('capacidad') == 'atender_bibliocomunidad' and p.get('ambito') == 'global'
            and not p.get('actividadId')
            for p in permisos if isinstance(p, dict)
        ) or any(
            'atender_bibliocomunidad' in r.get('capacidades', [])
            for r in acceso.get('roles', []) if isinstance(r, dict)
        )
        if not puede_gestionar:
            raise HTTPException(403, 'Se requiere la capacidad atender_bibliocomunidad.')
        return SesionBibliocomunidad(cliente, usuario_id)
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status in (400, 401, 403):
            raise HTTPException(401, 'La sesión no es válida o expiró.') from None
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None
    except APIError as error:
        raise _http_error(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible comprobar la sesión o los permisos.') from None


SesionAutorizada = Annotated[SesionBibliocomunidad, Depends(_sesion_autorizada)]


@router.post(
    '/public/bibliocomunidad/solicitar',
    status_code=201,
    response_model=SolicitudCreada,
    summary='Solicitar incorporación a Bibliocomunidad',
    description=(
        'Recibe interés anónimo o autenticado con correo o teléfono. Crea un '
        'caso tipo bibliocomunidad en estado recibido y devuelve un folio.'
    ),
)
def crear_solicitud_bibliocomunidad(
    entrada: SolicitudBibliocomunidad,
    sesion: Annotated[tuple[Client, str | None], Depends(_autenticar_opcional)],
):
    cliente, usuario_sesion = sesion
    # El identificador del remitente se obtiene de la sesión y no se puede suplantar.
    if entrada.usuarioId is not None and str(entrada.usuarioId) != usuario_sesion:
        raise HTTPException(403, 'usuarioId debe corresponder a la sesión autenticada.')
    if usuario_sesion is None and entrada.usuarioId is not None:
        raise HTTPException(403, 'Una solicitud anónima no puede asociarse a otra cuenta.')
    try:
        # La función SQL registra el caso y, si aplica, el aviso en una transacción.
        resultado = cliente.rpc('registrar_solicitud_bibliocomunidad', {
            'p_usuario_id': usuario_sesion,
            'p_nombre_remitente': entrada.nombreRemitente,
            'p_correo_contacto': (
                str(entrada.correoContacto) if entrada.correoContacto else None
            ),
            'p_telefono_contacto': entrada.telefonoContacto,
            'p_interes': entrada.interes,
        }).execute()
    except APIError as error:
        raise _http_error(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible registrar la solicitud.') from None

    # Normalizar el resultado porque PostgREST puede envolver una fila en una lista.
    datos = resultado.data
    if isinstance(datos, list):
        datos = datos[0] if datos else None
    if not isinstance(datos, dict) or not datos.get('id') or not datos.get('creadoEn'):
        raise HTTPException(503, 'No fue posible confirmar el registro de la solicitud.')
    return SolicitudCreada(
        id=datos['id'],
        mensaje='Recibimos tu interés en Bibliocomunidad. Conserva este folio.',
        creadoEn=datos['creadoEn'],
    )


@router.get(
    '/admin/bibliocomunidad/solicitudes',
    response_model=SolicitudesPaginadas,
    summary='Listar solicitudes de Bibliocomunidad',
    description=(
        'Acceso privado para personal con la capacidad atender_bibliocomunidad '
        'vigente en ámbito global.'
    ),
)
def listar_solicitudes_bibliocomunidad(
    sesion: SesionAutorizada,
    estado_atencion: Literal['recibido', 'en_atencion', 'cerrado'] | None = None,
    page: int = Query(1, ge=1, le=10000),
    limit: int = Query(10, ge=1, le=100),
):
    # Limitar paginación y filtrar siempre la categoría para no mezclar contactos generales.
    desplazamiento = (page - 1) * limit
    if desplazamiento > 100000:
        raise HTTPException(400, 'La página solicitada está fuera del rango permitido.')
    consulta = (sesion.cliente.table('mensajeContacto')
                .select(
                    'id,usuarioId,nombreRemitente,correoContacto,telefonoContacto,'
                    'areaAsignada,asunto,cuerpoMensaje,estadoAtencion,atendidoPor,respuestaFinal,'
                    'incorporacionConfirmada,creadoEn,actualizadoEn',
                    count='exact',
                )
                .eq('tipoContacto', TIPO_CASO))
    if estado_atencion is not None:
        consulta = consulta.eq('estadoAtencion', estado_atencion)
    try:
        resultado = (consulta.order('creadoEn', desc=True)
                     .order('id', desc=True)
                     .range(desplazamiento, desplazamiento + limit - 1)
                     .execute())
    except APIError as error:
        raise _http_error(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible listar las solicitudes.') from None
    if not isinstance(resultado.data, list) or resultado.count is None:
        raise HTTPException(503, 'La base de datos devolvió una respuesta incompleta.')
    return SolicitudesPaginadas(
        items=resultado.data,
        total=resultado.count,
        page=page,
        limit=limit,
    )


@router.post(
    '/admin/bibliocomunidad/solicitudes/{folio_id}/registrar-intento',
    response_model=IntentoRegistrado,
    summary='Registrar un intento de contacto',
    description=(
        'Guarda el intento en la bitácora y asigna la solicitud. Un intento '
        'fallido no cierra el caso ni confirma la incorporación.'
    ),
)
def registrar_intento_contacto(
    folio_id: UUID,
    intento: IntentoContacto,
    sesion: SesionAutorizada,
):
    # La RPC bloquea y actualiza el caso en la misma transacción que inserta el intento.
    try:
        resultado = sesion.cliente.rpc('registrar_intento_bibliocomunidad', {
            'p_folio': str(folio_id),
            'p_tipo_intento': intento.tipoIntento,
            'p_exitoso': intento.exitoso,
            'p_observaciones': intento.observaciones,
        }).execute()
    except APIError as error:
        raise _http_error(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible registrar el intento de contacto.') from None
    datos = resultado.data
    if isinstance(datos, list):
        datos = datos[0] if datos else None
    if not isinstance(datos, dict):
        raise HTTPException(503, 'La base de datos devolvió una respuesta inválida.')
    return IntentoRegistrado.model_validate(datos)


@router.patch(
    '/admin/bibliocomunidad/solicitudes/{folio_id}/finalizar',
    response_model=SolicitudBibliocomunidadResumen,
    summary='Finalizar una solicitud de Bibliocomunidad',
    description=(
        'Solo permite cerrar con un intento efectivo o una resolución explícita. '
        'Confirmar incorporación requiere un contacto efectivo registrado.'
    ),
)
def finalizar_solicitud(
    folio_id: UUID,
    cierre: FinalizarSolicitud,
    sesion: SesionAutorizada,
):
    # PostgreSQL vuelve a verificar intentos efectivos y la regla de cierre.
    try:
        resultado = sesion.cliente.rpc('finalizar_solicitud_bibliocomunidad', {
            'p_folio': str(folio_id),
            'p_incorporacion_confirmada': cierre.incorporacionConfirmada,
            'p_respuesta_final': cierre.respuestaFinal,
            'p_resolucion_explicita': cierre.resolucionExplicita,
        }).execute()
    except APIError as error:
        raise _http_error(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible finalizar la solicitud.') from None
    datos = resultado.data
    if isinstance(datos, list):
        datos = datos[0] if datos else None
    if not isinstance(datos, dict):
        raise HTTPException(503, 'La base de datos devolvió una respuesta inválida.')
    return SolicitudBibliocomunidadResumen.model_validate(datos)


@router.get(
    '/admin/bibliocomunidad/solicitudes/{folio_id}/intentos',
    summary='Consultar la bitácora de intentos de una solicitud',
    description='Requiere el mismo permiso que el panel administrativo.',
)
def listar_intentos_contacto(folio_id: UUID, sesion: SesionAutorizada):
    # No se habilita SELECT directo de la bitácora; la función valida al personal.
    try:
        resultado = sesion.cliente.rpc('listar_intentos_bibliocomunidad', {
            'p_folio': str(folio_id),
        }).execute()
    except APIError as error:
        raise _http_error(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar los intentos de contacto.') from None
    if not isinstance(resultado.data, list):
        raise HTTPException(503, 'La base de datos devolvió una respuesta inválida.')
    return {'items': resultado.data}