"""T-033 / HU-09 / CU-09. Alta de cuentas asistida por Servicios Digitales.

El operador captura los datos con la persona, sin contraseña. La BD comprueba la
capacidad 'alta_asistida', valida los mismos campos del autorregistro y manda a
revisión los posibles duplicados (public.alta_asistida, ver
Supabase/alta_asistida_cuentas.sql). Cuando la solicitud
queda lista, este servicio envía la invitación de Supabase Auth; el titular verifica
su correo y elige su contraseña en privado.
"""

from datetime import date
import os
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field, StringConstraints, model_validator
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente, crear_cliente_servicio
from Back.registro import ContactoTutor, DatosBase, Domicilio, Telefono, Texto

router = APIRouter(prefix='/cuentas/alta-asistida', tags=['Alta asistida (T-033)'])
seguridad = HTTPBearer(auto_error=False)
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


def sesion_operador(credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(seguridad)]):
    if credenciales is None or credenciales.scheme.lower() != 'bearer':
        raise HTTPException(401, 'Se requiere una sesión válida.', headers={'WWW-Authenticate': 'Bearer'})
    load_dotenv(Path(__file__).with_name('.env'))
    if os.getenv('ALTA_ASISTIDA_HABILITADA', 'false').lower() != 'true':
        raise HTTPException(503, 'El alta asistida todavía no está habilitada.')
    try:
        # Un cliente por petición; la capacidad 'alta_asistida' la decide la BD con este token.
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


Cliente = Annotated[object, Depends(sesion_operador)]


def ejecutar(cliente, operacion: str, datos: dict):
    try:
        return cliente.rpc('alta_asistida', {'operacion': operacion, 'datos': datos}).execute().data
    except APIError as error:
        if error.code == '42501':
            raise HTTPException(403, 'No tienes permiso de alta asistida o tu sesión ya no está vigente.') from None
        if error.code == '23505':
            raise HTTPException(409, 'El correo ya tiene una cuenta o una solicitud abierta; '
                                'orienta la recuperación de acceso.') from None
        if error.code == 'P0002':
            raise HTTPException(404, 'No se encontró la solicitud.') from None
        if error.code in ('23514', '22023', '22P02', '22007', '22008'):
            raise HTTPException(422, 'Revisa los datos enviados.') from None
        raise HTTPException(503, 'No fue posible completar la operación.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible completar la operación.') from None


def enviar_invitacion(solicitud: dict) -> bool:
    """Crea la cuenta con la invitación de Auth; el trigger toma los datos de la solicitud."""
    load_dotenv(Path(__file__).with_name('.env'))
    # El enlace reutiliza el retorno de recuperación: el titular llega a elegir su contraseña.
    retorno = os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/') + '/auth/retorno?flujo=recuperacion'
    try:
        crear_cliente_servicio().auth.admin.invite_user_by_email(
            solicitud['correo'], {'data': {'altaAsistida': solicitud['id']}, 'redirect_to': retorno})
    except AuthApiError as error:
        if getattr(error, 'code', '') in {'user_already_exists', 'email_exists'} :
            raise HTTPException(409, 'El correo ya tiene una cuenta; orienta la recuperación de acceso.') from None
        # La solicitud sigue 'lista' y se puede reintentar con /{id}/invitar.
        return False
    except Exception:
        return False
    return True


def responder(solicitud: dict) -> dict:
    enviada = enviar_invitacion(solicitud) if solicitud['estado'] == 'lista' else False
    return {**solicitud, 'invitacionEnviada': enviada}


class AltaAsistida(DatosBase):
    # Mismos campos del autorregistro (CU-05) sin contraseña, más el motivo del operador.
    nombres: Texto
    primerApellido: Texto
    segundoApellido: Texto | None = None
    fechaNacimiento: date
    telefono: Telefono
    domicilio: Domicilio
    correo: EmailStr = Field(max_length=254)
    aceptaAviso: Literal[True] = Field(description='El titular aceptó el aviso que le mostró el operador.')
    tutor: ContactoTutor | None = None
    motivo: Motivo

    @model_validator(mode='after')
    def validar_edad(self):
        hoy = date.today()
        if self.fechaNacimiento > hoy:
            raise ValueError('La fecha de nacimiento no puede estar en el futuro.')
        edad = hoy.year - self.fechaNacimiento.year - (
            (hoy.month, hoy.day) < (self.fechaNacimiento.month, self.fechaNacimiento.day)
        )
        if edad < 18 and self.tutor is None:
            raise ValueError('Para menores de 18 años se requiere el contacto del tutor.')
        if edad >= 18 and self.tutor is not None:
            raise ValueError('Una cuenta de adulto no lleva datos de tutor.')
        return self


class Resolucion(DatosBase):
    decision: Literal['persona_distinta', 'misma_persona']
    motivo: Motivo


class Cancelacion(DatosBase):
    motivo: Motivo


class ResultadoAlta(BaseModel):
    id: UUID
    correo: str
    estado: Literal['lista', 'en_revision', 'invitada', 'descartada', 'cancelada']
    candidatos: list[UUID] = Field(default_factory=list)
    invitacionEnviada: bool


@router.post('', status_code=201, response_model=ResultadoAlta)
def preparar_alta(datos: AltaAsistida, cliente: Cliente):
    """Sin posibles duplicados se envía la invitación; si los hay, queda en revisión."""
    registro = datos.model_dump(mode='json', exclude={'correo', 'motivo'}, exclude_none=True)
    solicitud = ejecutar(cliente, 'preparar', {'correo': str(datos.correo), 'registro': registro, 'motivo': datos.motivo})
    return responder(solicitud)


@router.get('')
def listar_solicitudes(cliente: Cliente, limite: int = Query(25, ge=1, le=100),
                       desplazamiento: int = Query(0, ge=0, le=100000)):
    """Solicitudes abiertas: listas para invitar o en revisión, con sus posibles duplicados."""
    return ejecutar(cliente, 'listar', {'limite': limite, 'desplazamiento': desplazamiento})


@router.post('/{solicitud_id}/resolver', response_model=ResultadoAlta)
def resolver_duplicado(solicitud_id: UUID, datos: Resolucion, cliente: Cliente):
    """'persona_distinta' habilita la invitación; 'misma_persona' cierra sin crear ni fusionar."""
    solicitud = ejecutar(cliente, 'resolver', {'id': str(solicitud_id), 'decision': datos.decision, 'motivo': datos.motivo})
    return responder(solicitud)


@router.post('/{solicitud_id}/cancelar', response_model=ResultadoAlta)
def cancelar_solicitud(solicitud_id: UUID, datos: Cancelacion, cliente: Cliente):
    solicitud = ejecutar(cliente, 'cancelar', {'id': str(solicitud_id), 'motivo': datos.motivo})
    return {**solicitud, 'invitacionEnviada': False}


@router.post('/{solicitud_id}/invitar', response_model=ResultadoAlta)
def reintentar_invitacion(solicitud_id: UUID, cliente: Cliente):
    """Reintenta el envío si falló. Solo para solicitudes listas que el operador puede ver."""
    solicitud, desplazamiento = None, 0
    while True:
        pagina = ejecutar(cliente, 'listar', {'limite': 100, 'desplazamiento': desplazamiento})
        solicitud = next((s for s in pagina if s['id'] == str(solicitud_id)), None)
        if solicitud or len(pagina) < 100:
            break
        desplazamiento += 100
    if not solicitud or solicitud['estado'] != 'lista':
        raise HTTPException(404, 'No hay una solicitud lista para invitar con ese identificador.')
    return responder({'id': solicitud['id'], 'correo': solicitud['correo'], 'estado': 'lista', 'candidatos': []})
