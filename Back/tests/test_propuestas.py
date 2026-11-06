"""Pruebas de propuestas de eventos sin escrituras en una base real."""

import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from Back.main import app


class PropuestasTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche_cliente = patch('Back.propuestas.crear_cliente')
        self.crear_cliente = parche_cliente.start()
        self.addCleanup(parche_cliente.stop)
        parche_ejecutar = patch('Back.propuestas.ejecutar')
        self.ejecutar = parche_ejecutar.start()
        self.addCleanup(parche_ejecutar.stop)

        self.cliente = self.crear_cliente.return_value
        self.usuario_id = str(uuid4())
        self.cliente.auth.get_user.return_value = SimpleNamespace(
            user=SimpleNamespace(id=self.usuario_id),
        )
        self.ejecutar.return_value = {
            'usuarioId': self.usuario_id,
            'roles': [],
            'permisosAdicionales': [],
        }
        self.consulta = Mock()
        for metodo in ('select', 'insert', 'eq', 'order', 'update', 'single'):
            getattr(self.consulta, metodo).return_value = self.consulta
        self.consulta.execute.return_value = SimpleNamespace(data=[])
        self.cliente.table.return_value = self.consulta
        self.cliente.rpc.return_value.execute.return_value = SimpleNamespace(data=[])
        self.headers = {'Authorization': 'Bearer token-valido'}
        self.fecha = datetime(2026, 11, 5, 15, 30, tzinfo=timezone.utc).isoformat()
        self.entrada = {
            'tituloPropuesta': 'Club de lectura',
            'descripcion': (
                'Evento abierto al público para comentar novelas, '
                'sin fines de lucro.'
            ),
            'tipoPropuesta': 'club',
            'publicoDirigido': 'Público general',
            'necesidadEspacio': 'Sala de lectura',
            'frecuenciaReunion': 'Semanal',
            'diasSolicitados': 'Viernes',
            'horarioSolicitado': '16:00 a 17:00',
        }

    def acceso_personal(self, capacidad='gestionar_actividades'):
        self.ejecutar.return_value['permisosAdicionales'] = [
            {'capacidad': capacidad, 'ambito': 'global'},
        ]

    def fila_propuesta(self, **cambios):
        return {
            'id': str(uuid4()),
            **self.entrada,
            'estadoRevision': 'en_revision',
            'observacionesInstitucionales': None,
            'propuestoPor': self.usuario_id,
            'revisadoPor': None,
            'actividadId': None,
            'creadaEn': self.fecha,
            'actualizadoEn': self.fecha,
            **cambios,
        }

    def test_sin_sesion_no_consulta_supabase(self):
        respuesta = self.http.post('/api/propuestas', json=self.entrada)
        self.assertEqual(respuesta.status_code, 401)
        self.crear_cliente.assert_not_called()

    def test_ca_15_1_crea_en_revision_y_devuelve_folio_sin_publicar(self):
        fila = self.fila_propuesta()
        self.consulta.execute.return_value = SimpleNamespace(data=fila)
        respuesta = self.http.post(
            '/api/propuestas',
            headers=self.headers,
            json=self.entrada,
        )

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.json()['id'], fila['id'])
        self.assertEqual(respuesta.json()['estadoRevision'], 'en_revision')
        self.assertEqual(respuesta.json()['propuestoPor'], self.usuario_id)
        fecha_creada = respuesta.json()['creadaEn'].replace('Z', '+00:00')
        self.assertEqual(
            datetime.fromisoformat(fecha_creada),
            datetime.fromisoformat(self.fecha),
        )
        self.assertIsNone(respuesta.json()['actividadId'])
        datos_insertados = self.consulta.insert.call_args.args[0]
        self.assertEqual(datos_insertados['estadoRevision'], 'en_revision')
        self.assertEqual(datos_insertados['propuestoPor'], self.usuario_id)
        self.assertNotIn('actividadId', datos_insertados)
        self.assertNotIn('actividad', [
            llamada.args[0] for llamada in self.cliente.table.call_args_list
        ])

    def test_propuesta_no_puede_indicar_estado_privilegiado_ni_actividad(self):
        respuesta = self.http.post(
            '/api/propuestas',
            headers=self.headers,
            json=self.entrada | {
                'estadoRevision': 'aprobada',
                'actividadId': str(uuid4()),
            },
        )
        self.assertEqual(respuesta.status_code, 422)
        self.cliente.table.assert_not_called()

    def test_rechaza_propuesta_si_faltan_campos_requeridos(self):
        for campo in (
            'tituloPropuesta',
            'descripcion',
            'tipoPropuesta',
            'publicoDirigido',
            'necesidadEspacio',
            'frecuenciaReunion',
            'diasSolicitados',
            'horarioSolicitado',
        ):
            with self.subTest(campo=campo):
                respuesta = self.http.post(
                    '/api/propuestas',
                    headers=self.headers,
                    json={nombre: valor for nombre, valor in self.entrada.items() if nombre != campo},
                )
                self.assertEqual(respuesta.status_code, 422)
        self.cliente.table.assert_not_called()

    def test_rechaza_propuesta_que_no_declara_evento_abierto_y_sin_lucro(self):
        respuesta = self.http.post(
            '/api/propuestas',
            headers=self.headers,
            json=self.entrada | {
                'descripcion': 'Encuentros para comentar novelas y compartir lecturas.',
            },
        )
        self.assertEqual(respuesta.status_code, 422)
        self.cliente.table.assert_not_called()

    def test_usuario_consulta_sus_propuestas_en_orden_descendente(self):
        fila = self.fila_propuesta()
        self.consulta.execute.return_value = SimpleNamespace(data=[fila])
        respuesta = self.http.get('/api/propuestas/me', headers=self.headers)

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.json()), 1)
        self.assertEqual(self.consulta.eq.call_args.args, ('propuestoPor', self.usuario_id))
        self.assertEqual(self.consulta.order.call_args_list[0].args, ('creadaEn',))
        self.assertEqual(self.consulta.order.call_args_list[0].kwargs, {'desc': True})

    def test_personal_lista_y_filtra_con_perfil_minimo(self):
        self.acceso_personal('moderar_foro')
        fila = self.fila_propuesta(perfil={
            'id': self.usuario_id,
            'nombres': 'Ana',
            'primerApellido': 'Rivera',
            'segundoApellido': None,
            'telefono': '5551234567',
        })
        self.cliente.rpc.return_value.execute.return_value = SimpleNamespace(data=[fila])
        respuesta = self.http.get(
            '/api/propuestas?estadoRevision=en_revision',
            headers=self.headers,
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()[0]['perfil']['nombres'], 'Ana')
        self.assertEqual(respuesta.json()[0]['perfil']['telefono'], '5551234567')
        self.cliente.rpc.assert_called_once_with(
            'listar_propuestas_evento_personal',
            {'p_estado': 'en_revision'},
        )
        self.cliente.table.assert_not_called()

    def test_patch_actualiza_estado_revisor_y_observaciones_sin_crear_actividad(self):
        self.acceso_personal()
        propuesta_id = str(uuid4())
        fila = self.fila_propuesta(
            estadoRevision='requiere_correccion',
            observacionesInstitucionales='Indica la capacidad estimada.',
            revisadoPor=self.usuario_id,
        )
        self.consulta.execute.return_value = SimpleNamespace(data=fila)
        respuesta = self.http.patch(
            f'/api/propuestas/{propuesta_id}',
            headers=self.headers,
            json={
                'estadoRevision': 'requiere_correccion',
                'observacionesInstitucionales': 'Indica la capacidad estimada.',
            },
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['revisadoPor'], self.usuario_id)
        self.assertEqual(respuesta.json()['estadoRevision'], 'requiere_correccion')
        actualizacion = self.consulta.update.call_args.args[0]
        self.assertEqual(actualizacion['revisadoPor'], self.usuario_id)
        self.assertEqual(
            actualizacion['observacionesInstitucionales'],
            'Indica la capacidad estimada.',
        )
        self.assertNotIn('actividadId', actualizacion)
        self.assertEqual(
            [llamada.args[0] for llamada in self.cliente.table.call_args_list],
            ['propuestaEvento'],
        )

    def test_personal_sin_capacidad_no_puede_listar_ni_actualizar(self):
        respuesta_lista = self.http.get('/api/propuestas', headers=self.headers)
        respuesta_patch = self.http.patch(
            f'/api/propuestas/{uuid4()}',
            headers=self.headers,
            json={'estadoRevision': 'aprobada'},
        )

        self.assertEqual(respuesta_lista.status_code, 403)
        self.assertEqual(respuesta_patch.status_code, 403)
        self.cliente.table.assert_not_called()
        self.cliente.rpc.assert_not_called()


if __name__ == '__main__':
    unittest.main()
