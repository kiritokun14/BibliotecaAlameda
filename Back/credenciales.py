"""HU-13 / T-072 de Stephanie, adaptada: solicitudes de atención, sin emitir credenciales."""
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import AwareDatetime, Field, StringConstraints, model_validator

from Back.atencion_solicitudes import ejecutar_atencion
from Back.contenidos import Cliente
from Back.registro import DatosBase
from Back.solicitudes import sesion_solicitudes

router = APIRouter(prefix='/credenciales/solicitudes', tags=['Solicitudes de credencial (T-072)'])
EstadoCredencial = Literal['recibida', 'en_atencion', 'cita_programada', 'atendida', 'rechazada', 'cancelada']
Nota = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]


class SolicitudCredencialCreate(DatosBase):
    tipoSolicitud: Literal['obtencion', 'renovacion']
    observaciones: Nota | None = None


class SolicitudCredencialUpdate(DatosBase):
    estadoSolicitud: EstadoCredencial
    actualizadaEn: AwareDatetime
    fechaCita: AwareDatetime | None = None
    observaciones: Nota | None = None

    @model_validator(mode='after')
    def decision_completa(self):
        if self.estadoSolicitud == 'cita_programada' and not self.fechaCita:
            raise ValueError('Indica la fecha de la cita.')
        if self.estadoSolicitud in ('rechazada', 'cancelada') and not self.observaciones:
            raise ValueError('Indica el motivo.')
        return self


class ConsultaCredencialPropia(DatosBase):
    limite: int = Field(default=20, ge=1, le=50)
    desplazamiento: int = Field(default=0, ge=0, le=100000)


def llamar(cliente, operacion, datos, respuesta):
    respuesta.headers['Cache-Control'] = 'private, no-store'
    return ejecutar_atencion(cliente, 'credencial', operacion, datos)


@router.post('', status_code=201)
def crear(datos: SolicitudCredencialCreate, cliente: Cliente, response: Response):
    return llamar(cliente, 'crear', datos.model_dump(mode='json', exclude_none=True), response)


@router.get('/me')
def propias(sesion: Annotated[tuple, Depends(sesion_solicitudes)], response: Response,
            consulta: Annotated[ConsultaCredencialPropia, Query()]):
    cliente, usuario_id = sesion
    solicitudes = llamar(cliente, 'mias', consulta.model_dump(), response)
    campos = ('estadoValidacion', 'fechaEmision', 'fechaVencimiento')
    try:
        filas = (cliente.table('credencialBibliotecaria').select(','.join(campos))
                 .eq('usuarioId', usuario_id).limit(1).execute().data)
        credencial = {campo: filas[0][campo] for campo in campos} if filas else None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar el estado de tu credencial.',
                            headers={'Cache-Control': 'private, no-store'}) from None
    return {**solicitudes, 'credencial': credencial}


@router.get('')
def listar(cliente: Cliente, response: Response, estadoSolicitud: EstadoCredencial | None = None,
           limite: int = Query(20, ge=1, le=50), desplazamiento: int = Query(0, ge=0, le=100000),
           busqueda: Annotated[str, Query(max_length=100)] = ''):
    return llamar(cliente, 'listar', {'estado': estadoSolicitud, 'limite': limite,
        'desplazamiento': desplazamiento, 'busqueda': busqueda.strip()}, response)


@router.get('/{solicitud_id}')
def detalle(solicitud_id: UUID, cliente: Cliente, response: Response):
    return llamar(cliente, 'obtener', {'id': str(solicitud_id)}, response)


@router.patch('/{solicitud_id}')
def resolver(solicitud_id: UUID, datos: SolicitudCredencialUpdate, cliente: Cliente, response: Response):
    return llamar(cliente, 'resolver', {'id': str(solicitud_id), **datos.model_dump(mode='json')}, response)


# La persona titular cancela su propia solicitud mientras no esté atendida (19 nov 2026).
@router.post('/{solicitud_id}/cancelar')
def cancelar(solicitud_id: UUID, cliente: Cliente, response: Response):
    return llamar(cliente, 'cancelar', {'id': str(solicitud_id)}, response)
