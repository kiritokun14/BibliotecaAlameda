import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
export type EstadoReporte = 'pendiente' | 'en_revision' | 'resuelto' | 'descartado';
export type MedidaForo = 'revisar' | 'ocultar' | 'retirar' | 'descartar';
export interface ReporteForo {
    reporteId: string; motivo: string; estadoReporte: EstadoReporte; creadoEn: string; actualizadoEn: string;
    atendidoPor: string | null; resolucion: string | null;
    contenido: { tipo: 'tema' | 'comentario'; id: string; temaId?: string; titulo?: string; texto: string; estado: string; version: string };
    historial: { medida: MedidaForo; estadoAnterior: string; estadoNuevo: string; motivo: string; realizadoPor: string; fecha: string }[];
}
async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para consultar el foro.', 401);
    return pedirApi<T>('/foro' + ruta, { ...opciones, headers: { Authorization: `Bearer ${data.session.access_token}` } });
}
// Contrato listo para que T-077 conecte el botón Reportar del foro público.
export const reportarContenidoForo = (tipoContenido: 'tema' | 'comentario', contenidoId: string, motivo: string) =>
    pedir<{ reporteId: string; estadoReporte: EstadoReporte }>('/reportes', { method: 'POST', body: JSON.stringify({ tipoContenido, contenidoId, motivo: motivo.trim() }) });
export const consultarMisReportes = (pagina = 0) => pedir<{ total: number; reportes: Pick<ReporteForo, 'reporteId' | 'motivo' | 'estadoReporte' | 'creadoEn'>[] }>('/reportes/me?desplazamiento=' + pagina * 20);
export const listarReportesForo = (pagina = 0, estado = '') => pedir<{ total: number; reportes: ReporteForo[] }>('/moderacion/reportes?' + new URLSearchParams({ desplazamiento: String(pagina * 20), ...(estado ? { estado } : {}) }));
export const resolverReporteForo = (reporte: ReporteForo, medida: MedidaForo, motivo: string) => pedir<ReporteForo>('/moderacion/reportes/' + encodeURIComponent(reporte.reporteId), {
    method: 'PATCH', body: JSON.stringify({ actualizadoEn: reporte.actualizadoEn, versionContenido: reporte.contenido.version, medida, motivo: motivo.trim() }),
});
export function medidasDisponibles(reporte: ReporteForo): MedidaForo[] {
    if (['resuelto', 'descartado'].includes(reporte.estadoReporte)) return [];
    const medidas: MedidaForo[] = reporte.estadoReporte === 'pendiente' ? ['revisar', 'descartar'] : ['descartar'];
    if (['publicado', 'oculto'].includes(reporte.contenido.estado)) medidas.push('ocultar');
    if (['publicado', 'oculto', 'retirado'].includes(reporte.contenido.estado)) medidas.push('retirar');
    return medidas;
}
