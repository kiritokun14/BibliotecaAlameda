"""Inicio, consulta y cierre de sesión."""

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, SecretStr
from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente
from Back.seguridad import obtener_token, usuario_actual

router = APIRouter(prefix="/api/auth", tags=["Autenticación y sesión"])


class IniciarSesion(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    correo: str = Field(
        min_length=5,
        max_length=254,
        pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$",
    )
    password: SecretStr = Field(min_length=1)


class CerrarSesion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    refresh_token: SecretStr = Field(min_length=1, max_length=16384)


@router.post("/login")
def iniciar_sesion(datos: IniciarSesion, respuesta: Response):
    """Autentica al usuario y devuelve tokens de sesión."""
    respuesta.headers["Cache-Control"] = "no-store"
    try:
        resultado = crear_cliente().auth.sign_in_with_password(
            {
                "email": datos.correo.strip(),
                "password": datos.password.get_secret_value(),
            }
        )
        if not resultado.session or not resultado.user:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        return {
            "access_token": resultado.session.access_token,
            "refresh_token": resultado.session.refresh_token,
            "token_type": "bearer",
            "expires_in": resultado.session.expires_in,
            "usuario": {
                "id": str(resultado.user.id),
                "correo": resultado.user.email,
            },
        }
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status == 429:
            raise HTTPException(status_code=429, detail="Demasiados intentos") from None
        if error.status in (400, 401, 403, 422):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas") from None
        raise HTTPException(status_code=503, detail="Servicio de autenticación no disponible") from None
    except Exception:
        raise HTTPException(status_code=503, detail="No fue posible iniciar sesión") from None


@router.get("/sesion")
def consultar_sesion(usuario=Depends(usuario_actual)):
    """Consulta la identidad asociada al token enviado."""
    return {
        "id": str(usuario.id),
        "correo": usuario.email,
        "autenticado": True,
    }


@router.post("/cerrar-sesion")
def cerrar_sesion(
    datos: CerrarSesion,
    respuesta: Response,
    token: str = Depends(obtener_token),
    usuario=Depends(usuario_actual),
):
    """Revoca la sesión autenticada mediante Supabase."""
    respuesta.headers["Cache-Control"] = "no-store"
    try:
        cliente = crear_cliente()
        sesion = cliente.auth.set_session(
            token,
            datos.refresh_token.get_secret_value(),
        )
        if not sesion.user or str(sesion.user.id) != str(usuario.id):
            raise HTTPException(status_code=401, detail="Sesión inválida")
        cliente.auth.sign_out()
        return {"mensaje": "Sesión cerrada correctamente"}
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status in (400, 401, 403):
            raise HTTPException(status_code=401, detail="Sesión inválida") from None
        raise HTTPException(status_code=503, detail="No fue posible cerrar la sesión") from None
    except Exception:
        raise HTTPException(status_code=503, detail="No fue posible cerrar la sesión") from None
