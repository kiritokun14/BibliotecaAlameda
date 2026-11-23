import { beforeEach, describe, expect, it, vi } from 'vitest';
const api=vi.hoisted(()=>({pedir:vi.fn(),sesion:vi.fn()}));
vi.mock('../src/servicios/api',()=>({pedirApi:api.pedir,obtenerSupabase:async()=>({auth:{getSession:api.sesion}}),
 ErrorServicio:class extends Error {estado:number;constructor(m:string,e:number){super(m);this.estado=e;}}}));
import { consultarPerfil, consultarPreferenciasAvisos, guardarPerfil, type PerfilPropio } from '../src/servicios/perfil';
const perfil:PerfilPropio={id:'usuario',correo:'ana@example.com',nombres:'Ana',primerApellido:'Pérez',segundoApellido:null,fechaNacimiento:'2000-01-01',telefono:'3110000000',actualizadoA:'2026-11-02T12:00:00Z'};
describe('Perfil propio conectado',()=>{
 beforeEach(()=>{vi.clearAllMocks();api.sesion.mockResolvedValue({data:{session:{access_token:'token'}},error:null});api.pedir.mockResolvedValue(perfil);});
 it('consulta con sesión y sin recibir identidad del formulario',async()=>{
  await consultarPerfil();expect(api.pedir).toHaveBeenCalledWith('/perfil',{method:'GET',headers:{Authorization:'Bearer token'}});
 });
 it('no permite consultar sin sesión',async()=>{
  api.sesion.mockResolvedValue({data:{session:null},error:null});await expect(consultarPerfil()).rejects.toThrow('Inicia sesión');expect(api.pedir).not.toHaveBeenCalled();
 });
 it('manda la versión leída y solo los cambios editables',async()=>{
  await guardarPerfil(perfil,{nombres:'Ana María',telefono:'3111234567'});
  const [,o]=api.pedir.mock.calls[0];expect(o.method).toBe('PATCH');
  expect(JSON.parse(o.body)).toEqual({nombres:'Ana María',telefono:'3111234567',actualizadoA:perfil.actualizadoA});
 });
 it('un conflicto no se presenta como guardado exitoso',async()=>{
  api.pedir.mockRejectedValue(new Error('El perfil cambió'));await expect(guardarPerfil(perfil,{nombres:'Ana',telefono:'3111234567'})).rejects.toThrow('El perfil cambió');
 });
});

it('consulta las preferencias de la sesión nueva aunque la anterior siga en memoria', async () => {
 const deAna = {canalPreferido:'correo',recibirAvisosComunidad:false,recibirAvisosActividades:true,actualizadoEn:'2026-11-02T12:00:00Z'};
 const deLuis = {canalPreferido:'portal',recibirAvisosComunidad:true,recibirAvisosActividades:false,actualizadoEn:null};
 api.pedir.mockClear().mockResolvedValueOnce(deAna).mockResolvedValueOnce(deLuis);
 api.sesion.mockResolvedValue({data:{session:{access_token:'token-ana'}},error:null});
 await expect(Promise.all([consultarPreferenciasAvisos(),consultarPreferenciasAvisos()])).resolves.toEqual([deAna,deAna]);
 expect(api.pedir).toHaveBeenCalledTimes(1);

 api.sesion.mockResolvedValue({data:{session:{access_token:'token-luis'}},error:null});
 await expect(consultarPreferenciasAvisos()).resolves.toEqual(deLuis);
 expect(api.pedir).toHaveBeenLastCalledWith('/perfil/preferencias-avisos',{method:'GET',headers:{Authorization:'Bearer token-luis'}});

 api.sesion.mockResolvedValue({data:{session:null},error:null});
 await expect(consultarPreferenciasAvisos()).rejects.toThrow('Inicia sesión');
 expect(api.pedir).toHaveBeenCalledTimes(2);
});
