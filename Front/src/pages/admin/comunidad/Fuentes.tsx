import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import PanelLayout from '../PanelLayout';
import { Pagina, EncabezadoTarjeta } from '../contenidoDemo/piezas';
import '../contenidoDemo/Contenidos.css';
import './Comunidad.css';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { mensajeError } from '../../../servicios/api';
import { crearFuente, decidirFuente, listarFuentes, type Fuente, type EntradaFuente } from '../../../servicios/fuentes';
export default function Fuentes() {
 const identidad=useContext(ContextoPanel),aprueba=identidad?.acceso.roles.some(r=>r.rolCodigo==='administrador');
 const [pagina,setPagina]=useState(1),[estado,setEstado]=useState(''),[recarga,setRecarga]=useState(0),[seleccion,setSeleccion]=useState<Fuente|null>(null);
 const [resultado,setResultado]=useState<{clave:string;items?:Fuente[];total?:number;error?:string}>({clave:''});
 const [error,setError]=useState(''),[guardando,setGuardando]=useState(false),bloqueo=useRef(false);
 const clave=JSON.stringify([pagina,estado,recarga]),actual=resultado.clave===clave?resultado:undefined;
 useEffect(()=>{let vigente=true;listarFuentes(pagina,estado).then(r=>{if(vigente)setResultado({clave,...r});}).catch(e=>{if(vigente)setResultado({clave,error:mensajeError(e)});});return()=>{vigente=false;};},[pagina,estado,clave]);
 async function ejecutar(accion:()=>Promise<unknown>){if(bloqueo.current)return;bloqueo.current=true;setGuardando(true);setError('');
 try{await accion();setSeleccion(null);setRecarga(x=>x+1);}catch(e){setError(mensajeError(e));}finally{bloqueo.current=false;setGuardando(false);}}
 function guardar(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);
 const datos:EntradaFuente={tituloFuente:String(f.get('titulo')||'').trim(),tipoFuente:String(f.get('tipo')||'').trim(),contenidoReferencia:String(f.get('contenido')||'').trim()};
 if(!datos.tituloFuente||!datos.tipoFuente||!datos.contenidoReferencia){setError('Completa los campos de la fuente.');return;}
 void ejecutar(()=>seleccion?decidirFuente(seleccion.id,'version',datos):crearFuente(datos));}
 return <PanelLayout titulo="Fuentes del asistente"><Pagina><EncabezadoTarjeta volver={{texto:"Volver al resumen",ruta:"/admin/resumen"}} etiqueta="Administración" titulo="Fuentes del asistente" texto="Solo las fuentes aprobadas y activas quedan disponibles para recuperación. Esto no activa por sí solo el asistente conversacional."/>
 <div className="cn-barra"><label>Estado<select className="cn-control" value={estado} onChange={e=>{setEstado(e.target.value);setPagina(1);setSeleccion(null);}}><option value="">Todos</option>{['borrador','en_revision','aprobada','retirada'].map(x=><option key={x}>{x}</option>)}</select></label><button className="boton-panel" onClick={()=>{setRecarga(x=>x+1);setSeleccion(null);}}>Actualizar</button></div>
 {!actual&&<p role="status">Cargando fuentes…</p>}{actual?.error&&<p role="alert">{actual.error}</p>}{error&&<p role="alert">{error}</p>}
 {actual?.items&&<><div className="cn-tabla-contenedor"><table className="cn-tabla"><thead><tr><th>Fuente</th><th>Versión</th><th>Estado</th><th>Activa</th><th>Acción</th></tr></thead><tbody>{actual.items.map(f=><tr key={f.id}><td>{f.tituloFuente}</td><td>{f.version}</td><td>{f.estadoFuente}</td><td>{f.activa?'Sí':'No'}</td><td><button className="boton-panel" disabled={guardando} onClick={()=>setSeleccion(f)}>Ver fuente</button></td></tr>)}</tbody></table></div>{actual.items.length===0&&<p>No hay fuentes con este filtro.</p>}<div className="cn-acciones"><button className="boton-panel" disabled={pagina===1||guardando} onClick={()=>{setPagina(x=>x-1);setSeleccion(null);}}>Anterior</button><span>Página {pagina}</span><button className="boton-panel" disabled={pagina*10>=(actual.total||0)||guardando} onClick={()=>{setPagina(x=>x+1);setSeleccion(null);}}>Siguiente</button></div></>}
 {seleccion&&<section className="comunidad-caso"><h2>{seleccion.tituloFuente}</h2><p className="comunidad-texto">{seleccion.contenidoReferencia}</p><div className="cn-acciones">
 {seleccion.estadoFuente!=='retirada'&&<>{aprueba&&<><button className="boton-panel" disabled={guardando} onClick={()=>void ejecutar(()=>decidirFuente(seleccion.id,'aprobar',{aprobar:true}))}>Aprobar fuente</button><button className="boton-panel" disabled={guardando} onClick={()=>void ejecutar(()=>decidirFuente(seleccion.id,'aprobar',{aprobar:false}))}>Devolver a revisión</button></>}
 {seleccion.estadoFuente==='aprobada'&&!seleccion.activa&&<button className="boton-panel" disabled={guardando} onClick={()=>void ejecutar(()=>decidirFuente(seleccion.id,'activar'))}>Activar fuente</button>}
 <button className="boton-panel" disabled={guardando} onClick={()=>void ejecutar(()=>decidirFuente(seleccion.id,'retirar'))}>Retirar fuente</button></>}
 <button className="boton-panel" disabled={guardando} onClick={()=>setSeleccion(null)}>Nueva fuente</button></div></section>}
 {seleccion?.estadoFuente!=='retirada'&&<form key={seleccion?.id||'nueva-'+recarga} className="comunidad-formulario comunidad-caso" onSubmit={guardar}>
 <h2>{seleccion?'Crear nueva versión':'Registrar fuente'}</h2><p>Se guardará como borrador, sin aprobación ni activación.</p><fieldset disabled={guardando} className="comunidad-formulario">
 <label>Título<input className="cn-control" name="titulo" defaultValue={seleccion?.tituloFuente} required maxLength={250}/></label><label>Tipo<input className="cn-control" name="tipo" defaultValue={seleccion?.tipoFuente} required maxLength={80}/></label><label>Contenido de referencia<textarea className="cn-control" name="contenido" defaultValue={seleccion?.contenidoReferencia} required maxLength={50000}/></label><button className="boton-panel">{guardando?'Guardando…':'Guardar borrador'}</button></fieldset></form>}
 </Pagina></PanelLayout>;
}
