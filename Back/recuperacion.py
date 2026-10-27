
import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente

router = APIRouter(
    prefix="/api/auth",
    tags=["Recuperación de contraseña"]
)

logger = logging.getLogger(__name__)


class SolicitudRecuperacion(BaseModel):   #coreo e inclusion de caracteres especiales. :b
    correo: str = Field(
        min_length=5,
        max_length=254,
        pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    )


class RestablecerPassword(BaseModel):
    access_token: str = Field(min_length=1)
    refresh_token: str = Field(min_length=1)
    nueva_password: str = Field(min_length=12, max_length=128)


# parte de envio de enlaces para restablecer la contra.
@router.post("/recuperar")
def recuperar_password(datos: SolicitudRecuperacion):
    try:
        cliente = crear_cliente()

        destino = os.getenv("RESET_REDIRECT_URL", "").strip()
        if not destino:
            raise RuntimeError("Falta RESET_REDIRECT_URL")

        cliente.auth.reset_password_for_email(
            datos.correo.strip(),
            {"redirect_to": destino}
        )

    except AuthApiError as error:
        if error.status == 429:
            raise HTTPException(
                status_code=429,
                detail="Demasiadas solicitudes. Intenta más tarde."
            ) from None

        # No revelar si el correo existe.
        logger.warning(
            "Fallo de recuperación: %s",
            error.code
        )

    except Exception:
        logger.exception("Fallo al solicitar recuperación")
        raise HTTPException(
            status_code=503,
            detail="Servicio de recuperación no disponible"
        ) from None

    return {
        "mensaje": (
            "Si el correo está registrado, "
            "recibirás un enlace de recuperación."
        )
    }


# CA-07.1 y CA-07.2
@router.post("/restablecer")
def restablecer_password(datos: RestablecerPassword):
    try:
        cliente = crear_cliente()

        # Validar los tokens de la sesión
        cliente.auth.set_session(
            datos.access_token,
            datos.refresh_token
        )

        # Cambiar contraseña de la cuenta existente
        cliente.auth.update_user({
            "password": datos.nueva_password
        })

        # Cerrar sesiones después del cambio
        cliente.auth.sign_out()

        return {
            "mensaje": "Contraseña actualizada correctamente"
        }

    except AuthApiError as error:
        if error.status in (400, 401, 403):
            raise HTTPException(
                status_code=401,
                detail="Sesión inválida o contraseña no aceptada"
            ) from None

        if error.status == 422:
            raise HTTPException(
                status_code=400,
                detail="La contraseña no cumple los requisitos"
            ) from None

        raise HTTPException(
            status_code=503,
            detail="No se pudo completar la recuperación"
        ) from None

    except Exception:
        logger.exception("Error al restablecer contraseña")
        raise HTTPException(
            status_code=503,
            detail="Error interno al restablecer contraseña"
        ) from None

