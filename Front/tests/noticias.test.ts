import { describe, expect, it } from 'vitest';
import {
    buscarPublicada,
    esFechaValida,
    fechaCorta,
    fechaLarga,
    filtrarNoticias,
    noticias,
    otrasNoticias,
    paginar,
    paginasVisibles,
    soloPublicadas,
    type Noticia,
} from '../src/pages/publico/noticias/datos';

const base: Omit<Noticia, 'id' | 'estado' | 'categoria' | 'fecha' | 'titulo'> = {
    minutosLectura: 1,
    resumen: 'Resumen',
    imagen: '',
    introduccion: 'Introducción',
    bloques: [],
    reacciones: { meGusta: 0, meSirvio: 0, compartir: 0 },
};

const lista: Noticia[] = [
    { ...base, id: 'a', estado: 'publicada', categoria: 'avisos', fecha: '2026-11-05', titulo: 'Horario especial' },
    { ...base, id: 'b', estado: 'publicada', categoria: 'actividades', fecha: '2026-11-12', titulo: 'Círculo de lectura' },
    { ...base, id: 'c', estado: 'publicada', categoria: 'actividades', fecha: '2026-10-01', titulo: 'Taller de encuadernación' },
    { ...base, id: 'borrador', estado: 'borrador', categoria: 'avisos', fecha: '2026-11-20', titulo: 'Borrador' },
    { ...base, id: 'retirada', estado: 'retirada', categoria: 'avisos', fecha: '2026-11-21', titulo: 'Retirada' },
];

describe('Noticias: solo se muestra lo publicado', () => {
    it('la lista pública no incluye borradores ni retiradas', () => {
        expect(soloPublicadas(lista).map((n) => n.id)).toEqual(['a', 'b', 'c']);
    });

    it('un borrador o una noticia retirada no se abren por su dirección', () => {
        expect(buscarPublicada(lista, 'borrador')).toBeNull();
        expect(buscarPublicada(lista, 'retirada')).toBeNull();
        expect(buscarPublicada(lista, 'no-existe')).toBeNull();
        expect(buscarPublicada(lista, 'b')?.id).toBe('b');
    });

    it('los datos de ejemplo traen un borrador que queda oculto', () => {
        expect(noticias.some((n) => n.estado === 'borrador')).toBe(true);
        expect(buscarPublicada(noticias, 'programa-de-verano')).toBeNull();
    });
});

describe('Noticias: búsqueda, filtros y orden', () => {
    it('por omisión salen de la más reciente a la más antigua', () => {
        expect(filtrarNoticias(lista, {}).map((n) => n.id)).toEqual(['b', 'a', 'c']);
        expect(filtrarNoticias(lista, { orden: 'antiguas' }).map((n) => n.id)).toEqual(['c', 'a', 'b']);
    });

    it('filtra por categoría y por fecha exacta', () => {
        expect(filtrarNoticias(lista, { categoria: 'actividades' }).map((n) => n.id)).toEqual(['b', 'c']);
        expect(filtrarNoticias(lista, { fecha: '2026-11-05' }).map((n) => n.id)).toEqual(['a']);
        expect(filtrarNoticias(lista, { categoria: 'comunidad' })).toEqual([]);
    });

    it('la búsqueda no distingue acentos ni mayúsculas', () => {
        expect(filtrarNoticias(lista, { texto: 'circulo' }).map((n) => n.id)).toEqual(['b']);
        expect(filtrarNoticias(lista, { texto: '  TALLER ' }).map((n) => n.id)).toEqual(['c']);
    });

    it('otras noticias no repiten la actual', () => {
        expect(otrasNoticias(lista, 'b').map((n) => n.id)).toEqual(['a', 'c']);
    });
});

describe('Noticias: paginación y fechas', () => {
    it('reparte en páginas y corrige páginas fuera de rango', () => {
        const numeros = Array.from({ length: 20 }, (_, i) => i + 1);
        expect(paginar(numeros, 1, 9)).toEqual({ elementos: [1, 2, 3, 4, 5, 6, 7, 8, 9], pagina: 1, totalPaginas: 3 });
        expect(paginar(numeros, 3, 9).elementos).toEqual([19, 20]);
        expect(paginar(numeros, 99, 9).pagina).toBe(3);
        expect(paginar([], 1, 9)).toEqual({ elementos: [], pagina: 1, totalPaginas: 1 });
    });

    it('muestra «…» cuando hay muchas páginas', () => {
        expect(paginasVisibles(1, 3)).toEqual([1, 2, 3]);
        expect(paginasVisibles(1, 8)).toEqual([1, 2, '…', 8]);
        expect(paginasVisibles(5, 8)).toEqual([1, '…', 4, 5, 6, '…', 8]);
    });

    it('escribe las fechas como en el diseño', () => {
        expect(fechaLarga('2026-11-05')).toBe('5 de noviembre de 2026');
        expect(fechaCorta('2026-11-05')).toBe('05/11/2026');
    });

    it('solo acepta fechas reales en la dirección', () => {
        expect(esFechaValida('2026-11-05')).toBe(true);
        expect(esFechaValida('2026-02-30')).toBe(false);
        expect(esFechaValida('05/11/2026')).toBe(false);
        expect(esFechaValida(null)).toBe(false);
    });
});
