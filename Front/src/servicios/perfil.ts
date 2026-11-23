import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
export interface PerfilPropio {
 id:string;correo:string;nombres:string;primerApellido:string;segundoApellido:string|null;
 fechaNacimiento:string;telefono:string;actualizadoA:string;
}
async function tokenPerfil() {
 const {data,error}=await (await obtenerSupabase()).auth.getSession();
 if(error||!data.session)throw new ErrorServicio('Inicia sesión para consultar tu perfil.',401);
 return data.session.access_token;
}
function pedir<T>(token:string,metodo:string,cambios?:unknown,ruta='/perfil'):Promise<T> {
 return pedirApi<T>(ruta,{method:metodo,headers:{Authorization:'Bearer '+token},
  ...(cambios===undefined?{}:{body:JSON.stringify(cambios)})});
}
export async function consultarPerfil(){return pedir<PerfilPropio>(await tokenPerfil(),'GET');}
export async function guardarPerfil(perfil:PerfilPropio,cambios:{nombres:string;telefono:string}) {
 return pedir<PerfilPropio>(await tokenPerfil(),'PATCH',{...cambios,actualizadoA:perfil.actualizadoA});
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
