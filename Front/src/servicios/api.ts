import { invalidarConsultas, olvidarMemoria } from './consultas';
import type { SupabaseClient } from '@supabase/supabase-js';

export class ErrorServicio extends Error {
    estado: number;
    constructor(mensaje: string, estado = 0) { super(mensaje); this.estado = estado; }
}

// Lecturas iguales en curso (misma ruta y misma sesión) se juntan en una sola petición.
// El navegador retiene dos GET idénticos simultáneos hasta que termina el primero, así que cada copia
// duplicaba la espera (React monta dos veces en desarrollo y varias piezas piden lo mismo a la vez).
const enCurso = new Map<string, Promise<unknown>>();

export function pedirApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const metodo = (opciones.method ?? 'GET').toUpperCase();
    if (metodo !== 'GET') { olvidarMemoria(); return pedirApiDirecto<T>(ruta, opciones); } // un cambio deja vieja la memoria de listas
    if (opciones.signal) return pedirApiDirecto<T>(ruta, opciones);
    const sesion = new Headers(opciones.headers).get('Authorization') ?? '';
    const clave = ruta + '|' + sesion;
    let promesa = enCurso.get(clave);
    if (!promesa) {
        promesa = pedirApiDirecto<unknown>(ruta, opciones).finally(() => enCurso.delete(clave));
        enCurso.set(clave, promesa);
    }
    // Cada quien recibe su propia copia, para que nadie modifique los datos de otro
    return promesa.then((datos) => (datos === null || typeof datos !== 'object' ? datos : structuredClone(datos)) as T);
}

async function pedirApiDirecto<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    let respuesta: Response;
    try {
        respuesta = await fetch(`/api${ruta}`, { ...opciones, signal: AbortSignal.timeout(20000),
            headers: { 'Content-Type': 'application/json', ...opciones.headers } });
    } catch { throw new ErrorServicio('No pudimos conectar con el servidor. Comprueba que el backend esté encendido.'); }
    const datos = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
        if (respuesta.status === 401 || respuesta.status === 403) invalidarConsultas();
        const mensaje = typeof datos?.detail === 'string' ? datos.detail
            : respuesta.status === 422 ? 'Revisa los campos y los requisitos del formulario.' : 'No fue posible completar la operación. Intenta más tarde.';
        throw new ErrorServicio(mensaje, respuesta.status);
    }
    return datos as T;
}

export function mensajeError(error: unknown): string {
    return error instanceof ErrorServicio ? error.message : 'No fue posible completar la operación. Intenta más tarde.';
}

const almacenamiento = {
    getItem: (clave: string) => localStorage.getItem(clave) ?? sessionStorage.getItem(clave),
    setItem: (clave: string, valor: string) => {
        // El verificador PKCE debe sobrevivir a abrir el correo en otra pestaña del mismo navegador.
        const persistente = clave.includes('code-verifier') || localStorage.getItem('biblioteca-recordarme') === 'si';
        const destino = persistente ? localStorage : sessionStorage;
        const otro = persistente ? sessionStorage : localStorage;
        destino.setItem(clave, valor); otro.removeItem(clave);
    },
    removeItem: (clave: string) => { localStorage.removeItem(clave); sessionStorage.removeItem(clave); },
};
let cliente: Promise<SupabaseClient> | undefined;
export function obtenerSupabase(): Promise<SupabaseClient> {
    // La librería de Supabase (unos 200 KB) se descarga aquí, en paralelo con la configuración,
    // y no en el paquete principal: la página se pinta sin esperarla.
    cliente ??= Promise.all([
        pedirApi<{ url: string; clavePublicable: string }>('/cuentas/configuracion'),
        import('@supabase/supabase-js'),
    ]).then(([{ url, clavePublicable }, { createClient }]) => createClient(url, clavePublicable, { auth: {
            flowType: 'pkce', detectSessionInUrl: false, persistSession: true,
            autoRefreshToken: true, storage: almacenamiento,
        } })).catch(error => { cliente = undefined; throw error; });
    return cliente;
}
export function recordarSesion(recordar: boolean) { localStorage.setItem('biblioteca-recordarme', recordar ? 'si' : 'no'); }
