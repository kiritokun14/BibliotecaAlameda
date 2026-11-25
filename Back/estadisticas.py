"""Administración · Estadísticas del panel y reporte de participación (HU-22).

Reportes agregados y captura de totales de visitas e incidencias. La base de datos
valida los permisos de la sesión para cada consulta o captura.
"""
import csv
import re
from datetime import date
from io import StringIO
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response
from postgrest.exceptions import APIError
from pydantic import AwareDatetime, BaseModel, Field, StringConstraints, ValidationError, model_validator

from Back.contenidos import Cliente
from Back.registro import DatosBase

router = APIRouter(prefix='/administracion/estadisticas', tags=['Estadísticas'])
RPC = 'estadisticas_panel'
Seccion = Literal['portal', 'actividades', 'contenidos']
Periodo = Literal['30dias', 'mes', 'anio']
Conteo = Annotated[int, Field(strict=True, ge=0)]
CABECERAS = {'Cache-Control': 'private, no-store'}


@router.get('')
def consultar(cliente: Cliente, seccion: Seccion = Query('portal'), periodo: Periodo = Query('30dias')):
    try:
        datos = cliente.rpc(RPC, {'seccion': seccion, 'periodo': periodo}).execute().data
    except APIError as error:
        if error.code == '42501':
            raise HTTPException(403, 'No tienes permiso para consultar estadísticas.') from None
        if error.code == '22023':
            raise HTTPException(422, 'Revisa la sección y el periodo.') from None
        if error.code in ('PGRST202', '42883'):
            raise HTTPException(503, 'Las estadísticas todavía no están instaladas en la base de datos.') from None
        raise HTTPException(503, 'No fue posible consultar las estadísticas.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar las estadísticas.') from None
    if not isinstance(datos, dict):
        raise HTTPException(503, 'No fue posible consultar las estadísticas.')
    return datos


class PeriodoParticipacion(DatosBase):
    desde: date
    hasta: date
    actividad_id: UUID | None = None

    @model_validator(mode='after')
    def comprobar_limites(self):
        if not 0 <= (self.hasta - self.desde).days < 366:
            raise ValueError('El periodo debe ser válido y abarcar hasta 366 días.')
        return self


class CapturaAgregada(DatosBase):
    total: Annotated[int, Field(strict=True, ge=0, le=2147483647)]
    referencia: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    version: AwareDatetime | None


class RegistroAgregado(CapturaAgregada):
    version: AwareDatetime


class ConteosParticipacion(BaseModel):
    solicitudes: Conteo
    confirmaciones: Conteo
    asistencias: Conteo
    ausencias: Conteo
    listasCerradas: Conteo
    sesionesRealizadas: Conteo
    sesionesCanceladas: Conteo
    incidencias: Conteo | None
    visitasGenerales: Conteo | None
    atenciones: Conteo | None


class TotalesParticipacion(ConteosParticipacion):
    sesionesConIncidencias: Conteo
    diasConVisitas: Conteo | None


class DiaParticipacion(ConteosParticipacion):
    fecha: date
    registroVisitas: RegistroAgregado | None


class ActividadInforme(BaseModel):
    id: UUID
    folio: str
    titulo: str


class SesionParticipacion(ActividadInforme):
    fecha: date
    estado: Literal['programada', 'en_curso', 'finalizada', 'cancelada']
    solicitudes: Conteo
    confirmaciones: Conteo
    asistencias: Conteo
    ausencias: Conteo
    listaCerrada: bool
    incidencias: Conteo | None
    registroIncidencias: RegistroAgregado | None
    puedeRegistrarIncidencias: bool


class FuentesParticipacion(BaseModel):
    solicitudes: str
    confirmaciones: str
    asistencias: str
    ausencias: str
    visitasGenerales: str
    atenciones: str
    incidencias: str


class InformeParticipacion(BaseModel):
    desde: date
    hasta: date
    ambito: Literal['global', 'actividades_asignadas']
    actividadId: UUID | None
    actividades: list[ActividadInforme]
    puedeRegistrarVisitas: bool
    fuentes: FuentesParticipacion
    totales: TotalesParticipacion
    dias: list[DiaParticipacion]
    sesiones: list[SesionParticipacion]


def consultar_rpc(cliente, operacion, datos):
    try:
        return cliente.rpc(operacion, datos).execute().data
    except APIError as error:
        estado, mensaje = {
            '42501': (403, 'No tienes permiso para realizar esta operación en el ámbito solicitado.'),
            'P0002': (404, 'No se encontró el registro solicitado.'),
            '22023': (422, 'Revisa el periodo o los datos de la captura.'),
            '23514': (422, 'Revisa la fecha, el total o la referencia de la captura.'),
            '40001': (409, 'El registro cambió. Vuelve a cargar el informe antes de guardar.'),
            '55000': (409, 'La sesión debe haber iniciado y estar vigente para registrar incidencias.'),
            'PGRST202': (503, 'El reporte de participación todavía no está instalado en la base de datos.'),
            '42883': (503, 'El reporte de participación todavía no está instalado en la base de datos.'),
        }.get(error.code, (503, 'No pudimos completar la operación de estadísticas.'))
        raise HTTPException(estado, mensaje, headers=CABECERAS) from None
    except Exception:
        raise HTTPException(503, 'No pudimos completar la operación de estadísticas.', headers=CABECERAS) from None


def informe_participacion(cliente, periodo):
    datos = consultar_rpc(cliente, 'estadisticas_participacion', periodo.model_dump(mode='json'))
    try:
        return InformeParticipacion.model_validate(datos)
    except ValidationError:
        raise HTTPException(503, 'El reporte recibido está incompleto.', headers=CABECERAS) from None


@router.get('/participacion', response_model=InformeParticipacion)
def participacion(cliente: Cliente, periodo: Annotated[PeriodoParticipacion, Query()], respuesta: Response):
    respuesta.headers.update(CABECERAS)
    return informe_participacion(cliente, periodo)


@router.get('/participacion.csv', response_class=Response)
def participacion_csv(cliente: Cliente, periodo: Annotated[PeriodoParticipacion, Query()]):
    informe = informe_participacion(cliente, periodo)
    archivo = StringIO(newline='')
    filas = csv.writer(archivo)
    # Se genera con fechas, valores conocidos y conteos, sin títulos, referencias ni identificadores de personas.
    filas.writerow([
        'Agrupación', 'Ámbito', 'Desde', 'Hasta', 'Folio actividad', 'Solicitudes', 'Confirmaciones',
        'Asistencias verificadas', 'Ausencias', 'Listas cerradas', 'Sesiones realizadas',
        'Sesiones canceladas', 'Incidencias registradas', 'Visitas generales', 'Atenciones cerradas',
    ])
    campos = ('solicitudes', 'confirmaciones', 'asistencias', 'ausencias', 'listasCerradas', 'sesionesRealizadas',
              'sesionesCanceladas', 'incidencias', 'visitasGenerales', 'atenciones')
    folio = next((a.folio for a in informe.actividades if a.id == informe.actividadId), '')
    ambito = 'actividad' if informe.actividadId else informe.ambito
    filas.writerow(['Periodo', ambito, informe.desde, informe.hasta, folio if re.fullmatch(r'AC-[0-9]{4,}', folio) else '',
                    *(getattr(informe.totales, campo) for campo in campos)])
    for dia in informe.dias:
        filas.writerow(['Día', ambito, dia.fecha, dia.fecha, '', *(getattr(dia, campo) for campo in campos)])
    for sesion in informe.sesiones:
        folio = sesion.folio if re.fullmatch(r'AC-[0-9]{4,}', sesion.folio) else ''
        cancelada = sesion.estado == 'cancelada'
        realizada = not cancelada and (sesion.estado == 'finalizada' or sesion.listaCerrada)
        filas.writerow(['Sesión', ambito, sesion.fecha, sesion.fecha, folio, sesion.solicitudes, sesion.confirmaciones,
                        sesion.asistencias, sesion.ausencias, int(sesion.listaCerrada), int(realizada), int(cancelada),
                        sesion.incidencias, '', ''])
    return Response('\ufeff' + archivo.getvalue(), media_type='text/csv', headers={**CABECERAS,
                    'Content-Disposition': f'attachment; filename="participacion-{informe.desde}-{informe.hasta}.csv"',
                    'X-Content-Type-Options': 'nosniff'})


def guardar_captura(cliente, operacion, clave, valor, captura):
    datos = consultar_rpc(cliente, operacion, {clave: str(valor), **captura.model_dump(mode='json')})
    try:
        return RegistroAgregado.model_validate(datos)
    except ValidationError:
        raise HTTPException(503, 'No pudimos confirmar la captura.', headers=CABECERAS) from None


@router.put('/visitas-generales/{fecha}', response_model=RegistroAgregado)
def guardar_visitas(fecha: date, captura: CapturaAgregada, cliente: Cliente, respuesta: Response):
    respuesta.headers.update(CABECERAS)
    return guardar_captura(cliente, 'guardar_visitas_generales', 'fecha', fecha, captura)


@router.put('/incidencias/{sesion_id}', response_model=RegistroAgregado)
def guardar_incidencias(sesion_id: UUID, captura: CapturaAgregada, cliente: Cliente, respuesta: Response):
    respuesta.headers.update(CABECERAS)
    return guardar_captura(cliente, 'guardar_incidencias_sesion', 'sesion_id', sesion_id, captura)
