from unittest import TestCase
from unittest.mock import Mock, patch

import httpx
from fastapi.testclient import TestClient
from postgrest import SyncPostgrestClient

from Back.main import app


class AgendaTest(TestCase):
    actividad_id = '788a96dd-be42-46ab-ad2f-9b9af263b90f'

    def setUp(self):
        self.respuesta = httpx.Response(200, json=[])
        self.consultas = []
        transporte = httpx.MockTransport(self.responder)
        http = self.enterContext(httpx.Client(transport=transporte))
        bd = SyncPostgrestClient('https://agenda.example/rest/v1', http_client=http)
        self.enterContext(patch('Back.agenda.crear_cliente', return_value=Mock(postgrest=bd)))
        self.transporte_http = http
        self.api = self.enterContext(TestClient(app))

    def responder(self, peticion):
        self.consultas.append(peticion.url)
        return self.respuesta

    def test_filtra_y_pagina_en_la_base(self):
        self.respuesta = httpx.Response(200, json=[{'id': self.actividad_id}])
        respuesta = self.api.get('/public/actividades', params={
            'desde': '2026-10-26', 'hasta': '2026-10-30',
            'tipo': ' taller ', 'page': 2, 'limit': 3,
        })
        self.assertEqual(respuesta.json(), {
            'items': [{'id': self.actividad_id}], 'page': 2, 'limit': 3,
        })
        url, = self.consultas
        self.assertEqual(url.path, '/rest/v1/actividad')
        consulta = url.params
        self.assertEqual(consulta['estadoPublicacion'], 'eq.publicada')
        self.assertEqual(consulta['categoria'], 'eq.taller')
        self.assertEqual(consulta['sesiones.inicio'], 'gte.2026-10-26T00:00:00Z')
        self.assertEqual(consulta.get_list('sesiones.inicio')[-1], 'lte.2026-10-30T23:59:59.999999Z')
        self.assertEqual(consulta['offset'], '3')
        self.assertEqual(consulta['limit'], '3')
        self.assertEqual(consulta['order'], 'titulo.asc,id.asc')
        self.assertIn('sesiones:sesionActividad!inner', consulta['select'])

    def test_detalle_solicita_fecha_lugar_requisitos_y_estado(self):
        actividad = {
            'id': self.actividad_id, 'requerimientos': 'Registro previo',
            'estadoPublicacion': 'publicada', 'sesiones': [{
                'inicio': '2026-10-30T17:00:00Z', 'fin': '2026-10-30T18:00:00Z',
                'estado': 'programada', 'lugar': {'nombre': 'Sala principal'},
            }],
        }
        self.respuesta = httpx.Response(200, json=[actividad])
        respuesta = self.api.get(f'/public/actividades/{self.actividad_id}')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json(), actividad)
        consulta = self.consultas[0].params
        self.assertIn('requerimientos,estadoPublicacion', consulta['select'])
        self.assertIn('inicio,fin,estado,lugar:espacio(nombre)', consulta['select'])
        self.assertNotIn('borrador', consulta['sesiones.estado'])

    def test_id_ausente_o_borrador_devuelve_404_con_filtro_de_publicacion(self):
        respuesta = self.api.get(f'/public/actividades/{self.actividad_id}')
        self.assertEqual(respuesta.status_code, 404)
        consulta = self.consultas[0].params
        self.assertEqual(consulta['id'], f'eq.{self.actividad_id}')
        self.assertEqual(consulta['estadoPublicacion'], 'eq.publicada')

    def test_parametros_invalidos_no_consultan_la_base(self):
        for parametros in (
            {'page': 0}, {'limit': 101}, {'tipo': ' '}, {'desde': '2026-02-30'},
            {'desde': '2026-10-30', 'hasta': '2026-10-26'},
        ):
            with self.subTest(parametros=parametros):
                self.assertEqual(self.api.get('/public/actividades', params=parametros).status_code, 422)
        self.assertEqual(self.api.get('/public/actividades/id-invalido').status_code, 422)
        self.assertEqual(self.consultas, [])

    def test_fallo_de_base_devuelve_503_sin_exponer_detalles(self):
        self.respuesta = httpx.Response(500, json={'message': 'error interno de prueba'})
        respuesta = self.api.get('/public/actividades')
        self.assertEqual(respuesta.status_code, 503)
        self.assertNotIn('error interno de prueba', respuesta.text)

    def test_cierra_conexiones_despues_de_consultar(self):
        self.assertEqual(self.api.get('/public/actividades').status_code, 200)
        self.assertTrue(self.transporte_http.is_closed)

    def test_timeout_cierra_conexiones_y_devuelve_503(self):
        with patch.object(self.transporte_http, 'request', side_effect=httpx.ReadTimeout('secreto')):
            respuesta = self.api.get('/public/actividades')
        self.assertEqual(respuesta.status_code, 503)
        self.assertNotIn('secreto', respuesta.text)
        self.assertTrue(self.transporte_http.is_closed)

    def test_lista_vacia_con_valores_predeterminados(self):
        respuesta = self.api.get('/public/actividades')
        self.assertEqual(respuesta.json(), {'items': [], 'page': 1, 'limit': 20})
        consulta = self.consultas[0].params
        self.assertEqual(consulta['offset'], '0')
        self.assertEqual(consulta['limit'], '20')
        self.assertNotIn('!inner', consulta['select'])
        self.assertEqual(consulta['sesiones.order'], 'inicio.asc,id.asc')

    def test_fecha_unilateral_aplica_join_antes_de_paginar(self):
        # Cada petición crea su propio cliente. Se usa un caso por prueba.
        respuesta = self.api.get('/public/actividades?hasta=2026-10-30')
        self.assertEqual(respuesta.status_code, 200)
        consulta = self.consultas[0].params
        self.assertIn('!inner', consulta['select'])
        self.assertEqual(consulta.get_list('sesiones.inicio'), ['lte.2026-10-30T23:59:59.999999Z'])
