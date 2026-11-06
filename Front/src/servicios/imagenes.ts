import { ErrorServicio, obtenerSupabase } from './api';
import { consultasEditor, invalidarConsultas } from './consultas';
import type { Contenido } from './contenidos';

export function validarArchivoImagen(archivo: Pick<File, 'size' | 'type'>): string | null {
    if (!['image/jpeg', 'image/png'].includes(archivo.type)) return 'Selecciona una imagen JPG o PNG.';
    if (!archivo.size || archivo.size > 5 * 1024 * 1024) return 'La imagen debe pesar como máximo 5 MB.';
    return null;
}
async function tokenSesion() {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para acceder a la imagen.', 401);
    return data.session.access_token;
}
async function comprobar(respuesta: Response) {
    if (respuesta.ok) return;
    if ([401, 403].includes(respuesta.status)) invalidarConsultas();
    const datos = await respuesta.json().catch(() => null);
    throw new ErrorServicio(typeof datos?.detail === 'string' ? datos.detail : 'No se pudo guardar o cargar la imagen.', respuesta.status);
}
export async function guardarImagen(folio: string, archivo: File | null): Promise<Contenido> {
    const error = archivo && validarArchivoImagen(archivo);
    if (error) throw new ErrorServicio(error, 422);
    const token = await tokenSesion();
    consultasEditor.limpiar();
    try {
        let respuesta: Response;
        try {
            respuesta = await fetch(`/api/contenidos/editor/${encodeURIComponent(folio)}/imagen`, {
                method: archivo ? 'PUT' : 'DELETE', signal: AbortSignal.timeout(30000),
                headers: { Authorization: `Bearer ${token}`, ...(archivo ? { 'Content-Type': archivo.type } : {}) },
                ...(archivo ? { body: archivo } : {}),
            });
        } catch { throw new ErrorServicio('No se pudo conectar para guardar la imagen. El texto puede estar guardado; vuelve a intentarlo.'); }
        await comprobar(respuesta);
        return await respuesta.json();
    } finally { consultasEditor.limpiar(); }
}
export async function cargarImagenPrivada(folio: string, revision = false): Promise<Blob> {
    const token = await tokenSesion();
    const ruta = `/api/contenidos/${revision ? 'revision' : 'editor'}/${encodeURIComponent(folio)}/imagen`;
    return consultasEditor.obtener(`${token}:${ruta}`, async () => {
        let respuesta: Response;
        try { respuesta = await fetch(ruta, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) }); }
        catch { throw new ErrorServicio('No se pudo conectar para cargar la imagen.'); }
        await comprobar(respuesta);
        return respuesta.blob();
    });
}
