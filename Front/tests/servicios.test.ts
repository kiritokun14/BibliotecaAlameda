import { describe, expect, it } from 'vitest';
import { buscarPublicado, servicios, soloPublicados, type Servicio } from '../src/pages/publico/servicios/datos';

const base: Omit<Servicio, 'id' | 'estado'> = { tipo: 'servicio', titulo: 'Ejemplo', descripcion: 'Ejemplo', icono: 'libro' };

describe('Servicios y programas: solo se muestra lo publicado (HU-01 · CA-01.2)', () => {
    const lista: Servicio[] = [
        { ...base, id: 'publicado', estado: 'publicado' },
        { ...base, id: 'borrador', estado: 'borrador' },
        { ...base, id: 'retirado', estado: 'retirado' },
    ];

    it('la lista pública no incluye borradores ni contenido retirado', () => {
        expect(soloPublicados(lista).map((s) => s.id)).toEqual(['publicado']);
    });

    it('un borrador no se puede abrir por su dirección directa', () => {
        expect(buscarPublicado(lista, 'borrador')).toBeNull();
        expect(buscarPublicado(lista, 'retirado')).toBeNull();
        expect(buscarPublicado(lista, 'no-existe')).toBeNull();
        expect(buscarPublicado(lista, undefined)).toBeNull();
    });

    it('un contenido publicado sí se puede abrir', () => {
        expect(buscarPublicado(lista, 'publicado')?.id).toBe('publicado');
    });

    it('los datos de ejemplo traen un borrador que queda oculto', () => {
        expect(servicios.some((s) => s.estado === 'borrador')).toBe(true);
        expect(soloPublicados(servicios).some((s) => s.estado !== 'publicado')).toBe(false);
        expect(buscarPublicado(servicios, 'prestamo-a-domicilio')).toBeNull();
    });
});
