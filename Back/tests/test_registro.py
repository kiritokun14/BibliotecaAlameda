import copy
import os
import unittest
from datetime import date, timedelta
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from supabase_auth.errors import AuthApiError

from Back.main import app


def solicitud_base():
    return {
        'nombres': 'Persona de prueba', 'primerApellido': 'Ejemplo',
        'fechaNacimiento': '1998-02-15', 'telefono': '3110000000',
        'domicilio': {'calle': 'Prueba', 'numeroExterior': 'sin número',
                      'coloniaLocalidad': 'Ejemplo', 'codigoPostal': '63000',
                      'municipio': 'Tepic', 'estadoProvincia': 'Nayarit'},
        'correo': 'persona@example.com', 'contrasena': 'SoloPrueba-2026!', 'aceptaAviso': True,
    }


class RegistroTests(unittest.TestCase):
    def setUp(self):
        entorno = patch.dict(os.environ, {'REGISTRO_HABILITADO': 'true'})
        entorno.start()
        self.addCleanup(entorno.stop)
        self.cliente = TestClient(app)
        self.parche = patch('Back.registro.crear_cliente')
        self.fabrica = self.parche.start()
        self.addCleanup(self.parche.stop)
        self.auth = self.fabrica.return_value.auth
        self.auth.sign_up.return_value = Mock()

    def enviar(self, datos):
        return self.cliente.post('/cuentas/registro', json=datos)

    def test_adulto_y_datos_minimos_en_respuesta(self):
        r = self.enviar(solicitud_base())
        self.assertEqual(r.status_code, 202)
        for secreto in ['SoloPrueba', 'persona@example.com', 'token', 'telefono']:
            self.assertNotIn(secreto, r.text)
        credenciales = self.auth.sign_up.call_args.args[0]
        self.assertEqual(credenciales['password'], 'SoloPrueba-2026!')
        self.assertNotIn('contrasena', str(credenciales['options']))
        self.assertNotIn('rol', credenciales['options']['data']['registro'])

    def test_enlace_regresa_a_la_pantalla_del_frontend(self):
        with patch.dict(os.environ, {'FRONTEND_URL': 'http://localhost:5173/'}):
            self.assertEqual(self.enviar(solicitud_base()).status_code, 202)
        opciones = self.auth.sign_up.call_args.args[0]['options']
        self.assertEqual(opciones['email_redirect_to'], 'http://localhost:5173/auth/retorno?flujo=confirmacion')

    def test_configuracion_solo_expone_clave_publicable(self):
        with patch.dict(os.environ, {'SUPABASE_URL': 'https://prueba.supabase.co',
                                    'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_prueba',
                                    'SUPABASE_SECRET_KEY': 'NO_EXPONER'}):
            r = self.cliente.get('/cuentas/configuracion')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(set(r.json()), {'url', 'clavePublicable'})
        self.assertNotIn('NO_EXPONER', r.text)
        self.auth.sign_up.assert_not_called()

    def test_menor_con_tutor(self):
        datos = solicitud_base()
        datos['fechaNacimiento'] = '2015-01-01'
        datos['tutor'] = {'nombres': 'Tutor', 'apellidos': 'Ejemplo', 'telefono': '3110000001',
                          'correo': 'tutor@example.com', 'relacion': 'madre',
                          'domicilio': copy.deepcopy(datos['domicilio'])}
        self.assertEqual(self.enviar(datos).status_code, 202)

    def test_exactamente_18_no_requiere_tutor(self):
        datos = solicitud_base()
        hoy = date.today()
        try:
            nacimiento = hoy.replace(year=hoy.year - 18)
        except ValueError:
            nacimiento = hoy.replace(year=hoy.year - 18, day=28)
        datos['fechaNacimiento'] = nacimiento.isoformat()
        self.assertEqual(self.enviar(datos).status_code, 202)
        datos['fechaNacimiento'] = (nacimiento + timedelta(days=1)).isoformat()
        self.assertEqual(self.enviar(datos).status_code, 422)

    def test_datos_invalidos_no_llegan_a_auth(self):
        casos = [
            {'fechaNacimiento': '2015-01-01'}, {'fechaNacimiento': '2999-01-01'},
            {'telefono': '123'}, {'correo': 'invalido'}, {'aceptaAviso': False},
            {'contrasena': 'corta'}, {'nombres': '   '}, {'rol': 'administrador'},
            {'id': 'uuid-propuesto'}, {'fechaNacimiento': 'no-es-fecha'},
        ]
        for cambios in casos:
            with self.subTest(cambios=cambios):
                datos = solicitud_base() | cambios
                self.assertEqual(self.enviar(datos).status_code, 422)
        self.auth.sign_up.assert_not_called()

    def test_domicilio_obligatorio(self):
        datos = solicitud_base()
        del datos['domicilio']
        self.assertEqual(self.enviar(datos).status_code, 422)
        self.auth.sign_up.assert_not_called()

    def test_registro_desactivado_no_crea_cuentas(self):
        with patch.dict(os.environ, {'REGISTRO_HABILITADO': 'false'}):
            self.assertEqual(self.enviar(solicitud_base()).status_code, 503)
        self.auth.sign_up.assert_not_called()

    def test_tutor_incompleto_y_relacion_invalida(self):
        datos = solicitud_base()
        datos['fechaNacimiento'] = '2015-01-01'
        datos['tutor'] = {'nombres': 'Tutor'}
        self.assertEqual(self.enviar(datos).status_code, 422)
        datos['tutor'] = {'nombres': 'Tutor', 'apellidos': 'Ejemplo', 'telefono': '3110000001',
                          'correo': 'tutor@example.com', 'relacion': 'amigo',
                          'domicilio': datos['domicilio']}
        self.assertEqual(self.enviar(datos).status_code, 422)
        self.auth.sign_up.assert_not_called()

    def test_no_revela_datos_en_validacion(self):
        datos = solicitud_base() | {'contrasena': 'abc', 'rol': 'secreto-no-devolver'}
        respuesta = self.enviar(datos)
        self.assertNotIn('abc', respuesta.text)
        self.assertNotIn('secreto-no-devolver', respuesta.text)
        for error in respuesta.json()['detail']:
            self.assertNotIn('input', error)

    def test_duplicado_no_enumera_cuentas(self):
        primero = self.enviar(solicitud_base())
        self.auth.sign_up.side_effect = AuthApiError('No exponer', 422, 'user_already_exists')
        repetido = self.enviar(solicitud_base())
        self.assertEqual((primero.status_code, primero.json()), (repetido.status_code, repetido.json()))

    def test_limite_y_fallo_controlado(self):
        self.auth.sign_up.side_effect = AuthApiError('detalle privado', 429, 'over_email_send_rate_limit')
        self.assertEqual(self.enviar(solicitud_base()).status_code, 429)
        self.auth.sign_up.side_effect = RuntimeError('clave-secreta')
        r = self.enviar(solicitud_base())
        self.assertEqual(r.status_code, 503)
        self.assertNotIn('clave-secreta', r.text)


if __name__ == '__main__':
    unittest.main()
