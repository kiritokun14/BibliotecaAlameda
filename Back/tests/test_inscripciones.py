"""Contrato HTTP; las reglas transaccionales se prueban aparte en PostgreSQL."""
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from Back.main import app

SESION = '00000000-0000-4000-d000-000000000003'
INSCRIPCION = '00000000-0000-4000-e000-000000000002'


class InscripcionesHTTPTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche = patch('Back.contenidos.crear_cliente')
        self.crear = parche.start()
        self.addCleanup(parche.stop)
        self.cliente = self.crear.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cliente.rpc.return_value.execute.return_value.data = []
        self.headers = {'Authorization': 'Bearer token-verificado'}
        self.url = f'/inscripciones/{INSCRIPCION}/confirmar'

    def test_todas_las_rutas_exigen_autenticacion(self):
        for url in ['/responsable/actividades', f'/sesiones/{SESION}/inscripciones', f'/sesiones/{SESION}/cupos']:
            self.assertEqual(self.http.get(url).status_code, 401)
        self.assertEqual(self.http.patch(self.url, json={'motivo': 'Revisado'}).status_code, 401)
        self.crear.assert_not_called()

    def test_consulta_autorizada_y_paginada(self):
        r = self.http.get(f'/sesiones/{SESION}/inscripciones?limite=10&desplazamiento=2', headers=self.headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.cliente.rpc.assert_called_with('gestionar_inscripciones', {'operacion': 'listar', 'datos': {
            'sesionId': SESION, 'limite': 10, 'desplazamiento': 2}})
        self.cliente.postgrest.auth.assert_called_with('token-verificado')

    def test_cupos(self):
        esperado = {'sesionId': SESION, 'capacidad': 2, 'confirmados': 1, 'disponibles': 1}
        self.cliente.rpc.return_value.execute.return_value.data = esperado
        r = self.http.get(f'/sesiones/{SESION}/cupos', headers=self.headers)
        self.assertEqual(r.json(), esperado)

    def test_actividades(self):
        self.assertEqual(self.http.get('/responsable/actividades', headers=self.headers).status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['operacion'], 'actividades')

    def test_confirmacion_no_envia_actor_desde_cliente(self):
        r = self.http.patch(self.url, headers=self.headers, json={'motivo': ' Requisitos revisados '})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1], {'operacion': 'confirmar', 'datos': {
            'inscripcionId': INSCRIPCION, 'motivo': 'Requisitos revisados'}})

    def test_rechaza_identidad_estado_y_motivo_invalido(self):
        for datos in [{}, {'motivo': ' '}, {'motivo': 'a' * 501},
                      {'motivo': 'Revisado', 'decisionPor': INSCRIPCION},
                      {'motivo': 'Revisado', 'status': 'confirmada'}]:
            self.assertEqual(self.http.patch(self.url, headers=self.headers, json=datos).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_errores_de_negocio_y_privacidad(self):
        for codigo, estado in [('42501', 403), ('P0002', 404), ('23514', 409), ('55000', 409),
                               ('23505', 409), ('40001', 409), ('22023', 400), ('XX000', 500)]:
            with self.subTest(codigo=codigo):
                self.cliente.rpc.return_value.execute.side_effect = APIError({
                    'code': codigo, 'message': 'telefono correo documento privado', 'details': None, 'hint': None})
                r = self.http.patch(self.url, headers=self.headers, json={'motivo': 'Revisado'})
                self.assertEqual(r.status_code, estado)
                self.assertNotIn('privado', r.text)

    def test_sesion_ajena_denegada_sin_datos(self):
        self.cliente.rpc.return_value.execute.side_effect = APIError({'code': '42501', 'message': 'privado'})
        r = self.http.get(f'/sesiones/{SESION}/inscripciones', headers=self.headers)
        self.assertEqual(r.status_code, 403)
        self.assertEqual(set(r.json()), {'detail'})

    def test_identificadores_y_paginacion_invalidos(self):
        for url in ['/sesiones/no-uuid/cupos', '/responsable/actividades?limite=101',
                    f'/sesiones/{SESION}/inscripciones?desplazamiento=-1']:
            self.assertEqual(self.http.get(url, headers=self.headers).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_fallo_inesperado_no_expone_detalles(self):
        self.cliente.rpc.return_value.execute.side_effect = RuntimeError('clave secreta')
        r = self.http.get(f'/sesiones/{SESION}/cupos', headers=self.headers)
        self.assertEqual(r.status_code, 500)
        self.assertNotIn('secreta', r.text)

    def test_rechazo_y_cancelacion_envian_solo_motivo_e_inscripcion(self):
        for accion in ['rechazar', 'cancelar']:
            r = self.http.patch(f'/inscripciones/{INSCRIPCION}/{accion}', headers=self.headers,
                                json={'motivo': ' Decisión revisada '})
            self.assertEqual(r.status_code, 200)
            self.assertEqual(self.cliente.rpc.call_args.args[1], {'operacion': accion, 'datos': {
                'inscripcionId': INSCRIPCION, 'motivo': 'Decisión revisada'}})

    def test_nuevas_rutas_exigen_sesion_y_motivo(self):
        for accion in ['rechazar', 'cancelar']:
            url = f'/inscripciones/{INSCRIPCION}/{accion}'
            self.assertEqual(self.http.patch(url, json={'motivo': 'Revisado'}).status_code, 401)
            for datos in [{}, {'motivo': ' '}, {'motivo': 'Revisado', 'decisionPor': INSCRIPCION}]:
                self.assertEqual(self.http.patch(url, headers=self.headers, json=datos).status_code, 422)
        self.assertEqual(self.http.get(f'/sesiones/{SESION}/inscripciones/conteos').status_code, 401)
        self.cliente.rpc.assert_not_called()

    def test_conteos_usa_operacion_independiente(self):
        r = self.http.get(f'/sesiones/{SESION}/inscripciones/conteos', headers=self.headers)
        self.assertEqual(r.status_code, 200)
        self.cliente.rpc.assert_called_with('gestionar_inscripciones', {
            'operacion': 'conteos', 'datos': {'sesionId': SESION}})

    def test_nuevas_rutas_propagan_denegacion(self):
        self.cliente.rpc.return_value.execute.side_effect = APIError({'code': '42501', 'message': 'privado'})
        for accion in ['rechazar', 'cancelar']:
            self.assertEqual(self.http.patch(f'/inscripciones/{INSCRIPCION}/{accion}',
                headers=self.headers, json={'motivo': 'Revisado'}).status_code, 403)
        self.assertEqual(self.http.get(f'/sesiones/{SESION}/inscripciones/conteos', headers=self.headers).status_code, 403)
