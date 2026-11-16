"""Pruebas reales: solo copia desechable de Supabase con semillas y migración aplicada.

Requiere psycopg[binary], HU19_TEST_DSN y base terminada en _hu19_test.
No carga .env ni conecta a CECANbd. Crea y elimina solo sus UUID de prueba.
"""
import json
import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

try:
    import psycopg
except ImportError:
    psycopg = None

DSN = os.getenv('HU19_TEST_DSN')
ACTOR = '00000000-0000-4000-a000-000000000003'
PROPONENTE = '00000000-0000-4000-a000-000000000005'
OTRO = '00000000-0000-4000-a000-000000000006'
ACTIVIDAD = '00000000-0000-4000-c000-000000000002'


@unittest.skipUnless(DSN and psycopg, 'Requiere HU19_TEST_DSN y psycopg; no se simula PostgreSQL.')
class InscripcionesPostgresTests(unittest.TestCase):
    def setUp(self):
        self.db = psycopg.connect(DSN, autocommit=True)
        self.addCleanup(self.db.close)
        nombre = self.db.execute('select current_database()').fetchone()[0]
        if not nombre.endswith('_hu19_test'):
            self.fail('Usa exclusivamente una base desechable terminada en _hu19_test.')
        self.sesion, self.espacio, self.auth_session = [uuid4() for _ in range(3)]
        self.ids = [uuid4(), uuid4()]
        self.addCleanup(self.limpiar)
        with self.db.transaction():
            self.db.execute('INSERT INTO public.espacio(id,slug,nombre,capacidad,descripcion) VALUES(%s,%s,%s,2,%s)',
                            (self.espacio, str(self.espacio), 'HU19 prueba', 'Desechable'))
            self.db.execute('''INSERT INTO public."sesionActividad"
                (id,"actividadId","espacioId",inicio,fin,capacidad,estado,"registroAbierto")
                VALUES(%s,%s,%s,now()+interval '30 days',now()+interval '30 days 1 hour',1,'programada',true)''',
                            (self.sesion, ACTIVIDAD, self.espacio))
            for identificador, usuario in zip(self.ids, [PROPONENTE, OTRO]):
                self.db.execute('INSERT INTO public.inscripcion(id,"sesionId","usuarioId") VALUES(%s,%s,%s)',
                                (identificador, self.sesion, usuario))
            self.db.execute('INSERT INTO auth.sessions(id,user_id) VALUES(%s,%s)', (self.auth_session, ACTOR))

    def limpiar(self):
        with self.db.transaction():
            self.db.execute('DELETE FROM public."historiaInscripcion" WHERE "inscripcionId"=ANY(%s)', (self.ids,))
            self.db.execute('DELETE FROM public.inscripcion WHERE id=ANY(%s)', (self.ids,))
            self.db.execute('DELETE FROM public."sesionActividad" WHERE id=%s', (self.sesion,))
            self.db.execute('DELETE FROM public.espacio WHERE id=%s', (self.espacio,))
            self.db.execute('DELETE FROM auth.sessions WHERE id=%s', (self.auth_session,))

    def rpc(self, operacion, datos, conexion=None, actor=ACTOR):
        db = conexion or self.db
        with db.transaction():
            db.execute("SELECT set_config('request.jwt.claims',%s,true)",
                       (json.dumps({'sub': actor, 'role': 'authenticated', 'session_id': str(self.auth_session)}),))
            db.execute('SET LOCAL ROLE authenticated')
            resultado = db.execute('SELECT public.gestionar_inscripciones(%s,%s::jsonb)',
                                   (operacion, json.dumps(datos))).fetchone()[0]
            db.execute('RESET ROLE')
            return resultado

    def confirmar(self, indice=0, conexion=None):
        return self.rpc('confirmar', {'inscripcionId': str(self.ids[indice]), 'motivo': 'Requisitos revisados'}, conexion)

    def test_consulta_y_privacidad(self):
        filas = self.rpc('listar', {'sesionId': str(self.sesion)})
        self.assertEqual(len(filas), 2)
        for fila in filas:
            self.assertEqual(set(fila), {'id', 'usuarioId', 'nombre', 'status', 'creadoA'})

    def test_cupos_cuenta_solo_confirmados(self):
        self.assertEqual(self.rpc('cupos', {'sesionId': str(self.sesion)})['disponibles'], 1)
        self.confirmar()
        r = self.rpc('cupos', {'sesionId': str(self.sesion)})
        self.assertEqual((r['confirmados'], r['disponibles']), (1, 0))

    def test_confirmacion_actor_fecha_e_historial(self):
        r = self.confirmar()
        self.assertEqual(r['status'], 'confirmada')
        self.assertEqual(r['decisionPor'], ACTOR)
        self.assertIsNotNone(r['decididoA'])
        fila = self.db.execute('''SELECT "estadoPrevio","estadoNuevo","cambiadoPor",razon,"cambiadoA"
            FROM public."historiaInscripcion" WHERE "inscripcionId"=%s''', (self.ids[0],)).fetchone()
        self.assertEqual(fila[:2], ('pendiente', 'confirmada'))
        self.assertEqual(str(fila[2]), ACTOR)
        self.assertEqual(fila[3], 'Requisitos revisados')
        self.assertIsNotNone(fila[4])

    def test_cupo_agotado(self):
        self.confirmar()
        with self.assertRaises(psycopg.Error) as e:
            self.confirmar(1)
        self.assertEqual(e.exception.sqlstate, '23514')
        self.assertEqual(self.db.execute('SELECT status FROM public.inscripcion WHERE id=%s', (self.ids[1],)).fetchone()[0], 'pendiente')

    def test_duplicada(self):
        self.confirmar()
        with self.assertRaises(psycopg.Error) as e:
            self.confirmar()
        self.assertEqual(e.exception.sqlstate, '55000')
        self.assertEqual(self.db.execute('SELECT count(*) FROM public."historiaInscripcion" WHERE "inscripcionId"=%s', (self.ids[0],)).fetchone()[0], 1)

    def test_sin_permiso_y_sesion_ajena(self):
        with self.db.transaction(force_rollback=True):
            self.db.execute('DELETE FROM public."permisoCuenta" WHERE "usuarioId"=%s AND capacidad=%s', (ACTOR, 'confirmar_inscripciones'))
            for operacion in ['listar', 'cupos', 'confirmar']:
                datos = {'inscripcionId': str(self.ids[0]), 'motivo': 'Revisado'} if operacion == 'confirmar' else {'sesionId': str(self.sesion)}
                with self.assertRaises(psycopg.Error) as e:
                    self.rpc(operacion, datos)
                self.assertEqual(e.exception.sqlstate, '42501')

    def test_permiso_especifico_ajeno(self):
        with self.db.transaction(force_rollback=True):
            self.db.execute('UPDATE public."permisoCuenta" SET "actividadId"=%s WHERE "usuarioId"=%s AND capacidad=%s',
                            ('00000000-0000-4000-c000-000000000001', ACTOR, 'confirmar_inscripciones'))
            with self.assertRaises(psycopg.Error) as e:
                self.confirmar()
            self.assertEqual(e.exception.sqlstate, '42501')

    def test_permiso_vencido(self):
        with self.db.transaction(force_rollback=True):
            self.db.execute('UPDATE public."permisoCuenta" SET "vigenteDesde"=now()-interval \'2 days\', "vigenteHasta"=now()-interval \'1 day\' WHERE "usuarioId"=%s AND capacidad=%s', (ACTOR, 'confirmar_inscripciones'))
            with self.assertRaises(psycopg.Error) as e:
                self.confirmar()
            self.assertEqual(e.exception.sqlstate, '42501')

    def test_permiso_especifico_correcto(self):
        with self.db.transaction(force_rollback=True):
            self.db.execute('UPDATE public."permisoCuenta" SET "actividadId"=%s WHERE "usuarioId"=%s AND capacidad=%s',
                            (ACTIVIDAD, ACTOR, 'confirmar_inscripciones'))
            self.assertEqual(self.confirmar()['status'], 'confirmada')

    def test_proponente_autenticado_no_recibe_participantes(self):
        with self.db.transaction(force_rollback=True):
            self.db.execute('UPDATE auth.sessions SET user_id=%s WHERE id=%s', (PROPONENTE, self.auth_session))
            with self.assertRaises(psycopg.Error) as e:
                self.rpc('listar', {'sesionId': str(self.sesion)}, actor=PROPONENTE)
            self.assertEqual(e.exception.sqlstate, '42501')

    def test_sesion_cerrada(self):
        self.db.execute('UPDATE public."sesionActividad" SET "registroAbierto"=false WHERE id=%s', (self.sesion,))
        with self.assertRaises(psycopg.Error) as e:
            self.confirmar()
        self.assertEqual(e.exception.sqlstate, '23514')

    def test_rechazar_registra_actor_motivo_e_historial(self):
        r = self.rpc('rechazar', {'inscripcionId': str(self.ids[0]), 'motivo': 'No cumple requisitos publicados'})
        self.assertEqual((r['status'], r['decisionPor']), ('rechazada', ACTOR))
        historia = self.db.execute('''SELECT "estadoPrevio","estadoNuevo",razon
            FROM public."historiaInscripcion" WHERE "inscripcionId"=%s''', (self.ids[0],)).fetchone()
        self.assertEqual(historia, ('pendiente', 'rechazada', 'No cumple requisitos publicados'))

    def test_cancelar_libera_cupo_y_permite_otro_participante(self):
        self.confirmar()
        r = self.rpc('cancelar', {'inscripcionId': str(self.ids[0]), 'motivo': 'Cancelación atendida por personal'})
        self.assertEqual(r['status'], 'cancelada')
        self.assertEqual(self.rpc('cupos', {'sesionId': str(self.sesion)})['disponibles'], 1)
        self.assertEqual(self.confirmar(1)['status'], 'confirmada')
        historia = self.db.execute('''SELECT "estadoPrevio","estadoNuevo" FROM public."historiaInscripcion"
            WHERE "inscripcionId"=%s AND "estadoNuevo"='cancelada' ''', (self.ids[0],)).fetchone()
        self.assertEqual(historia, ('confirmada', 'cancelada'))

    def test_no_rechaza_confirmada_ni_cancela_dos_veces(self):
        self.confirmar()
        with self.assertRaises(psycopg.Error) as e:
            self.rpc('rechazar', {'inscripcionId': str(self.ids[0]), 'motivo': 'Revisado'})
        self.assertEqual(e.exception.sqlstate, '55000')
        self.rpc('cancelar', {'inscripcionId': str(self.ids[0]), 'motivo': 'Revisado'})
        with self.assertRaises(psycopg.Error) as e:
            self.rpc('cancelar', {'inscripcionId': str(self.ids[0]), 'motivo': 'Revisado'})
        self.assertEqual(e.exception.sqlstate, '55000')

    def test_conteos_sin_identificadores_de_participantes(self):
        r = self.rpc('conteos', {'sesionId': str(self.sesion)})
        self.assertEqual(set(r), {'sesionId', 'pendientes', 'confirmados', 'rechazados', 'cancelados'})
        self.assertEqual(r['pendientes'], 2)

    def test_organizador_propio_solo_conteos(self):
        with self.db.transaction(force_rollback=True):
            self.db.execute('UPDATE public.actividad SET "creadoPor"=%s WHERE id=%s', (PROPONENTE, ACTIVIDAD))
            self.db.execute('UPDATE auth.sessions SET user_id=%s WHERE id=%s', (PROPONENTE, self.auth_session))
            r = self.rpc('conteos', {'sesionId': str(self.sesion)}, actor=PROPONENTE)
            self.assertEqual(r['pendientes'], 2)
            with self.assertRaises(psycopg.Error) as e:
                self.rpc('listar', {'sesionId': str(self.sesion)}, actor=PROPONENTE)
            self.assertEqual(e.exception.sqlstate, '42501')

    def test_conteos_ajenos_denegados(self):
        with self.db.transaction(force_rollback=True):
            self.db.execute('UPDATE auth.sessions SET user_id=%s WHERE id=%s', (OTRO, self.auth_session))
            with self.assertRaises(psycopg.Error) as e:
                self.rpc('conteos', {'sesionId': str(self.sesion)}, actor=OTRO)
            self.assertEqual(e.exception.sqlstate, '42501')

    def test_transaccion_revierte_si_historial_falla(self):
        with self.db.transaction(force_rollback=True):
            self.db.execute('''ALTER TABLE public."historiaInscripcion" ADD CONSTRAINT hu19_fallo_historial
                CHECK ("inscripcionId" <> '%s'::uuid) NOT VALID''' % self.ids[0])
            with self.assertRaises(psycopg.Error):
                self.confirmar()
            self.assertEqual(self.db.execute('SELECT status FROM public.inscripcion WHERE id=%s', (self.ids[0],)).fetchone()[0], 'pendiente')

    def test_dos_confirmaciones_simultaneas_ultimo_cupo(self):
        barrera = Barrier(2)
        def intentar(indice):
            with psycopg.connect(DSN, autocommit=True) as db:
                db.execute("SET statement_timeout='10s'")
                barrera.wait(timeout=10)
                try:
                    self.confirmar(indice, db)
                    return 'ok'
                except psycopg.Error as e:
                    return e.sqlstate
        with ThreadPoolExecutor(max_workers=2) as pool:
            resultados = list(pool.map(intentar, [0, 1]))
        self.assertCountEqual(resultados, ['ok', '23514'])
        self.assertEqual(self.rpc('cupos', {'sesionId': str(self.sesion)})['confirmados'], 1)

    def test_rls_no_permite_leer_perfiles_ajenos_ni_mutar_inscripciones(self):
        with self.db.transaction(force_rollback=True):
            self.db.execute("SELECT set_config('request.jwt.claims',%s,true)", (json.dumps({'sub': PROPONENTE, 'role': 'authenticated'}),))
            self.db.execute('SET LOCAL ROLE authenticated')
            filas = self.db.execute('SELECT telefono FROM public.perfil WHERE id=%s', (OTRO,)).fetchall()
            self.assertEqual(filas, [])
            with self.assertRaises(psycopg.Error):
                with self.db.transaction():
                    self.db.execute("UPDATE public.inscripcion SET status='confirmada' WHERE id=%s", (self.ids[0],))
