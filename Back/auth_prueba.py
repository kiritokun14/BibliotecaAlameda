from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from conexion import crear_cliente

supabase = crear_cliente()
router = APIRouter(prefix="/auth", tags=["Autenticación"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login", status_code=status.HTTP_200_OK)
async def iniciar_sesion(credenciales: LoginRequest):
    try:
        # Autenticación directa en Supabase Auth con email y password
        res = supabase.auth.sign_in_with_password(
            {
                "email": credenciales.email,
                "password": credenciales.password,
            }
        )

        if not res or not res.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas.",
            )

        # Retorna el access_token exclusivo del usuario
        return {
            "status": "success",
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "expires_in": res.session.expires_in,
            "user_id": res.user.id,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error al iniciar sesión: {str(e)}",
        )