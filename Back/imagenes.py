"""Imágenes privadas de contenidos, con autorización antes de acceder a Storage."""
from io import BytesIO
from uuid import uuid4
import warnings

from fastapi import APIRouter, HTTPException, Request, Response
from postgrest.exceptions import APIError
from PIL import Image, ImageOps, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from Back.conexion import crear_cliente, crear_cliente_servicio
from Back.contenidos import Cliente, Folio

router = APIRouter(tags=['Imágenes de contenidos'])
BUCKET = 'imagenes-contenidos'
MAXIMO = 5 * 1024 * 1024


def operacion_imagen(cliente, folio, accion='leer', **datos):
    try:
        return cliente.rpc('imagen_contenido', {'folio_contenido': folio, 'accion': accion, **datos}).execute().data
    except APIError as error:
        estado = {'42501': 403, 'P0002': 404, '55000': 409, '40001': 409, '22023': 422}.get(error.code, 503)
        raise HTTPException(estado, 'No se pudo acceder a la imagen. Comprueba el permiso y el estado del contenido.') from None
    except Exception:
        raise HTTPException(503, 'No se pudo comprobar el acceso a la imagen.') from None


def validar_imagen(datos: bytes, tipo: str):
    if tipo not in ('image/jpeg', 'image/png'):
        raise HTTPException(415, 'Selecciona una imagen JPG o PNG.')
    if not datos or len(datos) > MAXIMO:
        raise HTTPException(413, 'La imagen debe pesar como máximo 5 MB.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(datos)) as original:
                if original.format not in ('JPEG', 'PNG') or tipo != ('image/jpeg' if original.format == 'JPEG' else 'image/png'):
                    raise ValueError('Formato distinto al declarado')
                if max(original.size) > 8192 or original.width * original.height > 20000000:
                    raise ValueError('Dimensiones excesivas')
                original.load()
                orientada = ImageOps.exif_transpose(original)
                orientada.thumbnail((2400, 2400))
                # Recodificación: elimina metadatos EXIF, ubicación y contenido añadido al archivo.
                limpia = Image.new('RGBA' if tipo == 'image/png' else 'RGB', orientada.size)
                limpia.paste(orientada.convert(limpia.mode))
                salida = BytesIO()
                limpia.save(salida, format='PNG' if tipo == 'image/png' else 'JPEG', optimize=True, **({'quality': 88} if tipo == 'image/jpeg' else {}))
                resultado = salida.getvalue()
        if len(resultado) > MAXIMO:
            raise ValueError('Resultado demasiado grande')
        return resultado
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, 'La imagen está dañada o supera las dimensiones permitidas (8192 px y 20 megapíxeles).') from None


def guardar_imagen(cliente, folio, datos, tipo):
    actual = operacion_imagen(cliente, folio, 'preparar')
    limpia = validar_imagen(datos, tipo)
    ruta = f'{folio}/{uuid4()}.{"png" if tipo == "image/png" else "jpg"}'
    try:
        almacen = crear_cliente_servicio().storage.from_(BUCKET)
        almacen.upload(ruta, limpia, {'content-type': tipo, 'upsert': 'false', 'cache-control': '0'})
    except Exception:
        raise HTTPException(503, 'No se pudo guardar la imagen. El texto puede estar guardado; intenta cargarla de nuevo.') from None
    try:
        resultado = operacion_imagen(cliente, folio, 'asociar', ruta_archivo=ruta,
                                     tipo_archivo=tipo, version_contenido=actual['actualizadoEn'])
    except Exception:
        try:
            almacen.remove([ruta])
        except Exception:
            pass  # La ruta nunca quedó asociada ni es pública; no ocultar el conflicto original.
        raise
    anterior = resultado.get('rutaAnterior')
    if anterior and anterior != ruta:
        try:
            almacen.remove([anterior])
        except Exception:
            pass  # El archivo anterior permanece privado, sin referencia activa.
    return {k: v for k, v in resultado.items() if k not in ('ruta', 'tipoArchivo', 'rutaAnterior')}


@router.put('/contenidos/editor/{folio}/imagen')
async def subir(folio: Folio, peticion: Request, cliente: Cliente):
    tipo = peticion.headers.get('content-type', '').split(';')[0].lower()
    if tipo not in ('image/jpeg', 'image/png'):
        raise HTTPException(415, 'Selecciona una imagen JPG o PNG.')
    datos = bytearray()
    async for bloque in peticion.stream():
        datos.extend(bloque)
        if len(datos) > MAXIMO:
            raise HTTPException(413, 'La imagen debe pesar como máximo 5 MB.')
    return await run_in_threadpool(guardar_imagen, cliente, folio, bytes(datos), tipo)


@router.delete('/contenidos/editor/{folio}/imagen')
def quitar(folio: Folio, cliente: Cliente):
    actual = operacion_imagen(cliente, folio, 'preparar')
    resultado = operacion_imagen(cliente, folio, 'quitar', version_contenido=actual['actualizadoEn'])
    if resultado.get('rutaAnterior'):
        try:
            crear_cliente_servicio().storage.from_(BUCKET).remove([resultado['rutaAnterior']])
        except Exception:
            pass
    return {k: v for k, v in resultado.items() if k not in ('ruta', 'tipoArchivo', 'rutaAnterior')}


def descargar(datos):
    if not datos or not datos.get('ruta'):
        raise HTTPException(404, 'Este contenido no tiene una imagen disponible.')
    try:
        imagen = crear_cliente_servicio().storage.from_(BUCKET).download(datos['ruta'])
    except Exception:
        raise HTTPException(503, 'No se pudo cargar la imagen.') from None
    return Response(imagen, media_type=datos['tipoArchivo'], headers={
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline'})


@router.get('/contenidos/editor/{folio}/imagen')
def leer_privada(folio: Folio, cliente: Cliente):
    return descargar(operacion_imagen(cliente, folio))


@router.get('/contenidos/revision/{folio}/imagen')
def leer_revision(folio: Folio, cliente: Cliente):
    return descargar(operacion_imagen(cliente, folio))


@router.get('/contenidos/publicos/{folio}/imagen')
def leer_publica(folio: Folio):
    try:
        datos = crear_cliente().rpc('imagen_publicada', {'folio_contenido': folio}).execute().data
    except Exception:
        raise HTTPException(503, 'No se pudo comprobar la publicación de la imagen.') from None
    return descargar(datos)
