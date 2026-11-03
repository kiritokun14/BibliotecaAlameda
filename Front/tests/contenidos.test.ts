import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => mocks }));
import { guardar, guardarBorrador, enviarAAutorizacion, listarContenidos, obtenerContenido } from '../src/servicios/contenidos';
const peticiones = vi.fn();
beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.getSession.mockResolvedValue({data:{session:{access_token:'token-editor'}}});
    peticiones.mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith('/configuracion')
        ? {url:'https://ejemplo.supabase.co',clavePublicable:'sb_publishable_prueba'} : {folio:'CN-0001',estado:'borrador'}), {status:200}));
    vi.stubGlobal('fetch',peticiones);
});
it('crea un borrador y usa el token del editor sin claves de servicio', async () => {
    await guardar(null,'noticia',{titulo:'Prueba'});
    const llamada=peticiones.mock.calls.find(([url])=>url==='/api/contenidos/editor')!;
    expect(llamada[1].method).toBe('POST');
    expect(llamada[1].headers.Authorization).toBe('Bearer token-editor');
    expect(JSON.parse(llamada[1].body)).toEqual({tipo:'noticia',titulo:'Prueba'});
});
it('guardar con folio actualiza en vez de duplicar el borrador', async () => {
    await guardar('CN-0001','memoria',{cuerpo:'Prueba'});
    expect(peticiones.mock.calls.find(([url])=>url==='/api/contenidos/editor/CN-0001')![1].method).toBe('PUT');
});
it('envío solicita revisión y no manda un estado publicado', async () => {
    await enviarAAutorizacion('CN-0001',' Revisar ');
    const llamada=peticiones.mock.calls.find(([url])=>url.endsWith('/enviar'))!;
    expect(JSON.parse(llamada[1].body)).toEqual({nota:'Revisar'});
});
it('sin sesión no consulta contenidos privados', async () => {
    mocks.auth.getSession.mockResolvedValue({data:{session:null}});
    await expect(obtenerContenido('CN-0001')).rejects.toMatchObject({estado:401});
    expect(peticiones.mock.calls.some(([url])=>url.includes('/contenidos/editor'))).toBe(false);
});
it('conserva filtros y paginación del contrato de la API', async () => {
    await listarContenidos({estado:'en_revision',busqueda:'texto',limite:10,desplazamiento:20});
    expect(peticiones.mock.calls.some(([url])=>url==='/api/contenidos/editor?estado=en_revision&busqueda=texto&limite=10&desplazamiento=20')).toBe(true);
});
it('no trata errores de permiso o contenido bloqueado como guardado exitoso', async () => {
    for (const estado of [403,409]) {
        peticiones.mockResolvedValue(new Response(JSON.stringify({detail:'No disponible'}),{status:estado}));
        await expect(guardarBorrador('CN-0001',{titulo:'Cambio'})).rejects.toMatchObject({estado});
    }
});
