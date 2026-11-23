import smtplib
import unittest
from unittest.mock import Mock, patch

from Back.correo_actividad import ErrorPreparacionCorreo, procesar_uno


class ProcesadorCorreoTests(unittest.TestCase):
    def setUp(self):
        self.cliente = Mock()
        self.trabajo = {'avisoId': 'aviso', 'intento': 'intento', 'correo': 'prueba@example.test',
                        'titulo': 'Cambio', 'cuerpo': 'Sesión cancelada'}
        self.cliente.rpc.return_value.execute.return_value.data = self.trabajo
        self.configuracion = {'usuario': 'usuario', 'clave': 'clave', 'remitente': 'remitente@example.test'}

    def comprobar_resultado(self, estado):
        self.assertEqual(self.cliente.rpc.call_args.args[0], 'finalizar_correo_actividad')
        datos = self.cliente.rpc.call_args.args[1]
        self.assertEqual(datos['p_estado'], estado)
        self.assertEqual(datos['p_aviso'], 'aviso')
        self.assertEqual(datos['p_intento'], 'intento')

    @patch('Back.correo_actividad.enviar_correo')
    def test_aceptado_se_registra_enviado(self, enviar):
        self.assertTrue(procesar_uno(self.cliente, self.configuracion))
        enviar.assert_called_once()
        self.comprobar_resultado('enviado')

    @patch('Back.correo_actividad.enviar_correo', side_effect=smtplib.SMTPResponseException(550, b'rechazado'))
    def test_rechazo_se_registra_fallido(self, _enviar):
        procesar_uno(self.cliente, self.configuracion)
        self.comprobar_resultado('fallido')

    @patch('Back.correo_actividad.enviar_correo', side_effect=smtplib.SMTPRecipientsRefused({}))
    def test_destinatario_rechazado_se_registra_fallido(self, _enviar):
        procesar_uno(self.cliente, self.configuracion)
        self.comprobar_resultado('fallido')

    @patch('Back.correo_actividad.enviar_correo', side_effect=ErrorPreparacionCorreo('gaierror'))
    def test_fallo_antes_de_enviar_permite_reintento(self, _enviar):
        procesar_uno(self.cliente, self.configuracion)
        self.comprobar_resultado('fallido')

    @patch('Back.correo_actividad.enviar_correo', side_effect=ConnectionError())
    def test_desconexion_se_registra_incierto(self, _enviar):
        procesar_uno(self.cliente, self.configuracion)
        self.comprobar_resultado('incierto')

    @patch('Back.correo_actividad.enviar_correo')
    def test_cola_vacia_no_envia(self, enviar):
        self.cliente.rpc.return_value.execute.return_value.data = None
        self.assertFalse(procesar_uno(self.cliente, self.configuracion))
        enviar.assert_not_called()
