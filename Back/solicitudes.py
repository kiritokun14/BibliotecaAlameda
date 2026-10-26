"""Módulo para consultar el historial de solicitudes propias del usuario autenticado.

Este módulo expone un endpoint protegido que valida el token de sesión del usuario,
identifica su ID real en Supabase y devuelve únicamente las solicitudes, credenciales
solicitadas y propuestas de evento asociadas a ese usuario.
"""

from datetime import datetime
from typing import List, Optional
import os

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()

router = APIRouter(prefix="/mis-solicitudes", tags=["Solicitudes Propias (Tarea 34)"])


# ============================================================================== 
# ESQUEMAS DE RESPUESTA (PYDANTIC V2)
# ==============================================================================
class SolicitudEspacioResponse(BaseModel):
    """Representa una solicitud de uso de espacio registrada por un usuario."""

    id: str
    propositoVisita: str
    cantidadPersonas: int
    fechaInicioSolicitado: datetime
    fechaFinSolicitado: datetime
    estadoSolicitud: str
    observaciones: Optional[str] = None
    creadaEn: datetime

    model_config = ConfigDict(from_attributes=True)


class SolicitudCredencialResponse(BaseModel):
    """Representa una solicitud de credencial emitida por el usuario."""

    id: str
    tipoSolicitud: str
    estadoSolicitud: str
    fechaCita: Optional[datetime] = None
    observaciones: Optional[str] = None
    creadaEn: datetime

    model_config = ConfigDict(from_attributes=True)


class PropuestaEventoResponse(BaseModel):
    """Representa una propuesta de evento enviada por un usuario."""

    id: str
    tituloPropuesta: str
    descripcion: str
    tipoPropuesta: str
    estadoRevision: str
    observacionesInstitucionales: Optional[str] = None
    creadaEn: datetime

    model_config = ConfigDict(from_attributes=True)


class HistorialSolicitudesResponse(BaseModel):
    """Estructura completa del historial de solicitudes del usuario autenticado."""

    status: str
    total_solicitudes: int
    solicitudes_espacio: List[SolicitudEspacioResponse]
    solicitudes_credencial: List[SolicitudCredencialResponse]
    propuestas_eventos: List[PropuestaEventoResponse]


# ============================================================================== 
# ENDPOINT PRIVADO: CONSULTA DE HISTORIAL PROPIO
# ==============================================================================
@router.get(
    "",
    response_model=HistorialSolicitudesResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar estado e historial de solicitudes propias",
    description="Obtiene únicamente las solicitudes del usuario autenticado mediante su token de sesión.",
)
async def obtener_historial_solicitudes_propias(
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """Devuelve el historial completo de solicitudes asociadas al usuario autenticado.

    Requiere un encabezado Authorization: Bearer con token. El servicio valida el
    token en Supabase y filtra cada tabla por el UUID del usuario autenticado para
    evitar exponer información ajena.
    """

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso denegado. Debe incluir un token de sesión en la cabecera Authorization (Bearer).",
        )

    token = authorization.split(" ")[1]

    try:
        # Inicializa el cliente de Supabase y asocia el token de acceso del usuario.
        client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
        client.postgrest.auth(token)

        # Valida el token en Supabase Auth y obtiene el identificador real del usuario.
        user_response = client.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de sesión inválido o expirado.",
            )

        authenticated_user_id = user_response.user.id

        # Consulta cada entidad y restringe los resultados exclusivamente al usuario autenticado.
        espacios_res = (
            client.table("solicitudEspacio")
            .select("*")
            .eq("solicitadoPor", authenticated_user_id)
            .order("creadaEn", desc=True)
            .execute()
        )

        credenciales_res = (
            client.table("solicitudCredencial")
            .select("*")
            .eq("usuarioId", authenticated_user_id)
            .order("creadaEn", desc=True)
            .execute()
        )

        propuestas_res = (
            client.table("propuestaEvento")
            .select("*")
            .eq("propuestoPor", authenticated_user_id)
            .order("creadaEn", desc=True)
            .execute()
        )

        solicitudes_espacio = espacios_res.data or []
        solicitudes_credencial = credenciales_res.data or []
        propuestas_eventos = propuestas_res.data or []

        return {
            "status": "success",
            "total_solicitudes": (
                len(solicitudes_espacio)
                + len(solicitudes_credencial)
                + len(propuestas_eventos)
            ),
            "solicitudes_espacio": solicitudes_espacio,
            "solicitudes_credencial": solicitudes_credencial,
            "propuestas_eventos": propuestas_eventos,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar el historial de solicitudes: {str(e)}",
        )
