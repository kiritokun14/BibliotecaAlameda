import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
export interface PerfilPropio {
 id:string;correo:string;nombres:string;primerApellido:string;segundoApellido:string|null;
 fechaNacimiento:string;telefono:string;actualizadoA:string;
 domicilio?: {
  calle: string | null;
  numeroExterior: string | null;
  numeroInterior: string | null;
  colonia: string | null;
  codigoPostal: string | null;
  municipio: string | null;
  estado: string | null;
 };
}
async function pedir<T>(metodo:string,cambios?:unknown,ruta='/perfil'):Promise<T> {
 const {data,error}=await (await obtenerSupabase()).auth.getSession();
 if(error||!data.session)throw new ErrorServicio('Inicia sesión para consultar tu perfil.',401);
 return pedirApi<T>(ruta,{method:metodo,headers:{Authorization:'Bearer '+data.session.access_token},
  ...(cambios===undefined?{}:{body:JSON.stringify(cambios)})});
}
export function consultarPerfil(){return pedir<PerfilPropio>('GET');}
export function guardarPerfil(perfil:PerfilPropio,cambios:{nombres:string;telefono:string}) {
 return pedir<PerfilPropio>('PATCH',{...cambios,actualizadoA:perfil.actualizadoA});
}

export interface PreferenciasAvisos {
 canalPreferido: 'portal' | 'correo' | 'telefono' | 'whatsapp_manual';
 recibirAvisosComunidad: boolean;
 recibirAvisosActividades: boolean;
 actualizadoEn: string | null;
}
const rutaPreferencias = '/perfil/preferencias-avisos';
// La consulta se comparte: el perfil la pide en paralelo con /perfil y la sección Avisos reusa la misma promesa.
let preferenciasEnCurso: Promise<PreferenciasAvisos> | null = null;
export function consultarPreferenciasAvisos() {
 if (!preferenciasEnCurso) {
  preferenciasEnCurso = pedir<PreferenciasAvisos>('GET', undefined, rutaPreferencias);
  const actual = preferenciasEnCurso;
  // Solo se reutiliza mientras está en curso o unos segundos después; un error no se queda guardado
  actual.then(() => setTimeout(() => { if (preferenciasEnCurso === actual) preferenciasEnCurso = null; }, 5000),
   () => { if (preferenciasEnCurso === actual) preferenciasEnCurso = null; });
 }
 return preferenciasEnCurso;
}
export function guardarPreferenciasAvisos(datos: PreferenciasAvisos) {
 preferenciasEnCurso = null;
 return pedir<PreferenciasAvisos>('PATCH', datos, rutaPreferencias);
}
