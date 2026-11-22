// Atención › Avisos por WhatsApp (T-074, datos reales). Diseño: el de Atención › Espacios.
import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import PanelLayout from '../PanelLayout';
import { Chip, EncabezadoPagina, EstadoVacio, Migas, Tarjeta, type TonoChip } from '../componentes';
import { Bloque } from '../../../components/portal/Esqueleto';
import { IconoBuscar } from '../contenidos/piezas';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { avisosEnMemoria, buscarDestinatarios, crearAviso, listarAvisos, prepararAviso, registrarResultadoAviso, estadosSiguientes, type AvisoManual, type DestinatarioAviso, type EstadoAviso } from '../../../servicios/avisos';
import { mensajeError } from '../../../servicios/api';
import vacioCheck from '../../../assets/admin/vacio-check.svg';
import vacioBuscar from '../../../assets/admin/vacio-search.svg';
import tarjetaUser from '../../../assets/admin/tarjeta-user.svg';
import tarjetaClock from '../../../assets/admin/tarjeta-clock.svg';
import './AvisosManuales.css';

const etiquetas: Record<EstadoAviso, string> = { pendiente: 'Pendiente', enviado: 'Enviado manualmente', entregado: 'Entrega confirmada por el personal', fallido: 'Fallido' };
const tonos: Record<EstadoAviso, TonoChip> = { pendiente: 'dorado', enviado: 'verde', entregado: 'verde-solido', fallido: 'guinda' };
const chips: Record<EstadoAviso, string> = { pendiente: 'Pendiente', enviado: 'Enviado', entregado: 'Entregado', fallido: 'Fallido' };
const POR_PAGINA = 20;
const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export default function AvisosManuales() {
    const identidad = useContext(ContextoPanel);
    // Reinicia todos los datos personales cuando cambia la cuenta autorizada.
    return <PanelLayout titulo="Atención" tema="contenidos paleta"><Bandeja key={identidad?.acceso.usuarioId ?? 'sin-cuenta'} /></PanelLayout>;
}

function Bandeja() {
    const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0);
    const [resultado, setResultado] = useState<{ clave: string; avisos?: AvisoManual[]; total?: number; error?: string }>({ clave: '' });
    const clave = `${pagina}:${intento}`;
    const guardada = avisosEnMemoria(pagina);
    const actual = resultado.clave === clave ? resultado : guardada ? { clave, ...guardada } : undefined;
    useEffect(() => {
        let vigente = true;
        listarAvisos(pagina).then(datos => { if (vigente) setResultado({ clave, ...datos }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [pagina, clave]);
    const paginas = Math.max(1, Math.ceil((actual?.total ?? 0) / POR_PAGINA));
    return <>
        <Migas pasos={[['Avisos']]} />
        <EncabezadoPagina etiqueta="Atención · Avisos por WhatsApp" titulo="Avisos por WhatsApp"
            texto="Prepara el mensaje, revísalo y envíalo personalmente desde WhatsApp. Este portal no envía mensajes ni comprueba su entrega." />

        <div className="contenidos-formulario avisos-diseno">
            <Preparar alGuardar={() => { setPagina(0); recargar(x => x + 1); }} />
            <aside className="contenidos-formulario__lateral">
                <Tarjeta icono={tarjetaClock} titulo="Cómo funciona" subtitulo="Tres pasos para cada aviso.">
                    <ol className="avisos-pasos">
                        <li><strong>Prepara</strong><span>Busca a la persona y escribe el mensaje. Queda pendiente.</span></li>
                        <li><strong>Envía</strong><span>Abre el enlace de WhatsApp y manda el mensaje tú mismo.</span></li>
                        <li><strong>Registra</strong><span>Anota si se envió, si se entregó o si falló.</span></li>
                    </ol>
                </Tarjeta>
            </aside>
        </div>

        <section className="contenidos-lista" aria-labelledby="avisos-seguimiento">
            <div className="contenidos-lista__cabecera">
                <span className="contenidos-lista__icono"><img src={tarjetaClock} alt="" className="at-icono" /></span>
                <div><h2 id="avisos-seguimiento">Seguimiento{actual?.avisos ? ` (${actual.total})` : ''}</h2><p>Cada aviso con su estado y su historial.</p></div>
            </div>
            {!actual ? <div className="avisos-lista" aria-busy="true" aria-label="Cargando avisos">{[0, 1, 2].map(i => <Bloque key={i} clase="avisos-esqueleto" />)}</div>
                : actual.error ? <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar los avisos" texto={actual.error} accion={{ texto: 'Reintentar', alPresionar: () => recargar(x => x + 1) }} />
                : !actual.avisos?.length ? <EstadoVacio icono={vacioCheck} titulo="Todavía no hay avisos" texto="Cuando prepares un aviso aparecerá aquí para darle seguimiento." />
                : <div className="avisos-lista">{actual.avisos.map(aviso => <Seguimiento key={`${aviso.id}:${aviso.version}`} aviso={aviso} alGuardar={() => recargar(x => x + 1)} />)}</div>}
            {(actual?.total ?? 0) > POR_PAGINA && (
                <div className="contenidos-lista__pie"><p>{actual?.total} avisos en total</p>
                    <div className="contenidos-paginas" role="group" aria-label="Páginas">
                        <button type="button" disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button>
                        <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina + 1} de {paginas}</button>
                        <button type="button" disabled={pagina + 1 >= paginas} onClick={() => setPagina(x => x + 1)}>Siguiente</button>
                    </div>
                </div>
            )}
        </section>
    </>;
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
    return <Tarjeta icono={tarjetaUser} titulo="Preparar un aviso" subtitulo="Busca a la persona por su nombre o identificador.">
        <form onSubmit={buscar} className="avisos-buscar">
            <label className="contenidos-buscar"><IconoBuscar />
                <input type="search" name="buscar" minLength={3} maxLength={100} required disabled={ocupado} placeholder="Escribe al menos 3 caracteres" aria-label="Nombre o identificador del destinatario" />
            </label>
            <button className="contenidos-boton contenidos-boton--oscuro" disabled={ocupado}>{buscando ? 'Buscando…' : 'Buscar'}</button>
        </form>
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
                <span className="at-persona__inicial" aria-hidden="true">{p.nombre.charAt(0)}</span>
                <span><strong>{p.nombre}</strong><small>{p.telefono}</small></span>
            </label>)}
        </fieldset>}
        {elegida && <div className="avisos-manuales-seleccion">
            <div className="at-persona">
                <span className="at-persona__inicial" aria-hidden="true">{elegida.nombre.charAt(0)}</span>
                <div><small>Destinatario seleccionado</small><strong>{elegida.nombre} · {elegida.telefono}</strong></div>
            </div>
            <div className="avisos-preferencias">
                <Chip tono="gris">Canal: {canales[elegida.canalPreferido ?? ''] ?? 'Sin preferencia'}</Chip>
                <Chip tono={elegida.recibirAvisosComunidad ? 'verde' : 'gris'}>Comunidad: {elegida.recibirAvisosComunidad ? 'Sí' : 'No'}</Chip>
                <Chip tono={elegida.recibirAvisosActividades ? 'verde' : 'gris'}>Actividades: {elegida.recibirAvisosActividades ? 'Sí' : 'No'}</Chip>
            </div>
        </div>}
        {elegida && <form key={persona} onSubmit={guardar}><fieldset className="avisos-campos" disabled={ocupado}>
            <div className="contenidos-campo"><label htmlFor="aviso-tipo">Motivo</label>
                <select id="aviso-tipo" name="tipo"><option value="atencion">Atención individual de una solicitud o consulta</option><option value="comunidad" disabled={!whatsapp || !elegida.recibirAvisosComunidad}>Difusión de comunidad</option><option value="actividad" disabled={!whatsapp || !elegida.recibirAvisosActividades}>Difusión de actividades</option></select>
                {(!whatsapp || !elegida.recibirAvisosComunidad || !elegida.recibirAvisosActividades) && <span className="contenidos-campo__ayuda">Para habilitar un motivo de difusión, la persona debe elegir WhatsApp y activar ese tipo de aviso en su perfil.</span>}
            </div>
            <div className="contenidos-campo"><label htmlFor="aviso-titulo">Título</label><input id="aviso-titulo" type="text" name="titulo" maxLength={150} required /></div>
            <div className="contenidos-campo"><label htmlFor="aviso-mensaje">Mensaje</label><textarea id="aviso-mensaje" name="mensaje" rows={5} maxLength={2000} required /></div>
            <label className="at-casilla"><input type="checkbox" required /> Revisé el destinatario y la pertinencia del contacto. No incluyo contraseñas ni información sensible.</label>
            <div><button className="contenidos-boton contenidos-boton--oscuro" disabled={!persona}>Guardar aviso pendiente</button></div>
        </fieldset></form>}
        {error && <div className="at-bloque at-bloque--error" role="alert"><strong>Algo salió mal</strong><p>{error}</p></div>}
        {aviso && <div className="at-bloque at-bloque--info" role="status"><strong>Listo</strong><p>{aviso}</p></div>}
    </Tarjeta>;
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
    return <article className={`avisos-tarjeta avisos-tarjeta--${aviso.estadoEnvio}`}>
        <header className="avisos-tarjeta__cabecera">
            <div>
                <p className="at-subtitulo" title={aviso.id}>Folio {aviso.id.slice(0, 8).toUpperCase()}</p>
                <h3>{aviso.titulo}</h3>
                <p className="avisos-tarjeta__para">Para {aviso.destinatario}</p>
            </div>
            <Chip tono={tonos[aviso.estadoEnvio]}>{chips[aviso.estadoEnvio]}</Chip>
        </header>
        <p className="avisos-tarjeta__mensaje">{aviso.cuerpoAviso}</p>
        <p className="avisos-tarjeta__paso">{pasos[aviso.estadoEnvio]}</p>
        <div className="tr-acciones">
            {aviso.estadoEnvio === 'pendiente' && <button type="button" className="contenidos-boton contenidos-boton--oscuro contenidos-boton--chico" disabled={ocupado}
                onClick={() => void ejecutar(async () => setEnlace((await prepararAviso(aviso.id)).enlace))}>Revisar enlace de WhatsApp</button>}
            {opciones.length > 0 && !mostrandoResultado && <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico"
                disabled={ocupado} onClick={() => setMostrandoResultado(true)}>Registrar resultado</button>}
        </div>
        {enlace && <div className="at-bloque at-bloque--info"><strong>Enlace listo</strong>
            <p><a href={enlace} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir WhatsApp para revisar y enviar manualmente</a>. Abrir este enlace conserva el estado pendiente.</p></div>}
        {opciones.length > 0 && mostrandoResultado && <form onSubmit={registrar}><fieldset className="avisos-campos" disabled={ocupado}>
            <div className="contenidos-campo"><label htmlFor={`resultado-${aviso.id}`}>Resultado observado</label>
                <select id={`resultado-${aviso.id}`} name="estado" required defaultValue=""><option value="" disabled>Selecciona el resultado observado</option>{opciones.map(estado => <option value={estado} key={estado}>{etiquetas[estado]}</option>)}</select></div>
            <div className="contenidos-campo"><label htmlFor={`nota-${aviso.id}`}>Describe el intento o la evidencia observada</label>
                <textarea id={`nota-${aviso.id}`} name="nota" rows={3} maxLength={2000} required /></div>
            <label className="at-casilla"><input type="checkbox" required /> Confirmo lo ocurrido en WhatsApp. Abrir el enlace no acredita envío ni entrega.</label>
            <div className="tr-acciones">
                <button className="contenidos-boton contenidos-boton--oscuro contenidos-boton--chico">Guardar resultado</button>
                <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => setMostrandoResultado(false)}>Cancelar</button>
            </div>
        </fieldset></form>}
        {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se guardó</strong><p>{error}</p>
            <p className="tr-acciones"><button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alGuardar}>Recargar aviso</button></p></div>}
        <details className="avisos-historial"><summary>Historial de seguimiento ({aviso.historial.length})</summary>
            <ol className="at-eventos">{aviso.historial.map((h, i) => <li key={i} className="at-eventos--hecho">
                <strong>{etiquetas[h.estado]}</strong><small>{fecha(h.fecha)} · {h.actor}</small>{h.nota && <p className="tr-evento-nota">{h.nota}</p>}
            </li>)}</ol>
        </details>
    </article>;
}
