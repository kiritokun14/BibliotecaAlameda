import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from Back.main import app

RUTA = '/espacios'
VALIDA = {'areaId': 'sala-usos-multiples', 'fecha': '2030-01-15', 'horaInicio': '10:00',
          'horaFin': '12:00', 'personas': 15, 'motivo': ' Taller de lectura '}


def error_bd(codigo, mensaje='x'):
    return APIError({'code': codigo, 'message': mensaje, 'details': None, 'hint': None})


class BaseEspacios(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche = patch('Back.contenidos.crear_cliente')
        self.crear = parche.start()
        self.addCleanup(parche.stop)
        self.cliente = self.crear.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.respuesta_rpc({'folio': 'SE-0002', 'estado': 'en_revision'})
        self.cabeceras = {'Authorization': 'Bearer token-de-prueba'}

    def respuesta_rpc(self, datos):
        self.cliente.rpc.return_value.execute.return_value.data = datos

    def llamada_rpc(self):
        return self.cliente.rpc.call_args.args


class SolicitudesEspacioTests(BaseEspacios):
    def test_sin_token_no_invoca_supabase(self):
        self.assertEqual(self.http.get(f'{RUTA}/solicitudes').status_code, 401)
        self.assertEqual(self.http.post(f'{RUTA}/solicitudes', json=VALIDA).status_code, 401)
        self.crear.assert_not_called()

    def test_token_invalido(self):
        self.cliente.auth.get_user.side_effect = AuthApiError('expirado', 401, None)
        self.assertEqual(self.http.get(f'{RUTA}/areas', headers=self.cabeceras).status_code, 401)
        self.cliente.rpc.assert_not_called()

    def test_areas_usa_el_token_de_la_sesion(self):
        self.respuesta_rpc([])
        r = self.http.get(f'{RUTA}/areas', headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.cliente.postgrest.auth.assert_called_once_with('token-de-prueba')
        self.assertEqual(self.llamada_rpc(), ('solicitudes_espacio', {'operacion': 'areas', 'datos': {}}))

    def test_enviar(self):
        r = self.http.post(f'{RUTA}/solicitudes', json=VALIDA, headers=self.cabeceras)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['folio'], 'SE-0002')
        self.assertEqual(self.llamada_rpc()[1], {'operacion': 'enviar', 'datos': {
            'tipo': 'uso_espacio', 'espacio': 'sala-usos-multiples', 'fecha': '2030-01-15',
            'horaInicio': '10:00', 'horaFin': '12:00', 'personas': 15, 'motivo': 'Taller de lectura'}})

    def test_enviar_visita_sin_area(self):
        cuerpo = {**VALIDA, 'tipo': 'visita', 'institucion': 'Primaria'}
        del cuerpo['areaId']
        self.assertEqual(self.http.post(f'{RUTA}/solicitudes', json=cuerpo, headers=self.cabeceras).status_code, 201)
        self.assertNotIn('espacio', self.llamada_rpc()[1]['datos'])

    def test_enviar_rechaza_datos_invalidos_o_extra(self):
        for cambio in ({'personas': 0}, {'personas': 500}, {'motivo': '   '}, {'fecha': 'mañana'},
                       {'horaInicio': '25:00'}, {'tipo': 'reserva'}, {'areaId': 'Sala Grande'},
                       {'solicitadoPor': 'otra-persona'}, {'estado': 'aprobada'}):
            with self.subTest(cambio=cambio):
                r = self.http.post(f'{RUTA}/solicitudes', json={**VALIDA, **cambio}, headers=self.cabeceras)
                self.assertEqual(r.status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_errores_de_la_bd(self):
        casos = (
            ('23514', 'Elige una fecha y hora futuras.', 422, 'Elige una fecha y hora futuras.'),
            ('23514', 'detalle interno de la tabla', 422, 'Revisa los datos de la solicitud.'),
            ('55000', 'Ya tienes 5 solicitudes en revisión. Espera respuesta o cancela alguna.', 409,
             'Ya tienes 5 solicitudes en revisión. Espera respuesta o cancela alguna.'),
            ('42501', 'Sesión revocada', 403, 'Tu sesión ya no está vigente. Vuelve a iniciar sesión.'),
            ('XX000', 'algo', 503, 'No fue posible completar la operación.'),
        )
        for codigo, mensaje, estado, visible in casos:
            with self.subTest(codigo=codigo, mensaje=mensaje):
                self.cliente.rpc.return_value.execute.side_effect = error_bd(codigo, mensaje)
                r = self.http.post(f'{RUTA}/solicitudes', json=VALIDA, headers=self.cabeceras)
                self.assertEqual(r.status_code, estado)
                self.assertEqual(r.json()['detail'], visible)

    def test_listar_con_filtro(self):
        self.respuesta_rpc({'total': 0, 'solicitudes': []})
        r = self.http.get(f'{RUTA}/solicitudes', params={'estado': 'cancelada'}, headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.llamada_rpc()[1]['datos'], {'limite': 25, 'desplazamiento': 0, 'estado': 'cancelada'})
        self.assertEqual(self.http.get(f'{RUTA}/solicitudes', params={'estado': 'borrador'},
                                       headers=self.cabeceras).status_code, 422)

    def test_obtener_y_folio_invalido(self):
        self.assertEqual(self.http.get(f'{RUTA}/solicitudes/SE-0002', headers=self.cabeceras).status_code, 200)
        self.assertEqual(self.llamada_rpc()[1], {'operacion': 'obtener', 'datos': {'folio': 'SE-0002'}})
        self.cliente.rpc.reset_mock()
        self.assertEqual(self.http.get(f'{RUTA}/solicitudes/CN-0002', headers=self.cabeceras).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_obtener_ajena_es_404(self):
        self.cliente.rpc.return_value.execute.side_effect = error_bd('P0002')
        self.assertEqual(self.http.get(f'{RUTA}/solicitudes/SE-0009', headers=self.cabeceras).status_code, 404)

    def test_cancelar(self):
        r = self.http.post(f'{RUTA}/solicitudes/SE-0002/cancelacion',
                           json={'motivo': 'Cambio de planes', 'comentarios': ' Gracias '}, headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.llamada_rpc()[1], {'operacion': 'cancelar', 'datos': {
            'motivo': 'Cambio de planes', 'comentarios': 'Gracias', 'folio': 'SE-0002'}})

    def test_cancelar_dos_veces_es_409(self):
        self.cliente.rpc.return_value.execute.side_effect = error_bd(
            '55000', 'Esta solicitud ya no se puede cancelar desde aquí.')
        r = self.http.post(f'{RUTA}/solicitudes/SE-0002/cancelacion', json={}, headers=self.cabeceras)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['detail'], 'Esta solicitud ya no se puede cancelar desde aquí.')

    def test_responder_propuesta(self):
        r = self.http.post(f'{RUTA}/solicitudes/SE-0002/respuesta', json={'acepta': True, 'comentarios': ' Va '},
                           headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.llamada_rpc(), ('solicitudes_espacio', {'operacion': 'responder', 'datos': {
            'acepta': True, 'comentarios': 'Va', 'folio': 'SE-0002'}}))
        self.cliente.rpc.reset_mock()
        for cuerpo in ({}, {'acepta': 'quizá'}, {'acepta': True, 'espacio': 'otra'}):
            with self.subTest(cuerpo=cuerpo):
                self.assertEqual(self.http.post(f'{RUTA}/solicitudes/SE-0002/respuesta', json=cuerpo,
                                                headers=self.cabeceras).status_code, 422)
        self.cliente.rpc.assert_not_called()


class AtencionEspaciosTests(BaseEspacios):
    def test_sin_capacidad_es_403(self):
        self.cliente.rpc.return_value.execute.side_effect = error_bd(
            '42501', 'Sin permiso para atender solicitudes de espacio.')
        r = self.http.get(f'{RUTA}/atencion/solicitudes', headers=self.cabeceras)
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['detail'], 'No tienes permiso para atender solicitudes de espacio.')

    def test_bandeja_y_detalle(self):
        self.respuesta_rpc({'total': 0, 'conteos': {}, 'solicitudes': []})
        r = self.http.get(f'{RUTA}/atencion/solicitudes', params={'estado': 'en_revision', 'buscar': ' SE-00 '},
                          headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.llamada_rpc(), ('atender_solicitudes_espacio', {'operacion': 'bandeja', 'datos': {
            'limite': 25, 'desplazamiento': 0, 'estado': 'en_revision', 'buscar': 'SE-00'}}))
        self.http.get(f'{RUTA}/atencion/solicitudes/SE-0002', headers=self.cabeceras)
        self.assertEqual(self.llamada_rpc(), ('atender_solicitudes_espacio',
                                              {'operacion': 'obtener', 'datos': {'folio': 'SE-0002'}}))

    def test_aprobar(self):
        r = self.http.post(f'{RUTA}/atencion/solicitudes/SE-0002/aprobacion',
                           json={'verificacion': [True, True, True, True], 'condiciones': ' Respetar el cupo '},
                           headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.llamada_rpc()[1], {'operacion': 'aprobar', 'datos': {
            'verificacion': [True, True, True, True], 'condiciones': 'Respetar el cupo', 'folio': 'SE-0002'}})
        self.cliente.rpc.reset_mock()
        for cuerpo in ({}, {'verificacion': []}, {'verificacion': [True] * 11}, {'verificacion': [True], 'autorizadoPor': 'x'}):
            with self.subTest(cuerpo=cuerpo):
                self.assertEqual(self.http.post(f'{RUTA}/atencion/solicitudes/SE-0002/aprobacion', json=cuerpo,
                                                headers=self.cabeceras).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_aprobar_horario_ocupado_es_409(self):
        self.cliente.rpc.return_value.execute.side_effect = error_bd(
            '55000', 'El área ya está ocupada en ese horario. Propón otro.')
        r = self.http.post(f'{RUTA}/atencion/solicitudes/SE-0002/aprobacion', json={'verificacion': [True]},
                           headers=self.cabeceras)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['detail'], 'El área ya está ocupada en ese horario. Propón otro.')

    def test_proponer_solo_envia_lo_que_cambia(self):
        r = self.http.post(f'{RUTA}/atencion/solicitudes/SE-0002/propuesta',
                           json={'horaInicio': '14:00', 'horaFin': '16:00', 'mensaje': 'Ese horario ya está ocupado'},
                           headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.llamada_rpc()[1], {'operacion': 'proponer', 'datos': {
            'horaInicio': '14:00', 'horaFin': '16:00', 'mensaje': 'Ese horario ya está ocupado', 'folio': 'SE-0002'}})
        self.http.post(f'{RUTA}/atencion/solicitudes/SE-0002/propuesta',
                       json={'areaId': 'sala-lectura', 'mensaje': 'Otra sala'}, headers=self.cabeceras)
        self.assertEqual(self.llamada_rpc()[1]['datos'], {'espacio': 'sala-lectura', 'mensaje': 'Otra sala', 'folio': 'SE-0002'})
        self.cliente.rpc.reset_mock()
        for cuerpo in ({'horaInicio': '14:00'}, {'mensaje': '  '}, {'areaId': 'Sala Grande', 'mensaje': 'x'}):
            with self.subTest(cuerpo=cuerpo):
                self.assertEqual(self.http.post(f'{RUTA}/atencion/solicitudes/SE-0002/propuesta', json=cuerpo,
                                                headers=self.cabeceras).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_rechazar_y_cancelar_piden_motivo_y_mensaje(self):
        for ruta, operacion in (('rechazo', 'rechazar'), ('cancelacion', 'cancelar')):
            with self.subTest(ruta=ruta):
                self.cliente.rpc.reset_mock()
                r = self.http.post(f'{RUTA}/atencion/solicitudes/SE-0002/{ruta}',
                                   json={'motivo': 'El aforo no alcanza', 'mensaje': 'Lo sentimos'}, headers=self.cabeceras)
                self.assertEqual(r.status_code, 200)
                self.assertEqual(self.llamada_rpc(), ('atender_solicitudes_espacio', {'operacion': operacion, 'datos': {
                    'motivo': 'El aforo no alcanza', 'mensaje': 'Lo sentimos', 'folio': 'SE-0002'}}))
                self.cliente.rpc.reset_mock()
                self.assertEqual(self.http.post(f'{RUTA}/atencion/solicitudes/SE-0002/{ruta}', json={'motivo': 'x'},
                                                headers=self.cabeceras).status_code, 422)
                self.cliente.rpc.assert_not_called()


if __name__ == '__main__':
    unittest.main()
