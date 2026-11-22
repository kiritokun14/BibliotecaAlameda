"""HU-20 / T-099. La lista y sus correcciones se guardan por sesión."""

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response
from postgrest.exceptions import APIError
from pydantic import AwareDatetime, BaseModel, Field, StringConstraints

from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(tags=['Asistencia'])
Estatus = Literal['presente', 'ausente']
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class Marca(DatosBase):
    usuarioId: UUID
    estatus: Estatus


class Marcas(DatosBase):
    marcas: list[Marca]


class Correccion(Marca):
    version: Annotated[int, Field(strict=True, ge=1, le=2147483647)]
    motivo: Motivo


class Cierre(BaseModel):
    quien: str
    fecha: AwareDatetime


class ResumenSesion(BaseModel):
    id: UUID
    folio: str
    nombre: str
    espacio: str
    inicio: AwareDatetime
    estado: Literal['programada', 'en_curso', 'finalizada', 'cancelada']
    cerrada: Cierre | None
    inscritos: int
    total: int
    presentes: int
    ausentes: int
    sinMarcar: int


class PersonaLista(BaseModel):
    usuarioId: UUID
    nombre: str
    marca: Estatus | None
    version: int | None
    confirmada: bool
    motivoAnterior: str | None


class CorreccionGuardada(Cierre):
    id: str
    persona: str
    anterior: Estatus
    nuevo: Estatus
    motivo: str


class ListaAsistencia(BaseModel):
    sesion: ResumenSesion
    personas: list[PersonaLista]
    correcciones: list[CorreccionGuardada]


def ejecutar(cliente, respuesta: Response, operacion: str, **datos):
    cabeceras = {'Cache-Control': 'private, no-store'}
    respuesta.headers.update(cabeceras)
    try:
        return cliente.rpc('gestionar_asistencia', {'operacion': operacion, 'datos': datos}).execute().data
    except APIError as error:
        estado, mensaje = {
            '42501': (403, 'No tienes permiso de asistencia para esta sesión o tu cuenta ya no está activa.'),
            'P0002': (404, 'No se encontró la sesión o el registro de asistencia.'),
            '55000': (409, 'Esta sesión aún no inicia o está cancelada.'),
            '40001': (409, 'La lista cambió. Actualízala antes de guardar.'),
            '22023': (422, 'Revisa la marca y el motivo de la corrección.'),
            '22P02': (422, 'Revisa los datos de asistencia.'),
        }.get(error.code, (503, 'No fue posible consultar o guardar la asistencia.'))
        raise HTTPException(estado, mensaje, headers=cabeceras) from None
    except Exception:
        raise HTTPException(503, 'El servicio de asistencia no está disponible.', headers=cabeceras) from None


@router.get('/responsable/asistencia/sesiones', response_model=list[ResumenSesion])
def sesiones(cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'sesiones')


@router.get('/sesiones/{sesion_id}/asistencia', response_model=ListaAsistencia)
def consultar(sesion_id: UUID, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'consultar', sesionId=str(sesion_id))


@router.put('/sesiones/{sesion_id}/asistencia', response_model=ListaAsistencia)
def registrar(sesion_id: UUID, datos: Marcas, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'registrar', sesionId=str(sesion_id), **datos.model_dump(mode='json'))


@router.post('/sesiones/{sesion_id}/asistencia/cerrar', response_model=ListaAsistencia)
def cerrar(sesion_id: UUID, datos: Marcas, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'cerrar', sesionId=str(sesion_id), **datos.model_dump(mode='json'))


@router.post('/sesiones/{sesion_id}/asistencia/correcciones', response_model=ListaAsistencia)
def corregir(sesion_id: UUID, datos: Correccion, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'corregir', sesionId=str(sesion_id), **datos.model_dump(mode='json'))
