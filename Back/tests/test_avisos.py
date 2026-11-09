import unittest
from unittest.mock import Mock, patch
from uuid import uuid4
from urllib.parse import parse_qs, urlparse
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from Back.main import app


class AvisosTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche = patch('Back.contenidos.crear_cliente')
        self.crear = parche.start(); self.addCleanup(parche.stop)
        self.cliente = self.crear.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cliente.rpc.return_value.execute.return_value.data = {'id': str(uuid4()), 'estadoEnvio': 'pendiente'}
        self.headers = {'Authorization': 'Bearer sesion'}
        self.id = str(uuid4())
        self.datos = {'id': self.id, 'usuarioId': str(uuid4()), 'titulo': 'Atención', 'cuerpoAviso': 'Tu solicitud fue revisada.', 'tipoAviso': 'atencion'}

    def test_sin_sesion_no_hay_consultas(self):
        for ruta in ['/avisos/whatsapp', '/avisos/whatsapp/destinatarios?busqueda=Ana', f'/avisos/whatsapp/{self.id}/preparar']:
            self.assertEqual(self.http.get(ruta).status_code, 401)
        self.crear.assert_not_called()

    def test_creacion_no_envia_ni_acepta_estado_impuesto(self):
        r = self.http.post('/avisos/whatsapp', headers=self.headers, json=self.datos)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.assertEqual(self.cliente.rpc.call_args.args, ('avisos_whatsapp', {'operacion': 'crear', 'datos': self.datos}))
        for campo in [{'estadoEnvio': 'entregado'}, {'creadoPor': self.id}, {'telefono': '3110000000'}, {'tipoAviso': 'cancelacion_automatica'}]:
            self.assertEqual(self.http.post('/avisos/whatsapp', headers=self.headers, json=self.datos | campo).status_code, 422)

    def test_enlace_codificado_sin_envio(self):
        mensaje = '¿Vienes? & texto=otro #sección\nConfirmación'
        self.cliente.rpc.return_value.execute.return_value.data = {'telefono': '523110000000', 'titulo': 'Título', 'cuerpoAviso': mensaje}
        r = self.http.get(f'/avisos/whatsapp/{self.id}/preparar', headers=self.headers)
        self.assertEqual(r.status_code, 200)
        enlace = urlparse(r.json()['enlace'])
        self.assertEqual(enlace.netloc, 'wa.me')
        self.assertEqual(enlace.path, '/523110000000')
        self.assertEqual(parse_qs(enlace.query), {'text': ['Título\n\n' + mensaje]})
        self.cliente.rpc.assert_called_once_with('avisos_whatsapp', {'operacion': 'preparar', 'datos': {'id': self.id}})
        self.cliente.table.assert_not_called()

    def test_resultado_exige_nota_version_entera_y_estado_valido(self):
        for datos in [{'version': 0, 'estadoEnvio': 'enviado', 'nota': 'Revisado'}, {'version': 1, 'estadoEnvio': 'enviado', 'nota': ' '}, {'version': 1, 'estadoEnvio': 'leido', 'nota': 'Visto'}, {'version': '1', 'estadoEnvio': 'enviado', 'nota': 'Visto'}]:
            self.assertEqual(self.http.patch(f'/avisos/whatsapp/{self.id}', headers=self.headers, json=datos).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_resultado_conserva_version_sin_imponer_responsable(self):
        datos = {'version': 2, 'estadoEnvio': 'entregado', 'nota': 'Se observó confirmación en WhatsApp.'}
        r = self.http.patch(f'/avisos/whatsapp/{self.id}', headers=self.headers, json=datos)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1], {'operacion': 'resultado', 'datos': {'id': self.id, **datos}})

    def test_errores_de_permiso_y_version_son_controlados(self):
        for codigo, estado in [('42501',403),('40001',409),('55000',409),('P0002',404),('23514',422),('XX000',503)]:
            self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message': 'secreto interno', 'details': None, 'hint': None})
            r = self.http.get('/avisos/whatsapp', headers=self.headers)
            self.assertEqual(r.status_code, estado)
            self.assertNotIn('secreto interno', r.text)

    def test_limites_paginacion_y_busqueda(self):
        for ruta in ['/avisos/whatsapp?desplazamiento=-1', '/avisos/whatsapp/destinatarios?busqueda=ab']:
            self.assertEqual(self.http.get(ruta, headers=self.headers).status_code, 422)
        self.cliente.rpc.assert_not_called()
