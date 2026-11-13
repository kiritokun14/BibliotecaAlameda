import { afterEach, describe, expect, it, vi } from 'vitest';
import { urlCatalogo } from '../src/servicios/catalogo';

describe('Dirección del catálogo Koha', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('usa la dirección configurada', () => {
        vi.stubEnv('VITE_KOHA_URL', ' https://catalogo.ejemplo.org ');
        expect(urlCatalogo()).toBe('https://catalogo.ejemplo.org/');
    });
    it('sin dirección, el catálogo se presenta como no disponible', () => {
        vi.stubEnv('VITE_KOHA_URL', '');
        expect(urlCatalogo()).toBeNull();
    });
    it('rechaza direcciones mal escritas o que no son web', () => {
        vi.stubEnv('VITE_KOHA_URL', 'catalogo sin protocolo');
        expect(urlCatalogo()).toBeNull();
        vi.stubEnv('VITE_KOHA_URL', 'javascript:alert(1)');
        expect(urlCatalogo()).toBeNull();
    });
});
