"""Puente entre el portal y API.SH para consultar publicaciones públicas.

Recorrido: React -> router de FastAPI -> caché -> API.SH (solo si corresponde).
El servidor conserva la clave; la respuesta pública contiene únicamente los
campos normalizados y una indicación de si los datos guardados están vencidos.
"""
import json  # Convierte entre texto JSON y listas/diccionarios de Python.
import math  # Permite rechazar tiempos infinitos o NaN en el archivo de caché.
import os  # Lee las variables de entorno del servidor.
import time  # Obtiene el tiempo actual en segundos Unix para calcular vencimientos.
from datetime import datetime, timezone  # Interpreta fechas y las convierte a UTC.
from pathlib import Path  # Construye rutas sin depender del directorio desde el que se ejecuta.
from threading import Lock  # Evita actualizaciones simultáneas dentro del mismo proceso.
from urllib.parse import urlsplit  # Separa una URL en esquema, servidor, ruta, etc.

import httpx  # Cliente para la solicitud HTTP saliente a API.SH.
from dotenv import load_dotenv  # Carga las variables declaradas en Back/.env.
from fastapi import APIRouter, HTTPException  # Agrupa rutas y genera errores HTTP controlados.

router = APIRouter(tags=['Instagram'])  # Etiqueta que organiza el endpoint en /docs.
SEIS_HORAS = 6 * 60 * 60  # 21 600 segundos; unidad compatible con time.time().
# Archivo local independiente de Supabase; permite recuperar datos tras reinicios.
ARCHIVO = Path(__file__).parent / '.cache' / 'instagram.json'


def enlace_seguro(valor, instagram=False):
    """Devuelve una URL HTTPS válida o None; limita los destinos de las publicaciones a Instagram.

Las miniaturas pueden proceder de una CDN distinta, por eso el filtro de dominio
se aplica únicamente cuando instagram=True. No descarga ni verifica la imagen.
"""
    if not isinstance(valor, str):
        return None  # Incluye valores null del proveedor: no intentamos analizarlos como texto.
    try:
        partes = urlsplit(valor)  # Analiza la URL localmente; no realiza una solicitud HTTP.
        # Exige HTTPS y servidor, y rechaza URLs con usuario o contraseña incrustados.
        if partes.scheme != 'https' or not partes.hostname or partes.username or partes.password:
            return None
        if instagram and partes.hostname not in ('instagram.com', 'www.instagram.com'):
            return None
        return valor  # Conserva la URL original si supera las comprobaciones.
    except ValueError:
        return None


def fecha_valida(valor):
    """Convierte segundos Unix o texto ISO a ISO 8601 en UTC; omite fechas inválidas.

Una fecha ISO sin zona horaria se interpreta como UTC. None se serializa como
null en JSON y permite que React oculte la fecha sin inventar una.
"""
    try:
        # bool hereda de int en Python: se excluye para no convertir True en una fecha.
        if isinstance(valor, (int, float)) and not isinstance(valor, bool):
            fecha = datetime.fromtimestamp(valor, timezone.utc)
        elif isinstance(valor, str) and valor.strip():
            fecha = datetime.fromisoformat(valor.replace('Z', '+00:00'))  # Z representa UTC.
            if fecha.tzinfo is None:
                fecha = fecha.replace(tzinfo=timezone.utc)
        else:
            return None
        return fecha.astimezone(timezone.utc).isoformat()  # Produce texto serializable en JSON.
    except (ValueError, OverflowError, OSError):
        return None


def normalizar_publicaciones(respuesta):
    """Adapta la respuesta externa al contrato estable que consume React.

Acepta una lista o envoltorios conocidos de hasta cuatro niveles. Una lista
vacía es válida; una estructura desconocida genera ValueError para conservar
la caché anterior. Mantiene el orden del proveedor y toma las primeras seis.
"""
    datos = respuesta  # Referencia al nivel que estamos inspeccionando del JSON recibido.
    for _ in range(4):  # Limita cuántos envoltorios se recorren; no es un reintento de red.
        if isinstance(datos, list):
            break  # Ya encontramos la lista: no es necesario buscar más adentro.
        if not isinstance(datos, dict) or datos.get('success') is False or datos.get('error'):
            raise ValueError('Respuesta incorrecta')
        # next obtiene la primera clave conocida presente; None indica que no existe ninguna.
        clave = next((c for c in ('posts', 'items', 'results', 'data') if c in datos), None)
        if clave is None:
            raise ValueError('Respuesta incorrecta')
        datos = datos[clave]  # Desciende al siguiente nivel del documento JSON.
    # any detecta si al menos un elemento no es un objeto de publicación.
    if not isinstance(datos, list) or any(not isinstance(p, dict) for p in datos):
        raise ValueError('Respuesta incorrecta')
    publicaciones = []  # Lista nueva: no modificamos los objetos originales del proveedor.
    for posicion, dato in enumerate(datos[:6]):  # slice limita a seis; enumerate aporta el índice.
        identificador = dato.get('id')  # get devuelve None cuando el campo no existe.
        # Lista explícita de campos: no reenviamos la respuesta completa del proveedor.
        publicaciones.append({
            'id': str(identificador) if isinstance(identificador, (str, int)) else f'publicacion-{posicion}',  # Siempre texto.
            'caption': dato.get('caption') if isinstance(dato.get('caption'), str) else '',  # Respaldo para null.
            'thumbnail': enlace_seguro(dato.get('thumbnail')),  # Imagen HTTPS o None.
            'url': enlace_seguro(dato.get('url'), instagram=True),  # Destino limitado a Instagram.
            'type': dato.get('type') if isinstance(dato.get('type'), str) else None,  # Tipo original o None.
            'taken_at': fecha_valida(dato.get('taken_at')),  # Fecha ISO en UTC o None.
        })
    return publicaciones


class CacheInstagram:
    """Datos en memoria con respaldo JSON y límite de una actualización por seis horas.

El bloqueo coordina peticiones simultáneas de un mismo proceso. No es un
bloqueo compartido entre varios workers, réplicas o servidores.
"""
    def __init__(self, archivo=ARCHIVO):
        """Carga la última copia válida; un archivo ausente o corrupto no impide iniciar."""
        self.archivo = archivo  # Permite usar un archivo temporal distinto durante las pruebas.
        self.bloqueo = Lock()  # Se adquiere con with y se libera incluso si ocurre una excepción.
        self.publicaciones = None  # None: nunca hubo éxito; []: éxito sin publicaciones.
        self.actualizado = 0  # Última actualización exitosa; cero permite el primer intento.
        self.proximo_intento = 0  # Instante mínimo permitido para volver a contactar al proveedor.
        try:
            datos = json.loads(archivo.read_text(encoding='utf-8'))  # Lee disco y decodifica JSON.
            self.publicaciones = (normalizar_publicaciones(datos['publicaciones'])
                                  if datos['publicaciones'] is not None else None)
            self.actualizado = float(datos['actualizado'])  # Unifica el tipo numérico del tiempo guardado.
            self.proximo_intento = float(datos.get('proximo_intento', 0))
            # all exige tiempos finitos, no negativos y sin fechas futuras fuera del plazo esperado.
            if not all(math.isfinite(v) and 0 <= v <= time.time() + SEIS_HORAS
                       for v in (self.actualizado, self.proximo_intento)):
                raise ValueError('Caché inválida')
        except (OSError, ValueError, KeyError, TypeError):
            self.publicaciones = None
            self.actualizado = self.proximo_intento = 0  # Descarta ambos tiempos si la copia no es válida.

    def guardar(self):
        """Escribe primero un temporal y lo reemplaza para evitar un JSON parcial.

Se guardan publicaciones y tiempos, nunca la clave ni el cuerpo de los errores.
"""
        try:
            self.archivo.parent.mkdir(parents=True, exist_ok=True)  # Crea .cache si todavía no existe.
            temporal = self.archivo.with_suffix('.tmp')  # instagram.json pasa a instagram.tmp.
            temporal.write_text(json.dumps({'publicaciones': self.publicaciones,
                'actualizado': self.actualizado, 'proximo_intento': self.proximo_intento}), encoding='utf-8')
            temporal.replace(self.archivo)  # Publica el archivo completo reemplazando la versión anterior.
        except OSError:
            # La copia en memoria sigue funcionando si el disco no permite escritura.
            pass

    def obtener(self):
        """Devuelve la caché o realiza un único intento cuando vence el plazo.

actualizado marca el último éxito; proximo_intento también limita los fallos.
Solo sustituye las publicaciones después de validar toda la respuesta nueva.
"""
        with self.bloqueo:  # Una solicitud actualiza; las demás esperan y luego reutilizan su resultado.
            ahora = time.time()  # Tiempo de referencia para esta comprobación.
            # max obliga a respetar tanto la vigencia del éxito como el plazo tras un intento fallido.
            if ahora >= max(self.actualizado + SEIS_HORAS, self.proximo_intento):
                # También limita los intentos fallidos: ningún bucle de reintentos por visitante.
                self.proximo_intento = ahora + SEIS_HORAS
                try:
                    load_dotenv(Path(__file__).with_name('.env'))  # Busca .env junto a este módulo.
                    clave = os.getenv('APISH_KEY', '').strip()  # Elimina espacios de los extremos.
                    if not clave:
                        raise ValueError('Configuración ausente')
                    with httpx.Client(timeout=httpx.Timeout(12, connect=5), follow_redirects=False) as cliente:
                        # La cuenta y el destino son fijos: el visitante no elige qué consultar.
                        # connect=5 limita la conexión; 12 limita las otras fases de E/S,
                        # no es un límite total de duración de toda la operación.
                        respuesta = cliente.get('https://api.api.sh/instagram/v1/user/posts',
                            params={'username': 'culturanayarit'}, headers={'x-api-key': clave})
                        respuesta.raise_for_status()  # Convierte respuestas no exitosas en excepciones.
                        publicaciones = normalizar_publicaciones(respuesta.json())  # Valida antes de sustituir.
                    self.publicaciones = publicaciones  # Actualiza la copia compartida solo tras éxito completo.
                    self.actualizado = ahora  # Registra el tiempo de referencia de la actualización exitosa.
                except (httpx.HTTPError, ValueError, TypeError):
                    # Incluye conexión, timeout, estado HTTP y JSON/esquema inválido.
                    # Se mantiene la copia anterior y no se revela el error al navegador.
                    pass
                self.guardar()  # Persiste también el próximo intento aunque la actualización haya fallado.
            if self.publicaciones is None:  # [] sí es una respuesta válida: no debe producir un 503.
                raise HTTPException(503, 'Las noticias culturales no están disponibles por el momento.')
            return {'publicaciones': self.publicaciones,
                    'desactualizado': ahora >= self.actualizado + SEIS_HORAS}


# Una instancia compartida por todas las solicitudes atendidas por este proceso.
cache = CacheInstagram()


@router.get('/api/instagram/publicaciones')  # Ruta pública solicitada, visible en Swagger (/docs).
@router.get('/instagram/publicaciones', include_in_schema=False)  # Alias para Vite, oculto en /docs.
def publicaciones_instagram():
    """Endpoint público de solo lectura: no requiere sesión ni devuelve credenciales."""
    # Ruta corta compatible con el proxy existente que elimina /api.
    return cache.obtener()
