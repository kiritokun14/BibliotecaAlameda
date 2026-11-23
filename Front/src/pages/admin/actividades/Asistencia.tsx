import { useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { AvisoResultado, Chip, EncabezadoPagina, EstadoVacio, Migas } from '../componentes';
import { Ventana } from '../Ventana';
import { IconoAviso, IconoBandera, IconoLista, IconoReloj } from '../contenidos/piezas';
import { paginar } from '../contenidoDemo/utiles';
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
import {
    AccesosRapidos, CargandoFilas, CeldaDoble, ControlesLista, CuerpoLista,
    FILAS_POR_PAGINA, PieLista, SeccionLista, TablaLista,
} from './PiezasLista';
import vacioCheck from '../../../assets/admin/vacio-check.svg';
import vacioBuscar from '../../../assets/admin/vacio-search.svg';
import modalCheck from '../../../assets/admin/modal-check.svg';
import modalInfo from '../../../assets/admin/modal-info.svg';
import modalLista from '../../../assets/admin/modal-list.svg';

const TONOS = { presente: 'verde', ausente: 'guinda', sin: 'gris' } as const;
const MARCAS = ['presente', 'ausente'] as const;
const POR_PAGINA = 10;
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
    return <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar la asistencia" texto={error}
        accion={{ texto: 'Reintentar', alPresionar: reintentar }} />;
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
    const { search } = useLocation();
    return <PanelLayout titulo="Actividades" tema="contenidos">
        <Migas raiz="Actividades" pasos={[['Asistencia']]} />
        <EncabezadoPagina titulo="Asistencia" texto="Elige una sesión para registrar quién asistió."
            accion={<Link className="contenidos-boton contenidos-boton--contorno" to={`${BASE_ASISTENCIA}/resumen${search}`}>Resumen del mes</Link>} />
        <CargarSesiones mostrar={sesiones => <BandejaSesiones sesiones={sesiones} />} />
    </PanelLayout>;
}

function BandejaSesiones({ sesiones }: { sesiones: SesionAsistencia[] }) {
    const navigate = useNavigate();
    const { search } = useLocation();
    const [params, setParams] = useSearchParams();
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('');
    const [pagina, setPagina] = useState(0);
    const periodoParam = params.get('ver');
    const periodo = periodoParam === 'semana' || periodoParam === 'anteriores' ? periodoParam : 'hoy';
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
    const { paginas, actual, visibles } = paginar(filtradas, pagina, FILAS_POR_PAGINA);
    const elegir = (p: Periodo) => {
        setPagina(0);
        const nuevos = new URLSearchParams(params);
        if (p === 'hoy') nuevos.delete('ver');
        else nuevos.set('ver', p);
        setParams(nuevos);
    };
    const limpiar = () => { setBusqueda(''); setFiltro(''); elegir('hoy'); };
    const cerradas = sesiones.filter(s => s.cerrada);
    const asistentes = cerradas.reduce((n, s) => n + s.presentes, 0);
    const total = cerradas.reduce((n, s) => n + s.total, 0);

    return <>
        <AccesosRapidos accesos={[
            { clave: 'hoy', icono: <IconoBandera />, cifra: grupos.hoy.length, titulo: 'Sesiones de hoy', texto: diaLargo(hoy), enlace: 'Ver hoy', tono: 'azul', activo: periodo === 'hoy', alPresionar: () => elegir('hoy') },
            { clave: 'pendientes', icono: <IconoReloj />, cifra: filas.filter(f => f.estado.clave === 'pendiente').length, titulo: 'Por pasar lista', texto: 'Sesiones que ya iniciaron.', enlace: 'Ver anteriores', tono: 'guinda', activo: periodo === 'anteriores', alPresionar: () => elegir('anteriores') },
            { clave: 'promedio', icono: <IconoLista />, cifra: `${porcentaje(asistentes, total)}%`, titulo: 'Asistencia promedio', texto: `${cerradas.length} listas cerradas`, enlace: 'Ver resumen', tono: 'gris', alPresionar: () => navigate(`${BASE_ASISTENCIA}/resumen${search}`) },
        ]} />
        <ControlesLista etiqueta="Filtros de asistencia"
            chips={{ etiqueta: 'Periodo', activa: periodo, alElegir: elegir, opciones: [
                { valor: 'hoy', texto: `Hoy (${grupos.hoy.length})` },
                { valor: 'semana', texto: `Esta semana (${grupos.semana.length})` },
                { valor: 'anteriores', texto: `Anteriores (${grupos.anteriores.length})` },
            ] }}
            busqueda={{ etiqueta: 'Buscar actividad', marcador: 'Nombre de la actividad…', texto: busqueda, alBuscar: v => { setBusqueda(v); setPagina(0); } }}
            grupos={[{ etiqueta: 'Estado de la lista', opciones: [{ valor: '', texto: 'Todas' }, { valor: 'pendiente', texto: 'Por pasar lista' }, { valor: 'cerrada', texto: 'Lista cerrada' }, { valor: 'futura', texto: 'Aún no empieza' }, { valor: 'cancelada', texto: 'Cancelada' }], activa: filtro, alElegir: v => { setFiltro(v); setPagina(0); } }]}
            alLimpiar={limpiar}
        />
        <SeccionLista id="asistencia-lista" icono={<IconoLista />} titulo={TITULOS[periodo]}>
            <CuerpoLista>
                {filtradas.length === 0 ? (
                    <EstadoVacio icono={vacioBuscar} titulo="No hay sesiones para mostrar"
                        texto={texto || filtro ? 'Prueba con otra búsqueda, estado o periodo.' : 'Consulta otro periodo para pasar lista o corregir una marca.'}
                        accion={texto || filtro ? { texto: 'Quitar filtros', alPresionar: limpiar }
                            : periodo !== 'anteriores' ? { texto: 'Ver anteriores', alPresionar: () => elegir('anteriores') } : undefined} />
                ) : (
                    <ul className="pz-filas" aria-label={TITULOS[periodo]}>{visibles.map(f => <li key={f.sesion.id}>
                        <article className={`pz-fila${f.estado.clave === 'pendiente' ? ' pz-fila--espera' : ''}`}>
                            <span className="pz-fecha" aria-hidden="true"><strong>{fechaCorta(f.fecha).split(' ')[0]}</strong><span>{fechaCorta(f.fecha).split(' ')[1]}</span></span>
                            <div className="pz-fila__textos"><h4 className="pz-fila__titulo">{f.sesion.nombre}</h4>
                                <p className="pz-fila__detalle"><span>{f.sesion.folio}</span><span>{f.hora}</span><span>{f.sesion.espacio}</span><span>{f.sesion.inscritos} inscritos</span></p></div>
                            <Chip tono={f.estado.tono}>{f.estado.texto}</Chip>
                            <Link to={rutaLista(f.sesion, search)} className="pz-boton pz-boton--chico">{f.estado.clave === 'pendiente' ? 'Pasar lista' : 'Ver lista'}<span className="tr-oculto"> {f.sesion.nombre}</span></Link>
                        </article></li>)}</ul>
                )}
            </CuerpoLista>
            {filtradas.length > 0 && <PieLista texto={`Mostrando ${visibles.length} de ${filtradas.length} sesiones`} pagina={actual} paginas={paginas} alCambiar={setPagina} />}
        </SeccionLista>
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
    return <PanelLayout titulo="Actividades" tema="contenidos">
        <Migas raiz="Actividades" pasos={[[ 'Asistencia', BASE_ASISTENCIA + search ], [mostrarCierre ? 'Lista cerrada' : 'Lista de la sesión']]} />
        {demo ? <DetalleDemo key={folio} folio={folio} mostrarCierre={mostrarCierre} />
            : <DetalleReal key={`${identidad?.acceso.usuarioId}:${folio}`} id={folio} mostrarCierre={mostrarCierre} />}
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
    return <>
        <EncabezadoPagina titulo="Lista cerrada" texto={sesion.nombre} />
        <AvisoResultado tono="exito" titulo="Asistencia guardada"
            texto={`${sesion.presentes} presentes y ${sesion.ausentes} ausentes`} chip="Lista cerrada" />
        <div className="tr-acciones">
            <Link to={BASE_ASISTENCIA + search} className="contenidos-boton contenidos-boton--oscuro">Volver a Asistencia</Link>
            <Link to={rutaLista(sesion, search)} className="contenidos-boton contenidos-boton--contorno">Ver la lista</Link>
        </div>
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
    const [pagina, setPagina] = useState(0);
    const [borrador, setBorrador] = useState<Record<string, EstatusAsistencia>>({});
    const [ventana, setVentana] = useState<'cerrar' | 'agregar' | PersonaEditable | null>(null);
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [guardado, setGuardado] = useState('');
    const estado = estadoLista(sesion);
    const lectura = estado.clave === 'futura' || estado.clave === 'cancelada';
    const { fecha, hora } = horario(sesion);
    const { paginas, actual, visibles } = paginar(personas, pagina, POR_PAGINA);
    const cambios = Object.entries(borrador).map(([usuarioId, estatus]) => ({ usuarioId, estatus }));
    const sinMarcar = personas.filter(p => p.confirmada && !p.marca && !borrador[p.usuarioId]);
    const avance = porcentaje(sesion.presentes + sesion.ausentes, sesion.total);

    function cambiarMarca(p: PersonaEditable, marca: EstatusAsistencia) {
        setGuardado('');
        setBorrador(previo => {
            const siguiente = { ...previo };
            if (marca === p.marca || marca === previo[p.usuarioId]) delete siguiente[p.usuarioId];
            else siguiente[p.usuarioId] = marca;
            return siguiente;
        });
    }

    function abrir(accion: typeof ventana) {
        setMotivo('');
        setError('');
        setVentana(accion);
    }

    function marcarPendientes() {
        setGuardado('');
        setBorrador(previo => {
            const siguiente = { ...previo };
            for (const p of sinMarcar) siguiente[p.usuarioId] = 'presente';
            return siguiente;
        });
    }

    async function ejecutar(accion: () => Promise<void>, mensaje: string) {
        if (guardando) return;
        setError('');
        setGuardado('');
        setGuardando(true);
        try {
            await accion();
            setGuardado(mensaje);
            setVentana(null);
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setGuardando(false);
        }
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
        <EncabezadoPagina volver={{ texto: 'Volver a Asistencia', ruta: BASE_ASISTENCIA + search }}
            titulo={sesion.nombre} texto={`Sesión del ${fechaCorta(fecha)} a las ${hora} en ${sesion.espacio}`}
            accion={<Chip tono={estado.tono}>{estado.clave === 'pendiente' ? 'Lista abierta' : estado.texto}</Chip>} />
        {error && !ventana && <AvisoResultado tono="error" titulo="No se pudo guardar la asistencia" texto={error} chip="Sin guardar" />}
        {guardado && <AvisoResultado tono="exito" titulo={guardado} texto="El cambio quedó registrado en esta sesión." chip="Guardada" />}
        <section className="ac-cupo-sesion" aria-label="Asistencia guardada">
            <div className="ac-cupo-sesion__cifras">
                <div><span>Presentes</span><strong>{sesion.presentes}</strong></div>
                <div><span>Ausentes</span><strong>{sesion.ausentes}</strong></div>
                <div><span>Sin marcar</span><strong>{sesion.sinMarcar}</strong></div>
                <div><span>Inscritos confirmados</span><strong>{sesion.inscritos}</strong></div>
            </div>
            <div className="ac-cupo">
                <span className="ac-cupo__barra"><span className={`ac-cupo__relleno ac-cupo__relleno--${avance === 100 ? 'verde' : 'dorado'}`} style={{ width: `${avance}%` }} /></span>
                <span>{sesion.cerrada ? `Cerró ${sesion.cerrada.quien} el ${fechaCorta(ahoraTepic(new Date(sesion.cerrada.fecha)).fecha)}.` : `${avance}% de la lista guardada`}</span>
            </div>
        </section>
        <SeccionLista id="asistencia-personas" icono={<IconoLista />} titulo="Personas en la lista"
            extra={<>
                {!lectura && !sesion.cerrada && sinMarcar.length > 0 && <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico"
                    disabled={guardando} onClick={marcarPendientes}>Marcar pendientes como presentes</button>}
                {actualizar && <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico"
                    disabled={guardando} onClick={actualizar}>{cambios.length ? 'Descartar cambios y actualizar' : 'Actualizar lista'}</button>}
            </>}>
            {personas.length === 0 ? <EstadoVacio icono={vacioCheck} titulo="No hay personas inscritas"
                texto="Aquí aparecerán las inscripciones confirmadas para esta sesión." /> : (
                <ul className="ac-inscritos">
                    {visibles.map(p => {
                        const marca = borrador[p.usuarioId] ?? p.marca ?? 'sin';
                        const editable = !lectura && !sesion.cerrada && p.confirmada && (!p.marca || demo);
                        return <li key={p.usuarioId} className="ac-inscrito">
                            <div className="ac-inscrito__fila ac-inscrito__fila--lista">
                                <span className="ac-inscrito__textos"><strong>{p.nombre}</strong>
                                    {!p.confirmada && <small>{p.extra ? 'Llegó sin inscripción' : 'Asistencia registrada'}</small>}
                                    {p.motivoAnterior && <small>Motivo de corrección anterior · {p.motivoAnterior}</small>}
                                </span>
                                {demo && editable && <input className="tr-entrada ac-nota" placeholder="Nota opcional"
                                    aria-label={`Nota de ${p.nombre}`} value={p.nota}
                                    onChange={e => anotar(sesion.id, p.usuarioId, e.target.value)} />}
                                <Chip tono={TONOS[marca]}>{NOMBRE_MARCA[marca]}</Chip>
                                {editable && <span className="contenidos-filtros ac-marcar" role="group" aria-label={`Asistencia de ${p.nombre}`}>
                                    {MARCAS.map(op => <button key={op} type="button" disabled={guardando} aria-pressed={marca === op}
                                        className={`contenidos-filtro ac-marcar__${op}${marca === op ? ' contenidos-filtro--activo' : ''}`}
                                        onClick={() => cambiarMarca(p, op)}>{NOMBRE_MARCA[op]}</button>)}
                                </span>}
                                {!lectura && p.marca && !editable && !p.extra && <button type="button" disabled={guardando}
                                    className="contenidos-tabla__accion ac-boton-texto" onClick={() => abrir(p)}>Corregir<span className="tr-oculto"> {p.nombre}</span></button>}
                            </div>
                        </li>;
                    })}
                </ul>
            )}
            {personas.length > 0 && <PieLista texto={`Mostrando ${visibles.length} de ${personas.length} personas`} pagina={actual} paginas={paginas} alCambiar={setPagina} />}
            {correcciones.length > 0 && <div className="tr-datos__bloque">
                <h3 className="at-subtitulo">Correcciones registradas</h3>
                <ol className="tr-eventos">{correcciones.map(c => <li key={c.id} className="tr-eventos--hecho">
                    <strong>{c.persona} · {NOMBRE_MARCA[c.anterior]} → {NOMBRE_MARCA[c.nuevo]}</strong>
                    <small>{c.quien} · {new Date(c.fecha).toLocaleString('es-MX', { timeZone: 'America/Mazatlan', dateStyle: 'medium', timeStyle: 'short' })}</small>
                    <small>{c.motivo}</small>
                </li>)}</ol>
            </div>}
        </SeccionLista>

        {!lectura && !sesion.cerrada && <div className="ac-barra-acciones">
            {demo && <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => abrir('agregar')}>Agregar persona sin inscripción</button>}
            <span className="ac-barra-acciones__derecha">
                {cambios.length > 0 && <span role="status">Tienes marcas sin guardar</span>}
                <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={guardando || cambios.length === 0}
                    onClick={() => guardarMarcas(false)}>Guardar y seguir</button>
                <button type="button" className="contenidos-boton contenidos-boton--oscuro" disabled={guardando} onClick={() => abrir('cerrar')}>Cerrar lista</button>
            </span>
        </div>}

        {ventana === 'cerrar' && <Ventana tono="verde" icono={modalCheck} angosta titulo="¿Cerrar la lista de asistencia?"
            texto={sinMarcar.length ? `Se guardarán tus marcas y se registrarán ${sinMarcar.length} ausencias por las personas sin marcar.`
                : 'Se guardarán tus marcas. La lista seguirá disponible para consultar y corregir.'}
            textoConfirmar="Cerrar lista" textoCancelar="Seguir editando" ocupada={guardando} error={error}
            alConfirmar={() => guardarMarcas(true)} alCerrar={() => { if (!guardando) abrir(null); }} />}
        {ventana === 'agregar' && <DemoExtras folio={sesion.id} alCerrar={() => abrir(null)} />}
        {ventana && typeof ventana === 'object' && <Ventana tono="dorado" icono={modalInfo}
            titulo={`Corregir asistencia de ${ventana.nombre}`}
            texto={`Se cambiará de ${ventana.marca === 'presente' ? 'presente a ausente' : 'ausente a presente'}. El historial guardará tu nombre y el motivo.`}
            textoConfirmar="Guardar corrección" ocupada={guardando} error={error}
            alConfirmar={() => corregirMarca(ventana)} alCerrar={() => { if (!guardando) abrir(null); }}>
            <div className="contenidos-campo">
                <label htmlFor="as-motivo">Motivo de la corrección</label>
                <textarea id="as-motivo" rows={3} required maxLength={500} value={motivo} disabled={guardando}
                    onChange={e => { setMotivo(e.target.value); setError(''); }} />
            </div>
        </Ventana>}
    </>;
}

export function ResumenAsistencia() {
    const { search } = useLocation();
    const hoy = ahoraTepic().fecha;
    const [anio, mes] = hoy.split('-').map(Number);
    const nombre = new Date(anio, mes - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return <PanelLayout titulo="Actividades" tema="contenidos">
        <Migas raiz="Actividades" pasos={[[ 'Asistencia', BASE_ASISTENCIA + search ], ['Resumen del mes']]} />
        <EncabezadoPagina volver={{ texto: 'Volver a Asistencia', ruta: BASE_ASISTENCIA + search }}
            titulo={`Resumen de ${nombre}`} texto="Asistencia registrada en las sesiones de este mes." />
        <CargarSesiones mostrar={sesiones => <CifrasDelMes sesiones={sesiones.filter(s => {
            const fecha = horario(s).fecha;
            return fecha.slice(0, 7) === hoy.slice(0, 7) && fecha <= hoy;
        })} />} />
    </PanelLayout>;
}

function CifrasDelMes({ sesiones }: { sesiones: SesionAsistencia[] }) {
    const { search } = useLocation();
    const cerradas = sesiones.filter(s => s.cerrada);
    const asistentes = cerradas.reduce((n, s) => n + s.presentes, 0);
    const total = cerradas.reduce((n, s) => n + s.total, 0);
    const pendientes = sesiones.filter(s => estadoLista(s).clave === 'pendiente').length;
    return <>
        <AccesosRapidos titulo="Cifras del mes" accesos={[
            { clave: 'promedio', icono: <IconoBandera />, cifra: `${porcentaje(asistentes, total)}%`, titulo: 'Asistencia promedio', texto: 'De las listas cerradas.', tono: 'azul' },
            { clave: 'asistentes', icono: <IconoLista />, cifra: asistentes, titulo: 'Presencias registradas', texto: `En ${cerradas.length} listas cerradas.`, tono: 'gris' },
            { clave: 'pendientes', icono: <IconoAviso />, cifra: pendientes, titulo: 'Listas sin cerrar', texto: 'Sesiones que ya iniciaron.', tono: 'guinda' },
        ]} />
        <SeccionLista id="resumen-por-sesion" icono={<IconoLista />} titulo="Asistencia por sesión"
            texto="El promedio se calcula con las listas cerradas.">
            {sesiones.length === 0 ? <EstadoVacio icono={vacioCheck} titulo="No hay sesiones este mes"
                texto="Aquí podrás consultar el registro de cada sesión." /> : (
                <TablaLista clase="ac-tabla--resumen" etiqueta="Asistencia por sesión" filas={sesiones} clave={s => s.id}
                    columnas={[
                        { titulo: 'Folio', folio: true, celda: s => <Link to={rutaLista(s, search)} className="contenidos-tabla__accion">{s.folio}<span className="tr-oculto"> {horario(s).fecha} a las {horario(s).hora}</span></Link> },
                        { titulo: 'Sesión', celda: s => <CeldaDoble arriba={s.nombre} abajo={`${fechaCorta(horario(s).fecha)} a las ${horario(s).hora}`} /> },
                        { titulo: 'Inscritos', celda: s => s.inscritos },
                        { titulo: 'Presentes', celda: s => s.presentes },
                        { titulo: 'Asistencia', celda: s => s.cerrada ? `${porcentaje(s.presentes, s.total)}%` : '—' },
                        { titulo: 'Lista', celda: s => { const estado = estadoLista(s); return <Chip tono={estado.tono}>{estado.texto}</Chip>; } },
                    ]} />
            )}
        </SeccionLista>
    </>;
}
