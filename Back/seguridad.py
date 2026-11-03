"""Validación de tokens y permisos de titulares."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente

bearer = HTTPBearer(auto_error=False)


def obtener_token(
    credenciales: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credenciales is None:
        raise HTTPException(status_code=401, detail="Se requiere iniciar sesión")
    return credenciales.credentials


def usuario_actual(token: str = Depends(obtener_token)):
    try:
        respuesta = crear_cliente().auth.get_user(token)
        if not respuesta.user:
            raise HTTPException(status_code=401, detail="Token inválido o vencido")
        return respuesta.user
    except HTTPException:
        raise
    except AuthApiError:
        raise HTTPException(status_code=401, detail="Token inválido o vencido") from None
    except Exception:
        raise HTTPException(status_code=503, detail="No fue posible verificar la sesión") from None


def titular_actual(usuario=Depends(usuario_actual)):
    rol = (usuario.app_metadata or {}).get("rol")
    if rol != "titular":
        raise HTTPException(status_code=403, detail="Acceso exclusivo para titulares")
    return usuario
