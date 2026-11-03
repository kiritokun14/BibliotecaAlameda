import { usePublicados } from '../../../servicios/usarPublicados.ts';
import type { ContenidoPublico } from '../../../servicios/publicacion';
import { GENEROS, type Genero, type Resena, type Memoria } from './datos';

const genero = (valor: unknown): Genero => {
    const clave = String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll(' ', '-');
    return clave in GENEROS ? clave as Genero : 'historia-regional';
};
export function resenaPublicada(c: ContenidoPublico): Resena {
    return { id: c.folio, imagen: c.imagenUrl ?? undefined, libro: c.titulo, autoria: String(c.datos.autoria ?? ''), genero: genero(c.datos.genero),
        anio: Number(c.datos.anio) || new Date(c.publicadoEn).getFullYear(), color: 'verde', titulo: c.titulo,
        publicada: c.publicadoEn.slice(0,10), entrada: c.resumen, cuerpo: [{ tipo: 'parrafo', texto: c.cuerpo }], estado: 'publicado' };
}
export function memoriaPublicada(c: ContenidoPublico): Memoria {
    return { id: c.folio, titulo: c.titulo, anio: Number(String(c.datos.periodo ?? '').match(/\d{4}/)?.[0]) || new Date(c.publicadoEn).getFullYear(),
        imagen: c.imagenUrl ?? '', temas: [genero(c.datos.tema)], entrada: c.resumen, cuerpo: [c.cuerpo], estado: 'publicado' };
}
export function useLecturasPublicadas() {
    const resultado = usePublicados();
    return { ...resultado, resenas: (resultado.datos ?? []).filter(c => c.tipo === 'resena').map(resenaPublicada),
        memorias: (resultado.datos ?? []).filter(c => c.tipo === 'memoria').map(memoriaPublicada) };
}
