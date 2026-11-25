import csv
from io import StringIO
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from Back.main import app

RUTA = '/administracion/estadisticas'
REPORTE = RUTA + '/participacion'
PERIODO = {'desde': '2026-11-01', 'hasta': '2026-11-02'}
ACTIVIDAD = '00000000-0000-4000-8000-000000000010'
SESION = '00000000-0000-4000-8000-000000000011'
REGISTRO = {'total': 18, 'referencia': 'Bitácora de prueba persona@example.test', 'version': '2026-11-02T19:00:00Z'}
CONTEOS = {'solicitudes': 7, 'confirmaciones': 4, 'asistencias': 2, 'ausencias': 1, 'listasCerradas': 1,
           'sesionesRealizadas': 1, 'sesionesCanceladas': 0, 'incidencias': None, 'visitasGenerales': 18, 'atenciones': 3}
INFORME = {**PERIODO, 'ambito': 'global', 'actividadId': None, 'puedeRegistrarVisitas': True,
           'actividades': [{'id': ACTIVIDAD, 'folio': 'AC-0010', 'titulo': 'Título persona@example.test'}],
           'fuentes': {'solicitudes': 'Inscripciones', 'confirmaciones': 'Inscripciones confirmadas',
                       'asistencias': 'Listas cerradas', 'ausencias': 'Listas cerradas',
                       'visitasGenerales': 'Registro diario', 'atenciones': 'Contactos cerrados',
                       'incidencias': 'Registro por sesión'},
           'totales': {**CONTEOS, 'sesionesConIncidencias': 0, 'diasConVisitas': 1},
           'dias': [{'fecha': PERIODO['desde'], **CONTEOS, 'registroVisitas': REGISTRO},
                    {'fecha': PERIODO['hasta'], **CONTEOS, 'visitasGenerales': None, 'registroVisitas': None}],
           'sesiones': [{**CONTEOS, 'fecha': PERIODO['desde'], 'id': SESION, 'folio': 'AC-0010',
                         'titulo': 'Título persona@example.test', 'estado': 'finalizada', 'listaCerrada': True,
                         'registroIncidencias': None, 'puedeRegistrarIncidencias': False,
                         'nombreParticipante': 'persona@example.test'}]}
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

    def test_reporte_separa_las_cifras(self):
        self.responder(INFORME)
        respuesta = self.http.get(REPORTE, params=PERIODO, headers=self.cab)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.headers['cache-control'], 'private, no-store')
        datos = respuesta.json()
        self.assertEqual([datos['totales'][key] for key in ('solicitudes', 'confirmaciones', 'asistencias',
                                                            'visitasGenerales', 'atenciones')], [7, 4, 2, 18, 3])
        self.assertNotIn('nombreParticipante', datos['sesiones'][0])
        self.cliente.rpc.assert_called_once_with('estadisticas_participacion', {**PERIODO, 'actividad_id': None})

    def test_reporte_de_actividad_no_muestra_conteos_generales(self):
        self.responder({**INFORME, 'ambito': 'actividades_asignadas', 'actividadId': ACTIVIDAD,
                        'puedeRegistrarVisitas': False, 'dias': [],
                        'totales': {**INFORME['totales'], 'visitasGenerales': None, 'diasConVisitas': None, 'atenciones': None}})
        respuesta = self.http.get(REPORTE, params={**PERIODO, 'actividad_id': ACTIVIDAD}, headers=self.cab)
        self.assertEqual(respuesta.status_code, 200)
        self.assertIsNone(respuesta.json()['totales']['visitasGenerales'])
        self.assertIsNone(respuesta.json()['totales']['atenciones'])
        self.cliente.rpc.assert_called_once_with('estadisticas_participacion', {**PERIODO, 'actividad_id': ACTIVIDAD})

    def test_exporta_solo_fechas_conteos_y_folios_seguros(self):
        self.responder({**INFORME, 'sesiones': INFORME['sesiones'] + [
            {**INFORME['sesiones'][0], 'folio': '=HIPERVINCULO("persona@example.test")'},
        ]})
        resultado = self.http.get(REPORTE + '.csv', params=PERIODO, headers=self.cab)
        self.assertEqual(resultado.status_code, 200)
        self.assertIn('attachment;', resultado.headers['content-disposition'])
        self.assertEqual(resultado.headers['cache-control'], 'private, no-store')
        self.assertNotIn('persona@example.test', resultado.text)
        self.assertNotIn(ACTIVIDAD, resultado.text)
        self.assertNotIn(SESION, resultado.text)
        filas = list(csv.DictReader(StringIO(resultado.text.lstrip('\ufeff'))))
        self.assertEqual([filas[0][campo] for campo in ('Solicitudes', 'Confirmaciones', 'Asistencias verificadas',
                                                       'Visitas generales')], ['7', '4', '2', '18'])
        self.assertEqual(filas[2]['Visitas generales'], '')
        self.assertEqual(filas[3]['Folio actividad'], 'AC-0010')
        self.assertEqual(filas[3]['Sesiones realizadas'], '1')
        self.assertEqual(filas[4]['Folio actividad'], '')

    def test_exportacion_privada_y_periodos_invalidos(self):
        self.assertEqual(self.http.get(REPORTE + '.csv', params=PERIODO).status_code, 401)
        for filtros in ({}, {**PERIODO, 'hasta': '2026-10-31'}, {**PERIODO, 'hasta': '2028-01-01'},
                        {**PERIODO, 'actividad_id': 'ajena'}, {**PERIODO, 'usuarioId': ACTIVIDAD}):
            with self.subTest(filtros=filtros):
                self.assertEqual(self.http.get(REPORTE, params=filtros, headers=self.cab).status_code, 422)
        self.cliente.rpc.assert_not_called()
        self.responder(error_bd('42501'))
        respuesta = self.http.get(REPORTE + '.csv', params=PERIODO, headers=self.cab)
        self.assertEqual(respuesta.status_code, 403)
        self.assertNotIn('content-disposition', respuesta.headers)

    def test_capturas_usan_la_sesion_el_registro_y_la_version(self):
        self.responder(REGISTRO)
        datos = {'total': 0, 'referencia': ' Bitácora 1 ', 'version': None}
        normalizados = {**datos, 'referencia': 'Bitácora 1'}
        respuesta = self.http.put(RUTA + '/visitas-generales/2026-11-02', json=datos, headers=self.cab)
        self.assertEqual(respuesta.status_code, 200)
        self.cliente.rpc.assert_called_with('guardar_visitas_generales', {'fecha': '2026-11-02', **normalizados})
        respuesta = self.http.put(RUTA + '/incidencias/' + SESION, json=datos, headers=self.cab)
        self.assertEqual(respuesta.status_code, 200)
        self.cliente.rpc.assert_called_with('guardar_incidencias_sesion', {'sesion_id': SESION, **normalizados})
        self.cliente.rpc.reset_mock()
        for invalido in ({**datos, 'total': -1}, {**datos, 'total': '2'}, {**datos, 'referencia': ''},
                         {**datos, 'registradoPor': ACTIVIDAD}):
            self.assertEqual(self.http.put(RUTA + '/incidencias/' + SESION, json=invalido, headers=self.cab).status_code, 422)
        self.cliente.rpc.assert_not_called()
        self.responder(error_bd('40001'))
        self.assertEqual(self.http.put(RUTA + '/incidencias/' + SESION, json=datos, headers=self.cab).status_code, 409)


if __name__ == '__main__':
    unittest.main()
