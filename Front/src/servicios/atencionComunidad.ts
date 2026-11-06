import { ErrorServicio, obtenerSupabase, pedirApi } from './api';

export interface Acuse { id: string; mensaje: string; creadoEn: string }
export interface Seguimiento { id: string; asunto: string; estadoAtencion: string; creadoEn: string; respuestaFinal?: string }
export interface Caso extends Seguimiento {
 nombreRemitente: string; correoContacto: string | null; cuerpoMensaje: string;
 telefonoContacto?: string | null; incorporacionConfirmada?: boolean;
}
export interface ListaCasos { items: Caso[]; total: number; page: number; limit: number }
export interface Intento { id: string; tipoIntento: string; exitoso: boolean; observaciones: string; realizadoEn: string }
export async function pedirComunidad<T>(ruta: string, metodo = 'GET', cuerpo?: unknown, privado = false): Promise<T> {
 const {data,error} = await (await obtenerSupabase()).auth.getSession();
 if (error || (privado && !data.session)) throw new ErrorServicio('Inicia sesión para continuar.',401);
 return pedirApi<T>('/v1/'+ruta, {method:metodo,
  headers:data.session ? {Authorization:'Bearer '+data.session.access_token} : {},
  ...(cuerpo === undefined ? {} : {body:JSON.stringify(cuerpo)})});
}
export function registrarContacto(datos: {nombre:string;correo:string;telefono:string;mensaje:string;tipo:string}) {
 return pedirComunidad<Acuse>('public/contacto','POST',{
  nombreRemitente:datos.nombre,correoContacto:datos.correo,
  telefonoContacto:datos.telefono || null,
  asunto:datos.tipo === 'sugerencia' ? 'Sugerencia del portal' : 'Contacto del portal',
  cuerpoMensaje:datos.mensaje});
}
export function consultarContacto(folio:string) {
 return pedirApi<Seguimiento>('/v1/public/contacto/seguimiento/'+encodeURIComponent(folio));
}
export function solicitarBibliocomunidad(datos: {nombreRemitente:string;correoContacto:string|null;telefonoContacto:string|null;interes:string}) {
 return pedirComunidad<Acuse>('public/bibliocomunidad/solicitar','POST',datos);
}
export function listarCasos(bibliocomunidad:boolean,estado:string,pagina:number) {
 const p=new URLSearchParams({page:String(pagina),limit:'10'});
 if(estado) p.set('estado_atencion',estado);
 return pedirComunidad<ListaCasos>('admin/'+(bibliocomunidad?'bibliocomunidad/solicitudes':'contacto')+'?'+p,'GET',undefined,true);
}
export function atenderContacto(id:string,estado:string,respuesta:string) {
 return pedirComunidad<Caso>('admin/contacto/'+encodeURIComponent(id)+'/atender','PATCH',
  {estadoAtencion:estado,respuestaFinal:respuesta || null},true);
}
export function registrarIntento(id:string,tipoIntento:string,exitoso:boolean,observaciones:string) {
 return pedirComunidad<Intento>('admin/bibliocomunidad/solicitudes/'+encodeURIComponent(id)+'/registrar-intento','POST',
  {tipoIntento,exitoso,observaciones},true);
}
export function intentosCaso(id:string) {
 return pedirComunidad<{items:Intento[]}>('admin/bibliocomunidad/solicitudes/'+encodeURIComponent(id)+'/intentos','GET',undefined,true);
}
export function finalizarCaso(id:string,incorporacionConfirmada:boolean,respuestaFinal:string,resolucionExplicita:boolean) {
 return pedirComunidad<Caso>('admin/bibliocomunidad/solicitudes/'+encodeURIComponent(id)+'/finalizar','PATCH',
  {incorporacionConfirmada,respuestaFinal,resolucionExplicita},true);
}
