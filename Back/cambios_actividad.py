"""HU-17 / T-094: solicitudes y resoluciones de cambios de sesiones.

La RPC comprueba titularidad, ámbito, autorización y disponibilidad en una transacción.
No se envían correos ni se crean usuarios desde estas rutas.
"""
from datetime import date, time
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Path, Query, Response
from pydantic import AwareDatetime, Field, StringConstraints, model_validator

from Back.actividades import ejecutar as ejecutar_agenda
from Back.actividades import ejecutar_cambio
from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(prefix='/actividades/cambios', tags=['Cambios y cancelaciones (HU-17)'])
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
Referencia = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Folio = Annotated[str, Path(pattern=r'^CB-[0-9]{6,}$', max_length=30)]


class ProgramacionSolicitada(DatosBase):
    sesionId: UUID
    fecha: date
    inicio: time
    fin: time
    espacio: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]

    @model_validator(mode='after')
    def validar_horario(self):
        if self.inicio.tzinfo or self.fin.tzinfo or self.fin <= self.inicio:
            raise ValueError('Usa horas locales de Tepic y un fin posterior al inicio.')
        return self


class SolicitudCambio(DatosBase):
    actividad: Annotated[str, StringConstraints(pattern=r'^[a-zA-Z0-9_-]{1,150}$')]
    actualizado: AwareDatetime
    tipo: Literal['reprogramacion', 'cancelacion']
    sesiones: list[UUID] = Field(min_length=1, max_length=50)
    programacion: list[ProgramacionSolicitada] = Field(default_factory=list, max_length=50)
    motivo: Motivo

    @model_validator(mode='after')
    def validar_sesiones(self):
        if len(set(self.sesiones)) != len(self.sesiones):
            raise ValueError('No repitas sesiones.')
        propuestas = [p.sesionId for p in self.programacion]
        if self.tipo == 'cancelacion' and propuestas:
            raise ValueError('Una cancelación no tiene programación nueva.')
        if self.tipo == 'reprogramacion' and (
            len(set(propuestas)) != len(propuestas) or set(propuestas) != set(self.sesiones)
        ):
            raise ValueError('Indica la nueva programación de cada sesión afectada.')
        return self


class AcuerdoCambio(DatosBase):
    referencia: Referencia
    autoridad: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
    fecha: date


class ResolucionCambio(DatosBase):
    version: int = Field(ge=1)
    decision: Literal['autorizar', 'rechazar']
    motivo: Motivo
    acuerdo: AcuerdoCambio | None = None

    @model_validator(mode='after')
    def exigir_acuerdo(self):
        if self.decision == 'autorizar' and self.acuerdo is None:
            raise ValueError('Registra el acuerdo de la autoridad antes de autorizar.')
        if self.decision == 'rechazar' and self.acuerdo is not None:
            raise ValueError('El rechazo no acredita una autorización.')
        return self


class AplicacionCambio(DatosBase):
    version: int = Field(ge=1)


def ejecutar(cliente, operacion, datos, response):
    response.headers['Cache-Control'] = 'private, no-store'
    return ejecutar_agenda(cliente, operacion, datos, rpc='cambios_actividad')


@router.get('/actividades')
def actividades(cliente: Cliente, response: Response):
    return ejecutar(cliente, 'actividades', {}, response)


@router.get('/avisos')
def avisos(cliente: Cliente, response: Response, limite: int = Query(20, ge=1, le=50),
           desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, 'avisos', {'limite': limite, 'desplazamiento': desplazamiento}, response)


@router.post('/avisos/{aviso_id}/leer')
def leer_aviso(aviso_id: UUID, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'leer_aviso', {'id': str(aviso_id)}, response)


@router.get('')
def listar(cliente: Cliente, response: Response, propias: bool = False,
           limite: int = Query(20, ge=1, le=50), desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, 'listar', {'propias': propias, 'limite': limite, 'desplazamiento': desplazamiento}, response)


@router.post('', status_code=201)
def solicitar(datos: SolicitudCambio, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'solicitar', datos.model_dump(mode='json'), response)


@router.get('/{folio}')
def obtener(folio: Folio, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'obtener', {'folio': folio}, response)


@router.post('/{folio}/resolver')
def resolver(folio: Folio, datos: ResolucionCambio, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'resolver', {'folio': folio, **datos.model_dump(mode='json')}, response)


@router.post('/{folio}/aplicar')
def aplicar(folio: Folio, datos: AplicacionCambio, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'aplicar', {'folio': folio, **datos.model_dump(mode='json')}, response)


@router.post('/{folio}/reintentar-avisos')
def reintentar(folio: Folio, datos: AplicacionCambio, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'reintentar_avisos', {'folio': folio, **datos.model_dump(mode='json')}, response)


@router.get('/{folio}/correos')
def estado_correos(folio: Folio, cliente: Cliente, response: Response):
    response.headers['Cache-Control'] = 'private, no-store'
    return ejecutar_cambio(cliente, 'correos_cambio_actividad', {'p_folio': folio, 'p_reintentar': False})


@router.post('/{folio}/correos/reintentar')
def reintentar_correos(folio: Folio, cliente: Cliente, response: Response):
    response.headers['Cache-Control'] = 'private, no-store'
    return ejecutar_cambio(cliente, 'correos_cambio_actividad', {'p_folio': folio, 'p_reintentar': True})
