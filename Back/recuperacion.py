"""Recuperación de contraseña por enlace temporal de Supabase."""

import logging
import os
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, SecretStr
from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Recuperación de contraseña"])
MENSAJE = "Si el correo está registrado, recibirás un enlace de recuperación."


class SolicitudRecuperacion(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    correo: str = Field(
        min_length=5,
        max_length=254,
        pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$",
    )


class RestablecerPassword(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token_hash: SecretStr = Field(min_length=1, max_length=16384)
    nueva_password: SecretStr = Field(min_length=12, max_length=128)


@router.post("/recuperar", status_code=202)
def recuperar_password(datos: SolicitudRecuperacion, respuesta: Response):
    """Solicita el enlace de recuperación al correo registrado."""
    respuesta.headers["Cache-Control"] = "no-store"
    try:
        cliente = crear_cliente()
        destino = os.getenv("RESET_REDIRECT_URL", "").strip()
        url = urlsplit(destino)
        if (
            url.scheme not in {"http", "https"}
            or not url.netloc
            or url.username
            or url.password
            or url.fragment
        ):
            raise RuntimeError("RESET_REDIRECT_URL no está configurada correctamente")
        cliente.auth.reset_password_for_email(
            datos.correo.strip(), {"redirect_to": destino}
        )
    except AuthApiError as error:
        if error.code in {"user_not_found", "email_not_found"}:
            return {"mensaje": MENSAJE}
        if error.status == 429 or error.code == "over_email_send_rate_limit":
            raise HTTPException(status_code=429, detail="Demasiadas solicitudes") from None
        logger.warning("Supabase rechazó la solicitud de recuperación: %s", error.code)
        raise HTTPException(status_code=503, detail="Servicio de recuperación no disponible") from None
    except Exception:
        logger.exception("No se pudo solicitar recuperación")
        raise HTTPException(status_code=503, detail="Servicio de recuperación no disponible") from None
    return {"mensaje": MENSAJE}


@router.post("/restablecer")
def restablecer_password(datos: RestablecerPassword, respuesta: Response):
    """Verifica un token de recuperación y cambia la contraseña de esa cuenta."""
    respuesta.headers["Cache-Control"] = "no-store"
    try:
        cliente = crear_cliente()
        verificacion = cliente.auth.verify_otp({
            "token_hash": datos.token_hash.get_secret_value(),
            "type": "recovery",
        })
        if not verificacion.session or not verificacion.user:
            raise HTTPException(
                status_code=401,
                detail="Enlace inválido, vencido o utilizado",
            )
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status == 429:
            raise HTTPException(status_code=429, detail="Demasiados intentos") from None
        if error.status in (400, 401, 403, 422):
            raise HTTPException(
                status_code=401,
                detail="Enlace inválido, vencido o utilizado",
            ) from None
        raise HTTPException(status_code=503, detail="No fue posible validar el enlace") from None
    except Exception:
        logger.exception("No se pudo verificar el enlace")
        raise HTTPException(status_code=503, detail="No fue posible validar el enlace") from None

    try:
        cliente.auth.update_user({
            "password": datos.nueva_password.get_secret_value(),
        })
    except AuthApiError as error:
        if error.code in {"weak_password", "same_password"} or error.status == 422:
            raise HTTPException(status_code=422, detail="Contraseña no aceptada") from None
        if error.status in (400, 401, 403):
            raise HTTPException(status_code=400, detail="Contraseña no aceptada") from None
        raise HTTPException(status_code=503, detail="No se pudo cambiar la contraseña") from None
    except Exception:
        logger.exception("No se pudo actualizar la contraseña")
        raise HTTPException(status_code=503, detail="No se pudo cambiar la contraseña") from None

    sesiones_cerradas = True
    try:
        cliente.auth.sign_out()
    except Exception:
        sesiones_cerradas = False
        logger.warning("La contraseña se cambió, pero no se confirmó el cierre de sesión")
    return {
        "mensaje": "Contraseña actualizada correctamente",
        "sesionesCerradas": sesiones_cerradas,
    }
