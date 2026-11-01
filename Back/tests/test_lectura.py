"""Pruebas de acceso público a lecturas, reseñas, memoria y archivos."""

import asyncio
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from storage3.exceptions import StorageApiError

from Back.main import app


class ConsultaFalsa:
    """Captura los filtros aplicados y devuelve filas preparadas para cada tabla."""

    def __init__(self, resultados, tabla):
        self.resultados = resultados
        self.tabla = tabla
        self.filtros = []
        self.ordenes = []
        self.rango = None

    @property
    def not_(self):
        return self

    def select(self, *args, **kwargs):
        return self

    def eq(self, campo, valor):
        self.filtros.append(('eq', campo, valor))
        return self

    def ilike(self, campo, valor):
        self.filtros.append(('ilike', campo, valor))
        return self

    def or_(self, expresion):
        self.filtros.append(('or', expresion))
        return self

    def is_(self, campo, valor):
        self.filtros.append(('is', campo, valor))
        return self

    def order(self, campo, **kwargs):
        self.ordenes.append((campo, kwargs))
        return self

    def range(self, inicio, fin):
        self.rango = (inicio, fin)
        return self

    def limit(self, limite):
        self.rango = (0, limite - 1)
        return self

    def execute(self):
        respuestas = self.resultados.get(self.tabla, [])
        if not respuestas:
            return SimpleNamespace(data=[])
        respuesta = respuestas.pop(0)
        return SimpleNamespace(data=respuesta)


class ClienteFalso:
    """Simula consultas de datos y la firma temporal de objetos en Storage."""

    def __init__(self, resultados=None):
        self.resultados = resultados or {}
        self.consultas = []
        self.storage = SimpleNamespace(from_=self._bucket)
        self.url_firmada = SimpleNamespace(signedURL='https://storage.example/signed')
        self.urls_firmadas = []

    def table(self, tabla):
        consulta = ConsultaFalsa(self.resultados, tabla)
        self.consultas.append(consulta)
        return consulta

    def _bucket(self, nombre):
        def firmar(ruta, segundos):
            self.urls_firmadas.append((nombre, ruta, segundos))
            if isinstance(self.url_firmada, Exception):
                raise self.url_firmada
            return self.url_firmada

        return SimpleNamespace(create_signed_url=firmar)


class ClienteHttpx:
    """Envía solicitudes a FastAPI mediante transporte ASGI en memoria."""

    def __init__(self, aplicacion):
        self.aplicacion = aplicacion

    def get(self, ruta):
        async def solicitar():
            transporte = httpx.ASGITransport(app=self.aplicacion)
            async with httpx.AsyncClient(
                transport=transporte, base_url='http://testserver',
            ) as cliente:
                return await cliente.get(ruta)

        return asyncio.run(solicitar())


class LecturaPublicaTests(unittest.TestCase):
    """Comprueba filtros de publicación y autorización de recursos públicos."""

    def setUp(self):
        self.http = ClienteHttpx(app)
        parche = patch('Back.lectura.crear_cliente')
        self.fabrica = parche.start()
        self.addCleanup(parche.stop)
        self.cliente = ClienteFalso()
        self.fabrica.return_value = self.cliente

    def test_listado_anonimo_combina_solo_recursos_publicables(self):
        # Cada tabla aporta una fila pública y el endpoint las ordena en una página.
        self.cliente.resultados.update({
            'Contenido': [[{
                'id': 'a', 'slug': 'lectura-a', 'titulo': 'Lectura', 'tipo': 'cuento',
                'cuerpo': 'Texto', 'autorOriginal': 'Autora', 'creadoEn': '2026-10-01T10:00:00+00:00',
            }]],
            'resena': [[{
                'resenaId': 'b', 'contenidoId': 'a', 'cuerpoResena': 'Opinión',
                'creadoEn': '2026-10-02T10:00:00+00:00',
                'Contenido': {'id': 'a', 'slug': 'lectura-a', 'titulo': 'Lectura',
                              'tipo': 'cuento', 'autorOriginal': 'Autora'},
            }]],
            'evidenciaActividad': [[{
                'id': 'c', 'tipoArchivo': 'image/png', 'descripcion': 'Taller',
                'creadaEn': '2026-10-03T10:00:00+00:00',
            }]],
        })

        respuesta = self.http.get('/api/public/lecturas-y-resenas?page=1&limit=10')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(
            [fila['tipoRecurso'] for fila in respuesta.json()['items']],
            ['memoria', 'resena', 'contenido'],
        )
        self.assertEqual(self.cliente.consultas[0].filtros, [('eq', 'estado', 'publicado')])
        self.assertIn(('eq', 'estado', 'publicada'), self.cliente.consultas[1].filtros)
        self.assertIn(('eq', 'Contenido.estado', 'publicado'), self.cliente.consultas[1].filtros)
        self.assertIn(('eq', 'visibilidad', 'publica'), self.cliente.consultas[2].filtros)
        self.assertIn(('is', 'autorizadaEn', 'null'), self.cliente.consultas[2].filtros)
        self.assertNotIn('autorizadaPor', respuesta.text)

    def test_busqueda_aplica_autor_tema_y_cuerpo_en_contenido(self):
        self.cliente.resultados['Contenido'] = [[]]
        respuesta = self.http.get(
            '/api/public/lecturas-y-resenas?tipoRecurso=contenido'
            '&autor=Autora&tema=cuento&busqueda=memoria',
        )
        self.assertEqual(respuesta.status_code, 200)
        filtros = self.cliente.consultas[0].filtros
        self.assertIn(('ilike', 'autorOriginal', '%Autora%'), filtros)
        self.assertIn(('eq', 'tipo', 'cuento'), filtros)
        self.assertTrue(any(filtro[0] == 'or' and 'titulo.ilike' in filtro[1] for filtro in filtros))
        self.assertEqual([consulta.tabla for consulta in self.cliente.consultas], ['Contenido'])

    def test_detalle_no_publicado_se_devuelve_como_no_encontrado(self):
        # No se deben consultar reseñas ni adjuntos si la lectura no está publicada.
        respuesta = self.http.get('/api/public/lecturas/borrador')
        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(len(self.cliente.consultas), 1)
        self.assertIn(('eq', 'estado', 'publicado'), self.cliente.consultas[0].filtros)

    def test_detalle_publicado_incluye_solo_resenas_publicadas_y_adjunto(self):
        self.cliente.resultados.update({
            'Contenido': [[{
                'id': 'contenido-id', 'slug': 'publicada', 'titulo': 'Libro',
                'tipo': 'cuento', 'cuerpo': 'Texto', 'autorOriginal': 'Autora',
                'creadoEn': '2026-10-01T10:00:00+00:00',
                'publicadoEn': '2026-10-02T10:00:00+00:00',
            }]],
            'resena': [[{'resenaId': 'resena-id', 'estado': 'publicada'}]],
            'adjuntoContenido': [[{'id': 'adjunto-id', 'tipoArchivo': 'application/pdf'}]],
        })

        respuesta = self.http.get('/api/public/lecturas/publicada')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['resenas'][0]['resenaId'], 'resena-id')
        self.assertEqual(respuesta.json()['adjuntos'][0]['id'], 'adjunto-id')
        self.assertIn(('eq', 'estado', 'publicado'), self.cliente.consultas[0].filtros)
        self.assertIn(('eq', 'estado', 'publicada'), self.cliente.consultas[1].filtros)

    def test_evidencia_privada_no_es_visible_ni_descargable(self):
        # Sin fila autorizada, la ruta no llega a pedir una URL firmada a Storage.
        evidencia_id = '00000000-0000-4000-8000-000000000001'
        respuesta = self.http.get(
            f'/api/public/archivos/descargar?tipoRecurso=evidencia&id={evidencia_id}',
        )
        self.assertEqual(respuesta.status_code, 404)
        self.assertIn(('eq', 'visibilidad', 'publica'), self.cliente.consultas[0].filtros)
        self.assertIn(('is', 'autorizadaEn', 'null'), self.cliente.consultas[0].filtros)

    def test_descarga_de_evidencia_publica_usa_url_firmada_temporal(self):
        # La firma se solicita solo después de comprobar autorización y visibilidad.
        evidencia_id = '00000000-0000-4000-8000-000000000001'
        self.cliente.resultados['evidenciaActividad'] = [[{
            'id': evidencia_id, 'rutaArchivo': 'eventos/evidencia.png',
            'tipoArchivo': 'image/png', 'visibilidad': 'publica',
            'autorizadaEn': '2026-10-02T10:00:00+00:00',
        }]]
        almacenamiento = ClienteFalso()
        with patch.dict(os.environ, {'SUPABASE_EVIDENCIAS_BUCKET': 'memoria-publica'}):
            with patch('Back.lectura.crear_cliente_servicio', return_value=almacenamiento):
                respuesta = self.http.get(
                    f'/api/public/archivos/descargar?tipoRecurso=evidencia&id={evidencia_id}',
                )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()['url'], 'https://storage.example/signed')
        self.assertEqual(respuesta.json()['expiraEnSegundos'], 300)
        self.assertEqual(
            almacenamiento.urls_firmadas,
            [('memoria-publica', 'eventos/evidencia.png', 300)],
        )

    def test_descarga_de_adjunto_exige_contenido_publicado(self):
        respuesta = self.http.get(
            '/api/public/archivos/descargar'
            '?tipoRecurso=adjunto&id=00000000-0000-4000-8000-000000000002',
        )
        self.assertEqual(respuesta.status_code, 404)
        self.assertIn(('eq', 'Contenido.estado', 'publicado'), self.cliente.consultas[0].filtros)

    def test_descarga_de_evidencia_cuya_ruta_no_existe_es_404(self):
        evidencia_id = '00000000-0000-4000-8000-000000000003'
        self.cliente.resultados['evidenciaActividad'] = [[{
            'id': evidencia_id, 'rutaArchivo': 'eventos/no-existe.png',
            'tipoArchivo': 'image/png', 'visibilidad': 'publica',
            'autorizadaEn': '2026-10-02T10:00:00+00:00',
        }]]
        almacenamiento = ClienteFalso()
        almacenamiento.url_firmada = StorageApiError('Not found', 'NoSuchKey', 404)
        with patch.dict(os.environ, {'SUPABASE_EVIDENCIAS_BUCKET': 'memoria-publica'}):
            with patch('Back.lectura.crear_cliente_servicio', return_value=almacenamiento):
                respuesta = self.http.get(
                    f'/api/public/archivos/descargar?tipoRecurso=evidencia&id={evidencia_id}',
                )
        self.assertEqual(respuesta.status_code, 404)

    def test_filtros_invalidos_se_rechazan_sin_consultar_supabase(self):
        for url in (
            '/api/public/lecturas-y-resenas?tipoRecurso=privado',
            '/api/public/lecturas-y-resenas?page=0',
            '/api/public/lecturas-y-resenas?limit=no-numero',
        ):
            self.assertEqual(self.http.get(url).status_code, 400)
        self.assertEqual(self.cliente.consultas, [])


if __name__ == '__main__':
    unittest.main()
