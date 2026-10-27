import { ErrorServicio, obtenerSupabase, pedirApi, recordarSesion } from './api';

export interface Domicilio {
    calle: string; numeroExterior: string; numeroInterior?: string; coloniaLocalidad: string;
    codigoPostal: string; municipio: string; estadoProvincia: string;
}
export interface SolicitudRegistro {
    nombres: string; primerApellido: string; segundoApellido?: string; fechaNacimiento: string;
    telefono: string; domicilio: Domicilio; correo: string; contrasena: string; aceptaAviso: true;
    tutor?: { nombres: string; apellidos: string; telefono: string; correo: string;
        domicilio: Domicilio; relacion: 'madre' | 'padre' | 'tutor' };
}
export interface AccesoCuenta {
    usuarioId: string;
    roles: { rolCodigo: string; capacidades: string[] }[];
    permisosAdicionales: { capacidad: string; ambito: string; actividadId: string | null }[];
}
const retorno = (flujo: 'confirmacion' | 'recuperacion') => `${window.location.origin}/auth/retorno?flujo=${flujo}`;
function falloAuth(error: { status?: number; code?: string } | null) {
    if (!error) return;
    if (error.code === 'over_email_send_rate_limit')
        throw new ErrorServicio('Se alcanzó el límite de correos del proyecto. Espera a que se restablezca antes de solicitar otro enlace.', 429);
    if (error.status === 429)
        throw new ErrorServicio('Espera unos minutos antes de solicitar otro enlace.', 429);
    if (error.code === 'weak_password' || error.code === 'same_password')
        throw new ErrorServicio('Usa una contraseña diferente, de entre 8 y 128 caracteres.', 422);
    throw new ErrorServicio('No se pudo completar la solicitud. Intenta más tarde.');
}

export async function crearCuenta(datos: SolicitudRegistro) {
    await pedirApi('/cuentas/registro', { method: 'POST', body: JSON.stringify(datos) });
}
export async function consultarMiAcceso(): Promise<AccesoCuenta> {
    const supabase = await obtenerSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para continuar.', 401);
    return pedirApi<AccesoCuenta>('/administracion/mi-acceso', {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
}
export async function pedirAdministracion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const { data } = await (await obtenerSupabase()).auth.getSession();
    if (!data.session) throw new ErrorServicio('Inicia sesión para continuar.', 401);
    return pedirApi<T>(`/administracion${ruta}`, { ...opciones,
        headers: { ...opciones.headers, Authorization: `Bearer ${data.session.access_token}` } });
}
export type ResultadoInicioSesion = 'ok' | 'credenciales-incorrectas' | 'cuenta-deshabilitada' | 'correo-pendiente';
export async function iniciarSesion(correo: string, contrasena: string, recordarme = false): Promise<ResultadoInicioSesion> {
    recordarSesion(recordarme);
    const supabase = await obtenerSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena });
    if (error?.code === 'email_not_confirmed') return 'correo-pendiente';
    if (error?.code === 'invalid_credentials') return 'credenciales-incorrectas';
    falloAuth(error);
    try { await consultarMiAcceso(); }
    catch (error) {
        await supabase.auth.signOut({ scope: 'local' });
        if (error instanceof ErrorServicio && error.estado === 403) return 'cuenta-deshabilitada';
        throw error;
    }
    return 'ok';
}
export async function cerrarSesion() {
    const { error } = await (await obtenerSupabase()).auth.signOut({ scope: 'local' });
    falloAuth(error);
    sessionStorage.removeItem('biblioteca-recuperacion');
}
export async function reenviarConfirmacion(correo: string) {
    const { error } = await (await obtenerSupabase()).auth.resend({ type: 'signup', email: correo.trim(),
        options: { emailRedirectTo: retorno('confirmacion') } });
    // Igual respuesta para cuentas existentes y no existentes.
    if (error?.code === 'user_not_found' || error?.code === 'email_not_confirmed') return;
    falloAuth(error);
}
export async function enviarEnlaceRecuperacion(correo: string) {
    const { error } = await (await obtenerSupabase()).auth.resetPasswordForEmail(correo.trim(), { redirectTo: retorno('recuperacion') });
    if (error?.code === 'user_not_found') return;
    falloAuth(error);
}

// Una sola ejecución por enlace: StrictMode puede montar el componente dos veces.
const retornos = new Map<string, Promise<'confirmacion' | 'recuperacion'>>();
export function procesarRetorno(enlace: string): Promise<'confirmacion' | 'recuperacion'> {
    const previa = retornos.get(enlace);
    if (previa) return previa;
    const resultado = (async () => {
        const url = new URL(enlace);
        const fragmento = new URLSearchParams(url.hash.slice(1));
        const flujo = url.searchParams.get('flujo') === 'recuperacion' || fragmento.get('type') === 'recovery'
            ? 'recuperacion' : 'confirmacion';
        // Retirar códigos y tokens del historial antes de dibujar o enviar otras solicitudes.
        window.history.replaceState(null, '', '/auth/retorno');
        if (url.searchParams.has('error') || fragmento.has('error')) throw new ErrorServicio('El enlace venció o ya se utilizó.', 401);
        const supabase = await obtenerSupabase();
        const codigo = url.searchParams.get('code');
        let error;
        if (codigo) ({ error } = await supabase.auth.exchangeCodeForSession(codigo));
        else if (fragmento.get('access_token') && fragmento.get('refresh_token'))
            ({ error } = await supabase.auth.setSession({ access_token: fragmento.get('access_token')!, refresh_token: fragmento.get('refresh_token')! }));
        else throw new ErrorServicio('Abre el enlace completo recibido en tu correo.', 401);
        if (error) throw new ErrorServicio('El enlace venció, ya se utilizó o se abrió en otro navegador.', 401);
        const verificacion = await supabase.auth.getUser();
        if (verificacion.error || !verificacion.data.user) throw new ErrorServicio('No pudimos verificar el enlace.', 401);
        if (flujo === 'recuperacion') sessionStorage.setItem('biblioteca-recuperacion', verificacion.data.user.id);
        else await cerrarSesion();
        return flujo;
    })();
    retornos.set(enlace, resultado);
    return resultado;
}
export async function puedeRestablecerContrasena() {
    const { data, error } = await (await obtenerSupabase()).auth.getUser();
    return !error && !!data.user && sessionStorage.getItem('biblioteca-recuperacion') === data.user.id;
}
export async function guardarNuevaContrasena(contrasena: string) {
    if (!(await puedeRestablecerContrasena())) throw new ErrorServicio('Solicita un nuevo enlace de recuperación.', 401);
    if (contrasena.length < 8 || contrasena.length > 128) throw new ErrorServicio('La contraseña debe tener entre 8 y 128 caracteres.', 422);
    const { error } = await (await obtenerSupabase()).auth.updateUser({ password: contrasena });
    falloAuth(error);
    await cerrarSesion();
}
