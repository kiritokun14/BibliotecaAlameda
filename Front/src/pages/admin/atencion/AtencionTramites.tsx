// Atención › Solicitudes de credencial y Propuestas de eventos (datos reales del backend).
// Diseño: el mismo de Atención › Espacios (piezas de ../componentes y clases «contenidos-*»).
import { useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { Chip, EncabezadoPagina, EstadoVacio, Migas, Tarjeta, type TonoChip } from '../componentes';
import { IconoAviso, IconoBuscar, IconoLista, IconoReloj } from '../contenidos/piezas';
import Flujo, { type Etapa, type IconoSiguiente } from './Flujo';
import { partirDescripcion } from './descripcion';
import { CeldaDoble } from './Bandeja';
import { Bloque } from '../../../components/portal/Esqueleto';
import { ContextoPanel, permisoGlobal } from '../../../servicios/accesoPanel';
import { conteosEnMemoria, conteosTramites, consultarTramite, listarTramites, resolverTramite, tramiteEnMemoria, tramitesEnMemoria, estadoTramite, ESTADOS_CREDENCIAL, ESTADOS_PROPUESTA,
    type ListaTramites, type SolicitudAtencion, type TipoTramite } from '../../../servicios/tramites';
import { mensajeError } from '../../../servicios/api';
import PublicarPropuesta from './propuestas/PublicarPropuesta';
import vacioCheck from '../../../assets/admin/vacio-check.svg';
import vacioBuscar from '../../../assets/admin/vacio-search.svg';
import tarjetaUser from '../../../assets/admin/tarjeta-user.svg';
import tarjetaClock from '../../../assets/admin/tarjeta-clock.svg';
import tarjetaInfo from '../../../assets/admin/tarjeta-info.svg';
import tarjetaCheck from '../../../assets/admin/tarjeta-check.svg';
import './AtencionTramites.css';

const POR_PAGINA = 20;

const TONO: Record<string, TonoChip> = {
    recibida: 'guinda', en_revision: 'guinda',
    en_atencion: 'dorado', cita_programada: 'dorado', requiere_correccion: 'dorado', borrador: 'gris',
    atendida: 'verde', aprobada: 'verde',
    rechazada: 'gris', cancelada: 'gris',
};

const TEXTOS = {
    credencial: {
        titulo: 'Solicitudes de credencial',
        descripcion: 'Registra la atención y las citas de cada trámite. Este trámite no emite ni valida una credencial.',
        sustantivo: 'solicitudes', buscarPor: 'folio o nombre',
        vacio: 'Cuando alguien solicite su credencial desde el portal, aparecerá aquí.',
    },
    propuesta: {
        titulo: 'Propuestas de eventos',
        descripcion: 'Revisa, pide correcciones o resuelve propuestas. Aprobarlas no las publica automáticamente.',
        sustantivo: 'propuestas', buscarPor: 'folio o título',
        vacio: 'Cuando alguien proponga una actividad desde el portal, aparecerá aquí.',
    },
} as const;

const fechaHora = (iso?: string | null) => iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha';
const fechaCorta = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const folioCorto = (id: string) => id.slice(0, 8).toUpperCase();
const nombre = (s: SolicitudAtencion) => [s.perfil?.nombres, s.perfil?.primerApellido, s.perfil?.segundoApellido].filter(Boolean).join(' ') || 'Sin nombre';
const tituloSolicitud = (s: SolicitudAtencion) => s.tituloPropuesta || (s.tipoSolicitud === 'renovacion' ? 'Renovación de credencial' : 'Obtención de credencial');

export default function AtencionTramites() {
    const { pathname } = useLocation(); const { folio } = useParams();
    const tipo: TipoTramite = pathname.includes('/credenciales') ? 'credencial' : 'propuesta';
    const base = `/admin/atencion/${tipo === 'credencial' ? 'credenciales' : 'propuestas'}`;
    return <PanelLayout titulo="Atención" tema="contenidos">
        {folio ? <Detalle key={folio} tipo={tipo} folio={folio} base={base} /> : <Lista key={tipo} tipo={tipo} base={base} />}
    </PanelLayout>;
}

// ---------- Bandeja ----------
function Lista({ tipo, base }: { tipo: TipoTramite; base: string }) {
    const textos = TEXTOS[tipo];
    const estados = tipo === 'credencial' ? ESTADOS_CREDENCIAL : ESTADOS_PROPUESTA;
    const [pagina, setPagina] = useState(0); const [filtro, setFiltro] = useState(''); const [busqueda, setBusqueda] = useState('');
    const [escrito, setEscrito] = useState('');
    const [intento, setIntento] = useState(0);
    const clave = JSON.stringify([pagina, filtro, busqueda, intento]);
    const [resultado, setResultado] = useState<{ clave: string; lista?: ListaTramites; error?: string }>({ clave: '' });
    // Mientras llega la respuesta se muestra lo último recibido para esos mismos filtros (si lo hay)
    const guardada = tramitesEnMemoria(tipo, pagina, filtro, busqueda);
    const actual = resultado.clave === clave ? resultado : guardada ? { clave, lista: guardada } : undefined;
    useEffect(() => {
        let vigente = true;
        listarTramites(tipo, false, pagina, filtro, busqueda)
            .then(lista => { if (vigente) setResultado({ clave, lista }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, tipo, pagina, filtro, busqueda]);

    function elegir(estado: string) { setFiltro(estado); setPagina(0); }
    function buscar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setBusqueda(escrito.trim()); setPagina(0); }
    function quitarFiltros() { setEscrito(''); setBusqueda(''); elegir(''); }

    const lista = actual?.lista;
    const paginas = lista ? Math.max(1, Math.ceil(lista.total / POR_PAGINA)) : 1;
    const opciones = [['', 'Todas'], ...Object.entries(estados).filter(([valor]) => valor !== 'borrador')];

    return <>
        <Migas pasos={[[textos.titulo]]} />
        <EncabezadoPagina etiqueta={`Atención · ${textos.titulo}`} titulo={textos.titulo} texto={textos.descripcion} />
        <ResumenBandeja tipo={tipo} filtro={filtro} alElegir={elegir} />

        <section className="contenidos-lista" aria-labelledby="tramites-lista-titulo">
            <div className="contenidos-lista__cabecera">
                <span className="contenidos-lista__icono"><IconoLista /></span>
                <div>
                    <h2 id="tramites-lista-titulo">Bandeja de {textos.sustantivo}</h2>
                    <p>{lista ? `${lista.total} ${lista.total === 1 ? textos.sustantivo.slice(0, -1) : textos.sustantivo}${filtro ? ` con estado «${estados[filtro]}»` : ''}${busqueda ? ` que coinciden con «${busqueda}»` : ''}.` : 'Consultando la bandeja…'}</p>
                </div>
            </div>

            <div className="contenidos-lista__herramientas">
                <div className="contenidos-filtros" role="group" aria-label="Filtrar por estado">
                    {opciones.map(([valor, texto]) => (
                        <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => elegir(valor)}
                            className={`contenidos-filtro${filtro === valor ? ' contenidos-filtro--activo' : ''}`}>{texto}</button>
                    ))}
                </div>
                <form className="contenidos-buscar" role="search" onSubmit={buscar}>
                    <IconoBuscar />
                    <input type="search" maxLength={100} placeholder={`Buscar por ${textos.buscarPor}`} aria-label={`Buscar por ${textos.buscarPor}`}
                        value={escrito} onChange={e => { setEscrito(e.target.value); if (!e.target.value) { setBusqueda(''); setPagina(0); } }} />
                </form>
            </div>

            {!actual ? (
                <div className="contenidos-tabla" aria-busy="true" aria-label="Cargando solicitudes">
                    {[0, 1, 2, 3].map(i => <Bloque key={i} clase="tr-esqueleto" />)}
                </div>
            ) : actual.error ? (
                <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar la bandeja" texto={actual.error}
                    accion={{ texto: 'Reintentar', alPresionar: () => setIntento(x => x + 1) }} />
            ) : !lista?.solicitudes.length ? (
                filtro || busqueda
                    ? <EstadoVacio icono={vacioBuscar} titulo="Sin resultados" texto={`No encontramos ${textos.sustantivo} con esos filtros.`}
                        accion={{ texto: 'Quitar filtros', alPresionar: quitarFiltros }} />
                    : <EstadoVacio icono={vacioCheck} titulo={`No hay ${textos.sustantivo} por ahora`} texto={textos.vacio} />
            ) : (
                <div className="contenidos-tabla tr-tabla" tabIndex={0} role="table" aria-label={`Bandeja de ${textos.sustantivo}`}>
                    <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                        <span role="columnheader">Folio</span>
                        <span role="columnheader">{tipo === 'credencial' ? 'Trámite' : 'Propuesta'}</span>
                        <span role="columnheader">Persona solicitante</span>
                        <span role="columnheader">Recibida</span>
                        <span role="columnheader">Estado</span>
                        <span role="columnheader">Acción</span>
                    </div>
                    {lista.solicitudes.map(s => {
                        const estado = estadoTramite(s);
                        const pendiente = ['recibida', 'en_revision'].includes(estado);
                        return <div key={s.id} className="contenidos-tabla__fila" role="row">
                            <span role="cell" className="contenidos-tabla__folio" title={s.id}>{folioCorto(s.id)}</span>
                            <span role="cell" className="at-celda"><CeldaDoble arriba={tituloSolicitud(s)} abajo={s.tipoPropuesta || (s.fechaCita ? `Cita: ${fechaHora(s.fechaCita)}` : 'Sin cita')} /></span>
                            <span role="cell" className="at-celda"><CeldaDoble arriba={nombre(s)} abajo={s.perfil?.telefono || 'Sin teléfono'} /></span>
                            <span role="cell">{fechaCorta(s.creadaEn)}</span>
                            <span role="cell"><Chip tono={TONO[estado] ?? 'gris'}>{estados[estado] ?? estado}</Chip></span>
                            <span role="cell">
                                <Link to={`${base}/${s.id}`} className="contenidos-tabla__accion">
                                    {pendiente ? 'Atender' : 'Ver'}<span className="solo-lectores"> {folioCorto(s.id)}</span>
                                </Link>
                            </span>
                        </div>;
                    })}
                </div>
            )}

            {lista && lista.total > POR_PAGINA && (
                <div className="contenidos-lista__pie">
                    <p>Mostrando {pagina * POR_PAGINA + 1} a {pagina * POR_PAGINA + lista.solicitudes.length} de {lista.total}</p>
                    <div className="contenidos-paginas" role="group" aria-label="Páginas">
                        <button type="button" disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>‹ Anterior</button>
                        <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina + 1} de {paginas}</button>
                        <button type="button" disabled={pagina + 1 >= paginas} onClick={() => setPagina(x => x + 1)}>Siguiente ›</button>
                    </div>
                </div>
            )}
        </section>
    </>;
}

// ---------- Detalle ----------
function Detalle({ tipo, folio, base }: { tipo: TipoTramite; folio: string; base: string }) {
    const { pathname } = useLocation();
    const identidad = useContext(ContextoPanel);
    const textos = TEXTOS[tipo];
    const estados = tipo === 'credencial' ? ESTADOS_CREDENCIAL : ESTADOS_PROPUESTA;
    const [intento, setIntento] = useState(0);
    const [resultado, setResultado] = useState<{ intento: number; solicitud?: SolicitudAtencion; error?: string }>();
    useEffect(() => {
        let vigente = true;
        consultarTramite(tipo, folio)
            .then(solicitud => { if (vigente) setResultado({ intento, solicitud }); })
            .catch(error => { if (vigente) setResultado({ intento, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [tipo, folio, intento]);
    const guardada = tramiteEnMemoria(tipo, folio);
    const actual = resultado?.intento === intento ? resultado : guardada ? { intento, solicitud: guardada } : undefined;
    const recargar = () => setIntento(x => x + 1);
    const s = actual?.solicitud;
    const estado = s ? estadoTramite(s) : '';

    return <>
        <Migas pasos={[[textos.titulo, base], [folioCorto(folio)]]} />
        <EncabezadoPagina volver={{ texto: `Volver a ${textos.titulo.toLowerCase()}`, ruta: base }}
            etiqueta={`Folio ${folioCorto(folio)}`} titulo={s ? tituloSolicitud(s) : 'Solicitud'}
            texto={s ? `Recibida el ${fechaHora(s.creadaEn)} · última actualización ${fechaHora(s.actualizadaEn ?? s.actualizadoEn)}` : 'Consultando la solicitud…'}
            accion={s && <Chip tono={TONO[estado] ?? 'gris'}>{estados[estado] ?? estado}</Chip>} />

        {s && <Flujo {...flujoDe(tipo, s)} />}

        {!actual ? (
            <div className="contenidos-formulario" aria-busy="true">
                <div className="at-columna"><Bloque clase="tr-esqueleto tr-esqueleto--alto" /><Bloque clase="tr-esqueleto tr-esqueleto--alto" /></div>
                <Bloque clase="tr-esqueleto tr-esqueleto--alto" />
            </div>
        ) : actual.error || !s ? (
            <EstadoVacio icono={vacioBuscar} titulo="No pudimos abrir la solicitud" texto={actual.error ?? 'La solicitud no existe.'}
                accion={{ texto: 'Reintentar', alPresionar: recargar }} />
        ) : (
            <div className="contenidos-formulario">
                <div className="at-columna">
                    <Tarjeta icono={tarjetaInfo} titulo="Datos de la solicitud" subtitulo={tipo === 'credencial' ? 'Lo que la persona registró en el portal.' : 'La propuesta tal como la envió la persona.'}>
                        <DatosSolicitud tipo={tipo} solicitud={s} />
                    </Tarjeta>

                    <Tarjeta variante="decision" icono={tarjetaCheck} titulo="Registrar atención o resolución" subtitulo="La persona verá el nuevo estado y tus observaciones en su perfil.">
                        <Resolver key={s.actualizadaEn ?? s.actualizadoEn} tipo={tipo} solicitud={s} alGuardar={recargar} />
                    </Tarjeta>

                    {s.estadoRevision === 'aprobada' && (pathname.endsWith('/publicar')
                        ? <PublicarPropuesta key={s.actualizadoEn} solicitud={s} />
                        : <div className="at-bloque at-bloque--info">
                            <strong>{s.actividadId ? 'La propuesta ya tiene una actividad vinculada' : 'Falta programarla y publicarla'}</strong>
                            <p>{s.actividadId ? 'Puedes consultarla en la agenda publicada.' : 'Aprobar una propuesta no la publica: programa la actividad por separado.'}</p>
                            <p className="tr-acciones tr-acciones--separado">{s.actividadId
                                ? <Link className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" to="/eventos/todas">Consultar la agenda</Link>
                                : identidad && permisoGlobal(identidad.acceso, 'publicar_contenidos') && <Link className="contenidos-boton contenidos-boton--oscuro contenidos-boton--chico" to={`${base}/${s.id}/publicar`}>Programar y publicar en Eventos</Link>}</p>
                        </div>)}
                </div>

                <aside className="contenidos-formulario__lateral tr-lateral">
                    <Tarjeta icono={tarjetaUser} titulo="Persona solicitante">
                        <div className="at-persona">
                            <span className="at-persona__inicial" aria-hidden="true">{nombre(s).charAt(0)}</span>
                            <div><small>Nombre</small><strong>{nombre(s)}</strong></div>
                        </div>
                        {s.perfil?.telefono
                            ? <a className="tr-telefono" href={`tel:${s.perfil.telefono}`}><span aria-hidden="true">☎</span><span><small>Teléfono</small><strong>{s.perfil.telefono}</strong></span></a>
                            : <p className="contenidos-campo__ayuda">Sin teléfono registrado.</p>}
                    </Tarjeta>
                    <Tarjeta icono={tarjetaClock} titulo="Seguimiento" subtitulo={`${s.historial.length + 1} ${s.historial.length ? 'movimientos' : 'movimiento'} registrados.`} className="tr-seguimiento">
                        <ol className="tr-eventos" tabIndex={0} aria-label="Historial de la solicitud">
                            <li className="tr-eventos--hecho"><strong>Solicitud registrada</strong><small>{fechaHora(s.creadaEn)}</small></li>
                            {s.historial.map((h, i) => (
                                <li key={i} className={i === s.historial.length - 1 ? 'tr-eventos--ultimo' : 'tr-eventos--hecho'}>
                                    <strong>{estados[h.estadoNuevo] ?? h.estadoNuevo}</strong>
                                    <small>{fechaHora(h.fecha)}</small>
                                    {h.nota && <p className="tr-evento-nota">{h.nota}</p>}
                                    {h.acuerdoDireccion && <p className="tr-evento-nota">Acuerdo de dirección: {h.acuerdoDireccion.responsable} · {h.acuerdoDireccion.fecha} · Ref. {h.acuerdoDireccion.referencia}</p>}
                                </li>
                            ))}
                        </ol>
                        {s.estadoSolicitud === 'atendida' && <p className="contenidos-campo__ayuda">Registrar la atención no emite ni valida una credencial.</p>}
                    </Tarjeta>
                </aside>
            </div>
        )}
    </>;
}

// ---------- Formulario de decisión ----------
function Resolver({ tipo, solicitud: s, alGuardar }: { tipo: TipoTramite; solicitud: SolicitudAtencion; alGuardar: () => void }) {
    const identidad = useContext(ContextoPanel);
    const estado = estadoTramite(s);
    const opciones = tipo === 'propuesta' ? estado === 'en_revision' ? ['requiere_correccion', 'aprobada', 'rechazada'] : []
        : estado === 'recibida' ? ['en_atencion', 'cita_programada', 'rechazada', 'cancelada'] : ['en_atencion', 'cita_programada'].includes(estado) ? ['en_atencion', 'cita_programada', 'atendida', 'rechazada', 'cancelada'].filter(e => e !== estado || e === 'cita_programada') : [];
    const [decision, setDecision] = useState(opciones[0] ?? ''); const [error, setError] = useState(''); const [guardando, setGuardando] = useState(false); const bloqueo = useRef(false);
    const etiquetas = tipo === 'credencial' ? ESTADOS_CREDENCIAL : ESTADOS_PROPUESTA;
    const requiereAcuerdo = tipo === 'propuesta' && ['aprobada', 'rechazada'].includes(decision);
    const notaObligatoria = tipo === 'propuesta' || ['rechazada', 'cancelada'].includes(decision);
    if (tipo === 'propuesta' && s.propuestoPor === identidad?.acceso.usuarioId)
        return <div className="at-bloque"><strong>No puedes resolver tu propia propuesta</strong><p>Otra persona autorizada debe aprobarla, rechazarla o pedir correcciones.</p></div>;
    if (!opciones.length)
        return <div className="at-bloque"><strong>Sin decisiones pendientes</strong><p>Esta solicitud ya está {(etiquetas[estado] ?? estado).toLowerCase()}; no hay más cambios de estado posibles.</p></div>;
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const f = new FormData(e.currentTarget); const nota = String(f.get('nota') ?? '').trim();
        setError('');
        if (notaObligatoria && !nota) return setError('Escribe las observaciones o el motivo.');
        const acuerdo = requiereAcuerdo ? { responsable: String(f.get('responsableDireccion') ?? '').trim(), fecha: String(f.get('fechaAcuerdo') ?? ''), referencia: String(f.get('referenciaAcuerdo') ?? '').trim() } : undefined;
        if (acuerdo && (!acuerdo.responsable || !acuerdo.fecha || !acuerdo.referencia)) return setError('Completa quién emitió el acuerdo de dirección, la fecha y su referencia.');
        let cita: string | undefined;
        if (decision === 'cita_programada') {
            const fecha = new Date(String(f.get('cita')));
            if (!Number.isFinite(fecha.getTime()) || fecha.getTime() <= Date.now()) return setError('Elige una fecha y hora futuras para la cita.');
            cita = fecha.toISOString();
        }
        bloqueo.current = true; setGuardando(true);
        try { await resolverTramite(tipo, s, decision, nota, cita, acuerdo); alGuardar(); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    return <form onSubmit={enviar} className="tr-formulario">
        <fieldset disabled={guardando} className="tr-campos">
            <legend className="contenidos-campo__etiqueta">Decisión</legend>
            <div className="contenidos-filtros tr-decisiones">
                {opciones.map(op => (
                    <label key={op} className={`contenidos-filtro${decision === op ? ' contenidos-filtro--activo' : ''}`}>
                        <input type="radio" name="decision" value={op} checked={decision === op} onChange={() => setDecision(op)} className="tr-oculto" />
                        {etiquetas[op]}
                    </label>
                ))}
            </div>
            {decision === 'cita_programada' && <div className="contenidos-campo"><label htmlFor="tr-cita">Fecha y hora de la cita</label>
                <input id="tr-cita" name="cita" type="datetime-local" required /><span className="contenidos-campo__ayuda">Hora local de este equipo.</span></div>}
            {requiereAcuerdo && <>
                <p className="contenidos-campo__ayuda">Registra el acuerdo emitido por dirección. Esta acción no publica ni reserva la actividad.</p>
                <div className="at-fila">
                    <div className="contenidos-campo"><label htmlFor="tr-responsable">Quién emitió el acuerdo</label><input id="tr-responsable" type="text" name="responsableDireccion" maxLength={200} required /></div>
                    <div className="contenidos-campo"><label htmlFor="tr-fecha">Fecha del acuerdo</label><input id="tr-fecha" name="fechaAcuerdo" type="date" required /></div>
                </div>
                <div className="contenidos-campo"><label htmlFor="tr-referencia">Referencia (folio, oficio o minuta)</label><input id="tr-referencia" type="text" name="referenciaAcuerdo" maxLength={500} required /></div>
            </>}
            <div className="contenidos-campo">
                <label htmlFor="tr-nota">Observaciones para la persona solicitante{notaObligatoria && <span className="contenidos-campo__obligatorio"> *</span>}</label>
                <textarea id="tr-nota" name="nota" rows={4} maxLength={tipo === 'credencial' ? 1000 : 5000} required={notaObligatoria}
                    placeholder={notaObligatoria ? 'Explica el motivo o lo que debe corregir.' : 'Opcional: indicaciones para la persona.'} />
            </div>
            <label className="at-casilla"><input type="checkbox" required /> Revisé la solicitud y confirmo esta decisión.</label>
            {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se guardó la decisión</strong><p>{error}</p>
                <p className="tr-acciones"><button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alGuardar}>Recargar versión actual</button></p></div>}
            <div className="tr-acciones">
                <button className={`contenidos-boton ${['rechazada', 'cancelada'].includes(decision) ? 'at-boton--guinda-lleno' : 'contenidos-boton--oscuro'}`}>
                    {guardando ? 'Guardando…' : `Confirmar: ${etiquetas[decision]}`}
                </button>
            </div>
        </fieldset>
    </form>;
}

// ---------- Resumen de la bandeja (mismo bloque «Accesos rápidos» que Espacios) ----------
const IconoPalomita = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
type TarjetaResumen = { estados: string[]; filtro: string; titulo: string; texto: string; enlace: string; tono: 'gris' | 'guinda' | 'azul'; icono: ReactNode };
const RESUMEN: Record<TipoTramite, TarjetaResumen[]> = {
    credencial: [
        { estados: ['recibida'], filtro: 'recibida', titulo: 'Por atender', texto: 'Recibidas que nadie ha revisado.', enlace: 'Ver recibidas', tono: 'gris', icono: <IconoReloj /> },
        { estados: ['en_atencion', 'cita_programada'], filtro: 'cita_programada', titulo: 'En proceso', texto: 'En atención o con cita de cotejo.', enlace: 'Ver con cita', tono: 'guinda', icono: <IconoAviso /> },
        { estados: ['atendida'], filtro: 'atendida', titulo: 'Atendidas', texto: 'Trámites concluidos.', enlace: 'Ver atendidas', tono: 'azul', icono: <IconoPalomita /> },
    ],
    propuesta: [
        { estados: ['en_revision'], filtro: 'en_revision', titulo: 'En revisión', texto: 'Esperan tu decisión.', enlace: 'Ver en revisión', tono: 'gris', icono: <IconoReloj /> },
        { estados: ['requiere_correccion'], filtro: 'requiere_correccion', titulo: 'Con correcciones', texto: 'Esperan que la persona corrija.', enlace: 'Ver correcciones', tono: 'guinda', icono: <IconoAviso /> },
        { estados: ['aprobada'], filtro: 'aprobada', titulo: 'Aprobadas', texto: 'Listas para programar y publicar.', enlace: 'Ver aprobadas', tono: 'azul', icono: <IconoPalomita /> },
    ],
};

function ResumenBandeja({ tipo, filtro, alElegir }: { tipo: TipoTramite; filtro: string; alElegir: (estado: string) => void }) {
    const [conteo, setConteo] = useState(() => conteosEnMemoria(tipo));
    const [fallo, setFallo] = useState(false);
    useEffect(() => {
        let vigente = true;
        conteosTramites(tipo).then(c => { if (vigente) setConteo(c); }).catch(() => { if (vigente) setFallo(true); });
        return () => { vigente = false; };
    }, [tipo]);
    return (
        <section className="contenidos-resumen tr-resumen" aria-labelledby="tramites-resumen-titulo">
            <h2 id="tramites-resumen-titulo">Accesos rápidos</h2>
            <div className="contenidos-resumen__tarjetas">
                {RESUMEN[tipo].map(t => (
                    <article key={t.filtro} className={`contenidos-resumen__tarjeta contenidos-resumen__tarjeta--${t.tono}${filtro === t.filtro ? ' at-tarjeta--activa' : ''}`}>
                        <div className="contenidos-resumen__fila">
                            <span className="contenidos-resumen__icono">{t.icono}</span>
                            <button type="button" className="contenidos-resumen__enlace" aria-pressed={filtro === t.filtro}
                                onClick={() => alElegir(filtro === t.filtro ? '' : t.filtro)}>{t.enlace}</button>
                        </div>
                        {conteo ? <p className="contenidos-resumen__cifra">{t.estados.reduce((suma, e) => suma + (conteo.porEstado[e] ?? 0), 0)}</p>
                            : fallo ? <p className="contenidos-resumen__cifra" title="No se pudo contar">—</p> : <Bloque clase="tr-resumen__cifra--cargando" />}
                        <p className="contenidos-resumen__titulo">{t.titulo}</p>
                        <p className="contenidos-resumen__texto">{t.texto}{conteo && conteo.total > conteo.revisadas ? ` (de las ${conteo.revisadas} más recientes)` : ''}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

// ---------- Etapas y siguiente paso de cada trámite ----------
const ETAPAS: Record<TipoTramite, Etapa[]> = {
    credencial: [
        { id: 'recibida', texto: 'Recibida' },
        { id: 'en_atencion', texto: 'En atención', opcional: true },
        { id: 'cita_programada', texto: 'Cita de cotejo', opcional: true },
        { id: 'atendida', texto: 'Atendida' },
    ],
    propuesta: [
        { id: 'en_revision', texto: 'En revisión' },
        { id: 'requiere_correccion', texto: 'Corrección', opcional: true },
        { id: 'aprobada', texto: 'Aprobada' },
        { id: 'publicada', texto: 'Publicada en Eventos' },
    ],
};

type Siguiente = { titulo: string; texto: string; tono?: 'verde' | 'dorado' | 'gris' | 'guinda'; icono?: IconoSiguiente };
const SIGUIENTE: Record<string, Siguiente> = {
    recibida: { titulo: 'Revisa la solicitud', texto: 'Comprueba los datos de la persona y márcala en atención, o agenda directamente la cita de cotejo.', tono: 'dorado' },
    en_atencion: { titulo: 'Agenda la cita de cotejo', texto: 'Acuerda con la persona el día para revisar sus documentos, o registra que ya se atendió.', tono: 'dorado' },
    cita_programada: { titulo: 'Espera a la persona en su cita', texto: 'Cuando acuda y revises sus documentos, registra la solicitud como atendida.', tono: 'dorado' },
    atendida: { titulo: 'Trámite concluido', texto: 'Se registró la atención. Recuerda que esto no emite la credencial automáticamente.' },
    en_revision: { titulo: 'Decide sobre la propuesta', texto: 'Apruébala, recházala o pide correcciones. Aprobar o rechazar requiere el acuerdo de dirección.', tono: 'dorado' },
    requiere_correccion: { titulo: 'Esperando a la persona', texto: 'Pediste correcciones. Cuando la persona reenvíe su propuesta, volverá a revisión.', tono: 'gris' },
    aprobada: { titulo: 'Programa y publica la actividad', texto: 'La propuesta está aprobada, pero todavía no aparece en Eventos. Prográmala y publícala.', tono: 'dorado' },
    publicada: { titulo: 'Actividad publicada', texto: 'La propuesta ya tiene su actividad en la agenda de Eventos.', icono: 'publicado' },
    rechazada: { titulo: 'Solicitud rechazada', texto: 'El trámite quedó cerrado. La persona puede ver el motivo en su perfil.', tono: 'guinda' },
    cancelada: { titulo: 'Solicitud cancelada', texto: 'El trámite quedó cerrado sin atenderse.', tono: 'guinda' },
};

function flujoDe(tipo: TipoTramite, s: SolicitudAtencion) {
    const estado = estadoTramite(s);
    const actual = tipo === 'propuesta' && estado === 'aprobada' && s.actividadId ? 'publicada' : estado;
    const ocurridas = [...s.historial.map(h => h.estadoNuevo), tipo === 'credencial' ? 'recibida' : 'en_revision'];
    const final = ['rechazada', 'cancelada'].includes(estado) ? { id: estado, texto: estado === 'rechazada' ? 'Rechazada' : 'Cancelada' } : undefined;
    const siguiente: Siguiente = SIGUIENTE[actual] ?? { titulo: 'Sin acciones pendientes', texto: 'Este trámite no requiere nada por ahora.', tono: 'gris' };
    return { etapas: ETAPAS[tipo], actual, final, ocurridas, siguiente };
}

// ---------- Datos de la solicitud: lo clave arriba, el resto en filas ----------
function DatosSolicitud({ tipo, solicitud: s }: { tipo: TipoTramite; solicitud: SolicitudAtencion }) {
    const cita = s.fechaCita ? new Date(s.fechaCita).toLocaleString('es-MX', { timeZone: 'America/Mazatlan', dateStyle: 'medium', timeStyle: 'short' }) : null;
    const clave: [string, string][] = tipo === 'credencial'
        ? [['Trámite', s.tipoSolicitud === 'renovacion' ? 'Renovación' : 'Obtención'], ['Recibida', fechaCorta(s.creadaEn)], ['Cita de cotejo', cita ? `${cita} (Tepic)` : 'Sin cita']]
        : [['Tipo', s.tipoPropuesta || '—'], ['Recibida', fechaCorta(s.creadaEn)], ['Frecuencia', s.frecuenciaReunion || '—']];
    const filas: [string, string | undefined][] = tipo === 'propuesta'
        ? [['Público al que va dirigida', s.publicoDirigido], ['Días solicitados', s.diasSolicitados], ['Horario solicitado', s.horarioSolicitado], ['Espacio que necesita', s.necesidadEspacio]]
        : [];
    const observaciones = s.observacionesInstitucionales ?? s.observaciones;
    return <div className="tr-datos">
        <div className="tr-datos__clave">
            {clave.map(([etiqueta, valor]) => <div key={etiqueta}><span>{etiqueta}</span><strong>{valor}</strong></div>)}
        </div>
        {filas.length > 0 && <dl className="tr-datos__filas">
            {filas.map(([etiqueta, valor]) => <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor || '—'}</dd></div>)}
        </dl>}
        {s.descripcion && <div className="tr-datos__bloque"><p className="at-subtitulo">Descripción</p><Descripcion texto={s.descripcion} /></div>}
        {observaciones && <div className="tr-datos__bloque tr-datos__bloque--nota">
            <p className="at-subtitulo">{tipo === 'credencial' && !s.observacionesInstitucionales ? 'Comentario de la persona' : 'Observaciones registradas'}</p>
            <p className="tr-datos__texto">{observaciones}</p>
        </div>}
        <p className="tr-datos__folio">Folio completo: <span>{s.id}</span></p>
    </div>;
}

// ---------- Descripción: el portal la guarda como texto libre con renglones «Etiqueta: valor» ----------
// Se separa en párrafos, subtítulos (renglones que terminan en «:») y datos (etiqueta y valor) para leerla mejor.
function Descripcion({ texto }: { texto: string }) {
    return <div className="tr-descripcion">
        {partirDescripcion(texto).map((bloque, i) =>
            bloque.tipo === 'parrafo' ? <p key={i} className="tr-datos__texto">{bloque.texto}</p>
            : bloque.tipo === 'subtitulo' ? <p key={i} className="tr-descripcion__subtitulo">{bloque.texto}</p>
            : <dl key={i} className="tr-descripcion__datos">
                {bloque.pares.map(([etiqueta, valor], j) => <div key={j}><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}
            </dl>)}
    </div>;
}
