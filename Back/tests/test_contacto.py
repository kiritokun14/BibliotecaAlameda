"""Pruebas de recepción pública, seguimiento por folio y atención de contactos."""

import asyncio
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

import httpx

from Back.main import app


class ConsultaFalsa:
    """Registra las operaciones encadenadas sobre una tabla simulada."""

    def __init__(self, resultados):
        self.resultados = resultados
        self.filtros = []
        self.actualizacion = None
        self.ordenes = []

    def select(self, *args, **kwargs):
        return self

    def eq(self, campo, valor):
        self.filtros.append(('eq', campo, valor))
        return self

    def lte(self, campo, valor):
        self.filtros.append(('lte', campo, valor))
        return self

    def in_(self, campo, valores):
        self.filtros.append(('in', campo, valores))
        return self

    def update(self, valores):
        self.actualizacion = valores
        return self

    def order(self, campo, **kwargs):
        self.ordenes.append((campo, kwargs))
        return self

    def range(self, inicio, fin):
        return self

    def limit(self, limite):
        return self

    def execute(self):
        return SimpleNamespace(
            data=self.resultados.pop(0) if self.resultados else [],
            count=1,
        )


class ClienteFalso:
    """Simula el cliente Supabase usado por los endpoints y la autenticación."""

    def __init__(self):
        self.auth = SimpleNamespace(
            get_user=Mock(return_value=SimpleNamespace(user=None)),
        )
        self.postgrest = SimpleNamespace(auth=Mock())
        self.rpc = Mock(return_value=SimpleNamespace(
            execute=Mock(return_value=SimpleNamespace(data=None)),
        ))
        self.resultados_tabla = {}
        self.consultas = []

    def table(self, tabla):
        consulta = ConsultaFalsa(self.resultados_tabla.setdefault(tabla, []))
        self.consultas.append((tabla, consulta))
        return consulta


class ClienteHttpx:
    """Ejecuta solicitudes ASGI directamente contra la aplicación FastAPI."""

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


class ContactoTests(unittest.TestCase):
    """Comprueba la separación entre recepción pública y operaciones del personal."""

    def setUp(self):
        self.http = ClienteHttpx(app)
        parche_publico = patch('Back.contacto.crear_cliente')
        self.fabrica_publica = parche_publico.start()
        self.addCleanup(parche_publico.stop)
        self.cliente = ClienteFalso()
        self.fabrica_publica.return_value = self.cliente

        parche_servicio = patch('Back.contacto.crear_cliente_servicio')
        self.fabrica_servicio = parche_servicio.start()
        self.addCleanup(parche_servicio.stop)
        self.servicio = ClienteFalso()
        self.fabrica_servicio.return_value = self.servicio

        self.usuario_id = str(uuid4())
        self.folio = str(uuid4())
        self.fecha = datetime.now(timezone.utc).isoformat()
        self.entrada = {
            'nombreRemitente': 'Ana Rivera',
            'correoContacto': 'ana@example.com',
            'asunto': 'Sugerencia',
            'cuerpoMensaje': 'Propongo un club de lectura.',
        }

    def autenticar(self, roles=None, permisos=None):
        # El servicio administrativo se autoriza con roles o capacidades configurados.
        self.cliente.auth.get_user.return_value = SimpleNamespace(
            user=SimpleNamespace(id=self.usuario_id),
        )
        self.cliente.rpc.return_value.execute.return_value.data = {
            'usuarioId': self.usuario_id,
            'roles': [{'rolCodigo': rol} for rol in (roles or [])],
        }
        self.cliente.resultados_tabla['permisoCuenta'] = [permisos or []]

    def test_envio_anonimo_genera_folio_en_estado_inicial(self):
        self.cliente.rpc.return_value.execute.return_value.data = {
            'id': self.folio, 'creadoEn': self.fecha,
        }
        respuesta = self.http.post('/api/v1/public/contacto', json=self.entrada)
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.json()['id'], self.folio)
        self.assertIn('folio', respuesta.json()['mensaje'])
        self.cliente.rpc.assert_called_once_with('registrar_contacto_publico', {
            'p_usuario_id': None,
            'p_nombre_remitente': self.entrada['nombreRemitente'],
            'p_correo_contacto': self.entrada['correoContacto'],
            'p_asunto': self.entrada['asunto'],
            'p_cuerpo_mensaje': self.entrada['cuerpoMensaje'],
        })

    def test_envio_autenticado_asocia_sesion_y_permita_aviso(self):
        self.cliente.auth.get_user.return_value = SimpleNamespace(
            user=SimpleNamespace(id=self.usuario_id),
        )
        self.cliente.rpc.return_value.execute.return_value.data = {
            'id': self.folio, 'creadoEn': self.fecha,
        }
        respuesta = self.http.post(
            '/api/v1/public/contacto',
            json=self.entrada | {'usuarioId': self.usuario_id},
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(
            self.cliente.rpc.call_args.args[1]['p_usuario_id'],
            self.usuario_id,
        )
        self.cliente.postgrest.auth.assert_called_once_with('token-valido')

    def test_no_permite_suplantar_usuario_en_envio_anonimo(self):
        # La API ignora cualquier intento anónimo de asociar el mensaje a otra cuenta.
        respuesta = self.http.post(
            '/api/v1/public/contacto',
            json=self.entrada | {'usuarioId': self.usuario_id},
        )
        self.assertEqual(respuesta.status_code, 403)
        self.cliente.rpc.assert_not_called()

    def test_rechaza_formulario_invalido(self):
        respuesta = self.http.post(
            '/api/v1/public/contacto',
            json=self.entrada | {'correoContacto': 'no-es-correo'},
        )
        self.assertEqual(respuesta.status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_seguimiento_solo_consulta_folio_y_no_expone_respuesta_antes_de_cierre(self):
        # Antes del cierre se devuelve el estado, pero no se expone una respuesta final.
        self.cliente.rpc.return_value.execute.return_value.data = {
            'id': self.folio,
            'asunto': 'Sugerencia',
            'estadoAtencion': 'recibido',
            'creadoEn': self.fecha,
        }
        respuesta = self.http.get(
            f'/api/v1/public/contacto/seguimiento/{self.folio}',
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['estadoAtencion'], 'recibido')
        self.assertNotIn('respuestaFinal', respuesta.json())
        self.cliente.rpc.assert_called_once_with(
            'consultar_contacto_por_folio', {'p_folio': self.folio},
        )

    def test_seguimiento_folio_inexistente_es_404(self):
        self.cliente.rpc.return_value.execute.return_value.data = None
        respuesta = self.http.get(
            f'/api/v1/public/contacto/seguimiento/{self.folio}',
        )
        self.assertEqual(respuesta.status_code, 404)

    def test_seguimiento_devuelve_respuesta_final_solo_al_cerrar(self):
        self.cliente.rpc.return_value.execute.return_value.data = {
            'id': self.folio,
            'asunto': 'Sugerencia',
            'estadoAtencion': 'cerrado',
            'creadoEn': self.fecha,
            'respuestaFinal': 'Gracias por tu sugerencia.',
        }
        respuesta = self.http.get(
            f'/api/v1/public/contacto/seguimiento/{self.folio}',
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['estadoAtencion'], 'cerrado')
        self.assertEqual(respuesta.json()['respuestaFinal'], 'Gracias por tu sugerencia.')

    def test_panel_admin_requiere_autenticacion(self):
        respuesta = self.http.get('/api/v1/admin/contacto')
        self.assertEqual(respuesta.status_code, 401)
        self.fabrica_servicio.assert_not_called()

    def test_admin_lista_contactos_paginados(self):
        self.autenticar(roles=['administrador'])
        contacto = {
            'id': self.folio,
            'usuarioId': None,
            'nombreRemitente': 'Ana Rivera',
            'correoContacto': 'ana@example.com',
            'asunto': 'Sugerencia',
            'cuerpoMensaje': 'Texto',
            'estadoAtencion': 'recibido',
            'atendidoPor': None,
            'respuestaFinal': None,
            'creadoEn': self.fecha,
            'actualizadoEn': self.fecha,
        }
        self.servicio.resultados_tabla['mensajeContacto'] = [[contacto]]

        respuesta = self.http.get(
            '/api/v1/admin/contacto?page=1&limit=5&estado_atencion=recibido',
            headers={'Authorization': 'Bearer token-valido'},
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['total'], 1)
        self.assertEqual(respuesta.json()['items'][0]['estadoAtencion'], 'recibido')
        tabla, consulta = self.servicio.consultas[0]
        self.assertEqual(tabla, 'mensajeContacto')
        self.assertIn(('eq', 'estadoAtencion', 'recibido'), consulta.filtros)

    def test_personal_con_capacidad_vigente_puede_atender(self):
        self.autenticar(permisos=[{
            'capacidad': 'atender_contactos',
            'vigenteDesde': '2020-01-01T00:00:00+00:00',
            'vigenteHasta': None,
        }])
        self.servicio.resultados_tabla['mensajeContacto'] = [[]]
        respuesta = self.http.get(
            '/api/v1/admin/contacto',
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 200)

    def test_usuario_sin_capacidad_no_puede_listar(self):
        self.autenticar(roles=['usuario'])
        respuesta = self.http.get(
            '/api/v1/admin/contacto',
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 403)
        self.fabrica_servicio.assert_not_called()

    def test_cerrar_sin_respuesta_es_400(self):
        self.autenticar(roles=['administrador'])
        respuesta = self.http.patch(
            f'/api/v1/admin/contacto/{self.folio}/atender',
            json={'estadoAtencion': 'cerrado'},
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(self.servicio.consultas, [])

    def test_asignar_atencion_registra_personal_y_estado(self):
        self.autenticar(roles=['administrador'])
        contacto = {
            'id': self.folio,
            'usuarioId': None,
            'nombreRemitente': 'Ana Rivera',
            'correoContacto': 'ana@example.com',
            'asunto': 'Sugerencia',
            'cuerpoMensaje': 'Texto',
            'estadoAtencion': 'en_atencion',
            'atendidoPor': self.usuario_id,
            'respuestaFinal': None,
            'creadoEn': self.fecha,
            'actualizadoEn': self.fecha,
        }
        self.servicio.resultados_tabla['mensajeContacto'] = [[contacto]]

        respuesta = self.http.patch(
            f'/api/v1/admin/contacto/{self.folio}/atender',
            json={'estadoAtencion': 'en_atencion'},
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 200)
        _tabla, consulta = self.servicio.consultas[0]
        self.assertEqual(consulta.actualizacion['estadoAtencion'], 'en_atencion')
        self.assertEqual(consulta.actualizacion['atendidoPor'], self.usuario_id)
        self.assertIn(('in', 'estadoAtencion', ['recibido']), consulta.filtros)

    def test_cerrar_contacto_exige_y_persiste_respuesta(self):
        self.autenticar(roles=['administrador'])
        contacto = {
            'id': self.folio,
            'usuarioId': None,
            'nombreRemitente': 'Ana Rivera',
            'correoContacto': 'ana@example.com',
            'asunto': 'Sugerencia',
            'cuerpoMensaje': 'Texto',
            'estadoAtencion': 'cerrado',
            'atendidoPor': self.usuario_id,
            'respuestaFinal': 'Gracias por tu sugerencia.',
            'creadoEn': self.fecha,
            'actualizadoEn': self.fecha,
        }
        self.servicio.resultados_tabla['mensajeContacto'] = [[contacto]]

        respuesta = self.http.patch(
            f'/api/v1/admin/contacto/{self.folio}/atender',
            json={
                'estadoAtencion': 'cerrado',
                'respuestaFinal': 'Gracias por tu sugerencia.',
            },
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['respuestaFinal'], 'Gracias por tu sugerencia.')
        _tabla, consulta = self.servicio.consultas[0]
        self.assertEqual(consulta.actualizacion['respuestaFinal'], 'Gracias por tu sugerencia.')
        self.assertIn(('in', 'estadoAtencion', ['recibido', 'en_atencion']), consulta.filtros)

    def test_personal_no_puede_atender_folio_inexistente(self):
        self.autenticar(roles=['administrador'])
        self.servicio.resultados_tabla['mensajeContacto'] = [[], []]
        respuesta = self.http.patch(
            f'/api/v1/admin/contacto/{self.folio}/atender',
            json={'estadoAtencion': 'en_atencion'},
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 404)

    def test_personal_no_puede_reabrir_cerrado(self):
        # Una transición inválida debe distinguirse de un folio inexistente.
        self.autenticar(roles=['administrador'])
        self.servicio.resultados_tabla['mensajeContacto'] = [
            [],
            [{'id': self.folio}],
        ]
        respuesta = self.http.patch(
            f'/api/v1/admin/contacto/{self.folio}/atender',
            json={'estadoAtencion': 'en_atencion'},
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 409)

    def test_capacidad_expirada_no_autoriza_listado(self):
        self.autenticar(permisos=[{
            'capacidad': 'atender_contactos',
            'vigenteDesde': '2020-01-01T00:00:00+00:00',
            'vigenteHasta': '2021-01-01T00:00:00+00:00',
        }])
        respuesta = self.http.get(
            '/api/v1/admin/contacto',
            headers={'Authorization': 'Bearer token-valido'},
        )
        self.assertEqual(respuesta.status_code, 403)
        self.fabrica_servicio.assert_not_called()


if __name__ == '__main__':
    unittest.main()
