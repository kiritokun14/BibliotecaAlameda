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
    propositoVisita: str
    cantidadPersonas: int
    fechaInicioSolicitado: datetime
    fechaFinSolicitado: datetime
    estadoSolicitud: str
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
    tituloPropuesta: str
    descripcion: str
    tipoPropuesta: str
    estadoRevision: str
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
