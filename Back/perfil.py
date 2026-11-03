"""Consulta y edición de campos autorizados del perfil propio."""

import logging
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field

from Back.conexion import crear_cliente
from Back.seguridad import obtener_token, titular_actual

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/perfil", tags=["Perfil personal"])


class EditarPerfil(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    telefono: str | None = Field(default=None, pattern=r"^[0-9+\-\s()]{7,25}$")


def datos_perfil(usuario):
    """Devuelve información del usuario verificado, sin campos sensibles."""
    datos = usuario.user_metadata or {}
    protegidos = usuario.app_metadata or {}
    return {
        "id": str(usuario.id),
        "correo": usuario.email,
        "nombre": datos.get("nombre"),
        "telefono": datos.get("telefono"),
        "rol": protegidos.get("rol"),
        "credencial": protegidos.get("credencial"),
    }


@router.get("")
def consultar_perfil(usuario=Depends(titular_actual)):
    """Consulta únicamente el perfil de la cuenta autenticada."""
    return datos_perfil(usuario)


@router.patch("")
def editar_perfil(
    datos: EditarPerfil,
    respuesta: Response,
    token: str = Depends(obtener_token),
    usuario=Depends(titular_actual),
):
    """Actualiza nombre y teléfono, sin permitir cambios de rol o credencial."""
    respuesta.headers["Cache-Control"] = "no-store"
    cambios = datos.model_dump(exclude_none=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="No se proporcionaron cambios")

    try:
        cliente = crear_cliente()
        url = os.environ["SUPABASE_URL"].rstrip("/") + "/auth/v1/user"
        clave = os.environ["SUPABASE_PUBLISHABLE_KEY"]

        with httpx.Client(timeout=10) as http:
            resultado = http.put(
                url,
                headers={
                    "apikey": clave,
                    "Authorization": f"Bearer {token}",
                },
                json={"data": cambios},
            )

        if resultado.status_code in (401, 403):
            raise HTTPException(status_code=401, detail="Sesión inválida")
        if resultado.status_code in (400, 422):
            raise HTTPException(status_code=422, detail="Datos de perfil no aceptados")
        if resultado.status_code != 200:
            raise HTTPException(status_code=503, detail="No fue posible actualizar el perfil")

        actualizado = cliente.auth.get_user(token)
        if not actualizado.user or str(actualizado.user.id) != str(usuario.id):
            raise HTTPException(status_code=401, detail="No fue posible verificar la cuenta")
        return {
            "mensaje": "Perfil actualizado correctamente",
            "perfil": datos_perfil(actualizado.user),
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("No se pudo actualizar el perfil")
        raise HTTPException(status_code=503, detail="Servicio de perfil no disponible") from None
