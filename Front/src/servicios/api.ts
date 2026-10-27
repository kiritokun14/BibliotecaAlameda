import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class ErrorServicio extends Error {
    estado: number;
    constructor(mensaje: string, estado = 0) { super(mensaje); this.estado = estado; }
}

export async function pedirApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    let respuesta: Response;
    try {
        respuesta = await fetch(`/api${ruta}`, { ...opciones, signal: AbortSignal.timeout(20000),
            headers: { 'Content-Type': 'application/json', ...opciones.headers } });
    } catch { throw new ErrorServicio('No pudimos conectar con el servidor. Comprueba que el backend esté encendido.'); }
    const datos = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
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
    cliente ??= pedirApi<{ url: string; clavePublicable: string }>('/cuentas/configuracion')
        .then(({ url, clavePublicable }) => createClient(url, clavePublicable, { auth: {
            flowType: 'pkce', detectSessionInUrl: false, persistSession: true,
            autoRefreshToken: true, storage: almacenamiento,
        } })).catch(error => { cliente = undefined; throw error; });
    return cliente;
}
export function recordarSesion(recordar: boolean) { localStorage.setItem('biblioteca-recordarme', recordar ? 'si' : 'no'); }
