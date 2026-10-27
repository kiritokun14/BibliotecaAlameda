import { beforeEach, describe, expect, it, vi } from 'vitest';

const simulado = vi.hoisted(() => ({ auth: {
    signInWithPassword: vi.fn(), getSession: vi.fn(), getUser: vi.fn(), signOut: vi.fn(),
    resend: vi.fn(), resetPasswordForEmail: vi.fn(), exchangeCodeForSession: vi.fn(),
    setSession: vi.fn(), updateUser: vi.fn(),
} }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => simulado }));
import { crearCuenta, iniciarSesion, procesarRetorno, guardarNuevaContrasena,
    reenviarConfirmacion, enviarEnlaceRecuperacion } from '../src/servicios/auth';

class Almacen {
    datos = new Map<string, string>();
    getItem(clave: string) { return this.datos.get(clave) ?? null; }
    setItem(clave: string, valor: string) { this.datos.set(clave, valor); }
    removeItem(clave: string) { this.datos.delete(clave); }
}
const peticiones = vi.fn();
const responder = (datos: unknown, estado = 200) => new Response(JSON.stringify(datos), { status: estado, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', new Almacen());
    vi.stubGlobal('sessionStorage', new Almacen());
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' }, history: { replaceState: vi.fn() } });
    peticiones.mockImplementation(async (url: string) => url.endsWith('/configuracion')
        ? responder({ url: 'https://proyecto.supabase.co', clavePublicable: 'sb_publishable_prueba' })
        : responder({ usuarioId: 'persona', roles: [{ rolCodigo: 'usuario' }], permisosAdicionales: [] }));
    vi.stubGlobal('fetch', peticiones);
    simulado.auth.signInWithPassword.mockResolvedValue({ error: null });
    simulado.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-simulado', refresh_token: 'renovacion-simulada' } }, error: null });
    simulado.auth.getUser.mockResolvedValue({ data: { user: { id: 'persona' } }, error: null });
    simulado.auth.signOut.mockResolvedValue({ error: null });
    simulado.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    simulado.auth.setSession.mockResolvedValue({ error: null });
    simulado.auth.updateUser.mockResolvedValue({ error: null });
});

describe('Integración de pantallas con servicios reales (transporte simulado)', () => {
    it('envía todos los datos al registro sin convertir la confirmación de contraseña en metadata', async () => {
        const solicitud = { nombres: 'Prueba', primerApellido: 'Integración', fechaNacimiento: '2000-01-01', telefono: '3110000000',
            correo: 'prueba@example.invalid', contrasena: 'Prueba-segura-123', aceptaAviso: true as const,
            domicilio: { calle: 'Prueba', numeroExterior: '1', coloniaLocalidad: 'Prueba', codigoPostal: '63000', municipio: 'Tepic', estadoProvincia: 'Nayarit' } };
        await crearCuenta(solicitud);
        const llamada = peticiones.mock.calls.find(([ruta]) => ruta === '/api/cuentas/registro')!;
        expect(JSON.parse(llamada[1].body)).toEqual(solicitud);
        expect(sessionStorage.getItem('contrasena')).toBeNull();
    });
    it('solo considera iniciada la sesión después de validar permisos en FastAPI', async () => {
        expect(await iniciarSesion('prueba@example.invalid', 'Contraseña-de-prueba')).toBe('ok');
        const llamada = peticiones.mock.calls.find(([ruta]) => ruta === '/api/administracion/mi-acceso')!;
        expect(llamada[1].headers.Authorization).toBe('Bearer token-simulado');
        expect(localStorage.getItem('biblioteca-recordarme')).toBe('no');
    });
    it('rechaza la cuenta desactivada y cierra la sesión que Auth había concedido', async () => {
        peticiones.mockImplementation(async (url: string) => url.endsWith('/configuracion')
            ? responder({ url: 'https://proyecto.supabase.co', clavePublicable: 'sb_publishable_prueba' }) : responder({ detail: 'Sin permiso' }, 403));
        expect(await iniciarSesion('prueba@example.invalid', 'Contraseña-de-prueba')).toBe('cuenta-deshabilitada');
        expect(simulado.auth.signOut).toHaveBeenCalled();
    });
    it('no muestra éxito con credenciales incorrectas ni consulta datos privados', async () => {
        simulado.auth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } });
        expect(await iniciarSesion('prueba@example.invalid', 'Contraseña-de-prueba')).toBe('credenciales-incorrectas');
        expect(peticiones.mock.calls.some(([ruta]) => ruta.endsWith('/mi-acceso'))).toBe(false);
    });
    it('distingue correo pendiente sin fingir un inicio de sesión', async () => {
        simulado.auth.signInWithPassword.mockResolvedValue({ error: { code: 'email_not_confirmed' } });
        expect(await iniciarSesion('prueba@example.invalid', 'Contraseña-de-prueba')).toBe('correo-pendiente');
    });
    it('no permite cambiar contraseña entrando directamente a la ruta', async () => {
        await expect(guardarNuevaContrasena('Nueva-contraseña-123')).rejects.toMatchObject({ estado: 401 });
        expect(simulado.auth.updateUser).not.toHaveBeenCalled();
    });
    it('consume el enlace una vez aunque React monte dos veces y retira el código del historial', async () => {
        const enlace = 'http://localhost:5173/auth/retorno?flujo=recuperacion&code=codigo-prueba';
        expect(await Promise.all([procesarRetorno(enlace), procesarRetorno(enlace)])).toEqual(['recuperacion', 'recuperacion']);
        expect(simulado.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
        expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/auth/retorno');
        expect(sessionStorage.getItem('biblioteca-recuperacion')).toBe('persona');
        await guardarNuevaContrasena('Nueva-contraseña-123');
        const llamada = peticiones.mock.calls.find(([ruta]) => ruta === '/api/auth/restablecer')!;
        expect(JSON.parse(llamada[1].body)).toEqual({ access_token: 'token-simulado', refresh_token: 'renovacion-simulada', nueva_password: 'Nueva-contraseña-123' });
        expect(simulado.auth.updateUser).not.toHaveBeenCalled();
        expect(sessionStorage.getItem('biblioteca-recuperacion')).toBeNull();
    });
    it('un enlace inválido nunca habilita recuperar la contraseña', async () => {
        await expect(procesarRetorno('http://localhost:5173/auth/retorno?flujo=recuperacion&error=access_denied')).rejects.toMatchObject({ estado: 401 });
        expect(sessionStorage.getItem('biblioteca-recuperacion')).toBeNull();
        expect(simulado.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    });
    it('la confirmación de correo no deja una sesión iniciada automáticamente', async () => {
        expect(await procesarRetorno('http://localhost:5173/auth/retorno?code=confirmacion-prueba')).toBe('confirmacion');
        expect(simulado.auth.signOut).toHaveBeenCalled();
        expect(sessionStorage.getItem('biblioteca-recuperacion')).toBeNull();
    });
    it('el límite de envíos se muestra como error y no como correo reenviado', async () => {
        simulado.auth.resend.mockResolvedValue({ error: { status: 429 } });
        await expect(reenviarConfirmacion('prueba@example.invalid')).rejects.toMatchObject({ estado: 429 });
    });
    it('solicita recuperación con la URL real del frontend sin revelar cuentas inexistentes', async () => {
        await expect(enviarEnlaceRecuperacion('prueba@example.invalid')).resolves.toBeUndefined();
        const llamada = peticiones.mock.calls.find(([ruta]) => ruta === '/api/auth/recuperar')!;
        expect(JSON.parse(llamada[1].body)).toEqual({ correo: 'prueba@example.invalid' });
        expect(simulado.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
    it('un backend inaccesible no se interpreta como registro exitoso', async () => {
        peticiones.mockRejectedValue(new TypeError('fallo de red'));
        await expect(crearCuenta({} as never)).rejects.toMatchObject({ estado: 0 });
    });
});

it('no presenta como enviada una recuperación limitada o fallida', async () => {
    for (const estado of [429, 503]) {
        peticiones.mockResolvedValue(responder({ detail: 'Intenta más tarde.' }, estado));
        await expect(enviarEnlaceRecuperacion('prueba@example.invalid')).rejects.toMatchObject({ estado });
    }
});
it('no borra el contexto de recuperación si el backend rechaza el cambio', async () => {
    sessionStorage.setItem('biblioteca-recuperacion', 'persona');
    peticiones.mockResolvedValue(responder({ detail: 'Sesión inválida.' }, 401));
    await expect(guardarNuevaContrasena('Nueva-contraseña-123')).rejects.toMatchObject({ estado: 401 });
    expect(simulado.auth.signOut).not.toHaveBeenCalled();
});
