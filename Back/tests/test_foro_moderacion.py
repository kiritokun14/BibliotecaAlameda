import unittest
from unittest.mock import Mock, patch
from uuid import uuid4
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from Back.main import app


class ModeracionForoTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app); parche = patch('Back.contenidos.crear_cliente')
        self.crear = parche.start(); self.addCleanup(parche.stop)
        self.cliente = self.crear.return_value; self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cliente.rpc.return_value.execute.return_value.data = {'reporteId': str(uuid4()), 'estadoReporte': 'pendiente'}
        self.id = str(uuid4()); self.headers = {'Authorization': 'Bearer actual'}
        self.medida = {'actualizadoEn': '2026-11-08T12:00:00.123456Z', 'versionContenido': 'a'*32, 'medida': 'ocultar', 'motivo': 'Contenido ofensivo revisado.'}

    def test_exige_sesion_para_reportar_y_moderar(self):
        for ruta in ['/foro/reportes/me', '/foro/moderacion/reportes', '/foro/moderacion/reportes/'+self.id]:
            self.assertEqual(self.http.get(ruta).status_code, 401)
        self.assertEqual(self.http.post('/foro/reportes', json={'tipoContenido': 'tema', 'contenidoId': self.id, 'motivo': 'Prueba'}).status_code, 401)
        self.crear.assert_not_called()

    def test_autor_reporte_se_decide_en_bd(self):
        datos = {'tipoContenido': 'comentario', 'contenidoId': self.id, 'motivo': 'Abuso'}
        r = self.http.post('/foro/reportes', headers=self.headers, json=datos)
        self.assertEqual(r.status_code, 201); self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.assertEqual(self.cliente.rpc.call_args.args, ('foro_moderacion', {'operacion': 'reportar', 'datos': datos}))
        for extra in [{'reportadoPor': self.id}, {'estadoReporte': 'resuelto'}, {'motivo': ' '}, {'tipoContenido': 'noticia'}]:
            self.assertEqual(self.http.post('/foro/reportes', headers=self.headers, json=datos | extra).status_code, 422)

    def test_medida_envia_version_de_reporte_y_contenido_sin_actor_inyectado(self):
        r = self.http.patch('/foro/moderacion/reportes/'+self.id, headers=self.headers, json=self.medida)
        self.assertEqual(r.status_code, 200)
        datos = self.cliente.rpc.call_args.args[1]['datos']
        self.assertEqual(datos['versionContenido'], 'a'*32); self.assertEqual(datos['motivo'], self.medida['motivo'])
        self.assertNotIn('atendidoPor', datos)

    def test_no_publica_no_cambia_roles_ni_omite_motivo(self):
        for extra in [{'medida': 'publicar'}, {'motivo': ''}, {'atendidoPor': self.id}, {'versionContenido': 'sin-version'}, {'actualizadoEn': '2026-11-08T12:00:00'}]:
            self.assertEqual(self.http.patch('/foro/moderacion/reportes/'+self.id, headers=self.headers, json=self.medida | extra).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_listas_paginadas_y_filtros_limitados(self):
        r = self.http.get('/foro/moderacion/reportes?estado=en_revision&desplazamiento=20', headers=self.headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1], {'operacion': 'listar', 'datos': {'estado': 'en_revision', 'desplazamiento': 20}})
        for ruta in ['/foro/reportes/me?desplazamiento=-1', '/foro/moderacion/reportes?estado=inventado']:
            self.assertEqual(self.http.get(ruta, headers=self.headers).status_code, 422)

    def test_errores_controlados_no_filtran_detalles(self):
        for codigo, estado in [('42501',403),('P0002',404),('23505',409),('40001',409),('55000',409),('23514',422),('XX000',503)]:
            self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message': 'dato privado', 'details': None, 'hint': None})
            r = self.http.get('/foro/moderacion/reportes', headers=self.headers)
            self.assertEqual(r.status_code, estado); self.assertNotIn('dato privado', r.text)
