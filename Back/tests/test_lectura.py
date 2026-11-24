"""Lecturas complementarias reutilizan la publicación autorizada, sin ampliar acceso."""
import unittest
from unittest.mock import call, patch
from fastapi import HTTPException
from Back.lectura import _listar,obtener_lectura_publica
class LecturasIntegradasTests(unittest.TestCase):
    @patch('Back.lectura.consultar_publicados')
    def test_no_mezcla_noticias_y_filtra_autoria_tema(self,consulta):
        base={'publicadoEn':'2026-11-02T00:00:00Z','titulo':'Libro','datos':{'autoria':'Autora','tema':'Historia'}}
        consulta.side_effect = [
            [dict(base, tipo='resena', folio='CN-1'), dict(base, tipo='noticia', folio='CN-2')],
            [],
        ]
        self.assertEqual([c['folio'] for c in _listar('autora','historia',None,None,1,10)['items']],['CN-1'])
        self.assertEqual(consulta.call_args_list, [
            call('resena', limite=50, desplazamiento=0),
            call('memoria', limite=50, desplazamiento=0),
        ])

    @patch('Back.lectura.consultar_publicados')
    def test_primera_pagina_evita_consultas_adicionales(self, consulta):
        resena = {
            'tipo': 'resena', 'folio': 'CN-0045', 'titulo': 'Libro',
            'resumen': None, 'datos': {'tema': None, 'genero': 'Narrativa'},
            'publicadoEn': '2026-11-02T00:00:00.1Z',
        }
        memoria = dict(resena, tipo='memoria', folio='CN-0044', publicadoEn='2026-11-02T00:00:00Z')
        consulta.side_effect = [[resena] * 50, [memoria] * 50]
        pagina = _listar(None, ' narrativa ', 'contenido', 'LIBRO', 1, 1)
        self.assertEqual(pagina['items'], [resena])
        self.assertEqual(consulta.call_count, 2)

    @patch('Back.lectura.consultar_publicados')
    def test_detalle_encuentra_lectura_si_otra_publicacion_comparte_identificador(self, consulta):
        lectura = {'tipo': 'memoria', 'folio': 'CN-0045'}
        consulta.return_value = [{'tipo': 'noticia'}, lectura]
        self.assertEqual(obtener_lectura_publica('CN-0045'), lectura)
    @patch('Back.lectura.consultar_publicados',return_value=[])
    def test_retirada_no_disponible(self,consulta):
        with self.assertRaises(HTTPException) as error: obtener_lectura_publica('CN-1')
        self.assertEqual(error.exception.status_code,404)
    @patch('Back.lectura.consultar_publicados')
    def test_no_devuelve_noticia_como_lectura(self,consulta):
        consulta.return_value=[{'tipo':'noticia'}]
        with self.assertRaises(HTTPException) as error: obtener_lectura_publica('CN-2')
        self.assertEqual(error.exception.status_code,404)
    def test_paginacion_acotada(self):
        with self.assertRaises(HTTPException) as error: _listar(None,None,None,None,101,10)
        self.assertEqual(error.exception.status_code,400)
