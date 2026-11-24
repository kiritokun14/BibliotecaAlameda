"""Contrato HTTP de progreso y recompensas. Las reglas se verifican con la suite SQL."""

import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from Back.main import app

PERSONA = '00000000-0000-4000-e000-000000000002'
RECOMPENSA = '00000000-0000-4000-f000-000000000003'
ENTREGA = '00000000-0000-4000-f000-000000000004'


class RecompensasHTTPTests(unittest.TestCase):
    def setUp(self):
        parche = patch('Back.contenidos.crear_cliente')
        self.cliente = parche.start().return_value
        self.addCleanup(parche.stop)
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.http = TestClient(app)
        self.headers = {'Authorization': 'Bearer token-verificado'}
        self.cliente.rpc.return_value.execute.return_value.data = {'ok': True}
        self.recompensa = {'nombre': ' Separador ', 'descripcion': 'Conmemorativo', 'nivelRequerido': 1,
                           'existencias': 50, 'vigenciaInicio': '2026-11-01T00:00:00-07:00',
                           'vigenciaFin': '2027-01-24T23:59:00-07:00', 'estado': 'activa'}
        self.asignacion = {'recompensaId': RECOMPENSA, 'usuarioId': PERSONA, 'referencia': 'Oficio DIR-12',
                           'autoridad': 'Dirección', 'fechaAutorizacion': '2026-11-20'}

    def llamada(self):
        return self.cliente.rpc.call_args.args

    def test_todas_las_rutas_exigen_sesion(self):
        rutas = [('GET', '/progreso/mio', None), ('GET', '/participantes/progreso', None),
                 ('GET', f'/participantes/progreso/{PERSONA}', None),
                 ('POST', f'/participantes/progreso/{PERSONA}/ajustes', {'cambio': 1, 'motivo': 'x'}),
                 ('GET', '/participantes/recompensas', None), ('POST', '/participantes/recompensas', self.recompensa),
                 ('GET', '/participantes/entregas', None), ('POST', '/participantes/entregas', self.asignacion),
                 ('POST', f'/participantes/entregas/{ENTREGA}/confirmar', None),
                 ('POST', f'/participantes/entregas/{ENTREGA}/cancelar', {'motivo': 'x'})]
        for metodo, ruta, datos in rutas:
            with self.subTest(ruta=ruta):
                self.assertEqual(self.http.request(metodo, ruta, json=datos).status_code, 401)
        self.cliente.rpc.assert_not_called()

    def test_mi_progreso_no_se_guarda_en_cache(self):
        r = self.http.get('/progreso/mio', headers=self.headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.assertEqual(self.llamada(), ('progreso_recompensas', {'operacion': 'mio', 'datos': {}}))

    def test_ajuste_requiere_motivo_y_cambio_distinto_de_cero(self):
        ruta = f'/participantes/progreso/{PERSONA}/ajustes'
        for datos in [{'cambio': 0, 'motivo': 'x'}, {'cambio': 1, 'motivo': ' '}, {'cambio': 11, 'motivo': 'x'},
                      {'cambio': '1', 'motivo': 'x'}, {'cambio': 1, 'motivo': 'x', 'registradoPor': PERSONA}]:
            with self.subTest(datos=datos):
                self.assertEqual(self.http.post(ruta, headers=self.headers, json=datos).status_code, 422)
        self.cliente.rpc.assert_not_called()
        r = self.http.post(ruta, headers=self.headers, json={'cambio': -1, 'motivo': ' Registro duplicado '})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.llamada(), ('progreso_recompensas', {'operacion': 'ajustar', 'datos': {
            'usuarioId': PERSONA, 'cambio': -1, 'motivo': 'Registro duplicado'}}))

    def test_recompensa_valida_nivel_y_vigencia(self):
        for cambio in [{'nivelRequerido': 3}, {'existencias': -1}, {'estado': 'agotada'},
                       {'vigenciaFin': '2026-10-01T00:00:00-07:00'}, {'vigenciaInicio': '2026-11-01T00:00:00'}]:
            with self.subTest(cambio=cambio):
                r = self.http.post('/participantes/recompensas', headers=self.headers, json={**self.recompensa, **cambio})
                self.assertEqual(r.status_code, 422)
        self.cliente.rpc.assert_not_called()
        r = self.http.post('/participantes/recompensas', headers=self.headers, json=self.recompensa)
        self.assertEqual(r.status_code, 201)
        operacion, cuerpo = self.llamada()
        self.assertEqual(cuerpo['operacion'], 'crear_recompensa')
        self.assertEqual(cuerpo['datos']['nombre'], 'Separador')

    def test_edicion_envia_la_version_leida(self):
        r = self.http.patch(f'/participantes/recompensas/{RECOMPENSA}', headers=self.headers,
                            json={**self.recompensa, 'actualizadoEn': '2026-11-22T10:00:00Z'})
        self.assertEqual(r.status_code, 200)
        datos = self.llamada()[1]['datos']
        self.assertEqual(datos['id'], RECOMPENSA)
        self.assertIn('actualizadoEn', datos)

    def test_asignacion_registra_autorizacion(self):
        for falta in ['referencia', 'autoridad', 'fechaAutorizacion']:
            with self.subTest(falta=falta):
                datos = {k: v for k, v in self.asignacion.items() if k != falta}
                self.assertEqual(self.http.post('/participantes/entregas', headers=self.headers, json=datos).status_code, 422)
        r = self.http.post('/participantes/entregas', headers=self.headers, json=self.asignacion)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.llamada()[1], {'operacion': 'asignar', 'datos': {**self.asignacion, 'notas': ''}})

    def test_confirmar_y_cancelar(self):
        self.assertEqual(self.http.post(f'/participantes/entregas/{ENTREGA}/confirmar', headers=self.headers).status_code, 200)
        self.assertEqual(self.llamada()[1], {'operacion': 'confirmar', 'datos': {'entregaId': ENTREGA}})
        ruta = f'/participantes/entregas/{ENTREGA}/cancelar'
        self.assertEqual(self.http.post(ruta, headers=self.headers, json={'motivo': ''}).status_code, 422)
        self.assertEqual(self.http.post(ruta, headers=self.headers, json={'motivo': 'No se presentó'}).status_code, 200)

    def test_errores_se_traducen_sin_exponer_datos(self):
        casos = [('42501', 'x', 403), ('P0002', 'x', 404), ('40001', 'x', 409), ('55000', 'x', 409),
                 ('23514', 'La entrega requiere credencial bibliotecaria validada y vigente.', 422)]
        for codigo, mensaje, estado in casos:
            with self.subTest(codigo=codigo):
                self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message': mensaje + ' Dato privado'})
                r = self.http.post('/participantes/entregas', headers=self.headers, json=self.asignacion)
                self.assertEqual(r.status_code, estado)
                self.assertNotIn('privado', r.text)
        self.assertIn('credencial', r.json()['detail'])


if __name__ == '__main__':
    unittest.main()
