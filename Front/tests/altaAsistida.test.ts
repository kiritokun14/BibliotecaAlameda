import { beforeEach, describe, expect, it, vi } from 'vitest';

const simulado = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => simulado }));
import { prepararAlta, puedeHacerAltaAsistida, resolverDuplicado, tieneCapacidad } from '../src/servicios/altaAsistida';

const peticiones = vi.fn();
const responder = (datos: unknown, estado = 200) => new Response(JSON.stringify(datos), { status: estado, headers: { 'Content-Type': 'application/json' } });
const acceso = (permisos: string[]) => ({ usuarioId: 'personal', roles: [{ rolCodigo: 'usuario', capacidades: [] }],
    permisosAdicionales: permisos.map(capacidad => ({ capacidad, ambito: 'global', actividadId: null })) });

beforeEach(() => {
    vi.clearAllMocks();
    simulado.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-personal' } }, error: null });
    peticiones.mockImplementation(async (url: string) => url.endsWith('/configuracion')
        ? responder({ url: 'https://proyecto.supabase.co', clavePublicable: 'sb_publishable_prueba' })
        : url.endsWith('/mi-acceso') ? responder(acceso(['alta_asistida']))
        : responder({ id: 'solicitud', correo: 'ana@ejemplo.mx', estado: 'lista', candidatos: [], invitacionEnviada: true }, 201));
    vi.stubGlobal('fetch', peticiones);
});

describe('Alta asistida (T-033)', () => {
    it('solo muestra la pantalla a quien tiene la capacidad alta_asistida', async () => {
        expect(await puedeHacerAltaAsistida()).toBe(true);
        expect(tieneCapacidad(acceso([]), 'alta_asistida')).toBe(false);
        expect(tieneCapacidad({ ...acceso([]), roles: [{ rolCodigo: 'x', capacidades: ['alta_asistida'] }] }, 'alta_asistida')).toBe(true);
    });
    it('envía los datos con la sesión del personal y sin contraseña', async () => {
        const datos = { nombres: 'Ana', primerApellido: 'Pérez', fechaNacimiento: '1990-01-01', telefono: '3110000000',
            correo: 'ana@ejemplo.mx', aceptaAviso: true as const, motivo: 'Apoyo en mostrador',
            domicilio: { calle: 'A', numeroExterior: '1', coloniaLocalidad: 'Centro', codigoPostal: '63000', municipio: 'Tepic', estadoProvincia: 'Nayarit' } };
        const resultado = await prepararAlta(datos);
        expect(resultado.invitacionEnviada).toBe(true);
        const [ruta, opciones] = peticiones.mock.calls.find(([r]) => r === '/api/cuentas/alta-asistida')!;
        expect(ruta).toBe('/api/cuentas/alta-asistida');
        expect(opciones.headers.Authorization).toBe('Bearer token-personal');
        expect(JSON.parse(opciones.body)).toEqual(datos);
        expect(opciones.body).not.toContain('contrasena');
    });
    it('resuelve un posible duplicado con decisión y motivo', async () => {
        await resolverDuplicado('solicitud', 'persona_distinta', 'Se verificó');
        const [ruta, opciones] = peticiones.mock.calls.find(([r]) => r.includes('/resolver'))!;
        expect(ruta).toBe('/api/cuentas/alta-asistida/solicitud/resolver');
        expect(JSON.parse(opciones.body)).toEqual({ decision: 'persona_distinta', motivo: 'Se verificó' });
    });
    it('sin sesión pide iniciar sesión y no llama al backend de alta', async () => {
        simulado.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
        await expect(prepararAlta({} as never)).rejects.toMatchObject({ estado: 401 });
        expect(peticiones.mock.calls.some(([r]) => r.startsWith('/api/cuentas/alta-asistida'))).toBe(false);
    });
});
