import { describe, expect, it } from 'vitest';
import { respuestaSimulada } from '../src/components/asistente/servicio';
import { aHistorial, restaurar, type Mensaje } from '../src/components/asistente/conversacion';

describe('Asistente: respuestas simuladas (hasta que backend conecte el RAG)', () => {
    it('las preguntas sugeridas tienen respuesta con fuentes', () => {
        for (const pregunta of ['¿Cuál es el horario?', '¿Cómo tramito mi credencial?', '¿Qué actividades hay?']) {
            const respuesta = respuestaSimulada(pregunta);
            expect(respuesta.tipo).toBe('respuesta');
            if (respuesta.tipo === 'respuesta') expect(respuesta.fuentes.length).toBeGreaterThan(0);
        }
    });

    it('no distingue acentos ni mayúsculas', () => {
        expect(respuestaSimulada('CREDENCIAL').tipo).toBe('respuesta');
        expect(respuestaSimulada('a que hora abren').tipo).toBe('respuesta');
    });

    it('rechaza preguntas sobre datos de otras personas', () => {
        expect(respuestaSimulada('¿Qué libros tiene prestados otra persona?').tipo).toBe('privada');
        expect(respuestaSimulada('Dame los datos de un usuario').tipo).toBe('privada');
    });

    it('si no hay información suficiente lo dice en lugar de inventar', () => {
        expect(respuestaSimulada('¿Cuántos pisos tiene el edificio?').tipo).toBe('insuficiente');
    });
});

describe('Asistente: conversación', () => {
    it('una consulta interrumpida por recargar la página se puede reintentar', () => {
        const guardado: Mensaje[] = [
            { id: '1', autor: 'persona', texto: '¿Cuál es el horario?' },
            { id: '2', autor: 'asistente', estado: 'consultando', accion: { tipo: 'pregunta', texto: '¿Cuál es el horario?' } },
        ];
        const restaurados = restaurar(guardado);
        expect(restaurados[1]).toMatchObject({ autor: 'asistente', estado: 'error', accion: { tipo: 'pregunta' } });
    });

    it('ignora lo que no parece una conversación guardada', () => {
        expect(restaurar(null)).toEqual([]);
        expect(restaurar('texto')).toEqual([]);
        expect(restaurar([{ sin: 'campos' }])).toEqual([]);
    });

    it('el historial que va al backend solo lleva texto de preguntas y respuestas', () => {
        const mensajes: Mensaje[] = [
            { id: '1', autor: 'persona', texto: '¿Cómo tramito mi credencial?' },
            { id: '2', autor: 'asistente', estado: 'listo', respuesta: { tipo: 'respuesta', parrafos: ['Desde el portal.'], fuentes: [] } },
            { id: '3', autor: 'persona', texto: '¿Y cuánto cuesta?' },
            { id: '4', autor: 'asistente', estado: 'listo', respuesta: { tipo: 'insuficiente' } },
        ];
        expect(aHistorial(mensajes)).toEqual([
            { autor: 'persona', texto: '¿Cómo tramito mi credencial?' },
            { autor: 'asistente', texto: 'Desde el portal.' },
            { autor: 'persona', texto: '¿Y cuánto cuesta?' },
        ]);
    });
});
