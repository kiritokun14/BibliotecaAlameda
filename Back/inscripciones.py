"""HU-19 / T-097: consultas mínimas y confirmación atómica mediante RPC."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response
from postgrest.exceptions import APIError
from pydantic import StringConstraints

from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(tags=['Inscripciones'])


class Confirmacion(DatosBase):
    motivo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


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
        raise HTTPException(codigo, mensaje) from None
    except Exception:
        raise HTTPException(500, 'No fue posible completar la operación.') from None


@router.get('/responsable/actividades')
def actividades(cliente: Cliente, response: Response,
                limite: int = Query(20, ge=1, le=100), desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, response, 'actividades', limite=limite, desplazamiento=desplazamiento)


@router.get('/sesiones/{sesion_id}/inscripciones')
def solicitudes(sesion_id: UUID, cliente: Cliente, response: Response,
                limite: int = Query(20, ge=1, le=100), desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, response, 'listar', sesionId=str(sesion_id), limite=limite, desplazamiento=desplazamiento)


@router.get('/sesiones/{sesion_id}/cupos')
def cupos(sesion_id: UUID, cliente: Cliente, response: Response):
    return ejecutar(cliente, response, 'cupos', sesionId=str(sesion_id))


@router.patch('/inscripciones/{inscripcion_id}/confirmar')
def confirmar(inscripcion_id: UUID, datos: Confirmacion, cliente: Cliente, response: Response):
    return ejecutar(cliente, response, 'confirmar', inscripcionId=str(inscripcion_id), motivo=datos.motivo)
