import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import PanelLayout from '../PanelLayout';
import { EncabezadoTarjeta, Pagina } from '../contenidoDemo/piezas';
import '../contenidoDemo/Contenidos.css';
import '../../publico/tramites/Tramites.css';
import './AvisosManuales.css';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { buscarDestinatarios, crearAviso, listarAvisos, prepararAviso, registrarResultadoAviso, estadosSiguientes, type AvisoManual, type DestinatarioAviso, type EstadoAviso } from '../../../servicios/avisos';
import { mensajeError } from '../../../servicios/api';

const etiquetas: Record<EstadoAviso, string> = { pendiente: 'Pendiente', enviado: 'Enviado manualmente', entregado: 'Entrega confirmada por el personal', fallido: 'Fallido' };
export default function AvisosManuales() {
    const identidad = useContext(ContextoPanel);
    // Reinicia todos los datos personales cuando cambia la cuenta autorizada.
    return <PanelLayout titulo="Avisos"><Bandeja key={identidad?.acceso.usuarioId ?? 'sin-cuenta'} /></PanelLayout>;
}
function Bandeja() {
    const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0);
    const [resultado, setResultado] = useState<{ clave: string; avisos?: AvisoManual[]; total?: number; error?: string }>({ clave: '' });
    const clave = `${pagina}:${intento}`;
    const actual = resultado.clave === clave ? resultado : undefined;
    useEffect(() => {
        let vigente = true;
        listarAvisos(pagina).then(datos => { if (vigente) setResultado({ clave, ...datos }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [pagina, clave]);
    return <Pagina><EncabezadoTarjeta volver={{ texto: 'Volver al resumen', ruta: '/admin/resumen' }} etiqueta="T-074 · Atención manual" titulo="Avisos por WhatsApp"
        texto="Prepara el mensaje, revísalo y envíalo personalmente desde WhatsApp. Este portal no envía mensajes ni comprueba su entrega." />
        <Preparar alGuardar={() => { setPagina(0); recargar(x => x + 1); }} />
        {!actual && <p role="status">Cargando avisos…</p>}
        {actual?.error && <p role="alert">{actual.error} <button onClick={() => recargar(x => x + 1)}>Reintentar</button></p>}
        {actual?.avisos && <><h2>Seguimiento ({actual.total})</h2>{actual.avisos.map(aviso => <Seguimiento key={`${aviso.id}:${aviso.version}`} aviso={aviso} alGuardar={() => recargar(x => x + 1)} />)}
            <button disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button><span> Página {pagina + 1} </span>
            <button disabled={(pagina + 1) * 20 >= (actual.total ?? 0)} onClick={() => setPagina(x => x + 1)}>Siguiente</button></>}
    </Pagina>;
}
function Preparar({ alGuardar }: { alGuardar: () => void }) {
    const [personas, setPersonas] = useState<DestinatarioAviso[]>([]); const [persona, setPersona] = useState('');
    const [error, setError] = useState(''); const [aviso, setAviso] = useState(''); const [ocupado, setOcupado] = useState(false);
    const [consulta, setConsulta] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [falloBusqueda, setFalloBusqueda] = useState(false);
    const bloqueo = useRef(false); const vigente = useRef(true); const identificador = useRef(crypto.randomUUID());
    useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
    async function buscar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return; bloqueo.current = true; setOcupado(true); setError(''); setPersona(''); setPersonas([]);
        const texto = String(new FormData(e.currentTarget).get('buscar') ?? '').trim();
        setBuscando(true); setConsulta(texto); setFalloBusqueda(false); setAviso('');
        try {
            const datos = await buscarDestinatarios(texto);
            if (vigente.current) {
                setPersonas(datos);
                if (datos.length === 1) setPersona(datos[0].id);
            }
        } catch (error) {
            if (vigente.current) { setFalloBusqueda(true); setError(mensajeError(error)); }
        } finally {
            bloqueo.current = false;
            if (vigente.current) { setOcupado(false); setBuscando(false); }
        }
    }
    async function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const formulario = e.currentTarget; const datos = new FormData(formulario);
        bloqueo.current = true; setOcupado(true); setError(''); setAviso('');
        try {
            await crearAviso({ id: identificador.current, usuarioId: persona, titulo: String(datos.get('titulo')), cuerpoAviso: String(datos.get('mensaje')), tipoAviso: String(datos.get('tipo')) });
            if (vigente.current) { identificador.current = crypto.randomUUID(); formulario.reset(); setPersona(''); setPersonas([]); setConsulta(''); setAviso('Aviso guardado como pendiente. Puedes revisarlo en Seguimiento.'); alGuardar(); }
        } catch (error) { if (vigente.current) setError(mensajeError(error)); }
        finally { bloqueo.current = false; if (vigente.current) setOcupado(false); }
    }
    const elegida = personas.find(p => p.id === persona);
    const canales: Record<string, string> = { portal: 'Portal', correo: 'Correo', telefono: 'Teléfono', whatsapp_manual: 'WhatsApp' };
    const whatsapp = elegida?.canalPreferido === 'whatsapp_manual';
    return <section className="cn-tarjeta"><h2>Preparar un aviso</h2>
        <form onSubmit={buscar} className="tramites-campos"><label>Nombre o identificador del destinatario<input name="buscar" minLength={3} maxLength={100} required disabled={ocupado} placeholder="Escribe al menos 3 caracteres" /></label><button className="boton-panel" disabled={ocupado}>{buscando ? 'Buscando…' : 'Buscar destinatario'}</button></form>
        <div role="status" className="avisos-manuales-resultados">
            {buscando ? 'Buscando destinatarios…' : consulta && !falloBusqueda
                ? personas.length === 0 ? `Sin coincidencias para «${consulta}». Prueba con una parte del nombre de la cuenta activa que tenga teléfono registrado.`
                    : personas.length === 1 ? `Una coincidencia para «${consulta}». Seleccionada automáticamente.`
                        : `${personas.length} coincidencias mostradas para «${consulta}». Elige un destinatario.`
                : null}
        </div>
        {personas.length > 1 && <fieldset className="avisos-manuales-opciones" disabled={ocupado}><legend>Resultados de búsqueda</legend>
            {personas.map(p => <label key={p.id} className="avisos-manuales-cuenta">
                <input type="radio" name="destinatario" value={p.id} checked={persona === p.id} onChange={() => { setPersona(p.id); setError(''); }} />
                <span><strong>{p.nombre}</strong><small>{p.telefono}</small></span>
            </label>)}
        </fieldset>}
        {elegida && <div className="avisos-manuales-seleccion">
            <strong>Destinatario seleccionado</strong>
            <p>{elegida.nombre} · {elegida.telefono}</p>
            <p>Canal preferido: {canales[elegida.canalPreferido ?? ''] ?? 'Sin preferencia'}</p>
            <p>Difusión de comunidad: {elegida.recibirAvisosComunidad ? 'Sí' : 'No'} · Difusión de actividades: {elegida.recibirAvisosActividades ? 'Sí' : 'No'}</p>
        </div>}
        {elegida && <form key={persona} onSubmit={guardar}><fieldset className="tramites-campos" disabled={ocupado}>
            <label>Motivo<select name="tipo"><option value="atencion">Atención individual de una solicitud o consulta</option><option value="comunidad" disabled={!whatsapp || !elegida.recibirAvisosComunidad}>Difusión de comunidad</option><option value="actividad" disabled={!whatsapp || !elegida.recibirAvisosActividades}>Difusión de actividades</option></select></label>
            {(!whatsapp || !elegida.recibirAvisosComunidad || !elegida.recibirAvisosActividades) && <p>Para habilitar un motivo de difusión, la persona debe elegir WhatsApp y activar ese tipo de aviso en su perfil.</p>}
            <label>Título<input name="titulo" maxLength={150} required /></label><label>Mensaje<textarea name="mensaje" maxLength={2000} required /></label>
            <label><input type="checkbox" required /> Revisé el destinatario y la pertinencia del contacto. No incluyo contraseñas ni información sensible.</label>
            <button className="boton-panel" disabled={!persona}>Guardar aviso pendiente</button>
        </fieldset></form>}{error && <p role="alert">{error}</p>}{aviso && <p role="status">{aviso}</p>}
    </section>;
}
function Seguimiento({ aviso, alGuardar }: { aviso: AvisoManual; alGuardar: () => void }) {
    const [enlace, setEnlace] = useState(''); const [error, setError] = useState(''); const [ocupado, setOcupado] = useState(false);
    const bloqueo = useRef(false); const opciones = estadosSiguientes(aviso.estadoEnvio);
    const [mostrandoResultado, setMostrandoResultado] = useState(false);
    const pasos: Record<EstadoAviso, string> = {
        pendiente: 'Revisa el enlace y registra el resultado cuando hayas intentado enviar el aviso.',
        enviado: 'Si comprobaste la entrega en WhatsApp, puedes registrarla aquí.',
        entregado: 'La entrega quedó registrada en el historial.',
        fallido: 'Puedes volver a dejar el aviso pendiente para reintentar.',
    };
    async function ejecutar(accion: () => Promise<void>) {
        if (bloqueo.current) return; bloqueo.current = true; setOcupado(true); setError(''); setEnlace('');
        try { await accion(); } catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setOcupado(false); }
    }
    function registrar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); const datos = new FormData(e.currentTarget);
        void ejecutar(async () => { await registrarResultadoAviso(aviso, String(datos.get('estado')) as EstadoAviso, String(datos.get('nota'))); alGuardar(); });
    }
    return <section className="cn-tarjeta"><h3>{aviso.titulo}</h3><p>{aviso.destinatario}</p><div className="avisos-manuales-seleccion"><strong>Estado actual: {etiquetas[aviso.estadoEnvio]}</strong><p>{pasos[aviso.estadoEnvio]}</p></div><p>Folio: {aviso.id}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{aviso.cuerpoAviso}</p>
        {aviso.estadoEnvio === 'pendiente' && <button className="boton-panel" disabled={ocupado} onClick={() => void ejecutar(async () => setEnlace((await prepararAviso(aviso.id)).enlace))}>Revisar enlace de WhatsApp</button>}
        {enlace && <p><a href={enlace} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir WhatsApp para revisar y enviar manualmente</a>. Abrir este enlace conserva el estado pendiente.</p>}
        {opciones.length > 0 && !mostrandoResultado && <p><button className="boton-panel" type="button"
            disabled={ocupado} onClick={() => setMostrandoResultado(true)}>Registrar resultado en WhatsApp</button></p>}
        {opciones.length > 0 && mostrandoResultado && <form onSubmit={registrar}><fieldset className="tramites-campos" disabled={ocupado}>
            <label>Resultado observado<select name="estado" required defaultValue=""><option value="" disabled>Selecciona el resultado observado</option>{opciones.map(estado => <option value={estado} key={estado}>{etiquetas[estado]}</option>)}</select></label>
            <label>Describe el intento o la evidencia observada<textarea name="nota" maxLength={2000} required /></label>
            <label><input type="checkbox" required /> Confirmo lo ocurrido en WhatsApp. Abrir el enlace no acredita envío ni entrega.</label><button className="boton-panel">Guardar resultado</button><button type="button" onClick={() => setMostrandoResultado(false)}>Cancelar</button>
        </fieldset></form>}
        {error && <p role="alert">{error} <button onClick={alGuardar}>Recargar aviso</button></p>}
        <details><summary>Historial de seguimiento</summary><ul>{aviso.historial.map((h, i) => <li key={i}>{new Date(h.fecha).toLocaleString('es-MX')} · {etiquetas[h.estado]} · {h.nota} · Responsable: {h.actor}</li>)}</ul></details>
    </section>;
}
