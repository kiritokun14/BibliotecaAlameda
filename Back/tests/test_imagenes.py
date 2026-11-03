from io import BytesIO
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from fastapi import HTTPException
from PIL import Image, PngImagePlugin
from postgrest.exceptions import APIError

from Back.main import app
from Back.imagenes import validar_imagen, MAXIMO


def png():
    salida = BytesIO()
    metadatos = PngImagePlugin.PngInfo()
    metadatos.add_text('comentario', 'metadato-privado-de-prueba')
    Image.new('RGB', (24, 18), 'blue').save(salida, format='PNG', pnginfo=metadatos)
    return salida.getvalue()


class ImagenesTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        self.auth = patch('Back.contenidos.crear_cliente').start()
        self.servicio = patch('Back.imagenes.crear_cliente_servicio').start()
        self.publico = patch('Back.imagenes.crear_cliente').start()
        self.addCleanup(patch.stopall)
        self.cliente = self.auth.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cliente.rpc.return_value.execute.side_effect = [Mock(data={
            'actualizadoEn': '2026-11-02T12:00:00Z', 'ruta': None}), Mock(data={
            'folio': 'CN-0001', 'tieneImagen': True, 'ruta': 'privada', 'tipoArchivo': 'image/png', 'rutaAnterior': None})]
        self.cabeceras = {'Authorization': 'Bearer token-editor', 'Content-Type': 'image/png'}
        self.almacen = self.servicio.return_value.storage.from_.return_value

    def test_sin_sesion_no_subir_ni_leer_imagen_privada(self):
        self.assertEqual(self.http.put('/contenidos/editor/CN-0001/imagen', content=png(), headers={'Content-Type': 'image/png'}).status_code, 401)
        self.assertEqual(self.http.get('/contenidos/revision/CN-0001/imagen').status_code, 401)
        self.servicio.assert_not_called()

    def test_validacion_real_y_metadatos_eliminados(self):
        limpia = validar_imagen(png(), 'image/png')
        self.assertNotIn(b'metadato-privado', limpia)
        with Image.open(BytesIO(limpia)) as imagen:
            self.assertEqual(imagen.size, (24, 18))
            self.assertEqual(imagen.format, 'PNG')
        for datos, tipo, esperado in [(b'<svg>no es imagen</svg>', 'image/png', 422), (png(), 'image/jpeg', 422),
                                       (png(), 'image/svg+xml', 415), (b'x' * (MAXIMO + 1), 'image/png', 413)]:
            with self.subTest(tipo=tipo, esperado=esperado), self.assertRaises(HTTPException) as error:
                validar_imagen(datos, tipo)
            self.assertEqual(error.exception.status_code, esperado)

    def test_sube_en_ruta_nueva_y_asocia_despues_de_storage(self):
        respuesta = self.http.put('/contenidos/editor/CN-0001/imagen', content=png(), headers=self.cabeceras)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json(), {'folio': 'CN-0001', 'tieneImagen': True})
        ruta = self.almacen.upload.call_args.args[0]
        self.assertRegex(ruta, r'^CN-0001/[0-9a-f-]+\.png$')
        self.assertEqual(self.cliente.rpc.call_args.args[1]['version_contenido'], '2026-11-02T12:00:00Z')
        self.assertEqual(self.cliente.rpc.call_args.args[1]['ruta_archivo'], ruta)
        self.assertNotIn(b'metadato-privado', self.almacen.upload.call_args.args[1])

    def test_sin_permiso_no_llega_a_storage(self):
        self.cliente.rpc.return_value.execute.side_effect = APIError({'code': '42501', 'message': 'privado'})
        self.assertEqual(self.http.put('/contenidos/editor/CN-0001/imagen', content=png(), headers=self.cabeceras).status_code, 403)
        self.servicio.assert_not_called()

    def test_conflicto_elimina_solo_la_nueva_carga(self):
        self.cliente.rpc.return_value.execute.side_effect = [Mock(data={'actualizadoEn': '2026-11-02T12:00:00Z'}), APIError({'code': '40001', 'message': 'conflicto'})]
        self.assertEqual(self.http.put('/contenidos/editor/CN-0001/imagen', content=png(), headers=self.cabeceras).status_code, 409)
        ruta = self.almacen.upload.call_args.args[0]
        self.almacen.remove.assert_called_once_with([ruta])

    def test_publica_no_expone_imagen_sin_publicacion(self):
        self.publico.return_value.rpc.return_value.execute.return_value.data = None
        self.assertEqual(self.http.get('/contenidos/publicos/CN-0001/imagen').status_code, 404)
        self.servicio.assert_not_called()

    def test_descarga_publica_y_privada_no_se_guardan_en_cache(self):
        self.publico.return_value.rpc.return_value.execute.return_value.data = {'ruta': 'CN-0001/prueba.png', 'tipoArchivo': 'image/png'}
        self.almacen.download.return_value = png()
        respuesta = self.http.get('/contenidos/publicos/CN-0001/imagen')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.headers['content-type'], 'image/png')
        self.assertIn('no-store', respuesta.headers['cache-control'])
        self.assertEqual(respuesta.headers['x-content-type-options'], 'nosniff')

    def test_tamano_excedido_se_rechaza_antes_de_storage(self):
        respuesta = self.http.put('/contenidos/editor/CN-0001/imagen', content=b'x' * (MAXIMO + 1), headers=self.cabeceras)
        self.assertEqual(respuesta.status_code, 413)
        self.servicio.assert_not_called()
