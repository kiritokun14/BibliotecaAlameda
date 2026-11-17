import { describe, expect, it } from 'vitest';
import { partirDescripcion } from '../src/pages/admin/atencion/descripcion';

describe('partirDescripcion (Atención · detalle de la solicitud)', () => {
    it('separa párrafo, subtítulo y datos «Etiqueta: valor»', () => {
        const texto = 'test\n\nDatos de la propuesta:\nParticipantes estimados: 20\nFecha propuesta: 2026-11-16';
        expect(partirDescripcion(texto)).toEqual([
            { tipo: 'parrafo', texto: 'test' },
            { tipo: 'subtitulo', texto: 'Datos de la propuesta' },
            { tipo: 'datos', pares: [['Participantes estimados', '20'], ['Fecha propuesta', '2026-11-16']] },
        ]);
    });

    it('deja como párrafo el texto libre, aunque tenga dos puntos en medio', () => {
        expect(partirDescripcion('Taller de lectura para niñas y niños de 8 a 12 años.\nHorario: por acordar con la biblioteca, de preferencia en la tarde: después de clases'))
            .toEqual([
                { tipo: 'parrafo', texto: 'Taller de lectura para niñas y niños de 8 a 12 años.' },
                { tipo: 'datos', pares: [['Horario', 'por acordar con la biblioteca, de preferencia en la tarde: después de clases']] },
            ]);
    });

    it('no rompe con un texto vacío', () => {
        expect(partirDescripcion('')).toEqual([]);
    });
});
