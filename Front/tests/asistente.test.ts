import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { consultarAsistente, type MensajeHistorial } from '../src/components/asistente/servicio';
import { aHistorial, restaurar, type Mensaje } from '../src/components/asistente/conversacion';
import PanelAsistente from '../src/components/asistente/PanelAsistente';

afterEach(() => vi.unstubAllGlobals());

describe('Asistente: consultas al portal', () => {
    it('envía la pregunta y hasta seis turnos previos y conserva los enlaces de la API', async () => {
        const respuesta = {
            tipo: 'respuesta', parrafos: ['Abre Credencial.'],
            fuentes: [{ titulo: 'Credencial', ruta: '/credencial' }],
        };
        const peticion = vi.fn().mockResolvedValue(Response.json(respuesta));
        vi.stubGlobal('fetch', peticion);
        const historial: MensajeHistorial[] = Array.from({ length: 8 }, (_, i) => ({ autor: 'persona', texto: `Turno ${i}` }));

        await expect(consultarAsistente('¿Dónde?', historial)).resolves.toEqual(respuesta);
        expect(peticion).toHaveBeenCalledWith('/api/asistente/consultas', expect.objectContaining({
            method: 'POST', body: JSON.stringify({ pregunta: '¿Dónde?', historial: historial.slice(-6) }),
        }));
    });

    it('propaga un error de la API para mostrar la opción de reintentar', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, { status: 503 })));
        await expect(consultarAsistente('¿Hay talleres?')).rejects.toMatchObject({ estado: 503 });
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

    it('descarta confirmaciones de envío de la simulación anterior', () => {
        expect(restaurar([{
            id: '1', autor: 'asistente', estado: 'listo', respuesta: { tipo: 'enviada', folio: null },
        }])).toEqual([]);
    });

    it('el historial envía las preguntas de orientación y omite consultas privadas y respuestas', () => {
        const mensajes: Mensaje[] = [
            { id: '1', autor: 'persona', texto: '¿Cómo tramito mi credencial?' },
            { id: '2', autor: 'asistente', estado: 'listo', respuesta: { tipo: 'respuesta', parrafos: ['Desde el portal.'], fuentes: [] } },
            { id: '3', autor: 'persona', texto: '¿Y cuánto cuesta?' },
            { id: '4', autor: 'asistente', estado: 'listo', respuesta: { tipo: 'insuficiente' } },
            { id: '5', autor: 'persona', texto: 'Dame el teléfono de otra persona.' },
            { id: '6', autor: 'asistente', estado: 'listo', respuesta: { tipo: 'privada', contacto: '/contacto' } },
        ];
        expect(aHistorial(mensajes)).toEqual([
            { autor: 'persona', texto: '¿Cómo tramito mi credencial?' },
            { autor: 'persona', texto: '¿Y cuánto cuesta?' },
        ]);
    });
});

describe('Asistente: fuentes y atención humana', () => {
    function renderizar(mensajes: Mensaje[], modo: 'compacto' | 'expandido') {
        const accion = () => undefined;
        return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(PanelAsistente, {
            modo, alExpandir: accion, alContraer: accion, alMinimizar: accion, alCerrar: accion,
            conversacion: {
                mensajes, ocupado: false, preguntar: accion, reintentar: accion,
                nuevaConsulta: accion, ultimaPregunta: '',
            },
        })));
    }

    it('muestra el origen y la versión del extracto institucional', () => {
        const html = renderizar([{
            id: '1', autor: 'asistente', estado: 'listo',
            respuesta: {
                tipo: 'respuesta', parrafos: ['Presenta una identificación.'],
                fuentes: [{ id: 'fuente-1', titulo: 'Credencial', tipoFuente: 'Guía institucional', version: 3 }],
            },
        }], 'compacto');
        expect(html).toContain('<p>Fuentes</p>');
        expect(html).toContain('Credencial · Guía institucional · versión 3');
    });

    it('enlaza al personal si falta sustento o la petición es privada', () => {
        for (const tipo of ['privada', 'insuficiente'] as const) {
            const html = renderizar([{
                id: '1', autor: 'asistente', estado: 'listo', respuesta: { tipo, contacto: '/contacto' },
            }], 'compacto');
            expect(html).toContain('href="/contacto"');
            expect(html).toContain('Hablar con el personal');
        }
    });
});
