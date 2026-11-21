import unittest
from unittest.mock import Mock,patch
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from Back.main import app
VERSION='2026-11-02T12:00:00.123456Z'
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
