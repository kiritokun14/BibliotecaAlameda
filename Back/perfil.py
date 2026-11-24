"""HU-08. Consulta y edición del perfil propio con la sesión del titular."""
from typing import Literal
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import AwareDatetime, EmailStr, Field, StrictBool, model_validator
from postgrest.exceptions import APIError
from Back.contenidos import Cliente
from Back.registro import DatosBase, Domicilio, Texto, Telefono

router=APIRouter(prefix='/perfil',tags=['Perfil propio'])

class CambiosResponsable(DatosBase):
    telefono: Telefono | None = None
    correo: EmailStr | None = Field(default=None, max_length=254)

    @model_validator(mode='after')
    def validar_contactos(self):
        if not self.model_fields_set or any(getattr(self, campo) is None for campo in self.model_fields_set):
            raise ValueError('Envía teléfono o correo de la persona responsable.')
        return self


class CambiosPerfil(DatosBase):
    nombres: Texto | None = None
    telefono: Telefono | None = None
    domicilio: Domicilio | None = None
    responsable: CambiosResponsable | None = None
    actualizadoA: AwareDatetime = Field(description='Versión leída antes de editar.')

    @model_validator(mode='after')
    def validar_cambios(self):
        campos = self.model_fields_set - {'actualizadoA'}
        if not campos or any(getattr(self, campo) is None for campo in campos):
            raise ValueError('Envía al menos un cambio válido de perfil.')
        return self

def comprobar_parametros_perfil(peticion: Request):
    if peticion.query_params:
        raise HTTPException(422, 'El perfil propio no acepta parámetros de consulta.',
                            headers={'Cache-Control': 'no-store'})


def ejecutar_perfil(cliente, operacion, datos=None):
    cabeceras = {'Cache-Control': 'no-store'}
    try:
        return cliente.rpc('mi_perfil', {'operacion': operacion, 'datos': datos or {}}).execute().data
    except APIError as error:
        if error.code in ('22023', '22007', '22P02', '23514'):
            raise HTTPException(422, 'Revisa los datos de contacto y los demás campos que editaste.',
                                headers=cabeceras) from None
        estado, mensaje = {
            '42501': (403, 'Tu cuenta o sesión no permite esta operación de perfil.'),
            'P0002': (404, 'No se encontraron los datos de perfil solicitados.'),
            '40001': (409, 'El perfil cambió. Vuelve a cargarlo antes de guardar.'),
        }.get(error.code, (503, 'No fue posible consultar o guardar tu perfil.'))
        raise HTTPException(estado, mensaje, headers=cabeceras) from None
    except Exception:
        raise HTTPException(503, 'El servicio de perfil no está disponible.', headers=cabeceras) from None

@router.get('')
def consultar_perfil(peticion: Request, respuesta: Response, cliente: Cliente):
    comprobar_parametros_perfil(peticion)
    respuesta.headers['Cache-Control'] = 'no-store'
    return ejecutar_perfil(cliente, 'consultar')

@router.patch('')
def editar_perfil(datos: CambiosPerfil, peticion: Request, respuesta: Response, cliente: Cliente):
    comprobar_parametros_perfil(peticion)
    respuesta.headers['Cache-Control'] = 'no-store'
    return ejecutar_perfil(cliente, 'guardar', datos.model_dump(mode='json', exclude_unset=True))


class PreferenciasAvisos(DatosBase):
    canalPreferido: Literal['portal', 'correo', 'telefono', 'whatsapp_manual']
    recibirAvisosComunidad: StrictBool
    recibirAvisosActividades: StrictBool
    actualizadoEn: AwareDatetime | None


def preferencias(cliente, operacion, datos):
    try:
        return cliente.rpc('mis_preferencias_avisos', {
            'operacion': operacion, 'datos': datos,
        }).execute().data
    except APIError as error:
        estado, mensaje = {
            '42501': (403, 'Tu cuenta no está activa o tu sesión ya no está vigente.'),
            '40001': (409, 'Tus preferencias cambiaron. Vuelve a cargarlas.'),
            '22023': (422, 'Revisa el canal y los tipos de aviso.'),
            '22P02': (422, 'Revisa el canal y los tipos de aviso.'),
        }.get(error.code, (503, 'No fue posible consultar o guardar tus preferencias.'))
        raise HTTPException(estado, mensaje, headers={'Cache-Control': 'private, no-store'}) from None
    except Exception:
        raise HTTPException(503, 'No fue posible consultar o guardar tus preferencias.',
                            headers={'Cache-Control': 'private, no-store'}) from None


@router.get('/preferencias-avisos', response_model=PreferenciasAvisos)
def consultar_preferencias(respuesta: Response, cliente: Cliente):
    respuesta.headers['Cache-Control'] = 'private, no-store'
    return preferencias(cliente, 'consultar', {})


@router.patch('/preferencias-avisos', response_model=PreferenciasAvisos)
def guardar_preferencias(datos: PreferenciasAvisos, respuesta: Response, cliente: Cliente):
    respuesta.headers['Cache-Control'] = 'private, no-store'
    return preferencias(cliente, 'guardar', datos.model_dump(mode='json'))
