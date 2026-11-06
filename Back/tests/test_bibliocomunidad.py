"""Pruebas del registro y seguimiento de solicitudes de Bibliocomunidad."""

import asyncio
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, call, patch
from uuid import uuid4

import httpx
from postgrest.exceptions import APIError

from Back.main import app


class ConsultaFalsa:
    """Simula filtros, orden y paginación de las consultas PostgREST."""

    def __init__(self, resultados):
        self.resultados = resultados
        self.filtros = []
        self.ordenes = []
        self.rango_solicitado = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, campo, valor):
        self.filtros.append(('eq', campo, valor))
        return self

    def is_(self, campo, valor):
        self.filtros.append(('is', campo, valor))
        return self

    def order(self, campo, **kwargs):
        self.ordenes.append((campo, kwargs))
        return self

    def range(self, inicio, fin):
        self.rango_solicitado = (inicio, fin)
        return self

    def execute(self):
        data = self.resultados.pop(0) if self.resultados else []
        return SimpleNamespace(data=data, count=len(data))


class ClienteFalso:
    """Sustituye Auth, PostgREST y RPC por respuestas configurables."""

    def __init__(self):
        self.auth = SimpleNamespace(
            get_user=Mock(return_value=SimpleNamespace(user=None)),
        )
        self.postgrest = SimpleNamespace(auth=Mock())
        self.rpc_respuestas = {}
        self.rpc = Mock(side_effect=self._rpc)
        self.resultados_tabla = {}
        self.consultas = []

    def _rpc(self, operacion, parametros):
        resultado = self.rpc_respuestas.get(operacion)
        if isinstance(resultado, Exception):
            ejecutar = Mock(side_effect=resultado)
        else:
            ejecutar = Mock(return_value=SimpleNamespace(data=resultado))
        return SimpleNamespace(execute=ejecutar)

    def table(self, tabla):
        consulta = ConsultaFalsa(self.resultados_tabla.setdefault(tabla, []))
        self.consultas.append((tabla, consulta))
        return consulta


class ClienteHttpx:
    """Envía peticiones a la aplicación FastAPI sin abrir un servidor externo."""

    def __init__(self, aplicacion):
        self.aplicacion = aplicacion

    def request(self, metodo, ruta, **kwargs):
        async def solicitar():
            transporte = httpx.ASGITransport(app=self.aplicacion)
            async with httpx.AsyncClient(
                transport=transporte, base_url='http://testserver',
            ) as cliente:
                return await cliente.request(metodo, ruta, **kwargs)

        return asyncio.run(solicitar())

    def get(self, ruta, **kwargs):
        return self.request('GET', ruta, **kwargs)

    def post(self, ruta, **kwargs):
        return self.request('POST', ruta, **kwargs)

    def patch(self, ruta, **kwargs):
        return self.request('PATCH', ruta, **kwargs)


class BibliocomunidadTests(unittest.TestCase):
    """Comprueba recepción, permisos administrativos y reglas de seguimiento."""

    def setUp(self):
        self.http = ClienteHttpx(app)
        parche_publico = patch('Back.bibliocumnidad.crear_cliente')
        self.fabrica = parche_publico.start()
        self.addCleanup(parche_publico.stop)
        self.cliente = ClienteFalso()
        self.fabrica.return_value = self.cliente
        parche_compartido = patch('Back.contacto.crear_cliente', return_value=self.cliente)
        parche_compartido.start()
        self.addCleanup(parche_compartido.stop)
        self.usuario_id = str(uuid4())
        self.folio = str(uuid4())
        self.fecha = datetime.now(timezone.utc).isoformat()
        self.entrada = {
            'nombreRemitente': 'Ana Rivera',
            'telefonoContacto': '555 123 4567',
            'interes': 'Quiero participar en Bibliocomunidad.',
        }

    def autenticar(self, roles=None, permisos=None):
        # La autenticación y las respuestas de permisos se preparan en el cliente falso.
        self.cliente.auth.get_user.return_value = SimpleNamespace(
            user=SimpleNamespace(id=self.usuario_id),
        )
        self.cliente.rpc_respuestas['administrar_cuentas'] = {
            'usuarioId': self.usuario_id,
            'roles': [{'rolCodigo': rol} for rol in (roles or [])],
        }
        self.cliente.resultados_tabla['permisoCuenta'] = [permisos or []]

    def test_solicitud_publica_acepta_solo_telefono_y_asigna_categoria(self):
        self.cliente.rpc_respuestas['registrar_solicitud_bibliocomunidad'] = {
            'id': self.folio,
            'creadoEn': self.fecha,
        }
        respuesta = self.http.post(
            '/api/v1/public/bibliocomunidad/solicitar',
            json=self.entrada,
        )
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.json()['id'], self.folio)
        self.cliente.rpc.assert_called_once_with(
            'registrar_solicitud_bibliocomunidad',
            {
                'p_usuario_id': None,
                'p_nombre_remitente': 'Ana Rivera',
                'p_correo_contacto': None,
                'p_telefono_contacto': '555 123 4567',
                'p_interes': 'Quiero participar en Bibliocomunidad.',
            },
        )

    def test_solicitud_publica_acepta_correo_sin_telefono(self):
        self.cliente.rpc_respuestas['registrar_solicitud_bibliocomunidad'] = {
            'id': self.folio,
            'creadoEn': self.fecha,
        }
        respuesta = self.http.post(
            '/api/v1/public/bibliocomunidad/solicitar',
            json={
                'nombreRemitente': 'Ana Rivera',
                'correoContacto': 'ana@example.com',
                'interes': 'Quiero participar.',
            },
        )
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(
            self.cliente.rpc.call_args.args[1]['p_correo_contacto'],
            'ana@example.com',
        )
        self.assertIsNone(self.cliente.rpc.call_args.args[1]['p_telefono_contacto'])

    def test_solicitud_sin_medio_de_contacto_es_rechazada(self):
        # La validación debe detener la petición antes de llamar a la base de datos.
        respuesta = self.http.post(
            '/api/v1/public/bibliocomunidad/solicitar',
            json={
                'nombreRemitente': 'Ana Rivera',
                'interes': 'Quiero participar.',
            },
        )
        self.assertEqual(respuesta.status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_solicitud_rechaza_correo_invalido(self):
        respuesta = self.http.post(
            '/api/v1/public/bibliocomunidad/solicitar',
            json=self.entrada | {'correoContacto': 'no-es-email'},
        )
        self.assertEqual(respuesta.status_code, 422)

    def test_no_permite_suplantar_usuario_en_solicitud(self):
        # Un envío anónimo no puede asociar arbitrariamente el folio a una cuenta.
        respuesta = self.http.post(
            '/api/v1/public/bibliocomunidad/solicitar',
            json=self.entrada | {'usuarioId': self.usuario_id},
        )
        self.assertEqual(respuesta.status_code, 403)
        self.cliente.rpc.assert_not_called()

    def test_solicitante_autenticado_se_asocia_a_su_perfil(self):
        self.autenticar()
        self.cliente.rpc_respuestas['registrar_solicitud_bibliocomunidad'] = {
            'id': self.folio,
            'creadoEn': self.fecha,
        }
        respuesta = self.http.post(
            '/api/v1/public/bibliocomunidad/solicitar',
            json=self.entrada | {'usuarioId': self.usuario_id},
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['p_usuario_id'], self.usuario_id)
        self.cliente.postgrest.auth.assert_called_once_with('token-valido')

    def test_listado_admin_filtra_categoria_estado_y_pagina(self):
        self.autenticar(roles=['administrador'])
        fila = {
            'id': self.folio,
            'usuarioId': None,
            'nombreRemitente': 'Ana Rivera',
            'correoContacto': None,
            'telefonoContacto': '555 123 4567',
            'areaAsignada': 'servicios_digitales',
            'asunto': 'Solicitud de incorporación a Bibliocomunidad',
            'cuerpoMensaje': 'Interés',
            'estadoAtencion': 'recibido',
            'atendidoPor': None,
            'respuestaFinal': None,
            'incorporacionConfirmada': False,
            'creadoEn': self.fecha,
            'actualizadoEn': self.fecha,
        }
        self.cliente.resultados_tabla['mensajeContacto'] = [[fila]]
        respuesta = self.http.get(
            '/api/v1/admin/bibliocomunidad/solicitudes'
            '?estado_atencion=recibido&page=2&limit=5',
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['total'], 1)
        tabla, consulta = self.cliente.consultas[-1]
        self.assertEqual(tabla, 'mensajeContacto')
        self.assertIn(('eq', 'tipoContacto', 'bibliocomunidad'), consulta.filtros)
        self.assertIn(('eq', 'estadoAtencion', 'recibido'), consulta.filtros)
        self.assertEqual(consulta.rango_solicitado, (5, 9))

    def test_capacidad_vigente_autoriza_listado_privado(self):
        self.autenticar(permisos=[{
            'capacidad': 'atender_bibliocomunidad',
            'vigenteDesde': '2020-01-01T00:00:00+00:00',
            'vigenteHasta': None,
        }])
        self.cliente.resultados_tabla['mensajeContacto'] = [[]]
        respuesta = self.http.get(
            '/api/v1/admin/bibliocomunidad/solicitudes',
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertIn(
            ('is', 'actividadId', 'null'),
            self.cliente.consultas[0][1].filtros,
        )

    def test_persona_sin_capacidad_no_puede_listar(self):
        self.autenticar(roles=['usuario'])
        respuesta = self.http.get(
            '/api/v1/admin/bibliocomunidad/solicitudes',
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 403)

    def test_intento_fallido_se_registra_sin_cerrar(self):
        # El intento se persiste, pero el resultado no confirma ni cierra el caso.
        self.autenticar(roles=['administrador'])
        self.cliente.rpc_respuestas['registrar_intento_bibliocomunidad'] = {
            'id': str(uuid4()),
            'folioId': self.folio,
            'tipoIntento': 'llamada',
            'exitoso': False,
            'observaciones': 'No hubo respuesta.',
            'estadoAtencion': 'en_atencion',
            'atendidoPor': self.usuario_id,
            'realizadoEn': self.fecha,
        }
        respuesta = self.http.post(
            f'/api/v1/admin/bibliocomunidad/solicitudes/{self.folio}/registrar-intento',
            json={
                'tipoIntento': 'llamada',
                'exitoso': False,
                'observaciones': 'No hubo respuesta.',
            },
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertFalse(respuesta.json()['exitoso'])
        self.assertEqual(respuesta.json()['estadoAtencion'], 'en_atencion')
        self.cliente.rpc.assert_has_calls([
            call(
                'administrar_cuentas',
                {'operacion': 'mi_acceso', 'datos': {}},
            ),
            call(
                'registrar_intento_bibliocomunidad',
                {
                    'p_folio': self.folio,
                    'p_tipo_intento': 'llamada',
                    'p_exitoso': False,
                    'p_observaciones': 'No hubo respuesta.',
                },
            ),
        ])

    def test_cierre_sin_contacto_efectivo_o_resolucion_es_409(self):
        # La función SQL rechaza el cierre cuando falta una condición de resolución.
        self.autenticar(roles=['administrador'])
        self.cliente.rpc_respuestas['finalizar_solicitud_bibliocomunidad'] = APIError({
            'code': '23514',
            'message': 'Se requiere contacto efectivo.',
        })
        respuesta = self.http.patch(
            f'/api/v1/admin/bibliocomunidad/solicitudes/{self.folio}/finalizar',
            json={
                'incorporacionConfirmada': False,
                'respuestaFinal': 'No se logró contactar.',
            },
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 409)

    def test_finalizar_requiere_respuesta_no_vacia(self):
        self.autenticar(roles=['administrador'])
        respuesta = self.http.patch(
            f'/api/v1/admin/bibliocomunidad/solicitudes/{self.folio}/finalizar',
            json={
                'incorporacionConfirmada': False,
                'respuestaFinal': '   ',
            },
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 422)
        self.assertNotIn(
            'finalizar_solicitud_bibliocomunidad',
            [llamada.args[0] for llamada in self.cliente.rpc.call_args_list],
        )

    def test_cierre_puede_usar_resolucion_explicita_sin_confirmar_incorporacion(self):
        self.autenticar(roles=['administrador'])
        resultado = {
            'id': self.folio,
            'usuarioId': None,
            'nombreRemitente': 'Ana Rivera',
            'correoContacto': None,
            'telefonoContacto': '555 123 4567',
            'areaAsignada': 'servicios_digitales',
            'asunto': 'Solicitud de incorporación a Bibliocomunidad',
            'cuerpoMensaje': 'Interés',
            'estadoAtencion': 'cerrado',
            'atendidoPor': self.usuario_id,
            'respuestaFinal': 'Se resolvió la consulta informativa.',
            'incorporacionConfirmada': False,
            'creadoEn': self.fecha,
            'actualizadoEn': self.fecha,
        }
        self.cliente.rpc_respuestas['finalizar_solicitud_bibliocomunidad'] = resultado
        respuesta = self.http.patch(
            f'/api/v1/admin/bibliocomunidad/solicitudes/{self.folio}/finalizar',
            json={
                'incorporacionConfirmada': False,
                'respuestaFinal': 'Se resolvió la consulta informativa.',
                'resolucionExplicita': True,
            },
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertFalse(respuesta.json()['incorporacionConfirmada'])
        self.assertTrue(self.cliente.rpc.call_args.args[1]['p_resolucion_explicita'])

    def test_confirmacion_de_incorporacion_requiere_intento_efectivo_en_bd(self):
        self.autenticar(roles=['administrador'])
        self.cliente.rpc_respuestas['finalizar_solicitud_bibliocomunidad'] = APIError({
            'code': '23514',
            'message': 'No se puede confirmar incorporación sin contacto efectivo.',
        })
        respuesta = self.http.patch(
            f'/api/v1/admin/bibliocomunidad/solicitudes/{self.folio}/finalizar',
            json={
                'incorporacionConfirmada': True,
                'respuestaFinal': 'La incorporación fue confirmada.',
                'resolucionExplicita': True,
            },
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 409)


if __name__ == '__main__':
    unittest.main()
