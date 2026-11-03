import { pedirComunidad } from './atencionComunidad';
export interface Fuente {id:string;tituloFuente:string;tipoFuente:string;contenidoReferencia:string;estadoFuente:string;version:number;activa:boolean}
export interface EntradaFuente {tituloFuente:string;tipoFuente:string;contenidoReferencia:string}
const base='admin/rag/fuentes';
export function listarFuentes(pagina:number,estado:string) {
 const p=new URLSearchParams({page:String(pagina),limit:'10'});if(estado)p.set('estadoFuente',estado);
 return pedirComunidad<{items:Fuente[];total:number}>(base+'?'+p,'GET',undefined,true);
}
export function crearFuente(datos:EntradaFuente) {return pedirComunidad<Fuente>(base,'POST',datos,true);}
export function decidirFuente(id:string,accion:'aprobar'|'activar'|'retirar'|'version',datos?:EntradaFuente|{aprobar:boolean}) {
 return pedirComunidad<Fuente>(base+'/'+encodeURIComponent(id)+'/'+accion,'PATCH',datos,true);
}
