"""T-076 / HU-16. Solicitudes de visita o uso de espacio.

Persona usuaria (/espacios/solicitudes): cualquier cuenta con sesión puede enviar una solicitud;
no se exige credencial (CA-16.1). Enviarla no reserva el espacio: queda en revisión (CA-16.2).
Solo ve, cancela y responde las propias (public.solicitudes_espacio).

Personal (/espacios/atencion): cuentas con la capacidad 'registrar_resoluciones_actividades',
la misma del panel /admin/atencion/espacios. Aprueba, propone otro espacio/fecha, rechaza o
cancela; la BD guarda quién lo hizo y no aprueba dos solicitudes en el mismo horario
(public.atender_solicitudes_espacio, ver Supabase/espacios_personal.sql).
"""

from datetime import date, time
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import AwareDatetime, Field, StringConstraints
from postgrest.exceptions import APIError

from Back.contenidos import sesion_editor as sesion_cuenta
from Back.registro import DatosBase

router = APIRouter(prefix='/espacios', tags=['Solicitudes de espacio (T-076)'])

TipoSolicitud = Literal['visita', 'uso_espacio']
EstadoFiltro = Literal['en_revision', 'requiere_correccion', 'aprobada', 'rechazada', 'cancelada']
RPC_USUARIO = 'solicitudes_espacio'
RPC_PERSONAL = 'atender_solicitudes_espacio'
Folio = Annotated[str, Path(pattern=r'^SE-[0-9]{4,}$', max_length=20)]
Slug = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r'^[a-z0-9-]{1,80}$')]
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
Institucion = Annotated[str, StringConstraints(strip_whitespace=True, max_length=150)]
MotivoCancelacion = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
Comentarios = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]
MotivoDecision = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Mensaje = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Condiciones = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Busqueda = Annotated[str, StringConstraints(strip_whitespace=True, max_length=80)]

# La validación de sesión es la misma que la del editor: la BD revisa el token.
Cliente = Annotated[object, Depends(sesion_cuenta)]

# Mensajes de la BD que se pueden mostrar tal cual (no traen datos internos).
MENSAJES_VISIBLES = (
    'Elige el área que quieres solicitar.',
    'El área no existe o no se puede solicitar.',
    'La hora de término debe ser después de la de inicio.',
    'Elige una fecha y hora futuras.',
    'Solo se reciben solicitudes para los próximos 12 meses.',
    'El número de personas debe estar entre 1 y 200.',
    'El área admite hasta ',
    'Describe la actividad en 300 caracteres o menos.',
    'Revisa la fecha, el horario y el número de personas.',
    'Ya tienes 5 solicitudes en revisión. Espera respuesta o cancela alguna.',
    'Esta solicitud ya no se puede cancelar desde aquí.',
    'Esta solicitud no tiene una propuesta por responder.',
    'Indica si aceptas la propuesta.',
    # Personal
    'Solo se aprueba una solicitud en revisión.',
    'Marca todos los puntos de disponibilidad antes de aprobar.',
    'La fecha de la solicitud ya pasó. Propón otra fecha.',
    'El área ya no está disponible. Propón otra.',
    'El área ya está ocupada en ese horario. Propón otro.',
    'Esta solicitud no admite una propuesta en su estado actual.',
    'Explica a la persona el motivo del cambio.',
    'Indica el espacio, la fecha o el horario que propones.',
    'Revisa la fecha y el horario.',
    'La propuesta es igual a lo que ya está registrado.',
    'Elige un motivo.',
    'Escribe un mensaje para la persona.',
    'Esta solicitud ya no se puede rechazar.',
    'Solo se cancela aquí una solicitud aprobada.',
)


def _mensaje(error: APIError, por_defecto: str) -> str:
    texto = (error.message or '').strip()
    return texto if texto.startswith(MENSAJES_VISIBLES) else por_defecto


def ejecutar(cliente, operacion: str, datos: dict, funcion: str = RPC_USUARIO):
    try:
        return cliente.rpc(funcion, {'operacion': operacion, 'datos': datos}).execute().data
    except APIError as error:
        if error.code == '42501':
            if (error.message or '').startswith('Sin permiso'):
                raise HTTPException(403, 'No tienes permiso para atender solicitudes de espacio.') from None
            raise HTTPException(403, 'Tu sesión ya no está vigente. Vuelve a iniciar sesión.') from None
        if error.code == 'P0002':
            raise HTTPException(404, 'No se encontró la solicitud.') from None
        if error.code == '55000':
            raise HTTPException(409, _mensaje(error, 'La solicitud no se puede cambiar en su estado actual.')) from None
        if error.code == '40001':
            raise HTTPException(409, 'La solicitud cambió. Recarga el detalle antes de decidir.') from None
        if error.code == '23514':
            raise HTTPException(422, _mensaje(error, 'Revisa los datos de la solicitud.')) from None
        if error.code in ('22023', '22001', '22P02'):
            raise HTTPException(422, 'Revisa los datos enviados.') from None
        raise HTTPException(503, 'No fue posible completar la operación.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible completar la operación.') from None


class NuevaSolicitud(DatosBase):
    tipo: TipoSolicitud = 'uso_espacio'
    # Mismo nombre que espera la pantalla de Aldahir (datosSesion.ts): el slug del área.
    areaId: Slug | None = Field(default=None, description='Slug del área. Obligatorio para uso de espacio.')
    fecha: date
    horaInicio: time
    horaFin: time
    personas: int = Field(ge=1, le=200)
    motivo: Motivo
    institucion: Institucion | None = None


class Cancelacion(DatosBase):
    motivo: MotivoCancelacion | None = None
    comentarios: Comentarios | None = None


class Respuesta(DatosBase):
    acepta: bool = Field(description='true acepta la propuesta del personal; false pide que se revise de nuevo.')
    comentarios: Comentarios | None = None


class VersionSolicitud(DatosBase):
    actualizadoEn: AwareDatetime


class Aprobacion(VersionSolicitud):
    # Lista de cotejo de disponibilidad de la pantalla; todas deben estar marcadas.
    verificacion: list[Literal[True]] = Field(min_length=4, max_length=4)
    condiciones: Condiciones | None = None
    mensaje: Mensaje | None = None


class Propuesta(VersionSolicitud):
    # Solo se envía lo que cambia; lo demás se conserva de la solicitud.
    areaId: Slug | None = None
    fecha: date | None = None
    horaInicio: time | None = None
    horaFin: time | None = None
    mensaje: Mensaje


class Decision(VersionSolicitud):
    motivo: MotivoDecision
    mensaje: Mensaje


def _horario(cuerpo: dict, datos) -> dict:
    if 'areaId' in cuerpo:
        cuerpo['espacio'] = cuerpo.pop('areaId')
    for campo in ('horaInicio', 'horaFin'):
        if getattr(datos, campo) is not None:
            cuerpo[campo] = getattr(datos, campo).strftime('%H:%M')
    return cuerpo


@router.get('/areas')
def areas(cliente: Cliente):
    """Áreas activas que se pueden solicitar (slug, nombre, capacidad y descripción)."""
    return ejecutar(cliente, 'areas', {})


@router.post('/solicitudes', status_code=201)
def enviar(datos: NuevaSolicitud, cliente: Cliente):
    """Envía la solicitud. Queda 'en_revision'; no reserva el espacio. La respuesta trae el folio."""
    return ejecutar(cliente, 'enviar', _horario(datos.model_dump(mode='json', exclude_none=True), datos))


@router.get('/solicitudes')
def listar(cliente: Cliente, estado: EstadoFiltro | None = None,
           limite: int = Query(25, ge=1, le=100), desplazamiento: int = Query(0, ge=0, le=100000)):
    """Mis solicitudes de espacio, de la más reciente a la más antigua."""
    datos: dict = {'limite': limite, 'desplazamiento': desplazamiento}
    if estado:
        datos['estado'] = estado
    return ejecutar(cliente, 'listar', datos)


@router.get('/solicitudes/{folio}')
def obtener(folio: Folio, cliente: Cliente):
    """Una solicitud propia con su historial."""
    return ejecutar(cliente, 'obtener', {'folio': folio})


@router.post('/solicitudes/{folio}/cancelacion')
def cancelar(folio: Folio, datos: Cancelacion, cliente: Cliente):
    """Cancela una solicitud propia mientras está en revisión. No se puede deshacer."""
    return ejecutar(cliente, 'cancelar', {**datos.model_dump(exclude_none=True), 'folio': folio})


@router.post('/solicitudes/{folio}/respuesta')
def responder(folio: Folio, datos: Respuesta, cliente: Cliente):
    """Responde la propuesta del personal. En ambos casos la solicitud vuelve a revisión."""
    return ejecutar(cliente, 'responder', {**datos.model_dump(exclude_none=True), 'folio': folio})


# ---------------------------------------------------------------------------
# Personal: /admin/atencion/espacios
# ---------------------------------------------------------------------------
@router.get('/atencion/solicitudes')
def bandeja(cliente: Cliente, estado: EstadoFiltro | None = None, buscar: Busqueda | None = None,
            limite: int = Query(25, ge=1, le=100), desplazamiento: int = Query(0, ge=0, le=100000)):
    """Bandeja del personal: conteos por estado y solicitudes (primero las que esperan revisión)."""
    datos: dict = {'limite': limite, 'desplazamiento': desplazamiento}
    if estado:
        datos['estado'] = estado
    if buscar:
        datos['buscar'] = buscar
    return ejecutar(cliente, 'bandeja', datos, RPC_PERSONAL)


@router.get('/atencion/solicitudes/{folio}')
def detalle(folio: Folio, cliente: Cliente):
    """Detalle con contacto, historial (quién hizo cada paso) y lo que ocupa el área en ese horario."""
    return ejecutar(cliente, 'obtener', {'folio': folio}, RPC_PERSONAL)


@router.post('/atencion/solicitudes/{folio}/aprobacion')
def aprobar(folio: Folio, datos: Aprobacion, cliente: Cliente):
    """Aprueba lo acordado. Exige la verificación completa y que el área esté libre."""
    return ejecutar(cliente, 'aprobar', {**datos.model_dump(mode='json', exclude_none=True), 'folio': folio}, RPC_PERSONAL)


@router.post('/atencion/solicitudes/{folio}/propuesta')
def proponer(folio: Folio, datos: Propuesta, cliente: Cliente):
    """Propone otro espacio, fecha u horario (también reprograma una aprobada). La persona responde."""
    cuerpo = _horario(datos.model_dump(mode='json', exclude_none=True), datos)
    return ejecutar(cliente, 'proponer', {**cuerpo, 'folio': folio}, RPC_PERSONAL)


@router.post('/atencion/solicitudes/{folio}/rechazo')
def rechazar(folio: Folio, datos: Decision, cliente: Cliente):
    """Rechaza una solicitud en revisión o con propuesta pendiente."""
    return ejecutar(cliente, 'rechazar', {**datos.model_dump(mode='json'), 'folio': folio}, RPC_PERSONAL)


@router.post('/atencion/solicitudes/{folio}/cancelacion')
def cancelar_aprobada(folio: Folio, datos: Decision, cliente: Cliente):
    """Cancela una solicitud ya aprobada y libera el área."""
    return ejecutar(cliente, 'cancelar', {**datos.model_dump(mode='json'), 'folio': folio}, RPC_PERSONAL)
