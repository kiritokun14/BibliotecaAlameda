"""T-056: consulta de reseñas y memoria mediante la proyección pública autorizada."""
from collections.abc import Iterator
from datetime import datetime
from heapq import merge
from itertools import islice
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Path, Query

from Back.publicacion import consultar_publicados

router = APIRouter(prefix='/public', tags=['Lecturas públicas'])

TIPOS_LECTURA = ('resena', 'memoria')
TAMANO_LOTE = 50
LIMITE_VENTANA = 1000

FiltroTexto = Annotated[str | None, Query(max_length=100)]
Pagina = Annotated[int, Query(ge=1)]
Limite = Annotated[int, Query(ge=1, le=100)]
Lectura = dict[str, Any]


def _coincidencias(tipo: str, autor: str, tema: str, busqueda: str) -> Iterator[Lectura]:
    for desplazamiento in range(0, LIMITE_VENTANA, TAMANO_LOTE):
        lote = consultar_publicados(tipo, limite=TAMANO_LOTE, desplazamiento=desplazamiento)
        for lectura in lote:
            if lectura['tipo'] != tipo:
                continue
            datos = lectura.get('datos') or {}
            if autor and autor not in str(datos.get('autoria') or '').casefold():
                continue
            if tema and tema not in str(datos.get('tema') or datos.get('genero') or '').casefold():
                continue
            if busqueda:
                texto = ' '.join(lectura.get(campo) or '' for campo in ('titulo', 'resumen', 'cuerpo'))
                if busqueda not in texto.casefold():
                    continue
            yield lectura
        if len(lote) < TAMANO_LOTE:
            break


def _orden_publicacion(lectura: Lectura) -> tuple[float, str]:
    # Reproduce el orden de la base: fecha descendente y folio ascendente.
    fecha = datetime.fromisoformat(lectura['publicadoEn'].replace('Z', '+00:00'))
    return -fecha.timestamp(), lectura['folio']


def _listar(
    autor: str | None,
    tema: str | None,
    tipo: str | None,
    busqueda: str | None,
    page: int,
    limit: int,
):
    if tipo not in (None, 'contenido', *TIPOS_LECTURA):
        raise HTTPException(400, 'tipoRecurso debe ser contenido, resena o memoria.')
    inicio = (page - 1) * limit
    fin = inicio + limit
    if fin > LIMITE_VENTANA:
        raise HTTPException(400, 'La ventana de consulta no puede superar 1000 elementos.')

    filtros = tuple((valor or '').strip().casefold() for valor in (autor, tema, busqueda))
    if tipo in TIPOS_LECTURA:
        lecturas = _coincidencias(tipo, *filtros)
    else:
        lecturas = merge(
            *(_coincidencias(categoria, *filtros) for categoria in TIPOS_LECTURA),
            key=_orden_publicacion,
        )
    return {'items': list(islice(lecturas, inicio, fin)), 'page': page, 'limit': limit}


@router.get('/lecturas-y-resenas')
def listar_lecturas_resenas_memoria(
    autor: FiltroTexto = None,
    tema: FiltroTexto = None,
    tipo_recurso: Annotated[str | None, Query(alias='tipoRecurso')] = None,
    busqueda: FiltroTexto = None,
    page: Pagina = 1,
    limit: Limite = 20,
):
    return _listar(autor, tema, tipo_recurso, busqueda, page, limit)


@router.get('/lecturas/{slug}')
def obtener_lectura_publica(slug: Annotated[str, Path(pattern=r'^[a-zA-Z0-9_-]{1,150}$')]):
    for lectura in consultar_publicados(None, slug):
        if lectura['tipo'] in TIPOS_LECTURA:
            return lectura
    raise HTTPException(404, 'La lectura no existe o no está publicada.')


@router.get('/memoria-publica')
def listar_memoria_publica(
    tema: FiltroTexto = None,
    busqueda: FiltroTexto = None,
    page: Pagina = 1,
    limit: Limite = 20,
):
    return _listar(None, tema, 'memoria', busqueda, page, limit)
