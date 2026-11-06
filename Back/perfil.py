"""T-031, adaptada de BOBA: perfil propio en la tabla canónica, sin rol titular."""
from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, HTTPException, Response
from pydantic import Field, model_validator
from postgrest.exceptions import APIError
from Back.contenidos import Cliente
from Back.registro import DatosBase, Texto, Telefono

router=APIRouter(prefix='/perfil',tags=['Perfil propio'])

class CambiosPerfil(DatosBase):
    nombres: Texto | None = None
    telefono: Telefono | None = None
    actualizadoA: datetime = Field(description='Versión leída antes de editar.')

    @model_validator(mode='after')
    def validar_cambios(self):
        campos=self.model_fields_set - {'actualizadoA'}
        if not campos or any(getattr(self,campo) is None for campo in campos):
            raise ValueError('Envía nombres o teléfono; no se pueden vaciar.')
        if self.actualizadoA.tzinfo is None:
            raise ValueError('La versión debe incluir zona horaria.')
        return self

def ejecutar_perfil(cliente,operacion,datos=None):
    try:
        return cliente.rpc('mi_perfil',{'operacion':operacion,'datos':datos or {}}).execute().data
    except APIError as error:
        if error.code=='42501':
            raise HTTPException(403,'Tu cuenta no está activa o tu sesión ya no está vigente.') from None
        if error.code=='P0002':
            raise HTTPException(404,'No se encontró el perfil de tu cuenta.') from None
        if error.code=='40001':
            raise HTTPException(409,'El perfil cambió. Vuelve a cargarlo antes de guardar.') from None
        if error.code in ('22023','22007','22P02','23514'):
            raise HTTPException(422,'Revisa tu nombre y el teléfono de 10 dígitos.') from None
        raise HTTPException(503,'No fue posible consultar o guardar tu perfil.') from None
    except Exception:
        raise HTTPException(503,'El servicio de perfil no está disponible.') from None

@router.get('')
def consultar_perfil(respuesta:Response,cliente:Cliente):
    respuesta.headers['Cache-Control']='no-store'
    return ejecutar_perfil(cliente,'consultar')

@router.patch('')
def editar_perfil(datos:CambiosPerfil,respuesta:Response,cliente:Cliente):
    respuesta.headers['Cache-Control']='no-store'
    return ejecutar_perfil(cliente,'guardar',datos.model_dump(mode='json',exclude_unset=True))
