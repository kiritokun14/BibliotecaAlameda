// HU-21 / BDLAG-95. Evidencias privadas de actividades (Back/evidencias.py).
// Requiere la capacidad gestionar_evidencias. Los archivos nunca se publican en el portal.
import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import { invalidarConsultas } from './consultas';

export type TipoEvidenciaApi = 'fotografia' | 'lista_firmada' | 'informe';
export type AccesoEvidencia = 'personal' | 'coordinacion';
export type AccionEvidencia = 'subio' | 'consulto' | 'descargo' | 'cambio_acceso' | 'retiro' | 'solicito_acceso';

export interface SesionEvidencia { sesionId: string; actividad: string | null; titulo: string; inicio: string; estado: string }

export interface EvidenciaResumen {
    folio: string;
    actividad: string | null;
    titulo: string;
    sesionInicio: string;
    tipo: TipoEvidenciaApi;
    acceso: AccesoEvidencia;
    subio: string;
    subidaEn: string;
    retirada: boolean;
    puedeVer: boolean;
}

// Si puedeVer es false, solo llegan los datos del resumen (sin archivo, nota ni historial).
export interface EvidenciaDetalle extends EvidenciaResumen {
    solicitada: boolean;
    nombreArchivo?: string;
    tamanoBytes?: number;
    tipoArchivo?: string;
    nota?: string | null;
    retiro?: { fecha: string; motivo: string; por: string } | null;
    historial?: { fecha: string; persona: string; accion: AccionEvidencia; detalle: Record<string, unknown> | null }[];
}

export interface NuevaEvidencia { sesionId: string; tipo: TipoEvidenciaApi; acceso: AccesoEvidencia; nota: string; archivo: File }

async function token() {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para continuar.', 401);
    return data.session.access_token;
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    return pedirApi<T>('/actividades/evidencias' + ruta, { ...opciones, headers: { ...opciones.headers, Authorization: `Bearer ${await token()}` } });
}

const folioUrl = (folio: string) => encodeURIComponent(folio);

export const listarSesionesEvidencia = () => pedir<SesionEvidencia[]>('/sesiones');
export const listarEvidencias = () => pedir<EvidenciaResumen[]>('');
export const obtenerEvidenciaApi = (folio: string) => pedir<EvidenciaDetalle>('/' + folioUrl(folio));
export const cambiarAccesoEvidencia = (folio: string, acceso: AccesoEvidencia) =>
    pedir<EvidenciaDetalle>(`/${folioUrl(folio)}/acceso`, { method: 'PATCH', body: JSON.stringify({ acceso }) });
export const retirarEvidenciaApi = (folio: string, motivo: string) =>
    pedir<EvidenciaDetalle>(`/${folioUrl(folio)}/retiro`, { method: 'POST', body: JSON.stringify({ motivo: motivo.trim() }) });
export const solicitarAccesoEvidencia = (folio: string) =>
    pedir<EvidenciaDetalle>(`/${folioUrl(folio)}/solicitud-acceso`, { method: 'POST' });

// El archivo va tal cual en el cuerpo; los datos, en la dirección.
export function subirEvidenciaApi(d: NuevaEvidencia) {
    const parametros = new URLSearchParams({ sesionId: d.sesionId, tipo: d.tipo, acceso: d.acceso, nombreArchivo: d.archivo.name.slice(-200), nota: d.nota.trim() });
    return pedir<EvidenciaDetalle>('?' + parametros, { method: 'POST', body: d.archivo, headers: { 'Content-Type': d.archivo.type } });
}

// Descarga con la sesión y guarda el archivo; la descarga queda registrada en el servidor.
export async function descargarEvidencia(folio: string, nombre: string) {
    let respuesta: Response;
    try {
        respuesta = await fetch(`/api/actividades/evidencias/${folioUrl(folio)}/descarga`, {
            headers: { Authorization: `Bearer ${await token()}` }, signal: AbortSignal.timeout(60000) });
    } catch (e) {
        if (e instanceof ErrorServicio) throw e;
        throw new ErrorServicio('No pudimos conectar con el servidor. Comprueba que el backend esté encendido.');
    }
    if (!respuesta.ok) {
        if (respuesta.status === 401 || respuesta.status === 403) invalidarConsultas();
        const datos = await respuesta.json().catch(() => null);
        throw new ErrorServicio(typeof datos?.detail === 'string' ? datos.detail : 'No se pudo descargar el archivo.', respuesta.status);
    }
    const url = URL.createObjectURL(await respuesta.blob());
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
