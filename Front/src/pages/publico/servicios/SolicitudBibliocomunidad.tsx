import { useRef, useState, type FormEvent } from 'react';
import { solicitarBibliocomunidad } from '../../../servicios/atencionComunidad';
import { mensajeError } from '../../../servicios/api';
import '../contacto/Contacto.css';
export default function SolicitudBibliocomunidad() {
 const [folio,setFolio]=useState(''),[error,setError]=useState(''),[enviando,setEnviando]=useState(false);const ocupado=useRef(false);
 async function enviar(e:FormEvent<HTMLFormElement>){e.preventDefault();if(ocupado.current)return;
  const f=new FormData(e.currentTarget);
  const correo=String(f.get('correo')||'').trim(),telefono=String(f.get('telefono')||'').trim();
  if(!correo&&!telefono){setError('Proporciona un correo o teléfono para contactarte.');return;}
  ocupado.current=true;setEnviando(true);setError('');
  try {const r=await solicitarBibliocomunidad({nombreRemitente:String(f.get('nombre')||'').trim(),
   correoContacto:correo||null,telefonoContacto:telefono||null,interes:String(f.get('interes')||'').trim()});
   if(!r?.id)throw new Error();setFolio(r.id);
  }catch(e){setError(mensajeError(e));}finally{ocupado.current=false;setEnviando(false);}
 }
 return <section className="contacto-seccion contacto-seccion--crema">
 {folio?<div className="formulario-contacto" role="status"><h2>Recibimos tu solicitud</h2><p>Folio: <strong>{folio}</strong></p><p>El personal se pondrá en contacto contigo. El envío no confirma tu incorporación al programa.</p><button className="boton-contacto boton-contacto--verde" onClick={()=>setFolio('')}>Enviar otra solicitud</button></div>:
 <form className="formulario-contacto" onSubmit={enviar}><h2>Quiero participar en Bibliocomunidad</h2><p>Deja un correo o teléfono para que el personal pueda contactarte.</p>
 <fieldset disabled={enviando} className="formulario-contacto__campos">
 <label>Nombre completo<input className="campo-contacto__entrada" name="nombre" required maxLength={150}/></label>
 <label>Correo electrónico<input className="campo-contacto__entrada" name="correo" type="email" maxLength={254}/></label>
 <label>Teléfono<input className="campo-contacto__entrada" name="telefono" type="tel" pattern="\+?[0-9][0-9 ()-]{6,18}" maxLength={19}/></label>
 <label>Cuéntanos tu interés<textarea className="campo-contacto__entrada" name="interes" required maxLength={10000}/></label>
 </fieldset>{error&&<p role="alert">{error}</p>}<button className="boton-contacto boton-contacto--verde" disabled={enviando}>{enviando?'Enviando…':'Enviar solicitud'}</button></form>}
 </section>;
}
