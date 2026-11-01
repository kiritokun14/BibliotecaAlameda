"""Pruebas de permisos, transiciones y filtros de recuperación de fuentes RAG."""

import unittest
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

from fastapi import HTTPException
from postgrest.exceptions import APIError

from Back.asistente_fuentes import (
    DecisionAprobacion,
    FuenteEntrada,
    SesionFuentes,
    activar_fuente,
    aprobar_fuente,
    consultar_fuentes_rag,
    crear_fuente,
)


class ConsultaFalsa:
    """Simula la consulta encadenada de Supabase y conserva los filtros aplicados."""

    def __init__(self, data):
        self.data = data
        self.filtros = []
        self.seleccion = None

    def select(self, seleccion, **kwargs):
        del kwargs
        self.seleccion = seleccion
        return self

    def eq(self, campo, valor):
        self.filtros.append(('eq', campo, valor))
        return self

    @property
    def not_(self):
        return self

    def is_(self, campo, valor):
        self.filtros.append(('not.is', campo, valor))
        return self

    def order(self, *args, **kwargs):
        del args, kwargs
        return self

    def limit(self, *args):
        del args
        return self

    def insert(self, values):
        self.insertados = values
        return self

    def execute(self):
        return SimpleNamespace(data=self.data, count=len(self.data))


class ClienteFalso:
    """Proporciona respuestas controladas para consultas y funciones RPC."""

    def __init__(self):
        self.consultas = []
        self.resultado_rpc = None
        self.error_rpc = None
        self.rpc = Mock(side_effect=self._rpc)

    def table(self, nombre):
        del nombre
        consulta = ConsultaFalsa([])
        self.consultas.append(consulta)
        return consulta

    def _rpc(self, nombre, parametros):
        self.nombre_rpc = nombre
        self.parametros_rpc = parametros

        def execute():
            if self.error_rpc:
                raise self.error_rpc
            return SimpleNamespace(data=self.resultado_rpc)

        return SimpleNamespace(execute=execute)


class AsistenteFuentesTests(unittest.TestCase):
    """Comprueba las reglas principales de administración y recuperación de fuentes."""

    def setUp(self):
        self.cliente = ClienteFalso()
        self.usuario_id = str(uuid4())
        self.fuente_id = str(uuid4())
        self.sesion_editor = SesionFuentes(self.cliente, self.usuario_id, False)
        self.sesion_admin = SesionFuentes(self.cliente, self.usuario_id, True)
        self.fuente = {
            'id': self.fuente_id,
            'tituloFuente': 'Reglamento',
            'tipoFuente': 'documento',
            'contenidoReferencia': 'Texto institucional.',
            'estadoFuente': 'aprobada',
            'version': 1,
            'subidaPor': self.usuario_id,
            'aprobadaPor': self.usuario_id,
            'creadaEn': '2026-10-31T12:00:00Z',
            'actualizadaEn': '2026-10-31T12:00:00Z',
            'activa': True,
        }

    def test_fuente_nueva_se_registra_como_borrador_no_activo(self):
        # El alta debe fijar en el servidor la versión inicial y el estado del borrador.
        consulta = ConsultaFalsa([self.fuente | {
            'estadoFuente': 'borrador',
            'aprobadaPor': None,
            'activa': False,
        }])
        self.cliente.table = Mock(return_value=consulta)

        respuesta = crear_fuente(
            FuenteEntrada(
                tituloFuente='Reglamento',
                tipoFuente='documento',
                contenidoReferencia='Texto institucional.',
            ),
            self.sesion_editor,
        )

        self.assertEqual(respuesta.estadoFuente, 'borrador')
        self.assertFalse(respuesta.activa)
        self.assertEqual(consulta.insertados['subidaPor'], self.usuario_id)
        self.assertEqual(consulta.insertados['version'], 1)

    def test_solo_administrador_puede_aprobar(self):
        # Una cuenta con permiso de gestión no obtiene autoridad para aprobar.
        with self.assertRaises(HTTPException) as error:
            aprobar_fuente(
                self.fuente_id,
                DecisionAprobacion(aprobar=True),
                self.sesion_editor,
            )
        self.assertEqual(error.exception.status_code, 403)
        self.cliente.rpc.assert_not_called()

    def test_aprobar_llama_rpc_con_decision_y_folio(self):
        self.cliente.resultado_rpc = self.fuente

        fuente = aprobar_fuente(
            self.fuente_id,
            DecisionAprobacion(aprobar=True),
            self.sesion_admin,
        )

        self.assertEqual(fuente.estadoFuente, 'aprobada')
        self.assertEqual(self.cliente.nombre_rpc, 'resolver_fuente_rag')
        self.assertEqual(self.cliente.parametros_rpc, {
            'p_fuente_id': self.fuente_id,
            'p_aprobar': True,
        })

    def test_activar_propaga_rechazo_de_fuente_no_aprobada(self):
        # La base de datos es la autoridad final para validar la transición.
        self.cliente.error_rpc = APIError({
            'code': '23514',
            'message': 'La fuente requiere aprobación.',
        })

        with self.assertRaises(HTTPException) as error:
            activar_fuente(self.fuente_id, self.sesion_editor)

        self.assertEqual(error.exception.status_code, 400)
        self.assertEqual(self.cliente.nombre_rpc, 'activar_fuente_rag')

    def test_recuperacion_filtra_aprobada_aprobador_y_activa(self):
        # Verificar los tres filtros evita incluir borradores y fuentes retiradas.
        consulta = ConsultaFalsa([self.fuente])
        self.cliente.table = Mock(return_value=consulta)

        resultado = consultar_fuentes_rag(self.cliente)

        self.assertEqual(resultado, [self.fuente])
        self.assertIn(('eq', 'estadoFuente', 'aprobada'), consulta.filtros)
        self.assertIn(('not.is', 'aprobadaPor', 'null'), consulta.filtros)
        self.assertIn(('eq', 'activa', True), consulta.filtros)


if __name__ == '__main__':
    unittest.main()
