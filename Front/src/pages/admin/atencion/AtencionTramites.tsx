// Atención › Solicitudes de credencial y Propuestas de eventos (datos reales del backend).
// Diseño: el mismo de Atención › Espacios (piezas de ../componentes y clases «contenidos-*»).
import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { EstadoVacio, Migas, Tarjeta, type TonoChip } from '../componentes';
import { Buscador, Chip as ChipPz, Cifra, Encabezado, FiltrosAvanzados, Icono, Plegable, Tarjeta as TarjetaPz, Vacio, type NombreIcono, type TonoEstado } from '../piezasPanel';
import Flujo, { type Etapa, type IconoSiguiente } from './Flujo';
import { partirDescripcion } from './descripcion';
import { Bloque } from '../../../components/portal/Esqueleto';
import { ContextoPanel, permisoGlobal } from '../../../servicios/accesoPanel';
import { conteosEnMemoria, conteosTramites, consultarTramite, listarTramites, resolverTramite, tramiteEnMemoria, tramitesEnMemoria, estadoTramite, ESTADOS_CREDENCIAL, ESTADOS_PROPUESTA,
    type ListaTramites, type SolicitudAtencion, type TipoTramite } from '../../../servicios/tramites';
import { mensajeError } from '../../../servicios/api';
import PublicarPropuesta from './propuestas/PublicarPropuesta';
import MapaDonde from './MapaDonde';
import vacioBuscar from '../../../assets/admin/vacio-search.svg';
import tarjetaUser from '../../../assets/admin/tarjeta-user.svg';
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
    return <PanelLayout titulo="Atención" tema="contenidos paleta">
        {folio ? <Detalle key={folio} tipo={tipo} folio={folio} base={base} /> : <Lista key={tipo} tipo={tipo} base={base} />}
    </PanelLayout>;
}

// ---------- Bandeja (rehecha con las piezas del panel, 22 nov 2026) ----------
const ICONO_TRAMITE: Record<TipoTramite, NombreIcono> = { credencial: 'credencial', propuesta: 'propuesta' };
const diasDesde = (iso?: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : 0);
const esperando = (iso?: string | null) => { const d = diasDesde(iso); return d === 0 ? 'Llegó hoy' : d === 1 ? 'Espera desde ayer' : `Espera desde hace ${d} días`; };

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
    // La búsqueda se aplica al dejar de escribir (la hace el servidor)
    useEffect(() => {
        const espera = window.setTimeout(() => { if (escrito.trim() !== busqueda) { setBusqueda(escrito.trim()); setPagina(0); } }, 400);
        return () => window.clearTimeout(espera);
    }, [escrito, busqueda]);
    const conteo = useConteo(tipo);

    function elegir(estado: string) { setFiltro(estado); setPagina(0); }
    function quitarFiltros() { setEscrito(''); setBusqueda(''); elegir(''); }

    const lista = actual?.lista;
    const paginas = lista ? Math.max(1, Math.ceil(lista.total / POR_PAGINA)) : 1;
    const opciones = Object.entries(estados).filter(([valor]) => valor !== 'borrador');
    const cuantas = (e: string[]) => (conteo ? e.reduce((suma, x) => suma + (conteo.porEstado[x] ?? 0), 0) : '…');
    const pendientes = (lista?.solicitudes ?? []).filter(s => ['recibida', 'en_revision'].includes(estadoTramite(s)))
        .sort((a, b) => (a.creadaEn ?? '').localeCompare(b.creadaEn ?? '')).slice(0, 4);

    return <>
        <Migas pasos={[[textos.titulo]]} />
        <div className="pz-pagina">
            <Encabezado titulo={textos.titulo} texto={textos.descripcion}>
                {RESUMEN[tipo].map((t, n) => (
                    <Cifra key={t.filtro} icono={t.icono} tono={n === 0 ? 'vino' : undefined} valor={cuantas(t.estados)} texto={t.titulo.toLowerCase()}
                        activa={filtro === t.filtro} alPresionar={() => elegir(filtro === t.filtro ? '' : t.filtro)} />
                ))}
            </Encabezado>

            <div className="pz-columnas">
                <TarjetaPz icono={ICONO_TRAMITE[tipo]} id="tramites-lista" titulo={`Bandeja de ${textos.sustantivo}`} className="pz-pendientes"
                    texto={lista ? `${lista.total} ${lista.total === 1 ? textos.sustantivo.slice(0, -1) : textos.sustantivo}${filtro ? ` con estado «${estados[filtro]}»` : ''}` : 'Consultando la bandeja…'}>
                    <div className="pz-herramientas">
                        <Buscador etiqueta={`Buscar por ${textos.buscarPor}`} placeholder={`Buscar por ${textos.buscarPor}`} valor={escrito} alCambiar={setEscrito}>
                            <FiltrosAvanzados activos={filtro ? 1 : 0} alQuitar={() => elegir('')} grupos={[{ titulo: 'Estado', valor: filtro, alCambiar: elegir,
                                opciones: [{ valor: '', texto: 'Todas', cantidad: conteo?.total }, ...opciones.map(([valor, texto]) => ({ valor, texto, cantidad: conteo ? conteo.porEstado[valor] ?? 0 : undefined }))] }]} />
                        </Buscador>
                    </div>
                    {!actual ? (
                        <div className="contenidos-tabla" aria-busy="true" aria-label="Cargando solicitudes">{[0, 1, 2, 3].map(i => <Bloque key={i} clase="tr-esqueleto" />)}</div>
                    ) : actual.error ? (
                        <Vacio icono="alerta" titulo="No pudimos cargar la bandeja" texto={actual.error}
                            accion={<button type="button" className="pz-boton pz-boton--chico" onClick={() => setIntento(x => x + 1)}>Reintentar</button>} />
                    ) : !lista?.solicitudes.length ? (
                        filtro || busqueda
                            ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto={`No encontramos ${textos.sustantivo} con esos filtros.`}
                                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={quitarFiltros}>Quitar filtros</button>} />
                            : <Vacio icono="check" titulo={`No hay ${textos.sustantivo} por ahora`} texto={textos.vacio} />
                    ) : (
                        <div className="pz-grupos" tabIndex={0} role="region" aria-label={`Bandeja de ${textos.sustantivo}`}>
                            <ul className="pz-filas">
                                {lista.solicitudes.map(s => {
                                    const estado = estadoTramite(s);
                                    const pendiente = ['recibida', 'en_revision'].includes(estado);
                                    return <li key={s.id}>
                                        <article className={`pz-fila ba-fila${pendiente ? ' pz-fila--espera' : ''}`}>
                                            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={ICONO_TRAMITE[tipo]} /></span>
                                            <div className="pz-fila__textos">
                                                <h4 className="pz-fila__titulo">{tituloSolicitud(s)}</h4>
                                            </div>
                                            <ChipPz tono={(TONO[estado] === 'verde-solido' ? 'verde' : TONO[estado] ?? 'gris') as TonoEstado}>{estados[estado] ?? estado}</ChipPz>
                                            <Link to={`${base}/${s.id}`} className={`pz-boton pz-boton--chico${pendiente ? '' : ' pz-boton--contorno'}`}>
                                                {pendiente ? 'Atender' : 'Ver'}<span className="solo-lectores"> {folioCorto(s.id)}</span>
                                            </Link>
                                                <div className="ba-datos ba-datos--fila">
                                                    <span className="ba-dato"><small>Folio</small><span className="pz-fila__folio" title={s.id}>{folioCorto(s.id)}</span></span>
                                                    <span className="ba-dato"><small>Persona</small>{nombre(s)}</span>
                                                    {s.tipoPropuesta && <span className="ba-dato"><small>Tipo</small>{s.tipoPropuesta}</span>}
                                                    {s.fechaCita && <span className="ba-dato"><small>Cita</small>{fechaHora(s.fechaCita)}</span>}
                                                    <span className="ba-dato"><small>Recibida</small>{fechaCorta(s.creadaEn)}</span>
                                                </div>
                                                {pendiente && <p className="pz-fila__plazo">{esperando(s.creadaEn)}</p>}
                                        </article>
                                    </li>;
                                })}
                            </ul>
                        </div>
                    )}
                    <div className="pz-tarjeta__pie">
                        <p aria-live="polite">{lista ? `${lista.solicitudes.length} de ${lista.total}` : ''}</p>
                        {lista && lista.total > POR_PAGINA && <div className="pz-paginas" role="group" aria-label="Páginas">
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button>
                            <span className="pz-paginas__actual">{pagina + 1} de {paginas}</span>
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={pagina + 1 >= paginas} onClick={() => setPagina(x => x + 1)}>Siguiente</button>
                        </div>}
                    </div>
                </TarjetaPz>
                <aside className="pz-lateral" aria-label="Lo que espera más">
                    <TarjetaPz icono="reloj" id="tramites-antiguas" titulo="Llevan más tiempo esperando" texto={tipo === 'credencial' ? 'Recibidas sin revisar' : 'En revisión'} className="pz-tarjeta--actividades">
                        {pendientes.length ? <ul className="ins-llenas">
                            {pendientes.map(s => <li key={s.id}>
                                <Link to={`${base}/${s.id}`} className="pz-enlace-fila">{tipo === 'credencial' ? nombre(s) : tituloSolicitud(s)}</Link>
                                <small>{folioCorto(s.id)}. {esperando(s.creadaEn)}</small>
                            </li>)}
                        </ul> : <Vacio icono="check" titulo="Nada esperando" texto="Estás al día con esta bandeja." />}
                    </TarjetaPz>
                    <Plegable titulo={tipo === 'credencial' ? 'Cómo se atiende una credencial' : 'Cómo se revisa una propuesta'}>
                        <ul>{tipo === 'credencial' ? <>
                            <li>Revisa los datos de la solicitud y agenda la cita de cotejo.</li>
                            <li>En la cita se cotejan los documentos; el trámite queda atendido.</li>
                            <li>Este trámite no emite ni valida una credencial.</li>
                        </> : <>
                            <li>Revisa la propuesta: qué se propone, cuándo y quién la organiza.</li>
                            <li>Apruébala, pide una corrección o recházala con motivo; la persona recibe un aviso.</li>
                            <li>Aprobar no publica: después se programa y publica desde Actividades.</li>
                        </>}</ul>
                    </Plegable>
                </aside>
            </div>
        </div>
    </>;
}

function useConteo(tipo: TipoTramite) {
    const [conteo, setConteo] = useState(() => conteosEnMemoria(tipo));
    useEffect(() => {
        let vigente = true;
        conteosTramites(tipo).then(c => { if (vigente) setConteo(c); }).catch(() => undefined);
        return () => { vigente = false; };
    }, [tipo]);
    return conteo;
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
        <div className="pz-pagina at-detalle">
        <Encabezado titulo={s ? tituloSolicitud(s) : 'Solicitud'}
            texto={s ? `Folio ${folioCorto(folio)}. Recibida el ${fechaHora(s.creadaEn)}; última actualización el ${fechaHora(s.actualizadaEn ?? s.actualizadoEn)}.` : 'Consultando la solicitud…'}>
            {s && <ChipPz tono={(TONO[estado] === 'verde-solido' ? 'verde' : TONO[estado] ?? 'gris') as TonoEstado}>{estados[estado] ?? estado}</ChipPz>}
            <Link to={base} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a la bandeja</Link>
        </Encabezado>

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
                    {tipo === 'propuesta' && <MapaDonde espacio={s.necesidadEspacio} texto={`Espacio que pide: ${s.necesidadEspacio}`} />}
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
                            ? <a className="tr-telefono" href={`tel:${s.perfil.telefono}`}><span><small>Teléfono</small><strong>{s.perfil.telefono}</strong></span></a>
                            : <p className="contenidos-campo__ayuda">Sin teléfono registrado.</p>}
                    </Tarjeta>
                    <TarjetaPz icono="bitacora" id="tramite-seguimiento" titulo="Seguimiento" texto={`${s.historial.length + 1} ${s.historial.length ? 'movimientos' : 'movimiento'}; lo más reciente arriba`}>
                        <ol className="pz-linea" aria-label="Historial de la solicitud">
                            {[...s.historial].reverse().map((h, i) => (
                                <li key={i} className={`pz-linea__paso pz-linea__paso--${['rechazada', 'cancelada'].includes(h.estadoNuevo) ? 'guinda' : ['aprobada', 'atendida'].includes(h.estadoNuevo) ? 'verde' : 'dorado'}${i === 0 ? ' pz-linea__paso--actual' : ''}`}>
                                    <span className="pz-linea__icono" aria-hidden="true"><Icono nombre={['rechazada', 'cancelada'].includes(h.estadoNuevo) ? 'alerta' : ['aprobada', 'atendida'].includes(h.estadoNuevo) ? 'check' : 'revision'} /></span>
                                    <div className="pz-linea__textos">
                                        <p className="pz-linea__titulo">{estados[h.estadoNuevo] ?? h.estadoNuevo}</p>
                                        <p className="pz-linea__detalle">{fechaHora(h.fecha)}</p>
                                        {h.nota && <p className="pz-linea__nota">{h.nota}</p>}
                                        {h.acuerdoDireccion && <p className="pz-linea__nota">Acuerdo de dirección: {h.acuerdoDireccion.responsable}, {h.acuerdoDireccion.fecha}, referencia {h.acuerdoDireccion.referencia}</p>}
                                    </div>
                                </li>
                            ))}
                            <li className={`pz-linea__paso pz-linea__paso--verde${s.historial.length ? '' : ' pz-linea__paso--actual'}`}>
                                <span className="pz-linea__icono" aria-hidden="true"><Icono nombre="check" /></span>
                                <div className="pz-linea__textos"><p className="pz-linea__titulo">Solicitud registrada</p><p className="pz-linea__detalle">{fechaHora(s.creadaEn)}</p></div>
                            </li>
                        </ol>
                        {s.estadoSolicitud === 'atendida' && <p className="pz-acciones__nota">Registrar la atención no emite ni valida una credencial.</p>}
                    </TarjetaPz>
                </aside>
            </div>
        )}
        </div>
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
type TarjetaResumen = { estados: string[]; filtro: string; titulo: string; icono: NombreIcono };
const RESUMEN: Record<TipoTramite, TarjetaResumen[]> = {
    credencial: [
        { estados: ['recibida'], filtro: 'recibida', titulo: 'Por atender', icono: 'reloj' },
        { estados: ['en_atencion', 'cita_programada'], filtro: 'cita_programada', titulo: 'En proceso', icono: 'calendario' },
        { estados: ['atendida'], filtro: 'atendida', titulo: 'Atendidas', icono: 'check' },
    ],
    propuesta: [
        { estados: ['en_revision'], filtro: 'en_revision', titulo: 'En revisión', icono: 'reloj' },
        { estados: ['requiere_correccion'], filtro: 'requiere_correccion', titulo: 'Con correcciones', icono: 'alerta' },
        { estados: ['aprobada'], filtro: 'aprobada', titulo: 'Aprobadas', icono: 'check' },
    ],
};

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
