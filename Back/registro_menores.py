"""Módulo de autenticación y registro de usuarios para la API del Sistema Bibliotecario.

Integra la firma con Supabase Auth alimentando el objeto metadata 'registro'
esperado por la función de trigger PL/pgSQL 'crear_perfil_autorregistro'.
"""

"""Instalar email-validator para validar correos electrónicos en Pydantic:
    pip install email-validator
    
    Colocar en requirements.txt:
    email-validator"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

# Importación local de la conexión a Supabase
from conexion import crear_cliente

supabase = crear_cliente()
router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])


# ------------------------------------------------------------------
# ESQUEMAS PYDANTIC V2
# ------------------------------------------------------------------
class DomicilioSchema(BaseModel):
    calle: str
    numeroExterior: str
    numeroInterior: Optional[str] = None
    coloniaLocalidad: str
    codigoPostal: str
    municipio: str
    estadoProvincia: str = "Nayarit"


class ContactoTutorSchema(BaseModel):
    nombres: str
    apellidos: str
    telefono: str
    correo: EmailStr
    relacion: str  # 'madre', 'padre' o 'tutor'
    domicilio: DomicilioSchema


class RegistroUsuarioSchema(BaseModel):
    nombres: str
    primerApellido: str
    segundoApellido: Optional[str] = None
    fechaNacimiento: str  # YYYY-MM-DD
    telefono: str
    correo: EmailStr
    password: str = Field(..., min_length=8)
    confirmarPassword: str = Field(..., min_length=8)
    aceptaAviso: bool
    domicilio: DomicilioSchema
    tutor: Optional[ContactoTutorSchema] = None


# ------------------------------------------------------------------
# FUNCIÓN AUXILIAR: VERIFICAR MENORÍA DE EDAD
# ------------------------------------------------------------------
def es_menor_de_edad(fecha_nacimiento_str: str) -> bool:
    try:
        nac = date.fromisoformat(fecha_nacimiento_str)
        hoy = date.today()
        edad = hoy.year - nac.year - ((hoy.month, hoy.day) < (nac.month, nac.day))
        return edad < 18
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El formato de fechaNacimiento debe ser YYYY-MM-DD.",
        )


# ------------------------------------------------------------------
# ENDPOINT DE REGISTRO
# ------------------------------------------------------------------
@router.post("/registro", status_code=status.HTTP_201_CREATED)
async def registrar_usuario(datos: RegistroUsuarioSchema):

    if datos.password != datos.confirmarPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las contraseñas no coinciden.",
        )

    if not datos.aceptaAviso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere aceptar el aviso de privacidad.",
        )

    es_menor = es_menor_de_edad(datos.fechaNacimiento)

    if es_menor and not datos.tutor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Al ser menor de edad, se requiere el contacto del tutor.",
        )

    # Construcción de la carga útil del campo 'registro' que exige el trigger
    payload_registro = {
        "nombres": datos.nombres.strip(),
        "primerApellido": datos.primerApellido.strip(),
        "fechaNacimiento": datos.fechaNacimiento,
        "telefono": datos.telefono.strip(),
        "aceptaAviso": datos.aceptaAviso,
        "domicilio": datos.domicilio.model_dump(exclude_none=True),
    }

    if datos.segundoApellido and datos.segundoApellido.strip():
        payload_registro["segundoApellido"] = datos.segundoApellido.strip()

    if es_menor and datos.tutor:
        payload_registro["tutor"] = datos.tutor.model_dump(exclude_none=True)

    try:
        # Petición a Supabase Auth pasando 'registro' dentro del user_metadata
        auth_res = supabase.auth.sign_up(
            {
                "email": datos.correo,
                "password": datos.password,
                "options": {
                    "data": {
                        "registro": payload_registro
                    }
                },
            }
        )

        if not auth_res or not auth_res.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo crear la cuenta en Supabase Auth.",
            )

        return {
            "status": "success",
            "mensaje": "Usuario y perfil creados exitosamente por el trigger.",
            "user_id": auth_res.user.id,
        }

    except Exception as e:
        import traceback
        print("\n--- TRACEBACK ERROR REGISTRO ---")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar el registro: {str(e)}",
        )