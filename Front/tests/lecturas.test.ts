import { describe, expect, it } from 'vitest';
import {
    FILTROS_VACIOS,
    abrir,
    aniosDeMemoria,
    filtrarResenas,
    filtrosDesdeParametros,
    memoriaPorAnio,
    memorias,
    parametrosDesdeFiltros,
    porTema,
    resenas,
    visibles,
} from '../src/pages/lecturas/datos';

describe('Lecturas: solo se lista lo publicado y público', () => {
    it('las listas no incluyen lo que está en revisión ni lo privado', () => {
        const ids = visibles(resenas).map((r) => r.id);
        expect(ids).not.toContain('resena-en-revision');
        expect(ids).not.toContain('fondo-reservado');
        expect(ids).toHaveLength(6);
    });

    it('por dirección directa: privado → acceso restringido; en revisión o inexistente → no disponible', () => {
        expect(abrir(resenas, 'fondo-reservado').tipo).toBe('privado');
        expect(abrir(resenas, 'resena-en-revision').tipo).toBe('no-disponible');
        expect(abrir(resenas, 'no-existe').tipo).toBe('no-disponible');
        expect(abrir(resenas, undefined).tipo).toBe('no-disponible');
        expect(abrir(resenas, 'pedro-paramo').tipo).toBe('ok');
    });
});

describe('Búsqueda y filtros de reseñas', () => {
    const ids = (f = FILTROS_VACIOS) => filtrarResenas(resenas, f).map((r) => r.id);

    it('busca por autor sin importar acentos ni mayúsculas', () => {
        expect(ids({ ...FILTROS_VACIOS, q: 'RULFO' }).sort()).toEqual(['el-llano-en-llamas', 'pedro-paramo']);
        expect(ids({ ...FILTROS_VACIOS, q: 'cortazar' })).toEqual(['rayuela']);
    });

    it('filtra por género', () => {
        expect(ids({ ...FILTROS_VACIOS, genero: 'poesia' })).toEqual(['piedra-de-sol']);
    });

    it('ordena por fecha o por título', () => {
        expect(ids()[0]).toBe('pedro-paramo'); // la más reciente
        expect(ids({ ...FILTROS_VACIOS, orden: 'antiguas' })[0]).toBe('piedra-de-sol');
        expect(ids({ ...FILTROS_VACIOS, orden: 'titulo' })[0]).toBe('aura');
    });

    it('la URL guarda solo lo que no es por defecto y descarta valores inventados', () => {
        const f = { q: 'rulfo', genero: 'novela', orden: 'titulo' } as const;
        expect(parametrosDesdeFiltros(f).toString()).toBe('q=rulfo&genero=novela&orden=titulo');
        expect(filtrosDesdeParametros(parametrosDesdeFiltros(f))).toEqual(f);
        expect(parametrosDesdeFiltros(FILTROS_VACIOS).toString()).toBe('');
        expect(filtrosDesdeParametros(new URLSearchParams('genero=terror&orden=x'))).toEqual(FILTROS_VACIOS);
    });
});

describe('Por tema y memoria pública', () => {
    it('un tema mezcla reseñas y memoria de ese tema', () => {
        const items = porTema('novela');
        expect(items.some((x) => x.tipo === 'resena')).toBe(true);
        expect(items.some((x) => x.tipo === 'memoria')).toBe(true);
        expect(items.every((x) => (x.tipo === 'resena' ? x.item.genero === 'novela' : x.item.temas.includes('novela')))).toBe(true);
    });

    it('los años salen de los registros, del más reciente al más antiguo', () => {
        expect(aniosDeMemoria()).toEqual([2025, 2024, 2023]);
        expect(memoriaPorAnio(2024).map((m) => m.anio)).toEqual([2024, 2024]);
        expect(memoriaPorAnio(null)).toHaveLength(visibles(memorias).length);
    });
});
