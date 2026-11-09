"""HU-15 / T-075 de Stephanie, adaptada con correcciones propias y resolución institucional."""
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Query, Response
from pydantic import AwareDatetime, StringConstraints, model_validator

from Back.atencion_solicitudes import ejecutar_atencion
from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(prefix='/propuestas', tags=['Propuestas de eventos y clubes (T-075)'])
EstadoPropuesta = Literal['borrador', 'en_revision', 'requiere_correccion', 'aprobada', 'rechazada', 'cancelada']
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class PropuestaEventoCreate(DatosBase):
    tituloPropuesta: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    descripcion: Texto
    tipoPropuesta: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    publicoDirigido: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
    necesidadEspacio: Texto
    frecuenciaReunion: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    diasSolicitados: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    horarioSolicitado: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    abiertaAlPublico: Literal[True]
    sinFinesDeLucro: Literal[True]


class PropuestaEventoCorreccion(PropuestaEventoCreate):
    actualizadoEn: AwareDatetime


class PropuestaEventoUpdate(DatosBase):
    estadoRevision: Literal['requiere_correccion', 'aprobada', 'rechazada']
    actualizadoEn: AwareDatetime
    observacionesInstitucionales: Texto | None = None

    @model_validator(mode='after')
    def motivo_requerido(self):
        if self.estadoRevision in ('requiere_correccion', 'rechazada') and not self.observacionesInstitucionales:
            raise ValueError('Especifica las observaciones o el motivo.')
        return self


def llamar(cliente, operacion, datos, respuesta):
    respuesta.headers['Cache-Control'] = 'private, no-store'
    return ejecutar_atencion(cliente, 'propuesta', operacion, datos)


@router.post('', status_code=201)
def crear(datos: PropuestaEventoCreate, cliente: Cliente, response: Response):
    return llamar(cliente, 'crear', datos.model_dump(mode='json'), response)


@router.get('/me')
def propias(cliente: Cliente, response: Response, limite: int = Query(20, ge=1, le=50), desplazamiento: int = Query(0, ge=0, le=100000)):
    return llamar(cliente, 'mias', {'limite': limite, 'desplazamiento': desplazamiento}, response)


@router.get('')
def listar(cliente: Cliente, response: Response, estadoRevision: EstadoPropuesta | None = None,
           limite: int = Query(20, ge=1, le=50), desplazamiento: int = Query(0, ge=0, le=100000),
           busqueda: Annotated[str, Query(max_length=100)] = ''):
    return llamar(cliente, 'listar', {'estado': estadoRevision, 'limite': limite,
        'desplazamiento': desplazamiento, 'busqueda': busqueda.strip()}, response)


@router.get('/{propuesta_id}')
def detalle(propuesta_id: UUID, cliente: Cliente, response: Response):
    return llamar(cliente, 'obtener', {'id': str(propuesta_id)}, response)


@router.patch('/{propuesta_id}')
def resolver(propuesta_id: UUID, datos: PropuestaEventoUpdate, cliente: Cliente, response: Response):
    return llamar(cliente, 'resolver', {'id': str(propuesta_id), **datos.model_dump(mode='json')}, response)


@router.put('/{propuesta_id}/corregir')
def corregir(propuesta_id: UUID, datos: PropuestaEventoCorreccion, cliente: Cliente, response: Response):
    return llamar(cliente, 'corregir', {'id': str(propuesta_id), **datos.model_dump(mode='json')}, response)
