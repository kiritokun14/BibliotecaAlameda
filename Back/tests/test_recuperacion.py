import os
import unittest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from supabase_auth.errors import AuthApiError
from Back.main import app

class RecuperacionTests(unittest.TestCase):
    def setUp(self):
        self.cliente = TestClient(app)
        parche = patch('Back.recuperacion.crear_cliente')
        self.auth = parche.start().return_value.auth
        self.addCleanup(parche.stop)
        self.auth.set_session.return_value = Mock(session=Mock(), user=Mock(id='persona'))
        self.auth.get_user.return_value = Mock(user=Mock(id='persona'))
        entorno = patch.dict(os.environ, {'FRONTEND_URL': 'http://localhost:5173/'})
        entorno.start()
        self.addCleanup(entorno.stop)
        self.datos = {'access_token': 'token-privado', 'refresh_token': 'renovacion-privada', 'nueva_password': 'Nueva-123'}

    def enviar(self):
        return self.cliente.post('/auth/recuperar', json={'correo': 'prueba@example.com'})

    def cambiar(self, datos=None):
        return self.cliente.post('/auth/restablecer', json=datos or self.datos)

    def test_envio_y_retorno_correctos(self):
        r = self.enviar()
        self.assertEqual(r.status_code, 202)
        self.assertEqual(r.headers['cache-control'], 'no-store')
        self.auth.reset_password_for_email.assert_called_once_with('prueba@example.com', {'redirect_to': 'http://localhost:5173/auth/retorno?flujo=recuperacion'})
        self.assertNotIn('prueba@example.com', r.text)

    def test_no_enumera(self):
        normal = self.enviar().json()
        self.auth.reset_password_for_email.side_effect = AuthApiError('privado', 404, 'user_not_found')
        r = self.enviar()
        self.assertEqual(r.status_code, 202)
        self.assertEqual(r.json(), normal)

    def test_limite_y_fallos_no_son_exito(self):
        for error, estado in [(AuthApiError('privado', 429, 'over_email_send_rate_limit'),429), (AuthApiError('privado', 500, 'unexpected_failure'),503), (RuntimeError('secreto'),503)]:
            self.auth.reset_password_for_email.side_effect = error
            r = self.enviar()
            self.assertEqual(r.status_code, estado)
            self.assertNotIn('privado',r.text)
            self.assertNotIn('secreto',r.text)

    def test_rechaza_correo_y_origen_invalidos(self):
        self.assertEqual(self.cliente.post('/auth/recuperar',json={'correo':'invalido'}).status_code,422)
        with patch.dict(os.environ, {'FRONTEND_URL':'javascript:alert(1)'}):
            self.assertEqual(self.enviar().status_code,503)
        self.auth.reset_password_for_email.assert_not_called()

    def test_actualiza_solo_identidad_verificada_y_cierra(self):
        r = self.cambiar()
        self.assertEqual(r.status_code,200)
        self.assertTrue(r.json()['sesionesCerradas'])
        self.auth.update_user.assert_called_once_with({'password':'Nueva-123'})
        self.auth.sign_out.assert_called_once_with({'scope':'global'})
        self.assertNotIn('token-privado',r.text)
        self.assertEqual(r.headers['cache-control'],'no-store')

    def test_datos_invalidos_no_llegan_a_auth(self):
        for cambios in [{'nueva_password':'corta'}, {'nueva_password':'x'*129}, {'access_token':''}, {'usuarioId':'otra-persona'}]:
            r = self.cambiar(self.datos | cambios)
            self.assertEqual(r.status_code,422)
            self.assertNotIn('token-privado',r.text)
            self.assertNotIn('renovacion-privada',r.text)
        self.auth.set_session.assert_not_called()

    def test_sesion_ausente_o_identidad_distinta_no_actualiza(self):
        self.auth.set_session.return_value = Mock(session=None,user=None)
        self.assertEqual(self.cambiar().status_code,401)
        self.auth.set_session.return_value = Mock(session=Mock(),user=Mock(id='otra'))
        self.assertEqual(self.cambiar().status_code,401)
        self.auth.update_user.assert_not_called()

    def test_error_tokens_no_actualiza(self):
        self.auth.set_session.side_effect = AuthApiError('no exponer',401,'bad_jwt')
        self.assertEqual(self.cambiar().status_code,401)
        self.auth.update_user.assert_not_called()

    def test_contrasena_rechazada_no_cierra_sesion(self):
        self.auth.update_user.side_effect = AuthApiError('no exponer',422,'same_password')
        self.assertEqual(self.cambiar().status_code,422)
        self.auth.sign_out.assert_not_called()

    def test_cierre_fallido_no_oculta_cambio_exitoso(self):
        self.auth.sign_out.side_effect = RuntimeError('privado')
        r = self.cambiar()
        self.assertEqual(r.status_code,200)
        self.assertFalse(r.json()['sesionesCerradas'])

if __name__ == '__main__':
    unittest.main()
