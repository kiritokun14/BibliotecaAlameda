"""HU-19 / T-097: consultas mínimas y confirmación atómica mediante RPC."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response
from postgrest.exceptions import APIError
from pydantic import AwareDatetime, BaseModel, StringConstraints

from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(tags=['Inscripciones'])


class Confirmacion(DatosBase):
    motivo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class Inscrito(BaseModel):
    """Lista mínima: nunca serializar contacto ni documentos de la RPC."""
    id: str
    usuarioId: str
    nombre: str
    status: str
    creadoA: str


class ConteosInscripciones(BaseModel):
    sesionId: str
    pendientes: int
    confirmados: int
    rechazados: int
    cancelados: int


def ejecutar(cliente, response, operacion, **datos):
    response.headers['Cache-Control'] = 'private, no-store'
    try:
        return cliente.rpc('gestionar_inscripciones', {
            'operacion': operacion, 'datos': datos,
        }).execute().data
    except APIError as error:
        codigo, mensaje = {
            '28000': (401, 'Se requiere una sesión válida.'),
            '42501': (403, 'No tienes permiso para gestionar esta sesión.'),
            'P0002': (404, 'No se encontró la inscripción o sesión.'),
            '55000': (409, 'La inscripción o sesión no permite confirmar.'),
            '23505': (409, 'La inscripción ya existe.'),
            '23514': (409, 'No hay cupo o no se cumplen las condiciones de inscripción.'),
            '40001': (409, 'La inscripción cambió. Consulta nuevamente.'),
            '22023': (400, 'Solicitud inválida.'),
            '22P02': (400, 'Solicitud inválida.'),
        }.get(error.code, (500, 'No fue posible completar la operación.'))
        raise HTTPException(codigo, mensaje, headers={'Cache-Control': 'private, no-store'}) from None
    except Exception:
        raise HTTPException(500, 'No fue posible completar la operación.',
                            headers={'Cache-Control': 'private, no-store'}) from None


@router.get('/responsable/actividades')
def actividades(cliente: Cliente, response: Response,
                limite: int = Query(20, ge=1, le=100), desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, response, 'actividades', limite=limite, desplazamiento=desplazamiento)


@router.get('/sesiones/{sesion_id}/inscripciones', response_model=list[Inscrito])
def solicitudes(sesion_id: UUID, cliente: Cliente, response: Response,
                limite: int = Query(20, ge=1, le=100), desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, response, 'listar', sesionId=str(sesion_id), limite=limite, desplazamiento=desplazamiento)


@router.get('/sesiones/{sesion_id}/cupos')
def cupos(sesion_id: UUID, cliente: Cliente, response: Response):
    return ejecutar(cliente, response, 'cupos', sesionId=str(sesion_id))


@router.get('/sesiones/{sesion_id}/inscripciones/conteos', response_model=ConteosInscripciones)
def conteos(sesion_id: UUID, cliente: Cliente, response: Response):
    """Solo cifras para responsables y creadores/proponentes autorizados por la BD."""
    return ejecutar(cliente, response, 'conteos', sesionId=str(sesion_id))


@router.patch('/inscripciones/{inscripcion_id}/confirmar')
def confirmar(inscripcion_id: UUID, datos: Confirmacion, cliente: Cliente, response: Response):
    return ejecutar(cliente, response, 'confirmar', inscripcionId=str(inscripcion_id), motivo=datos.motivo)


@router.patch('/inscripciones/{inscripcion_id}/rechazar')
def rechazar(inscripcion_id: UUID, datos: Confirmacion, cliente: Cliente, response: Response):
    return ejecutar(cliente, response, 'rechazar', inscripcionId=str(inscripcion_id), motivo=datos.motivo)


@router.patch('/inscripciones/{inscripcion_id}/cancelar')
def cancelar(inscripcion_id: UUID, datos: Confirmacion, cliente: Cliente, response: Response):
    return ejecutar(cliente, response, 'cancelar', inscripcionId=str(inscripcion_id), motivo=datos.motivo)


class VersionInscripcion(DatosBase):
    actualizadoA: AwareDatetime


def ejecutar_propia(cliente, respuesta, funcion, datos):
    respuesta.headers['Cache-Control'] = 'private, no-store'
    try:
        return cliente.rpc(funcion, datos).execute().data
    except APIError as error:
        estado, mensaje = {
            '42501': (403, 'Tu sesión ya no está vigente o la cuenta está inactiva.'),
            'P0002': (404, 'No se encontró la sesión o tu inscripción.'),
            '55000': (409, 'El estado o el horario de esta sesión ya no permite la operación.'),
            '23514': (409, 'La sesión ya no tiene cupo disponible.'),
            '40001': (409, 'Tu inscripción cambió. Consulta de nuevo su estado.'),
            '22023': (422, 'Revisa la solicitud.'),
        }.get(error.code, (503, 'No fue posible consultar o gestionar tu inscripción.'))
        raise HTTPException(estado, mensaje, headers={'Cache-Control': 'private, no-store'}) from None
    except Exception:
        raise HTTPException(503, 'El servicio de inscripciones no está disponible.',
                            headers={'Cache-Control': 'private, no-store'}) from None


@router.get('/sesiones/{sesion_id}/mi-inscripcion')
def consultar_propia(sesion_id: UUID, cliente: Cliente, respuesta: Response):
    return ejecutar_propia(cliente, respuesta, 'inscripcion_propia', {
        'operacion': 'consultar', 'sesion': str(sesion_id),
    })


@router.post('/sesiones/{sesion_id}/mi-inscripcion')
def solicitar_propia(sesion_id: UUID, cliente: Cliente, respuesta: Response):
    return ejecutar_propia(cliente, respuesta, 'inscripcion_propia', {
        'operacion': 'solicitar', 'sesion': str(sesion_id),
    })


@router.patch('/sesiones/{sesion_id}/mi-inscripcion/cancelar')
def cancelar_propia(sesion_id: UUID, datos: VersionInscripcion, cliente: Cliente, respuesta: Response):
    return ejecutar_propia(cliente, respuesta, 'inscripcion_propia', {
        'operacion': 'cancelar', 'sesion': str(sesion_id),
        'version': datos.model_dump(mode='json')['actualizadoA'],
    })


@router.get('/mis-inscripciones')
def listar_propias(cliente: Cliente, respuesta: Response, pagina: int = Query(0, ge=0, le=5000)):
    return ejecutar_propia(cliente, respuesta, 'mis_inscripciones', {'pagina': pagina})
