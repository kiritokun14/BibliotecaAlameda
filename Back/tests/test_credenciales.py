"""Pruebas de solicitudes de credencial sin conexión a una BD real."""

import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from Back.main import app


class CredencialesTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche_cliente = patch('Back.credenciales.crear_cliente')
        self.crear_cliente = parche_cliente.start()
        self.addCleanup(parche_cliente.stop)
        parche_ejecutar = patch('Back.credenciales.ejecutar')
        self.ejecutar = parche_ejecutar.start()
        self.addCleanup(parche_ejecutar.stop)

        self.cliente = self.crear_cliente.return_value
        self.cliente.rpc.return_value.execute.return_value = SimpleNamespace(data=[])
        self.usuario_id = str(uuid4())
        self.personal_id = self.usuario_id
        self.cliente.auth.get_user.return_value = SimpleNamespace(
            user=SimpleNamespace(id=self.usuario_id),
        )
        self.ejecutar.return_value = {
            'usuarioId': self.usuario_id,
            'roles': [],
            'permisosAdicionales': [],
        }
        self.consultas = {}

        def tabla(nombre):
            if nombre not in self.consultas:
                consulta = Mock()
                for metodo in (
                    'select', 'eq', 'in_', 'limit', 'insert', 'single', 'order', 'update',
                ):
                    getattr(consulta, metodo).return_value = consulta
                consulta.execute.return_value = SimpleNamespace(data=[])
                self.consultas[nombre] = consulta
            return self.consultas[nombre]

        self.cliente.table.side_effect = tabla
        self.headers = {'Authorization': 'Bearer token-valido'}
        self.fecha = datetime(2026, 11, 5, 15, 30, tzinfo=timezone.utc).isoformat()

    def acceso_personal(self):
        self.ejecutar.return_value['permisosAdicionales'] = [
            {'capacidad': 'validar_credenciales', 'ambito': 'global'},
        ]

    def consulta_solicitudes(self):
        consulta = self.consultas.get('solicitudCredencial')
        if consulta is None:
            consulta = self.cliente.table('solicitudCredencial')
            self.cliente.table.reset_mock()
        return consulta

    def test_solicitud_nueva_inicia_recibida_y_no_modifica_credencial(self):
        solicitud_id = str(uuid4())
        fila = {
            'id': solicitud_id,
            'usuarioId': self.usuario_id,
            'tipoSolicitud': 'obtencion',
            'estadoSolicitud': 'recibida',
            'fechaCita': None,
            'atendidaPor': None,
            'observaciones': None,
            'creadaEn': self.fecha,
            'actualizadaEn': self.fecha,
        }
        consulta = self.consulta_solicitudes()
        consulta.execute.side_effect = [
            SimpleNamespace(data=[]),
            SimpleNamespace(data=fila),
        ]
        respuesta = self.http.post(
            '/api/credenciales/solicitudes',
            headers=self.headers,
            json={'tipoSolicitud': 'obtencion'},
        )
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.json()['estadoSolicitud'], 'recibida')
        self.assertIsNone(respuesta.json()['fechaCita'])
        self.assertEqual(self.cliente.table.call_count, 2)
        self.assertEqual(self.cliente.table.call_args_list[0].args[0], 'solicitudCredencial')
        self.assertEqual(self.cliente.table.call_args_list[1].args[0], 'solicitudCredencial')
        insertado = consulta.insert.call_args.args[0]
        self.assertNotIn('estadoSolicitud', insertado)
        self.assertNotIn('credencialBibliotecaria', [
            llamada.args[0] for llamada in self.cliente.table.call_args_list
        ])

    def test_rechaza_solicitud_activa_duplicada(self):
        consulta = self.consulta_solicitudes()
        consulta.execute.return_value = SimpleNamespace(data=[{'id': str(uuid4())}])
        respuesta = self.http.post(
            '/api/credenciales/solicitudes',
            headers=self.headers,
            json={'tipoSolicitud': 'renovacion'},
        )
        self.assertEqual(respuesta.status_code, 409)
        self.assertEqual(consulta.execute.call_count, 1)

    def test_usuario_consulta_sus_solicitudes_en_orden_descendente(self):
        filas = [
            {
                'id': str(uuid4()),
                'usuarioId': self.usuario_id,
                'tipoSolicitud': 'renovacion',
                'estadoSolicitud': 'recibida',
                'fechaCita': None,
                'atendidaPor': None,
                'observaciones': None,
                'creadaEn': self.fecha,
                'actualizadaEn': self.fecha,
            },
        ]
        consulta = self.consulta_solicitudes()
        consulta.execute.return_value = SimpleNamespace(data=filas)
        respuesta = self.http.get(
            '/api/credenciales/solicitudes/me',
            headers=self.headers,
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.json()), 1)
        self.assertEqual(consulta.eq.call_args.args, ('usuarioId', self.usuario_id))
        self.assertEqual(consulta.order.call_args_list[-1].args, ('id',))
        self.assertEqual(consulta.order.call_args_list[-1].kwargs, {'desc': True})

    def test_personal_consulta_solicitud_con_perfil_minimo(self):
        self.acceso_personal()
        solicitud_id = str(uuid4())
        fila = {
            'id': solicitud_id,
            'usuarioId': self.usuario_id,
            'tipoSolicitud': 'renovacion',
            'estadoSolicitud': 'recibida',
            'fechaCita': None,
            'atendidaPor': None,
            'observaciones': 'Actualización de datos.',
            'creadaEn': self.fecha,
            'actualizadaEn': self.fecha,
            'perfil': {
                'id': self.usuario_id,
                'nombres': 'Ana',
                'primerApellido': 'Rivera',
                'segundoApellido': None,
                'telefono': '5551234567',
                'municipio': 'Alameda',
            },
        }
        self.cliente.rpc.return_value.execute.return_value = SimpleNamespace(data=[fila])
        respuesta = self.http.get(
            '/api/credenciales/solicitudes?estadoSolicitud=recibida',
            headers=self.headers,
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()[0]['perfil']['nombres'], 'Ana')
        self.assertEqual(respuesta.json()[0]['perfil']['telefono'], '5551234567')
        self.cliente.rpc.assert_called_once_with(
            'listar_solicitudes_credencial_personal',
            {'p_estado': 'recibida'},
        )
        self.assertEqual(self.cliente.table.call_count, 0)

    def test_personal_actualiza_estado_fecha_y_actor(self):
        self.acceso_personal()
        solicitud_id = str(uuid4())
        fila = {
            'id': solicitud_id,
            'usuarioId': self.usuario_id,
            'tipoSolicitud': 'obtencion',
            'estadoSolicitud': 'cita_programada',
            'fechaCita': self.fecha,
            'atendidaPor': self.usuario_id,
            'observaciones': 'Acudir con identificación.',
            'creadaEn': self.fecha,
            'actualizadaEn': self.fecha,
        }
        consulta = self.consulta_solicitudes()
        consulta.execute.return_value = SimpleNamespace(data=fila)
        respuesta = self.http.patch(
            f'/api/credenciales/solicitudes/{solicitud_id}',
            headers=self.headers,
            json={
                'estadoSolicitud': 'cita_programada',
                'fechaCita': self.fecha,
                'observaciones': 'Acudir con identificación.',
            },
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['estadoSolicitud'], 'cita_programada')
        cambios = consulta.update.call_args.args[0]
        self.assertEqual(cambios['atendidaPor'], self.personal_id)
        self.assertEqual(cambios['fechaCita'], self.fecha)

    def test_personal_sin_capacidad_no_consulta_solicitudes(self):
        respuesta = self.http.get(
            '/api/credenciales/solicitudes',
            headers=self.headers,
        )
        self.assertEqual(respuesta.status_code, 403)
        self.cliente.table.assert_not_called()


if __name__ == '__main__':
    unittest.main()
