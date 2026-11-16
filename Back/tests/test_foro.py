import unittest
from unittest.mock import Mock, patch
from uuid import uuid4
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from Back.main import app


class ForoConectadoTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        auth = patch('Back.contenidos.crear_cliente'); anon = patch('Back.foro.crear_cliente')
        self.auth = auth.start().return_value; self.anon = anon.start().return_value
        self.addCleanup(auth.stop); self.addCleanup(anon.stop)
        self.auth.auth.get_user.return_value = Mock(user=Mock())
        for cliente in (self.auth, self.anon): cliente.rpc.return_value.execute.return_value.data = {'total': 0, 'temas': []}
        self.id = str(uuid4()); self.headers = {'Authorization': 'Bearer actual'}

    def test_lectura_publica_no_requiere_cuenta(self):
        r = self.http.get('/foro/temas')
        self.assertEqual(r.status_code, 200); self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.anon.rpc.assert_called_once_with('foro_lectura', {'operacion': 'temas', 'datos': {'desplazamiento': 0}})
        self.auth.rpc.assert_not_called()

    def test_lectura_con_sesion_lleva_token_para_ver_solo_pendientes_propios(self):
        r = self.http.get('/foro/temas/'+self.id+'/respuestas?desplazamiento=20', headers=self.headers)
        self.assertEqual(r.status_code, 200)
        self.auth.postgrest.auth.assert_called_with('actual')
        self.auth.rpc.assert_called_with('foro_lectura', {'operacion': 'respuestas', 'datos': {'temaId': self.id, 'desplazamiento': 20}})

    def test_sin_cuenta_no_participa_ni_revisa(self):
        self.assertEqual(self.http.post('/foro/temas/'+self.id+'/respuestas', json={'id': str(uuid4()), 'texto': 'Opinión'}).status_code, 401)
        self.assertEqual(self.http.get('/foro/moderacion/pendientes').status_code, 401)
        self.auth.rpc.assert_not_called()

    def test_post_reutiliza_id_y_no_admite_autor_estado_o_rol(self):
        datos = {'id': str(uuid4()), 'texto': 'Mi opinión'}
        ruta = '/foro/temas/'+self.id+'/respuestas'
        self.assertEqual(self.http.post(ruta, headers=self.headers, json=datos).status_code, 201)
        self.assertEqual(self.auth.rpc.call_args.args[1], {'operacion': 'crear', 'datos': {'tipo': 'comentario', 'temaId': self.id, **datos}})
        for extra in [{'creadoPor': self.id}, {'estado': 'publicado'}, {'roles': ['administrador']}, {'texto': ' '}, {'texto': 'a'*1001}]:
            self.assertEqual(self.http.post(ruta, headers=self.headers, json=datos | extra).status_code, 422)

    def test_editar_y_retirar_exigen_version(self):
        ruta = '/foro/respuestas/'+self.id
        self.assertEqual(self.http.patch(ruta, headers=self.headers, json={'texto': 'Edición'}).status_code, 422)
        self.assertEqual(self.http.patch(ruta, headers=self.headers, json={'texto': 'Edición', 'version': 'a'*32}).status_code, 200)
        self.assertEqual(self.auth.rpc.call_args.args[1]['operacion'], 'editar')
        self.assertEqual(self.http.request('DELETE', ruta, headers=self.headers, json={'version': 'a'*32}).status_code, 200)
        self.assertEqual(self.auth.rpc.call_args.args[1]['datos'], {'tipo': 'comentario', 'id': self.id, 'version': 'a'*32})

    def test_revision_exige_motivo_y_no_acepta_medidas_ajenas(self):
        ruta = '/foro/moderacion/pendientes/comentario/'+self.id
        datos = {'version': 'a'*32, 'medida': 'publicar', 'motivo': 'Cumple las normas'}
        self.assertEqual(self.http.patch(ruta, headers=self.headers, json=datos).status_code, 200)
        self.assertEqual(self.auth.rpc.call_args.args[0], 'foro_participacion')
        for extra in [{'motivo': ''}, {'medida': 'silenciar'}, {'moderadoPor': self.id}]:
            self.assertEqual(self.http.patch(ruta, headers=self.headers, json=datos | extra).status_code, 422)

    def test_no_expone_errores_internos(self):
        self.anon.rpc.return_value.execute.side_effect = APIError({'code': 'P0002', 'message': 'dato privado', 'details': None, 'hint': None})
        r = self.http.get('/foro/temas/'+self.id)
        self.assertEqual(r.status_code, 404); self.assertNotIn('dato privado', r.text)

    def test_limites_e_identificadores(self):
        for ruta in ['/foro/temas?desplazamiento=-1', '/foro/temas/no-es-uuid', '/foro/temas/'+self.id+'/respuestas?desplazamiento=100001']:
            self.assertEqual(self.http.get(ruta).status_code, 422)
