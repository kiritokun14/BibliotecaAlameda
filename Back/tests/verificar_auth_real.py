"""Prueba manual opcional. Llama a Auth con datos ficticios; no imprime claves ni tokens.

Ejecutar solo con autorización para crear una cuenta de prueba y gestionar su limpieza.
"""
import argparse
import secrets

from supabase_auth.errors import AuthApiError

from Back.conexion import crear_cliente
from Back.registro import SolicitudRegistro
from Back.tests.test_registro import solicitud_base


def main():
    argumentos = argparse.ArgumentParser(description='Verificación manual de Auth con correo autorizado.')
    argumentos.add_argument('--correo', required=True, help='Correo autorizado que recibirá la confirmación.')
    opciones = argumentos.parse_args()
    datos = solicitud_base()
    datos['correo'] = opciones.correo
    datos['contrasena'] = secrets.token_urlsafe(32)
    solicitud = SolicitudRegistro.model_validate(datos)
    try:
        resultado = crear_cliente().auth.sign_up({
            'email': str(solicitud.correo),
            'password': solicitud.contrasena.get_secret_value(),
            'options': {'data': solicitud.datos_para_auth()},
        })
        print({'auth_acepto': resultado.user is not None, 'sesion': resultado.session is not None})
    except AuthApiError as error:
        print({'estado': error.status, 'codigo': error.code})


if __name__ == '__main__':
    main()
