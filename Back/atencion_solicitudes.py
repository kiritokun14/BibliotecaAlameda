"""Contrato compartido para integrar T-072 y T-075 de Stephanie."""
from fastapi import HTTPException
from postgrest.exceptions import APIError


def ejecutar_atencion(cliente, tipo, operacion, datos):
    try:
        return cliente.rpc('atencion_solicitudes', {
            'tipo_solicitud': tipo, 'operacion': operacion, 'datos': datos,
        }).execute().data
    except APIError as error:
        codigo, mensaje = {
            '42501': (403, 'No tienes permiso para esta solicitud o tu sesión ya no está vigente.'),
            'P0002': (404, 'No se encontró la solicitud.'),
            '23505': (409, 'Ya tienes una solicitud de credencial activa.'),
            '40001': (409, 'La solicitud cambió. Recarga antes de continuar.'),
            '55000': (409, 'El estado actual no permite esta operación.'),
            '23514': (422, 'Revisa los campos, el motivo y la fecha de cita.'),
            '22023': (422, 'Revisa los campos enviados.'),
            '22P02': (422, 'Revisa los campos enviados.'),
            '22007': (422, 'Revisa la fecha de cita.'),
        }.get(error.code, (503, 'No fue posible completar la atención de la solicitud.'))
        raise HTTPException(codigo, mensaje) from None
    except Exception:
        raise HTTPException(503, 'No fue posible completar la atención de la solicitud.') from None
