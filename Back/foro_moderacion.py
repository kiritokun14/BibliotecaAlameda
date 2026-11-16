"""T-078 / HU-27. Reportes y medidas de moderación; no publica temas (T-077)."""
from typing import Annotated, Literal
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Response
from postgrest.exceptions import APIError
from pydantic import AwareDatetime, StringConstraints
from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(prefix='/foro', tags=['Reportes y moderación (T-078)'])
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class NuevoReporte(DatosBase):
    tipoContenido: Literal['tema', 'comentario']
    contenidoId: UUID
    motivo: Motivo


class MedidaModeracion(DatosBase):
    actualizadoEn: AwareDatetime
    versionContenido: Annotated[str, StringConstraints(pattern=r'^[a-f0-9]{32}$')]
    medida: Literal['revisar', 'ocultar', 'retirar', 'descartar']
    motivo: Motivo


def ejecutar(cliente, operacion, datos, respuesta, funcion='foro_moderacion'):
    respuesta.headers['Cache-Control'] = 'private, no-store'
    try:
        return cliente.rpc(funcion, {'operacion': operacion, 'datos': datos}).execute().data
    except APIError as error:
        estado, mensaje = {
            '42501': (403, 'No tienes permiso sobre este reporte o tu sesión ya no está vigente.'),
            'P0002': (404, 'No se encontró el reporte o el contenido disponible.'),
            '23505': (409, 'Ya tienes un reporte abierto sobre este contenido.'),
            '40001': (409, 'El reporte o el contenido cambió. Recarga antes de resolverlo.'),
            '55000': (409, 'El estado actual no permite esta medida.'),
            '23514': (422, 'Escribe un motivo válido para el reporte o la medida.'),
            '22023': (422, 'Revisa los campos enviados.'),
            '22P02': (422, 'Revisa los campos enviados.'),
        }.get(error.code, (503, 'No fue posible completar la operación del foro.'))
        raise HTTPException(estado, mensaje) from None
    except Exception:
        raise HTTPException(503, 'No fue posible completar la operación del foro.') from None


@router.post('/reportes', status_code=201)
def reportar(datos: NuevoReporte, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'reportar', datos.model_dump(mode='json'), response)


@router.get('/reportes/me')
def propios(cliente: Cliente, response: Response, desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, 'propios', {'desplazamiento': desplazamiento}, response)


@router.get('/moderacion/reportes')
def listar(cliente: Cliente, response: Response, estado: Literal['pendiente', 'en_revision', 'resuelto', 'descartado'] | None = None,
           desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, 'listar', {'estado': estado, 'desplazamiento': desplazamiento}, response)


@router.get('/moderacion/reportes/{reporte_id}')
def obtener(reporte_id: UUID, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'obtener', {'id': str(reporte_id)}, response)


@router.patch('/moderacion/reportes/{reporte_id}')
def resolver(reporte_id: UUID, datos: MedidaModeracion, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'resolver', {'id': str(reporte_id), **datos.model_dump(mode='json')}, response)
