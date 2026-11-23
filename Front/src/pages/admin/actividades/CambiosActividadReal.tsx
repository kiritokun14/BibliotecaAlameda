import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import PaginaPublica from '../../../components/portal/PaginaPublica';
import { CampoTexto, EncabezadoTarjeta, Pagina } from '../contenidoDemo/piezas';
import { clasesBoton } from '../contenidoDemo/utiles';
import { Chip, EncabezadoPagina, EstadoVacio, Migas } from '../componentes';
import { Icono } from '../piezasPanel';
import { AccesosRapidos, ControlesLista, CuerpoLista, SeccionLista } from './PiezasLista';
import { IconoAviso, IconoBandera, IconoLista, IconoReloj } from '../contenidos/piezas';
import vacioBuscar from '../../../assets/admin/vacio-search.svg';
import '../contenidoDemo/Contenidos.css';
import { mensajeError } from '../../../servicios/api';
import { consultarEspaciosAgenda, type ActividadPublica } from '../../../servicios/actividades';
import { actividadesParaCambio, aplicarCambioActividad, listarCambiosActividad, obtenerCambioActividad,
    reintentarAvisosCambio, resolverCambioActividad, solicitarCambioActividad,
    consultarCorreosCambio, reintentarCorreosCambio, type EstadoCorreos,
    type AcuerdoCambio, type CambioActividad, type ProgramacionCambio } from '../../../servicios/cambiosActividad';

const ESTADOS = { pendiente: 'Pendiente de resolución', autorizado: 'Autorizado, pendiente de aplicar', rechazado: 'Rechazado', aplicado: 'Aplicado' };
const fecha = (valor: string) => new Date(valor).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' });

export default function CambiosActividadReal({ propia = false }: { propia?: boolean }) {
    const { folio } = useParams();
    const { pathname } = useLocation();
    const base = propia ? '/mis-actividades/cambios' : '/admin/actividades/cambios';
    const formulario = pathname.endsWith('/reprogramar') || pathname.endsWith('/cancelar');
    const cancelacion = pathname.endsWith('/cancelar');
    const [revision, recargar] = useState(0);
    const [pagina, setPagina] = useState(0);
    const [carga, setCarga] = useState<{ clave: string; cambio?: CambioActividad; lista?: CambioActividad[]; total?: number; error?: string }>({ clave: '' });
    const clave = `${pathname}:${revision}:${pagina}:${propia}`;
    const actual = carga.clave === clave ? carga : undefined;
    useEffect(() => {
        if (formulario) return;
        let vigente = true;
        const consulta = folio ? obtenerCambioActividad(folio).then(cambio => ({ cambio }))
            : listarCambiosActividad(false, pagina * 20).then(datos => ({ lista: datos.cambios, total: datos.total }));
        consulta.then(datos => { if (vigente) setCarga({ clave, ...datos }); })
            .catch(error => { if (vigente) setCarga({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, folio, formulario, pagina, propia]);

    if (!propia && !folio && !formulario) {
        return <BandejaCambios carga={actual} pagina={pagina} setPagina={setPagina} recargar={() => recargar(x => x + 1)} />;
    }

    const contenido = <Pagina>
        <EncabezadoTarjeta volver={{ texto: propia ? 'Volver a mis propuestas' : 'Volver a Actividades', ruta: propia ? '/mi-perfil/propuestas' : '/admin/actividades/propuestas' }} etiqueta="Actividades" titulo="Cambios y cancelaciones"
            texto="Solicitar no modifica el horario oficial. El personal registra la autorización institucional antes de aplicar el cambio." />
        <div className="cn-acciones">
            <Link className={clasesBoton('contorno')} to={`${base}/reprogramar`}>Solicitar reprogramación</Link>
            <Link className={clasesBoton('contorno-guinda')} to={`${base}/cancelar`}>Solicitar cancelación</Link>
            <Link className={clasesBoton('suave')} to={propia ? '/mi-perfil/propuestas' : base}>{propia ? 'Mis propuestas' : 'Ver solicitudes'}</Link>
        </div>
        {formulario ? <FormularioCambio key={pathname} base={base} cancelacion={cancelacion} /> :
            !actual ? <p role="status">Cargando solicitudes…</p> : actual.error ? <div role="alert"><p>{actual.error}</p><button onClick={() => recargar(x => x + 1)}>Reintentar</button></div> :
                actual.cambio ? <FichaCambio key={`${actual.cambio.folio}:${actual.cambio.version}`} cambio={actual.cambio} base={base} actualizar={() => recargar(x => x + 1)} /> :
                    <section className="cn-tarjeta">
                        <h2>Solicitudes e historial</h2>
                        {actual.lista?.length === 0 && <p>No hay solicitudes registradas.</p>}
                        <ul>{actual.lista?.map(c => <li key={c.folio}><Link to={`${base}/${c.folio}`}>{c.folio} · {c.nombre}</Link> · {c.tipo === 'cancelacion' ? 'Cancelación' : 'Reprogramación'} · {ESTADOS[c.estado]}</li>)}</ul>
                        <div className="cn-acciones">
                            <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</button>
                            <span>Página {pagina + 1} · {actual.total} solicitudes</span>
                            <button disabled={(pagina + 1) * 20 >= (actual.total ?? 0)} onClick={() => setPagina(p => p + 1)}>Siguiente</button>
                        </div>
                    </section>}
    </Pagina>;
    return propia ? <PaginaPublica>{contenido}</PaginaPublica> : <PanelLayout titulo="Actividades" tema="contenidos">{contenido}</PanelLayout>;
}

function BandejaCambios({ carga, pagina, setPagina, recargar }: {
    carga?: { lista?: CambioActividad[]; total?: number; error?: string };
    pagina: number; setPagina: (pagina: number) => void; recargar: () => void;
}) {
    const [parametros] = useSearchParams();
    const historial = parametros.get('vista') === 'historial';
    const [busqueda, setBusqueda] = useState('');
    const [estado, setEstado] = useState('todos');
    const [tipo, setTipo] = useState('');
    const lista = carga?.lista ?? [];
    const texto = busqueda.trim().toLocaleLowerCase('es');
    const visibles = lista.filter(c => (!historial || c.estado === 'aplicado' || c.estado === 'rechazado')
        && (estado === 'todos' || c.estado === estado)
        && (!tipo || c.tipo === tipo)
        && (!texto || `${c.folio} ${c.nombre}`.toLocaleLowerCase('es').includes(texto)));
    const limpiar = () => { setBusqueda(''); setEstado('todos'); setTipo(''); };
    const tonos = { pendiente: 'guinda', autorizado: 'dorado', aplicado: 'verde', rechazado: 'gris' } as const;
    return <PanelLayout titulo="Actividades" tema="contenidos">
        <Migas raiz="Actividades" pasos={historial ? [["Cambios y cancelaciones", '/admin/actividades/cambios'], ['Historial']] : [["Cambios y cancelaciones"]]} />
        <EncabezadoPagina etiqueta="Actividades · Cambios" titulo={historial ? 'Historial de cambios' : 'Cambios y cancelaciones'}
            texto="Revisa las solicitudes y registra su resolución antes de aplicar un cambio."
            accion={<Link className="contenidos-boton contenidos-boton--oscuro" to="/admin/actividades/cambios/reprogramar">Solicitar reprogramación</Link>} />
        <div className="cn-acciones"><Link className={clasesBoton('contorno-guinda')} to="/admin/actividades/cambios/cancelar">Solicitar cancelación</Link></div>
        {carga && !carga.error && <AccesosRapidos titulo="Resumen de esta página" accesos={[
            { clave: 'pendiente', icono: <IconoReloj />, cifra: lista.filter(c => c.estado === 'pendiente').length, titulo: 'Pendientes', texto: 'Esperan resolución.', tono: 'guinda', enlace: 'Ver pendientes', activo: estado === 'pendiente', alPresionar: () => setEstado(estado === 'pendiente' ? 'todos' : 'pendiente') },
            { clave: 'aplicado', icono: <IconoBandera />, cifra: lista.filter(c => c.estado === 'aplicado').length, titulo: 'Aplicados', texto: 'Cambios aplicados.', tono: 'azul', enlace: 'Ver aplicados', activo: estado === 'aplicado', alPresionar: () => setEstado(estado === 'aplicado' ? 'todos' : 'aplicado') },
            { clave: 'rechazado', icono: <IconoAviso />, cifra: lista.filter(c => c.estado === 'rechazado').length, titulo: 'Rechazados', texto: 'Solicitudes rechazadas.', tono: 'gris', enlace: 'Ver rechazados', activo: estado === 'rechazado', alPresionar: () => setEstado(estado === 'rechazado' ? 'todos' : 'rechazado') },
        ]} />}
        <ControlesLista etiqueta="Filtros de cambios" chips={{ etiqueta: 'Estado', activa: estado, alElegir: setEstado, opciones: [
            { valor: 'todos', texto: 'Todos' }, { valor: 'pendiente', texto: 'Pendientes' },
            { valor: 'autorizado', texto: 'Autorizados' }, { valor: 'aplicado', texto: 'Aplicados' }, { valor: 'rechazado', texto: 'Rechazados' },
        ] }} busqueda={{ etiqueta: 'Buscar en esta página', marcador: 'Folio o actividad…', texto: busqueda, alBuscar: setBusqueda }}
            grupos={[{ etiqueta: 'Tipo de cambio', activa: tipo, alElegir: setTipo, opciones: [
                { valor: '', texto: 'Todos los tipos' }, { valor: 'reprogramacion', texto: 'Reprogramación' }, { valor: 'cancelacion', texto: 'Cancelación' },
            ] }]} alLimpiar={limpiar} />
        <SeccionLista id="cambios-lista" icono={<IconoLista />} titulo={historial ? 'Historial de cambios' : 'Cambios solicitados'} texto="Los filtros y la búsqueda se aplican a la página mostrada."
            extra={<Link className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" to={historial ? '/admin/actividades/cambios' : '/admin/actividades/cambios?vista=historial'}>{historial ? 'Ver solicitudes' : 'Ver historial'}</Link>}>
            <CuerpoLista>
                {!carga ? <p role="status">Cargando solicitudes…</p> : carga.error ? <div role="alert"><p>{carga.error}</p><button type="button" onClick={recargar}>Reintentar</button></div> :
                    visibles.length === 0 ? <EstadoVacio icono={vacioBuscar} titulo={lista.length ? 'No hay cambios con estos filtros' : 'No hay solicitudes en esta página'} texto="Prueba otro filtro o consulta otra página." /> :
                    historial ? <ol className="tr-eventos ac-historial" aria-label="Historial de cambios">
                        {visibles.map(c => <li key={c.folio} className={c.estado === 'aplicado' ? 'tr-eventos--hecho' : 'tr-eventos--ultimo'}>
                            <article className="ac-historial__tarjeta">
                                <header className="ac-historial__cabecera"><span><strong>{c.tipo === 'cancelacion' ? 'Cancelación' : 'Reprogramación'} · {c.nombre}</strong>
                                    <small>{fecha(c.historial.at(-1)?.fecha ?? c.solicitado)} · <Link to={`/admin/actividades/cambios/${c.folio}`}>{c.folio}</Link></small></span>
                                    <Chip tono={tonos[c.estado]}>{ESTADOS[c.estado]}</Chip></header>
                                <p className="ac-historial__motivo">Motivo: {c.motivo}</p>
                                <small>Avisos registrados en el portal: {c.avisos.registrados} · Fallidos: {c.avisos.fallidos}</small>
                            </article>
                        </li>)}
                    </ol> : <ul className="pz-filas" aria-label="Cambios solicitados">{visibles.map(c => <li key={c.folio}>
                        <article className={`pz-fila cb-fila${c.estado === 'pendiente' ? ' pz-fila--espera' : ''}`}>
                            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={c.tipo === 'cancelacion' ? 'alerta' : 'calendario'} /></span>
                            <div className="pz-fila__textos"><h4 className="pz-fila__titulo">{c.nombre}</h4>
                                <p className="pz-fila__detalle"><span>{c.tipo === 'cancelacion' ? 'Cancelación' : 'Reprogramación'}</span><span>{c.folio}</span><span>{fecha(c.solicitado)}</span></p></div>
                            <Chip tono={tonos[c.estado]}>{ESTADOS[c.estado]}</Chip>
                            <Link className="pz-boton pz-boton--chico" to={`/admin/actividades/cambios/${c.folio}`}>Abrir</Link>
                            <div className="cb-fila__cambio">{c.anterior.map(a => {
                                const nueva = c.programacion.find(p => p.sesionId === a.sesionId);
                                return <div className="cb-mini" key={a.sesionId}>
                                    <div className="cb-mini__caja cb-mini__caja--antes"><small>Antes</small><strong>{fecha(a.inicio)}</strong><span>{a.espacio}</span></div>
                                    <span className="cb-mini__paso" aria-hidden="true">pasa a</span>
                                    <div className={`cb-mini__caja ${c.tipo === 'cancelacion' ? 'cb-mini__caja--cancela' : 'cb-mini__caja--despues'}`}><small>Después</small>
                                        <strong>{c.tipo === 'cancelacion' ? 'Se cancela' : nueva ? `${nueva.fecha} · ${nueva.inicio} a ${nueva.fin}` : 'Sin cambio propuesto'}</strong><span>{nueva?.espacio ?? ''}</span></div>
                                </div>;
                            })}</div>
                        </article></li>)}</ul>}
            </CuerpoLista>
            {carga && !carga.error && <div className="cn-acciones"><button type="button" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>Anterior</button>
                <span>Página {pagina + 1} · {carga.total ?? 0} solicitudes</span>
                <button type="button" disabled={(pagina + 1) * 20 >= (carga.total ?? 0)} onClick={() => setPagina(pagina + 1)}>Siguiente</button></div>}
        </SeccionLista>
    </PanelLayout>;
}

function FormularioCambio({ base, cancelacion }: { base: string; cancelacion: boolean }) {
    const navigate = useNavigate();
    const [carga, setCarga] = useState<{ actividades: ActividadPublica[]; espacios: string[] } | null>(null);
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [folio, setFolio] = useState('');
    const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
    const [programacion, setProgramacion] = useState<ProgramacionCambio[]>([]);
    const [motivo, setMotivo] = useState('');
    useEffect(() => {
        let vigente = true;
        Promise.all([actividadesParaCambio(), consultarEspaciosAgenda()]).then(([actividades, espacios]) => {
            if (vigente) setCarga({ actividades, espacios: espacios.map(e => e.nombre) });
        }).catch(e => { if (vigente) setError(mensajeError(e)); });
        return () => { vigente = false; };
    }, []);
    const actividad = carga?.actividades.find(a => a.folio === folio);
    const elegir = (valor: string) => {
        setFolio(valor); setSeleccionadas([]);
        setProgramacion(carga?.actividades.find(a => a.folio === valor)?.sesiones.map(s => ({ sesionId: s.id, fecha: s.fecha, inicio: s.inicio, fin: s.fin, espacio: s.espacio })) ?? []);
    };
    async function enviar(e: FormEvent) {
        e.preventDefault();
        if (!actividad || seleccionadoVacio()) return;
        setOcupado(true); setError('');
        try {
            const c = await solicitarCambioActividad({ actividad: actividad.folio, actualizado: actividad.actualizado,
                tipo: cancelacion ? 'cancelacion' : 'reprogramacion', sesiones: seleccionadas, motivo,
                programacion: cancelacion ? [] : programacion.filter(p => seleccionadas.includes(p.sesionId)) });
            navigate(`${base}/${c.folio}`);
        } catch (e) { setError(mensajeError(e)); }
        finally { setOcupado(false); }
    }
    function seleccionadoVacio() {
        if (seleccionadas.length) return false;
        setError('Selecciona al menos una sesión.'); return true;
    }
    const cambiar = (id: string, campo: keyof ProgramacionCambio, valor: string) => setProgramacion(ps => ps.map(p => p.sesionId === id ? { ...p, [campo]: valor } : p));
    return <form className="cn-tarjeta" onSubmit={e => void enviar(e)}>
        <h2>{cancelacion ? 'Solicitar cancelación de sesiones' : 'Solicitar nueva programación'}</h2>
        {error && <p role="alert">{error}</p>}
        {!carga ? <p>Cargando actividades…</p> : <>
            {carga.actividades.length === 0 && <p>No tienes actividades aprobadas disponibles para solicitar cambios.</p>}
            <CampoTexto id="cambio-actividad" etiqueta="Actividad" obligatorio><select id="cambio-actividad" className="cn-control" required value={folio} onChange={e => elegir(e.target.value)}>
                <option value="">Elige una actividad</option>{carga.actividades.map(a => <option key={a.folio} value={a.folio}>{a.folio} · {a.nombre}</option>)}
            </select></CampoTexto>
            {actividad?.sesiones.filter(s => ['borrador', 'programada'].includes(s.estado)).map(s => {
                const p = programacion.find(p => p.sesionId === s.id)!;
                return <fieldset key={s.id} disabled={ocupado}>
                    <legend><label><input type="checkbox" checked={seleccionadas.includes(s.id)} onChange={e => setSeleccionadas(ids => e.target.checked ? [...ids, s.id] : ids.filter(id => id !== s.id))} /> {s.fecha} · {s.inicio}–{s.fin} · {s.espacio}</label></legend>
                    {!cancelacion && seleccionadas.includes(s.id) && <div className="cn-formulario">
                        {(['fecha', 'inicio', 'fin'] as const).map(campo => <CampoTexto key={campo} id={`${s.id}-${campo}`} etiqueta={campo === 'fecha' ? 'Nueva fecha' : campo === 'inicio' ? 'Nuevo inicio' : 'Nuevo fin'} obligatorio>
                            <input id={`${s.id}-${campo}`} className="cn-control" type={campo === 'fecha' ? 'date' : 'time'} required value={p[campo]} onChange={e => cambiar(s.id, campo, e.target.value)} />
                        </CampoTexto>)}
                        <CampoTexto id={`${s.id}-espacio`} etiqueta="Nuevo espacio" obligatorio><select id={`${s.id}-espacio`} className="cn-control" required value={p.espacio} onChange={e => cambiar(s.id, 'espacio', e.target.value)}>
                            <option value="">Elige un espacio</option>{carga.espacios.map(nombre => <option key={nombre}>{nombre}</option>)}
                        </select></CampoTexto>
                    </div>}
                </fieldset>;
            })}
            <CampoTexto id="cambio-motivo" etiqueta="Motivo" obligatorio><textarea id="cambio-motivo" className="cn-control" required maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} /></CampoTexto>
            <p>Las sesiones conservan su programación hasta que se registre una resolución y se aplique el cambio.</p>
            <button className={clasesBoton('verde')} disabled={ocupado || !actividad}>{ocupado ? 'Enviando…' : 'Enviar solicitud'}</button>
        </>}
    </form>;
}

function FichaCambio({ cambio: c, base, actualizar }: { cambio: CambioActividad; base: string; actualizar: () => void }) {
    const [correos, setCorreos] = useState<EstadoCorreos>();
    const [errorCorreos, setErrorCorreos] = useState('');
    useEffect(() => {
        if (!c.puedeResolver) return;
        let vigente = true;
        consultarCorreosCambio(c.folio).then(datos => { if (vigente) setCorreos(datos); })
            .catch(e => { if (vigente) setErrorCorreos(mensajeError(e)); });
        return () => { vigente = false; };
    }, [c.folio, c.puedeResolver, c.version]);
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [acuerdo, setAcuerdo] = useState<AcuerdoCambio>({ referencia: '', autoridad: '', fecha: '' });
    const [decision, setDecision] = useState<'autorizar' | 'rechazar'>('autorizar');
    async function operar(accion: () => Promise<unknown>) {
        setOcupado(true); setError('');
        try { await accion(); actualizar(); } catch (e) { setError(mensajeError(e)); }
        finally { setOcupado(false); }
    }
    function resolver(e: FormEvent) {
        e.preventDefault();
        void operar(() => resolverCambioActividad(c, decision, motivo, decision === 'autorizar' ? acuerdo : undefined));
    }
    const bloque = (titulo: string, contenido: ReactNode) => <section className="cn-tarjeta"><h2>{titulo}</h2>{contenido}</section>;
    return <>
        {error && <p role="alert">{error}</p>}
        {bloque(`${c.folio} · ${c.nombre}`, <><p><strong>{ESTADOS[c.estado]}</strong></p><p>{c.motivo}</p><p>Solicitada: {fecha(c.solicitado)} · {c.sesiones.length} sesiones afectadas</p></>)}
        {bloque('Programación anterior', <ul>{c.anterior.map(p => <li key={p.sesionId}>{fecha(p.inicio)} – {fecha(p.fin)} · {p.espacio}</li>)}</ul>)}
        {bloque(c.tipo === 'cancelacion' ? 'Cancelación solicitada' : 'Programación solicitada', c.tipo === 'cancelacion' ? <p>Se cancelarán únicamente las sesiones indicadas y se liberará su ocupación del espacio al aplicar.</p> :
            <ul>{c.programacion.map(p => <li key={p.sesionId}>{p.fecha} · {p.inicio}–{p.fin} · {p.espacio} (hora de Tepic)</li>)}</ul>)}
        {c.acuerdo && bloque('Acuerdo institucional', <p>{c.acuerdo.autoridad} · {c.acuerdo.referencia} · {c.acuerdo.fecha}</p>)}
        {c.puedeResolver && c.estado === 'pendiente' && <form className="cn-tarjeta" onSubmit={resolver}>
            <h2>Registrar resolución</h2><fieldset disabled={ocupado}>
                <CampoTexto id="cambio-decision" etiqueta="Decisión"><select id="cambio-decision" className="cn-control" value={decision} onChange={e => setDecision(e.target.value as typeof decision)}>
                    <option value="autorizar">Registrar autorización institucional</option><option value="rechazar">Rechazar solicitud</option>
                </select></CampoTexto>
                {decision === 'autorizar' && (['referencia', 'autoridad', 'fecha'] as const).map(campo => <CampoTexto key={campo} id={`acuerdo-${campo}`} etiqueta={campo === 'referencia' ? 'Referencia del acuerdo' : campo === 'autoridad' ? 'Autoridad que autorizó' : 'Fecha del acuerdo'} obligatorio>
                    <input id={`acuerdo-${campo}`} className="cn-control" type={campo === 'fecha' ? 'date' : 'text'} required maxLength={campo === 'referencia' ? 200 : 150} value={acuerdo[campo]} onChange={e => setAcuerdo({ ...acuerdo, [campo]: e.target.value })} />
                </CampoTexto>)}
                <CampoTexto id="resolucion-motivo" etiqueta="Motivo de la resolución" obligatorio><textarea id="resolucion-motivo" className="cn-control" required maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} /></CampoTexto>
                <button className={clasesBoton('verde')}>Guardar resolución</button>
            </fieldset>
        </form>}
        {c.puedeResolver && c.estado === 'autorizado' && bloque('Aplicar autorización', <><p>Se comprobará nuevamente la programación y la disponibilidad. Después se actualizarán las sesiones y se registrarán avisos del portal.</p>
            <button className={clasesBoton(c.tipo === 'cancelacion' ? 'guinda' : 'verde')} disabled={ocupado} onClick={() => void operar(() => aplicarCambioActividad(c))}>Aplicar {c.tipo === 'cancelacion' ? 'cancelación autorizada' : 'reprogramación autorizada'}</button></>)}
        {bloque('Avisos', <><p>{c.avisos.registrados} avisos registrados en el portal · {c.avisos.fallidos} registros fallidos. Registrar un aviso no acredita entrega de correo.</p>
            {correos && <p>Correos aceptados por Brevo: {correos.enviados} · Pendientes: {correos.pendientes} · Fallidos: {correos.fallidos} · Sin resultado confirmado: {correos.inciertos}.</p>}
            {errorCorreos && <p role="alert">No se pudo consultar el estado de los correos: {errorCorreos}</p>}
            {correos && correos.fallidos > 0 && <button disabled={ocupado} onClick={() => void operar(async () => { await reintentarCorreosCambio(c.folio); })}>Reintentar correos fallidos</button>}
            {c.puedeResolver && c.avisos.fallidos > 0 && <button disabled={ocupado} onClick={() => void operar(() => reintentarAvisosCambio(c))}>Reintentar avisos fallidos</button>}</>)}
        {bloque('Historial', <ol>{c.historial.map((h, i) => <li key={i}>{h.accion} · {fecha(h.fecha)} · Responsable: {h.responsable}{h.motivo && ` · ${h.motivo}`}</li>)}</ol>)}
        <Link className={clasesBoton('suave')} to={base}>Volver a solicitudes</Link>
    </>;
}
