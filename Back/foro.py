"""HU-26: lectura pública, participación propia y revisión de primeras respuestas."""
from typing import Annotated, Literal
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Response
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import StringConstraints
from Back.conexion import crear_cliente
from Back.contenidos import Cliente, seguridad, sesion_editor
from Back.foro_moderacion import ejecutar
from Back.registro import DatosBase

router = APIRouter(prefix='/foro', tags=['Club Alameda'])
Tipo = Literal['tema', 'comentario']
Version = Annotated[str, StringConstraints(pattern=r'^[a-f0-9]{32}$')]
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


def cliente_lectura(credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(seguridad)]):
    return sesion_editor(credenciales) if credenciales is not None else crear_cliente()


Lectura = Annotated[object, Depends(cliente_lectura)]


class RespuestaNueva(DatosBase):
    id: UUID
    texto: Texto


class TemaNuevo(DatosBase):
    id: UUID
    titulo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
    texto: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class Retiro(DatosBase):
    version: Version


class RespuestaEditada(Retiro):
    texto: Texto


class TemaEditado(TemaNuevo):
    version: Version


class RevisionForo(Retiro):
    medida: Literal['publicar', 'rechazar']
    motivo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


@router.get('/temas')
def temas(cliente: Lectura, response: Response, desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, 'temas', {'desplazamiento': desplazamiento}, response, 'foro_lectura')


@router.post('/temas', status_code=201)
def nuevo_tema(datos: TemaNuevo, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'crear', {'tipo': 'tema', **datos.model_dump(mode='json')}, response, 'foro_participacion')


@router.get('/temas/{tema_id}')
def tema(tema_id: UUID, cliente: Lectura, response: Response):
    return ejecutar(cliente, 'tema', {'temaId': str(tema_id)}, response, 'foro_lectura')


@router.get('/temas/{tema_id}/respuestas')
def respuestas(tema_id: UUID, cliente: Lectura, response: Response, desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, 'respuestas', {'temaId': str(tema_id), 'desplazamiento': desplazamiento}, response, 'foro_lectura')


@router.post('/temas/{tema_id}/respuestas', status_code=201)
def responder(tema_id: UUID, datos: RespuestaNueva, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'crear', {'tipo': 'comentario', 'temaId': str(tema_id), **datos.model_dump(mode='json')}, response, 'foro_participacion')


@router.patch('/respuestas/{comentario_id}')
def editar(comentario_id: UUID, datos: RespuestaEditada, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'editar', {'tipo': 'comentario', 'id': str(comentario_id), **datos.model_dump(mode='json')}, response, 'foro_participacion')


@router.delete('/respuestas/{comentario_id}')
def retirar(comentario_id: UUID, datos: Retiro, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'retirar', {'tipo': 'comentario', 'id': str(comentario_id), **datos.model_dump()}, response, 'foro_participacion')


@router.patch('/temas/{tema_id}')
def editar_tema(tema_id: UUID, datos: TemaEditado, cliente: Cliente, response: Response):
    if datos.id != tema_id:
        from fastapi import HTTPException
        raise HTTPException(422, 'El identificador no corresponde al tema.')
    return ejecutar(cliente, 'editar', {'tipo': 'tema', **datos.model_dump(mode='json')}, response, 'foro_participacion')


@router.delete('/temas/{tema_id}')
def retirar_tema(tema_id: UUID, datos: Retiro, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'retirar', {'tipo': 'tema', 'id': str(tema_id), **datos.model_dump()}, response, 'foro_participacion')


@router.get('/moderacion/pendientes')
def pendientes(cliente: Cliente, response: Response, desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, 'pendientes', {'desplazamiento': desplazamiento}, response, 'foro_participacion')


@router.patch('/moderacion/pendientes/{tipo}/{contenido_id}')
def revisar(tipo: Tipo, contenido_id: UUID, datos: RevisionForo, cliente: Cliente, response: Response):
    return ejecutar(cliente, 'revisar', {'tipo': tipo, 'id': str(contenido_id), **datos.model_dump()}, response, 'foro_participacion')
