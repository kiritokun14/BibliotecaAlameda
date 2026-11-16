"""Integración adaptada de las pruebas T-072/T-075 de Stephanie, sin red."""
import unittest
from unittest.mock import Mock, patch
from uuid import uuid4
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from Back.main import app

VERSION = '2026-11-05T12:00:00.123456Z'
PROPUESTA = {'tituloPropuesta': 'Club', 'descripcion': 'Lectura compartida.', 'tipoPropuesta': 'Club',
 'publicoDirigido': 'Juventud', 'necesidadEspacio': 'Sala de lectura', 'frecuenciaReunion': 'Semanal',
 'diasSolicitados': 'Viernes', 'horarioSolicitado': '16:00 a 17:00', 'abiertaAlPublico': True, 'sinFinesDeLucro': True}


class AtencionTramitesTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche = patch('Back.contenidos.crear_cliente')
        self.crear = parche.start(); self.addCleanup(parche.stop)
        self.cliente = self.crear.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cliente.rpc.return_value.execute.return_value.data = {'id': str(uuid4()), 'historial': []}
        self.headers = {'Authorization': 'Bearer token-actual'}
        self.id = str(uuid4())

    def test_routers_registrados_sin_prefijo_api_duplicado(self):
        rutas = app.openapi()['paths']
        self.assertIn('/credenciales/solicitudes', rutas)
        self.assertIn('/propuestas', rutas)
        self.assertIn('/propuestas/{propuesta_id}/corregir', rutas)
        self.assertNotIn('/api/propuestas', rutas)

    def test_no_consulta_ni_guarda_sin_sesion(self):
        for ruta in ['/credenciales/solicitudes/me', '/credenciales/solicitudes', '/propuestas/me', '/propuestas']:
            self.assertEqual(self.http.get(ruta).status_code, 401)
        self.assertEqual(self.http.post('/propuestas', json=PROPUESTA).status_code, 401)
        self.crear.assert_not_called()

    def test_crea_credencial_sin_modificar_titular_ni_emitir_credencial(self):
        r = self.http.post('/credenciales/solicitudes', headers=self.headers, json={'tipoSolicitud': 'obtencion'})
        self.assertEqual(r.status_code, 201)
        self.cliente.postgrest.auth.assert_called_with('token-actual')
        self.assertEqual(self.cliente.rpc.call_args.args, ('atencion_solicitudes', {'tipo_solicitud': 'credencial', 'operacion': 'crear', 'datos': {'tipoSolicitud': 'obtencion'}}))
        self.cliente.table.assert_not_called()
        self.assertEqual(r.headers['Cache-Control'], 'private, no-store')

    def test_no_acepta_estado_identidad_o_credencial_inyectados(self):
        for extra in [{'usuarioId': self.id}, {'estadoSolicitud': 'atendida'}, {'credencialBibliotecaria': 'Emitida'}]:
            self.assertEqual(self.http.post('/credenciales/solicitudes', headers=self.headers, json={'tipoSolicitud': 'obtencion', **extra}).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_duplicados_devuelven_conflicto(self):
        self.cliente.rpc.return_value.execute.side_effect = APIError({'code': '23505', 'message': 'dato interno', 'details': None, 'hint': None})
        r = self.http.post('/credenciales/solicitudes', headers=self.headers, json={'tipoSolicitud': 'renovacion'})
        self.assertEqual(r.status_code, 409)
        self.assertNotIn('dato interno', r.text)

    def test_cita_requiere_fecha_con_zona_y_rechazo_requiere_motivo(self):
        for datos in [{'estadoSolicitud': 'cita_programada'}, {'estadoSolicitud': 'cita_programada', 'fechaCita': '2035-06-12T10:00:00'}, {'estadoSolicitud': 'rechazada'}, {'estadoSolicitud': 'cancelada', 'observaciones': ' '}]:
            r = self.http.patch('/credenciales/solicitudes/'+self.id, headers=self.headers, json={'actualizadaEn': VERSION, **datos})
            self.assertEqual(r.status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_resolver_conserva_version_y_no_impone_actor(self):
        r = self.http.patch('/credenciales/solicitudes/'+self.id, headers=self.headers,
            json={'estadoSolicitud': 'cita_programada', 'fechaCita': '2035-06-12T10:00:00-07:00', 'actualizadaEn': VERSION})
        self.assertEqual(r.status_code, 200)
        args = self.cliente.rpc.call_args.args[1]
        self.assertEqual(args['operacion'], 'resolver')
        self.assertNotIn('atendidaPor', args['datos'])
        self.assertTrue(args['datos']['actualizadaEn'].startswith('2026-11-05T12:00:00.123456'))

    def test_propuesta_no_depende_de_frases_magicas(self):
        self.assertEqual(self.http.post('/propuestas', headers=self.headers, json=PROPUESTA).status_code, 201)
        args = self.cliente.rpc.call_args.args[1]
        self.assertEqual(args['tipo_solicitud'], 'propuesta')
        self.assertTrue(args['datos']['abiertaAlPublico'])
        self.assertNotIn('estadoRevision', args['datos'])

    def test_exige_ambas_confirmaciones_y_no_admite_actividad_inyectada(self):
        for datos in [PROPUESTA | {'abiertaAlPublico': False}, PROPUESTA | {'sinFinesDeLucro': False}, PROPUESTA | {'actividadId': self.id}, PROPUESTA | {'propuestoPor': self.id}]:
            self.assertEqual(self.http.post('/propuestas', headers=self.headers, json=datos).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_estado_inexistente_no_llega_a_bd(self):
        r = self.http.patch('/propuestas/'+self.id, headers=self.headers, json={'estadoRevision': 'en_atencion', 'actualizadoEn': VERSION})
        self.assertEqual(r.status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_observaciones_requeridas_para_correccion_y_rechazo(self):
        for estado in ('requiere_correccion', 'rechazada'):
            self.assertEqual(self.http.patch('/propuestas/'+self.id, headers=self.headers, json={'estadoRevision': estado, 'actualizadoEn': VERSION}).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_correccion_propia_es_operacion_separada_con_version(self):
        r = self.http.put('/propuestas/'+self.id+'/corregir', headers=self.headers, json=PROPUESTA | {'actualizadoEn': VERSION})
        self.assertEqual(r.status_code, 200)
        args = self.cliente.rpc.call_args.args[1]
        self.assertEqual(args['operacion'], 'corregir')
        self.assertEqual(args['datos']['id'], self.id)
        self.assertNotIn('revisadoPor', args['datos'])

    def test_resolucion_exige_acuerdo_externo_completo_y_motivo(self):
        acuerdo = {'responsable': 'Dirección de la biblioteca', 'fecha': '2026-01-01', 'referencia': 'Minuta 001'}
        for estado in ('aprobada', 'rechazada'):
            base = {'estadoRevision': estado, 'actualizadoEn': VERSION, 'observacionesInstitucionales': 'Acuerdo institucional'}
            for extra in ({}, {'acuerdoDireccion': {}}, {'acuerdoDireccion': acuerdo | {'responsable': ' '}},
                          {'acuerdoDireccion': acuerdo | {'fecha': '2026-02-30'}},
                          {'acuerdoDireccion': acuerdo | {'referencia': ''}},
                          {'acuerdoDireccion': acuerdo, 'observacionesInstitucionales': None}):
                self.assertEqual(self.http.patch('/propuestas/'+self.id, headers=self.headers, json=base | extra).status_code, 422)
            self.cliente.rpc.assert_not_called()
            r = self.http.patch('/propuestas/'+self.id, headers=self.headers, json=base | {'acuerdoDireccion': acuerdo})
            self.assertEqual(r.status_code, 200)
            datos = self.cliente.rpc.call_args.args[1]['datos']
            self.assertEqual(datos['acuerdoDireccion'], acuerdo)
            self.assertNotIn('revisadoPor', datos)
            self.cliente.rpc.reset_mock()

    def test_pedir_correcciones_no_suplanta_acuerdo_de_direccion(self):
        datos = {'estadoRevision': 'requiere_correccion', 'actualizadoEn': VERSION,
                 'observacionesInstitucionales': 'Aclara horario',
                 'acuerdoDireccion': {'responsable': 'Dirección', 'fecha': '2026-01-01', 'referencia': 'Minuta'}}
        self.assertEqual(self.http.patch('/propuestas/'+self.id, headers=self.headers, json=datos).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_paginacion_y_filtros_validan_limites(self):
        r = self.http.get('/propuestas?estadoRevision=en_revision&limite=20&desplazamiento=40', headers=self.headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['datos']['desplazamiento'], 40)
        self.cliente.rpc.reset_mock()
        for consulta in ['limite=51', 'desplazamiento=-1', 'estadoRevision=en_atencion']:
            self.assertEqual(self.http.get('/propuestas?'+consulta, headers=self.headers).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_errores_sin_filtrar_datos_internos(self):
        for codigo, esperado in [('42501', 403), ('40001', 409), ('55000', 409), ('23514', 422), ('P0002', 404), ('XX000', 503)]:
            self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message': 'secreto interno', 'details': None, 'hint': None})
            r = self.http.get('/propuestas/'+self.id, headers=self.headers)
            self.assertEqual(r.status_code, esperado)
            self.assertNotIn('secreto interno', r.text)

    def test_mias_no_permite_elegir_otra_identidad(self):
        r = self.http.get('/propuestas/me', headers=self.headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['operacion'], 'mias')
        self.assertNotIn('propuestoPor', self.cliente.rpc.call_args.args[1]['datos'])

    def test_publicacion_unica_transaccion_y_sesion(self):
        datos = {'nombre': 'Evento', 'tipo': 'Evento', 'descripcion': 'Texto público', 'fecha': '2035-06-12',
                 'inicio': '10:00', 'fin': '11:00', 'espacio': 'Sala', 'cupo': '10', 'responsable': 'Biblioteca',
                 'actualizadoEn': VERSION, 'confirmacion': True}
        ruta = f'/propuestas/{self.id}/publicar'
        self.assertEqual(self.http.post(ruta, json=datos).status_code, 401)
        self.assertEqual(self.http.post(ruta, headers=self.headers, json=datos).status_code, 200)
        llamada = self.cliente.rpc.call_args
        self.assertEqual(llamada.args[0], 'publicar_propuesta')
        self.assertEqual(llamada.args[1]['datos']['id'], self.id)
        self.assertEqual(llamada.args[1]['datos']['actualizadoEn'], VERSION.replace('Z', 'Z'))
        self.cliente.rpc.reset_mock()
        for cambio in ({'confirmacion': False}, {'inicio': '12:00'}, {'creadoPor': self.id}, {'actualizadoEn': 'ayer'}):
            self.assertEqual(self.http.post(ruta, headers=self.headers, json={**datos, **cambio}).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_publicacion_errores_controlados(self):
        datos = {'nombre': 'Evento', 'tipo': 'Evento', 'fecha': '2035-06-12', 'inicio': '10:00', 'fin': '11:00',
                 'actualizadoEn': VERSION, 'confirmacion': True}
        for codigo, estado in [('42501',403),('40001',409),('55000',409),('23514',422),('XX000',503)]:
            self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message':'secreto interno','details':None,'hint':None})
            respuesta = self.http.post(f'/propuestas/{self.id}/publicar', headers=self.headers, json=datos)
            self.assertEqual(respuesta.status_code, estado)
            self.assertNotIn('secreto interno', respuesta.text)
