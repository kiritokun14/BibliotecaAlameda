// Participantes › Bibliocomunidad: revisión previa de publicaciones y reportes del foro (datos reales).
// Diseño: el mismo de Atención (piezas de ../componentes, clases «contenidos-*» y «tr-*»). La lógica no cambia.
import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import PanelLayout from '../PanelLayout';
import { Chip, EncabezadoPagina, EstadoVacio, Migas, type TonoChip } from '../componentes';
import { IconoAviso, IconoLista } from '../contenidos/piezas';
import { Bloque } from '../../../components/portal/Esqueleto';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { listarReportesForo, reportesForoEnMemoria, resolverReporteForo, medidasDisponibles, type MedidaForo, type ReporteForo } from '../../../servicios/moderacion';
import { mensajeError } from '../../../servicios/api';
import { consultarPendientesForo, pendientesForoEnMemoria, revisarContenidoForo, type ContenidoPendiente } from '../../../servicios/foro';
import vacioCheck from '../../../assets/admin/vacio-check.svg';
import vacioBuscar from '../../../assets/admin/vacio-search.svg';
import '../atencion/AtencionTramites.css';

const etiquetas: Record<MedidaForo, string> = { revisar: 'Tomar en revisión', ocultar: 'Ocultar contenido', retirar: 'Retirar contenido', descartar: 'Descartar reporte sin cambiar el contenido' };
const cortas: Record<MedidaForo, string> = { revisar: 'Tomar en revisión', ocultar: 'Ocultar', retirar: 'Retirar', descartar: 'Descartar reporte' };
const ESTADOS_REPORTE: [string, string][] = [['', 'Todos'], ['pendiente', 'Pendientes'], ['en_revision', 'En revisión'], ['resuelto', 'Resueltos'], ['descartado', 'Descartados']];
const TONO_REPORTE: Record<string, TonoChip> = { pendiente: 'guinda', en_revision: 'dorado', resuelto: 'verde', descartado: 'gris' };
const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export default function ModeracionForo() {
    const identidad = useContext(ContextoPanel);
    return <PanelLayout titulo="Participantes" tema="contenidos paleta">
        <Migas raiz="Participantes" pasos={[['Bibliocomunidad']]} />
        <EncabezadoPagina etiqueta="Participantes · Bibliocomunidad" titulo="Moderación del foro"
            texto="Revisa las publicaciones nuevas y atiende los reportes. Cada decisión requiere un motivo y queda en el historial. Los logros no conceden permisos." />
        <div key={identidad?.acceso.usuarioId ?? 'sin-cuenta'} className="tr-moderacion"><RevisionPrevia /><Bandeja /></div>
    </PanelLayout>;
}

// ---------- Publicaciones por revisar ----------
function RevisionPrevia() {
    const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0); const clave = `${pagina}:${intento}`;
    const [carga, setCarga] = useState<{ clave: string; total?: number; contenidos?: ContenidoPendiente[]; error?: string }>({ clave: '' });
    const guardada = pendientesForoEnMemoria(pagina);
    const actual = carga.clave === clave ? carga : guardada ? { clave, ...guardada } : undefined;
    useEffect(() => {
        let vigente = true;
        consultarPendientesForo(pagina).then(datos => { if (vigente) setCarga({ clave, ...datos }); }).catch(error => { if (vigente) setCarga({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [pagina, clave]);
    const total = actual?.total ?? 0;
    return <section className="contenidos-lista" aria-labelledby="foro-pendientes">
        <div className="contenidos-lista__cabecera">
            <span className="contenidos-lista__icono"><IconoLista /></span>
            <div><h2 id="foro-pendientes">Publicaciones por revisar{actual?.contenidos ? ` (${total})` : ''}</h2>
                <p>Temas nuevos, primeras respuestas y ediciones propias. Publicar exige revisar las normas y registrar un motivo.</p></div>
        </div>
        {!actual ? <div className="tr-inscritos" aria-busy="true" role="status"><span className="tr-oculto">Cargando publicaciones…</span><Bloque clase="tr-esqueleto tr-esqueleto--medio" /></div>
            : actual.error ? <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar las publicaciones" texto={actual.error} accion={{ texto: 'Reintentar', alPresionar: () => recargar(x => x + 1) }} />
            : !actual.contenidos?.length ? <EstadoVacio icono={vacioCheck} titulo="Nada por revisar" texto="Cuando alguien publique un tema o una primera respuesta, aparecerá aquí." />
            : <div className="tr-inscritos">{actual.contenidos.map(c => <RevisionPendiente key={`${c.id}:${c.version}`} contenido={c} alGuardar={() => recargar(x => x + 1)} />)}</div>}
        <Paginas pagina={pagina} total={total} alCambiar={setPagina} />
    </section>;
}

function RevisionPendiente({ contenido, alGuardar }: { contenido: ContenidoPendiente; alGuardar: () => void }) {
    const [medida, setMedida] = useState<'publicar' | 'rechazar'>('publicar'); const [ocupado, setOcupado] = useState(false); const [error, setError] = useState(''); const bloqueo = useRef(false);
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const motivo = String(new FormData(e.currentTarget).get('motivo') ?? '').trim(); if (!motivo) return setError('Escribe el motivo de la decisión.');
        bloqueo.current = true; setOcupado(true); setError('');
        try { await revisarContenidoForo(contenido, medida, motivo); alGuardar(); } catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setOcupado(false); }
    }
    return <article className="tr-inscrito">
        <header className="tr-inscrito__cabecera">
            <div><strong>{contenido.titulo ?? 'Respuesta por revisar'}</strong><small>{contenido.tipo} · folio <span className="tr-codigo">{contenido.id.slice(0, 8)}</span></small></div>
            <Chip tono="dorado">Por revisar</Chip>
        </header>
        <p className="tr-cita">{contenido.texto}</p>
        <form onSubmit={enviar}><fieldset className="tr-campos" disabled={ocupado}>
            <legend className="tr-oculto">Decisión</legend>
            <div className="contenidos-filtros tr-decisiones" role="radiogroup" aria-label="Decisión">
                {(['publicar', 'rechazar'] as const).map(op => (
                    <label key={op} className={`contenidos-filtro${medida === op ? ' contenidos-filtro--activo' : ''}`}>
                        <input type="radio" name={`medida-${contenido.id}`} value={op} checked={medida === op} onChange={() => setMedida(op)} className="tr-oculto" />
                        {op === 'publicar' ? 'Publicar' : 'Rechazar'}
                    </label>
                ))}
            </div>
            <div className="contenidos-campo"><label htmlFor={`motivo-rev-${contenido.id}`}>Motivo <span className="contenidos-campo__obligatorio">*</span></label>
                <textarea id={`motivo-rev-${contenido.id}`} name="motivo" rows={2} maxLength={2000} required /></div>
            <label className="at-casilla"><input type="checkbox" required /> Revisé el contenido conforme a las normas del foro.</label>
            <div><button className={`contenidos-boton contenidos-boton--chico ${medida === 'publicar' ? 'contenidos-boton--oscuro' : 'at-boton--guinda-lleno'}`}>{ocupado ? 'Guardando…' : medida === 'publicar' ? 'Confirmar y publicar' : 'Confirmar rechazo'}</button></div>
        </fieldset></form>
        {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se guardó</strong><p>{error}</p>
            <p className="tr-acciones"><button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alGuardar}>Recargar versión actual</button></p></div>}
    </article>;
}

// ---------- Reportes del foro ----------
function Bandeja() {
    const [estado, setEstado] = useState('pendiente'); const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0);
    const clave = `${estado}:${pagina}:${intento}`;
    const [resultado, setResultado] = useState<{ clave: string; total?: number; reportes?: ReporteForo[]; error?: string }>({ clave: '' });
    const guardada = reportesForoEnMemoria(pagina, estado);
    const actual = resultado.clave === clave ? resultado : guardada ? { clave, ...guardada } : undefined;
    useEffect(() => {
        let vigente = true;
        listarReportesForo(pagina, estado).then(datos => { if (vigente) setResultado({ clave, ...datos }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, estado, pagina]);
    return <section className="contenidos-lista" aria-labelledby="foro-reportes">
        <div className="contenidos-lista__cabecera">
            <span className="contenidos-lista__icono"><IconoAviso /></span>
            <div><h2 id="foro-reportes">Reportes del foro{actual?.reportes ? ` (${actual.total})` : ''}</h2>
                <p>Atiende reportes dentro del ámbito autorizado. Cada medida conserva responsable e historial.</p></div>
        </div>
        <div className="contenidos-lista__herramientas">
            <div className="contenidos-filtros" role="group" aria-label="Estado del reporte">
                {ESTADOS_REPORTE.map(([valor, texto]) => (
                    <button key={valor} type="button" aria-pressed={estado === valor} onClick={() => { setEstado(valor); setPagina(0); }}
                        className={`contenidos-filtro${estado === valor ? ' contenidos-filtro--activo' : ''}`}>{texto}</button>
                ))}
            </div>
        </div>
        {!actual ? <div className="tr-inscritos" aria-busy="true" role="status"><span className="tr-oculto">Cargando reportes…</span><Bloque clase="tr-esqueleto tr-esqueleto--medio" /></div>
            : actual.error ? <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar los reportes" texto={actual.error} accion={{ texto: 'Reintentar', alPresionar: () => recargar(x => x + 1) }} />
            : !actual.reportes?.length ? <EstadoVacio icono={vacioCheck} titulo="Sin reportes con ese estado" texto="Cuando alguien reporte un comentario, aparecerá aquí." />
            : <div className="tr-inscritos">{actual.reportes.map(reporte => <Ficha key={`${reporte.reporteId}:${reporte.actualizadoEn}`} reporte={reporte} alGuardar={() => recargar(x => x + 1)} />)}</div>}
        <Paginas pagina={pagina} total={actual?.total ?? 0} alCambiar={setPagina} />
    </section>;
}

function Ficha({ reporte, alGuardar }: { reporte: ReporteForo; alGuardar: () => void }) {
    const opciones = medidasDisponibles(reporte); const [medida, setMedida] = useState<MedidaForo>(opciones[0] ?? 'descartar');
    const [ocupado, setOcupado] = useState(false); const [error, setError] = useState(''); const bloqueo = useRef(false);
    async function resolver(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const motivo = String(new FormData(e.currentTarget).get('motivo') ?? '').trim();
        if (!motivo) return setError('Escribe el motivo de la medida.');
        bloqueo.current = true; setOcupado(true); setError('');
        try { await resolverReporteForo(reporte, medida, motivo); alGuardar(); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setOcupado(false); }
    }
    const negativa = medida === 'ocultar' || medida === 'retirar';
    return <article className="tr-inscrito">
        <header className="tr-inscrito__cabecera">
            <div><strong>{reporte.contenido.titulo ?? 'Comentario reportado'}</strong><small>Reporte <span className="tr-codigo">{reporte.reporteId.slice(0, 8)}</span> · contenido {reporte.contenido.estado}</small></div>
            <Chip tono={TONO_REPORTE[reporte.estadoReporte] ?? 'gris'}>{reporte.estadoReporte.replace('_', ' ')}</Chip>
        </header>
        <div className="tr-datos__bloque tr-datos__bloque--aviso"><p className="at-subtitulo">Motivo del reporte</p><p className="tr-datos__texto">{reporte.motivo}</p></div>
        <p className="tr-cita">{reporte.contenido.texto}</p>
        {reporte.resolucion && <p className="contenidos-campo__ayuda">Última resolución: {reporte.resolucion}</p>}
        {opciones.length > 0 && <form onSubmit={resolver}><fieldset className="tr-campos" disabled={ocupado}>
            <legend className="tr-oculto">Medida</legend>
            <div className="contenidos-filtros tr-decisiones" role="radiogroup" aria-label="Medida">
                {opciones.map(op => (
                    <label key={op} className={`contenidos-filtro${medida === op ? ' contenidos-filtro--activo' : ''}`} title={etiquetas[op]}>
                        <input type="radio" name={`medida-rep-${reporte.reporteId}`} value={op} checked={medida === op} onChange={() => setMedida(op)} className="tr-oculto" />
                        {cortas[op]}
                    </label>
                ))}
            </div>
            <div className="contenidos-campo"><label htmlFor={`motivo-rep-${reporte.reporteId}`}>Motivo de la medida <span className="contenidos-campo__obligatorio">*</span></label>
                <textarea id={`motivo-rep-${reporte.reporteId}`} name="motivo" rows={2} maxLength={2000} required /></div>
            <label className="at-casilla"><input type="checkbox" required /> Revisé el contenido y confirmo esta medida.</label>
            <div><button className={`contenidos-boton contenidos-boton--chico ${negativa ? 'at-boton--guinda-lleno' : 'contenidos-boton--oscuro'}`}>{ocupado ? 'Guardando…' : `Registrar: ${cortas[medida].toLowerCase()}`}</button></div>
        </fieldset></form>}
        {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se guardó</strong><p>{error}</p>
            <p className="tr-acciones"><button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alGuardar}>Recargar versión actual</button></p></div>}
        {reporte.historial.length > 0 && <details className="avisos-historial"><summary>Historial de moderación ({reporte.historial.length})</summary>
            <ol className="tr-eventos">{reporte.historial.map((h, i) => <li key={i} className={i === reporte.historial.length - 1 ? 'tr-eventos--ultimo' : 'tr-eventos--hecho'}>
                <strong>{etiquetas[h.medida]}</strong><small>{fecha(h.fecha)} · {h.realizadoPor}</small>
                <p className="tr-evento-nota">{h.estadoAnterior} → {h.estadoNuevo}{h.motivo ? ` · ${h.motivo}` : ''}</p>
            </li>)}</ol></details>}
    </article>;
}

function Paginas({ pagina, total, alCambiar }: { pagina: number; total: number; alCambiar: (pagina: number) => void }) {
    if (total <= 20) return null;
    const paginas = Math.ceil(total / 20);
    return <div className="contenidos-lista__pie"><p>{total} en total</p>
        <div className="contenidos-paginas" role="group" aria-label="Páginas">
            <button type="button" disabled={pagina === 0} onClick={() => alCambiar(pagina - 1)}>Anterior</button>
            <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina + 1} de {paginas}</button>
            <button type="button" disabled={pagina + 1 >= paginas} onClick={() => alCambiar(pagina + 1)}>Siguiente</button>
        </div></div>;
}
