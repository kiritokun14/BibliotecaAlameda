import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { consultarInstagram, type NoticiasInstagram } from '../src/servicios/instagram';
import { ContenidoCultural, TarjetaCultural } from '../src/pages/publico/inicio/NoticiasCulturales';
import { marcarImagenFallida } from '../src/servicios/imagenesFallidas';

const datos: NoticiasInstagram = { desactualizado: false, publicaciones: [{ id: '1', caption: 'Festival cultural',
    thumbnail: 'https://imagenes.example/foto.jpg', url: 'https://www.instagram.com/p/abc/', type: 'image', taken_at: '2026-11-01T18:00:00Z' }] };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('consulta el backend sin enviar claves del proveedor', async () => {
    const peticion = vi.fn().mockResolvedValue(new Response(JSON.stringify(datos)));
    vi.stubGlobal('fetch', peticion);
    expect(await consultarInstagram()).toEqual(datos);
    expect(peticion.mock.calls[0][0]).toBe('/api/instagram/publicaciones');
    expect(peticion.mock.calls[0][1].headers).not.toHaveProperty('x-api-key');
    expect(peticion).toHaveBeenCalledTimes(1);
    await Promise.all([consultarInstagram(), consultarInstagram()]);
    expect(peticion).toHaveBeenCalledTimes(1);
    const reloj = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
    peticion.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    await expect(consultarInstagram()).rejects.toThrow();
    // Un fallo no queda guardado: una visita posterior puede volver a consultar.
    await Promise.all([consultarInstagram(), consultarInstagram()]);
    expect(peticion).toHaveBeenCalledTimes(3);
    reloj.mockRestore();
});
it('React presenta imagen, descripción, fecha y enlace seguro', () => {
    const html = renderToStaticMarkup(<ContenidoCultural datos={datos} error={false} />);
    expect(html).toContain('Festival cultural');
    expect(html).toContain('foto.jpg');
    expect(html).toContain('<time');
    expect(html).toContain('Ver publicación en Instagram');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('width="640" height="480"');
});
it('evita volver a cargar una imagen que ya falló en esta pestaña', () => {
    const thumbnail = 'https://imagenes.example/caducada.jpg';
    marcarImagenFallida(thumbnail);
    const html = renderToStaticMarkup(<TarjetaCultural publicacion={{ ...datos.publicaciones[0], thumbnail }} />);
    expect(html).toContain('Imagen no disponible');
    expect(html).not.toContain(thumbnail);
    expect(html).toContain('Ver publicación en Instagram');
});
it('presenta carga, error y ausencia de publicaciones', () => {
    expect(renderToStaticMarkup(<ContenidoCultural datos={null} error={false} />)).toContain('Cargando');
    expect(renderToStaticMarkup(<ContenidoCultural datos={null} error />)).toContain('role="alert"');
    expect(renderToStaticMarkup(<ContenidoCultural datos={{ publicaciones: [], desactualizado: false }} error={false} />)).toContain('Todavía no hay');
});
it('tolera nulos y fechas inválidas y avisa de datos guardados', () => {
    const html = renderToStaticMarkup(<ContenidoCultural error={false} datos={{ desactualizado: true,
        publicaciones: [{ ...datos.publicaciones[0], caption: '', thumbnail: null, url: null, taken_at: 'inválida' }] }} />);
    expect(html).toContain('Imagen no disponible');
    expect(html).toContain('últimas publicaciones guardadas');
    expect(html).not.toContain('<time');
    expect(html).not.toContain('<a ');
});
it('limita las tarjetas a seis y escapa el texto externo', () => {
    const html = renderToStaticMarkup(<ContenidoCultural error={false} datos={{ ...datos,
        publicaciones: Array.from({ length: 8 }, (_, i) => ({ ...datos.publicaciones[0], id: String(i), caption: '<script>externo</script>' })) }} />);
    expect(html.match(/<article/g)).toHaveLength(6);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
});
