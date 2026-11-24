// Actividades › Asistencia (HU-20, datos reales: asistenciaReal.ts; con ?simular=sesion, los de ejemplo de asistencia.ts).
// 23 nov 2026 (Aldahir): la integración la había dejado con el diseño viejo (tema «contenidos»); vuelve a la paleta del
// panel y a las piezas (Encabezado con cifras, lista | lateral, FiltrosAvanzados, Ventana), conectada a los datos reales.
import { useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { Migas } from '../componentes';
import { Ventana } from '../Ventana';
import { Aviso, Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, LineaHistorial, Plegable, Tarjeta, Vacio } from '../piezasPanel';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { mensajeError } from '../../../servicios/api';
import { ahoraTepic } from '../../../servicios/vigenciaActividades';
import { fechaCorta, useActividades, type Actividad } from './datos';
import { useInscripciones } from './inscripciones';
import { diaLargo, semanaDe, sumarDias } from './calendario';
import {
    agregarSinInscripcion, anotar, cerrarLista, conteo, corregir, guardarAsistencia, listaDe,
    lugaresParaExtras, marcar, NOMBRE_MARCA, personasDe, useAsistencia, type Lista,
} from './asistencia';
import {
    consultarListaAsistencia, guardarCorreccion, guardarListaAsistencia, listarSesionesAsistencia,
    type DatosCorreccion, type EstatusAsistencia, type ListaAsistencia, type MarcaNueva,
    type PersonaAsistencia, type SesionAsistencia,
} from './asistenciaReal';
import { BASE_ASISTENCIA } from './utiles';
import { CargandoFilas } from './PiezasLista';
import modalCheck from '../../../assets/admin/modal-check.svg';
import modalInfo from '../../../assets/admin/modal-info.svg';
import modalLista from '../../../assets/admin/modal-list.svg';

const TONOS = { presente: 'verde', ausente: 'guinda', sin: 'gris' } as const;
const MARCAS = ['presente', 'ausente'] as const;
const porcentaje = (p: number, total: number) => total ? Math.round(p * 100 / total) : 0;
const horario = (s: SesionAsistencia) => ahoraTepic(new Date(s.inicio));
const rutaLista = (sesion: SesionAsistencia, consulta: string) => `${BASE_ASISTENCIA}/${sesion.id}${consulta}`;

function estadoLista(sesion: SesionAsistencia) {
    if (sesion.estado === 'cancelada') return { clave: 'cancelada', texto: 'Cancelada', tono: 'guinda' } as const;
    if (sesion.cerrada) return { clave: 'cerrada', texto: 'Lista cerrada', tono: 'verde' } as const;
    if (new Date(sesion.inicio).getTime() > Date.now()) return { clave: 'futura', texto: 'Aún no empieza', tono: 'gris' } as const;
    return { clave: 'pendiente', texto: 'Por pasar lista', tono: 'dorado' } as const;
}

function useDemostracion() {
    const [params] = useSearchParams();
    return import.meta.env.DEV && ['sesion', 'error-asistencia'].includes(params.get('simular') ?? '');
}

function useLectura<T>(leer: () => Promise<T>) {
    const [intento, setIntento] = useState(0);
    const [resultado, setResultado] = useState<{ intento: number; datos?: T; error?: string }>();
    useEffect(() => {
        let vigente = true;
        leer().then(datos => { if (vigente) setResultado({ intento, datos }); })
            .catch(error => { if (vigente) setResultado({ intento, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [leer, intento]);
    return {
        resultado: resultado?.intento === intento ? resultado : undefined,
        reintentar: () => setIntento(i => i + 1),
        actualizar: (datos: T) => setResultado({ intento, datos }),
    };
}

function ErrorCarga({ error, reintentar }: { error: string; reintentar: () => void }) {
    return <Vacio icono="alerta" titulo="No pudimos cargar la asistencia" texto={error}
        accion={<button type="button" className="pz-boton pz-boton--chico" onClick={reintentar}>Reintentar</button>} />;
}

function sesionDemo(a: Actividad, listas: Lista[]): SesionAsistencia {
    const c = conteo(a.folio, listas);
    return {
        ...c, id: a.folio, folio: a.folio, nombre: a.nombre, espacio: a.espacio,
        inicio: new Date(`${a.fecha}T${a.inicio || '00:00'}:00-07:00`).toISOString(),
        estado: a.estado === 'cancelada' ? 'cancelada' : 'programada',
        cerrada: listaDe(a.folio, listas).cerrada ?? null, total: c.inscritos + c.sinInscripcion,
    };
}

type MostrarSesiones = { mostrar: (sesiones: SesionAsistencia[]) => ReactNode };

function SesionesDemo({ mostrar }: MostrarSesiones) {
    const actividades = useActividades();
    const listas = useAsistencia();
    useInscripciones();
    return mostrar(actividades.filter(a => a.inscripcion && ['publicada', 'cancelada'].includes(a.estado))
        .map(a => sesionDemo(a, listas)));
}

function SesionesReales({ mostrar }: MostrarSesiones) {
    const { resultado, reintentar } = useLectura(listarSesionesAsistencia);
    if (!resultado) return <CargandoFilas texto="Cargando sesiones de asistencia…" />;
    if (!resultado.datos) return <ErrorCarga error={resultado.error ?? ''} reintentar={reintentar} />;
    return mostrar(resultado.datos);
}

type Periodo = 'hoy' | 'semana' | 'anteriores';
const TITULOS: Record<Periodo, string> = { hoy: 'Sesiones de hoy', semana: 'Sesiones de esta semana', anteriores: 'Sesiones anteriores' };

function CargarSesiones({ mostrar }: MostrarSesiones) {
    const demo = useDemostracion();
    const identidad = useContext(ContextoPanel);
    return demo ? <SesionesDemo mostrar={mostrar} /> : <SesionesReales key={identidad?.acceso.usuarioId} mostrar={mostrar} />;
}

export default function Asistencia() {
    return <PanelLayout titulo="Actividades" tema="contenidos paleta">
        <Migas raiz="Actividades" pasos={[['Asistencia']]} />
        <div className="pz-pagina">
            <CargarSesiones mostrar={sesiones => <BandejaSesiones sesiones={sesiones} />} />
        </div>
    </PanelLayout>;
}

const partesFecha = (fecha: string) => { const [d, m] = fechaCorta(fecha).split(' '); return [d, (m ?? '').replace('.', '')]; };
const tonoPct = (p: number) => (p >= 70 ? 'verde' : p >= 40 ? 'dorado' : 'guinda');

function BandejaSesiones({ sesiones }: { sesiones: SesionAsistencia[] }) {
    const navigate = useNavigate();
    const { search } = useLocation();
    const [params, setParams] = useSearchParams();
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('');
    const periodoParam = params.get('ver');
    const periodo: Periodo = periodoParam === 'semana' || periodoParam === 'anteriores' ? periodoParam : 'hoy';
    const hoy = ahoraTepic().fecha;
    const [lunes] = semanaDe(hoy);
    const domingo = sumarDias(lunes, 6);
    const filas = sesiones.map(sesion => ({ sesion, ...horario(sesion), estado: estadoLista(sesion) }));
    const grupos = {
        hoy: filas.filter(f => f.fecha === hoy),
        semana: filas.filter(f => f.fecha >= lunes && f.fecha <= domingo),
        anteriores: filas.filter(f => f.fecha < hoy),
    };
    const texto = busqueda.trim().toLowerCase();
    const filtradas = grupos[periodo].filter(f => f.sesion.nombre.toLowerCase().includes(texto) && (!filtro || f.estado.clave === filtro));
    filtradas.sort((a, b) => (periodo === 'anteriores' ? -1 : 1) * (Date.parse(a.sesion.inicio) - Date.parse(b.sesion.inicio)));
    const elegir = (p: Periodo) => {
        const nuevos = new URLSearchParams(params);
        if (p === 'hoy') nuevos.delete('ver'); else nuevos.set('ver', p);
        setParams(nuevos);
    };
    const limpiar = () => { setBusqueda(''); setFiltro(''); elegir('hoy'); };
    const porPasar = filas.filter(f => f.estado.clave === 'pendiente');
    const cerradas = filas.filter(f => f.sesion.cerrada);
    const asistentes = cerradas.reduce((n, f) => n + f.sesion.presentes, 0);
    const total = cerradas.reduce((n, f) => n + f.sesion.total, 0);
    const ultimas = [...cerradas].sort((a, b) => Date.parse(b.sesion.inicio) - Date.parse(a.sesion.inicio)).slice(0, 4);
    const proximas = filas.filter(f => f.fecha >= hoy && f.estado.clave === 'futura').sort((a, b) => Date.parse(a.sesion.inicio) - Date.parse(b.sesion.inicio)).slice(0, 3);
    const resumen = `${BASE_ASISTENCIA}/resumen${search}`;

    return <>
        <Encabezado titulo="Asistencia" texto="Pasa lista a las personas inscritas el día de la actividad y cierra la lista al terminar.">
            <Cifra icono="hoy" valor={grupos.hoy.length} texto={grupos.hoy.length === 1 ? 'sesión hoy' : 'sesiones hoy'} activa={periodo === 'hoy' && !filtro} alPresionar={() => { setFiltro(''); elegir('hoy'); }} />
            <Cifra icono="reloj" tono="vino" valor={porPasar.length} texto="por pasar lista" activa={filtro === 'pendiente'}
                alPresionar={() => { setFiltro(filtro === 'pendiente' ? '' : 'pendiente'); if (periodo !== 'anteriores') elegir('anteriores'); }} />
            <Cifra icono="estadisticas" valor={`${porcentaje(asistentes, total)}%`} texto="asistencia promedio" alPresionar={() => navigate(resumen)} />
        </Encabezado>

        <div className="pz-columnas">
            <Tarjeta icono="asistencia" id="asistencia-lista" titulo={TITULOS[periodo]} texto="Abre una sesión para marcar quién asistió" className="pz-pendientes">
                <Buscador etiqueta="Buscar actividad" placeholder="Nombre de la actividad" valor={busqueda} alCambiar={setBusqueda}>
                    <FiltrosAvanzados activos={(periodo !== 'hoy' ? 1 : 0) + (filtro ? 1 : 0)} alQuitar={() => { setFiltro(''); elegir('hoy'); }} grupos={[
                        { titulo: 'Periodo', valor: periodo, alCambiar: v => elegir(v as Periodo), opciones: [
                            { valor: 'hoy', texto: 'Hoy', cantidad: grupos.hoy.length },
                            { valor: 'semana', texto: 'Esta semana', cantidad: grupos.semana.length },
                            { valor: 'anteriores', texto: 'Anteriores', cantidad: grupos.anteriores.length }] },
                        { titulo: 'Estado de la lista', valor: filtro, alCambiar: setFiltro, opciones: [
                            { valor: '', texto: 'Todas' }, { valor: 'pendiente', texto: 'Por pasar lista', cantidad: porPasar.length },
                            { valor: 'cerrada', texto: 'Lista cerrada', cantidad: cerradas.length },
                            { valor: 'futura', texto: 'Aún no empieza' }, { valor: 'cancelada', texto: 'Cancelada' }] },
                    ]} />
                </Buscador>
                {filtradas.length === 0 ? (
                    texto || filtro
                        ? <Vacio icono="buscarCuenta" titulo={texto ? `Sin resultados para ${busqueda.trim()}` : 'No hay sesiones con este estado'} texto="Prueba con otra palabra, otro estado o cambia el periodo."
                            accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={limpiar}>Quitar filtros</button>} />
                        : <Vacio icono="asistencia" titulo={periodo === 'hoy' ? 'No hay sesiones hoy' : 'No hay sesiones en este periodo'} texto="Revisa las anteriores para pasar o corregir listas."
                            accion={periodo !== 'anteriores' ? <button type="button" className="pz-boton pz-boton--chico" onClick={() => elegir('anteriores')}>Ver anteriores</button> : undefined} />
                ) : (
                    <div className="pz-grupos" tabIndex={0} role="region" aria-label={TITULOS[periodo]}>
                        <ul className="pz-filas">{filtradas.map(f => {
                            const [d, m] = partesFecha(f.fecha);
                            const e = f.estado;
                            return <li key={f.sesion.id}>
                                <article className={`pz-fila${e.clave === 'pendiente' ? ' pz-fila--espera' : ''}`}>
                                    <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{m}</span></span>
                                    <div className="pz-fila__textos">
                                        <h4 className="pz-fila__titulo">{f.sesion.nombre}</h4>
                                        <p className="pz-fila__detalle"><span className="pz-fila__folio">{f.sesion.folio}</span><span>{f.hora} h</span><span>{f.sesion.espacio}</span>
                                            <span>{f.sesion.cerrada ? `${f.sesion.presentes} de ${f.sesion.total} asistieron` : `${f.sesion.inscritos} inscritos`}</span></p>
                                    </div>
                                    <Chip tono={e.tono}>{e.texto}</Chip>
                                    {e.clave === 'cancelada' ? <span className="as-sin-lista">Sin lista</span>
                                        : <Link to={rutaLista(f.sesion, search)} className={`pz-boton pz-boton--chico${e.clave === 'pendiente' ? '' : ' pz-boton--contorno'}`}>
                                            {e.clave === 'cerrada' ? 'Ver lista' : e.clave === 'pendiente' ? 'Pasar lista' : 'Ver inscritos'}<span className="solo-lectores"> {f.sesion.nombre}</span></Link>}
                                </article>
                            </li>;
                        })}</ul>
                    </div>
                )}
                <div className="pz-tarjeta__pie"><p aria-live="polite">{filtradas.length} {filtradas.length === 1 ? 'sesión' : 'sesiones'}</p></div>
            </Tarjeta>
            <aside className="pz-lateral" aria-label="Próximas y últimas listas">
                <Tarjeta icono="hoy" id="asistencia-proximas" titulo="Próximas listas" texto={proximas.length ? 'Las siguientes sesiones con inscripción' : 'Nada programado'}>
                    {proximas.length ? <ul className="pz-actividades">{proximas.map(f => {
                        const [d, m] = partesFecha(f.fecha);
                        return <li key={f.sesion.id}>
                            <span className="pz-actividades__hora"><strong>{d}</strong><span>{m}</span></span>
                            <div className="pz-actividades__textos">
                                <Link to={rutaLista(f.sesion, search)} className="pz-actividades__titulo pz-enlace-fila">{f.sesion.nombre}</Link>
                                <p className="pz-actividades__detalle">{f.hora} h, {f.sesion.espacio}. {f.sesion.inscritos} inscritos</p>
                            </div>
                        </li>;
                    })}</ul> : <p className="pz-acciones__nota">Cuando se programe una sesión con inscripción, su lista aparecerá aquí.</p>}
                </Tarjeta>
                <Tarjeta icono="estadisticas" id="asistencia-ultimas" titulo="Últimas listas cerradas" texto={`${cerradas.length} ${cerradas.length === 1 ? 'lista cerrada' : 'listas cerradas'} en total`} className="pz-tarjeta--actividades">
                    {ultimas.length ? <ol className="pz-ranking">{ultimas.map(f => {
                        const p = porcentaje(f.sesion.presentes, f.sesion.total);
                        return <li key={f.sesion.id}>
                            <span className="pz-ranking__lugar" aria-hidden="true"><Icono nombre="asistencia" /></span>
                            <div className="pz-ranking__textos">
                                <Link to={rutaLista(f.sesion, search)} className="pz-ranking__nombre pz-enlace-fila">{f.sesion.nombre}</Link>
                                <span className={`pz-ranking__barra as-barra--${tonoPct(p)}`} aria-hidden="true"><span style={{ width: `${p}%` }} /></span>
                            </div>
                            <p className="pz-ranking__valor"><strong>{p}%</strong><span>{fechaCorta(f.fecha)}</span></p>
                        </li>;
                    })}</ol> : <Vacio icono="asistencia" titulo="Aún no hay listas cerradas" texto="Al cerrar una lista verás aquí su asistencia." />}
                    <Link to={resumen} className="pz-boton pz-boton--contorno pz-boton--chico cal-ver-dia">Resumen del mes</Link>
                </Tarjeta>
                <Plegable titulo="Cómo se pasa lista">
                    <ul>
                        <li>El día de la sesión abre su lista y marca a cada persona como presente o ausente.</li>
                        <li>Puedes guardar y seguir después; al terminar, cierra la lista.</li>
                        <li>Ya cerrada, un cambio es una corrección con motivo y queda en el historial.</li>
                    </ul>
                </Plegable>
            </aside>
        </div>
    </>;
}

export function PasarLista() {
    return <DetalleAsistencia />;
}

export function ListaCerrada() {
    return <DetalleAsistencia mostrarCierre />;
}

function DetalleAsistencia({ mostrarCierre = false }: { mostrarCierre?: boolean }) {
    const { folio = '' } = useParams();
    const { search } = useLocation();
    const identidad = useContext(ContextoPanel);
    const demo = useDemostracion();
    return <PanelLayout titulo="Actividades" tema="contenidos paleta">
        <Migas raiz="Actividades" pasos={[['Asistencia', BASE_ASISTENCIA + search], [mostrarCierre ? 'Lista cerrada' : 'Pasar lista']]} />
        <div className="pz-pagina">
            {demo ? <DetalleDemo key={folio} folio={folio} mostrarCierre={mostrarCierre} />
                : <DetalleReal key={`${identidad?.acceso.usuarioId}:${folio}`} id={folio} mostrarCierre={mostrarCierre} />}
        </div>
    </PanelLayout>;
}

function DetalleReal({ id, mostrarCierre }: { id: string; mostrarCierre: boolean }) {
    const leer = useCallback(() => consultarListaAsistencia(id), [id]);
    const { resultado, reintentar, actualizar } = useLectura(leer);
    if (!resultado) return <CargandoFilas texto="Cargando la lista de asistencia…" />;
    if (!resultado.datos) return <ErrorCarga error={resultado.error ?? ''} reintentar={reintentar} />;
    if (mostrarCierre) return <ConfirmacionCierre sesion={resultado.datos.sesion} />;
    return <EditarLista lista={resultado.datos}
        guardar={async (marcas, cerrar) => actualizar(await guardarListaAsistencia(id, marcas, cerrar))}
        guardarCambio={async datos => actualizar(await guardarCorreccion(id, datos))}
        actualizar={reintentar} />;
}

function DemoExtras({ folio, alCerrar }: { folio: string; alCerrar: () => void }) {
    const [nombre, setNombre] = useState('');
    const [contacto, setContacto] = useState('');
    const [error, setError] = useState('');
    const libres = lugaresParaExtras(folio);
    return <Ventana tono="verde" icono={modalLista} titulo="Agregar persona sin inscripción"
        texto={libres > 0 ? `Quedan ${libres} lugares. La persona se marcará presente.` : 'No quedan lugares en esta sesión.'}
        textoConfirmar="Agregar y marcar presente" ocupada={libres <= 0} error={error} alCerrar={alCerrar}
        alConfirmar={() => {
            try { agregarSinInscripcion(folio, nombre, contacto); alCerrar(); }
            catch (e) { setError(mensajeError(e)); }
        }}>
        <div className="contenidos-campo"><label htmlFor="as-nombre">Nombre completo</label>
            <input className="tr-entrada" id="as-nombre" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
        <div className="contenidos-campo"><label htmlFor="as-contacto">Contacto opcional</label>
            <input className="tr-entrada" id="as-contacto" value={contacto} onChange={e => setContacto(e.target.value)} /></div>
    </Ventana>;
}

function DetalleDemo({ folio, mostrarCierre }: { folio: string; mostrarCierre: boolean }) {
    const { search } = useLocation();
    const actividad = useActividades().find(a => a.folio === folio && a.inscripcion);
    const listas = useAsistencia();
    useInscripciones();
    if (!actividad) return <Navigate to={BASE_ASISTENCIA + search} replace />;
    const sesion = sesionDemo(actividad, listas);
    if (mostrarCierre) return <ConfirmacionCierre sesion={sesion} />;
    const demo = listaDe(folio, listas);
    const personas = personasDe(folio).map(p => {
        const marca = p.extra ? 'presente' : demo.marcas[p.id];
        return {
            usuarioId: p.id, nombre: p.persona, extra: p.extra, nota: demo.notas[p.id] ?? '',
            marca: marca === 'presente' || marca === 'ausente' ? marca : null,
            version: marca && marca !== 'sin' ? 1 : null, confirmada: !p.extra, motivoAnterior: null,
        };
    });
    const correcciones: ListaAsistencia['correcciones'] = demo.correcciones.flatMap((c, i) =>
        c.de === 'sin' || c.a === 'sin' ? [] : [{ ...c, id: String(i), anterior: c.de, nuevo: c.a }]);
    return <EditarLista lista={{ sesion, personas, correcciones }} demo
        guardar={async (marcas, cerrar) => {
            await guardarAsistencia(folio);
            marcas.forEach(m => marcar(folio, m.usuarioId, m.estatus));
            if (cerrar) cerrarLista(folio);
        }}
        guardarCambio={async c => corregir(folio, c.usuarioId, c.estatus, c.motivo)} />;
}

function ConfirmacionCierre({ sesion }: { sesion: SesionAsistencia }) {
    const { search } = useLocation();
    if (!sesion.cerrada) return <Navigate to={rutaLista(sesion, search)} replace />;
    const { fecha, hora } = horario(sesion);
    const p = porcentaje(sesion.presentes, sesion.total);
    return <>
        <Encabezado titulo="Lista cerrada" texto="La asistencia quedó registrada.">
            <Link to={BASE_ASISTENCIA + search} className="pz-boton">Volver a Asistencia</Link>
        </Encabezado>
        <Tarjeta icono="check" id="lista-cerrada" titulo={sesion.nombre} texto={`${diaLargo(fecha)}, ${hora} h`} accion={<Chip tono="verde">Lista cerrada</Chip>}>
            <div className="pz-envio-ok" role="status">
                <span className="pz-envio-ok__insignia" aria-hidden="true"><Icono nombre="check" /></span>
                <p><strong>{sesion.presentes} presentes y {sesion.ausentes} ausentes.</strong> {p}% de asistencia.</p>
            </div>
            <div className="pz-acciones pz-acciones--fila">
                <Link to={rutaLista(sesion, search)} className="pz-boton pz-boton--contorno pz-boton--chico">Ver la lista</Link>
                <Link to={`${BASE_ASISTENCIA}/resumen${search}`} className="pz-boton pz-boton--contorno pz-boton--chico">Resumen del mes</Link>
            </div>
        </Tarjeta>
    </>;
}

type PersonaEditable = PersonaAsistencia & { extra?: boolean; nota?: string };
type EditorLista = {
    lista: Omit<ListaAsistencia, 'personas'> & { personas: PersonaEditable[] };
    guardar: (marcas: MarcaNueva[], cerrar: boolean) => Promise<void>;
    guardarCambio: (datos: DatosCorreccion) => Promise<void>;
    actualizar?: () => void;
    demo?: boolean;
};

function EditarLista({ lista, guardar, guardarCambio, actualizar, demo = false }: EditorLista) {
    const { sesion, personas, correcciones } = lista;
    const navigate = useNavigate();
    const { search } = useLocation();
    const [borrador, setBorrador] = useState<Record<string, EstatusAsistencia>>({});
    const [ventana, setVentana] = useState<'cerrar' | 'agregar' | PersonaEditable | null>(null);
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [guardado, setGuardado] = useState('');
    const [verMarca, setVerMarca] = useState<'todas' | 'sin' | EstatusAsistencia>('todas');
    const [buscarPersona, setBuscarPersona] = useState('');
    const estado = estadoLista(sesion);
    const lectura = estado.clave === 'futura' || estado.clave === 'cancelada';
    const cerrada = !!sesion.cerrada;
    const { fecha, hora } = horario(sesion);
    const cambios = Object.entries(borrador).map(([usuarioId, estatus]) => ({ usuarioId, estatus }));
    const marcaDe = (p: PersonaEditable) => borrador[p.usuarioId] ?? p.marca ?? 'sin';
    const sinMarcar = personas.filter(p => p.confirmada && !p.marca && !borrador[p.usuarioId]);
    const avance = porcentaje(sesion.presentes + sesion.ausentes, sesion.total);
    const asistencia = porcentaje(sesion.presentes, sesion.total);
    const textoPersona = buscarPersona.trim().toLowerCase();
    const cuenta = (m: 'sin' | EstatusAsistencia) => personas.filter(p => marcaDe(p) === m).length;
    const visibles = personas.filter(p => (verMarca === 'todas' || marcaDe(p) === verMarca) && (!textoPersona || p.nombre.toLowerCase().includes(textoPersona)));

    function cambiarMarca(p: PersonaEditable, marca: EstatusAsistencia) {
        setGuardado('');
        setBorrador(previo => {
            const siguiente = { ...previo };
            if (marca === p.marca || marca === previo[p.usuarioId]) delete siguiente[p.usuarioId];
            else siguiente[p.usuarioId] = marca;
            return siguiente;
        });
    }
    function abrir(accion: typeof ventana) { setMotivo(''); setError(''); setVentana(accion); }
    function marcarPendientes(marca: EstatusAsistencia) {
        setGuardado('');
        setBorrador(previo => {
            const siguiente = { ...previo };
            for (const p of sinMarcar) siguiente[p.usuarioId] = marca;
            return siguiente;
        });
    }
    async function ejecutar(accion: () => Promise<void>, mensaje: string) {
        if (guardando) return;
        setError(''); setGuardado(''); setGuardando(true);
        try { await accion(); setGuardado(mensaje); setVentana(null); }
        catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); }
    }
    function guardarMarcas(cerrar: boolean) {
        void ejecutar(async () => {
            await guardar(cambios, cerrar);
            setBorrador({});
            if (cerrar) navigate(`${BASE_ASISTENCIA}/${sesion.id}/cerrada${search}`);
        }, 'Asistencia guardada');
    }
    function corregirMarca(p: PersonaEditable) {
        if (!motivo.trim()) { setError('Escribe el motivo de la corrección.'); return; }
        if (p.version === null) return;
        const datos: DatosCorreccion = { usuarioId: p.usuarioId, version: p.version, estatus: p.marca === 'presente' ? 'ausente' : 'presente', motivo };
        void ejecutar(() => guardarCambio(datos), 'Corrección guardada');
    }

    return <>
        <Encabezado titulo={sesion.nombre} texto={`${diaLargo(fecha)}, ${hora} h, ${sesion.espacio}. ${sesion.inscritos} inscritos.`}>
            <Cifra icono="check" valor={sesion.presentes} texto="presentes" />
            <Cifra icono="alerta" tono="vino" valor={sesion.ausentes} texto="ausentes" />
            <Cifra icono="reloj" valor={sesion.sinMarcar} texto="sin marcar" />
        </Encabezado>
        {error && !ventana && <Aviso tono="error" titulo="No se pudo guardar la asistencia." texto={`${error} Tus marcas siguen en pantalla; inténtalo de nuevo.`} />}
        {guardado && <Aviso titulo={`${guardado}.`} texto="Puedes seguir marcando o cerrar la lista cuando termines." />}

        <div className="pz-columnas">
            <Tarjeta icono="grupo" id="pasar-lista" titulo={cerrada ? 'Registro de asistencia' : 'Personas inscritas'} className="pz-pendientes"
                texto={cerrada ? 'Para cambiar una marca, usa Corregir: queda en el historial' : lectura ? 'La lista se abre cuando empieza la sesión' : 'Marca a cada persona; puedes guardar y seguir después'}
                accion={!lectura && !cerrada && sinMarcar.length > 0 ? <div className="pz-acciones pz-acciones--fila">
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={guardando} onClick={() => marcarPendientes('presente')}>Pendientes a presentes</button>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={guardando} onClick={() => marcarPendientes('ausente')}>Pendientes a ausentes</button>
                </div> : undefined}>
                {personas.length > 0 && <Buscador etiqueta="Buscar persona" placeholder="Nombre de la persona" valor={buscarPersona} alCambiar={setBuscarPersona}>
                    <FiltrosAvanzados activos={verMarca !== 'todas' ? 1 : 0} alQuitar={() => setVerMarca('todas')} grupos={[
                        { titulo: 'Marca', valor: verMarca, alCambiar: v => setVerMarca(v as typeof verMarca), opciones: [
                            { valor: 'todas', texto: 'Todas', cantidad: personas.length },
                            ...(cerrada ? [] : [{ valor: 'sin', texto: 'Sin marcar', cantidad: cuenta('sin') }]),
                            { valor: 'presente', texto: 'Presentes', cantidad: cuenta('presente') },
                            { valor: 'ausente', texto: 'Ausentes', cantidad: cuenta('ausente') }] },
                    ]} />
                </Buscador>}
                {personas.length === 0 ? <Vacio icono="grupo" titulo="No hay personas inscritas" texto="Aquí aparecerán las inscripciones confirmadas para esta sesión." />
                    : visibles.length === 0 ? <Vacio icono="buscarCuenta" titulo="Nadie con ese filtro" texto="Prueba con otra marca u otro nombre."
                        accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { setVerMarca('todas'); setBuscarPersona(''); }}>Ver a todas</button>} /> : (
                    <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lista de asistencia">
                        <ul className="pz-filas">{visibles.map(p => {
                            const m = marcaDe(p);
                            const n = personas.indexOf(p);
                            const editable = !lectura && !cerrada && p.confirmada && (!p.marca || demo);
                            const corregible = !lectura && !!p.marca && !editable && !p.extra;
                            return <li key={p.usuarioId}>
                                <article className={`pz-fila as-fila as-fila--${m}`}>
                                    <span className="as-numero" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
                                    <div className="pz-fila__textos">
                                        <h4 className="pz-fila__titulo">{p.nombre}</h4>
                                        {p.extra ? <p className="pz-fila__detalle"><span>Llegó sin inscripción</span></p>
                                            : p.motivoAnterior ? <p className="pz-fila__detalle"><span>Corregida: {p.motivoAnterior}</span></p>
                                            : demo && editable ? <input className="as-nota" placeholder="Nota (opcional)" aria-label={`Nota de ${p.nombre}`} value={p.nota ?? ''} onChange={e => anotar(sesion.id, p.usuarioId, e.target.value)} />
                                            : null}
                                    </div>
                                    {editable ? (
                                        <div className="pz-segmentado as-marcar" role="group" aria-label={`Asistencia de ${p.nombre}`}>
                                            {MARCAS.map(op => <button key={op} type="button" disabled={guardando} aria-pressed={m === op}
                                                className={`pz-opcion as-marcar__${op}${m === op ? ' pz-opcion--activa' : ''}`} onClick={() => cambiarMarca(p, op)}>{NOMBRE_MARCA[op]}</button>)}
                                        </div>
                                    ) : <Chip tono={TONOS[m]}>{NOMBRE_MARCA[m]}</Chip>}
                                    {corregible ? <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={guardando} onClick={() => abrir(p)}>Corregir<span className="solo-lectores"> {p.nombre}</span></button>
                                        : <span aria-hidden="true" />}
                                </article>
                            </li>;
                        })}</ul>
                    </div>
                )}
                <div className="pz-tarjeta__pie"><p aria-live="polite">{visibles.length} de {personas.length} {personas.length === 1 ? 'persona' : 'personas'}</p></div>
            </Tarjeta>

            <aside className="pz-lateral" aria-label="Avance de la lista">
                <Tarjeta icono="asistencia" id="as-avance" titulo={cerrada ? 'Lista cerrada' : lectura ? 'Lista aún cerrada' : 'Avance de la lista'} className="pz-tarjeta--actividades"
                    texto={cerrada ? `Cerró ${sesion.cerrada!.quien} el ${fechaCorta(ahoraTepic(new Date(sesion.cerrada!.fecha)).fecha)}` : `${avance}% guardada`}
                    accion={<Chip tono={cerrada ? 'verde' : estado.tono}>{cerrada ? 'Cerrada' : estado.clave === 'pendiente' ? 'Abierta' : estado.texto}</Chip>}>
                    <div className={`ins-medidor ins-medidor--${cerrada ? tonoPct(asistencia) : avance === 100 ? 'verde' : 'dorado'}`} style={{ ['--p' as string]: `${cerrada ? asistencia : avance}%` }} role="img"
                        aria-label={cerrada ? `${asistencia}% de asistencia` : `${avance}% de la lista guardada`}>
                        <span className="ins-medidor__centro"><strong>{cerrada ? asistencia : avance}%</strong><small>{cerrada ? 'asistencia' : 'guardada'}</small></span>
                    </div>
                    {cambios.length > 0 && <p className="pz-acciones__nota" role="status">Tienes {cambios.length} {cambios.length === 1 ? 'marca' : 'marcas'} sin guardar.</p>}
                    {correcciones.length > 0 && <LineaHistorial etiqueta="Correcciones de la lista" movimientos={[...correcciones].reverse().map(x => ({
                        titulo: `${x.persona}: de ${NOMBRE_MARCA[x.anterior].toLowerCase()} a ${NOMBRE_MARCA[x.nuevo].toLowerCase()}`, tono: 'dorado' as const, icono: 'revision' as const, detalle: x.quien, nota: x.motivo,
                    }))} />}
                    {!lectura && !cerrada && <div className="pz-acciones">
                        <button type="button" className="pz-boton" disabled={guardando} onClick={() => abrir('cerrar')}>Cerrar lista</button>
                        <button type="button" className="pz-boton pz-boton--contorno" disabled={guardando || cambios.length === 0} onClick={() => guardarMarcas(false)}>{guardando ? 'Guardando…' : 'Guardar y seguir'}</button>
                        {demo && <button type="button" className="pz-boton pz-boton--contorno" onClick={() => abrir('agregar')}>Agregar persona sin inscripción</button>}
                    </div>}
                    {actualizar && <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={guardando} onClick={actualizar}>{cambios.length ? 'Descartar cambios y actualizar' : 'Actualizar lista'}</button>}
                    <Link to={BASE_ASISTENCIA + search} className="pz-enlace">Volver a Asistencia</Link>
                </Tarjeta>
            </aside>
        </div>

        {ventana === 'cerrar' && <Ventana tono="verde" icono={modalCheck} angosta titulo="¿Cerrar la lista de asistencia?"
            texto={sinMarcar.length ? `Quedan ${sinMarcar.length} sin marcar: se registrarán como ausentes. Después, los cambios requieren una corrección con motivo.`
                : 'Se guardarán tus marcas. Después, los cambios requieren una corrección con motivo.'}
            textoConfirmar="Cerrar lista" textoCancelar="Seguir editando" ocupada={guardando} error={error}
            alConfirmar={() => guardarMarcas(true)} alCerrar={() => { if (!guardando) abrir(null); }} />}
        {ventana === 'agregar' && <DemoExtras folio={sesion.id} alCerrar={() => abrir(null)} />}
        {ventana && typeof ventana === 'object' && <Ventana tono="dorado" icono={modalInfo}
            titulo={`Corregir asistencia de ${ventana.nombre}`}
            texto={`Se cambiará de ${ventana.marca === 'presente' ? 'presente a ausente' : 'ausente a presente'}. El historial guardará tu nombre, la fecha y el motivo.`}
            textoConfirmar="Guardar corrección" ocupada={guardando} error={error}
            alConfirmar={() => corregirMarca(ventana)} alCerrar={() => { if (!guardando) abrir(null); }}>
            <label className="pz-campo pz-campo--lleno"><span>Motivo de la corrección <span className="contenidos-campo__obligatorio">*</span></span>
                <textarea rows={3} required maxLength={500} placeholder="Ej.: sí asistió, se marcó por error." value={motivo} disabled={guardando}
                    onChange={e => { setMotivo(e.target.value); setError(''); }} /></label>
        </Ventana>}
    </>;
}

export function ResumenAsistencia() {
    const { search } = useLocation();
    const hoy = ahoraTepic().fecha;
    return <PanelLayout titulo="Actividades" tema="contenidos paleta">
        <Migas raiz="Actividades" pasos={[['Asistencia', BASE_ASISTENCIA + search], ['Resumen del mes']]} />
        <div className="pz-pagina">
            <CargarSesiones mostrar={sesiones => <CifrasDelMes sesiones={sesiones.filter(s => {
                const fecha = horario(s).fecha;
                return fecha.slice(0, 7) === hoy.slice(0, 7) && fecha <= hoy;
            })} />} />
        </div>
    </PanelLayout>;
}

function CifrasDelMes({ sesiones }: { sesiones: SesionAsistencia[] }) {
    const { search } = useLocation();
    const hoy = ahoraTepic().fecha;
    const [anio, mes] = hoy.split('-').map(Number);
    const nombreMes = new Date(anio, mes - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    const ordenadas = [...sesiones].sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));
    const cerradas = sesiones.filter(s => s.cerrada);
    const asistentes = cerradas.reduce((n, s) => n + s.presentes, 0);
    const total = cerradas.reduce((n, s) => n + s.total, 0);
    const pendientes = sesiones.filter(s => estadoLista(s).clave === 'pendiente').length;
    return <>
        <Encabezado titulo={`Resumen de ${nombreMes}`} texto="Cómo ha ido la asistencia en las sesiones ya realizadas. Las listas sin cerrar no cuentan en el promedio.">
            <Cifra icono="estadisticas" valor={`${porcentaje(asistentes, total)}%`} texto="asistencia promedio" />
            <Cifra icono="grupo" valor={asistentes} texto="asistentes" />
            <Cifra icono="reloj" tono="vino" valor={pendientes} texto={pendientes === 1 ? 'lista sin cerrar' : 'listas sin cerrar'} />
        </Encabezado>
        <Tarjeta icono="asistencia" id="resumen-por-sesion" titulo="Por sesión" texto="De la más reciente a la más antigua"
            accion={<Link to={BASE_ASISTENCIA + search} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a Asistencia</Link>}>
            {ordenadas.length === 0 ? <Vacio icono="asistencia" titulo="Todavía no hay sesiones realizadas este mes" texto="Cuando se cierre una lista, aparecerá aquí." /> : (
                <ul className="pz-filas">{ordenadas.map(s => {
                    const e = estadoLista(s);
                    const { fecha } = horario(s);
                    const p = porcentaje(s.presentes, s.total);
                    const [d, m] = partesFecha(fecha);
                    return <li key={s.id}>
                        <article className="pz-fila as-resumen">
                            <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{m}</span></span>
                            <div className="pz-fila__textos">
                                <h4 className="pz-fila__titulo"><Link to={rutaLista(s, search)} className="pz-enlace-fila">{s.nombre}</Link></h4>
                                <p className="pz-fila__detalle"><span className="pz-fila__folio">{s.folio}</span><span>{s.inscritos} inscritos</span>{s.cerrada && <span>{s.presentes} presentes</span>}</p>
                            </div>
                            {s.cerrada ? <span className="ins-cupo"><span className="ins-cupo__texto"><strong>{p}%</strong><small>asistencia</small></span>
                                <span className="pz-ocupacion" aria-hidden="true"><span className={`pz-ocupacion__relleno pz-ocupacion__relleno--${tonoPct(p)}`} style={{ width: `${p}%` }} /></span></span>
                                : <span className="pz-acciones__nota">Sin cerrar</span>}
                            <Chip tono={e.tono}>{e.clave === 'cerrada' ? 'Cerrada' : e.texto}</Chip>
                        </article>
                    </li>;
                })}</ul>
            )}
        </Tarjeta>
    </>;
}
