"""Lecturas complementarias reutilizan la publicación autorizada, sin ampliar acceso."""
import unittest
from unittest.mock import patch
from fastapi import HTTPException
from Back.lectura import _listar,obtener_lectura_publica
class LecturasIntegradasTests(unittest.TestCase):
    @patch('Back.lectura.consultar_publicados')
    def test_no_mezcla_noticias_y_filtra_autoria_tema(self,consulta):
        base={'publicadoEn':'2026-11-02T00:00:00Z','titulo':'Libro','datos':{'autoria':'Autora','tema':'Historia'}}
        consulta.return_value=[dict(base,tipo='resena',folio='CN-1'),dict(base,tipo='noticia',folio='CN-2')]
        self.assertEqual([c['folio'] for c in _listar('autora','historia',None,None,1,10)['items']],['CN-1'])
        consulta.assert_called_once_with(None,limite=50,desplazamiento=0)
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
