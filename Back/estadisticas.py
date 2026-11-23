"""Administración · Estadísticas del panel (Figma 580:49970).

Solo lectura y solo conteos (sin datos personales). La BD decide el permiso con el token de la persona:
capacidad 'consultar_estadisticas' (ver Supabase/estadisticas_panel.sql → public.estadisticas_panel).
"""
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from postgrest.exceptions import APIError

from Back.contenidos import Cliente

router = APIRouter(prefix='/administracion/estadisticas', tags=['Estadísticas'])
RPC = 'estadisticas_panel'
Seccion = Literal['portal', 'actividades', 'contenidos']
Periodo = Literal['30dias', 'mes', 'anio']


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
