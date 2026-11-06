import unittest
import os
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from Back.main import app


class AdministracionTests(unittest.TestCase):
    def setUp(self):
        entorno=patch.dict(os.environ,{'ADMINISTRACION_HABILITADA':'true'})
        entorno.start()
        self.addCleanup(entorno.stop)
        self.http = TestClient(app)
        parche = patch('Back.administracion.crear_cliente')
        self.crear = parche.start()
        self.addCleanup(parche.stop)
        self.cliente = self.crear.return_value
        self.cliente.auth.get_user.return_value = Mock(user=Mock())
        self.cliente.rpc.return_value.execute.return_value.data = {'resultado': 'correcto'}
        self.cabeceras = {'Authorization': 'Bearer token-de-prueba'}
        self.usuario = str(uuid4())
        self.ruta = '/administracion/cuentas/' + self.usuario

    def test_sin_token_no_invoca_supabase(self):
        for metodo, ruta in [('get','/administracion/cuentas'), ('get','/administracion/roles'),
                             ('get','/administracion/mi-acceso')]:
            self.assertEqual(getattr(self.http, metodo)(ruta).status_code, 401)
        self.crear.assert_not_called()

    def test_auth_valida_token_antes_de_rpc(self):
        self.cliente.auth.get_user.side_effect = AuthApiError('Token privado',401,'bad_jwt')
        r=self.http.get('/administracion/cuentas',headers=self.cabeceras)
        self.assertEqual(r.status_code,401)
        self.cliente.rpc.assert_not_called()
        self.assertNotIn('Token privado',r.text)

    def test_listado_y_paginacion(self):
        r=self.http.get('/administracion/cuentas?limite=10&desplazamiento=5&busqueda=Persona',headers=self.cabeceras)
        self.assertEqual(r.status_code,200)
        self.cliente.auth.get_user.assert_called_once_with('token-de-prueba')
        self.cliente.postgrest.auth.assert_called_once_with('token-de-prueba')
        self.cliente.rpc.assert_called_once_with('administrar_cuentas',{'operacion':'listar_cuentas',
            'datos':{'busqueda':'Persona','limite':10,'desplazamiento':5}})

    def test_rol_sin_actor_enviado(self):
        r=self.http.put(self.ruta+'/roles',headers=self.cabeceras,json={'rol':'editor','motivo':'Cambio de responsabilidad'})
        self.assertEqual(r.status_code,200)
        parametros=self.cliente.rpc.call_args.args[1]['datos']
        self.assertEqual(parametros['usuarioId'],self.usuario)
        self.assertNotIn('asignadoPor',parametros)

    def test_no_permite_suplantar_actor(self):
        r=self.http.put(self.ruta+'/roles',headers=self.cabeceras,
            json={'rol':'administrador','motivo':'Prueba','asignadoPor':str(uuid4())})
        self.assertEqual(r.status_code,422)
        self.cliente.rpc.assert_not_called()

    def test_vigencia_y_ambito_invalidos(self):
        casos=[{'ambito':'actividades_asignadas','actividades':[]},
               {'ambito':'global','actividades':[str(uuid4())]},
               {'vigenteDesde':'2026-11-01T00:00:00'},
               {'vigenteDesde':'2026-11-02T00:00:00Z','vigenteHasta':'2026-11-01T00:00:00Z'},
               {'motivo':'  '},{'rol':'superusuario'},
               {'rol':'administrador','vigenteHasta':'2027-01-01T00:00:00Z'}]
        for cambios in casos:
            with self.subTest(cambios=cambios):
                r=self.http.put(self.ruta+'/roles',headers=self.cabeceras,json={'rol':'editor','motivo':'Prueba'}|cambios)
                self.assertEqual(r.status_code,422)
        self.cliente.rpc.assert_not_called()

    def test_cambio_estado_y_retiro_rol(self):
        r=self.http.patch(self.ruta+'/estado',headers=self.cabeceras,json={'estatus':'inactivo','motivo':'Retiro temporal'})
        self.assertEqual(r.status_code,200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['operacion'],'cambiar_estado')
        r=self.http.request('DELETE',self.ruta+'/roles/editor',headers=self.cabeceras,json={'motivo':'Fin de función'})
        self.assertEqual(r.status_code,200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['operacion'],'retirar_rol')

    def test_no_admin_y_errores_sin_detalles(self):
        for codigo,estado in [('42501',403),('P0002',404),('23514',409),('22P02',422),('XX000',503)]:
            with self.subTest(codigo=codigo):
                self.cliente.rpc.return_value.execute.side_effect=APIError({'code':codigo,'message':'secreto-interno'})
                r=self.http.get(self.ruta,headers=self.cabeceras)
                self.assertEqual(r.status_code,estado)
                self.assertNotIn('secreto-interno',r.text)

    def test_historial_y_acceso_propio(self):
        self.assertEqual(self.http.get(self.ruta+'/historial',headers=self.cabeceras).status_code,200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['operacion'],'historial')
        self.assertEqual(self.http.get('/administracion/mi-acceso',headers=self.cabeceras).status_code,200)
        self.assertEqual(self.cliente.rpc.call_args.args[1],{'operacion':'mi_acceso','datos':{}})

    def test_uuid_y_paginacion_invalida(self):
        self.assertEqual(self.http.get('/administracion/cuentas/no-es-uuid',headers=self.cabeceras).status_code,422)
        self.assertEqual(self.http.get('/administracion/cuentas?limite=101',headers=self.cabeceras).status_code,422)
        self.cliente.rpc.assert_not_called()

    def test_desactivada_no_invoca_auth(self):
        with patch.dict(os.environ,{'ADMINISTRACION_HABILITADA':'false'}):
            self.assertEqual(self.http.get('/administracion/cuentas',headers=self.cabeceras).status_code,503)
        self.crear.assert_not_called()

    def test_administrador_no_recibe_facultad_editorial(self):
        self.cliente.rpc.return_value.execute.return_value.data=[{'codigo':'administrador','nombre':'Administrador'}]
        r=self.http.get('/administracion/roles',headers=self.cabeceras)
        self.assertEqual(r.status_code,200)
        self.assertEqual(r.json()[0]['capacidades'],['administrar_cuentas'])

    def test_usuario_puede_proponer_e_inscribirse_sin_editor(self):
        self.cliente.rpc.return_value.execute.return_value.data={'roles':[{'rolCodigo':'usuario'}]}
        r=self.http.get('/administracion/mi-acceso',headers=self.cabeceras)
        self.assertEqual(r.status_code,200)
        capacidades=r.json()['roles'][0]['capacidades']
        self.assertIn('crear_propuestas_propias',capacidades)
        self.assertIn('solicitar_inscripcion',capacidades)
        self.assertIn('cancelar_participacion_propia',capacidades)
        self.assertNotIn('publicar_contenidos',capacidades)
        self.assertNotIn('administrar_cuentas',capacidades)

    def test_catalogo_actores_documentados(self):
        self.cliente.rpc.return_value.execute.return_value.data=[{'codigo':c} for c in ('usuario','editor','responsable_actividades','administrador')]
        r=self.http.get('/administracion/roles',headers=self.cabeceras)
        self.assertEqual([v['codigo'] for v in r.json()],['usuario','editor','responsable_actividades','administrador'])
        self.assertEqual(r.json()[1]['capacidades'],[])

    def test_roles_anteriores_rechazados(self):
        for rol in ('servicios_digitales','prestamos','publicador','usuario'):
            r=self.http.put(self.ruta+'/roles',headers=self.cabeceras,json={'rol':rol,'motivo':'Prueba'})
            self.assertEqual(r.status_code,422)
        self.cliente.rpc.assert_not_called()

    def test_asignar_capacidad_y_guardar_seleccion(self):
        r=self.http.put(self.ruta+'/capacidades',headers=self.cabeceras,
            json={'capacidad':'publicar_contenidos','motivo':'Autorización expresa'})
        self.assertEqual(r.status_code,200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['operacion'],'asignar_capacidad')
        r=self.http.put(self.ruta+'/acceso',headers=self.cabeceras,
            json={'roles':['editor','responsable_actividades'],'capacidades':['preparar_contenidos','registrar_asistencia'],
                  'ambito':'actividades_asignadas','actividades':[str(uuid4())],'motivo':'Selección del panel'})
        self.assertEqual(r.status_code,200)
        self.assertEqual(self.cliente.rpc.call_args.args[1]['operacion'],'guardar_acceso')

    def test_capacidad_no_da_rol_admin_y_no_admite_inventadas(self):
        for cambios in ({'capacidades':['administrar_cuentas']},{'capacidades':['publicar_contenidos'],'roles':[]},
                        {'roles':['editor','editor']},{'capacidades':['moderar_foro'],'ambito':'actividades_asignadas',
                         'actividades':[str(uuid4())]}):
            r=self.http.put(self.ruta+'/acceso',headers=self.cabeceras,
                json={'roles':['editor'],'capacidades':[],'motivo':'Prueba'}|cambios)
            self.assertEqual(r.status_code,422)
        self.cliente.rpc.assert_not_called()

    def test_responsable_no_necesita_editor(self):
        r=self.http.put(self.ruta+'/acceso',headers=self.cabeceras,
            json={'roles':['responsable_actividades'],'capacidades':['gestionar_actividades','registrar_asistencia','moderar_foro'],
                  'motivo':'Responsabilidad documentada'})
        self.assertEqual(r.status_code,200)

    def test_atencion_y_prestamos_sin_editor(self):
        for capacidad in ('alta_asistida','orientar_recuperacion','atender_contactos','validar_credenciales',
                          'consultar_cuentas_atencion','atender_bibliocomunidad'):
            r=self.http.put(self.ruta+'/acceso',headers=self.cabeceras,
                json={'roles':[],'capacidades':[capacidad],'motivo':'Concesión específica'})
            self.assertEqual(r.status_code,200)

    def test_editor_no_moderador_y_admin_publica_solo_con_permiso(self):
        r=self.http.put(self.ruta+'/acceso',headers=self.cabeceras,
            json={'roles':['editor'],'capacidades':['moderar_foro'],'motivo':'Prueba negativa'})
        self.assertEqual(r.status_code,422)
        r=self.http.put(self.ruta+'/acceso',headers=self.cabeceras,
            json={'roles':['administrador'],'capacidades':['publicar_contenidos'],'motivo':'Publicación autorizada expresamente'})
        self.assertEqual(r.status_code,200)


if __name__=='__main__':
    unittest.main()
