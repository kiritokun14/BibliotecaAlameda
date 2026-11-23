import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from Back.instagram import CacheInstagram, SEIS_HORAS, normalizar_publicaciones, router


class InstagramTests(unittest.TestCase):
    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporal.cleanup)
        self.archivo = Path(self.temporal.name) / 'instagram.json'
        self.cache = CacheInstagram(self.archivo)
        self.cliente = patch('Back.instagram.httpx.Client').start()
        self.addCleanup(patch.stopall)
        self.get = self.cliente.return_value.__enter__.return_value.get
        self.respuesta = Mock()
        self.respuesta.json.return_value = {'posts': [{'id': '1', 'caption': 'Cultura',
            'url': 'https://www.instagram.com/p/abc/', 'taken_at': 1700000000}]}
        self.get.return_value = self.respuesta
        patch('Back.instagram.load_dotenv').start()
        patch.dict('os.environ', {'APISH_KEY': 'clave-simulada'}).start()
        self.reloj = patch('Back.instagram.time.time', return_value=1800000000).start()

    def test_normalizacion_limite_y_nulos(self):
        datos = normalizar_publicaciones({'data': {'posts': [{'id': None, 'caption': None,
            'thumbnail': None, 'url': None, 'type': None, 'taken_at': None}] * 9}})
        self.assertEqual(len(datos), 6)
        self.assertEqual(datos[0], {'id': 'publicacion-0', 'caption': '', 'thumbnail': None,
                                  'url': None, 'type': None, 'taken_at': None})

    def test_campos_y_fecha(self):
        dato = normalizar_publicaciones(self.respuesta.json())[0]
        self.assertEqual(dato['caption'], 'Cultura')
        self.assertEqual(dato['taken_at'], '2023-11-14T22:13:20+00:00')
        dato = normalizar_publicaciones([{'url': 'javascript:alert(1)', 'thumbnail': 'http://inseguro',
                                          'taken_at': 'no es fecha'}])[0]
        self.assertIsNone(dato['url'])
        self.assertIsNone(dato['thumbnail'])
        self.assertIsNone(dato['taken_at'])

    def test_cache_persistente_y_expiracion(self):
        primero = self.cache.obtener()
        self.assertEqual(primero, self.cache.obtener())
        self.assertEqual(CacheInstagram(self.archivo).obtener(), primero)
        self.get.assert_called_once_with('https://api.api.sh/instagram/v1/user/posts',
            params={'username': 'culturanayarit'}, headers={'x-api-key': 'clave-simulada'})
        self.reloj.return_value += SEIS_HORAS
        self.cache.obtener()
        self.assertEqual(self.get.call_count, 2)

    def test_fallo_conserva_cache_y_limita_reintentos(self):
        self.cache.obtener()
        self.reloj.return_value += SEIS_HORAS
        self.get.side_effect = httpx.ConnectError('secreto interno')
        resultado = self.cache.obtener()
        self.assertTrue(resultado['desactualizado'])
        self.assertEqual(resultado['publicaciones'][0]['id'], '1')
        self.cache.obtener()
        CacheInstagram(self.archivo).obtener()
        self.assertEqual(self.get.call_count, 2)

    def test_vacio_es_cache_valida(self):
        self.respuesta.json.return_value = {'posts': []}
        self.assertEqual(self.cache.obtener()['publicaciones'], [])
        self.cache.obtener()
        self.assertEqual(self.get.call_count, 1)

    def test_errores_no_exponen_informacion(self):
        app = FastAPI()
        app.include_router(router)
        with patch('Back.instagram.cache', self.cache):
            for error in (httpx.ConnectError('token secreto'), httpx.ReadTimeout('token secreto'),
                          httpx.HTTPStatusError('token secreto', request=Mock(), response=Mock()),
                          ValueError('JSON secreto')):
                self.cache.proximo_intento = 0
                self.get.side_effect = error
                respuesta = TestClient(app).get('/api/instagram/publicaciones')
                self.assertEqual(respuesta.status_code, 503)
                self.assertNotIn('secreto', respuesta.text)
        self.get.side_effect = None
        self.respuesta.json.return_value = {'error': 'secreto'}
        self.cache.proximo_intento = 0
        with self.assertRaises(Exception) as error:
            self.cache.obtener()
        self.assertEqual(error.exception.status_code, 503)

    def test_respuesta_incorrecta_no_se_confunde_con_vacia(self):
        for respuesta in ({}, {'posts': None}, {'posts': [None]}, {'success': False, 'posts': []}):
            with self.assertRaises(ValueError):
                normalizar_publicaciones(respuesta)

    def test_rutas_directa_y_proxy(self):
        app = FastAPI()
        app.include_router(router)
        with patch('Back.instagram.cache', self.cache):
            for ruta in ('/api/instagram/publicaciones', '/instagram/publicaciones'):
                self.assertEqual(TestClient(app).get(ruta).status_code, 200)
        self.assertEqual(self.get.call_count, 1)
