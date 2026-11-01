"""Consultas públicas de lecturas, reseñas, memoria y archivos autorizados."""

import os
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from postgrest.exceptions import APIError
from supabase import Client
from storage3.exceptions import StorageApiError

from Back.conexion import crear_cliente, crear_cliente_servicio

router = APIRouter(prefix='/api/public', tags=['Consulta pública de lecturas, reseñas y memoria'])

RECURSOS = {'contenido', 'resena', 'memoria'}
LIMITE_URL_FIRMADA_SEGUNDOS = 300
MAX_FILAS_CANDIDATAS = 1000


def _cliente_publico() -> Client:
    try:
        # Se usa la clave publicable, sin reenviar JWT ni usar service_role:
        # las políticas RLS aplican también a las peticiones anónimas.
        return crear_cliente()
    except Exception:
        raise HTTPException(503, 'El servicio de consulta pública no está disponible.') from None


def _ejecutar(consulta: Any) -> list[dict[str, Any]]:
    try:
        resultado = consulta.execute()
    except APIError as error:
        if error.code == '42501':
            raise HTTPException(403, 'No tienes autorización para consultar este recurso.') from None
        raise HTTPException(503, 'No fue posible consultar el contenido público.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar el contenido público.') from None

    if not isinstance(resultado.data, list):
        raise HTTPException(503, 'La base de datos devolvió una respuesta inválida.')
    return resultado.data


def _validar_paginacion(page: str, limit: str) -> tuple[int, int, int]:
    # Mantener límites acotados evita consultas costosas y ventanas enormes.
    try:
        pagina = int(page)
        limite = int(limit)
    except (TypeError, ValueError):
        raise HTTPException(400, 'page y limit deben ser números enteros.') from None
    if pagina < 1 or pagina > 10000 or limite < 1 or limite > 100:
        raise HTTPException(400, 'page debe estar entre 1 y 10000 y limit entre 1 y 100.')
    desplazamiento = (pagina - 1) * limite
    if desplazamiento + limite > MAX_FILAS_CANDIDATAS:
        raise HTTPException(400, 'La ventana de paginación no puede superar 1000 elementos.')
    return pagina, limite, desplazamiento


def _validar_tipo_recurso(tipo_recurso: str | None) -> None:
    if tipo_recurso is not None and tipo_recurso not in RECURSOS:
        raise HTTPException(400, 'tipoRecurso debe ser contenido, resena o memoria.')


def _patron_busqueda(busqueda: str) -> str:
    # La expresión OR de PostgREST usa comas y comillas como sintaxis; citar y
    # escapar el valor impide que la búsqueda altere la consulta.
    literal = busqueda.replace('\\', '\\\\').replace('"', '\\"')
    return f'"%{literal}%"'


def _buscar_contenidos(cliente: Client, autor: str | None, tema: str | None,
                       busqueda: str | None, cantidad: int) -> list[dict[str, Any]]:
    # La consulta parte de contenido publicado; los filtros opcionales solo la restringen.
    consulta = (cliente.table('Contenido')
                .select('id,slug,titulo,tipo,cuerpo,autorOriginal,creadoEn')
                .eq('estado', 'publicado'))
    if autor:
        consulta = consulta.ilike('autorOriginal', f'%{autor}%')
    if tema:
        consulta = consulta.eq('tipo', tema)
    if busqueda:
        patron = _patron_busqueda(busqueda)
        consulta = consulta.or_(f'titulo.ilike.{patron},cuerpo.ilike.{patron}')
    consulta = (consulta.order('creadoEn', desc=True).order('id', desc=True)
                .range(0, cantidad - 1))
    return [
        {'tipoRecurso': 'contenido', **fila}
        for fila in _ejecutar(consulta)
    ]


def _consulta_resenas(cliente: Client, autor: str | None, tema: str | None,
                      cantidad: int, campo: str | None = None,
                      patron: str | None = None) -> list[dict[str, Any]]:
    # La relación interna obliga a que la reseña pertenezca a una lectura publicada.
    consulta = (cliente.table('resena')
                .select('resenaId,contenidoId,cuerpoResena,creadoEn,'
                        'Contenido!inner(id,slug,titulo,tipo,autorOriginal)')
                .eq('estado', 'publicada')
                .eq('Contenido.estado', 'publicado'))
    if autor:
        consulta = consulta.ilike('Contenido.autorOriginal', f'%{autor}%')
    if tema:
        consulta = consulta.eq('Contenido.tipo', tema)
    if campo == 'cuerpoResena' and patron is not None:
        consulta = consulta.ilike(campo, patron)
    elif campo == 'Contenido.titulo' and patron is not None:
        consulta = consulta.ilike(campo, patron)
    consulta = (consulta.order('creadoEn', desc=True).order('resenaId', desc=True)
                .range(0, cantidad - 1))
    return _ejecutar(consulta)


def _buscar_resenas(cliente: Client, autor: str | None, tema: str | None,
                    busqueda: str | None, cantidad: int) -> list[dict[str, Any]]:
    if not busqueda:
        filas = _consulta_resenas(cliente, autor, tema, cantidad)
    else:
        # La búsqueda puede coincidir con el cuerpo de reseña o con el título relacionado.
        patron = f'%{busqueda}%'
        por_cuerpo = _consulta_resenas(
            cliente, autor, tema, cantidad, 'cuerpoResena', patron,
        )
        por_titulo = _consulta_resenas(
            cliente, autor, tema, cantidad, 'Contenido.titulo', patron,
        )
        # Combinar ambos resultados sin duplicar reseñas que coincidan en los dos campos.
        unicas = {fila['resenaId']: fila for fila in por_cuerpo + por_titulo}
        filas = list(unicas.values())

    salida = []
    for fila in filas:
        # PostgREST puede entregar una relación como objeto o como lista de un elemento.
        contenido = fila.get('Contenido')
        if isinstance(contenido, list):
            contenido = contenido[0] if contenido else {}
        if not isinstance(contenido, dict):
            raise HTTPException(503, 'La base de datos devolvió una reseña incompleta.')
        salida.append({
            'tipoRecurso': 'resena',
            'id': fila['resenaId'],
            'contenidoId': fila['contenidoId'],
            'titulo': contenido.get('titulo'),
            'slug': contenido.get('slug'),
            'tipo': contenido.get('tipo'),
            'autorOriginal': contenido.get('autorOriginal'),
            'cuerpo': fila['cuerpoResena'],
            'creadoEn': fila['creadoEn'],
        })
    return salida


def _buscar_memorias(cliente: Client, tema: str | None, busqueda: str | None,
                     cantidad: int) -> list[dict[str, Any]]:
    # Una evidencia es pública solo si además cuenta con autorización registrada.
    consulta = (cliente.table('evidenciaActividad')
                .select('id,tipoArchivo,descripcion,creadaEn')
                .eq('visibilidad', 'publica')
                .not_.is_('autorizadaEn', 'null'))
    if tema:
        consulta = consulta.eq('tipoArchivo', tema)
    if busqueda:
        consulta = consulta.ilike('descripcion', f'%{busqueda}%')
    consulta = (consulta.order('creadaEn', desc=True).order('id', desc=True)
                .range(0, cantidad - 1))
    return [
        {'tipoRecurso': 'memoria', **fila, 'creadoEn': fila['creadaEn']}
        for fila in _ejecutar(consulta)
    ]


def _ordenar_y_paginar(filas: list[dict[str, Any]], pagina: int,
                       limite: int, desplazamiento: int) -> dict[str, Any]:
    try:
        # Orden estable entre tipos de recurso antes de tomar la página solicitada.
        filas.sort(
            key=lambda fila: (
                datetime.fromisoformat(fila['creadoEn'].replace('Z', '+00:00')).timestamp(),
                str(fila['id']),
                fila['tipoRecurso'],
            ),
            reverse=True,
        )
    except (AttributeError, KeyError, TypeError, ValueError):
        raise HTTPException(503, 'La base de datos devolvió contenido inválido.') from None
    return {
        'items': filas[desplazamiento:desplazamiento + limite],
        'page': pagina,
        'limit': limite,
    }


@router.get(
    '/lecturas-y-resenas',
    summary='Consultar lecturas, reseñas y memoria pública',
    description=(
        'Acceso anónimo; '
        'solo devuelve contenidos publicados, reseñas publicadas de contenidos '
        'publicados y evidencias públicas autorizadas. Esta consulta no registra '
        'progreso ni asistencia.'
    ),
)
def listar_lecturas_resenas_memoria(
    autor: str | None = Query(None, max_length=100),
    tema: str | None = Query(None, max_length=100),
    tipo_recurso: str | None = Query(None, alias='tipoRecurso'),
    busqueda: str | None = Query(None, max_length=100),
    page: str = Query('1'),
    limit: str = Query('20'),
):
    _validar_tipo_recurso(tipo_recurso)
    pagina, limite, desplazamiento = _validar_paginacion(page, limit)
    cantidad = desplazamiento + limite
    cliente = _cliente_publico()
    filas: list[dict[str, Any]] = []

    if tipo_recurso in (None, 'contenido'):
        filas.extend(_buscar_contenidos(cliente, autor, tema, busqueda, cantidad))
    if tipo_recurso in (None, 'resena'):
        filas.extend(_buscar_resenas(cliente, autor, tema, busqueda, cantidad))
    if tipo_recurso in (None, 'memoria') and autor is None:
        # La tabla de evidencias no declara autorOriginal; no inferimos autoría
        # desde el usuario que cargó el archivo.
        filas.extend(_buscar_memorias(cliente, tema, busqueda, cantidad))
    return _ordenar_y_paginar(filas, pagina, limite, desplazamiento)


@router.get(
    '/lecturas/{slug}',
    summary='Consultar el detalle de una lectura publicada',
    description=(
        'El detalle incluye '
        'reseñas publicadas y adjuntos del contenido publicado. No genera logros, '
        'progreso ni asistencia.'
    ),
)
def obtener_lectura_publica(slug: str):
    cliente = _cliente_publico()
    filas = _ejecutar(
        cliente.table('Contenido')
        .select('id,slug,titulo,tipo,cuerpo,autorOriginal,creadoEn,publicadoEn')
        .eq('slug', slug)
        .eq('estado', 'publicado')
        .limit(1)
    )
    if not filas:
        raise HTTPException(404, 'La lectura no existe o no está publicada.')
    contenido = filas[0]

    resenas = _ejecutar(
        cliente.table('resena')
        .select('resenaId,contenidoId,cuerpoResena,creadoEn')
        .eq('contenidoId', contenido['id'])
        .eq('estado', 'publicada')
        .order('creadoEn', desc=True)
    )
    adjuntos = _ejecutar(
        cliente.table('adjuntoContenido')
        .select('id,urlArchivo,tipoArchivo,subidoEn')
        .eq('contenidoId', contenido['id'])
        .order('subidoEn', desc=True)
    )
    # Estas operaciones solo consultan datos; no registran progreso ni asistencia.
    return {**contenido, 'resenas': resenas, 'adjuntos': adjuntos}


@router.get(
    '/memoria-publica',
    summary='Consultar evidencias autorizadas de memoria pública',
    description=(
        'Lista únicamente '
        'evidencias visibilidad=publica con autorizadaEn no nula. Sin escrituras '
        'de progreso o asistencia.'
    ),
)
def listar_memoria_publica(
    tema: str | None = Query(None, max_length=100),
    busqueda: str | None = Query(None, max_length=100),
    page: str = Query('1'),
    limit: str = Query('20'),
):
    pagina, limite, desplazamiento = _validar_paginacion(page, limit)
    cantidad = desplazamiento + limite
    filas = _buscar_memorias(_cliente_publico(), tema, busqueda, cantidad)
    return _ordenar_y_paginar(filas, pagina, limite, desplazamiento)


@router.get(
    '/archivos/descargar',
    summary='Obtener URL autorizada de un archivo público',
    description=(
        'Para adjuntos requiere '
        'un contenido publicado; para evidencias requiere autorización y visibilidad '
        'pública. Evidencias privadas/no autorizadas se presentan como 404 para no '
        'revelar su existencia. No registra logros, progreso ni asistencia.'
    ),
)
def obtener_url_archivo(
    tipo_recurso: str = Query(..., alias='tipoRecurso'),
    recurso_id: str = Query(..., alias='id'),
):
    if tipo_recurso not in ('adjunto', 'evidencia'):
        raise HTTPException(400, 'tipoRecurso debe ser adjunto o evidencia.')
    try:
        recurso_id = str(UUID(recurso_id))
    except ValueError:
        raise HTTPException(400, 'id debe ser un UUID válido.') from None
    cliente = _cliente_publico()

    if tipo_recurso == 'adjunto':
        # El join y el filtro impiden entregar adjuntos de lecturas no publicadas.
        filas = _ejecutar(
            cliente.table('adjuntoContenido')
            .select('id,urlArchivo,tipoArchivo,Contenido!inner(estado)')
            .eq('id', recurso_id)
            .eq('Contenido.estado', 'publicado')
            .limit(1)
        )
        if not filas:
            raise HTTPException(404, 'El archivo no existe o su contenido no está publicado.')
        url = filas[0].get('urlArchivo')
        if not isinstance(url, str) or not url.startswith(('https://', 'http://')):
            raise HTTPException(404, 'El archivo no está disponible.')
        return {
            'tipoRecurso': 'adjunto',
            'id': filas[0]['id'],
            'tipoArchivo': filas[0]['tipoArchivo'],
            'url': url,
        }

    filas = _ejecutar(
        # No se firma ni revela una ruta hasta comprobar visibilidad y autorización.
        cliente.table('evidenciaActividad')
        .select('id,rutaArchivo,tipoArchivo,visibilidad,autorizadaEn')
        .eq('id', recurso_id)
        .eq('visibilidad', 'publica')
        .not_.is_('autorizadaEn', 'null')
        .limit(1)
    )
    if not filas:
        raise HTTPException(404, 'La evidencia no existe, es privada o no está autorizada.')

    bucket = os.getenv('SUPABASE_EVIDENCIAS_BUCKET', '').strip()
    if not bucket:
        raise HTTPException(503, 'No está configurado el almacenamiento de evidencias públicas.')
    ruta = filas[0].get('rutaArchivo')
    if not isinstance(ruta, str) or not ruta.strip():
        raise HTTPException(404, 'El archivo no está disponible.')
    try:
        # RLS valida la fila con el cliente público; la clave de servicio solo
        # firma la ruta de Storage previamente autorizada.
        almacenamiento = crear_cliente_servicio()
        firmado = almacenamiento.storage.from_(bucket).create_signed_url(
            ruta, LIMITE_URL_FIRMADA_SEGUNDOS,
        )
    except StorageApiError as error:
        if str(error.status) in ('400', '404') or error.code in ('NoSuchKey', 'ObjectNotFound'):
            raise HTTPException(404, 'El archivo no está disponible.') from None
        if str(error.status) == '403':
            raise HTTPException(403, 'No tienes autorización para descargar este archivo.') from None
        raise HTTPException(503, 'No fue posible generar el acceso temporal al archivo.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible generar el acceso temporal al archivo.') from None

    url = firmado.get('signedURL') if isinstance(firmado, dict) else getattr(firmado, 'signedURL', None)
    if not isinstance(url, str) or not url:
        raise HTTPException(503, 'No fue posible generar el acceso temporal al archivo.')
    return {
        'tipoRecurso': 'evidencia',
        'id': filas[0]['id'],
        'tipoArchivo': filas[0]['tipoArchivo'],
        'url': url,
        'expiraEnSegundos': LIMITE_URL_FIRMADA_SEGUNDOS,
    }