"""T-054 / HU-11. Editor de contenidos: borradores y envío a autorización.

La cuenta debe tener la capacidad 'preparar_contenidos'. La BD decide los permisos con el
token de la sesión y solo deja ver y tocar los contenidos propios (public.editor_contenidos,
ver Supabase/contenidos_editor.sql). La revisión y publicación del Administrador va aparte.
"""

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import Field, StringConstraints
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente
from Back.registro import DatosBase

router = APIRouter(prefix='/contenidos/editor', tags=['Editor de contenidos (T-054)'])
seguridad = HTTPBearer(auto_error=False)

TipoContenido = Literal['noticia', 'resena', 'acerca', 'memoria']
EstadoFiltro = Literal['borrador', 'en_revision', 'con_observaciones', 'publicado']
Folio = Annotated[str, Path(pattern=r'^CN-[0-9]{4,}$', max_length=20)]
Titulo = Annotated[str, StringConstraints(strip_whitespace=True, max_length=150)]
Resumen = Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)]
Cuerpo = Annotated[str, StringConstraints(max_length=20000)]
Nota = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]


def sesion_editor(credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(seguridad)]):
    if credenciales is None or credenciales.scheme.lower() != 'bearer':
        raise HTTPException(401, 'Se requiere una sesión válida.', headers={'WWW-Authenticate': 'Bearer'})
    try:
        # Un cliente por petición; la capacidad 'preparar_contenidos' la decide la BD con este token.
        cliente = crear_cliente()
        respuesta = cliente.auth.get_user(credenciales.credentials)
        if not respuesta or not respuesta.user:
            raise HTTPException(401, 'Se requiere una sesión válida.')
        cliente.postgrest.auth(credenciales.credentials)
        return cliente
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status in (400, 401, 403):
            raise HTTPException(401, 'La sesión no es válida o expiró.') from None
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None


Cliente = Annotated[object, Depends(sesion_editor)]


def ejecutar(cliente, operacion: str, datos: dict):
    try:
        return cliente.rpc('editor_contenidos', {'operacion': operacion, 'datos': datos}).execute().data
    except APIError as error:
        if error.code == '42501':
            raise HTTPException(403, 'No tienes permiso para preparar contenidos o tu sesión ya no está vigente.') from None
        if error.code == 'P0002':
            raise HTTPException(404, 'No se encontró el contenido.') from None
        if error.code == '55000':
            raise HTTPException(409, 'Este contenido ya se envió a autorización y no se puede cambiar.') from None
        if error.code == '23514':
            raise HTTPException(422, 'Faltan campos obligatorios para enviarlo a autorización.') from None
        if error.code in ('22023', '22001', '22P02'):
            raise HTTPException(422, 'Revisa los datos enviados.') from None
        raise HTTPException(503, 'No fue posible completar la operación.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible completar la operación.') from None


class CambiosContenido(DatosBase):
    """Lo que se guarda en un borrador. Lo que no se mande se conserva como estaba."""
    titulo: Titulo | None = None
    resumen: Resumen | None = None
    cuerpo: Cuerpo | None = None
    # Campos propios del tipo; la BD comprueba cuáles admite cada uno.
    datos: dict[str, Any] | None = Field(default=None, max_length=20)


class NuevoContenido(CambiosContenido):
    tipo: TipoContenido


class Envio(DatosBase):
    nota: Nota | None = None


@router.get('/resumen')
def resumen(cliente: Cliente):
    """Cifras de las tarjetas de inicio: borradores, por autorizar, con observaciones y publicados."""
    return ejecutar(cliente, 'resumen', {})


@router.get('')
def listar(cliente: Cliente, estado: EstadoFiltro | None = None,
           busqueda: Annotated[str | None, Query(max_length=100)] = None,
           limite: int = Query(10, ge=1, le=50), desplazamiento: int = Query(0, ge=0, le=100000)):
    """Mis contenidos, del más reciente al más antiguo. La búsqueda es por folio o título."""
    datos: dict = {'limite': limite, 'desplazamiento': desplazamiento}
    if estado:
        datos['estado'] = estado
    if busqueda and busqueda.strip():
        datos['busqueda'] = busqueda.strip()
    return ejecutar(cliente, 'listar', datos)


@router.post('', status_code=201)
def crear_borrador(datos: NuevoContenido, cliente: Cliente):
    """Guarda un borrador nuevo; la respuesta trae el folio asignado."""
    return ejecutar(cliente, 'guardar', datos.model_dump(exclude_none=True))


@router.get('/{folio}')
def obtener(folio: Folio, cliente: Cliente):
    """Un contenido propio con las últimas observaciones del Administrador, si las hay."""
    return ejecutar(cliente, 'obtener', {'folio': folio})


@router.put('/{folio}')
def guardar_borrador(folio: Folio, datos: CambiosContenido, cliente: Cliente):
    """Solo se puede en borrador o con observaciones."""
    return ejecutar(cliente, 'guardar', {**datos.model_dump(exclude_none=True), 'folio': folio})


@router.post('/{folio}/enviar')
def enviar_a_autorizacion(folio: Folio, datos: Envio, cliente: Cliente):
    """Pasa el contenido a 'Por autorizar'. La nota es opcional y la lee el Administrador."""
    return ejecutar(cliente, 'enviar', {**datos.model_dump(exclude_none=True), 'folio': folio})
