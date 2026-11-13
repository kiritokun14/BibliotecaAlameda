import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => cliente }));
import { cargarImagenPrivada, guardarImagen, validarArchivoImagen } from '../src/servicios/imagenes';
import { invalidarConsultas } from '../src/servicios/consultas';

const peticiones = vi.fn();
beforeEach(() => {
    invalidarConsultas(); vi.clearAllMocks();
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-imagen' } } });
    peticiones.mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith('/configuracion')
        ? { url: 'https://ejemplo.supabase.co', clavePublicable: 'sb_publishable_prueba' } : { folio: 'CN-0001', tieneImagen: true }), { status: 200 }));
    vi.stubGlobal('fetch', peticiones);
});
afterEach(() => vi.unstubAllGlobals());
it('valida formato y tamaño antes de enviar archivos', () => {
    expect(validarArchivoImagen({ type: 'image/svg+xml', size: 100 })).toBeTruthy();
    expect(validarArchivoImagen({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toBeTruthy();
    expect(validarArchivoImagen({ type: 'image/jpeg', size: 100 })).toBeNull();
});
it('envía binario con sesión, no una dirección local del navegador', async () => {
    const archivo = new File(['datos de imagen'], 'foto.png', { type: 'image/png' });
    await guardarImagen('CN-0001', archivo);
    const [, opciones] = peticiones.mock.calls.find(([url]) => url.endsWith('/imagen'))!;
    expect(opciones.method).toBe('PUT'); expect(opciones.body).toBe(archivo);
    expect(opciones.headers.Authorization).toBe('Bearer token-imagen');
    expect(opciones.headers['Content-Type']).toBe('image/png');
});
it('quitar imagen usa DELETE sin enviar un archivo ficticio', async () => {
    await guardarImagen('CN-0001', null);
    const [, opciones] = peticiones.mock.calls.find(([url]) => url.endsWith('/imagen'))!;
    expect(opciones.method).toBe('DELETE'); expect(opciones.body).toBeUndefined();
});
it('no descarga un borrador sin sesión', async () => {
    cliente.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(cargarImagenPrivada('CN-0001')).rejects.toMatchObject({ estado: 401 });
    expect(peticiones.mock.calls.some(([url]) => url.endsWith('/imagen'))).toBe(false);
});
it('si falla la carga no informa que la imagen se guardó', async () => {
    peticiones.mockResolvedValue(new Response(JSON.stringify({ detail: 'El contenido cambió' }), { status: 409 }));
    await expect(guardarImagen('CN-0001', new File(['dato'], 'foto.png', { type: 'image/png' }))).rejects.toMatchObject({ estado: 409 });
});
