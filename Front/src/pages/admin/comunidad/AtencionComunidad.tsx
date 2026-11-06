import { useEffect, useRef, useState, type FormEvent } from 'react';
import PanelLayout from '../PanelLayout';
import { Pagina, EncabezadoTarjeta } from '../contenidoDemo/piezas';
import '../contenidoDemo/Contenidos.css';
import './Comunidad.css';
import { mensajeError } from '../../../servicios/api';
import { listarCasos, atenderContacto, registrarIntento, finalizarCaso, intentosCaso, type Caso, type ListaCasos, type Intento } from '../../../servicios/atencionComunidad';
const estados: Record<string,string>={recibido:'Recibido',en_atencion:'En atención',cerrado:'Cerrado'};
export default function AtencionComunidad({bibliocomunidad=false}:{bibliocomunidad?:boolean}) {
 const [estado,setEstado]=useState(''),[pagina,setPagina]=useState(1),[recarga,setRecarga]=useState(0);
 const [seleccion,setSeleccion]=useState<Caso|null>(null);
 const [resultado,setResultado]=useState<{clave:string;datos?:ListaCasos;error?:string}>({clave:''});
 const clave=JSON.stringify([bibliocomunidad,estado,pagina,recarga]),actual=resultado.clave===clave?resultado:undefined;
 useEffect(()=>{let vigente=true;listarCasos(bibliocomunidad,estado,pagina).then(datos=>{if(vigente)setResultado({clave,datos});})
 .catch(e=>{if(vigente)setResultado({clave,error:mensajeError(e)});});return()=>{vigente=false;};},[bibliocomunidad,estado,pagina,clave]);
 const titulo=bibliocomunidad?'Bibliocomunidad':'Contactos y sugerencias';
 return <PanelLayout titulo="Atención"><Pagina><EncabezadoTarjeta volver={{texto:"Volver al resumen",ruta:"/admin/resumen"}} etiqueta="Atención del portal" titulo={titulo} texto="Los casos y sus cambios se guardan en la base de datos."/>
 <div className="cn-barra"><label>Estado <select className="cn-control" value={estado} onChange={e=>{setEstado(e.target.value);setPagina(1);setSeleccion(null);}}>
 <option value="">Todos</option>{Object.entries(estados).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <button className="boton-panel" onClick={()=>{setRecarga(x=>x+1);setSeleccion(null);}}>Actualizar</button></div>
 {!actual&&<p role="status">Cargando casos…</p>}{actual?.error&&<p role="alert">{actual.error}</p>}
 {actual?.datos&&<><p>{actual.datos.total} casos</p><div className="cn-tabla-contenedor"><table className="cn-tabla"><thead><tr><th>Folio</th><th>Remitente</th><th>Asunto</th><th>Estado</th><th>Acción</th></tr></thead>
 <tbody>{actual.datos.items.map(c=><tr key={c.id}><td>{c.id}</td><td>{c.nombreRemitente}</td><td>{c.asunto}</td><td>{estados[c.estadoAtencion]}</td><td><button className="boton-panel" onClick={()=>setSeleccion(c)}>Ver caso</button></td></tr>)}</tbody></table></div>
 {actual.datos.total===0&&<p>No hay casos con este filtro.</p>}
 <div className="cn-acciones"><button className="boton-panel" disabled={pagina===1} onClick={()=>{setPagina(p=>p-1);setSeleccion(null);}}>Anterior</button><span>Página {pagina}</span><button className="boton-panel" disabled={pagina*10>=actual.datos.total} onClick={()=>{setPagina(p=>p+1);setSeleccion(null);}}>Siguiente</button></div></>}
 {seleccion&&<Detalle key={seleccion.id} caso={seleccion} comunidad={bibliocomunidad} alGuardar={()=>{setSeleccion(null);setRecarga(x=>x+1);}}/>}
 </Pagina></PanelLayout>;
}
function Detalle({caso,comunidad,alGuardar}:{caso:Caso;comunidad:boolean;alGuardar:()=>void}) {
 const [error,setError]=useState(''),[ocupado,setOcupado]=useState(false),[intentos,setIntentos]=useState<Intento[]|null>(null),[recarga,setRecarga]=useState(0);
 const bloqueo=useRef(false);
 useEffect(()=>{if(!comunidad)return;let vigente=true;intentosCaso(caso.id).then(r=>{if(vigente)setIntentos(r.items);}).catch(e=>{if(vigente)setError(mensajeError(e));});return()=>{vigente=false;};},[caso.id,comunidad,recarga]);
 async function ejecutar(accion:()=>Promise<unknown>,terminar=true){if(bloqueo.current)return;bloqueo.current=true;setOcupado(true);setError('');
 try{await accion();if(terminar)alGuardar();else{setIntentos(null);setRecarga(x=>x+1);}}catch(e){setError(mensajeError(e));}finally{bloqueo.current=false;setOcupado(false);}}
 function cerrar(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget),texto=String(f.get('respuesta')||'').trim();if(!texto){setError('Escribe una respuesta final.');return;}
 void ejecutar(()=>comunidad?finalizarCaso(caso.id,f.get('incorporacion')==='on',texto,f.get('resolucion')==='on'):atenderContacto(caso.id,'cerrado',texto));}
 function intento(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget),nota=String(f.get('nota')||'').trim();if(!nota){setError('Describe el intento de contacto.');return;}
 void ejecutar(()=>registrarIntento(caso.id,String(f.get('tipo')),f.get('exitoso')==='on',nota),false);}
 return <section className="comunidad-caso"><h2>Folio {caso.id}</h2><p><strong>{caso.nombreRemitente}</strong> · {caso.correoContacto||caso.telefonoContacto}</p>
 <h3>{caso.asunto}</h3><p className="comunidad-texto">{caso.cuerpoMensaje}</p>{caso.respuestaFinal&&<p className="comunidad-texto">Respuesta: {caso.respuestaFinal}</p>}
 {error&&<p role="alert">{error}</p>}
 {comunidad&&<><h3>Intentos de contacto</h3>{intentos===null?<p role="status">Cargando bitácora…</p>:intentos.length===0?<p>Sin intentos registrados.</p>:<ul>{intentos.map(i=><li key={i.id}>{i.tipoIntento} · {i.exitoso?'Efectivo':'Sin contacto'} · {i.observaciones}</li>)}</ul>}</>}
 {caso.estadoAtencion!=='cerrado'&&<fieldset disabled={ocupado}>
 {!comunidad&&caso.estadoAtencion==='recibido'&&<button className="boton-panel" onClick={()=>void ejecutar(()=>atenderContacto(caso.id,'en_atencion',''))}>Iniciar atención</button>}
 {comunidad&&<form className="comunidad-formulario" onSubmit={intento}><h3>Registrar intento</h3><label>Medio<select className="cn-control" name="tipo"><option value="llamada">Llamada</option><option value="correo">Correo</option><option value="presencial">Presencial</option></select></label><label><input type="checkbox" name="exitoso"/> Se logró contactar a la persona</label><label>Observaciones<textarea className="cn-control" name="nota" required maxLength={2000}/></label><button className="boton-panel">Guardar intento</button></form>}
 <form className="comunidad-formulario" onSubmit={cerrar}><h3>Cerrar caso</h3><label>Respuesta final<textarea className="cn-control" name="respuesta" required maxLength={10000}/></label>
 {comunidad&&<><label><input type="checkbox" name="incorporacion"/> Confirmar incorporación (requiere contacto efectivo)</label><label><input type="checkbox" name="resolucion"/> Resolución explícita para cerrar sin contacto efectivo</label></>}
 <button className="boton-panel">{ocupado?'Guardando…':'Guardar cierre'}</button></form></fieldset>}
 </section>;
}
