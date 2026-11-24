"""HU-28 / HU-29. Progreso por participación y entrega de recompensas (CU-28, CU-29, D-11).

Las reglas viven en Supabase/progreso_recompensas.sql; aquí solo se validan formas y se traducen errores.
"""

from datetime import date
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response
from postgrest.exceptions import APIError
from pydantic import AwareDatetime, Field, StringConstraints, model_validator

from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(tags=['Progreso y recompensas'])

Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
Referencia = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Nivel = Annotated[int, Field(strict=True, ge=0, le=2)]


class Ajuste(DatosBase):
    cambio: Annotated[int, Field(strict=True, ge=-10, le=10)]
    motivo: Motivo

    @model_validator(mode='after')
    def distinto_de_cero(self):
        if self.cambio == 0:
            raise ValueError('El ajuste no puede ser cero.')
        return self


class DatosRecompensa(DatosBase):
    nombre: Nombre
    descripcion: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] = ''
    nivelRequerido: Nivel
    existencias: Annotated[int, Field(strict=True, ge=0, le=100000)]
    vigenciaInicio: AwareDatetime
    vigenciaFin: AwareDatetime
    estado: Literal['activa', 'inactiva', 'archivada']

    @model_validator(mode='after')
    def vigencia_valida(self):
        if self.vigenciaFin < self.vigenciaInicio:
            raise ValueError('La vigencia termina antes de empezar.')
        return self


class EdicionRecompensa(DatosRecompensa):
    actualizadoEn: AwareDatetime


class Asignacion(DatosBase):
    recompensaId: UUID
    usuarioId: UUID
    referencia: Referencia
    autoridad: Nombre
    fechaAutorizacion: date
    notas: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] = ''


class Cancelacion(DatosBase):
    motivo: Motivo


def ejecutar(cliente, respuesta: Response, operacion: str, **datos) -> Any:
    cabeceras = {'Cache-Control': 'private, no-store'}
    respuesta.headers.update(cabeceras)
    try:
        return cliente.rpc('progreso_recompensas', {'operacion': operacion, 'datos': datos}).execute().data
    except APIError as error:
        estado, mensaje = {
            '42501': (403, 'No tienes permiso para registrar recompensas o tu sesión ya no está vigente.'),
            'P0002': (404, 'No se encontró la persona, la recompensa o la asignación.'),
            '40001': (409, 'Los datos cambiaron o la persona ya tiene esta recompensa. Actualiza la pantalla.'),
            '55000': (409, 'La recompensa no está activa, no tiene existencias o la asignación ya no puede cambiar.'),
            '22023': (422, 'Revisa los datos enviados.'),
            '22P02': (422, 'Revisa los datos enviados.'),
            '22007': (422, 'Revisa las fechas.'),
        }.get(error.code, (503, 'No fue posible consultar o guardar el progreso.'))
        if error.code == '23514':
            # Mensajes del disparador de entregas: vigencia, credencial o nivel. No contienen datos personales.
            estado, mensaje = 422, _motivo_entrega(error.message or '')
        raise HTTPException(estado, mensaje, headers=cabeceras) from None
    except Exception:
        raise HTTPException(503, 'El servicio de progreso no está disponible.', headers=cabeceras) from None


def _motivo_entrega(texto: str) -> str:
    texto = texto.lower()
    if 'credencial' in texto:
        return 'La persona necesita una credencial bibliotecaria validada y vigente.'
    if 'nivel' in texto:
        return 'La persona aún no alcanza el nivel que pide la recompensa.'
    if 'vigencia' in texto:
        return 'La recompensa no está vigente hoy.'
    return 'La recompensa no se puede asignar. Revisa existencias, vigencia, nivel y credencial.'


@router.get('/progreso/mio')
def mi_progreso(cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'mio')


@router.get('/participantes/progreso')
def participantes(cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'participantes')


@router.get('/participantes/progreso/{usuario_id}')
def participante(usuario_id: UUID, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'participante', usuarioId=str(usuario_id))


@router.post('/participantes/progreso/{usuario_id}/ajustes')
def ajustar(usuario_id: UUID, datos: Ajuste, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'ajustar', usuarioId=str(usuario_id), **datos.model_dump(mode='json'))


@router.get('/participantes/recompensas')
def recompensas(cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'recompensas')


@router.post('/participantes/recompensas', status_code=201)
def crear_recompensa(datos: DatosRecompensa, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'crear_recompensa', **datos.model_dump(mode='json'))


@router.patch('/participantes/recompensas/{recompensa_id}')
def editar_recompensa(recompensa_id: UUID, datos: EdicionRecompensa, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'editar_recompensa', id=str(recompensa_id), **datos.model_dump(mode='json'))


@router.get('/participantes/entregas')
def entregas(cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'entregas')


@router.post('/participantes/entregas', status_code=201)
def asignar(datos: Asignacion, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'asignar', **datos.model_dump(mode='json'))


@router.post('/participantes/entregas/{entrega_id}/confirmar')
def confirmar(entrega_id: UUID, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'confirmar', entregaId=str(entrega_id))


@router.post('/participantes/entregas/{entrega_id}/cancelar')
def cancelar(entrega_id: UUID, datos: Cancelacion, cliente: Cliente, respuesta: Response):
    return ejecutar(cliente, respuesta, 'cancelar', entregaId=str(entrega_id), **datos.model_dump(mode='json'))
