"""Administración y recuperación segura de fuentes para el asistente RAG."""

from datetime import datetime, timezone
from typing import Annotated, Literal, NamedTuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, StringConstraints
from postgrest.exceptions import APIError
from supabase import Client
from supabase_auth.errors import AuthApiError

from Back.administracion import ejecutar
from Back.conexion import crear_cliente

router = APIRouter(
    prefix='/api/v1/admin/rag/fuentes',
    tags=['Fuentes del asistente RAG'],
)
seguridad = HTTPBearer(auto_error=False)
EstadosFuente = Literal['borrador', 'en_revision', 'aprobada', 'retirada']


class Peticion(BaseModel):
    # Rechaza propiedades desconocidas para que los clientes no modifiquen campos internos.
    model_config = ConfigDict(extra='forbid')


class FuenteEntrada(Peticion):
    tituloFuente: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=250)
    ]
    tipoFuente: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
    ]
    contenidoReferencia: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50000)
    ]


class DecisionAprobacion(Peticion):
    aprobar: bool


class FuenteRAG(BaseModel):
    id: UUID
    tituloFuente: str
    tipoFuente: str
    contenidoReferencia: str
    estadoFuente: EstadosFuente
    version: int
    subidaPor: UUID
    aprobadaPor: UUID | None
    creadaEn: datetime
    actualizadaEn: datetime
    activa: bool


class FuentesPaginadas(BaseModel):
    items: list[FuenteRAG]
    total: int
    page: int
    limit: int


class SesionFuentes(NamedTuple):
    cliente: Client
    usuario_id: str
    puede_aprobar: bool


def _error_db(error: APIError) -> HTTPException:
    # Traducir errores de PostgreSQL a respuestas HTTP sin filtrar detalles internos.
    if error.code == '42501':
        return HTTPException(403, 'No tienes autorización para esta operación.')
    if error.code == 'P0002':
        return HTTPException(404, 'No se encontró la fuente solicitada.')
    if error.code in ('23514', '22023', '22P02'):
        return HTTPException(400, 'La fuente no admite esta operación o transición.')
    if error.code == '23505':
        return HTTPException(409, 'Ya existe una versión con esos datos.')
    return HTTPException(503, 'No fue posible completar la operación de fuentes RAG.')


def _sesion_fuentes(
    credenciales: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(seguridad),
    ],
) -> SesionFuentes:
    # Validar la sesión antes de consultar los roles y permisos administrativos.
    if credenciales is None or credenciales.scheme.lower() != 'bearer':
        raise HTTPException(
            401,
            'Se requiere una sesión válida.',
            headers={'WWW-Authenticate': 'Bearer'},
        )
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
        puede_aprobar = 'administrador' in roles
        puede_gestionar = puede_aprobar
        if not puede_gestionar:
            # La capacidad solo aplica si es global y está vigente en este momento.
            permisos = (
                cliente.table('permisoCuenta')
                .select('capacidad,vigenteDesde,vigenteHasta')
                .eq('usuarioId', usuario_id)
                .eq('capacidad', 'gestionar_fuentes_asistente')
                .is_('actividadId', 'null')
                .execute()
            )
            if not isinstance(permisos.data, list):
                raise HTTPException(503, 'No fue posible comprobar los permisos.')
            ahora = datetime.now(timezone.utc)
            puede_gestionar = any(
                datetime.fromisoformat(fila['vigenteDesde'].replace('Z', '+00:00')) <= ahora
                and (
                    fila.get('vigenteHasta') is None
                    or datetime.fromisoformat(
                        fila['vigenteHasta'].replace('Z', '+00:00')
                    ) > ahora
                )
                for fila in permisos.data
            )
        if not puede_gestionar:
            raise HTTPException(
                403,
                'Se requiere gestionar_fuentes_asistente o el rol administrador.',
            )
        return SesionFuentes(cliente, usuario_id, puede_aprobar)
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


SesionAutorizada = Annotated[SesionFuentes, Depends(_sesion_fuentes)]


def _requiere_aprobador(sesion: SesionFuentes) -> None:
    # La aprobación institucional se reserva al rol administrador.
    if not sesion.puede_aprobar:
        raise HTTPException(403, 'La aprobación de fuentes está reservada al rol administrador.')


def _resultado_fuente(resultado) -> dict:
    # Normalizar la forma de respuesta de PostgREST antes de validar el modelo.
    datos = resultado.data
    if isinstance(datos, list):
        datos = datos[0] if datos else None
    if not isinstance(datos, dict):
        raise HTTPException(503, 'La base de datos devolvió una respuesta inválida.')
    return datos


def _rpc_fuente(sesion: SesionFuentes, operacion: str, parametros: dict) -> FuenteRAG:
    # Las transiciones sensibles se ejecutan en PostgreSQL, que vuelve a validar permisos.
    try:
        resultado = sesion.cliente.rpc(operacion, parametros).execute()
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible actualizar la fuente RAG.') from None
    return FuenteRAG.model_validate(_resultado_fuente(resultado))


@router.post(
    '',
    status_code=201,
    response_model=FuenteRAG,
    summary='Registrar un borrador de fuente RAG',
    description=(
        'Crea una fuente en estado borrador, sin aprobación ni activación.'
    ),
)
def crear_fuente(entrada: FuenteEntrada, sesion: SesionAutorizada):
    try:
        # Los valores de estado, versión y autoría los define el servidor.
        resultado = (
            sesion.cliente.table('fuenteRAG')
            .insert({
                'tituloFuente': entrada.tituloFuente,
                'tipoFuente': entrada.tipoFuente,
                'contenidoReferencia': entrada.contenidoReferencia,
                'estadoFuente': 'borrador',
                'version': 1,
                'subidaPor': sesion.usuario_id,
                'aprobadaPor': None,
                'activa': False,
            })
            .select(
                'id,tituloFuente,tipoFuente,contenidoReferencia,estadoFuente,'
                'version,subidaPor,aprobadaPor,creadaEn,actualizadaEn,activa'
            )
            .execute()
        )
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible registrar el borrador RAG.') from None
    return FuenteRAG.model_validate(_resultado_fuente(resultado))


@router.get(
    '',
    response_model=FuentesPaginadas,
    summary='Listar y filtrar fuentes RAG',
)
def listar_fuentes(
    sesion: SesionAutorizada,
    estadoFuente: EstadosFuente | None = None,
    tipoFuente: str | None = Query(default=None, min_length=1, max_length=80),
    page: int = Query(default=1, ge=1, le=10000),
    limit: int = Query(default=10, ge=1, le=100),
):
    # Acotar la ventana protege la base frente a listados excesivamente grandes.
    desplazamiento = (page - 1) * limit
    if desplazamiento > 100000:
        raise HTTPException(400, 'La página solicitada está fuera del rango permitido.')
    consulta = sesion.cliente.table('fuenteRAG').select(
        'id,tituloFuente,tipoFuente,contenidoReferencia,estadoFuente,version,'
        'subidaPor,aprobadaPor,creadaEn,actualizadaEn,activa',
        count='exact',
    )
    if estadoFuente is not None:
        consulta = consulta.eq('estadoFuente', estadoFuente)
    if tipoFuente is not None:
        consulta = consulta.eq('tipoFuente', tipoFuente.strip())
    try:
        resultado = (
            consulta.order('actualizadaEn', desc=True)
            .order('id', desc=True)
            .range(desplazamiento, desplazamiento + limit - 1)
            .execute()
        )
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible listar las fuentes RAG.') from None
    if not isinstance(resultado.data, list) or resultado.count is None:
        raise HTTPException(503, 'La base de datos devolvió una respuesta incompleta.')
    return FuentesPaginadas(
        items=resultado.data,
        total=resultado.count,
        page=page,
        limit=limit,
    )


@router.patch(
    '/{fuente_id}/aprobar',
    response_model=FuenteRAG,
    summary='Aprobar o devolver a revisión una fuente',
    description=(
        'Solo el rol administrador puede aprobar; retirar la '
        'aprobación desactiva inmediatamente la fuente para RAG.'
    ),
)
def aprobar_fuente(fuente_id: UUID, decision: DecisionAprobacion, sesion: SesionAutorizada):
    _requiere_aprobador(sesion)
    return _rpc_fuente(sesion, 'resolver_fuente_rag', {
        'p_fuente_id': str(fuente_id),
        'p_aprobar': decision.aprobar,
    })


@router.patch(
    '/{fuente_id}/activar',
    response_model=FuenteRAG,
    summary='Activar una fuente RAG aprobada',
    description=(
        'La base vuelve a validar aprobación explícita antes '
        'de habilitar la fuente en recuperación.'
    ),
)
def activar_fuente(fuente_id: UUID, sesion: SesionAutorizada):
    return _rpc_fuente(sesion, 'activar_fuente_rag', {
        'p_fuente_id': str(fuente_id),
    })


@router.patch(
    '/{fuente_id}/retirar',
    response_model=FuenteRAG,
    summary='Retirar una fuente del asistente RAG',
    description=(
        'Retira y desactiva la fuente para excluirla de '
        'consultas nuevas del asistente.'
    ),
)
def retirar_fuente(fuente_id: UUID, sesion: SesionAutorizada):
    return _rpc_fuente(sesion, 'retirar_fuente_rag', {
        'p_fuente_id': str(fuente_id),
    })


@router.patch(
    '/{fuente_id}/version',
    status_code=201,
    response_model=FuenteRAG,
    summary='Crear una nueva versión en borrador',
    description=(
        'Retira la versión previa y crea la siguiente versión '
        'sin conservar aprobación ni activación.'
    ),
)
def crear_version_fuente(
    fuente_id: UUID,
    entrada: FuenteEntrada,
    sesion: SesionAutorizada,
):
    # La función SQL retira la versión existente y crea la nueva como borrador.
    return _rpc_fuente(sesion, 'crear_version_fuente_rag', {
        'p_fuente_id': str(fuente_id),
        'p_titulo': entrada.tituloFuente,
        'p_tipo': entrada.tipoFuente,
        'p_contenido': entrada.contenidoReferencia,
    })


def consultar_fuentes_rag(cliente: Client, limite: int = 20) -> list[dict]:
    """Recupera únicamente fuentes aprobadas explícitamente y activas."""
    if not 1 <= limite <= 100:
        raise ValueError('El límite de recuperación debe estar entre 1 y 100.')
    try:
        # Estos filtros son obligatorios: las fuentes retiradas o no aprobadas
        # no deben formar parte del contexto enviado al modelo.
        resultado = (
            cliente.table('fuenteRAG')
            .select('id,tituloFuente,tipoFuente,contenidoReferencia,version')
            .eq('estadoFuente', 'aprobada')
            .not_.is_('aprobadaPor', 'null')
            .eq('activa', True)
            .order('actualizadaEn', desc=True)
            .limit(limite)
            .execute()
        )
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible recuperar las fuentes autorizadas.') from None
    if not isinstance(resultado.data, list):
        raise HTTPException(503, 'La base de datos devolvió una respuesta inválida.')
    return resultado.data