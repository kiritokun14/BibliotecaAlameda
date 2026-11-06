import { useRef, useState, type FormEvent } from 'react';
import { consultarContacto, type Seguimiento } from '../../../servicios/atencionComunidad';
import { mensajeError } from '../../../servicios/api';
export default function SeguimientoContacto() {
 const [folio,setFolio]=useState(''),[resultado,setResultado]=useState<Seguimiento|null>(null);
 const [error,setError]=useState(''),[cargando,setCargando]=useState(false); const ocupado=useRef(false);
 async function consultar(e:FormEvent) { e.preventDefault();if(ocupado.current)return;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(folio.trim())) {setError('Escribe el folio completo que recibiste.');setResultado(null);return;}
  ocupado.current=true;setCargando(true);setError('');setResultado(null);
  try {setResultado(await consultarContacto(folio.trim()));} catch(e){setError(mensajeError(e));}
  finally{ocupado.current=false;setCargando(false);}
 }
 return <section className="contacto-seccion contacto-seccion--crema"><form className="formulario-contacto" onSubmit={consultar}>
  <h2>Consultar un mensaje</h2><label htmlFor="folio-contacto">Folio de contacto o sugerencia</label>
  <input className="campo-contacto__entrada" id="folio-contacto" value={folio} onChange={e=>setFolio(e.target.value)} required maxLength={36} disabled={cargando}/>
  <button className="boton-contacto boton-contacto--verde" disabled={cargando}>{cargando?'Consultando…':'Consultar estado'}</button>
  {error&&<p role="alert">{error}</p>}{resultado&&<div role="status"><p>{resultado.asunto}: <strong>{({recibido:'Recibido',en_atencion:'En atención',cerrado:'Cerrado'} as Record<string,string>)[resultado.estadoAtencion]}</strong></p>{resultado.respuestaFinal&&<p style={{whiteSpace:'pre-wrap'}}>{resultado.respuestaFinal}</p>}</div>}
 </form></section>;
}
