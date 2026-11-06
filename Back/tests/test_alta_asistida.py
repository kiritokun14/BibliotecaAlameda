import unittest
import os
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from Back.main import app

RUTA = '/cuentas/alta-asistida'


def datos_adulto(**cambios):
    datos = {
        'nombres': 'Ana', 'primerApellido': 'Pérez', 'segundoApellido': 'Luna', 'fechaNacimiento': '1990-05-10',
        'telefono': '3111234567', 'correo': 'ana@ejemplo.com', 'aceptaAviso': True,
        'domicilio': {'calle': 'Av. México', 'numeroExterior': '10', 'coloniaLocalidad': 'Centro',
                      'codigoPostal': '63000', 'municipio': 'Tepic', 'estadoProvincia': 'Nayarit'},
        'motivo': 'La persona no tiene correo propio a la mano en mostrador',
    }
    datos.update(cambios)
    return datos


class AltaAsistidaTests(unittest.TestCase):
    def setUp(self):
        entorno = patch.dict(os.environ, {'ALTA_ASISTIDA_HABILITADA': 'true'})
        entorno.start()
        self.addCleanup(entorno.stop)
        self.http = TestClient(app)
        parche = patch('Back.alta_asistida.crear_cliente')
        self.crear = parche.start()
        self.addCleanup(parche.stop)
        servicio = patch('Back.alta_asistida.crear_cliente_servicio')
        self.crear_servicio = servicio.start()
        self.addCleanup(servicio.stop)
        self.cliente = self.crear.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.invitar = self.crear_servicio.return_value.auth.admin.invite_user_by_email
        self.id = str(uuid4())
        self.respuesta_rpc({'id': self.id, 'correo': 'ana@ejemplo.com', 'estado': 'lista', 'candidatos': []})
        self.cabeceras = {'Authorization': 'Bearer token-de-prueba'}

    def respuesta_rpc(self, datos):
        self.cliente.rpc.return_value.execute.return_value.data = datos

    def test_sin_token_no_invoca_supabase(self):
        self.assertEqual(self.http.post(RUTA, json=datos_adulto()).status_code, 401)
        self.assertEqual(self.http.get(RUTA).status_code, 401)
        self.crear.assert_not_called()

    def test_deshabilitado_hasta_aplicar_migracion(self):
        with patch.dict(os.environ, {'ALTA_ASISTIDA_HABILITADA': 'false'}):
            r = self.http.post(RUTA, json=datos_adulto(), headers=self.cabeceras)
        self.assertEqual(r.status_code, 503)
        self.cliente.rpc.assert_not_called()

    def test_sin_duplicados_envia_invitacion(self):
        r = self.http.post(RUTA, json=datos_adulto(), headers=self.cabeceras)
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()['invitacionEnviada'])
        self.cliente.postgrest.auth.assert_called_once_with('token-de-prueba')
        nombre, parametros = self.cliente.rpc.call_args.args
        self.assertEqual(nombre, 'alta_asistida')
        self.assertEqual(parametros['operacion'], 'preparar')
        self.assertEqual(parametros['datos']['correo'], 'ana@ejemplo.com')
        self.assertNotIn('correo', parametros['datos']['registro'])
        self.assertNotIn('motivo', parametros['datos']['registro'])
        correo, opciones = self.invitar.call_args.args
        self.assertEqual(correo, 'ana@ejemplo.com')
        self.assertEqual(opciones['data'], {'altaAsistida': self.id})
        self.assertTrue(opciones['redirect_to'].endswith('/auth/retorno?flujo=recuperacion'))

    def test_posible_duplicado_queda_en_revision_sin_invitar(self):
        self.respuesta_rpc({'id': self.id, 'correo': 'ana@ejemplo.com', 'estado': 'en_revision',
                            'candidatos': [str(uuid4())]})
        r = self.http.post(RUTA, json=datos_adulto(), headers=self.cabeceras)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['estado'], 'en_revision')
        self.assertFalse(r.json()['invitacionEnviada'])
        self.invitar.assert_not_called()

    def test_no_acepta_contrasena_ni_campos_extra(self):
        for extra in ({'contrasena': 'secreta-123'}, {'solicitadoPor': str(uuid4())}):
            r = self.http.post(RUTA, json=datos_adulto(**extra), headers=self.cabeceras)
            self.assertEqual(r.status_code, 422)
            self.assertNotIn('secreta-123', r.text)
        self.cliente.rpc.assert_not_called()

    def test_reglas_de_edad_y_tutor(self):
        menor = datos_adulto(fechaNacimiento='2015-01-01')
        self.assertEqual(self.http.post(RUTA, json=menor, headers=self.cabeceras).status_code, 422)
        tutor = {'nombres': 'Luis', 'apellidos': 'Pérez', 'telefono': '3119876543', 'correo': 'luis@ejemplo.com',
                 'domicilio': menor['domicilio'], 'relacion': 'padre'}
        self.assertEqual(self.http.post(RUTA, json={**menor, 'tutor': tutor}, headers=self.cabeceras).status_code, 201)
        self.assertEqual(self.http.post(RUTA, json=datos_adulto(tutor=tutor), headers=self.cabeceras).status_code, 422)

    def test_errores_de_la_bd(self):
        casos = {'42501': 403, '23505': 409, '23514': 422, 'P0002': 404, 'XX000': 503}
        for codigo, esperado in casos.items():
            self.cliente.rpc.return_value.execute.side_effect = APIError(
                {'code': codigo, 'message': 'detalle interno', 'details': None, 'hint': None})
            r = self.http.post(RUTA, json=datos_adulto(), headers=self.cabeceras)
            self.assertEqual(r.status_code, esperado, codigo)
            self.assertNotIn('detalle interno', r.text)
        self.invitar.assert_not_called()

    def test_error_422_de_auth_no_se_confunde_con_correo_duplicado(self):
        self.invitar.side_effect = AuthApiError('detalle interno', 422, 'validation_failed')
        r = self.http.post(RUTA, json=datos_adulto(), headers=self.cabeceras)
        self.assertEqual(r.status_code, 201)
        self.assertFalse(r.json()['invitacionEnviada'])
        self.assertNotIn('detalle interno', r.text)

    def test_correo_con_cuenta_al_invitar(self):
        self.invitar.side_effect = AuthApiError('A user with this email address has already been registered',
                                                422, 'email_exists')
        r = self.http.post(RUTA, json=datos_adulto(), headers=self.cabeceras)
        self.assertEqual(r.status_code, 409)

    def test_falla_de_correo_deja_reintentar(self):
        self.invitar.side_effect = AuthApiError('Error sending invite email', 500, 'unexpected_failure')
        r = self.http.post(RUTA, json=datos_adulto(), headers=self.cabeceras)
        self.assertEqual(r.status_code, 201)
        self.assertFalse(r.json()['invitacionEnviada'])
        self.invitar.side_effect = None
        self.respuesta_rpc([{'id': self.id, 'correo': 'ana@ejemplo.com', 'estado': 'lista', 'candidatos': []}])
        r = self.http.post(f'{RUTA}/{self.id}/invitar', headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['invitacionEnviada'])

    def test_reintento_de_solicitud_ajena_o_en_revision(self):
        self.respuesta_rpc([{'id': self.id, 'correo': 'ana@ejemplo.com', 'estado': 'en_revision', 'candidatos': []}])
        for solicitud in (self.id, str(uuid4())):
            r = self.http.post(f'{RUTA}/{solicitud}/invitar', headers=self.cabeceras)
            self.assertEqual(r.status_code, 404)
        self.invitar.assert_not_called()

    def test_resolver_persona_distinta_invita(self):
        r = self.http.post(f'{RUTA}/{self.id}/resolver', headers=self.cabeceras,
                           json={'decision': 'persona_distinta', 'motivo': 'Teléfono de un familiar'})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['invitacionEnviada'])
        self.assertEqual(self.cliente.rpc.call_args.args[1]['datos'],
                         {'id': self.id, 'decision': 'persona_distinta', 'motivo': 'Teléfono de un familiar'})

    def test_resolver_misma_persona_y_cancelar_no_invitan(self):
        self.respuesta_rpc({'id': self.id, 'correo': 'ana@ejemplo.com', 'estado': 'descartada', 'candidatos': []})
        r = self.http.post(f'{RUTA}/{self.id}/resolver', headers=self.cabeceras,
                           json={'decision': 'misma_persona', 'motivo': 'Ya tiene cuenta'})
        self.assertFalse(r.json()['invitacionEnviada'])
        self.respuesta_rpc({'id': self.id, 'correo': 'ana@ejemplo.com', 'estado': 'cancelada', 'candidatos': []})
        r = self.http.post(f'{RUTA}/{self.id}/cancelar', headers=self.cabeceras, json={'motivo': 'Desistió'})
        self.assertEqual(r.status_code, 200)
        self.invitar.assert_not_called()
        self.assertEqual(self.http.post(f'{RUTA}/no-es-uuid/cancelar', headers=self.cabeceras,
                                        json={'motivo': 'x'}).status_code, 422)

    def test_listado_paginado(self):
        self.respuesta_rpc([])
        r = self.http.get(f'{RUTA}?limite=10&desplazamiento=20', headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.cliente.rpc.assert_called_once_with('alta_asistida', {'operacion': 'listar',
                                                                   'datos': {'limite': 10, 'desplazamiento': 20}})


if __name__ == '__main__':
    unittest.main()
