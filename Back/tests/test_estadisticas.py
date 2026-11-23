import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from Back.main import app

RUTA = '/administracion/estadisticas'
RESPUESTA = {
    'seccion': 'actividades', 'periodo': 'mes',
    'indicadores': [{'titulo': 'Sesiones realizadas', 'valor': '3', 'detalle': 'En el periodo'}],
    'tituloSerie': 'Asistentes por semana', 'serie': [{'etiqueta': '02/11', 'valor': 12}],
    'tituloTabla': 'Actividades con más asistentes', 'tabla': [{'nombre': 'Club de lectura', 'valor': 12}],
}


def error_bd(codigo):
    return APIError({'code': codigo, 'message': 'x', 'details': None, 'hint': None})


class EstadisticasTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        self.auth = patch('Back.contenidos.crear_cliente').start()
        self.addCleanup(patch.stopall)
        self.cliente = self.auth.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cab = {'Authorization': 'Bearer token'}

    def responder(self, valor):
        if isinstance(valor, Exception):
            self.cliente.rpc.return_value.execute.side_effect = valor
        else:
            self.cliente.rpc.return_value.execute.return_value = Mock(data=valor)

    def test_sin_sesion(self):
        self.assertEqual(self.http.get(RUTA).status_code, 401)

    def test_consulta_con_seccion_y_periodo(self):
        self.responder(RESPUESTA)
        r = self.http.get(RUTA, params={'seccion': 'actividades', 'periodo': 'mes'}, headers=self.cab)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['tituloSerie'], 'Asistentes por semana')
        self.cliente.rpc.assert_called_with('estadisticas_panel', {'seccion': 'actividades', 'periodo': 'mes'})
        self.cliente.postgrest.auth.assert_called_with('token')

    def test_valores_por_defecto(self):
        self.responder(RESPUESTA)
        self.http.get(RUTA, headers=self.cab)
        self.cliente.rpc.assert_called_with('estadisticas_panel', {'seccion': 'portal', 'periodo': '30dias'})

    def test_seccion_invalida(self):
        self.assertEqual(self.http.get(RUTA, params={'seccion': 'otra'}, headers=self.cab).status_code, 422)
        self.assertEqual(self.http.get(RUTA, params={'periodo': 'siglo'}, headers=self.cab).status_code, 422)

    def test_sin_permiso(self):
        self.responder(error_bd('42501'))
        self.assertEqual(self.http.get(RUTA, headers=self.cab).status_code, 403)

    def test_funcion_no_instalada(self):
        self.responder(error_bd('PGRST202'))
        r = self.http.get(RUTA, headers=self.cab)
        self.assertEqual(r.status_code, 503)
        self.assertIn('no están instaladas', r.json()['detail'])

    def test_respuesta_inesperada(self):
        self.responder(None)
        self.assertEqual(self.http.get(RUTA, headers=self.cab).status_code, 503)


if __name__ == '__main__':
    unittest.main()
