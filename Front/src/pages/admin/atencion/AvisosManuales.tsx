import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import PanelLayout from '../PanelLayout';
import { EncabezadoTarjeta, Pagina } from '../contenidoDemo/piezas';
import '../contenidoDemo/Contenidos.css';
import '../../publico/tramites/Tramites.css';
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
    const bloqueo = useRef(false); const vigente = useRef(true); const identificador = useRef(crypto.randomUUID());
    useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
    async function buscar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return; bloqueo.current = true; setOcupado(true); setError(''); setPersona(''); setPersonas([]);
        const texto = String(new FormData(e.currentTarget).get('buscar') ?? '');
        try { const datos = await buscarDestinatarios(texto); if (vigente.current) { setPersonas(datos); setAviso(datos.length ? '' : 'No hay coincidencias.'); } }
        catch (error) { if (vigente.current) setError(mensajeError(error)); }
        finally { bloqueo.current = false; if (vigente.current) setOcupado(false); }
    }
    async function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const formulario = e.currentTarget; const datos = new FormData(formulario);
        bloqueo.current = true; setOcupado(true); setError(''); setAviso('');
        try {
            await crearAviso({ id: identificador.current, usuarioId: persona, titulo: String(datos.get('titulo')), cuerpoAviso: String(datos.get('mensaje')), tipoAviso: String(datos.get('tipo')) });
            if (vigente.current) { identificador.current = crypto.randomUUID(); formulario.reset(); setPersona(''); setPersonas([]); setAviso('Aviso preparado. Todavía no se ha enviado.'); alGuardar(); }
        } catch (error) { if (vigente.current) setError(mensajeError(error)); }
        finally { bloqueo.current = false; if (vigente.current) setOcupado(false); }
    }
    const elegida = personas.find(p => p.id === persona);
    return <section className="cn-tarjeta"><h2>Preparar un aviso</h2>
        <form onSubmit={buscar} className="tramites-campos"><label>Nombre o identificador del destinatario<input name="buscar" minLength={3} maxLength={100} required disabled={ocupado} /></label><button disabled={ocupado}>Buscar</button></form>
        <form onSubmit={guardar}><fieldset className="tramites-campos" disabled={ocupado}>
            <label>Destinatario<select required value={persona} onChange={e => setPersona(e.target.value)}><option value="">Selecciona una cuenta</option>{personas.map(p => <option key={p.id} value={p.id}>{p.nombre} · {p.telefono}</option>)}</select></label>
            {elegida && <p>Teléfono mexicano: {elegida.telefono}. Canal preferido: {elegida.canalPreferido ?? 'Sin preferencia'}. Difusión de comunidad: {elegida.recibirAvisosComunidad ? 'Sí' : 'No'}; actividades: {elegida.recibirAvisosActividades ? 'Sí' : 'No'}.</p>}
            <label>Motivo<select name="tipo"><option value="atencion">Atención individual de una solicitud o consulta</option><option value="comunidad">Difusión de comunidad (requiere preferencia WhatsApp)</option><option value="actividad">Difusión de actividades (requiere preferencia WhatsApp)</option></select></label>
            <label>Título<input name="titulo" maxLength={150} required /></label><label>Mensaje<textarea name="mensaje" maxLength={2000} required /></label>
            <label><input type="checkbox" required /> Revisé el destinatario y la pertinencia del contacto. No incluyo contraseñas ni información sensible.</label>
            <button className="boton-panel" disabled={!persona}>Guardar aviso pendiente</button>
        </fieldset></form>{error && <p role="alert">{error}</p>}{aviso && <p role="status">{aviso}</p>}
    </section>;
}
function Seguimiento({ aviso, alGuardar }: { aviso: AvisoManual; alGuardar: () => void }) {
    const [enlace, setEnlace] = useState(''); const [error, setError] = useState(''); const [ocupado, setOcupado] = useState(false);
    const bloqueo = useRef(false); const opciones = estadosSiguientes(aviso.estadoEnvio);
    async function ejecutar(accion: () => Promise<void>) {
        if (bloqueo.current) return; bloqueo.current = true; setOcupado(true); setError(''); setEnlace('');
        try { await accion(); } catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setOcupado(false); }
    }
    function registrar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); const datos = new FormData(e.currentTarget);
        void ejecutar(async () => { await registrarResultadoAviso(aviso, String(datos.get('estado')) as EstadoAviso, String(datos.get('nota'))); alGuardar(); });
    }
    return <section className="cn-tarjeta"><h3>{aviso.titulo}</h3><p>{aviso.destinatario} · {etiquetas[aviso.estadoEnvio]}</p><p>Folio: {aviso.id}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{aviso.cuerpoAviso}</p>
        {aviso.estadoEnvio === 'pendiente' && <button disabled={ocupado} onClick={() => void ejecutar(async () => setEnlace((await prepararAviso(aviso.id)).enlace))}>Revisar enlace de WhatsApp</button>}
        {enlace && <p><a href={enlace} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir WhatsApp para revisar y enviar manualmente</a>. Abrir este enlace conserva el estado pendiente.</p>}
        {opciones.length > 0 && <form onSubmit={registrar}><fieldset className="tramites-campos" disabled={ocupado}>
            <label>Resultado observado<select name="estado">{opciones.map(estado => <option value={estado} key={estado}>{etiquetas[estado]}</option>)}</select></label>
            <label>Describe el intento o la evidencia observada<textarea name="nota" maxLength={2000} required /></label>
            <label><input type="checkbox" required /> Confirmo lo ocurrido en WhatsApp. Abrir el enlace no acredita envío ni entrega.</label><button>Registrar resultado manual</button>
        </fieldset></form>}
        {error && <p role="alert">{error} <button onClick={alGuardar}>Recargar aviso</button></p>}
        <details><summary>Historial de seguimiento</summary><ul>{aviso.historial.map((h, i) => <li key={i}>{new Date(h.fecha).toLocaleString('es-MX')} · {etiquetas[h.estado]} · {h.nota} · Responsable: {h.actor}</li>)}</ul></details>
    </section>;
}
