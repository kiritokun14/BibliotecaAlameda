"""Agenda pública y propuestas persistentes. La BD valida sesión, ámbito y decisiones."""
from datetime import date, time
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Path, Query
from postgrest.exceptions import APIError
from pydantic import AwareDatetime, StringConstraints, model_validator

from Back.conexion import crear_cliente
from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(tags=['Actividades y agenda'])
FolioActividad = Annotated[str, Path(pattern=r'^[a-zA-Z0-9_-]{1,150}$')]
Texto = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]


def ejecutar(cliente, operacion, datos):
    try:
        return cliente.rpc('gestionar_agenda', {'operacion': operacion, 'datos': datos}).execute().data
    except APIError as error:
        codigo, mensaje = {
            '42501': (403, 'No tienes permiso para esta actividad o tu sesión ya no está vigente.'),
            'P0002': (404, 'No se encontró la actividad.'),
            '40001': (409, 'La actividad cambió. Recarga antes de continuar.'),
            '55000': (409, 'El estado de la actividad no permite esta acción.'),
            '23514': (422, 'Revisa los datos, la autorización, el cupo y la disponibilidad del espacio.'),
            '22023': (422, 'Revisa los campos enviados.'),
            '22P02': (422, 'Revisa los campos enviados.'),
            '22007': (422, 'Revisa la fecha y el horario.'),
        }.get(error.code, (503, 'No fue posible guardar o consultar la actividad.'))
        raise HTTPException(codigo, mensaje) from None
    except Exception:
        raise HTTPException(503, 'No fue posible guardar o consultar la actividad.') from None


class DatosActividad(DatosBase):
    nombre: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
    tipo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
    descripcion: Texto = ''
    fecha: date | None = None
    inicio: time | None = None
    fin: time | None = None
    espacio: Annotated[str, StringConstraints(max_length=150)] = ''
    cupo: Annotated[str, StringConstraints(pattern=r'^\d{0,6}$')] = ''
    inscripcion: bool = True
    publico: Annotated[str, StringConstraints(max_length=150)] = ''
    responsable: Annotated[str, StringConstraints(max_length=150)] = ''
    materiales: Texto = ''

    @model_validator(mode='after')
    def horario_valido(self):
        if self.inicio and self.fin and self.fin <= self.inicio:
            raise ValueError('La hora de fin debe ser posterior al inicio.')
        if any(h and h.tzinfo for h in (self.inicio, self.fin)):
            raise ValueError('Las horas corresponden al horario local de Tepic.')
        return self


class NuevaActividad(DatosActividad):
    estado: Literal['borrador', 'en-revision'] = 'borrador'


class EdicionActividad(DatosActividad):
    actualizado: AwareDatetime


class DecisionActividad(DatosBase):
    actualizado: AwareDatetime
    referencia: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] = ''
    motivo: Texto = ''


@router.get('/actividades/gestion')
def lista(cliente: Cliente):
    return ejecutar(cliente, 'listar', {})


@router.get('/actividades/gestion/espacios')
def espacios(cliente: Cliente):
    return ejecutar(cliente, 'espacios', {})


@router.get('/actividades/gestion/{folio}')
def detalle(folio: FolioActividad, cliente: Cliente):
    return ejecutar(cliente, 'obtener', {'folio': folio})


@router.post('/actividades/gestion', status_code=201)
def crear(datos: NuevaActividad, cliente: Cliente):
    return ejecutar(cliente, 'crear', datos.model_dump(mode='json', exclude_none=True))


@router.patch('/actividades/gestion/{folio}')
def editar(folio: FolioActividad, datos: EdicionActividad, cliente: Cliente):
    return ejecutar(cliente, 'guardar', {'folio': folio, **datos.model_dump(mode='json', exclude_none=True)})


@router.post('/actividades/gestion/{folio}/{accion}')
def decidir(folio: FolioActividad, accion: Literal['enviar', 'aprobar', 'publicar', 'retirar', 'archivar', 'rechazar'],
            datos: DecisionActividad, cliente: Cliente):
    return ejecutar(cliente, accion, {'folio': folio, **datos.model_dump(mode='json')})


def consultar_publicas(identificador=None, desde=None, hasta=None, tipo=None, busqueda=None, pagina=0, limite=20):
    if desde and hasta and desde > hasta:
        raise HTTPException(422, 'La fecha inicial debe ser anterior o igual a la final.')
    try:
        return crear_cliente().rpc('agenda_publica', {'filtros': {
            'identificador': identificador, 'desde': desde.isoformat() if desde else None,
            'hasta': hasta.isoformat() if hasta else None, 'tipo': tipo, 'busqueda': busqueda,
            'pagina': pagina, 'limite': limite,
        }}).execute().data
    except Exception:
        raise HTTPException(503, 'No fue posible consultar la agenda. Intenta nuevamente.') from None


@router.get('/actividades/publicas')
def agenda(desde: date | None = None, hasta: date | None = None,
           tipo: Annotated[str | None, Query(max_length=80)] = None,
           busqueda: Annotated[str | None, Query(max_length=100)] = None,
           pagina: int = Query(0, ge=0, le=5000), limite: int = Query(20, ge=1, le=50)):
    return consultar_publicas(desde=desde, hasta=hasta, tipo=tipo, busqueda=busqueda, pagina=pagina, limite=limite)


@router.get('/actividades/publicas/{identificador}')
def actividad_publica(identificador: FolioActividad):
    filas = consultar_publicas(identificador=identificador)['actividades']
    if not filas:
        raise HTTPException(404, 'La actividad no está publicada o ya fue retirada.')
    return filas[0]
