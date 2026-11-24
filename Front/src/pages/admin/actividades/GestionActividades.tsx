// Actividades › Propuestas de actividades (datos reales: servicios/actividades).
// Diseño: el mismo de Atención (piezas de ../componentes, clases «contenidos-*» y «tr-*»). La lógica no cambia.
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { CambioSesion } from './CambioSesion';
import { Chip, EncabezadoPagina, EstadoVacio, Migas, Tarjeta, type TonoChip } from '../componentes';
import { IconoAviso, IconoBuscar, IconoLista, IconoReloj } from '../contenidos/piezas';
import Flujo, { type Etapa } from '../atencion/Flujo';
import { Bloque } from '../../../components/portal/Esqueleto';
import { ContextoPanel, permisoGlobal } from '../../../servicios/accesoPanel';
import { mensajeError } from '../../../servicios/api';
import { actividadEnMemoria, actividadesEnMemoria, consultarActividad, consultarEspaciosAgenda, decidirActividad, guardarActividad, listarActividades,
    type AccionActividad, type ActividadGestion, type DatosActividadReal } from '../../../servicios/actividades';
import vacioCheck from '../../../assets/admin/vacio-check.svg';
import vacioBuscar from '../../../assets/admin/vacio-search.svg';
import tarjetaInfo from '../../../assets/admin/tarjeta-info.svg';
import tarjetaCalendario from '../../../assets/admin/tarjeta-calendar.svg';
import tarjetaCheck from '../../../assets/admin/tarjeta-check.svg';
import tarjetaClock from '../../../assets/admin/tarjeta-clock.svg';
import '../atencion/AtencionTramites.css';
import './Actividades.css';

const BASE = '/admin/actividades/propuestas';
const vacia: DatosActividadReal = { nombre: '', tipo: 'Taller', descripcion: '', fecha: '', inicio: '', fin: '', espacio: '',
    cupo: '', inscripcion: true, publico: 'Público en general', responsable: '', materiales: '' };
const estados: Record<string, string> = { borrador: 'Borrador', 'en-revision': 'En revisión', aprobada: 'Aprobada', publicada: 'Publicada', archivada: 'Archivada o retirada', cancelada: 'Cancelada' };
const TONO: Record<string, TonoChip> = { borrador: 'gris', 'en-revision': 'guinda', aprobada: 'dorado', publicada: 'verde', archivada: 'gris', cancelada: 'guinda' };
const acciones: Record<AccionActividad, string> = { enviar: 'Enviar a revisión', aprobar: 'Autorizar actividad', publicar: 'Publicar en la agenda',
    rechazar: 'Devolver al autor con motivo', retirar: 'Retirar de la agenda', archivar: 'Archivar borrador' };

export default function GestionActividades() {
    const { folio } = useParams();
    const { pathname } = useLocation();
    const identidad = useContext(ContextoPanel);
    const [recarga, recargar] = useState(0);
    const [confirmado, setConfirmado] = useState<{ folio?: string; texto: string }>();
    const [resultado, setResultado] = useState<{ clave: string; lista?: ActividadGestion[]; actividad?: ActividadGestion; error?: string }>({ clave: '' });
    const nueva = pathname.endsWith('/nueva');
    const editar = pathname.endsWith('/editar');
    const clave = `${pathname}:${recarga}:${identidad?.acceso.usuarioId}`;
    // Mientras llega la respuesta se muestra lo último recibido (si se abrió antes), y luego se actualiza
    const guardada = nueva ? undefined : folio ? actividadEnMemoria(folio) : actividadesEnMemoria();
    const actual = resultado.clave === clave ? resultado
        : guardada ? (folio ? { clave, actividad: guardada as ActividadGestion } : { clave, lista: guardada as ActividadGestion[] }) : undefined;
    useEffect(() => {
        let vigente = true;
        const consulta = nueva ? Promise.resolve({}) : folio ? consultarActividad(folio).then(actividad => ({ actividad }))
            : listarActividades().then(lista => ({ lista }));
        consulta.then(datos => { if (vigente) setResultado({ clave, ...datos }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, folio, nueva]);

    const titulo = nueva ? 'Nueva actividad' : editar ? 'Editar borrador' : folio ? (actual?.actividad?.nombre ?? 'Detalle de la actividad') : 'Propuestas de actividades';
    const enLista = !folio && !nueva;
    return <PanelLayout titulo="Actividades" tema="contenidos">
        <Migas raiz="Actividades" pasos={enLista ? [['Propuestas de actividades']] : [['Propuestas de actividades', BASE], [nueva ? 'Nueva' : folio ?? '']]} />
        <EncabezadoPagina
            volver={enLista ? undefined : { texto: 'Volver a propuestas de actividades', ruta: BASE }}
            etiqueta={folio ? `Actividad ${folio}` : 'Actividades · Propuestas'}
            titulo={titulo}
            texto={enLista ? 'Registra actividades, envíalas a revisión y publícalas en la agenda. La autorización va antes de la publicación.'
                : 'Los cambios se guardan en la base de datos. La autorización precede a la publicación.'}
            accion={enLista ? <Link className="contenidos-boton contenidos-boton--oscuro" to={`${BASE}/nueva`}>Nueva actividad</Link>
                : actual?.actividad && <Chip tono={TONO[actual.actividad.estado] ?? 'gris'}>{estados[actual.actividad.estado] ?? actual.actividad.estado}</Chip>}
        />
        {confirmado?.folio === folio && confirmado && <div className="at-bloque at-bloque--info" role="status"><strong>Listo</strong><p>{confirmado.texto}</p></div>}
        {!actual && <div className="contenidos-tabla" aria-busy="true" role="status"><span className="tr-oculto">Cargando actividades…</span>{[0, 1, 2, 3].map(i => <Bloque key={i} clase="tr-esqueleto" />)}</div>}
        {actual?.error && <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar las actividades" texto={actual.error} accion={{ texto: 'Reintentar', alPresionar: () => recargar(x => x + 1) }} />}
        {actual && !actual.error && (nueva || editar) && <Formulario key={clave} actividad={actual.actividad} />}
        {actual?.lista && <Lista lista={actual.lista} />}
        {actual?.actividad && !editar && <Detalle key={`${clave}:${actual.actividad.actualizado}`} actividad={actual.actividad} alRecargar={() => recargar(x => x + 1)} alCambiarSesion={texto => { setConfirmado({ folio, texto }); recargar(x => x + 1); }} />}
    </PanelLayout>;
}

// ---------- Lista: resumen por estado, filtros, buscador y tabla ----------
function Lista({ lista }: { lista: ActividadGestion[] }) {
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('');
    const cuenta = (estado: string) => lista.filter(a => a.estado === estado).length;
    const visibles = lista.filter(a => (!filtro || a.estado === filtro) && `${a.nombre} ${a.folio}`.toLowerCase().includes(busqueda.toLowerCase()));
    const tarjetas: { estado: string; titulo: string; texto: string; enlace: string; tono: 'gris' | 'guinda' | 'azul'; icono: ReactNode }[] = [
        { estado: 'en-revision', titulo: 'En revisión', texto: 'Esperan autorización.', enlace: 'Ver en revisión', tono: 'gris', icono: <IconoReloj /> },
        { estado: 'aprobada', titulo: 'Por publicar', texto: 'Autorizadas, falta publicarlas.', enlace: 'Ver aprobadas', tono: 'guinda', icono: <IconoAviso /> },
        { estado: 'publicada', titulo: 'Publicadas', texto: 'Visibles en la agenda.', enlace: 'Ver publicadas', tono: 'azul', icono: <IconoLista /> },
    ];
    return <>
        <section className="contenidos-resumen" aria-labelledby="actividades-resumen">
            <h2 id="actividades-resumen">Accesos rápidos</h2>
            <div className="contenidos-resumen__tarjetas">
                {tarjetas.map(t => (
                    <article key={t.estado} className={`contenidos-resumen__tarjeta contenidos-resumen__tarjeta--${t.tono}${filtro === t.estado ? ' at-tarjeta--activa' : ''}`}>
                        <div className="contenidos-resumen__fila">
                            <span className="contenidos-resumen__icono">{t.icono}</span>
                            <button type="button" className="contenidos-resumen__enlace" aria-pressed={filtro === t.estado} onClick={() => setFiltro(filtro === t.estado ? '' : t.estado)}>{t.enlace}</button>
                        </div>
                        <p className="contenidos-resumen__cifra">{cuenta(t.estado)}</p>
                        <p className="contenidos-resumen__titulo">{t.titulo}</p>
                        <p className="contenidos-resumen__texto">{t.texto}</p>
                    </article>
                ))}
            </div>
        </section>

        <section className="contenidos-lista" aria-labelledby="actividades-lista">
            <div className="contenidos-lista__cabecera">
                <span className="contenidos-lista__icono"><IconoLista /></span>
                <div><h2 id="actividades-lista">Actividades registradas</h2><p>{lista.length} {lista.length === 1 ? 'actividad' : 'actividades'} que puedes consultar.</p></div>
            </div>
            <div className="contenidos-lista__herramientas">
                <div className="contenidos-filtros" role="group" aria-label="Filtrar por estado">
                    {[['', `Todas (${lista.length})`], ...Object.entries(estados).map(([v, t]) => [v, `${t} (${cuenta(v)})`])].map(([valor, texto]) => (
                        <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}
                            className={`contenidos-filtro${filtro === valor ? ' contenidos-filtro--activo' : ''}`}>{texto}</button>
                    ))}
                </div>
                <label className="contenidos-buscar"><IconoBuscar />
                    <input type="search" placeholder="Buscar por nombre o folio" aria-label="Buscar por nombre o folio" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </label>
            </div>
            {visibles.length === 0 ? (
                lista.length === 0
                    ? <EstadoVacio icono={vacioCheck} titulo="Aún no hay actividades" texto="Cuando registres una actividad, aparecerá aquí." />
                    : <EstadoVacio icono={vacioBuscar} titulo="Sin resultados" texto="No hay actividades con esos filtros." accion={{ texto: 'Quitar filtros', alPresionar: () => { setFiltro(''); setBusqueda(''); } }} />
            ) : (
                <div className="contenidos-tabla tr-tabla-actividades" role="table" aria-label="Actividades registradas" tabIndex={0}>
                    <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                        <span role="columnheader">Folio</span><span role="columnheader">Actividad</span><span role="columnheader">Fecha</span>
                        <span role="columnheader">Inscritos</span><span role="columnheader">Estado</span><span role="columnheader">Acción</span>
                    </div>
                    {visibles.map(a => (
                        <div key={a.folio} className="contenidos-tabla__fila" role="row">
                            <span role="cell" className="contenidos-tabla__folio">{a.folio}</span>
                            <span role="cell" className="at-celda at-celda-doble"><span>{a.nombre}</span><small>{a.tipo} · {a.espacio || 'Sin espacio'}</small></span>
                            <span role="cell">{a.fecha || 'Sin programar'}</span>
                            <span role="cell">{a.inscritos}{a.cupo ? ` de ${a.cupo}` : ''}</span>
                            <span role="cell"><Chip tono={TONO[a.estado] ?? 'gris'}>{estados[a.estado] ?? a.estado}</Chip></span>
                            <span role="cell"><Link to={`${BASE}/${a.folio}`} className="contenidos-tabla__accion">{a.estado === 'en-revision' || a.estado === 'aprobada' ? 'Revisar' : 'Abrir'}<span className="tr-oculto"> {a.folio}</span></Link></span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    </>;
}

// ---------- Formulario (nueva actividad o borrador) ----------
const ETIQUETAS: Record<string, string> = { nombre: 'Nombre', tipo: 'Tipo de actividad', descripcion: 'Descripción pública', fecha: 'Fecha', inicio: 'Hora de inicio', fin: 'Hora de fin', cupo: 'Cupo máximo', publico: 'Público', responsable: 'Área o responsable público', materiales: 'Materiales o requisitos' };

function Formulario({ actividad }: { actividad?: ActividadGestion }) {
    const navigate = useNavigate();
    const [datos, setDatos] = useState<DatosActividadReal>(actividad ? Object.fromEntries(Object.keys(vacia).map(k => [k, actividad[k as keyof DatosActividadReal]])) as unknown as DatosActividadReal : vacia);
    const [espacios, setEspacios] = useState<{ nombre: string; capacidad: number }[]>();
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);
    useEffect(() => {
        let activo = true;
        consultarEspaciosAgenda().then(datos => { if (activo) setEspacios(datos); }).catch(error => { if (activo) setError(mensajeError(error)); });
        return () => { activo = false; };
    }, []);
    if (actividad && actividad.estado !== 'borrador') return <div className="at-bloque"><strong>Solo puedes editar un borrador</strong><p><Link to={`${BASE}/${actividad.folio}`}>Volver al detalle</Link></p></div>;
    const cambiar = (campo: keyof DatosActividadReal, valor: string | boolean) => setDatos(d => ({ ...d, [campo]: valor }));
    async function guardar(estado: 'borrador' | 'en-revision') {
        if (bloqueo.current) return;
        setError('');
        if (!datos.nombre.trim()) return setError('Escribe el nombre de la actividad.');
        if (estado === 'en-revision' && (!datos.descripcion.trim() || !datos.fecha || !datos.inicio || !datos.fin || !datos.espacio || !datos.cupo || !datos.responsable.trim())) return setError('Completa descripción, fecha, horario, espacio, cupo y responsable.');
        if (datos.inicio && datos.fin && datos.fin <= datos.inicio) return setError('La hora de fin debe ser posterior al inicio.');
        bloqueo.current = true; setGuardando(true);
        try { const guardada = await guardarActividad(datos, estado, actividad); navigate(`${BASE}/${guardada.folio}`); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    const campo = (c: 'nombre' | 'tipo' | 'fecha' | 'inicio' | 'fin' | 'cupo' | 'publico' | 'responsable' | 'materiales') => (
        <div className="contenidos-campo" key={c}>
            <label htmlFor={`agenda-${c}`}>{ETIQUETAS[c]}{c === 'nombre' && <span className="contenidos-campo__obligatorio"> *</span>}</label>
            <input id={`agenda-${c}`} className="tr-entrada" type={c === 'fecha' ? 'date' : c === 'inicio' || c === 'fin' ? 'time' : c === 'cupo' ? 'number' : 'text'} min={c === 'cupo' ? 1 : undefined}
                maxLength={c === 'materiales' ? 1000 : c === 'tipo' ? 80 : 150} value={datos[c]} onChange={e => cambiar(c, e.target.value)} />
        </div>
    );
    return <div className="contenidos-formulario">
        <div className="at-columna">
            <Tarjeta icono={tarjetaInfo} titulo="Datos de la actividad" subtitulo="Lo que verá el público en la agenda.">
                <fieldset disabled={guardando} className="tr-campos">
                    {campo('nombre')}
                    <div className="at-fila">{campo('tipo')}{campo('publico')}</div>
                    <div className="contenidos-campo"><label htmlFor="agenda-descripcion">{ETIQUETAS.descripcion}</label>
                        <textarea id="agenda-descripcion" rows={5} maxLength={1000} value={datos.descripcion} onChange={e => cambiar('descripcion', e.target.value)} /></div>
                    {campo('materiales')}
                    {campo('responsable')}
                </fieldset>
            </Tarjeta>
        </div>
        <aside className="contenidos-formulario__lateral">
            <Tarjeta icono={tarjetaCalendario} titulo="Fecha y espacio" subtitulo="Horario de Tepic.">
                <fieldset disabled={guardando} className="tr-campos">
                    {campo('fecha')}
                    <div className="at-fila">{campo('inicio')}{campo('fin')}</div>
                    <div className="contenidos-campo"><label htmlFor="agenda-espacio">Espacio</label>
                        <select id="agenda-espacio" value={datos.espacio} onChange={e => cambiar('espacio', e.target.value)}>
                            <option value="">{espacios ? 'Elige un espacio' : 'Cargando espacios…'}</option>
                            {espacios?.map(e => <option key={e.nombre} value={e.nombre}>{e.nombre} · capacidad {e.capacidad}</option>)}
                        </select></div>
                    {campo('cupo')}
                    <label className="at-casilla"><input type="checkbox" checked={datos.inscripcion} onChange={e => cambiar('inscripcion', e.target.checked)} /> Requiere inscripción</label>
                </fieldset>
            </Tarjeta>
            {error && <div className="at-bloque at-bloque--error" role="alert"><strong>Revisa los datos</strong><p>{error}</p></div>}
            <div className="tr-acciones">
                <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={guardando} onClick={() => void guardar('borrador')}>{guardando ? 'Guardando…' : 'Guardar borrador'}</button>
                {!actividad && <button type="button" className="contenidos-boton contenidos-boton--oscuro" disabled={guardando} onClick={() => void guardar('en-revision')}>Guardar y enviar a revisión</button>}
            </div>
        </aside>
    </div>;
}

// ---------- Detalle: ficha, etapas, sesiones, datos, decisión e historial ----------
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const NOMBRE_SESION: Record<string, string> = { programada: 'Programada', finalizada: 'Realizada', cancelada: 'Cancelada', reprogramada: 'Reprogramada' };
// «2026-11-20» → ["20", "nov"]; si no es una fecha, se deja tal cual
function partesFecha(fecha: string): [string, string] {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    return m ? [String(Number(m[3])), MESES[Number(m[2]) - 1]] : [fecha, ''];
}
// «2026-11-20» → «viernes, 20 de noviembre de 2026»
function fechaLarga(fecha: string) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    if (!m) return fecha;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
// La siguiente sesión programada; si ya pasaron todas, la última
function proximaSesion(a: ActividadGestion) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mazatlan' });
    const ordenadas = [...a.sesiones].sort((x, y) => `${x.fecha}${x.inicio}`.localeCompare(`${y.fecha}${y.inicio}`));
    const siguiente = ordenadas.find(s => s.estado === 'programada' && s.fecha >= hoy);
    if (siguiente) return { ...siguiente, pasada: false };
    const ultima = ordenadas[ordenadas.length - 1];
    return ultima ? { ...ultima, pasada: true } : undefined;
}
const ETAPAS: Etapa[] = [
    { id: 'borrador', texto: 'Borrador' },
    { id: 'en-revision', texto: 'En revisión' },
    { id: 'aprobada', texto: 'Autorizada' },
    { id: 'publicada', texto: 'Publicada' },
];
const ACCIONES_HISTORIAL: Record<string, string> = { crear: 'Registrada como borrador', enviar: 'Enviada a revisión', aprobar: 'Autorizada', rechazar: 'Devuelta al autor',
    publicar: 'Publicada en la agenda', retirar: 'Retirada de la agenda', archivar: 'Archivada', cancelar: 'Cancelada', reprogramar: 'Sesión reprogramada',
    reprogramacion: 'Sesión reprogramada', cancelacion: 'Sesión cancelada', cancelar_sesion: 'Sesión cancelada' };
const SIGUIENTE: Record<string, { titulo: string; texto: string; tono?: 'verde' | 'dorado' | 'gris' | 'guinda'; icono?: 'publicado' }> = {
    borrador: { titulo: 'Completa y envía a revisión', texto: 'Mientras sea borrador puedes editarla. Al enviarla, alguien con permiso la autoriza.', tono: 'dorado' },
    'en-revision': { titulo: 'Esperando autorización', texto: 'Quien tenga permiso de resoluciones la autoriza con su referencia institucional o la devuelve con motivo.', tono: 'dorado' },
    aprobada: { titulo: 'Publícala en la agenda', texto: 'Ya está autorizada. Al publicarla se comprueba que el espacio siga disponible.', tono: 'dorado' },
    publicada: { titulo: 'Actividad publicada', texto: 'Aparece en la agenda pública. Si cambia algo, reprograma o cancela la sesión.', icono: 'publicado' },
    archivada: { titulo: 'Actividad archivada o retirada', texto: 'Ya no está en la agenda.', tono: 'guinda' },
    cancelada: { titulo: 'Actividad cancelada', texto: 'Se canceló y ya no recibe inscripciones. Las personas inscritas conservan su historial.', tono: 'guinda' },
};

function Detalle({ actividad: a, alRecargar, alCambiarSesion }: { actividad: ActividadGestion; alRecargar: () => void; alCambiarSesion: (texto: string) => void }) {
    const identidad = useContext(ContextoPanel);
    const permiso = (capacidad: string) => !!identidad && permisoGlobal(identidad.acceso, capacidad);
    const [accion, setAccion] = useState<AccionActividad>();
    const [referencia, setReferencia] = useState('');
    const [motivo, setMotivo] = useState('');
    const [confirmacion, setConfirmacion] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const bloqueo = useRef(false);
    const ofrecidas: AccionActividad[] = a.estado === 'borrador' ? ['enviar', 'archivar'] : a.estado === 'en-revision' && permiso('registrar_resoluciones_actividades') ? ['aprobar', 'rechazar']
        : a.estado === 'aprobada' && permiso('publicar_contenidos') ? ['publicar'] : a.estado === 'publicada' && permiso('publicar_contenidos') ? ['retirar'] : [];
    async function decidir() {
        if (!accion || bloqueo.current) return;
        setError('');
        if (!confirmacion) return setError('Confirma que revisaste esta decisión.');
        if (accion === 'aprobar' && !referencia.trim()) return setError('Escribe la referencia de autorización institucional.');
        if (['retirar', 'archivar', 'rechazar'].includes(accion) && !motivo.trim()) return setError('Escribe el motivo.');
        bloqueo.current = true; setGuardando(true);
        try { await decidirActividad(a, accion, referencia.trim(), motivo.trim()); alRecargar(); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    const negativa = ['retirar', 'archivar', 'rechazar'].includes(accion ?? '');
    const cerrada = a.estado === 'archivada' || a.estado === 'cancelada';
    // Etapas que sí ocurrieron, según el historial (enviar → revisión, aprobar → autorizada, publicar → publicada)
    const PASO: Record<string, string> = { enviar: 'en-revision', aprobar: 'aprobada', publicar: 'publicada' };
    const ocurridas = ['borrador', ...a.historial.map(h => PASO[h.accion]).filter(Boolean), ...(a.publicadaEl ? ['publicada'] : [])];
    const proxima = proximaSesion(a);
    const ocupacion = a.cupo ? Math.min(100, Math.round((a.inscritos / Number(a.cupo)) * 100)) : 0;
    return <>
        <section className="ac-ficha" aria-label="Resumen de la actividad">
            <div className="ac-ficha__dato">
                <span className="ac-ficha__etiqueta">{proxima?.pasada ? 'Última sesión' : 'Próxima sesión'}</span>
                <strong>{proxima ? fechaLarga(proxima.fecha) : a.fecha ? fechaLarga(a.fecha) : 'Sin programar'}</strong>
                <small>{proxima ? `${proxima.inicio} a ${proxima.fin} · hora de Tepic` : a.inicio ? `${a.inicio} a ${a.fin}` : 'Agrega fecha y horario al borrador.'}</small>
            </div>
            <div className="ac-ficha__dato">
                <span className="ac-ficha__etiqueta">Espacio</span>
                <strong>{proxima?.espacio || a.espacio || 'Sin espacio'}</strong>
                <small>{a.sesiones.length ? `${a.sesiones.length} ${a.sesiones.length === 1 ? 'sesión' : 'sesiones'} en total` : 'Aún sin sesiones'}</small>
            </div>
            <div className="ac-ficha__dato">
                <span className="ac-ficha__etiqueta">Ocupación</span>
                <strong>{a.inscripcion ? `${a.inscritos}${a.cupo ? ` de ${a.cupo}` : ''} inscritos` : 'Entrada libre'}</strong>
                {a.inscripcion && a.cupo
                    ? <span className="ac-cupo__barra" aria-hidden="true"><span className={`ac-cupo__relleno ac-cupo__relleno--${ocupacion >= 100 ? 'guinda' : ocupacion >= 80 ? 'dorado' : 'verde'}`} style={{ width: `${ocupacion}%` }} /></span>
                    : <small>{a.inscripcion ? 'Sin cupo definido' : 'No requiere inscripción'}</small>}
                {a.espera > 0 && <small>{a.espera} en lista de espera</small>}
            </div>
            <div className="ac-ficha__dato">
                <span className="ac-ficha__etiqueta">Tipo y público</span>
                <strong>{a.tipo || '—'}</strong>
                <small>{a.publico || 'Público por definir'}</small>
            </div>
        </section>

        <Flujo etapas={ETAPAS} actual={a.estado} final={cerrada ? { id: a.estado, texto: estados[a.estado] ?? a.estado } : undefined}
            ocurridas={ocurridas}
            siguiente={SIGUIENTE[a.estado] ?? { titulo: 'Sin acciones pendientes', texto: 'Esta actividad no requiere nada por ahora.', tono: 'gris' }} />

        <div className="contenidos-formulario">
            <div className="at-columna">
                <Tarjeta icono={tarjetaCalendario} titulo="Sesiones"
                    subtitulo={a.sesiones.length ? `${a.sesiones.length} ${a.sesiones.length === 1 ? 'sesión' : 'sesiones'}. Desde aquí ves sus inscripciones o la reprogramas.` : 'Fecha y horario de la actividad.'}>
                    {a.sesiones.length ? <ul className="ac-sesiones">
                        {a.sesiones.map(s => {
                            const [dia, mes] = partesFecha(s.fecha);
                            const cambiable = a.estado === 'publicada' && s.estado === 'programada' && permiso('registrar_resoluciones_actividades');
                            return <li key={s.id} className={`ac-sesion${s.estado === 'cancelada' ? ' ac-sesion--cancelada' : ''}`}>
                                <div className="ac-sesion__fila">
                                    <span className="ac-sesion__dia" aria-hidden="true"><strong>{dia}</strong><small>{mes}</small></span>
                                    <span className="ac-sesion__textos">
                                        <strong>{fechaLarga(s.fecha)}</strong>
                                        <small>{s.inicio} a {s.fin} · {s.espacio || 'Sin espacio'} · cupo {s.cupo}</small>
                                    </span>
                                    <Chip tono={s.estado === 'programada' ? 'verde' : s.estado === 'cancelada' ? 'guinda' : 'gris'}>{NOMBRE_SESION[s.estado] ?? s.estado}</Chip>
                                    {a.inscripcion && s.estado !== 'cancelada' && <Link to={`/admin/actividades/inscripciones/${s.id}`} className="contenidos-tabla__accion">Inscripciones</Link>}
                                </div>
                                {cambiable && <CambioSesion actividad={a} sesion={s} alGuardar={alCambiarSesion} />}
                            </li>;
                        })}
                    </ul> : <p className="tr-datos__texto">{a.fecha ? `${fechaLarga(a.fecha)} · ${a.inicio} a ${a.fin} · ${a.espacio || 'Sin espacio'}` : 'Sin programar. Completa la fecha en el borrador.'}</p>}
                </Tarjeta>

                <Tarjeta icono={tarjetaInfo} titulo="Acerca de la actividad" subtitulo="Lo que verá el público en la agenda."
                    extra={a.estado === 'borrador' ? <Link className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" to={`${BASE}/${a.folio}/editar`}>Editar borrador</Link>
                        : a.estado === 'publicada' ? <Link className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" to={`/eventos/${a.folio}`}>Ver en la agenda</Link> : undefined}>
                    <div className="tr-datos">
                        <div className="tr-datos__bloque"><p className="at-subtitulo">Descripción pública</p>
                            <p className="tr-datos__texto">{a.descripcion || 'Sin descripción. El público solo verá el nombre y la fecha.'}</p></div>
                        <dl className="tr-datos__filas">
                            <div><dt>Responsable público</dt><dd>{a.responsable || 'Por definir'}</dd></div>
                            <div><dt>Requisitos o materiales</dt><dd>{a.materiales || 'Sin requisitos adicionales'}</dd></div>
                            <div><dt>Inscripción</dt><dd>{a.inscripcion ? 'Requerida: se inscriben desde el portal con su cuenta' : 'Entrada libre, sin registro'}</dd></div>
                            {a.autorizo && <div><dt>Autorizó</dt><dd>{a.autorizo.quien} · {new Date(a.autorizo.fecha).toLocaleDateString('es-MX')}</dd></div>}
                        </dl>
                        <p className="tr-datos__folio">Folio: <span>{a.folio}</span></p>
                    </div>
                </Tarjeta>
            </div>

            <aside className="contenidos-formulario__lateral tr-lateral tr-lateral--alto">
                <Tarjeta variante="decision" icono={tarjetaCheck} titulo="Decisión" subtitulo={ofrecidas.length ? 'Elige qué hacer con esta actividad.' : 'No hay decisiones disponibles para tu cuenta en este estado.'}>
                    {ofrecidas.map(op => (
                        <button key={op} type="button" disabled={guardando} onClick={() => { setAccion(op); setError(''); setConfirmacion(false); }}
                            className={`contenidos-boton contenidos-boton--ancho ${['retirar', 'archivar', 'rechazar'].includes(op) ? 'at-boton--guinda' : accion === op ? 'contenidos-boton--oscuro' : 'contenidos-boton--contorno'}`}>{acciones[op]}</button>
                    ))}
                    {accion && <fieldset disabled={guardando} className="tr-campos tr-decision">
                        <p className="at-subtitulo">{acciones[accion]}</p>
                        {accion === 'aprobar' && <div className="contenidos-campo"><label htmlFor="referencia-actividad">Referencia de autorización institucional <span className="contenidos-campo__obligatorio">*</span></label>
                            <input id="referencia-actividad" className="tr-entrada" type="text" maxLength={200} value={referencia} onChange={e => setReferencia(e.target.value)} /></div>}
                        {negativa && <div className="contenidos-campo"><label htmlFor="motivo-actividad">Motivo <span className="contenidos-campo__obligatorio">*</span></label>
                            <textarea id="motivo-actividad" rows={3} maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} /></div>}
                        {accion === 'publicar' && <p className="contenidos-campo__ayuda">Autorización registrada: {a.autorizo?.quien}. Se publicará y se comprobará la disponibilidad del espacio.</p>}
                        {accion === 'retirar' && <p className="contenidos-campo__ayuda">Se ocultará de la agenda y se cerrará el registro. No cancela las sesiones ni avisa a participantes.</p>}
                        <label className="at-casilla"><input type="checkbox" checked={confirmacion} onChange={e => setConfirmacion(e.target.checked)} /> Revisé los datos y confirmo esta decisión.</label>
                        <button type="button" className={`contenidos-boton contenidos-boton--ancho ${negativa ? 'at-boton--guinda-lleno' : 'contenidos-boton--oscuro'}`} onClick={() => void decidir()}>
                            {guardando ? 'Guardando…' : `Confirmar: ${acciones[accion].toLowerCase()}`}
                        </button>
                    </fieldset>}
                    {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se guardó</strong><p>{error}</p>
                        <p className="tr-acciones"><button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alRecargar}>Recargar versión actual</button></p></div>}
                </Tarjeta>

                <Tarjeta icono={tarjetaClock} titulo="Historial" subtitulo={`${a.historial.length} ${a.historial.length === 1 ? 'decisión registrada' : 'decisiones registradas'}.`} className="tr-seguimiento">
                    {a.historial.length ? <ol className="tr-eventos" tabIndex={0} aria-label="Historial de la actividad">
                        {a.historial.map((h, i) => <li key={i} className={i === a.historial.length - 1 ? 'tr-eventos--ultimo' : 'tr-eventos--hecho'}>
                            <strong>{ACCIONES_HISTORIAL[h.accion] ?? h.accion}</strong><small>{new Date(h.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</small>
                            {(h.referencia || h.motivo) && <p className="tr-evento-nota">{[h.referencia, h.motivo].filter(Boolean).join(' · ')}</p>}
                        </li>)}
                    </ol> : <p className="contenidos-campo__ayuda">Sin decisiones registradas.</p>}
                </Tarjeta>
            </aside>
        </div>
    </>;
}
