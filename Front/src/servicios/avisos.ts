import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
export interface DestinatarioAviso { id: string; nombre: string; telefono: string; recibirAvisosComunidad: boolean; recibirAvisosActividades: boolean; canalPreferido: string | null }
export type EstadoAviso = 'pendiente' | 'enviado' | 'entregado' | 'fallido';
export interface AvisoManual { id: string; usuarioId: string; titulo: string; cuerpoAviso: string; tipoAviso: string; estadoEnvio: EstadoAviso; creadoEn: string; version: number; destinatario: string; historial: { estado: EstadoAviso; actor: string; fecha: string; nota: string }[] }
export interface NuevoAvisoManual { id: string; usuarioId: string; titulo: string; cuerpoAviso: string; tipoAviso: string }
async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para atender avisos.', 401);
    return pedirApi<T>('/avisos/whatsapp' + ruta, { ...opciones, headers: { Authorization: `Bearer ${data.session.access_token}` } });
}
export const buscarDestinatarios = (busqueda: string) => pedir<DestinatarioAviso[]>('/destinatarios?busqueda=' + encodeURIComponent(busqueda.trim()));
export const listarAvisos = (pagina = 0) => pedir<{ total: number; avisos: AvisoManual[] }>('?desplazamiento=' + pagina * 20);
export const crearAviso = (datos: NuevoAvisoManual) => pedir<AvisoManual>('', { method: 'POST', body: JSON.stringify(datos) });
export const prepararAviso = (id: string) => pedir<{ enlace: string }>('/' + encodeURIComponent(id) + '/preparar');
export const registrarResultadoAviso = (aviso: AvisoManual, estadoEnvio: EstadoAviso, nota: string) => pedir<AvisoManual>('/' + encodeURIComponent(aviso.id), { method: 'PATCH', body: JSON.stringify({ version: aviso.version, estadoEnvio, nota: nota.trim() }) });
export function estadosSiguientes(estado: EstadoAviso): EstadoAviso[] {
    return { pendiente: ['enviado', 'fallido'], enviado: ['entregado', 'fallido'], fallido: ['pendiente'], entregado: [] }[estado] as EstadoAviso[];
}
