"""Contrato HTTP de asistencia. La persistencia se verifica con la suite SQL."""

import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from Back.main import app

SESION = '00000000-0000-4000-d000-000000000001'
PERSONA = '00000000-0000-4000-e000-000000000002'


class AsistenciaHTTPTests(unittest.TestCase):
    def setUp(self):
        parche = patch('Back.contenidos.crear_cliente')
        self.cliente = parche.start().return_value
        self.addCleanup(parche.stop)
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.http = TestClient(app)
        self.url = f'/sesiones/{SESION}/asistencia'
        self.headers = {'Authorization': 'Bearer token-verificado'}
        self.marca = {'usuarioId': PERSONA, 'estatus': 'presente'}
        self.correccion = {**self.marca, 'version': 1, 'motivo': ' Presencia verificada '}
        self.lista = {
            'sesion': {'id': SESION, 'folio': 'AC-000123', 'nombre': 'Taller', 'espacio': 'Sala',
                       'inicio': '2026-11-09T17:00:00Z', 'estado': 'finalizada', 'cerrada': None,
                       'inscritos': 1, 'total': 1, 'presentes': 0, 'ausentes': 0, 'sinMarcar': 1},
            'personas': [{'usuarioId': PERSONA, 'nombre': 'Persona de prueba', 'marca': None,
                          'version': None, 'confirmada': True, 'motivoAnterior': None,
                          'telefono': 'Dato privado'}],
            'correcciones': [],
        }
        self.cliente.rpc.return_value.execute.return_value.data = self.lista

    def test_todas_las_operaciones_exigen_sesion(self):
        solicitudes = [('GET', '/responsable/asistencia/sesiones', None), ('GET', self.url, None),
                       ('PUT', self.url, {'marcas': [self.marca]}), ('POST', self.url + '/cerrar', {'marcas': []}),
                       ('POST', self.url + '/correcciones', self.correccion)]
        for metodo, ruta, datos in solicitudes:
            with self.subTest(metodo=metodo, ruta=ruta):
                self.assertEqual(self.http.request(metodo, ruta, json=datos).status_code, 401)
        self.cliente.rpc.assert_not_called()

    def test_consulta_con_token_y_sin_contacto(self):
        r = self.http.get(self.url, headers=self.headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.assertIsNone(r.json()['personas'][0]['marca'])
        self.assertNotIn('telefono', r.json()['personas'][0])
        self.cliente.postgrest.auth.assert_called_once_with('token-verificado')
        self.cliente.rpc.assert_called_once_with('gestionar_asistencia', {'operacion': 'consultar', 'datos': {'sesionId': SESION}})

    def test_guardar_y_cerrar_envian_las_marcas_de_la_sesion(self):
        for metodo, sufijo, operacion in [('PUT', '', 'registrar'), ('POST', '/cerrar', 'cerrar')]:
            datos = {'marcas': [self.marca]}
            r = self.http.request(metodo, self.url + sufijo, headers=self.headers, json=datos)
            self.assertEqual(r.status_code, 200)
            self.cliente.rpc.assert_called_with('gestionar_asistencia', {
                'operacion': operacion, 'datos': {'sesionId': SESION, **datos},
            })

    def test_correccion_envia_version_y_motivo_sin_actor_del_cliente(self):
        ruta = self.url + '/correcciones'
        for campo, valor in [('motivo', ' '), ('version', 0), ('corregidoPor', PERSONA)]:
            r = self.http.post(ruta, headers=self.headers, json={**self.correccion, campo: valor})
            self.assertEqual(r.status_code, 422)
        self.cliente.rpc.assert_not_called()

        r = self.http.post(ruta, headers=self.headers, json=self.correccion)
        self.assertEqual(r.status_code, 200)
        self.cliente.rpc.assert_called_once_with('gestionar_asistencia', {
            'operacion': 'corregir', 'datos': {'sesionId': SESION, **self.correccion, 'motivo': 'Presencia verificada'},
        })

    def test_denegacion_y_conflicto_no_exponen_datos(self):
        for codigo, estado in [('42501', 403), ('40001', 409)]:
            self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message': 'Dato privado'})
            r = self.http.post(self.url + '/correcciones', headers=self.headers, json=self.correccion)
            self.assertEqual(r.status_code, estado)
            self.assertNotIn('Dato privado', r.text)
