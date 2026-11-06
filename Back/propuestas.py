"""HU-15 / T-075: creación y seguimiento de propuestas de eventos y clubes."""

from datetime import datetime
from enum import Enum
from typing import Annotated, NamedTuple
import unicodedata
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator
from postgrest.exceptions import APIError
from supabase import Client
from supabase_auth.errors import AuthApiError

from Back.administracion import ejecutar
from Back.conexion import crear_cliente

router = APIRouter(prefix='/api/propuestas', tags=['Propuestas de Eventos y Clubes'])
seguridad = HTTPBearer(auto_error=False)


class EstadoRevision(str, Enum):
    borrador = 'borrador'
    en_atencion = 'en_atencion'
    en_revision = 'en_revision'
    requiere_correccion = 'requiere_correccion'
    aprobada = 'aprobada'
    rechazada = 'rechazada'
    cancelada = 'cancelada'


class Peticion(BaseModel):
    model_config = ConfigDict(extra='forbid')


TextoPropuesta = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class PropuestaEventoCreate(Peticion):
    tituloPropuesta: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    descripcion: TextoPropuesta
    tipoPropuesta: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    publicoDirigido: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
    necesidadEspacio: TextoPropuesta
    frecuenciaReunion: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    diasSolicitados: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    horarioSolicitado: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]

    @model_validator(mode='after')
    def validar_reglas_institucionales(self):
        descripcion = _normalizar_texto(self.descripcion)
        publico = _normalizar_texto(self.publicoDirigido)
        evento_abierto = any(
            frase in descripcion
            for frase in (
                'abierto al publico',
                'abierta al publico',
                'abierto a todo publico',
                'abierta a todo publico',
                'evento abierto',
                'actividad abierta',
            )
        ) or 'publico general' in publico
        sin_fines_de_lucro = any(
            frase in descripcion
            for frase in (
                'sin fines de lucro',
                'sin animo de lucro',
                'no lucrativo',
                'no lucrativa',
            )
        )
        if not evento_abierto or not sin_fines_de_lucro:
            raise ValueError(
                'La propuesta debe indicar que es abierta al público y sin fines de lucro.'
            )
        return self


def _normalizar_texto(texto: str) -> str:
    descompuesto = unicodedata.normalize('NFD', texto.casefold())
    return ''.join(caracter for caracter in descompuesto if not unicodedata.combining(caracter))


class PropuestaEventoUpdate(Peticion):
    estadoRevision: EstadoRevision
    observacionesInstitucionales: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)
    ] | None = None


class PropuestaEventoResponse(BaseModel):
    id: UUID
    tituloPropuesta: str
    descripcion: str
    tipoPropuesta: str
    publicoDirigido: str
    necesidadEspacio: str
    estadoRevision: EstadoRevision
    observacionesInstitucionales: str | None = None
    propuestoPor: UUID
    revisadoPor: UUID | None = None
    actividadId: UUID | None = None
    creadaEn: datetime
    actualizadoEn: datetime
    frecuenciaReunion: str
    diasSolicitados: str
    horarioSolicitado: str


class PerfilProponenteResponse(BaseModel):
    id: UUID
    nombres: str
    primerApellido: str
    segundoApellido: str | None = None
    telefono: str


class PropuestaEventoConPerfilResponse(PropuestaEventoResponse):
    perfil: PerfilProponenteResponse


class SesionPropuestas(NamedTuple):
    cliente: Client
    usuario_id: str
    permisos: list[dict]


def _sesion_autenticada(
    credenciales: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(seguridad),
    ],
) -> SesionPropuestas:
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
        return SesionPropuestas(cliente, usuario_id, permisos)
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


def _sesion_personal(sesion: SesionPropuestas) -> SesionPropuestas:
    puede_gestionar = any(
        permiso.get('capacidad') in ('gestionar_actividades', 'moderar_foro')
        and permiso.get('ambito') == 'global'
        and not permiso.get('actividadId')
        for permiso in sesion.permisos
        if isinstance(permiso, dict)
    )
    if not puede_gestionar:
        raise HTTPException(403, 'Se requiere la capacidad gestionar_actividades o moderar_foro.')
    return sesion


def _error_db(error: APIError) -> HTTPException:
    if error.code == '42501':
        return HTTPException(403, 'No tienes autorización para esta operación.')
    if error.code == 'PGRST116':
        return HTTPException(404, 'No se encontró la propuesta de evento.')
    if error.code in ('23503', '23514', '22023', '22P02'):
        return HTTPException(422, 'Los datos enviados no cumplen las reglas de la propuesta.')
    return HTTPException(503, 'No fue posible completar la operación de propuestas.')


SesionUsuario = Annotated[SesionPropuestas, Depends(_sesion_autenticada)]

_COLUMNAS_RESPUESTA = (
    'id,tituloPropuesta,descripcion,tipoPropuesta,publicoDirigido,necesidadEspacio,'
    'estadoRevision,observacionesInstitucionales,propuestoPor,revisadoPor,actividadId,'
    'creadaEn,actualizadoEn,frecuenciaReunion,diasSolicitados,horarioSolicitado'
)


@router.post(
    '',
    response_model=PropuestaEventoResponse,
    status_code=201,
    summary='Enviar una propuesta de evento o club',
    description='Registra la propuesta en revisión; no la publica ni crea una actividad.',
)
def crear_propuesta(entrada: PropuestaEventoCreate, sesion: SesionUsuario):
    try:
        datos = entrada.model_dump()
        datos.update({
            'propuestoPor': sesion.usuario_id,
            'estadoRevision': EstadoRevision.en_revision.value,
        })
        resultado = (
            sesion.cliente.table('propuestaEvento')
            .insert(datos)
            .select(_COLUMNAS_RESPUESTA)
            .single()
            .execute()
        )
        return PropuestaEventoResponse.model_validate(resultado.data)
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible registrar la propuesta de evento.') from None


@router.get(
    '/me',
    response_model=list[PropuestaEventoResponse],
    summary='Consultar las propuestas propias',
)
def listar_propuestas_propias(sesion: SesionUsuario):
    try:
        resultado = (
            sesion.cliente.table('propuestaEvento')
            .select(_COLUMNAS_RESPUESTA)
            .eq('propuestoPor', sesion.usuario_id)
            .order('creadaEn', desc=True)
            .order('id', desc=True)
            .execute()
        )
        return [PropuestaEventoResponse.model_validate(fila) for fila in resultado.data]
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar tus propuestas.') from None


@router.get(
    '',
    response_model=list[PropuestaEventoConPerfilResponse],
    summary='Consultar propuestas para su gestión',
)
def listar_propuestas_personal(
    sesion: SesionUsuario,
    estadoRevision: EstadoRevision | None = Query(default=None),
):
    personal = _sesion_personal(sesion)
    try:
        resultado = personal.cliente.rpc(
            'listar_propuestas_evento_personal',
            {'p_estado': estadoRevision.value if estadoRevision is not None else None},
        ).execute()
        if not isinstance(resultado.data, list):
            raise HTTPException(503, 'La base de datos devolvió una respuesta inválida.')
        return [
            PropuestaEventoConPerfilResponse.model_validate(fila)
            for fila in resultado.data
        ]
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar las propuestas de eventos.') from None


@router.patch(
    '/{propuesta_id}',
    response_model=PropuestaEventoResponse,
    summary='Actualizar la revisión de una propuesta',
    description=(
        'Actualiza únicamente el estado de revisión y las observaciones. '
        'No crea actividades ni las publica automáticamente.'
    ),
)
def actualizar_propuesta(
    propuesta_id: UUID,
    cambios: PropuestaEventoUpdate,
    sesion: SesionUsuario,
):
    personal = _sesion_personal(sesion)
    actualizacion = {
        'estadoRevision': cambios.estadoRevision.value,
        'revisadoPor': personal.usuario_id,
    }
    if 'observacionesInstitucionales' in cambios.model_fields_set:
        actualizacion['observacionesInstitucionales'] = cambios.observacionesInstitucionales

    try:
        resultado = (
            personal.cliente.table('propuestaEvento')
            .update(actualizacion)
            .eq('id', str(propuesta_id))
            .select(_COLUMNAS_RESPUESTA)
            .single()
            .execute()
        )
        return PropuestaEventoResponse.model_validate(resultado.data)
    except APIError as error:
        raise _error_db(error) from None
    except Exception:
        raise HTTPException(503, 'No fue posible actualizar la propuesta de evento.') from None
