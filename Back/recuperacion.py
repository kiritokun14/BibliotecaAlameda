"""Recuperación adaptada de BOBA (0c7c1b4), sin claves privilegiadas."""
import os
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr
from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente

router = APIRouter(prefix='/auth', tags=['Recuperación de contraseña'])
MENSAJE = 'Si el correo está registrado, recibirás un enlace de recuperación.'

class SolicitudRecuperacion(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    correo: EmailStr = Field(max_length=254)

class RestablecerPassword(BaseModel):
    model_config = ConfigDict(extra='forbid')
    access_token: SecretStr = Field(min_length=1, max_length=16384)
    refresh_token: SecretStr = Field(min_length=1, max_length=16384)
    nueva_password: SecretStr = Field(min_length=8, max_length=128)

def fallo(error: AuthApiError):
    if error.status == 429 or error.code == 'over_email_send_rate_limit':
        raise HTTPException(429, 'Se alcanzó el límite de solicitudes o correos del proyecto. Espera antes de intentar otra vez.') from None
    if error.code in {'weak_password', 'same_password'}:
        raise HTTPException(422, 'Usa una contraseña diferente, de entre 8 y 128 caracteres.') from None
    if error.status in (400, 401, 403):
        raise HTTPException(401, 'La sesión no es válida. Solicita un nuevo enlace de recuperación.') from None
    raise HTTPException(503, 'El servicio de recuperación no está disponible. Intenta más tarde.') from None

@router.post('/recuperar', status_code=202)
def recuperar_password(datos: SolicitudRecuperacion, respuesta: Response):
    respuesta.headers['Cache-Control'] = 'no-store'
    try:
        cliente = crear_cliente()
        origen = os.getenv('FRONTEND_URL', 'http://localhost:5173').strip().rstrip('/')
        url = urlsplit(origen)
        if url.scheme not in {'http', 'https'} or not url.netloc or url.query or url.fragment or url.username or url.path:
            raise ValueError('Origen inválido')
        cliente.auth.reset_password_for_email(str(datos.correo), {
            'redirect_to': origen + '/auth/retorno?flujo=recuperacion',
        })
    except AuthApiError as error:
        if error.code not in {'user_not_found', 'email_not_found'}:
            if error.status == 429 or error.code == 'over_email_send_rate_limit':
                fallo(error)
            raise HTTPException(503, 'El servicio de recuperación no está disponible. Intenta más tarde.') from None
    except Exception:
        raise HTTPException(503, 'El servicio de recuperación no está disponible. Intenta más tarde.') from None
    return {'mensaje': MENSAJE}

@router.post('/restablecer')
def restablecer_password(datos: RestablecerPassword, respuesta: Response):
    respuesta.headers['Cache-Control'] = 'no-store'
    try:
        cliente = crear_cliente()
        sesion = cliente.auth.set_session(datos.access_token.get_secret_value(), datos.refresh_token.get_secret_value())
        if not sesion.session or not sesion.user:
            raise HTTPException(401, 'La sesión no es válida. Solicita un nuevo enlace de recuperación.')
        # Auth valida la identidad; nunca se recibe el usuario que se va a modificar.
        verificacion = cliente.auth.get_user()
        if not verificacion.user or verificacion.user.id != sesion.user.id:
            raise HTTPException(401, 'No fue posible verificar la sesión.')
        cliente.auth.update_user({'password': datos.nueva_password.get_secret_value()})
    except HTTPException:
        raise
    except AuthApiError as error:
        fallo(error)
    except Exception:
        raise HTTPException(503, 'No se pudo actualizar la contraseña. Intenta más tarde.') from None
    # El cambio ya ocurrió: si falla el cierre, no afirmar que falló la contraseña.
    cerradas = True
    try:
        cliente.auth.sign_out({'scope': 'global'})
    except Exception:
        cerradas = False
    return {'mensaje': 'Contraseña actualizada correctamente.', 'sesionesCerradas': cerradas}
