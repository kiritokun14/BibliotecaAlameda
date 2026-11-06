import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from Back.main import app

VERSION = '2026-11-02T12:00:00.123456Z'
BASE = '/contenidos/revision'


class PublicacionTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        self.parche = patch('Back.contenidos.crear_cliente')
        self.crear = self.parche.start()
        self.addCleanup(self.parche.stop)
        self.cliente = self.crear.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cliente.rpc.return_value.execute.return_value.data = {'folio': 'CN-0010', 'estado': 'publicado'}
        self.cabeceras = {'Authorization': 'Bearer token-revisor'}

    def test_sin_sesion_no_consulta_ni_decide(self):
        self.assertEqual(self.http.get(BASE).status_code, 401)
        for accion, cuerpo in [('publicar', {'referencia': 'Acta'}), ('observaciones', {'observaciones': ['Cambiar']}),
                               ('rechazar', {'nota': 'Motivo'}), ('retirar', {'nota': 'Motivo'})]:
            self.assertEqual(self.http.post(f'{BASE}/CN-0010/{accion}', json={**cuerpo, 'actualizadoEn': VERSION}).status_code, 401)
        self.crear.assert_not_called()

    def test_lista_paginada_y_token(self):
        self.assertEqual(self.http.get(BASE, params={'estado': 'en_revision', 'busqueda': ' Texto ', 'desplazamiento': 20}, headers=self.cabeceras).status_code, 200)
        self.cliente.postgrest.auth.assert_called_once_with('token-revisor')
        self.cliente.rpc.assert_called_once_with('revision_contenidos', {'operacion': 'listar', 'datos': {
            'limite': 10, 'desplazamiento': 20, 'estado': 'en_revision', 'busqueda': 'Texto'}})

    def test_rechaza_estados_y_paginacion_invalidos(self):
        for parametros in ({'estado': 'borrador'}, {'limite': 51}, {'desplazamiento': -1}):
            self.assertEqual(self.http.get(BASE, params=parametros, headers=self.cabeceras).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_decisiones_envian_version_y_operacion(self):
        for accion, cuerpo in [('publicar', {'referencia': 'Acta'}), ('observaciones', {'observaciones': ['Corregir']}),
                               ('rechazar', {'nota': 'No corresponde'}), ('retirar', {'nota': 'Información vencida'})]:
            self.cliente.rpc.reset_mock()
            self.assertEqual(self.http.post(f'{BASE}/CN-0010/{accion}', json={**cuerpo, 'actualizadoEn': VERSION}, headers=self.cabeceras).status_code, 200)
            nombre, argumentos = self.cliente.rpc.call_args.args
            self.assertEqual(nombre, 'revision_contenidos')
            self.assertEqual(argumentos['operacion'], accion)
            self.assertEqual(argumentos['datos']['folio'], 'CN-0010')
            self.assertTrue(argumentos['datos']['actualizadoEn'].startswith('2026-11-02T12:00:00.123456'))

    def test_datos_incompletos_o_estado_inyectado_no_se_procesan(self):
        casos = [('publicar', {'referencia': ''}), ('publicar', {'referencia': 'Acta', 'estado': 'publicado'}),
                 ('observaciones', {'observaciones': []}), ('observaciones', {'observaciones': [' ']}),
                 ('retirar', {'nota': ' '}), ('rechazar', {'nota': ' '})]
        for accion, cuerpo in casos:
            self.assertEqual(self.http.post(f'{BASE}/CN-0010/{accion}', json={'actualizadoEn': VERSION, **cuerpo}, headers=self.cabeceras).status_code, 422)
        self.assertEqual(self.http.post(f'{BASE}/CN-0010/publicar', json={'referencia': 'Acta'}, headers=self.cabeceras).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_errores_de_permiso_conflicto_y_validacion(self):
        for codigo, esperado in [('42501', 403), ('P0002', 404), ('40001', 409), ('55000', 409), ('23514', 422), ('XX000', 503)]:
            self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message': 'dato interno secreto', 'details': None, 'hint': None})
            respuesta = self.http.post(f'{BASE}/CN-0010/publicar', json={'actualizadoEn': VERSION, 'referencia': 'Acta'}, headers=self.cabeceras)
            self.assertEqual(respuesta.status_code, esperado)
            self.assertNotIn('dato interno secreto', respuesta.text)

    def test_historial_propio_usa_identidad_de_la_sesion(self):
        self.assertEqual(self.http.get('/contenidos/editor/CN-0010/historial', headers=self.cabeceras).status_code, 200)
        self.cliente.rpc.assert_called_once_with('historial_contenido_propio', {'folio_contenido': 'CN-0010'})

    @patch('Back.publicacion.crear_cliente')
    def test_lectura_publica_sin_sesion_y_404(self, crear):
        cliente = crear.return_value
        cliente.rpc.return_value.execute.return_value.data = []
        self.assertEqual(self.http.get('/contenidos/publicos', params={'tipo': 'noticia'}).json(), [])
        self.assertEqual(self.http.get('/contenidos/publicos/CN-0010').status_code, 404)
        cliente.auth.get_user.assert_not_called()
        self.crear.assert_not_called()

    @patch('Back.publicacion.crear_cliente')
    def test_no_devuelve_ejemplos_si_falla_la_base(self, crear):
        crear.return_value.rpc.return_value.execute.side_effect = RuntimeError('error privado')
        respuesta = self.http.get('/contenidos/publicos')
        self.assertEqual(respuesta.status_code, 503)
        self.assertNotIn('error privado', respuesta.text)


if __name__ == '__main__':
    unittest.main()
