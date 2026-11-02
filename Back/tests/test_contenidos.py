import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from Back.main import app

RUTA = '/contenidos/editor'


def error_bd(codigo):
    return APIError({'code': codigo, 'message': 'x', 'details': None, 'hint': None})


class EditorContenidosTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        parche = patch('Back.contenidos.crear_cliente')
        self.crear = parche.start()
        self.addCleanup(parche.stop)
        self.cliente = self.crear.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.respuesta_rpc({'folio': 'CN-0006', 'estado': 'borrador'})
        self.cabeceras = {'Authorization': 'Bearer token-de-prueba'}

    def respuesta_rpc(self, datos):
        self.cliente.rpc.return_value.execute.return_value.data = datos

    def llamada_rpc(self):
        return self.cliente.rpc.call_args.args

    def test_sin_token_no_invoca_supabase(self):
        self.assertEqual(self.http.get(RUTA).status_code, 401)
        self.assertEqual(self.http.post(RUTA, json={'tipo': 'noticia'}).status_code, 401)
        self.crear.assert_not_called()

    def test_token_invalido(self):
        self.cliente.auth.get_user.side_effect = AuthApiError('expirado', 401, None)
        self.assertEqual(self.http.get(RUTA, headers=self.cabeceras).status_code, 401)
        self.cliente.rpc.assert_not_called()

    def test_usa_el_token_de_la_sesion(self):
        self.http.get(f'{RUTA}/resumen', headers=self.cabeceras)
        self.cliente.postgrest.auth.assert_called_once_with('token-de-prueba')
        self.assertEqual(self.llamada_rpc(), ('editor_contenidos', {'operacion': 'resumen', 'datos': {}}))

    def test_listar_con_filtros(self):
        self.respuesta_rpc({'total': 0, 'contenidos': []})
        r = self.http.get(RUTA, params={'estado': 'borrador', 'busqueda': ' CN-1 '}, headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.llamada_rpc()[1]['datos'],
                         {'limite': 10, 'desplazamiento': 0, 'estado': 'borrador', 'busqueda': 'CN-1'})

    def test_listar_rechaza_estado_desconocido(self):
        r = self.http.get(RUTA, params={'estado': 'archivado'}, headers=self.cabeceras)
        self.assertEqual(r.status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_crear_borrador(self):
        cuerpo = {'tipo': 'noticia', 'titulo': ' Taller ', 'datos': {'categoria': 'Avisos'}}
        r = self.http.post(RUTA, json=cuerpo, headers=self.cabeceras)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['folio'], 'CN-0006')
        self.assertEqual(self.llamada_rpc()[1], {'operacion': 'guardar', 'datos': {
            'tipo': 'noticia', 'titulo': 'Taller', 'datos': {'categoria': 'Avisos'}}})

    def test_crear_rechaza_tipo_o_campos_extra(self):
        for cuerpo in ({'tipo': 'servicio'}, {'tipo': 'noticia', 'estado': 'publicado'},
                       {'tipo': 'noticia', 'folio': 'CN-0001'}, {'titulo': 'Sin tipo'}):
            with self.subTest(cuerpo=cuerpo):
                self.assertEqual(self.http.post(RUTA, json=cuerpo, headers=self.cabeceras).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_guardar_usa_el_folio_de_la_ruta(self):
        r = self.http.put(f'{RUTA}/CN-0006', json={'resumen': 'Breve'}, headers=self.cabeceras)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.llamada_rpc()[1]['datos'], {'resumen': 'Breve', 'folio': 'CN-0006'})

    def test_folio_mal_formado(self):
        self.assertEqual(self.http.get(f'{RUTA}/abc', headers=self.cabeceras).status_code, 422)
        self.cliente.rpc.assert_not_called()

    def test_enviar_con_nota(self):
        self.respuesta_rpc({'folio': 'CN-0006', 'estado': 'en_revision'})
        r = self.http.post(f'{RUTA}/CN-0006/enviar', json={'nota': 'Revisar la fecha'}, headers=self.cabeceras)
        self.assertEqual(r.json()['estado'], 'en_revision')
        self.assertEqual(self.llamada_rpc()[1], {'operacion': 'enviar', 'datos': {'nota': 'Revisar la fecha', 'folio': 'CN-0006'}})

    def test_errores_de_la_bd(self):
        casos = {'42501': 403, 'P0002': 404, '55000': 409, '23514': 422, '22023': 422, 'XX000': 503}
        for codigo, estado in casos.items():
            with self.subTest(codigo=codigo):
                self.cliente.rpc.return_value.execute.side_effect = error_bd(codigo)
                r = self.http.post(f'{RUTA}/CN-0006/enviar', json={}, headers=self.cabeceras)
                self.assertEqual(r.status_code, estado)


if __name__ == '__main__':
    unittest.main()
