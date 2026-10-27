"""T-034: aislamiento entre usuarios, sesión, paginación y errores. Sin BD real."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from Back.main import app


class SolicitudesTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche = patch('Back.solicitudes.crear_cliente')
        self.fabrica = parche.start()
        self.addCleanup(parche.stop)
        self.cliente = self.fabrica.return_value
        self.usuario = str(uuid4())
        self.cliente.auth.get_user.return_value = SimpleNamespace(user=SimpleNamespace(id=self.usuario))
        self.cliente.rpc.return_value.execute.return_value.data = {
            'usuarioId': self.usuario, 'roles': [{'rolCodigo': 'usuario'}], 'permisosAdicionales': [],
        }
        self.consultas = {}
        for tabla in ('solicitudEspacio', 'solicitudCredencial', 'propuestaEvento'):
            consulta = Mock()
            for metodo in ('select', 'eq', 'order', 'range'):
                getattr(consulta, metodo).return_value = consulta
            consulta.execute.return_value = SimpleNamespace(data=[], count=0)
            self.consultas[tabla] = consulta
        self.cliente.table.side_effect = lambda tabla: self.consultas[tabla]
        self.headers = {'Authorization': 'Bearer token-prueba'}

    def get(self, parametros=''):
        return self.http.get('/mis-solicitudes' + parametros, headers=self.headers)

    def test_sin_sesion_no_consulta_datos(self):
        for headers in ({}, {'Authorization': 'Basic abc'}, {'Authorization': 'Bearer '}):
            self.assertEqual(self.http.get('/mis-solicitudes', headers=headers).status_code, 401)
        self.fabrica.assert_not_called()

    def test_token_invalido_es_401_y_no_expone_error(self):
        self.cliente.auth.get_user.side_effect = AuthApiError('detalle privado', 401, 'bad_jwt')
        r = self.get()
        self.assertEqual(r.status_code, 401)
        self.assertNotIn('detalle privado', r.text)
        self.cliente.rpc.assert_not_called()
        self.cliente.table.assert_not_called()

    def test_sesion_revocada_o_cuenta_inactiva_no_llega_a_tablas(self):
        self.cliente.rpc.return_value.execute.side_effect = APIError({'code': '42501', 'message': 'detalle privado'})
        r = self.get()
        self.assertEqual(r.status_code, 403)
        self.assertNotIn('detalle privado', r.text)
        self.cliente.table.assert_not_called()

    def test_consulta_propia_no_depende_de_habilitar_administracion(self):
        with patch.dict(os.environ, {'ADMINISTRACION_HABILITADA': 'false'}):
            r = self.get()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['total_solicitudes'], 0)
        self.assertEqual(r.json()['solicitudes_espacio'], [])
        self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.cliente.auth.get_user.assert_called_once_with('token-prueba')
        self.cliente.postgrest.auth.assert_called_once_with('token-prueba')
        self.cliente.rpc.assert_called_once_with('administrar_cuentas', {'operacion': 'mi_acceso', 'datos': {}})

    def test_no_se_puede_consultar_otro_usuario_por_parametro(self):
        ajeno = str(uuid4())
        r = self.get('?usuarioId=' + ajeno)
        self.assertEqual(r.status_code, 200)
        for tabla, campo in (('solicitudEspacio', 'solicitadoPor'),
                             ('solicitudCredencial', 'usuarioId'), ('propuestaEvento', 'propuestoPor')):
            self.consultas[tabla].eq.assert_called_once_with(campo, self.usuario)

    def test_identidades_discrepantes_se_rechazan(self):
        self.cliente.rpc.return_value.execute.return_value.data['usuarioId'] = str(uuid4())
        self.assertEqual(self.get().status_code, 503)
        self.cliente.table.assert_not_called()

    def test_datos_y_totales_paginados_sin_campos_internos(self):
        fecha = '2026-10-20T10:00:00+00:00'
        filas = {
            'solicitudEspacio': {'id': str(uuid4()), 'propositoVisita': 'Lectura', 'cantidadPersonas': 3,
                                'fechaInicioSolicitado': fecha, 'fechaFinSolicitado': fecha,
                                'estadoSolicitud': 'pendiente', 'creadaEn': fecha},
            'solicitudCredencial': {'id': str(uuid4()), 'tipoSolicitud': 'alta',
                                   'estadoSolicitud': 'pendiente', 'creadaEn': fecha},
            'propuestaEvento': {'id': str(uuid4()), 'tituloPropuesta': 'Club', 'descripcion': 'Lectura',
                               'tipoPropuesta': 'club', 'estadoRevision': 'en_revision', 'creadaEn': fecha},
        }
        for tabla, total in zip(filas, (50, 30, 9)):
            self.consultas[tabla].execute.return_value = SimpleNamespace(
                data=[filas[tabla] | {'campoInterno': 'no-publicar'}], count=total)
        r = self.get('?limite=5&desplazamiento=10')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['total_solicitudes'], 89)
        self.assertEqual(r.json()['totales_por_tipo']['solicitudes_espacio'], 50)
        self.assertEqual(r.json()['limite_por_tipo'], 5)
        self.assertNotIn('campoInterno', r.text)
        self.assertNotIn('no-publicar', r.text)
        for consulta in self.consultas.values():
            consulta.range.assert_called_once_with(10, 14)
            self.assertNotEqual(consulta.select.call_args.args[0], '*')
            self.assertEqual(consulta.select.call_args.kwargs, {'count': 'exact'})

    def test_paginacion_invalida(self):
        for parametros in ('?limite=0', '?limite=101', '?desplazamiento=-1', '?desplazamiento=100001'):
            self.assertEqual(self.get(parametros).status_code, 422)
        self.cliente.table.assert_not_called()

    def test_error_de_consulta_no_filtra_detalles_ni_resultado_parcial(self):
        self.consultas['solicitudCredencial'].execute.side_effect = APIError({
            'code': 'XX000', 'message': 'tabla interna token secreto',
        })
        r = self.get()
        self.assertEqual(r.status_code, 503)
        self.assertNotIn('tabla interna', r.text)
        self.assertNotIn('token secreto', r.text)
        self.assertNotIn('solicitudes_espacio', r.json())

    def test_resultado_incompleto_es_error_controlado(self):
        self.consultas['propuestaEvento'].execute.return_value = SimpleNamespace(
            data=[{'id': str(uuid4()), 'datoPrivado': 'no-publicar'}], count=1)
        r = self.get()
        self.assertEqual(r.status_code, 503)
        self.assertNotIn('no-publicar', r.text)

    def test_pagina_posterior_al_final_es_vacia(self):
        for consulta in self.consultas.values():
            consulta.execute.side_effect = [
                APIError({'code': 'PGRST103', 'message': 'Rango fuera de resultados'}),
                SimpleNamespace(data=None, count=2),
            ]
        r = self.get('?desplazamiento=50')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['total_solicitudes'], 6)
        self.assertEqual(r.json()['propuestas_eventos'], [])


if __name__ == '__main__':
    unittest.main()
