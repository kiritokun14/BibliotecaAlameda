"""T-055: revisión institucional y lectura de contenidos publicados."""
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from postgrest.exceptions import APIError
from pydantic import Field, StringConstraints, AwareDatetime

from Back.conexion import crear_cliente
from Back.contenidos import Cliente, Folio
from Back.registro import DatosBase

router = APIRouter(tags=['Publicación de contenidos (T-055)'])
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
Observacion = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Tipo = Literal['noticia', 'resena', 'acerca', 'memoria']


def ejecutar_revision(cliente, operacion, datos):
    try:
        return cliente.rpc('revision_contenidos', {'operacion': operacion, 'datos': datos}).execute().data
    except APIError as error:
        estados = {'42501': (403, 'No tienes permiso para revisar y publicar contenidos.'),
                   'P0002': (404, 'No se encontró el contenido enviado.'),
                   '55000': (409, 'El estado del contenido ya no permite esa decisión.'),
                   '40001': (409, 'El contenido cambió. Recarga y revisa antes de decidir.'),
                   '23514': (422, 'Faltan la autorización, el motivo o los campos del contenido.'),
                   '22023': (422, 'Revisa los datos enviados.'), '22P02': (422, 'Revisa los datos enviados.')}
        codigo, mensaje = estados.get(error.code, (503, 'No fue posible completar la revisión.'))
        raise HTTPException(codigo, mensaje) from None
    except Exception:
        raise HTTPException(503, 'No fue posible completar la revisión.') from None


class VersionContenido(DatosBase):
    actualizadoEn: AwareDatetime


class Publicacion(VersionContenido):
    referencia: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    nota: Texto | None = None


class Observaciones(VersionContenido):
    observaciones: list[Observacion] = Field(min_length=1, max_length=20)
    nota: Texto | None = None


class Motivo(VersionContenido):
    nota: Texto


@router.get('/contenidos/revision')
def listar(cliente: Cliente, estado: Literal['en_revision', 'con_observaciones', 'publicado', 'rechazado', 'retirado', 'historial'] | None = None,
           busqueda: Annotated[str | None, Query(max_length=100)] = None,
           limite: int = Query(10, ge=1, le=50), desplazamiento: int = Query(0, ge=0, le=100000)):
    datos = {'limite': limite, 'desplazamiento': desplazamiento}
    if estado:
        datos['estado'] = estado
    if busqueda and busqueda.strip():
        datos['busqueda'] = busqueda.strip()
    return ejecutar_revision(cliente, 'listar', datos)


@router.get('/contenidos/revision/{folio}')
def detalle(folio: Folio, cliente: Cliente):
    return ejecutar_revision(cliente, 'obtener', {'folio': folio})


@router.get('/contenidos/editor/{folio}/historial')
def historial_propio(folio: Folio, cliente: Cliente):
    try:
        return cliente.rpc('historial_contenido_propio', {'folio_contenido': folio}).execute().data
    except APIError as error:
        codigo = {'42501': 403, 'P0002': 404}.get(error.code, 503)
        raise HTTPException(codigo, 'No fue posible consultar el contenido propio.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar el contenido propio.') from None


@router.post('/contenidos/revision/{folio}/publicar')
def publicar(folio: Folio, datos: Publicacion, cliente: Cliente):
    return ejecutar_revision(cliente, 'publicar', {'folio': folio, **datos.model_dump(mode='json', exclude_none=True)})


@router.post('/contenidos/revision/{folio}/observaciones')
def observar(folio: Folio, datos: Observaciones, cliente: Cliente):
    return ejecutar_revision(cliente, 'observaciones', {'folio': folio, **datos.model_dump(mode='json', exclude_none=True)})


@router.post('/contenidos/revision/{folio}/rechazar')
def rechazar(folio: Folio, datos: Motivo, cliente: Cliente):
    return ejecutar_revision(cliente, 'rechazar', {'folio': folio, **datos.model_dump(mode='json')})


@router.post('/contenidos/revision/{folio}/retirar')
def retirar(folio: Folio, datos: Motivo, cliente: Cliente):
    return ejecutar_revision(cliente, 'retirar', {'folio': folio, **datos.model_dump(mode='json')})


def consultar_publicados(tipo, identificador=None, limite=50, desplazamiento=0):
    try:
        return crear_cliente().rpc('contenidos_publicados', {'tipo_contenido': tipo,
            'identificador': identificador, 'limite': limite, 'desplazamiento': desplazamiento}).execute().data
    except Exception:
        raise HTTPException(503, 'No fue posible consultar el contenido público.') from None


@router.get('/contenidos/publicos')
def publicos(tipo: Tipo | None = None, limite: int = Query(50, ge=1, le=50), desplazamiento: int = Query(0, ge=0, le=100000)):
    return consultar_publicados(tipo, limite=limite, desplazamiento=desplazamiento)


@router.get('/contenidos/publicos/{identificador}')
def publico(identificador: Annotated[str, StringConstraints(pattern=r'^[a-zA-Z0-9_-]{1,150}$')], tipo: Tipo | None = None):
    filas = consultar_publicados(tipo, identificador)
    if not filas:
        raise HTTPException(404, 'Contenido no disponible.')
    return filas[0]
