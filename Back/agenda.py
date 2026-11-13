"""Consulta pública de actividades y sus sesiones visibles."""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from httpx import HTTPError
from postgrest.exceptions import APIError

from Back.conexion import crear_cliente

router = APIRouter(prefix='/public/actividades', tags=['Agenda pública'])

_ACTIVIDAD = 'id,slug,titulo,descripcion,categoria,audiencia,requerimientos,estadoPublicacion'
_SESION = 'id,inicio,fin,estado,lugar:espacio(nombre)'
_ESTADOS = ['programada', 'en_curso', 'finalizada', 'cancelada']


def _consultar(*, actividad_id=None, desde=None, hasta=None, tipo=None, inicio=0, limite=20):
    # Con fechas, solo se incluyen actividades con una sesión en el intervalo.
    relacion = 'sesionActividad!inner' if desde or hasta else 'sesionActividad'
    try:
        with crear_cliente().postgrest as base:
            consulta = (
                base.table('actividad')
                .select(f'{_ACTIVIDAD},sesiones:{relacion}({_SESION})')
                .eq('estadoPublicacion', 'publicada')
                .in_('sesiones.estado', _ESTADOS)
                .order('inicio', foreign_table='sesiones')
                .order('id', foreign_table='sesiones')
            )
            if actividad_id is not None:
                return consulta.eq('id', str(actividad_id)).limit(1).execute().data
            if desde:
                consulta = consulta.gte('sesiones.inicio', f'{desde}T00:00:00Z')
            if hasta:
                consulta = consulta.lte('sesiones.inicio', f'{hasta}T23:59:59.999999Z')
            if tipo:
                consulta = consulta.eq('categoria', tipo)
            return consulta.order('titulo').order('id').range(inicio, inicio + limite - 1).execute().data
    except (APIError, HTTPError, RuntimeError) as exc:
        raise HTTPException(503, 'La agenda no está disponible en este momento.') from exc

@router.get('')
def listar_actividades(
    desde: date | None = None,
    hasta: date | None = None,
    tipo: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """Filtra por categoría exacta y fecha de inicio de sesión en UTC, inclusive."""
    if desde and hasta and desde > hasta:
        raise HTTPException(422, 'La fecha desde debe ser anterior o igual a hasta.')
    if tipo is not None and not tipo.strip():
        raise HTTPException(422, 'El tipo de actividad no puede estar vacío.')
    items = _consultar(
        desde=desde, hasta=hasta, tipo=tipo.strip() if tipo else None,
        inicio=(page - 1) * limit, limite=limit,
    )
    return {'items': items, 'page': page, 'limit': limit}


@router.get('/{actividad_id}')
def detalle_actividad(actividad_id: UUID):
    filas = _consultar(actividad_id=actividad_id)
    if not filas:
        raise HTTPException(404, 'La actividad no existe o no está publicada.')
    return filas[0]
