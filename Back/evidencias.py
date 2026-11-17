"""HU-21 / BDLAG-95. Evidencias privadas de actividades.

Fotos, listas firmadas e informes (PDF, JPG o PNG de hasta 10 MB) en el bucket privado
'evidencias-actividades'. Solo el backend escribe y lee Storage, y siempre después de que la BD
autoriza la operación con el token de la persona (public.evidencias_actividad, ver
Supabase/evidencias_actividades.sql).

Permiso: capacidad 'gestionar_evidencias'. Con ámbito global (Coordinación/Administración) se ve
todo; con ámbito de actividad, solo las evidencias de esa actividad con acceso 'personal'.
Cada consulta, descarga, cambio de acceso, retiro o solicitud de acceso queda registrada.
Nada de aquí publica evidencias en el portal (CA-21.2).
"""
from io import BytesIO
from typing import Annotated, Literal
from urllib.parse import quote
from uuid import UUID, uuid4
import warnings

from fastapi import APIRouter, HTTPException, Path, Query, Request, Response
from PIL import Image, ImageOps, UnidentifiedImageError
from postgrest.exceptions import APIError
from pydantic import StringConstraints
from starlette.concurrency import run_in_threadpool

from Back.conexion import crear_cliente_servicio
from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(prefix='/actividades/evidencias', tags=['Evidencias privadas (HU-21)'])
RPC = 'evidencias_actividad'
BUCKET = 'evidencias-actividades'
MAXIMO = 10 * 1024 * 1024
TIPOS = {'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png'}
Folio = Annotated[str, Path(pattern=r'^EV-[0-9]{4,}$', max_length=20)]
TipoEvidencia = Literal['fotografia', 'lista_firmada', 'informe']
Acceso = Literal['personal', 'coordinacion']
NombreArchivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Nota = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
SIN_CACHE = {'Cache-Control': 'private, no-store'}

# Mensajes de la BD que se pueden mostrar tal cual.
MENSAJES_VISIBLES = (
    'Elige la actividad.', 'La actividad aún no se realiza.', 'Elige el tipo de evidencia.', 'Elige quién puede verla.',
    'Solo se aceptan archivos PDF, JPG o PNG.', 'El archivo pesa más de 10 MB.', 'Revisa el nombre del archivo.',
    'La nota admite hasta 500 caracteres.', 'Escribe el motivo', 'La evidencia ya fue retirada.', 'Ya puedes abrir esta evidencia.',
)


def _mensaje(error: APIError, por_defecto: str) -> str:
    texto = (error.message or '').strip()
    return texto if texto.startswith(MENSAJES_VISIBLES) else por_defecto


def ejecutar(cliente, operacion: str, datos: dict | None = None):
    try:
        return cliente.rpc(RPC, {'operacion': operacion, 'datos': datos or {}}).execute().data
    except APIError as error:
        if error.code == '42501':
            if (error.message or '').startswith('Sin permiso para abrir'):
                raise HTTPException(403, 'Solo Coordinación y Administración pueden abrir esta evidencia.') from None
            if (error.message or '').startswith('Sin permiso'):
                raise HTTPException(403, 'No tienes permiso para gestionar evidencias de esta actividad.') from None
            raise HTTPException(403, 'Tu sesión ya no está vigente. Vuelve a iniciar sesión.') from None
        if error.code == 'P0002':
            raise HTTPException(404, 'No se encontró la evidencia.') from None
        if error.code == '55000':
            raise HTTPException(409, _mensaje(error, 'La evidencia no admite este cambio.')) from None
        if error.code == '23514':
            raise HTTPException(422, _mensaje(error, 'Revisa los datos de la evidencia.')) from None
        if error.code == '22023':
            raise HTTPException(422, 'El archivo no se guardó correctamente. Intenta subirlo de nuevo.') from None
        raise HTTPException(503, 'No fue posible completar la operación.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible completar la operación.') from None


def validar_archivo(datos: bytes, tipo: str) -> bytes:
    """Comprueba que el contenido sea del tipo declarado. Las fotos se recodifican para quitar
    metadatos (ubicación, cámara); los PDF se guardan tal cual."""
    if tipo not in TIPOS:
        raise HTTPException(415, 'Solo se aceptan archivos PDF, JPG o PNG.')
    if not datos or len(datos) > MAXIMO:
        raise HTTPException(413, 'El archivo pesa más de 10 MB. Reduce su tamaño o sube una versión comprimida.')
    if tipo == 'application/pdf':
        if not datos.startswith(b'%PDF-'):
            raise HTTPException(422, 'El archivo no es un PDF válido.')
        return datos
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(datos)) as original:
                if original.format != ('JPEG' if tipo == 'image/jpeg' else 'PNG'):
                    raise ValueError('Formato distinto al declarado')
                if max(original.size) > 12000 or original.width * original.height > 50000000:
                    raise ValueError('Dimensiones excesivas')
                original.load()
                orientada = ImageOps.exif_transpose(original)
                limpia = Image.new('RGBA' if tipo == 'image/png' else 'RGB', orientada.size)
                limpia.paste(orientada.convert(limpia.mode))
                salida = BytesIO()
                limpia.save(salida, format='PNG' if tipo == 'image/png' else 'JPEG', optimize=True,
                            **({'quality': 90} if tipo == 'image/jpeg' else {}))
                resultado = salida.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, 'La imagen está dañada o no corresponde al formato elegido.') from None
    if len(resultado) > MAXIMO:
        raise HTTPException(413, 'El archivo pesa más de 10 MB. Reduce su tamaño o sube una versión comprimida.')
    return resultado


def guardar_evidencia(cliente, metadatos: dict, datos: bytes, tipo: str):
    # 1) La BD autoriza antes de tocar Storage (permiso, actividad, tipo y tamaño declarados).
    preparado = ejecutar(cliente, 'preparar', {**metadatos, 'tipoArchivo': tipo, 'tamanoBytes': len(datos) or 1})
    archivo = validar_archivo(datos, tipo)
    ruta = f'{preparado["carpeta"]}/{uuid4()}.{TIPOS[tipo]}'
    try:
        almacen = crear_cliente_servicio().storage.from_(BUCKET)
        almacen.upload(ruta, archivo, {'content-type': tipo, 'upsert': 'false', 'cache-control': '0'})
    except Exception:
        raise HTTPException(503, 'No se pudo guardar el archivo. Intenta de nuevo.') from None
    # 2) Se registra con la ruta ya almacenada; si falla, el archivo se borra para no dejar huérfanos.
    try:
        return ejecutar(cliente, 'registrar', {**metadatos, 'tipoArchivo': tipo, 'tamanoBytes': len(archivo), 'ruta': ruta})
    except Exception:
        try:
            almacen.remove([ruta])
        except Exception:
            pass  # El archivo es privado y sin referencia; no ocultar el error original.
        raise


@router.get('/sesiones')
def sesiones(cliente: Cliente, response: Response):
    """Sesiones de actividad (ya realizadas, del día o canceladas) a las que se puede subir evidencia."""
    response.headers.update(SIN_CACHE)
    return ejecutar(cliente, 'sesiones')


@router.get('')
def listar(cliente: Cliente, response: Response, incluirRetiradas: bool = False):
    response.headers.update(SIN_CACHE)
    return ejecutar(cliente, 'listar', {'incluirRetiradas': incluirRetiradas})


@router.post('', status_code=201)
async def subir(peticion: Request, cliente: Cliente, sesionId: UUID, tipo: TipoEvidencia, nombreArchivo: NombreArchivo,
                acceso: Acceso = 'personal', nota: Annotated[Nota, Query()] = ''):
    """El cuerpo es el archivo tal cual (Content-Type: application/pdf, image/jpeg o image/png)."""
    tipo_archivo = peticion.headers.get('content-type', '').split(';')[0].strip().lower()
    if tipo_archivo not in TIPOS:
        raise HTTPException(415, 'Solo se aceptan archivos PDF, JPG o PNG.')
    datos = bytearray()
    async for bloque in peticion.stream():
        datos.extend(bloque)
        if len(datos) > MAXIMO:
            raise HTTPException(413, 'El archivo pesa más de 10 MB. Reduce su tamaño o sube una versión comprimida.')
    metadatos = {'sesionId': str(sesionId), 'tipo': tipo, 'acceso': acceso, 'nombreArchivo': nombreArchivo, 'nota': nota}
    return await run_in_threadpool(guardar_evidencia, cliente, metadatos, bytes(datos), tipo_archivo)


@router.get('/{folio}')
def detalle(folio: Folio, cliente: Cliente, response: Response):
    """Abrir el detalle registra la consulta (una vez cada 5 minutos por persona)."""
    response.headers.update(SIN_CACHE)
    return ejecutar(cliente, 'obtener', {'folio': folio})


@router.get('/{folio}/descarga')
def descargar(folio: Folio, cliente: Cliente):
    datos = ejecutar(cliente, 'descargar', {'folio': folio})
    try:
        contenido = crear_cliente_servicio().storage.from_(BUCKET).download(datos['ruta'])
    except Exception:
        raise HTTPException(503, 'No se pudo descargar el archivo.') from None
    nombre = datos.get('nombreArchivo') or f'{folio}.{TIPOS.get(datos["tipoArchivo"], "bin")}'
    return Response(contenido, media_type=datos['tipoArchivo'], headers={
        **SIN_CACHE, 'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': f"attachment; filename=\"{folio}.{TIPOS.get(datos['tipoArchivo'], 'bin')}\"; filename*=UTF-8''{quote(nombre)}"})


class CambioAcceso(DatosBase):
    acceso: Acceso


@router.patch('/{folio}/acceso')
def cambiar_acceso(folio: Folio, datos: CambioAcceso, cliente: Cliente, response: Response):
    response.headers.update(SIN_CACHE)
    return ejecutar(cliente, 'acceso', {'folio': folio, 'acceso': datos.acceso})


class Retiro(DatosBase):
    motivo: Motivo


@router.post('/{folio}/retiro')
def retirar(folio: Folio, datos: Retiro, cliente: Cliente, response: Response):
    """Deja de estar disponible; el archivo y el registro de consultas se conservan en privado."""
    response.headers.update(SIN_CACHE)
    return ejecutar(cliente, 'retirar', {'folio': folio, 'motivo': datos.motivo})


@router.post('/{folio}/solicitud-acceso')
def solicitar_acceso(folio: Folio, cliente: Cliente, response: Response):
    response.headers.update(SIN_CACHE)
    return ejecutar(cliente, 'solicitar_acceso', {'folio': folio})
