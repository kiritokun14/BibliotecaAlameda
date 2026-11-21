from io import BytesIO
import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image
from postgrest.exceptions import APIError

from Back.evidencias import MAXIMO, validar_archivo
from Back.main import app

RUTA = '/actividades/evidencias'
SESION = '6f1c2b8e-1d2a-4c4e-9a51-2f1f9b3c7d10'
PDF = b'%PDF-1.4\n%prueba\n'


def error_bd(codigo, mensaje='x'):
    return APIError({'code': codigo, 'message': mensaje, 'details': None, 'hint': None})


def jpg_con_exif():
    salida = BytesIO()
    exif = Image.Exif()
    exif[0x010F] = 'CamaraPrivada'
    Image.new('RGB', (20, 10), 'red').save(salida, format='JPEG', exif=exif)
    return salida.getvalue()


class EvidenciasTests(unittest.TestCase):
    def setUp(self):
        self.http = TestClient(app)
        self.auth = patch('Back.contenidos.crear_cliente').start()
        self.servicio = patch('Back.evidencias.crear_cliente_servicio').start()
        self.addCleanup(patch.stopall)
        self.cliente = self.auth.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.almacen = self.servicio.return_value.storage.from_.return_value
        self.cab = {'Authorization': 'Bearer token'}

    def rpc(self, *respuestas):
        self.cliente.rpc.return_value.execute.side_effect = [Mock(data=r) if not isinstance(r, Exception) else r for r in respuestas]

    def operaciones(self):
        return [c.args[1]['operacion'] for c in self.cliente.rpc.call_args_list]

    def subir(self, cuerpo=PDF, tipo='application/pdf', **params):
        query = {'sesionId': SESION, 'tipo': 'lista_firmada', 'nombreArchivo': 'lista.pdf', 'acceso': 'personal', **params}
        return self.http.post(RUTA, params=query, content=cuerpo, headers={**self.cab, 'Content-Type': tipo})

    def test_sin_token_no_llama_a_la_bd(self):
        self.assertEqual(self.http.get(RUTA).status_code, 401)
        self.cliente.rpc.assert_not_called()

    def test_listar_sin_cache(self):
        self.rpc([{'folio': 'EV-0001'}])
        r = self.http.get(RUTA, headers=self.cab)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.assertEqual(self.cliente.rpc.call_args.args, ('evidencias_actividad', {'operacion': 'listar', 'datos': {'incluirRetiradas': False}}))

    def test_sin_capacidad_es_403(self):
        self.rpc(error_bd('42501', 'Sin permiso para gestionar evidencias.'))
        r = self.http.get(RUTA, headers=self.cab)
        self.assertEqual(r.status_code, 403)

    def test_subir_pdf_autoriza_antes_de_guardar_y_registra(self):
        self.rpc({'carpeta': f'AC-000016/{SESION}'}, {'folio': 'EV-0001', 'puedeVer': True})
        r = self.subir()
        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual(self.operaciones(), ['preparar', 'registrar'])
        ruta = self.almacen.upload.call_args.args[0]
        self.assertRegex(ruta, rf'^AC-000016/{SESION}/[0-9a-f-]{{36}}\.pdf$')
        self.assertEqual(self.cliente.rpc.call_args.args[1]['datos']['ruta'], ruta)
        self.servicio.return_value.storage.from_.assert_called_with('evidencias-actividades')

    def test_sin_permiso_no_toca_storage(self):
        self.rpc(error_bd('42501', 'Sin permiso sobre esta actividad.'))
        self.assertEqual(self.subir().status_code, 403)
        self.almacen.upload.assert_not_called()

    def test_tipo_no_permitido(self):
        self.assertEqual(self.subir(b'GIF89a', 'image/gif').status_code, 415)
        self.cliente.rpc.assert_not_called()

    def test_pdf_falso_se_rechaza_sin_guardar(self):
        self.rpc({'carpeta': f'AC-1/{SESION}'})
        self.assertEqual(self.subir(b'no soy pdf').status_code, 422)
        self.almacen.upload.assert_not_called()

    def test_archivo_de_mas_de_10_mb(self):
        self.assertEqual(self.subir(b'%PDF-' + b'0' * MAXIMO).status_code, 413)
        self.cliente.rpc.assert_not_called()

    def test_si_falla_el_registro_se_borra_el_archivo(self):
        self.rpc({'carpeta': f'AC-1/{SESION}'}, error_bd('22023'))
        self.assertEqual(self.subir().status_code, 422)
        self.almacen.remove.assert_called_once_with([self.almacen.upload.call_args.args[0]])

    def test_foto_pierde_metadatos(self):
        limpia = validar_archivo(jpg_con_exif(), 'image/jpeg')
        with Image.open(BytesIO(limpia)) as imagen:
            self.assertNotIn(0x010F, imagen.getexif())

    def test_foto_con_tipo_distinto(self):
        with self.assertRaises(HTTPException) as error:
            validar_archivo(jpg_con_exif(), 'image/png')
        self.assertEqual(error.exception.status_code, 422)

    def test_descarga_registrada_y_como_adjunto(self):
        self.rpc({'ruta': 'AC-1/x/y.pdf', 'tipoArchivo': 'application/pdf', 'nombreArchivo': 'lista firmada.pdf'})
        self.almacen.download.return_value = PDF
        r = self.http.get(f'{RUTA}/EV-0001/descarga', headers=self.cab)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.content, PDF)
        self.assertIn('attachment', r.headers['content-disposition'])
        self.assertIn("lista%20firmada.pdf", r.headers['content-disposition'])
        self.assertEqual(r.headers['cache-control'], 'private, no-store')
        self.assertEqual(self.operaciones(), ['descargar'])

    def test_restringida_no_se_descarga(self):
        self.rpc(error_bd('42501', 'Sin permiso para abrir esta evidencia.'))
        r = self.http.get(f'{RUTA}/EV-0001/descarga', headers=self.cab)
        self.assertEqual(r.status_code, 403)
        self.assertIn('Coordinación', r.json()['detail'])
        self.almacen.download.assert_not_called()

    def test_folio_invalido(self):
        self.assertEqual(self.http.get(f'{RUTA}/AC-0001', headers=self.cab).status_code, 422)

    def test_cambiar_acceso(self):
        self.rpc({'folio': 'EV-0001', 'acceso': 'coordinacion'})
        r = self.http.patch(f'{RUTA}/EV-0001/acceso', json={'acceso': 'coordinacion'}, headers=self.cab)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['datos'], {'folio': 'EV-0001', 'acceso': 'coordinacion'})
        self.assertEqual(self.http.patch(f'{RUTA}/EV-0001/acceso', json={'acceso': 'todos'}, headers=self.cab).status_code, 422)

    def test_retirar_exige_motivo(self):
        self.assertEqual(self.http.post(f'{RUTA}/EV-0001/retiro', json={'motivo': '  '}, headers=self.cab).status_code, 422)
        self.rpc(error_bd('55000', 'La evidencia ya fue retirada.'))
        r = self.http.post(f'{RUTA}/EV-0001/retiro', json={'motivo': 'Duplicada'}, headers=self.cab)
        self.assertEqual((r.status_code, r.json()['detail']), (409, 'La evidencia ya fue retirada.'))

    def test_solicitar_acceso(self):
        self.rpc({'folio': 'EV-0001', 'solicitada': True})
        r = self.http.post(f'{RUTA}/EV-0001/solicitud-acceso', headers=self.cab)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.operaciones(), ['solicitar_acceso'])

    def test_error_interno_no_se_muestra(self):
        self.rpc(error_bd('XX000', 'detalle interno'))
        r = self.http.get(f'{RUTA}/EV-0001', headers=self.cab)
        self.assertEqual(r.status_code, 503)
        self.assertNotIn('interno', r.text)


if __name__ == '__main__':
    unittest.main()
