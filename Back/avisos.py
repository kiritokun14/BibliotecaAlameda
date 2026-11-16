"""T-074: atención manual por WhatsApp; nunca envía mensajes automáticamente."""
from typing import Annotated, Literal
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Query, Response, HTTPException
from postgrest.exceptions import APIError
from pydantic import Field, StringConstraints
from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(prefix='/avisos/whatsapp', tags=['Avisos manuales (T-074)'])
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class NuevoAviso(DatosBase):
    id: UUID
    usuarioId: UUID
    titulo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
    cuerpoAviso: Texto
    tipoAviso: Literal['atencion', 'comunidad', 'actividad']


class ResultadoAviso(DatosBase):
    version: int = Field(ge=1, strict=True)
    estadoEnvio: Literal['pendiente', 'enviado', 'entregado', 'fallido']
    nota: Texto


def llamar(cliente, operacion, datos, respuesta):
    respuesta.headers['Cache-Control'] = 'private, no-store'
    try:
        return cliente.rpc('avisos_whatsapp', {'operacion': operacion, 'datos': datos}).execute().data
    except APIError as error:
        codigo, mensaje = {
            '42501': (403, 'No tienes permiso para enviar avisos o tu sesión no está vigente.'),
            'P0002': (404, 'No se encontró el aviso o destinatario.'),
            '23505': (409, 'Ese aviso ya fue registrado. Recarga la bandeja.'),
            '40001': (409, 'El aviso cambió. Recarga antes de continuar.'),
            '55000': (409, 'El estado o las preferencias actuales no permiten esta operación.'),
            '23514': (422, 'Revisa el teléfono, el mensaje y la nota del resultado.'),
            '22023': (422, 'Revisa los campos enviados.'),
            '22P02': (422, 'Revisa los campos enviados.'),
        }.get(error.code, (503, 'No fue posible completar la atención del aviso.'))
        raise HTTPException(codigo, mensaje) from None
    except Exception:
        raise HTTPException(503, 'No fue posible completar la atención del aviso.') from None


@router.get('/destinatarios')
def destinatarios(cliente: Cliente, response: Response, busqueda: str = Query(min_length=3, max_length=100)):
    return llamar(cliente, 'destinatarios', {'busqueda': busqueda.strip()}, response)


@router.get('')
def listar(cliente: Cliente, response: Response, desplazamiento: int = Query(0, ge=0, le=100000)):
    return llamar(cliente, 'listar', {'desplazamiento': desplazamiento}, response)


@router.post('', status_code=201)
def crear(datos: NuevoAviso, cliente: Cliente, response: Response):
    return llamar(cliente, 'crear', datos.model_dump(mode='json'), response)


@router.get('/{aviso_id}/preparar')
def preparar(aviso_id: UUID, cliente: Cliente, response: Response):
    aviso = llamar(cliente, 'preparar', {'id': str(aviso_id)}, response)
    texto = aviso['titulo'] + '\n\n' + aviso['cuerpoAviso']
    return {'enlace': 'https://wa.me/' + aviso['telefono'] + '?text=' + quote(texto, safe='')}


@router.patch('/{aviso_id}')
def resultado(aviso_id: UUID, datos: ResultadoAviso, cliente: Cliente, response: Response):
    return llamar(cliente, 'resultado', {'id': str(aviso_id), **datos.model_dump(mode='json')}, response)
