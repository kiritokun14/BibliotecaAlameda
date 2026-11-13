import { describe, expect, it } from 'vitest';
import { noticias as noticiasInicio } from '../src/pages/publico/inicio/datos';
import { buscarPublicada, noticias } from '../src/pages/publico/noticias/datos';

describe('Inicio: carrusel de noticias', () => {
    it('muestra 4 noticias y cada una abre una noticia publicada en /noticias/:id', () => {
        expect(noticiasInicio).toHaveLength(4);
        for (const noticia of noticiasInicio) expect(buscarPublicada(noticias, noticia.id)?.titulo).toBe(noticia.titulo);
    });
});
