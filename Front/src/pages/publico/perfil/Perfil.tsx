import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import PaginaPublica, { EncabezadoPublico } from '../../../components/portal/PaginaPublica';
import { consultarPerfil, guardarPerfil, type PerfilPropio } from '../../../servicios/perfil';
import { ErrorServicio, mensajeError, obtenerSupabase } from '../../../servicios/api';
import '../contacto/Contacto.css';

type Resultado={perfil:PerfilPropio}|{error:string;ingresar:boolean};
export default function Perfil() {
 const [resultado,setResultado]=useState<Resultado|null>(null),[intento,setIntento]=useState(0);
 const [recargando,setRecargando]=useState(false);
 const [usuario,setUsuario]=useState<string|null|undefined>(undefined);
 useEffect(()=>{let vigente=true;let cancelar:(()=>void)|undefined;
 obtenerSupabase().then(cliente=>{if(!vigente)return;
 const {data}=cliente.auth.onAuthStateChange((_evento,sesion)=>setUsuario(sesion?.user.id??null));
 cancelar=()=>data.subscription.unsubscribe();
 }).catch(()=>{if(vigente)setUsuario(null);});
 return()=>{vigente=false;cancelar?.();};},[]);
 useEffect(()=>{if(!usuario)return;let vigente=true;consultarPerfil().then(perfil=>{if(vigente){setResultado({perfil});setRecargando(false);}})
 .catch(e=>{if(vigente){setResultado({error:mensajeError(e),ingresar:e instanceof ErrorServicio&&e.estado===401});setRecargando(false);}});
 return()=>{vigente=false;};},[intento,usuario]);
 return <PaginaPublica><EncabezadoPublico etiqueta="Mi cuenta" titulo={<>Mi <span>perfil</span></>} texto="Consulta tus datos y mantén actualizado tu nombre y teléfono."/>
 <section className="contacto-seccion contacto-seccion--crema">
 {usuario===null?<div className="formulario-contacto"><p>Inicia sesión para consultar tu perfil.</p><Link className="boton-contacto boton-contacto--verde" to="/iniciar-sesion">Iniciar sesión</Link></div>:
 !resultado||usuario===undefined||('perfil' in resultado&&resultado.perfil.id!==usuario)||recargando?<p role="status">Cargando tu perfil…</p>:'error' in resultado?<div className="formulario-contacto"><p role="alert">{resultado.error}</p>
 {resultado.ingresar?<Link className="boton-contacto boton-contacto--verde" to="/iniciar-sesion">Iniciar sesión</Link>:<button className="boton-contacto boton-contacto--verde" onClick={()=>{setRecargando(true);setIntento(x=>x+1);}}>Reintentar</button>}</div>:
 <Formulario key={resultado.perfil.actualizadoA} perfil={resultado.perfil} alRecargar={()=>{setRecargando(true);setIntento(x=>x+1);}}/>}
 </section></PaginaPublica>;
}
function Formulario({perfil,alRecargar}:{perfil:PerfilPropio;alRecargar:()=>void}) {
 const [nombres,setNombres]=useState(perfil.nombres),[telefono,setTelefono]=useState(perfil.telefono);
 const [version,setVersion]=useState(perfil),[error,setError]=useState(''),[exito,setExito]=useState(false),[conflicto,setConflicto]=useState(false);
 const [guardando,setGuardando]=useState(false),bloqueo=useRef(false);
 async function guardar(e:FormEvent){e.preventDefault();if(bloqueo.current)return;setError('');setExito(false);
 if(!nombres.trim()||nombres.trim().length>150||!/^\d{10}$/.test(telefono.trim())) {setError('Escribe tu nombre y un teléfono de 10 dígitos.');return;}
 bloqueo.current=true;setGuardando(true);
 try{const actualizado=await guardarPerfil(version,{nombres:nombres.trim(),telefono:telefono.trim()});setVersion(actualizado);setNombres(actualizado.nombres);setTelefono(actualizado.telefono);setExito(true);}
 catch(e){setError(mensajeError(e));if(e instanceof ErrorServicio&&e.estado===409)setConflicto(true);}
 finally{bloqueo.current=false;setGuardando(false);}
 }
 return <form className="formulario-contacto" onSubmit={guardar}><h2>Datos de tu cuenta</h2>
 <p>Correo: {perfil.correo}</p><p>Apellidos: {perfil.primerApellido} {perfil.segundoApellido}</p><p>Fecha de nacimiento: {perfil.fechaNacimiento}</p>
 <p>Desde aquí puedes editar nombre(s) y teléfono.</p>
 <fieldset className="formulario-contacto__campos" disabled={guardando||conflicto}>
 <label>Nombre(s)<input className="campo-contacto__entrada" name="nombres" value={nombres} onChange={e=>{setNombres(e.target.value);setExito(false);}} required maxLength={150} autoComplete="given-name"/></label>
 <label>Teléfono<input className="campo-contacto__entrada" name="telefono" type="tel" value={telefono} onChange={e=>{setTelefono(e.target.value);setExito(false);}} pattern="[0-9]{10}" required maxLength={10} autoComplete="tel-national"/></label>
 </fieldset>{error&&<p role="alert">{error}</p>}{exito&&<p role="status">Tu perfil se guardó correctamente.</p>}
 {conflicto?<button className="boton-contacto boton-contacto--verde" type="button" onClick={alRecargar}>Volver a cargar el perfil</button>:<button className="boton-contacto boton-contacto--verde" disabled={guardando}>{guardando?'Guardando…':'Guardar cambios'}</button>}
 <Link className="boton-contacto" to="/">Volver al inicio</Link>
 </form>;
}
