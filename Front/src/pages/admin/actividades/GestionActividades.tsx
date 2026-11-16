import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { CampoTexto, Datos, EncabezadoTarjeta, Pagina } from '../contenidoDemo/piezas';
import '../contenidoDemo/Contenidos.css';
import { ContextoPanel, permisoGlobal } from '../../../servicios/accesoPanel';
import { mensajeError } from '../../../servicios/api';
import { consultarActividad, consultarEspaciosAgenda, decidirActividad, guardarActividad, listarActividades,
    type AccionActividad, type ActividadGestion, type DatosActividadReal } from '../../../servicios/actividades';

const BASE = '/admin/actividades/propuestas';
const vacia: DatosActividadReal = { nombre: '', tipo: 'Taller', descripcion: '', fecha: '', inicio: '', fin: '', espacio: '',
    cupo: '', inscripcion: true, publico: 'Público en general', responsable: '', materiales: '' };
const estados: Record<string, string> = { borrador: 'Borrador', 'en-revision': 'En revisión', aprobada: 'Aprobada', publicada: 'Publicada', archivada: 'Archivada o retirada' };
const acciones: Record<AccionActividad, string> = { enviar: 'Enviar a revisión', aprobar: 'Autorizar actividad', publicar: 'Publicar en la agenda',
    rechazar: 'Devolver al autor con motivo', retirar: 'Retirar de la agenda', archivar: 'Archivar borrador' };

export default function GestionActividades() {
    const { folio } = useParams();
    const { pathname } = useLocation();
    const identidad = useContext(ContextoPanel);
    const [recarga, recargar] = useState(0);
    const [resultado, setResultado] = useState<{ clave: string; lista?: ActividadGestion[]; actividad?: ActividadGestion; error?: string }>({ clave: '' });
    const [busqueda, setBusqueda] = useState('');
    const nueva = pathname.endsWith('/nueva');
    const editar = pathname.endsWith('/editar');
    const clave = `${pathname}:${recarga}:${identidad?.acceso.usuarioId}`;
    const actual = resultado.clave === clave ? resultado : undefined;
    useEffect(() => {
        let vigente = true;
        const consulta = nueva ? Promise.resolve({}) : folio ? consultarActividad(folio).then(actividad => ({ actividad }))
            : listarActividades().then(lista => ({ lista }));
        consulta.then(datos => { if (vigente) setResultado({ clave, ...datos }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, folio, nueva]);
    return <PanelLayout titulo="Actividades"><Pagina>
        <EncabezadoTarjeta volver={{ texto: 'Volver a actividades', ruta: BASE }} etiqueta="Actividades y agenda"
            titulo={nueva ? 'Nueva actividad' : editar ? 'Editar borrador' : folio ? 'Detalle de la actividad' : 'Propuestas de actividades'}
            texto="Los cambios se guardan en la base de datos. La autorización precede a la publicación." />
        {!actual && <p role="status">Cargando actividades…</p>}
        {actual?.error && <p role="alert">{actual.error} <button onClick={() => recargar(x => x + 1)}>Reintentar</button></p>}
        {actual && !actual.error && (nueva || editar) && <Formulario key={clave} actividad={actual.actividad} />}
        {actual?.lista && <>
            <Link className="boton-panel" to={`${BASE}/nueva`}>Nueva actividad</Link>
            <CampoTexto id="buscar-actividad" etiqueta="Buscar por nombre o folio"><input id="buscar-actividad" className="cn-control" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></CampoTexto>
            <div className="cn-tabla-contenedor"><table className="cn-tabla"><thead><tr><th>Folio</th><th>Actividad</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>
                {actual.lista.filter(a => `${a.nombre} ${a.folio}`.toLowerCase().includes(busqueda.toLowerCase())).map(a => <tr key={a.folio}>
                    <td>{a.folio}</td><td>{a.nombre}</td><td>{estados[a.estado] ?? a.estado}</td><td>{a.fecha || 'Sin programar'}</td>
                    <td><Link to={`${BASE}/${a.folio}`}>Abrir {a.folio}</Link></td></tr>)}
            </tbody></table></div>
            {actual.lista.length === 0 && <p>Aún no hay actividades que puedas consultar.</p>}
        </>}
        {actual?.actividad && !editar && <Detalle key={`${clave}:${actual.actividad.actualizado}`} actividad={actual.actividad} alRecargar={() => recargar(x => x + 1)} />}
    </Pagina></PanelLayout>;
}

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
    if (actividad && actividad.estado !== 'borrador') return <p>Solo puedes editar un borrador. <Link to={`${BASE}/${actividad.folio}`}>Volver al detalle</Link></p>;
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
    return <section className="cn-tarjeta"><fieldset disabled={guardando} style={{ border: 0, padding: 0 }}><legend>Datos de la actividad · horario de Tepic</legend>
        {(['nombre', 'tipo', 'descripcion', 'fecha', 'inicio', 'fin', 'cupo', 'publico', 'responsable', 'materiales'] as const).map(campo => {
            const etiqueta = { nombre: 'Nombre', tipo: 'Tipo de actividad', descripcion: 'Descripción pública', fecha: 'Fecha', inicio: 'Hora de inicio', fin: 'Hora de fin', cupo: 'Cupo máximo', publico: 'Público', responsable: 'Área o responsable público', materiales: 'Materiales o requisitos' }[campo];
            return <CampoTexto key={campo} id={`agenda-${campo}`} etiqueta={etiqueta} obligatorio={campo === 'nombre'}>
                {campo === 'descripcion' ? <textarea id={`agenda-${campo}`} className="cn-control cn-control--area" maxLength={1000} value={datos[campo]} onChange={e => cambiar(campo, e.target.value)} />
                : <input id={`agenda-${campo}`} className="cn-control" type={campo === 'fecha' ? 'date' : campo === 'inicio' || campo === 'fin' ? 'time' : campo === 'cupo' ? 'number' : 'text'} min={campo === 'cupo' ? 1 : undefined}
                    maxLength={campo === 'materiales' ? 1000 : campo === 'tipo' ? 80 : 150} value={datos[campo]} onChange={e => cambiar(campo, e.target.value)} />}
            </CampoTexto>;
        })}
        <CampoTexto id="agenda-espacio" etiqueta="Espacio"><select id="agenda-espacio" className="cn-control" value={datos.espacio} onChange={e => cambiar('espacio', e.target.value)}>
            <option value="">{espacios ? 'Elige un espacio' : 'Cargando espacios…'}</option>{espacios?.map(e => <option key={e.nombre} value={e.nombre}>{e.nombre} · capacidad {e.capacidad}</option>)}
        </select></CampoTexto>
        <label><input type="checkbox" checked={datos.inscripcion} onChange={e => cambiar('inscripcion', e.target.checked)} /> Requiere inscripción</label>
        {error && <p role="alert">{error}</p>}
        <div className="cn-acciones"><button className="boton-panel" onClick={() => void guardar('borrador')}>{guardando ? 'Guardando…' : 'Guardar borrador'}</button>
            {!actividad && <button className="boton-panel" onClick={() => void guardar('en-revision')}>Guardar y enviar a revisión</button>}</div>
    </fieldset></section>;
}

function Detalle({ actividad: a, alRecargar }: { actividad: ActividadGestion; alRecargar: () => void }) {
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
    return <>
        <Datos filas={[["Folio", a.folio], ["Estado", estados[a.estado] ?? a.estado], ["Actividad", a.nombre], ["Tipo", a.tipo], ["Responsable público", a.responsable || 'Por definir']]} />
        <section className="cn-tarjeta"><h2>{a.nombre}</h2><p style={{ whiteSpace: 'pre-wrap' }}>{a.descripcion}</p><p>Público: {a.publico}</p><p>Requisitos: {a.materiales || 'Sin requisitos adicionales'}</p>
            {a.sesiones.length ? a.sesiones.map(s => <p key={s.id}>{s.fecha} · {s.inicio} a {s.fin} · {s.espacio} · cupo {s.cupo} · {s.estado}</p>) : <p>{a.fecha} · {a.inicio} a {a.fin} · {a.espacio || 'Sin programar'}</p>}
            {a.estado === 'borrador' && <Link to={`${BASE}/${a.folio}/editar`}>Editar borrador</Link>}
            {a.estado === 'publicada' && <p><Link to={`/eventos/${a.folio}`}>Ver publicación en la agenda</Link></p>}
        </section>
        <div className="cn-acciones">{ofrecidas.map(op => <button key={op} className="boton-panel" disabled={guardando} onClick={() => { setAccion(op); setError(''); setConfirmacion(false); }}>{acciones[op]}</button>)}</div>
        {accion && <section className="cn-tarjeta"><h2>{acciones[accion]}</h2><fieldset disabled={guardando} style={{ border: 0 }}>
            {accion === 'aprobar' && <CampoTexto id="referencia-actividad" etiqueta="Referencia de autorización institucional" obligatorio><input id="referencia-actividad" className="cn-control" maxLength={200} value={referencia} onChange={e => setReferencia(e.target.value)} /></CampoTexto>}
            {['retirar', 'archivar', 'rechazar'].includes(accion) && <CampoTexto id="motivo-actividad" etiqueta="Motivo" obligatorio><textarea id="motivo-actividad" className="cn-control" maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} /></CampoTexto>}
            {accion === 'publicar' && <p>Autorización registrada: {a.autorizo?.quien}. Se publicará la actividad y se comprobará la disponibilidad del espacio.</p>}
            {accion === 'retirar' && <p>Se ocultará de la agenda y se cerrará el registro. El retiro no cancela las sesiones ni envía avisos a participantes.</p>}
            <label><input type="checkbox" checked={confirmacion} onChange={e => setConfirmacion(e.target.checked)} /> Revisé los datos y confirmo esta decisión.</label>
            <div><button className="boton-panel" onClick={() => void decidir()}>{guardando ? 'Guardando…' : `Confirmar: ${acciones[accion].toLowerCase()}`}</button></div>
        </fieldset></section>}
        {error && <p role="alert">{error} <button onClick={alRecargar}>Recargar versión actual</button></p>}
        <section className="cn-tarjeta"><h2>Historial</h2>{a.historial.length ? <ol>{a.historial.map((h, i) => <li key={i}>{h.accion} · {new Date(h.fecha).toLocaleString('es-MX')}{h.referencia && ` · ${h.referencia}`}{h.motivo && ` · ${h.motivo}`}</li>)}</ol> : <p>Sin decisiones registradas.</p>}</section>
    </>;
}
