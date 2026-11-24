import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import type { Domicilio } from './auth';

export type DomicilioPerfil = Omit<Domicilio, 'numeroInterior'> & { numeroInterior?: string | null };
export interface ResponsablePerfil {
 nombre: string;
 telefono: string;
 correo: string;
 relacion: 'madre' | 'padre' | 'tutor';
}
export interface PerfilPropio {
 id:string;correo:string;nombres:string;primerApellido:string;segundoApellido:string|null;
 fechaNacimiento:string;telefono:string;actualizadoA:string;
 esMenor?: boolean;
 domicilio?: DomicilioPerfil | null;
 responsable?: ResponsablePerfil | null;
}
export interface CambiosPerfil {
 nombres?: string;
 telefono?: string;
 domicilio?: DomicilioPerfil;
 responsable?: Partial<Pick<ResponsablePerfil, 'telefono' | 'correo'>>;
}
async function sesionPerfil(usuarioId?: string) {
 const {data,error}=await (await obtenerSupabase()).auth.getSession();
 if(error||!data.session)throw new ErrorServicio('Inicia sesión para consultar tu perfil.',401);
 if (usuarioId !== undefined && data.session.user.id !== usuarioId) {
  throw new ErrorServicio('La cuenta activa cambió. Vuelve a cargar tus datos.', 409);
 }
 return data.session;
}
async function tokenPerfil() {
 return (await sesionPerfil()).access_token;
}
function pedir<T>(token:string,metodo:string,cambios?:unknown,ruta='/perfil'):Promise<T> {
 return pedirApi<T>(ruta,{method:metodo,headers:{Authorization:'Bearer '+token},
  ...(cambios===undefined?{}:{body:JSON.stringify(cambios)})});
}
export async function consultarPerfil(usuarioId?: string) {
 const sesion = await sesionPerfil(usuarioId);
 return pedir<PerfilPropio>(sesion.access_token, 'GET');
}
export async function guardarPerfil(perfil: PerfilPropio, cambios: CambiosPerfil) {
 const sesion = await sesionPerfil(perfil.id);
 return pedir<PerfilPropio>(sesion.access_token, 'PATCH', { ...cambios, actualizadoA: perfil.actualizadoA });
}

export interface PreferenciasAvisos {
 canalPreferido: 'portal' | 'correo' | 'telefono' | 'whatsapp_manual';
 recibirAvisosComunidad: boolean;
 recibirAvisosActividades: boolean;
 actualizadoEn: string | null;
}
const rutaPreferencias = '/perfil/preferencias-avisos';
// El perfil y la sección Avisos comparten la consulta de la sesión activa.
let preferenciasEnCurso: { token: string; consulta: Promise<PreferenciasAvisos> } | null = null;
export async function consultarPreferenciasAvisos() {
 const token = await tokenPerfil();
 if (preferenciasEnCurso?.token === token) return preferenciasEnCurso.consulta;

 const consulta = pedir<PreferenciasAvisos>(token, 'GET', undefined, rutaPreferencias);
 preferenciasEnCurso = { token, consulta };
 const liberar = () => { if (preferenciasEnCurso?.consulta === consulta) preferenciasEnCurso = null; };
 void consulta.then(() => setTimeout(liberar, 5000), liberar);
 return consulta;
}
export async function guardarPreferenciasAvisos(datos: PreferenciasAvisos) {
 const token = await tokenPerfil();
 try {
  return await pedir<PreferenciasAvisos>(token, 'PATCH', datos, rutaPreferencias);
 } finally {
  if (preferenciasEnCurso?.token === token) preferenciasEnCurso = null;
 }
}
