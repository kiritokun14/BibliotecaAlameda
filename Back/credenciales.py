"""HU-13 / T-072: solicitudes de atención para credenciales bibliotecarias."""

from datetime import datetime
from enum import Enum
from typing import Annotated, NamedTuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict
from postgrest.exceptions import APIError
from supabase import Client
from supabase_auth.errors import AuthApiError

from Back.administracion import ejecutar
from Back.conexion import crear_cliente

router = APIRouter(prefix='/api/credenciales', tags=['Credenciales'])
seguridad = HTTPBearer(auto_error=False)


class TipoSolicitud(str, Enum):
    obtencion = 'obtencion'
    renovacion = 'renovacion'


class EstadoSolicitud(str, Enum):
    recibida = 'recibida'
    en_atencion = 'en_atencion'
    cita_programada = 'cita_programada'
    atendida = 'atendida'
    rechazada = 'rechazada'
    cancelada = 'cancelada'


class Peticion(BaseModel):
    model_config = ConfigDict(extra='forbid')


class SolicitudCredencialCreate(Peticion):
    tipoSolicitud: TipoSolicitud
    observaciones: str | None = None


class SolicitudCredencialUpdate(Peticion):
    estadoSolicitud: EstadoSolicitud
    fechaCita: datetime | None = None
    observaciones: str | None = None


class SolicitudCredencialResponse(BaseModel):
    id: UUID
    usuarioId: UUID
    tipoSolicitud: TipoSolicitud
    estadoSolicitud: EstadoSolicitud
    fechaCita: datetime | None = None
    atendidaPor: UUID | None = None
    observaciones: str | None = None
    creadaEn: datetime
    actualizadaEn: datetime


class PerfilSolicitanteResponse(BaseModel):
    id: UUID
    nombres: str
    primerApellido: str
    segundoApellido: str | None = None
    telefono: str
    municipio: str


class SolicitudCredencialConPerfilResponse(SolicitudCredencialResponse):
    perfil: PerfilSolicitanteResponse


class SesionCredenciales(NamedTuple):
    cliente: Client
    usuario_id: str
    permisos: list[dict]


def _sesion_autenticada(
    credenciales: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(seguridad),
    ],
) -> SesionCredenciales:
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
        if not isinstance(permisos, list):
            raise HTTPException(503, 'No fue posible comprobar los permisos.')
        return SesionCredenciales(cliente, usuario_id, permisos)
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status in (400, 401, 403):
            raise HTTPException(401, 'La sesión no es válida o expiró.') from None
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None
    except APIError as error:
        if error.code == '42501':
            raise HTTPException(403, 'No tienes permiso para esta operación.') from None
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None


def _sesion_personal(sesion: SesionCredenciales) -> SesionCredenciales:
    puede_validar = any(
        permiso.get('capacidad') == 'validar_credenciales'
        and permiso.get('ambito') == 'global'
        and not permiso.get('actividadId')
        for permiso in sesion.permisos
        if isinstance(permiso, dict)
    )
    if not puede_validar:
        raise HTTPException(403, 'Se requiere la capacidad validar_credenciales.')
    return sesion


def _error_db(error: APIError) -> HTTPException:
    if error.code == '42501':
        return HTTPException(403, 'No tienes autorización para esta operación.')
    if error.code == 'PGRST116':
        return HTTPException(404, 'No se encontró la solicitud de credencial.')
    if error.code in ('23503', '23514', '22023', '22P02'):
        return HTTPException(422, 'Los datos enviados no cumplen las reglas de la solicitud.')
    if error.code == '23505':
        return HTTPException(409, 'Ya existe una solicitud activa para este usuario.')
    return HTTPException(503, 'No fue posible completar la operación de credenciales.')


SesionUsuario = Annotated[SesionCredenciales, Depends(_sesion_autenticada)]

_COLUMNAS_RESPUESTA = (
    'id,usuarioId,tipoSolicitud,estadoSolicitud,fechaCita,atendidaPor,'
    'observaciones,creadaEn,actualizadaEn'
)
_SOLICITUDES_ACTIVAS = ('recibida', 'en_atencion', 'cita_programada')


@router.post(
    '/solicitudes',
    response_model=SolicitudCredencialResponse,
    status_code=201,
    summary='Solicitar atención para obtener o renovar la credencial',
)
def crear_solicitud_credencial(entrada: SolicitudCredencialCreate, sesion: SesionUsuario):
    cliente = sesion.cliente
    usuario_id = sesion.usuario_id
    try:
        existente = (
            cliente.table('solicitudCredencial')
            .select('id')
            .eq('usuarioId', usuario_id)
            .in_('estadoSolicitud', _SOLICITUDES_ACTIVAS)
            .limit(1)
            .execute()
        )
        if existente.data:
            raise HTTPException(409, 'Ya tienes una solicitud de credencial activa.')

        fila = (
            cliente.table('solicitudCredencial')
            .insert({
                'usuarioId': usuario_id,
                'tipoSolicitud': entrada.tipoSolicitud.value,
                'observaciones': entrada.observaciones,
            })
            .select(_COLUMNAS_RESPUESTA)
            .single()
            .execute()
        )
        return SolicitudCredencialResponse.model_validate(fila.data)
    except HTTPException:
        raise
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible registrar la solicitud de credencial.') from None


@router.get(
    '/solicitudes/me',
    response_model=list[SolicitudCredencialResponse],
    summary='Consultar las solicitudes propias de credencial',
)
def listar_solicitudes_propias(
    respuesta: Response,
    sesion: SesionUsuario,
):
    respuesta.headers['Cache-Control'] = 'private, no-store'
    cliente = sesion.cliente
    usuario_id = sesion.usuario_id
    try:
        resultado = (
            cliente.table('solicitudCredencial')
            .select(_COLUMNAS_RESPUESTA)
            .eq('usuarioId', usuario_id)
            .order('creadaEn', desc=True)
            .order('id', desc=True)
            .execute()
        )
        return [SolicitudCredencialResponse.model_validate(fila) for fila in resultado.data]
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar tus solicitudes de credencial.') from None


@router.get(
    '/solicitudes',
    response_model=list[SolicitudCredencialConPerfilResponse],
    summary='Consultar solicitudes de credencial para atención',
)
def listar_solicitudes_personal(
    sesion: SesionUsuario,
    estadoSolicitud: EstadoSolicitud | None = Query(default=None),
):
    personal = _sesion_personal(sesion)
    try:
        resultado = personal.cliente.rpc(
            'listar_solicitudes_credencial_personal',
            {'p_estado': estadoSolicitud.value if estadoSolicitud is not None else None},
        ).execute()
        if not isinstance(resultado.data, list):
            raise HTTPException(503, 'La base de datos devolvió una respuesta inválida.')
        return [
            SolicitudCredencialConPerfilResponse.model_validate(fila)
            for fila in resultado.data
        ]
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar las solicitudes de credencial.') from None


@router.patch(
    '/solicitudes/{solicitud_id}',
    response_model=SolicitudCredencialResponse,
    summary='Actualizar seguimiento o cita de una solicitud',
)
def actualizar_solicitud_credencial(
    solicitud_id: UUID,
    cambios: SolicitudCredencialUpdate,
    sesion: SesionUsuario,
):
    personal = _sesion_personal(sesion)
    actualizacion = {
        'estadoSolicitud': cambios.estadoSolicitud.value,
        'atendidaPor': personal.usuario_id,
    }
    if 'fechaCita' in cambios.model_fields_set:
        actualizacion['fechaCita'] = (
            cambios.fechaCita.isoformat() if cambios.fechaCita is not None else None
        )
    if 'observaciones' in cambios.model_fields_set:
        actualizacion['observaciones'] = cambios.observaciones

    try:
        resultado = (
            personal.cliente.table('solicitudCredencial')
            .update(actualizacion)
            .eq('id', str(solicitud_id))
            .select(_COLUMNAS_RESPUESTA)
            .single()
            .execute()
        )
        return SolicitudCredencialResponse.model_validate(resultado.data)
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible actualizar la solicitud de credencial.') from None
