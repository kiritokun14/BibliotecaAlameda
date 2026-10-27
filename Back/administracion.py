"""T-032 / CU-10. Contrato independiente del frontend y del formulario de login.
    La administración de cuentas y permisos se hace mediante RPCs de PostgREST."""

from datetime import datetime
import os
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente

router = APIRouter(prefix='/administracion', tags=['Cuentas y permisos'])
seguridad = HTTPBearer(auto_error=False)
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
CodigoRol = Literal['usuario', 'editor', 'responsable_actividades', 'administrador']
CodigoCapacidad = Literal[
    'preparar_contenidos', 'gestionar_actividades', 'confirmar_inscripciones', 'registrar_asistencia', 'moderar_foro',
    'registrar_recompensas', 'alta_asistida', 'orientar_recuperacion', 'atender_contactos',
    'validar_credenciales', 'publicar_contenidos',
    'gestionar_evidencias', 'consultar_estadisticas', 'gestionar_fuentes_asistente',
    'registrar_resoluciones_actividades', 'enviar_avisos', 'consultar_cuentas_atencion', 'atender_bibliocomunidad',
]

# Matriz del servidor: administrar cuentas nunca implica aprobar actividades o publicar.
CAPACIDADES_POR_ROL = {
    # CU-08, CU-13, CU-15 a CU-18, CU-26 y CU-28: acciones sobre lo propio.
    # Este contrato no implementa por sí mismo los endpoints de esos módulos.
    'usuario': ['gestionar_perfil_propio', 'crear_propuestas_propias', 'editar_borradores_propios',
                'eliminar_borradores_propios', 'solicitar_cambios_propios', 'solicitar_inscripcion',
                'cancelar_participacion_propia', 'solicitar_espacio', 'solicitar_credencial',
                'participar_foro', 'consultar_progreso_propio'],
    'administrador': ['administrar_cuentas'],
    'editor': [],
    'responsable_actividades': [],
}

# Las capacidades del personal se conceden expresamente (CU-10 y casillas de Figma).
CAPACIDADES_ACTIVIDADES = {
    'gestionar_actividades', 'confirmar_inscripciones', 'registrar_asistencia', 'moderar_foro',
    'registrar_recompensas', 'gestionar_evidencias', 'consultar_estadisticas', 'registrar_resoluciones_actividades',
}


def capacidad_admite_roles(capacidad, roles):
    if capacidad in CAPACIDADES_ACTIVIDADES:
        return 'responsable_actividades' in roles
    if capacidad in ('preparar_contenidos', 'gestionar_fuentes_asistente'):
        return 'editor' in roles
    if capacidad == 'publicar_contenidos':
        return bool({'editor', 'responsable_actividades', 'administrador'} & set(roles))
    return True


def cliente_autenticado(credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(seguridad)]):
    if credenciales is None or credenciales.scheme.lower() != 'bearer':
        raise HTTPException(401, 'Se requiere una sesión válida.', headers={'WWW-Authenticate': 'Bearer'})
    load_dotenv(Path(__file__).with_name('.env'))
    if os.getenv('ADMINISTRACION_HABILITADA', 'false').lower() != 'true':
        raise HTTPException(503, 'La administración de cuentas todavía no está habilitada.')
    try:
        cliente = crear_cliente()
        respuesta = cliente.auth.get_user(credenciales.credentials)
        if not respuesta or not respuesta.user:
            raise HTTPException(401, 'Se requiere una sesión válida.')
        cliente.postgrest.auth(credenciales.credentials)
        return cliente
    except HTTPException:
        raise
    except AuthApiError as error:
        if error.status in (400, 401, 403):
            raise HTTPException(401, 'La sesión no es válida o expiró.') from None
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible comprobar la sesión.') from None


Cliente = Annotated[object, Depends(cliente_autenticado)]


def ejecutar(cliente, operacion: str, datos: dict | None = None):
    try:
        resultado = cliente.rpc('administrar_cuentas', {
            'operacion': operacion, 'datos': datos or {},
        }).execute().data
        if operacion == 'listar_roles' and isinstance(resultado, list):
            return [{**rol, 'capacidades': CAPACIDADES_POR_ROL.get(rol['codigo'], [])} for rol in resultado]
        if operacion == 'mi_acceso' and isinstance(resultado, dict):
            return {**resultado, 'roles': [
                {**rol, 'capacidades': CAPACIDADES_POR_ROL.get(rol['rolCodigo'], [])}
                for rol in resultado.get('roles', [])
            ]}
        return resultado
    except APIError as error:
        if error.code == '42501':
            raise HTTPException(403, 'No tienes permiso o tu sesión ya no está vigente.') from None
        if error.code == 'P0002':
            raise HTTPException(404, 'No se encontró la cuenta o el rol solicitado.') from None
        if error.code == '23514':
            raise HTTPException(409, 'El cambio incumple las reglas de cuenta, vigencia o continuidad administrativa.') from None
        if error.code in ('22023', '22P02', '22007', '22008'):
            raise HTTPException(422, 'Revisa los datos enviados.') from None
        raise HTTPException(503, 'No fue posible completar la operación.') from None
    except Exception:
        raise HTTPException(503, 'No fue posible completar la operación.') from None


class Peticion(BaseModel):
    model_config = ConfigDict(extra='forbid')


class AlcanceAsignacion(Peticion):
    ambito: Literal['global', 'actividades_asignadas'] = 'global'
    actividades: list[UUID] = Field(default_factory=list, max_length=100)
    vigenteDesde: datetime | None = None
    vigenteHasta: datetime | None = None
    motivo: Motivo

    @model_validator(mode='after')
    def comprobar_ambito_y_fechas(self):
        if self.ambito == 'global' and self.actividades:
            raise ValueError('Un ámbito global no recibe actividades.')
        if self.ambito == 'actividades_asignadas' and not self.actividades:
            raise ValueError('Selecciona al menos una actividad.')
        if len(set(self.actividades)) != len(self.actividades):
            raise ValueError('No repitas actividades.')
        for fecha in (self.vigenteDesde, self.vigenteHasta):
            if fecha is not None and (fecha.tzinfo is None or fecha.utcoffset() is None):
                raise ValueError('Las fechas requieren zona horaria.')
        if self.vigenteDesde and self.vigenteHasta and self.vigenteHasta <= self.vigenteDesde:
            raise ValueError('La vigencia final debe ser posterior a la inicial.')
        return self


class AsignarRol(AlcanceAsignacion):
    rol: CodigoRol

    @model_validator(mode='after')
    def comprobar_rol(self):
        if self.rol == 'usuario':
            raise ValueError('Usuario es el rol básico automático de toda cuenta.')
        if self.ambito != 'global':
            raise ValueError('Los ámbitos por actividad se asignan en las capacidades adicionales.')
        if self.rol == 'administrador' and self.vigenteHasta:
            raise ValueError('La administración requiere ámbito global y continuidad sin vencimiento automático.')
        return self


class AsignarCapacidad(AlcanceAsignacion):
    capacidad: CodigoCapacidad

    @model_validator(mode='after')
    def comprobar_capacidad(self):
        if self.ambito == 'actividades_asignadas' and self.capacidad not in (
            'preparar_contenidos', 'gestionar_actividades', 'confirmar_inscripciones', 'registrar_asistencia',
            'registrar_recompensas', 'publicar_contenidos',
            'gestionar_evidencias', 'consultar_estadisticas', 'registrar_resoluciones_actividades', 'enviar_avisos',
        ):
            raise ValueError('Esa capacidad es global, no se limita por actividad.')
        return self


class GuardarAcceso(AlcanceAsignacion):
    roles: list[Literal['editor', 'responsable_actividades', 'administrador']] = Field(default_factory=list, max_length=3)
    capacidades: list[CodigoCapacidad] = Field(default_factory=list, max_length=18)

    @model_validator(mode='after')
    def comprobar_seleccion(self):
        if len(set(self.roles)) != len(self.roles) or len(set(self.capacidades)) != len(self.capacidades):
            raise ValueError('No repitas roles o capacidades.')
        for capacidad in self.capacidades:
            if not capacidad_admite_roles(capacidad, self.roles):
                raise ValueError('La capacidad no corresponde a la responsabilidad seleccionada.')
            AsignarCapacidad(capacidad=capacidad, **self.model_dump(exclude={'roles', 'capacidades'}))
        return self


class CambiarEstado(Peticion):
    estatus: Literal['activo', 'inactivo', 'bloqueado']
    motivo: Motivo


class RetirarRol(Peticion):
    motivo: Motivo


@router.get('/mi-acceso')
def mi_acceso(cliente: Cliente):
    return ejecutar(cliente, 'mi_acceso')


@router.get('/roles')
def listar_roles(cliente: Cliente):
    return ejecutar(cliente, 'listar_roles')


@router.get('/capacidades')
def listar_capacidades(cliente: Cliente):
    return ejecutar(cliente, 'listar_capacidades')


@router.get('/cuentas')
def listar_cuentas(cliente: Cliente, busqueda: str = Query('', max_length=100),
                   limite: int = Query(25, ge=1, le=100), desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, 'listar_cuentas', {'busqueda': busqueda, 'limite': limite, 'desplazamiento': desplazamiento})


@router.get('/cuentas/{usuario_id}')
def consultar_cuenta(usuario_id: UUID, cliente: Cliente):
    return ejecutar(cliente, 'ver_cuenta', {'usuarioId': str(usuario_id)})


@router.put('/cuentas/{usuario_id}/roles')
def asignar_rol(usuario_id: UUID, peticion: AsignarRol, cliente: Cliente):
    return ejecutar(cliente, 'asignar_rol', {'usuarioId': str(usuario_id), **peticion.model_dump(mode='json', exclude_none=True)})


@router.delete('/cuentas/{usuario_id}/roles/{rol}')
def retirar_rol(usuario_id: UUID, rol: CodigoRol, peticion: RetirarRol, cliente: Cliente):
    return ejecutar(cliente, 'retirar_rol', {'usuarioId': str(usuario_id), 'rol': rol, 'motivo': peticion.motivo})


@router.put('/cuentas/{usuario_id}/capacidades')
def asignar_capacidad(usuario_id: UUID, peticion: AsignarCapacidad, cliente: Cliente):
    return ejecutar(cliente, 'asignar_capacidad', {'usuarioId': str(usuario_id), **peticion.model_dump(mode='json', exclude_none=True)})


@router.put('/cuentas/{usuario_id}/acceso')
def guardar_acceso(usuario_id: UUID, peticion: GuardarAcceso, cliente: Cliente):
    return ejecutar(cliente, 'guardar_acceso', {'usuarioId': str(usuario_id), **peticion.model_dump(mode='json', exclude_none=True)})


@router.delete('/cuentas/{usuario_id}/capacidades/{capacidad}')
def retirar_capacidad(usuario_id: UUID, capacidad: CodigoCapacidad, peticion: RetirarRol, cliente: Cliente):
    return ejecutar(cliente, 'retirar_capacidad', {'usuarioId': str(usuario_id), 'capacidad': capacidad, 'motivo': peticion.motivo})


@router.patch('/cuentas/{usuario_id}/estado')
def cambiar_estado(usuario_id: UUID, peticion: CambiarEstado, cliente: Cliente):
    return ejecutar(cliente, 'cambiar_estado', {'usuarioId': str(usuario_id), **peticion.model_dump()})


@router.get('/cuentas/{usuario_id}/historial')
def historial(usuario_id: UUID, cliente: Cliente, limite: int = Query(25, ge=1, le=100),
              desplazamiento: int = Query(0, ge=0, le=100000)):
    return ejecutar(cliente, 'historial', {'usuarioId': str(usuario_id), 'limite': limite, 'desplazamiento': desplazamiento})
