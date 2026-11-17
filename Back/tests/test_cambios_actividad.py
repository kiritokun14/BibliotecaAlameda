"""Contrato HTTP HU-17. Las reglas transaccionales se prueban en SQL por separado."""
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from Back.main import app

BASE = '/actividades/cambios'
SESION = '00000000-0000-4000-8000-000000000001'
VERSION = '2026-11-16T12:00:00Z'


class CambiosActividadTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche = patch('Back.contenidos.crear_cliente')
        self.cliente = parche.start().return_value
        self.addCleanup(parche.stop)
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cliente.rpc.return_value.execute.return_value.data = {'folio': 'CB-000001'}
        self.cabeceras = {'Authorization': 'Bearer sesion-real'}
        self.solicitud = {'actividad': 'AC-000001', 'actualizado': VERSION, 'tipo': 'cancelacion',
                          'sesiones': [SESION], 'motivo': 'La persona ponente no puede asistir.'}

    def test_todas_las_rutas_exigen_sesion(self):
        for metodo, ruta, datos in [
            ('get', '', None), ('get', '/actividades', None), ('get', '/avisos', None), ('get', '/CB-000001', None),
            ('post', '/avisos/'+SESION+'/leer', {}),
            ('post', '', self.solicitud), ('post', '/CB-000001/aplicar', {'version': 1}),
            ('post', '/CB-000001/resolver', {'version': 1, 'decision': 'rechazar', 'motivo': 'No procede'}),
            ('post', '/CB-000001/reintentar-avisos', {'version': 1}),
        ]:
            r = getattr(self.http, metodo)(BASE + ruta, **({'json': datos} if datos else {}))
            self.assertEqual(r.status_code, 401, ruta)
        self.cliente.rpc.assert_not_called()

    def test_avisos_solo_admiten_id_y_no_identidad_del_destinatario(self):
        r = self.http.get(BASE+'/avisos?limite=10&desplazamiento=20', headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1], {'operacion': 'avisos', 'datos': {'limite': 10, 'desplazamiento': 20}})
        r = self.http.post(BASE+'/avisos/'+SESION+'/leer', headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1], {'operacion': 'leer_aviso', 'datos': {'id': SESION}})

    def test_solicitar_no_llama_mutacion_de_agenda_ni_acepta_actor_inyectado(self):
        r = self.http.post(BASE, json=self.solicitud, headers=self.cabeceras)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.cliente.postgrest.auth.assert_called_with('sesion-real')
        nombre, argumentos = self.cliente.rpc.call_args.args
        self.assertEqual(nombre, 'cambios_actividad')
        self.assertEqual(argumentos['operacion'], 'solicitar')
        self.assertEqual(argumentos['datos']['programacion'], [])
        self.assertEqual(self.http.post(BASE, json={**self.solicitud, 'solicitadoPor': SESION}, headers=self.cabeceras).status_code, 422)

    def test_reprogramacion_exige_una_programacion_por_sesion_y_horario_local(self):
        propuesta = {'sesionId': SESION, 'fecha': '2035-01-01', 'inicio': '10:00', 'fin': '11:00', 'espacio': 'Sala'}
        for programacion in ([], [propuesta, propuesta], [{**propuesta, 'fin': '09:00'}], [{**propuesta, 'inicio': '10:00Z'}]):
            r = self.http.post(BASE, json={**self.solicitud, 'tipo': 'reprogramacion', 'programacion': programacion}, headers=self.cabeceras)
            self.assertEqual(r.status_code, 422)
        self.assertEqual(self.http.post(BASE, json={**self.solicitud, 'sesiones': [SESION, SESION]}, headers=self.cabeceras).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_autorizar_requiere_acuerdo_y_aplicar_solo_admite_version(self):
        resolucion = {'version': 1, 'decision': 'autorizar', 'motivo': 'Autorizado por dirección'}
        self.assertEqual(self.http.post(BASE+'/CB-000001/resolver', json=resolucion, headers=self.cabeceras).status_code, 422)
        acuerdo = {'referencia': 'Acta 17', 'autoridad': 'Dirección', 'fecha': '2026-11-16'}
        r = self.http.post(BASE+'/CB-000001/resolver', json={**resolucion, 'acuerdo': acuerdo}, headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['datos']['acuerdo'], acuerdo)
        r = self.http.post(BASE+'/CB-000001/aplicar', json={'version': 2, 'estado': 'aplicado'}, headers=self.cabeceras)
        self.assertEqual(r.status_code, 422)

    def test_lista_propia_paginada_y_errores_sin_detalles_privados(self):
        r = self.http.get(BASE+'?propias=true&limite=10&desplazamiento=20', headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['datos'], {'propias': True, 'limite': 10, 'desplazamiento': 20})
        for codigo, estado in [('42501', 403), ('40001', 409), ('55000', 409), ('23514', 422), ('XX000', 503)]:
            self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message': 'dato privado', 'hint': None, 'details': None})
            r = self.http.post(BASE+'/CB-000001/aplicar', json={'version': 2}, headers=self.cabeceras)
            self.assertEqual(r.status_code, estado)
            self.assertNotIn('dato privado', r.text)
