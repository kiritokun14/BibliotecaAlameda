// Actividades › Inscripciones y cupos (datos reales: servicios/inscripciones).
// Rehecho con las piezas del panel (22 nov 2026): cifras que filtran → sesiones con su cupo | lo que se llena primero.
// En una sesión: personas inscritas con la decisión en el lugar | el cupo de la sesión. La lógica no cambia.
import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { Migas } from '../componentes';
import { Aviso, Buscador, Chip, Cifra, Dato, Datos, Encabezado, FiltrosAvanzados, Plegable, Segmentado, Tarjeta, Vacio, type TonoEstado } from '../piezasPanel';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { mensajeError } from '../../../servicios/api';
import { inscripcionesEnMemoria, listarActividadesInscripciones, listarSolicitudesInscripcion, consultarCuposInscripciones, decidirSolicitudInscripcion, type DecisionInscripcion, type ActividadInscripciones, type SolicitudInscripcion, type CuposInscripciones } from '../../../servicios/inscripciones';
import { CargandoFilas } from './PiezasLista';

const BASE = '/admin/actividades/inscripciones';
const ZONA = 'America/Mazatlan';
const fecha = (valor: string) => new Date(valor).toLocaleString('es-MX', { timeZone: ZONA, dateStyle: 'medium', timeStyle: 'short' });
const dia = (valor: string) => new Date(valor).toLocaleDateString('es-MX', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' });
const hora = (valor: string) => new Date(valor).toLocaleTimeString('es-MX', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' });
const diaMes = (valor: string) => {
    const d = new Date(valor);
    return [d.toLocaleDateString('es-MX', { timeZone: ZONA, day: 'numeric' }), d.toLocaleDateString('es-MX', { timeZone: ZONA, month: 'short' }).replace('.', '')];
};
const TONO_SESION: Record<string, TonoEstado> = { programada: 'verde', finalizada: 'gris', cancelada: 'guinda' };
const NOMBRE_SESION: Record<string, string> = { programada: 'Programada', finalizada: 'Realizada', cancelada: 'Cancelada' };
const TONO_INSCRIPCION: Record<string, TonoEstado> = { pendiente: 'dorado', confirmada: 'verde', rechazada: 'gris', cancelada: 'guinda' };
const NOMBRE_INSCRIPCION: Record<string, string> = { pendiente: 'Por decidir', confirmada: 'Confirmada', rechazada: 'Rechazada', cancelada: 'Cancelada' };
const DECISIONES: Record<DecisionInscripcion, string> = { confirmar: 'Confirmar', rechazar: 'Rechazar', cancelar: 'Cancelar inscripción' };

type FilaSesion = { actividad: ActividadInscripciones; sesion: ActividadInscripciones['sesiones'][number] };
type FiltroSesiones = 'todas' | 'programadas' | 'realizadas' | 'canceladas';
const ESTADO_FILTRO: Record<Exclude<FiltroSesiones, 'todas'>, string> = { programadas: 'programada', realizadas: 'finalizada', canceladas: 'cancelada' };
const ocupacion = (c?: CuposInscripciones) => (c && c.capacidad ? Math.min(100, Math.round((c.confirmados / c.capacidad) * 100)) : 0);
const tonoCupo = (c: CuposInscripciones) => (c.disponibles <= 0 ? 'guinda' : ocupacion(c) >= 80 ? 'dorado' : 'verde');

export default function Inscripciones() {
    const identidad = useContext(ContextoPanel);
    return <PanelLayout titulo="Actividades" tema="contenidos paleta">
        <Migas raiz="Actividades" pasos={[['Inscripciones y cupos']]} />
        <BandejaActividades key={identidad?.acceso.usuarioId ?? ''} />
    </PanelLayout>;
}

function BarraCupo({ cupo }: { cupo?: CuposInscripciones | 'error' }) {
    if (!cupo) return <span className="ac-cifra-cargando" aria-label="Cargando cupo" />;
    if (cupo === 'error') return <small className="ac-sin-accion">Cupo sin datos</small>;
    return <span className="ins-cupo">
        <span className="ins-cupo__texto"><strong>{cupo.confirmados}</strong> de {cupo.capacidad}<small>{cupo.disponibles <= 0 ? 'Lleno' : `${cupo.disponibles} libres`}</small></span>
        <span className="pz-ocupacion" aria-hidden="true"><span className={`pz-ocupacion__relleno pz-ocupacion__relleno--${tonoCupo(cupo)}`} style={{ width: `${ocupacion(cupo)}%` }} /></span>
    </span>;
}

function BandejaActividades() {
    const [pagina, setPagina] = useState(0);
    const [intento, recargar] = useState(0);
    const [filtro, setFiltro] = useState<FiltroSesiones>('todas');
    const [registro, setRegistro] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const clave = `${pagina}:${intento}`;
    const [carga, setCarga] = useState<{ clave: string; datos?: ActividadInscripciones[]; error?: string }>({ clave: '' });
    const guardada = inscripcionesEnMemoria(pagina);
    const actual = carga.clave === clave ? carga : guardada ? { clave, datos: guardada } : undefined;
    useEffect(() => {
        let vigente = true;
        listarActividadesInscripciones(pagina).then(datos => { if (vigente) setCarga({ clave, datos }); })
            .catch(error => { if (vigente) setCarga({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [pagina, clave]);

    const datos = actual?.datos ?? [];
    const conInscripcion = datos.filter(a => a.requiereInscripcion);
    const sesiones: FilaSesion[] = conInscripcion.flatMap(a => (a.sesiones ?? []).map(s => ({ actividad: a, sesion: s })))
        .sort((x, y) => Number(y.sesion.registroAbierto) - Number(x.sesion.registroAbierto) || x.sesion.inicio.localeCompare(y.sesion.inicio));
    const cuenta = (f: FiltroSesiones) => sesiones.filter(x => f === 'todas' || x.sesion.estado === ESTADO_FILTRO[f]).length;
    const abiertas = sesiones.filter(f => f.sesion.registroAbierto);
    const texto = busqueda.trim().toLowerCase();
    const filtradas = sesiones.filter(f => (filtro === 'todas' || f.sesion.estado === ESTADO_FILTRO[filtro])
        && (!registro || (registro === 'abierto') === f.sesion.registroAbierto)
        && (!texto || f.actividad.titulo.toLowerCase().includes(texto)));
    const cupos = useCupos(filtradas.map(f => f.sesion.id), intento);
    const limpiar = () => { setBusqueda(''); setRegistro(''); setFiltro('todas'); };
    const llenandose = abiertas.map(f => ({ ...f, cupo: cupos[f.sesion.id] })).filter(f => f.cupo && f.cupo !== 'error')
        .sort((a, b) => ocupacion(b.cupo as CuposInscripciones) - ocupacion(a.cupo as CuposInscripciones)).slice(0, 4);

    return <div className="pz-pagina">
        <Encabezado titulo="Inscripciones y cupos" texto="Elige una sesión para ver quién se inscribió, cuántos lugares quedan y decidir cada solicitud.">
            <Cifra icono="inscripciones" tono="vino" valor={abiertas.length} texto="con registro abierto" activa={registro === 'abierto'} alPresionar={() => setRegistro(registro === 'abierto' ? '' : 'abierto')} />
            <Cifra icono="calendario" valor={cuenta('programadas')} texto="programadas" activa={filtro === 'programadas'} alPresionar={() => setFiltro(filtro === 'programadas' ? 'todas' : 'programadas')} />
            <Cifra icono="lista" valor={conInscripcion.length} texto={conInscripcion.length === 1 ? 'actividad con inscripción' : 'actividades con inscripción'} />
        </Encabezado>
        {!actual ? <CargandoFilas texto="Cargando actividades…" /> : actual.error ? (
            <Aviso tono="error" titulo="No pudimos cargar las actividades." texto={actual.error}>
                <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => recargar(x => x + 1)}>Reintentar</button>
            </Aviso>
        ) : (
            <div className="pz-columnas">
                <Tarjeta icono="inscripciones" id="sesiones-inscripcion" titulo="Sesiones con inscripción" texto="Primero las que tienen el registro abierto" className="pz-pendientes"
                    accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => recargar(x => x + 1)}>Actualizar</button>}>
                    <Buscador etiqueta="Buscar actividad" placeholder="Nombre de la actividad" valor={busqueda} alCambiar={setBusqueda}>
                        <FiltrosAvanzados activos={(filtro !== 'todas' ? 1 : 0) + (registro ? 1 : 0)} alQuitar={() => { setFiltro('todas'); setRegistro(''); }} grupos={[
                            { titulo: 'Estado de la sesión', valor: filtro, alCambiar: v => setFiltro(v as FiltroSesiones), opciones: [
                                { valor: 'todas', texto: 'Todas', cantidad: sesiones.length }, { valor: 'programadas', texto: 'Programadas', cantidad: cuenta('programadas') },
                                { valor: 'realizadas', texto: 'Realizadas', cantidad: cuenta('realizadas') }, { valor: 'canceladas', texto: 'Canceladas', cantidad: cuenta('canceladas') }] },
                            { titulo: 'Registro', valor: registro, alCambiar: setRegistro, opciones: [{ valor: '', texto: 'Abierto o cerrado' },
                                { valor: 'abierto', texto: 'Abierto', cantidad: abiertas.length }, { valor: 'cerrado', texto: 'Cerrado', cantidad: sesiones.length - abiertas.length }] },
                        ]} />
                    </Buscador>
                    {sesiones.length === 0 ? <Vacio icono="inscripciones" titulo="No hay sesiones con inscripción" texto="Cuando gestiones actividades que pidan inscripción, sus sesiones aparecerán aquí." />
                        : filtradas.length === 0 ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto="No hay sesiones con esos filtros."
                            accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={limpiar}>Quitar filtros</button>} />
                        : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label="Sesiones con inscripción">
                                <ul className="pz-filas">
                                    {filtradas.map(f => {
                                        const [d, m] = diaMes(f.sesion.inicio);
                                        return <li key={f.sesion.id}>
                                            <article className={`pz-fila ins-fila${f.sesion.registroAbierto ? ' pz-fila--espera' : ''}`}>
                                                <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{m}</span></span>
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{f.actividad.titulo}</h4>
                                                    <p className="pz-fila__detalle"><span>{hora(f.sesion.inicio)} h</span><span>{f.sesion.registroAbierto ? 'Registro abierto' : 'Registro cerrado'}</span></p>
                                                </div>
                                                <BarraCupo cupo={cupos[f.sesion.id]} />
                                                {f.sesion.estado === 'programada' ? <span aria-hidden="true" /> : <Chip tono={TONO_SESION[f.sesion.estado] ?? 'gris'}>{NOMBRE_SESION[f.sesion.estado] ?? f.sesion.estado}</Chip>}
                                                <Link to={`${BASE}/${f.sesion.id}`} className={`pz-boton pz-boton--chico${f.sesion.registroAbierto ? '' : ' pz-boton--contorno'}`}>Ver inscritos<span className="solo-lectores"> {f.actividad.titulo}</span></Link>
                                            </article>
                                        </li>;
                                    })}
                                </ul>
                            </div>
                        )}
                    <div className="pz-tarjeta__pie">
                        <p aria-live="polite">{filtradas.length} de {sesiones.length} sesiones</p>
                        {(pagina > 0 || datos.length >= 20) && <div className="pz-paginas" role="group" aria-label="Más actividades">
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anteriores</button>
                            <span className="pz-paginas__actual">Grupo {pagina + 1}</span>
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={datos.length < 20} onClick={() => setPagina(x => x + 1)}>Siguientes</button>
                        </div>}
                    </div>
                </Tarjeta>
                <aside className="pz-lateral" aria-label="Lo que se llena primero">
                    <Tarjeta icono="alerta" id="ins-llenandose" titulo="Se están llenando" texto="Registro abierto, de la más ocupada a la menos" className="pz-tarjeta--actividades">
                        {llenandose.length ? <ul className="ins-llenas">
                            {llenandose.map(f => <li key={f.sesion.id}>
                                <Link to={`${BASE}/${f.sesion.id}`} className="pz-enlace-fila">{f.actividad.titulo}</Link>
                                <small>{dia(f.sesion.inicio)}, {hora(f.sesion.inicio)} h</small>
                                <BarraCupo cupo={f.cupo} />
                            </li>)}
                        </ul> : <Vacio icono="inscripciones" titulo="Sin registros abiertos" texto="Cuando una sesión abra su registro, verás aquí cómo se llena." />}
                    </Tarjeta>
                    <Plegable titulo="Cómo se decide una inscripción">
                        <ul>
                            <li>La persona se inscribe desde el portal y queda «Por decidir».</li>
                            <li>Confirmar ocupa un lugar del cupo; con el cupo lleno solo se puede rechazar.</li>
                            <li>Toda decisión lleva motivo y queda en el historial de la persona.</li>
                        </ul>
                    </Plegable>
                </aside>
            </div>
        )}
    </div>;
}

// Cupo de cada sesión de la lista
function useCupos(ids: string[], intento: number) {
    const [cupos, setCupos] = useState<Record<string, CuposInscripciones | 'error'>>({});
    const clave = ids.join(',');
    useEffect(() => {
        let vigente = true;
        clave.split(',').filter(Boolean).forEach(id => {
            consultarCuposInscripciones(id)
                .then(c => { if (vigente) setCupos(x => ({ ...x, [id]: c })); })
                .catch(() => { if (vigente) setCupos(x => ({ ...x, [id]: 'error' })); });
        });
        return () => { vigente = false; };
    }, [clave, intento]);
    return cupos;
}

// Datos de la sesión que ya se cargaron en la lista (si se abrió desde ahí): actividad y fecha
function sesionConocida(id: string) {
    for (let p = 0; p < 5; p++) {
        for (const a of inscripcionesEnMemoria(p) ?? []) {
            const s = a.sesiones?.find(x => x.id === id);
            if (s) return { actividad: a, sesion: s };
        }
    }
    return undefined;
}

export function InscritosActividad() {
    const { folio, id } = useParams();
    const identidad = useContext(ContextoPanel);
    const conocida = folio ? sesionConocida(folio) : undefined;
    return <PanelLayout titulo="Actividades" tema="contenidos paleta">
        <Migas raiz="Actividades" pasos={[['Inscripciones y cupos', BASE], [conocida?.actividad.titulo ?? 'Sesión']]} />
        {folio && <ListaSesion key={`${identidad?.acceso.usuarioId}:${folio}`} sesion={folio} seleccionada={id} conocida={conocida} />}
    </PanelLayout>;
}

type FiltroInscripcion = 'todas' | SolicitudInscripcion['status'];

function ListaSesion({ sesion, seleccionada, conocida }: { sesion: string; seleccionada?: string; conocida?: FilaSesion }) {
    const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0);
    const [filtro, setFiltro] = useState<FiltroInscripcion>('todas');
    const [busqueda, setBusqueda] = useState('');
    const clave = `${pagina}:${intento}`;
    const [carga, setCarga] = useState<{ clave: string; solicitudes?: SolicitudInscripcion[]; cupos?: CuposInscripciones; error?: string }>({ clave: '' });
    const actual = carga.clave === clave ? carga : undefined;
    useEffect(() => {
        let vigente = true;
        Promise.all([listarSolicitudesInscripcion(sesion, pagina), consultarCuposInscripciones(sesion)]).then(([solicitudes, cupos]) => { if (vigente) setCarga({ clave, solicitudes, cupos }); })
            .catch(error => { if (vigente) setCarga({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [sesion, pagina, clave]);

    const cupos = actual?.cupos;
    const lleno = (cupos?.disponibles ?? 1) <= 0;
    const solicitudes = actual?.solicitudes ?? [];
    const cuenta = (f: FiltroInscripcion) => solicitudes.filter(s => f === 'todas' || s.status === f).length;
    const texto = busqueda.trim().toLowerCase();
    const visibles = solicitudes.filter(s => (filtro === 'todas' || s.status === filtro) && (!texto || (s.nombre || '').toLowerCase().includes(texto)))
        .sort((a, b) => Number(b.status === 'pendiente') - Number(a.status === 'pendiente') || a.creadoA.localeCompare(b.creadoA));
    const p = ocupacion(cupos);

    return <div className="pz-pagina">
        <Encabezado titulo={conocida?.actividad.titulo ?? 'Inscripciones de la sesión'}
            texto={conocida ? `${dia(conocida.sesion.inicio)}, ${hora(conocida.sesion.inicio)} h (hora de Tepic). Confirmar ocupa un lugar del cupo.` : 'Confirma, rechaza o cancela cada inscripción. Confirmar ocupa un lugar del cupo.'}>
            <Cifra icono="reloj" tono="vino" valor={actual ? cuenta('pendiente') : '…'} texto="por decidir" activa={filtro === 'pendiente'} alPresionar={() => setFiltro(filtro === 'pendiente' ? 'todas' : 'pendiente')} />
            <Cifra icono="check" valor={cupos ? cupos.confirmados : '…'} texto="confirmadas" activa={filtro === 'confirmada'} alPresionar={() => setFiltro(filtro === 'confirmada' ? 'todas' : 'confirmada')} />
            <Cifra icono="inscripciones" valor={cupos ? cupos.disponibles : '…'} texto={lleno ? 'cupo lleno' : 'lugares libres'} />
        </Encabezado>
        <div className="pz-columnas">
            <Tarjeta icono="grupo" id="inscritos-titulo" titulo="Personas inscritas" texto="Las que esperan decisión van primero" className="pz-pendientes"
                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => recargar(x => x + 1)}>Actualizar</button>}>
                {solicitudes.length > 0 && <div className="pz-herramientas">
                    <Segmentado<FiltroInscripcion> etiqueta="Estado de la inscripción" valor={filtro} alCambiar={setFiltro} opciones={[
                        { valor: 'todas', texto: 'Todas', cantidad: cuenta('todas') }, { valor: 'pendiente', texto: 'Por decidir', cantidad: cuenta('pendiente'), urgente: true },
                        { valor: 'confirmada', texto: 'Confirmadas', cantidad: cuenta('confirmada') }, { valor: 'rechazada', texto: 'Rechazadas', cantidad: cuenta('rechazada') },
                        { valor: 'cancelada', texto: 'Canceladas', cantidad: cuenta('cancelada') }]} />
                    <Buscador etiqueta="Buscar por nombre" placeholder="Nombre de la persona" valor={busqueda} alCambiar={setBusqueda} />
                </div>}
                {!actual ? <CargandoFilas texto="Cargando inscripciones…" filas={3} />
                    : actual.error ? <Vacio icono="alerta" titulo="No pudimos cargar las inscripciones" texto={actual.error}
                        accion={<button type="button" className="pz-boton pz-boton--chico" onClick={() => recargar(x => x + 1)}>Reintentar</button>} />
                    : !solicitudes.length ? <Vacio icono="grupo" titulo="Todavía no hay inscripciones" texto="Cuando alguien se inscriba a la sesión desde el portal, aparecerá aquí." />
                    : !visibles.length ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto="No hay inscripciones con esos filtros."
                        accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { setFiltro('todas'); setBusqueda(''); }}>Quitar filtros</button>} />
                    : <div className="pz-grupos" tabIndex={0} role="region" aria-label="Personas inscritas">
                        <ul className="pz-filas">{visibles.map(i => <Solicitud key={i.id} solicitud={i} seleccionada={seleccionada === i.id} sinCupo={lleno} alActualizar={() => recargar(x => x + 1)} />)}</ul>
                    </div>}
                <div className="pz-tarjeta__pie">
                    <p aria-live="polite">{visibles.length} de {solicitudes.length} inscripciones</p>
                    {actual?.solicitudes && (pagina > 0 || actual.solicitudes.length >= 20) && <div className="pz-paginas" role="group" aria-label="Páginas">
                        <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button>
                        <span className="pz-paginas__actual">Página {pagina + 1}</span>
                        <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={actual.solicitudes.length < 20} onClick={() => setPagina(x => x + 1)}>Siguiente</button>
                    </div>}
                </div>
            </Tarjeta>
            <aside className="pz-lateral" aria-label="Cupo de la sesión">
                <Tarjeta icono="inscripciones" id="ins-cupo" titulo="Cupo de la sesión" texto={cupos ? (lleno ? 'Ya no se pueden confirmar más personas' : `${p}% ocupado`) : 'Calculando cupo…'} className="pz-tarjeta--actividades"
                    accion={conocida && <Chip tono={conocida.sesion.registroAbierto ? 'verde' : 'gris'}>{conocida.sesion.registroAbierto ? 'Registro abierto' : 'Registro cerrado'}</Chip>}>
                    <div className={`ins-medidor ins-medidor--${cupos ? tonoCupo(cupos) : 'verde'}`} style={{ ['--p' as string]: `${p}%` }} role="img" aria-label={cupos ? `${cupos.confirmados} de ${cupos.capacidad} lugares ocupados` : 'Calculando cupo'}>
                        <span className="ins-medidor__centro"><strong>{cupos ? cupos.confirmados : '…'}</strong><small>de {cupos ? cupos.capacidad : '…'}</small></span>
                    </div>
                    <Datos>
                        <Dato icono="check" etiqueta="Confirmadas">{cupos ? cupos.confirmados : '…'}</Dato>
                        <Dato icono="inscripciones" etiqueta="Libres">{cupos ? cupos.disponibles : '…'}</Dato>
                        {conocida?.actividad.requerimientos && <Dato ancho icono="lista" etiqueta="Requisitos">{conocida.actividad.requerimientos}</Dato>}
                    </Datos>
                    <Link to={BASE} className="pz-enlace">Volver a las sesiones</Link>
                </Tarjeta>
            </aside>
        </div>
    </div>;
}

function Solicitud({ solicitud: i, sinCupo, seleccionada, alActualizar }: { solicitud: SolicitudInscripcion; sinCupo: boolean; seleccionada: boolean; alActualizar: () => void }) {
    const decidible = i.status === 'pendiente' || i.status === 'confirmada';
    const [abierta, setAbierta] = useState(seleccionada && decidible);
    const [accion, setAccion] = useState<DecisionInscripcion>(i.status === 'confirmada' ? 'cancelar' : sinCupo ? 'rechazar' : 'confirmar');
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState('');
    const bloqueo = useRef(false);
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (bloqueo.current || (accion === 'confirmar' && sinCupo)) return;
        const motivo = String(new FormData(e.currentTarget).get('motivo') ?? '').trim();
        if (!motivo) return setError('Escribe el motivo de la decisión.');
        bloqueo.current = true;
        setOcupado(true);
        setError('');
        try { await decidirSolicitudInscripcion(i.id, accion, motivo); alActualizar(); }
        catch (e) { setError(mensajeError(e)); }
        finally { bloqueo.current = false; setOcupado(false); }
    }
    const opciones: DecisionInscripcion[] = i.status === 'pendiente' ? ['confirmar', 'rechazar', 'cancelar'] : ['cancelar'];
    const nombre = i.nombre || 'Persona inscrita';
    const negativa = accion !== 'confirmar';
    return <li>
        <article className={`pz-fila${i.status === 'pendiente' ? ' pz-fila--espera' : ''}${seleccionada || abierta ? ' pz-fila--elegida' : ''}`}>
            <span className="pz-rol-avatar pz-tono-rol--usuario ins-avatar" aria-hidden="true">{nombre.charAt(0).toUpperCase()}</span>
            <div className="pz-fila__textos">
                <h4 className="pz-fila__titulo">{nombre}</h4>
                <p className="pz-fila__detalle"><span>Se inscribió el {fecha(i.creadoA)}</span></p>
            </div>
            <Chip tono={TONO_INSCRIPCION[i.status] ?? 'gris'}>{NOMBRE_INSCRIPCION[i.status] ?? i.status}</Chip>
            {decidible
                ? <button type="button" className={`pz-boton pz-boton--chico${i.status === 'pendiente' && !abierta ? '' : ' pz-boton--contorno'}`}
                    aria-expanded={abierta} onClick={() => { setAbierta(x => !x); setError(''); }}>{abierta ? 'Cerrar' : i.status === 'pendiente' ? 'Decidir' : 'Cancelar'}</button>
                : <span className="pz-acciones__nota">Sin acciones</span>}
        </article>
        {abierta && <form onSubmit={enviar} className="pz-decision ins-decision">
            <fieldset className="pz-formulario" disabled={ocupado}>
                <legend className="solo-lectores">Decisión sobre {nombre}</legend>
                {opciones.length > 1 && <Segmentado<DecisionInscripcion> etiqueta="Decisión" valor={accion} alCambiar={setAccion}
                    opciones={opciones.filter(op => !(op === 'confirmar' && sinCupo)).map(op => ({ valor: op, texto: DECISIONES[op] }))} />}
                {sinCupo && i.status === 'pendiente' && <p className="pz-acciones__nota">No hay lugares libres: solo puedes rechazar o cancelar.</p>}
                <label className="pz-campo pz-campo--lleno"><span>Motivo <span className="contenidos-campo__obligatorio">*</span></span>
                    <textarea name="motivo" rows={2} maxLength={500} required placeholder={accion === 'confirmar' ? 'Ej.: cumple con los requisitos.' : 'Ej.: la persona pidió cancelar.'} /></label>
                <label className="pz-casilla"><input key={accion} type="checkbox" required />
                    <span><strong>{accion === 'confirmar' ? 'Revisé los requisitos de la actividad' : 'Revisé la solicitud'}</strong><small>Confirmo esta decisión.</small></span></label>
                <div className="pz-acciones pz-acciones--fila">
                    <button className={`pz-boton pz-boton--chico${negativa ? ' pz-boton--guinda' : ''}`} disabled={accion === 'confirmar' && sinCupo}>{ocupado ? 'Guardando…' : `Sí, ${DECISIONES[accion].toLowerCase()}`}</button>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setAbierta(false)}>No, volver</button>
                </div>
            </fieldset>
        </form>}
        {error && <Aviso tono="error" titulo="No se guardó." texto={error}>
            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={alActualizar}>Consultar estado actual</button>
        </Aviso>}
    </li>;
}
