import unittest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from Back.main import app

BASE = '/actividades/gestion'
VERSION = '2026-11-05T12:00:00.123456Z'


class AgendaTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche = patch('Back.contenidos.crear_cliente')
        self.crear = parche.start()
        self.addCleanup(parche.stop)
        self.cliente = self.crear.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cliente.rpc.return_value.execute.return_value.data = {'folio': 'AC-000001'}
        self.cabeceras = {'Authorization': 'Bearer sesion-actual'}

    def test_mutaciones_y_lectura_privada_requieren_sesion(self):
        self.assertEqual(self.http.get(BASE).status_code, 401)
        self.assertEqual(self.http.post(BASE, json={'nombre': 'Taller', 'tipo': 'Taller'}).status_code, 401)
        self.assertEqual(self.http.post(BASE+'/AC-000001/publicar', json={'actualizado': VERSION}).status_code, 401)
        self.crear.assert_not_called()

    def test_crear_borrador_usa_token_real_y_no_identidad_del_cliente(self):
        r = self.http.post(BASE, headers=self.cabeceras, json={'nombre': ' Taller ', 'tipo': 'Taller'})
        self.assertEqual(r.status_code, 201)
        self.cliente.postgrest.auth.assert_called_with('sesion-actual')
        datos = self.cliente.rpc.call_args.args[1]
        self.assertEqual(datos['operacion'], 'crear')
        self.assertEqual(datos['datos']['nombre'], 'Taller')
        self.assertNotIn('creadoPor', datos['datos'])
        self.assertEqual(self.http.post(BASE, headers=self.cabeceras, json={'nombre': 'Taller', 'tipo': 'Taller', 'creadoPor': 'otro'}).status_code, 422)

    def test_no_permite_publicarse_al_crear(self):
        self.assertEqual(self.http.post(BASE, headers=self.cabeceras, json={'nombre': 'Taller', 'tipo': 'Taller', 'estado': 'publicada'}).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_valida_fechas_horario_y_cupo(self):
        for datos in ({'fecha': '2026-02-31'}, {'inicio': '18:00', 'fin': '17:00'}, {'cupo': '-1'}, {'cupo': '1.5'}):
            r = self.http.post(BASE, headers=self.cabeceras, json={'nombre': 'Taller', 'tipo': 'Taller', **datos})
            self.assertEqual(r.status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_decisiones_conservan_version_y_no_aceptan_estado_inyectado(self):
        for accion in ('aprobar', 'publicar', 'retirar', 'rechazar', 'archivar', 'enviar'):
            self.cliente.rpc.reset_mock()
            r = self.http.post(BASE+'/AC-000001/'+accion, headers=self.cabeceras, json={'actualizado': VERSION, 'referencia': 'Acta', 'motivo': 'Prueba'})
            self.assertEqual(r.status_code, 200)
            llamada = self.cliente.rpc.call_args.args[1]
            self.assertEqual(llamada['operacion'], accion)
            self.assertTrue(llamada['datos']['actualizado'].startswith('2026-11-05T12:00:00.123456'))
        self.assertEqual(self.http.post(BASE+'/AC-000001/publicar', headers=self.cabeceras, json={'actualizado': VERSION, 'estado': 'publicada'}).status_code, 422)
        self.assertEqual(self.http.post(BASE+'/AC-000001/publicar', headers=self.cabeceras, json={}).status_code, 422)

    def test_conflictos_y_permisos_no_se_presentan_como_guardados(self):
        for codigo, estado in [('42501', 403), ('P0002', 404), ('40001', 409), ('55000', 409), ('23514', 422), ('XX000', 503)]:
            self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message': 'secreto interno', 'details': None, 'hint': None})
            r = self.http.post(BASE+'/AC-000001/publicar', headers=self.cabeceras, json={'actualizado': VERSION})
            self.assertEqual(r.status_code, estado)
            self.assertNotIn('secreto interno', r.text)

    @patch('Back.actividades.crear_cliente')
    def test_agenda_anonima_filtros_y_paginacion(self, crear):
        crear.return_value.rpc.return_value.execute.return_value.data = {'total': 0, 'actividades': [], 'pagina': 1}
        r = self.http.get('/actividades/publicas?desde=2026-11-01&hasta=2026-11-30&tipo=Club&pagina=1&limite=12')
        self.assertEqual(r.status_code, 200)
        filtros = crear.return_value.rpc.call_args.args[1]['filtros']
        self.assertEqual(filtros['desde'], '2026-11-01')
        self.assertEqual(filtros['tipo'], 'Club')
        self.assertEqual(filtros['pagina'], 1)
        crear.return_value.auth.get_user.assert_not_called()
        self.crear.assert_not_called()

    @patch('Back.actividades.crear_cliente')
    def test_filtros_invalidos_no_consultan_bd(self, crear):
        for consulta in ('desde=2026-11-30&hasta=2026-11-01', 'desde=2026-02-31', 'limite=51', 'pagina=-1'):
            self.assertEqual(self.http.get('/actividades/publicas?'+consulta).status_code, 422)
        crear.assert_not_called()

    @patch('Back.actividades.crear_cliente')
    def test_retirada_404_y_fallo_sin_ejemplos(self, crear):
        crear.return_value.rpc.return_value.execute.return_value.data = {'total': 0, 'actividades': []}
        self.assertEqual(self.http.get('/actividades/publicas/AC-000001').status_code, 404)
        crear.return_value.rpc.return_value.execute.side_effect = RuntimeError('dato privado')
        r = self.http.get('/actividades/publicas')
        self.assertEqual(r.status_code, 503)
        self.assertNotIn('dato privado', r.text)
