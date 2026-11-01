<<<<<<< HEAD
﻿"""Módulo para consultar el historial de solicitudes propias del usuario autenticado.

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
=======
"""T-034 de Stephanie, adaptada desde c0f56e8 al backend integrado.

Consulta de solicitudes propias y estados actuales. No crea solicitudes ni
inventa una bitácora de cambios que las tablas consultadas no almacenan.
"""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from Back.administracion import ejecutar
from Back.conexion import crear_cliente

router = APIRouter(prefix='/mis-solicitudes', tags=['Solicitudes propias (T-034)'])
seguridad = HTTPBearer(auto_error=False)


def sesion_solicitudes(
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(seguridad)],
):
    if credenciales is None or credenciales.scheme.lower() != 'bearer':
        raise HTTPException(401, 'Se requiere una sesión válida.', headers={'WWW-Authenticate': 'Bearer'})
    try:
        # Un cliente por petición, sin compartir sesiones entre personas.
        cliente = crear_cliente()
        usuario = cliente.auth.get_user(credenciales.credentials)
        if not usuario or not usuario.user:
            raise HTTPException(401, 'La sesión no es válida o expiró.')
        cliente.postgrest.auth(credenciales.credentials)
        # Esta operación no exige ser administrador: valida sesión vigente,
        # perfil activo y correo confirmado en la BD con el mismo token.
        acceso = ejecutar(cliente, 'mi_acceso')
        usuario_id = str(UUID(acceso['usuarioId']))
        if usuario_id != str(usuario.user.id):
            raise HTTPException(503, 'No fue posible comprobar la sesión.')
        return cliente, usuario_id
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status in (400, 401, 403):
            raise HTTPException(401, 'La sesión no es válida o expiró.') from None
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None


class SolicitudEspacioResponse(BaseModel):
    id: UUID
>>>>>>> main
    propositoVisita: str
    cantidadPersonas: int
    fechaInicioSolicitado: datetime
    fechaFinSolicitado: datetime
    estadoSolicitud: str
<<<<<<< HEAD
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
=======
    observaciones: str | None = None
    creadaEn: datetime


class SolicitudCredencialResponse(BaseModel):
    id: UUID
    tipoSolicitud: str
    estadoSolicitud: str
    fechaCita: datetime | None = None
    observaciones: str | None = None
    creadaEn: datetime


class PropuestaEventoResponse(BaseModel):
    id: UUID
>>>>>>> main
    tituloPropuesta: str
    descripcion: str
    tipoPropuesta: str
    estadoRevision: str
<<<<<<< HEAD
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
=======
    observacionesInstitucionales: str | None = None
    creadaEn: datetime


class TotalesSolicitudes(BaseModel):
    solicitudes_espacio: int
    solicitudes_credencial: int
    propuestas_eventos: int


class HistorialSolicitudesResponse(BaseModel):
    status: Literal['success'] = 'success'
    total_solicitudes: int
    solicitudes_espacio: list[SolicitudEspacioResponse]
    solicitudes_credencial: list[SolicitudCredencialResponse]
    propuestas_eventos: list[PropuestaEventoResponse]
    totales_por_tipo: TotalesSolicitudes
    limite_por_tipo: int
    desplazamiento_por_tipo: int


# Proyecciones explícitas: no devolver columnas personales o internas nuevas
# cuando se amplíen las tablas. El propietario procede de la sesión, nunca del navegador.
CONSULTAS = (
    ('solicitudes_espacio', 'solicitudEspacio', 'solicitadoPor',
     'id,propositoVisita,cantidadPersonas,fechaInicioSolicitado,fechaFinSolicitado,estadoSolicitud,observaciones,creadaEn'),
    ('solicitudes_credencial', 'solicitudCredencial', 'usuarioId',
     'id,tipoSolicitud,estadoSolicitud,fechaCita,observaciones,creadaEn'),
    ('propuestas_eventos', 'propuestaEvento', 'propuestoPor',
     'id,tituloPropuesta,descripcion,tipoPropuesta,estadoRevision,observacionesInstitucionales,creadaEn'),
)


@router.get('', response_model=HistorialSolicitudesResponse,
            summary='Consultar solicitudes propias y su estado',
            description='Lista espacios, credenciales y propuestas del titular. '
                        'La paginación se aplica por separado a cada categoría; '
                        'los totales incluyen todos sus registros, no solo la página. '
                        'No devuelve una bitácora de transiciones de estado.')
def obtener_historial_solicitudes_propias(
    respuesta: Response,
    sesion: Annotated[tuple, Depends(sesion_solicitudes)],
    limite: int = Query(25, ge=1, le=100, description='Máximo de registros por categoría.'),
    desplazamiento: int = Query(0, ge=0, le=100000, description='Registros omitidos por categoría.'),
):
    cliente, usuario_id = sesion
    respuesta.headers['Cache-Control'] = 'private, no-store'
    resultados = {}
    totales = {}
    try:
        # El cliente es síncrono: FastAPI ejecuta esta función en su grupo de hilos,
        # sin bloquear el bucle asíncrono mientras espera a Supabase.
        for clave, tabla, propietario, columnas in CONSULTAS:
            try:
                consulta = (cliente.table(tabla).select(columnas, count='exact')
                            .eq(propietario, usuario_id).order('creadaEn', desc=True)
                            .order('id', desc=True).range(desplazamiento, desplazamiento + limite - 1)
                            .execute())
            except APIError as error:
                if error.code != 'PGRST103':
                    raise
                # PostgREST puede responder 416 al solicitar una página posterior
                # al último registro. Recontar solo lo propio, sin interpretar texto de errores.
                conteo = (cliente.table(tabla).select('id', count='exact', head=True)
                          .eq(propietario, usuario_id).execute()).count
                if conteo is None or desplazamiento < conteo:
                    raise
                resultados[clave] = []
                totales[clave] = conteo
                continue
            if consulta.count is None or not isinstance(consulta.data, list):
                raise HTTPException(503, 'No fue posible consultar tus solicitudes.')
            resultados[clave] = consulta.data
            totales[clave] = consulta.count
        return HistorialSolicitudesResponse.model_validate({
            'total_solicitudes': sum(totales.values()), **resultados,
            'totales_por_tipo': totales, 'limite_por_tipo': limite,
            'desplazamiento_por_tipo': desplazamiento,
        })
    except HTTPException:
        raise
    except APIError as error:
        if error.code in ('PGRST301', 'PGRST302', 'PGRST303'):
            raise HTTPException(401, 'La sesión no es válida o expiró.') from None
        if error.code == '42501':
            raise HTTPException(403, 'No tienes acceso a estas solicitudes.') from None
        raise HTTPException(503, 'No fue posible consultar tus solicitudes.') from None
    except Exception:
        # No devolver consultas, tokens, datos recibidos ni errores internos.
        raise HTTPException(503, 'No fue posible consultar tus solicitudes.') from None
>>>>>>> main
