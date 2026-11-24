import unittest
from unittest.mock import Mock, call, patch
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from Back.main import app
VERSION='2026-11-02T12:00:00.123456Z'
DOMICILIO = {'calle': 'Alameda', 'numeroExterior': '52', 'numeroInterior': None,
             'coloniaLocalidad': 'Centro', 'codigoPostal': '63000',
             'municipio': 'Tepic', 'estadoProvincia': 'Nayarit'}
class PerfilPropioTests(unittest.TestCase):
 def test_preferencias_usan_sesion_y_version_sin_aceptar_otro_titular(self):
  ruta='/perfil/preferencias-avisos'
  datos={'canalPreferido':'whatsapp_manual','recibirAvisosComunidad':True,
         'recibirAvisosActividades':False,'actualizadoEn':None}
  self.assertEqual(self.http.get(ruta).status_code,401)
  self.assertEqual(self.http.patch(ruta,headers=self.headers,json={**datos,'id':'otra-cuenta'}).status_code,422)
  self.cliente.rpc.assert_not_called()
  self.cliente.rpc.return_value.execute.return_value.data={**datos,'actualizadoEn':VERSION}
  respuesta=self.http.patch(ruta,headers=self.headers,json=datos)
  self.assertEqual(respuesta.status_code,200)
  self.assertEqual(respuesta.headers['cache-control'],'private, no-store')
  self.assertEqual(respuesta.json()['actualizadoEn'],VERSION)
  self.cliente.rpc.assert_called_once_with('mis_preferencias_avisos',{'operacion':'guardar','datos':datos})
  self.cliente.rpc.return_value.execute.side_effect=APIError({'code':'40001','message':'Versión vieja'})
  self.assertEqual(self.http.patch(ruta,headers=self.headers,json=datos).status_code,409)

 def setUp(self):
  self.http=TestClient(app);p=patch('Back.contenidos.crear_cliente');self.crear=p.start();self.addCleanup(p.stop)
  self.cliente=self.crear.return_value;self.cliente.auth.get_user.return_value=Mock(user=Mock())
  self.cliente.rpc.return_value.execute.return_value.data={'nombres':'Ana','telefono':'3110000000','actualizadoA':VERSION}
  self.headers={'Authorization':'Bearer token-propio'}
 def test_anonimo_no_consulta_ni_edita(self):
  self.assertEqual(self.http.get('/perfil').status_code,401)
  self.assertEqual(self.http.patch('/perfil',json={'nombres':'Ana','actualizadoA':VERSION}).status_code,401)
  self.crear.assert_not_called()
 def test_lectura_no_recibe_id_y_no_se_almacena_en_cache(self):
  r=self.http.get('/perfil',headers=self.headers);self.assertEqual(r.status_code,200)
  self.assertEqual(r.headers['cache-control'],'no-store')
  self.cliente.postgrest.auth.assert_called_once_with('token-propio')
  self.cliente.rpc.assert_called_once_with('mi_perfil',{'operacion':'consultar','datos':{}})
 def test_rechaza_identificador_ajeno_en_consulta_y_edicion(self):
  ruta = '/perfil?id=00000000-0000-4000-8000-000000000001'
  self.assertEqual(self.http.get(ruta, headers=self.headers).status_code, 422)
  respuesta = self.http.patch(ruta, headers=self.headers, json={'nombres': 'Ana', 'actualizadoA': VERSION})
  self.assertEqual(respuesta.status_code, 422)
  self.assertEqual(respuesta.headers['cache-control'], 'no-store')
  self.cliente.rpc.assert_not_called()
 def test_edicion_envia_solo_campos_declarados_y_version(self):
  r=self.http.patch('/perfil',headers=self.headers,json={'nombres':' Ana ','telefono':'3111234567','actualizadoA':VERSION})
  self.assertEqual(r.status_code,200)
  nombre,args=self.cliente.rpc.call_args.args;self.assertEqual(nombre,'mi_perfil')
  self.assertEqual(args['operacion'],'guardar');self.assertEqual(args['datos']['nombres'],'Ana')
  self.assertNotIn('id',args['datos']);self.assertNotIn('primerApellido',args['datos'])
 def test_no_acepta_campos_privilegiados(self):
  for campo,valor in [('id','otra-cuenta'),('rol','administrador'),('estatus','activo'),('credencial','válida'),('correo','otro@example.com'),('primerApellido','Otro')]:
   r=self.http.patch('/perfil',headers=self.headers,json={'nombres':'Ana','actualizadoA':VERSION,campo:valor})
   self.assertEqual(r.status_code,422)
  self.cliente.rpc.assert_not_called()
 def test_reenvia_contactos_de_responsable_con_version(self):
  cambios = {'responsable': {'telefono': '3115551234', 'correo': 'responsable@example.com'},
             'actualizadoA': VERSION}
  self.cliente.rpc.return_value.execute.return_value.data = {
      'esMenor': True, 'domicilio': None,
      'responsable': {**cambios['responsable'], 'nombre': 'Persona responsable', 'relacion': 'madre'},
  }
  respuesta = self.http.patch('/perfil', headers=self.headers, json=cambios)
  self.assertEqual(respuesta.status_code, 200)
  self.assertEqual(respuesta.json()['responsable']['correo'], 'responsable@example.com')
  self.cliente.rpc.assert_called_once_with('mi_perfil', {'operacion': 'guardar', 'datos': cambios})
 def test_no_acepta_reemplazar_responsable_ni_contactos_invalidos(self):
  contactos_invalidos = [None, {}, {'telefono': None}, {'telefono': '123'}, {'correo': 'sin-arroba'},
                         {'telefono': '3111111111', 'nombre': 'Otra persona'},
                         {'telefono': '3111111111', 'usuarioId': 'otra-cuenta'},
                         {'correo': 'responsable@example.com', 'relacion': 'tutor'}]
  for responsable in contactos_invalidos:
   with self.subTest(responsable=responsable):
    respuesta = self.http.patch('/perfil', headers=self.headers,
                                json={'responsable': responsable, 'actualizadoA': VERSION})
    self.assertEqual(respuesta.status_code, 422)
  self.cliente.rpc.assert_not_called()
 def test_edicion_domicilio_propio_completo(self):
  domicilio = {**DOMICILIO, 'calle': ' Alameda '}
  respuesta = self.http.patch('/perfil', headers=self.headers,
                              json={'actualizadoA': VERSION, 'domicilio': domicilio})
  self.assertEqual(respuesta.status_code, 200)
  self.cliente.rpc.assert_called_once_with('mi_perfil', {'operacion': 'guardar', 'datos': {
      'actualizadoA': VERSION, 'domicilio': DOMICILIO,
  }})
  self.cliente.rpc.reset_mock()
  for invalido in [{**domicilio, 'codigoPostal': 'abcd'}, {**domicilio, 'usuarioId': 'otra-cuenta'}]:
   respuesta = self.http.patch('/perfil', headers=self.headers,
                               json={'actualizadoA': VERSION, 'domicilio': invalido})
   self.assertEqual(respuesta.status_code, 422)
  self.cliente.rpc.assert_not_called()
 def test_identifica_migracion_faltante_en_ediciones_ampliadas(self):
  perfil_legado = {'id': 'id-propio', 'actualizadoA': VERSION}
  for cambios in ({'domicilio': DOMICILIO}, {'responsable': {'telefono': '3115551234'}}):
   with self.subTest(cambios=cambios):
    self.cliente.rpc.reset_mock()
    self.cliente.rpc.return_value.execute.side_effect = [
        APIError({'code': '22023', 'message': 'Campos no editables o cambios vacíos.'}), Mock(data=perfil_legado),
    ]
    datos = {**cambios, 'actualizadoA': VERSION}
    respuesta = self.http.patch('/perfil', headers=self.headers, json=datos)
    self.assertEqual(respuesta.status_code, 503)
    self.assertIn('actualización de perfil HU-08', respuesta.json()['detail'])
    self.assertEqual(respuesta.headers['cache-control'], 'no-store')
    self.assertEqual(self.cliente.rpc.call_args_list, [
        call('mi_perfil', {'operacion': 'guardar', 'datos': datos}),
        call('mi_perfil', {'operacion': 'consultar', 'datos': {}}),
    ])
 def test_conserva_error_de_validacion_si_no_se_confirma_version_legada(self):
  perfil_actual = {'id': 'id-propio', 'actualizadoA': VERSION, 'esMenor': False,
                   'domicilio': DOMICILIO, 'responsable': None}
  for consulta in (Mock(data=perfil_actual), Mock(data=None), APIError({'code': '42501', 'message': 'Sesión no válida'})):
   with self.subTest(consulta=consulta):
    self.cliente.rpc.reset_mock()
    self.cliente.rpc.return_value.execute.side_effect = [
        APIError({'code': '22023', 'message': 'Campo interno inválido.'}), consulta,
    ]
    respuesta = self.http.patch('/perfil', headers=self.headers,
                                json={'domicilio': DOMICILIO, 'actualizadoA': VERSION})
    self.assertEqual(respuesta.status_code, 422)
    self.assertNotIn('Campo interno', respuesta.text)
    self.assertEqual(self.cliente.rpc.call_count, 2)
 def test_omite_diagnostico_en_ediciones_basicas_y_otros_errores(self):
  for codigo, cambios in (('22023', {'nombres': 'Ana'}), ('23514', {'domicilio': DOMICILIO})):
   self.cliente.rpc.reset_mock()
   self.cliente.rpc.return_value.execute.side_effect = APIError({'code': codigo, 'message': 'Validación interna.'})
   datos = {**cambios, 'actualizadoA': VERSION}
   respuesta = self.http.patch('/perfil', headers=self.headers, json=datos)
   self.assertEqual(respuesta.status_code, 422)
   self.cliente.rpc.assert_called_once_with('mi_perfil', {'operacion': 'guardar', 'datos': datos})
 def test_no_acepta_campos_vacios_null_telefono_invalido_ni_version_ausente(self):
  for datos in [{'actualizadoA':VERSION},{'nombres':' ','actualizadoA':VERSION},{'nombres':None,'actualizadoA':VERSION},
   {'telefono':'123','actualizadoA':VERSION},{'nombres':'Ana'},{'nombres':'Ana','actualizadoA':'2026-11-02T12:00:00'}]:
   self.assertEqual(self.http.patch('/perfil',headers=self.headers,json=datos).status_code,422)
  self.cliente.rpc.assert_not_called()
 def test_error_controlado_sin_detalle_interno(self):
  for codigo,estado in [('40001',409),('42501',403),('23514',422),('XX000',503)]:
   self.cliente.rpc.return_value.execute.side_effect=APIError({'code':codigo,'message':'dato interno secreto'})
   r=self.http.patch('/perfil',headers=self.headers,json={'telefono':'3111234567','actualizadoA':VERSION})
   self.assertEqual(r.status_code,estado);self.assertNotIn('secreto',r.text)
