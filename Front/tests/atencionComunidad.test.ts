import { beforeEach, describe, expect, it, vi } from 'vitest';
const api=vi.hoisted(()=>({pedir:vi.fn(),sesion:vi.fn()}));
vi.mock('../src/servicios/api',()=>({pedirApi:api.pedir,obtenerSupabase:async()=>({auth:{getSession:api.sesion}}),
 ErrorServicio:class extends Error { estado:number;constructor(m:string,e:number){super(m);this.estado=e;} }}));
import { registrarContacto, solicitarBibliocomunidad, consultarContacto, listarCasos, finalizarCaso } from '../src/servicios/atencionComunidad';
describe('Servicios conectados de Contacto y Bibliocomunidad',()=>{
 beforeEach(()=>{vi.clearAllMocks();api.sesion.mockResolvedValue({data:{session:null},error:null});api.pedir.mockResolvedValue({id:'folio-real'});});
 it('el contacto anónimo conserva el teléfono y usa el folio del servidor',async()=>{
  const r=await registrarContacto({nombre:'Ana',correo:'ana@example.com',telefono:'3110000000',mensaje:'Texto',tipo:'sugerencia'});
  expect(r.id).toBe('folio-real');const [ruta,opciones]=api.pedir.mock.calls[0];
  expect(ruta).toBe('/v1/public/contacto');
  expect(JSON.parse(opciones.body)).toMatchObject({telefonoContacto:'3110000000',asunto:'Sugerencia del portal'});
  expect(opciones.headers.Authorization).toBeUndefined();
 });
 it('la solicitud con sesión envía el token y no inventa usuarioId',async()=>{
  api.sesion.mockResolvedValue({data:{session:{access_token:'sesion-prueba'}},error:null});
  await solicitarBibliocomunidad({nombreRemitente:'Ana',correoContacto:null,telefonoContacto:'3110000000',interes:'Club'});
  const [ruta,o]=api.pedir.mock.calls[0];expect(ruta).toBe('/v1/public/bibliocomunidad/solicitar');
  expect(o.headers.Authorization).toBe('Bearer sesion-prueba');expect(JSON.parse(o.body)).not.toHaveProperty('usuarioId');
 });
 it('la consulta pública no modifica el caso ni pide una sesión',async()=>{
  await consultarContacto('folio');expect(api.pedir).toHaveBeenCalledWith('/v1/public/contacto/seguimiento/folio');expect(api.sesion).not.toHaveBeenCalled();
 });
 it('la bandeja privada no se consulta sin sesión',async()=>{
  await expect(listarCasos(false,'',1)).rejects.toThrow('Inicia sesión');expect(api.pedir).not.toHaveBeenCalled();
 });
 it('un error al cerrar nunca se presenta como éxito',async()=>{
  api.sesion.mockResolvedValue({data:{session:{access_token:'token'}},error:null});api.pedir.mockRejectedValue(new Error('Sin contacto efectivo'));
  await expect(finalizarCaso('folio',true,'Respuesta',false)).rejects.toThrow('Sin contacto efectivo');
 });
});
