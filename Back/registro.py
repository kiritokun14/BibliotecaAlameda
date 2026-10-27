"""Autorregistro CU-05 / HU-05. Nunca devuelve contraseñas, tokens o perfiles.
   Todo esot se va hacer para las cuentas de los usuarios."""

from datetime import date
import os
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, StringConstraints, model_validator
from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente

Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
Telefono = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r'^[0-9]{10}$')]
CodigoPostal = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r'^[0-9]{5}$')]


class DatosBase(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Domicilio(DatosBase):
    calle: Texto
    numeroExterior: Texto = Field(description='Número exterior o sin número.')
    numeroInterior: Texto | None = None
    coloniaLocalidad: Texto
    codigoPostal: CodigoPostal
    municipio: Texto
    estadoProvincia: Texto


class ContactoTutor(DatosBase):
    nombres: Texto
    apellidos: Texto
    telefono: Telefono
    correo: EmailStr = Field(max_length=254)
    domicilio: Domicilio
    relacion: Literal['madre', 'padre', 'tutor']


class SolicitudRegistro(DatosBase):
    nombres: Texto
    primerApellido: Texto
    segundoApellido: Texto | None = None
    fechaNacimiento: date
    telefono: Telefono
    domicilio: Domicilio
    correo: EmailStr = Field(max_length=254)
    contrasena: SecretStr = Field(min_length=8, max_length=128)
    aceptaAviso: Literal[True] = Field(description='Aceptación del aviso mostrado al titular.')
    tutor: ContactoTutor | None = None

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
            raise ValueError('El autorregistro de adultos no requiere datos de tutor.')
        return self

    def datos_para_auth(self) -> dict:
        datos = self.model_dump(mode='json', exclude={'correo', 'contrasena'}, exclude_none=True)
        # El UUID del perfil y la fecha de aceptación los fija la BD.
        return {'registro': datos}


class ResultadoRegistro(BaseModel):
    estado: Literal['verificacion_requerida'] = 'verificacion_requerida'
    mensaje: str = (
        'Revisa tu correo para continuar. Si ya tienes una cuenta, inicia sesión '
        'o utiliza la recuperación de acceso. Puedes solicitar un nuevo enlace si es necesario.'
    )


router = APIRouter(prefix='/cuentas', tags=['Autorregistro'])


@router.get('/configuracion')
def configuracion_publica():
    """Solo configuración publicable para el cliente de Auth del navegador."""
    load_dotenv(Path(__file__).with_name('.env'))
    url = os.getenv('SUPABASE_URL', '').strip()
    clave = os.getenv('SUPABASE_PUBLISHABLE_KEY', '').strip()
    if not url.startswith('https://') or not clave.startswith('sb_publishable_'):
        raise HTTPException(503, 'La conexión todavía no está configurada.')
    return {'url': url, 'clavePublicable': clave}


@router.post('/registro', status_code=202, response_model=ResultadoRegistro)
def registrar_usuario(solicitud: SolicitudRegistro):
    load_dotenv(Path(__file__).with_name('.env'))
    if os.getenv('REGISTRO_HABILITADO', 'false').lower() != 'true':
        raise HTTPException(503, 'El registro todavía no está habilitado.')
    try:
        # Un cliente nuevo por solicitud evita compartir sesiones entre personas.
        cliente = crear_cliente()
        cliente.auth.sign_up({
            'email': str(solicitud.correo),
            'password': solicitud.contrasena.get_secret_value(),
            'options': {
                'data': solicitud.datos_para_auth(),
                'email_redirect_to': os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
                    + '/auth/retorno?flujo=confirmacion',
            },
        })
    except AuthApiError as error:
        codigo = getattr(error, 'code', '')
        if codigo in {'user_already_exists', 'email_exists'}:
            return ResultadoRegistro()
        if codigo == 'over_email_send_rate_limit':
            raise HTTPException(429, 'Se alcanzó el límite de correos de verificación del proyecto. '
                                'Espera a que se restablezca antes de intentar de nuevo; no es un error de contraseña.') from None
        if error.status == 429:
            raise HTTPException(429, 'Espera antes de volver a intentar el registro.') from None
        if codigo in {'weak_password', 'email_address_invalid', 'validation_failed'}:
            raise HTTPException(422, 'Revisa el correo y los requisitos de la contraseña.') from None
        raise HTTPException(503, 'No fue posible procesar el registro. Intenta más tarde.') from None
    except Exception:
        # No imprimir excepciones: podrían contener datos de Auth o del solicitante.
        raise HTTPException(503, 'No fue posible procesar el registro. Intenta más tarde.') from None
    return ResultadoRegistro()
