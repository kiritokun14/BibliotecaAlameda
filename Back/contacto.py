"""Recepción pública, seguimiento por folio y atención de contactos."""

from datetime import datetime, timezone
from typing import Annotated, Literal, NamedTuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints
from postgrest.exceptions import APIError
from supabase import Client
from supabase_auth.errors import AuthApiError

from Back.administracion import ejecutar
from Back.conexion import crear_cliente, crear_cliente_servicio

router = APIRouter(prefix='/api/v1', tags=['Contacto y atención'])
seguridad_opcional = HTTPBearer(auto_error=False)
seguridad_obligatoria = HTTPBearer(auto_error=False)


class Peticion(BaseModel):
    model_config = ConfigDict(extra='forbid')


class ContactoEntrada(Peticion):
    nombreRemitente: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)
    ]
    correoContacto: EmailStr
    asunto: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
    ]
    cuerpoMensaje: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)
    ]
    usuarioId: UUID | None = None


class ContactoCreado(BaseModel):
    id: UUID
    mensaje: str
    creadoEn: datetime


class ContactoSeguimiento(BaseModel):
    id: UUID
    asunto: str
    estadoAtencion: Literal['recibido', 'en_atencion', 'cerrado']
    creadoEn: datetime
    respuestaFinal: str | None = None


class ContactoResumen(BaseModel):
    id: UUID
    usuarioId: UUID | None
    nombreRemitente: str
    correoContacto: EmailStr | None
    asunto: str
    cuerpoMensaje: str
    estadoAtencion: Literal['recibido', 'en_atencion', 'cerrado']
    atendidoPor: UUID | None
    respuestaFinal: str | None
    creadoEn: datetime
    actualizadoEn: datetime


class ContactosPaginados(BaseModel):
    items: list[ContactoResumen]
    total: int
    page: int
    limit: int


class AtenderContacto(Peticion):
    estadoAtencion: Literal['en_atencion', 'cerrado']
    respuestaFinal: str | None = Field(default=None, max_length=10000)


class PersonalSesion(NamedTuple):
    cliente: Client
    usuario_id: str
    servicio: Client


def _datos_rpc(resultado) -> dict | None:
    # PostgREST puede representar una única fila como objeto o lista.
    datos = resultado.data
    if isinstance(datos, list):
        if not datos:
            return None
        datos = datos[0]
    if datos is not None and not isinstance(datos, dict):
        raise HTTPException(503, 'La base de datos devolvió una respuesta inválida.')
    return datos


def _error_db(error: APIError) -> HTTPException:
    # Traducir errores conocidos de PostgreSQL a estados HTTP sin filtrar detalles internos.
    if error.code == '42501':
        return HTTPException(403, 'No tienes autorización para esta operación.')
    if error.code in ('23503', '23514', '22023', '22P02'):
        return HTTPException(400, 'Los datos enviados no cumplen las reglas del contacto.')
    return HTTPException(503, 'No fue posible completar la operación de contacto.')


def _autenticar_opcional(
    credenciales: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(seguridad_opcional),
    ],
) -> tuple[Client, str | None]:
    # La ruta es pública, pero si se envía un token debe ser válido.
    try:
        cliente = crear_cliente()
        if credenciales is None:
            return cliente, None
        respuesta = cliente.auth.get_user(credenciales.credentials)
        if not respuesta or not respuesta.user:
            raise HTTPException(401, 'La sesión no es válida o expiró.')
        cliente.postgrest.auth(credenciales.credentials)
        return cliente, str(respuesta.user.id)
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status in (400, 401, 403):
            raise HTTPException(401, 'La sesión no es válida o expiró.') from None
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None
    except Exception:
        raise HTTPException(503, 'El servicio de contacto no está disponible.') from None


def _sesion_personal(
    credenciales: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(seguridad_obligatoria),
    ],
) -> PersonalSesion:
    # Primero se valida la identidad y después se consultan roles y capacidades vigentes.
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

        roles = {
            rol.get('rolCodigo')
            for rol in acceso.get('roles', [])
            if isinstance(rol, dict)
        }
        puede_atender = 'administrador' in roles
        if not puede_atender:
            permisos = cliente.table('permisoCuenta').select(
                'capacidad,vigenteDesde,vigenteHasta'
            ).eq('usuarioId', usuario_id).eq('capacidad', 'atender_contactos').execute()
            if not isinstance(permisos.data, list):
                raise HTTPException(503, 'No fue posible comprobar los permisos.')
            ahora = datetime.now(timezone.utc)
            # Una capacidad vencida o aún no vigente no habilita operaciones administrativas.
            puede_atender = any(
                datetime.fromisoformat(permiso['vigenteDesde'].replace('Z', '+00:00')) <= ahora
                and (
                    permiso.get('vigenteHasta') is None
                    or datetime.fromisoformat(
                        permiso['vigenteHasta'].replace('Z', '+00:00')
                    ) > ahora
                )
                for permiso in permisos.data
            )
        if not puede_atender:
            raise HTTPException(403, 'Se requiere la capacidad atender_contactos o el rol administrador.')

        # La clave de servicio solo se usa en el servidor tras validar la sesión y el permiso.
        cliente_servicio = crear_cliente_servicio()
        return PersonalSesion(cliente, usuario_id, cliente_servicio)
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status in (400, 401, 403):
            raise HTTPException(401, 'La sesión no es válida o expiró.') from None
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible comprobar la sesión o los permisos.') from None


SesionPersonal = Annotated[PersonalSesion, Depends(_sesion_personal)]


@router.post(
    '/public/contacto',
    status_code=201,
    response_model=ContactoCreado,
    summary='Enviar contacto o sugerencia y recibir un folio',
    description=(
        'Acepta remitentes anónimos o autenticados y crea el estado inicial '
        'recibido. El folio sirve como acuse y, si existe una cuenta autenticada, '
        'su aviso interno se escribe en la misma transacción. Enviar el formulario '
        'no inicia la atención.'
    ),
)
def crear_contacto(
    entrada: ContactoEntrada,
    sesion: Annotated[tuple, Depends(_autenticar_opcional)],
):
    cliente, usuario_sesion = sesion
    # La identidad asociada proviene de la sesión, nunca de un UUID arbitrario del body.
    if entrada.usuarioId is not None and str(entrada.usuarioId) != usuario_sesion:
        raise HTTPException(403, 'usuarioId debe corresponder a la sesión autenticada.')
    usuario_id = usuario_sesion
    if usuario_id is None and entrada.usuarioId is not None:
        raise HTTPException(403, 'Una solicitud anónima no puede asociarse a otra cuenta.')

    try:
        resultado = cliente.rpc('registrar_contacto_publico', {
            'p_usuario_id': usuario_id,
            'p_nombre_remitente': entrada.nombreRemitente.strip(),
            'p_correo_contacto': str(entrada.correoContacto),
            'p_asunto': entrada.asunto.strip(),
            'p_cuerpo_mensaje': entrada.cuerpoMensaje.strip(),
        }).execute()
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible registrar el contacto.') from None

    creado = _datos_rpc(resultado)
    if not creado or not creado.get('id') or not creado.get('creadoEn'):
        raise HTTPException(503, 'No fue posible confirmar el registro del contacto.')
    return ContactoCreado(
        id=creado['id'],
        mensaje='Tu contacto fue recibido. Conserva este folio para consultar su estado.',
        creadoEn=creado['creadoEn'],
    )


@router.get(
    '/public/contacto/seguimiento/{folio_id}',
    response_model=ContactoSeguimiento,
    response_model_exclude_none=True,
    summary='Consultar el estado de un contacto por su folio',
    description=(
        'La consulta es de solo lectura y no cambia el estado. El folio es un '
        'UUID opaco; la base devuelve únicamente la fila cuyo id coincide.'
    ),
)
def consultar_seguimiento(folio_id: UUID):
    # La función SQL limita el seguimiento al folio exacto y no habilita un listado público.
    try:
        resultado = crear_cliente().rpc(
            'consultar_contacto_por_folio',
            {'p_folio': str(folio_id)},
        ).execute()
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar el estado del contacto.') from None

    contacto = _datos_rpc(resultado)
    if not contacto:
        raise HTTPException(404, 'No se encontró un contacto con ese folio.')
    return ContactoSeguimiento.model_validate(contacto)


@router.get(
    '/admin/contacto',
    response_model=ContactosPaginados,
    summary='Listar contactos para personal autorizado',
    description=(
        'Requiere el rol administrador o la capacidad vigente atender_contactos. '
        'El listado no está disponible para usuarios anónimos.'
    ),
)
def listar_contactos(
    sesion: SesionPersonal,
    estado_atencion: Literal['recibido', 'en_atencion', 'cerrado'] | None = None,
    page: int = Query(1, ge=1, le=10000),
    limit: int = Query(10, ge=1, le=100),
):
    servicio = sesion.servicio
    # Limitar el desplazamiento evita lecturas administrativas excesivas.
    desplazamiento = (page - 1) * limit
    if desplazamiento > 100000:
        raise HTTPException(400, 'La página solicitada está fuera del rango permitido.')

    consulta = (servicio.table('mensajeContacto')
                .select(
                    'id,usuarioId,nombreRemitente,correoContacto,asunto,cuerpoMensaje,'
                    'estadoAtencion,atendidoPor,respuestaFinal,creadoEn,actualizadoEn',
                    count='exact',
                )
                # Mantener separados los contactos generales y las solicitudes de Bibliocomunidad.
                .eq('tipoContacto', 'general'))
    if estado_atencion is not None:
        consulta = consulta.eq('estadoAtencion', estado_atencion)
    try:
        respuesta = (consulta.order('creadoEn', desc=True)
                     .order('id', desc=True)
                     .range(desplazamiento, desplazamiento + limit - 1)
                     .execute())
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible listar los contactos.') from None
    if not isinstance(respuesta.data, list) or respuesta.count is None:
        raise HTTPException(503, 'La base de datos devolvió una respuesta incompleta.')
    return ContactosPaginados(
        items=respuesta.data,
        total=respuesta.count,
        page=page,
        limit=limit,
    )


@router.patch(
    '/admin/contacto/{folio_id}/atender',
    response_model=ContactoResumen,
    summary='Asignar o cerrar la atención de un contacto',
    description=(
        'Solo el personal autorizado puede cambiar los estados. En atención '
        'asigna atendidoPor y el cierre requiere respuestaFinal.'
    ),
)
def atender_contacto(folio_id: UUID, cambio: AtenderContacto, sesion: SesionPersonal):
    usuario_id = sesion.usuario_id
    servicio = sesion.servicio
    respuesta_final = cambio.respuestaFinal.strip() if cambio.respuestaFinal else None
    if cambio.estadoAtencion == 'cerrado' and not respuesta_final:
        raise HTTPException(400, 'respuestaFinal es obligatoria para cerrar el contacto.')

    # El filtro de estado previo evita reabrir casos cerrados o reasignar un caso ya atendido.
    estados_previos = ['recibido'] if cambio.estadoAtencion == 'en_atencion' else [
        'recibido', 'en_atencion',
    ]
    valores = {
        'estadoAtencion': cambio.estadoAtencion,
        'atendidoPor': usuario_id,
        'actualizadoEn': datetime.now(timezone.utc).isoformat(),
    }
    if cambio.estadoAtencion == 'cerrado':
        valores['respuestaFinal'] = respuesta_final
    try:
        respuesta = (servicio.table('mensajeContacto')
                     .update(valores)
                     .eq('id', str(folio_id))
                     .eq('tipoContacto', 'general')
                     .in_('estadoAtencion', estados_previos)
                     .select(
                         'id,usuarioId,nombreRemitente,correoContacto,asunto,cuerpoMensaje,'
                         'estadoAtencion,atendidoPor,respuestaFinal,creadoEn,actualizadoEn'
                     )
                     .execute())
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible actualizar la atención del contacto.') from None

    if isinstance(respuesta.data, list) and respuesta.data:
        return ContactoResumen.model_validate(respuesta.data[0])

    # Distinguir entre un folio inexistente y una transición que ya no es válida.
    try:
        existente = (servicio.table('mensajeContacto')
                     .select('id')
                     .eq('id', str(folio_id))
                     .limit(1)
                     .execute())
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible verificar el contacto.') from None
    if not existente.data:
        raise HTTPException(404, 'No se encontró un contacto con ese folio.')
    raise HTTPException(409, 'El estado del contacto cambió o ya no admite esta transición.')