import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
export interface PerfilPropio {
 id:string;correo:string;nombres:string;primerApellido:string;segundoApellido:string|null;
 fechaNacimiento:string;telefono:string;actualizadoA:string;
}
async function pedir<T>(metodo:string,cambios?:unknown):Promise<T> {
 const {data,error}=await (await obtenerSupabase()).auth.getSession();
 if(error||!data.session)throw new ErrorServicio('Inicia sesión para consultar tu perfil.',401);
 return pedirApi<T>('/perfil',{method:metodo,headers:{Authorization:'Bearer '+data.session.access_token},
  ...(cambios===undefined?{}:{body:JSON.stringify(cambios)})});
}
export function consultarPerfil(){return pedir<PerfilPropio>('GET');}
export function guardarPerfil(perfil:PerfilPropio,cambios:{nombres:string;telefono:string}) {
 return pedir<PerfilPropio>('PATCH',{...cambios,actualizadoA:perfil.actualizadoA});
}
