// Actividades › Inscripciones y cupos (datos reales: servicios/inscripciones).
// Diseño común del panel (docs/guia-diseno.md): accesos rápidos, lista con filtros y filas en tarjeta. La lógica no cambia.
import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { Chip, EncabezadoPagina, EstadoVacio, Migas, type TonoChip } from '../componentes';
import { IconoBandera, IconoLista, IconoReloj } from '../contenidos/piezas';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { mensajeError } from '../../../servicios/api';
import { inscripcionesEnMemoria, listarActividadesInscripciones, listarSolicitudesInscripcion, consultarCuposInscripciones, decidirSolicitudInscripcion, type DecisionInscripcion, type ActividadInscripciones, type SolicitudInscripcion, type CuposInscripciones } from '../../../servicios/inscripciones';
import { AccesosRapidos, CargandoFilas, CeldaDoble, ControlesLista, CuerpoLista, FILAS_POR_PAGINA, PieLista, SeccionLista, TablaLista } from './PiezasLista';
import vacioCheck from '../../../assets/admin/vacio-check.svg';
import vacioBuscar from '../../../assets/admin/vacio-search.svg';

const BASE = '/admin/actividades/inscripciones';
const ZONA = 'America/Mazatlan';
const fecha = (valor: string) => new Date(valor).toLocaleString('es-MX', { timeZone: ZONA, dateStyle: 'medium', timeStyle: 'short' });
const dia = (valor: string) => new Date(valor).toLocaleDateString('es-MX', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' });
const hora = (valor: string) => new Date(valor).toLocaleTimeString('es-MX', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' });
const TONO_SESION: Record<string, TonoChip> = { programada: 'verde', finalizada: 'gris', cancelada: 'guinda' };
const NOMBRE_SESION: Record<string, string> = { programada: 'Programada', finalizada: 'Realizada', cancelada: 'Cancelada' };
const TONO_INSCRIPCION: Record<string, TonoChip> = { pendiente: 'dorado', confirmada: 'verde', rechazada: 'gris', cancelada: 'guinda' };
const NOMBRE_INSCRIPCION: Record<string, string> = { pendiente: 'Por decidir', confirmada: 'Confirmada', rechazada: 'Rechazada', cancelada: 'Cancelada' };
const DECISIONES: Record<DecisionInscripcion, string> = { confirmar: 'Confirmar', rechazar: 'Rechazar', cancelar: 'Cancelar inscripción' };

type FilaSesion = { actividad: ActividadInscripciones; sesion: ActividadInscripciones['sesiones'][number] };
type FiltroSesiones = 'todas' | 'programadas' | 'realizadas' | 'canceladas';
const ESTADO_FILTRO: Record<Exclude<FiltroSesiones, 'todas'>, string> = { programadas: 'programada', realizadas: 'finalizada', canceladas: 'cancelada' };

export default function Inscripciones() {
    const identidad = useContext(ContextoPanel);
    return <PanelLayout titulo="Actividades" tema="contenidos">
        <Migas raiz="Actividades" pasos={[['Inscripciones y cupos']]} />
        <EncabezadoPagina etiqueta="Actividades · Inscripciones" titulo="Inscripciones y cupos"
            texto="Elige una sesión para ver quién se inscribió, cuántos lugares quedan y decidir cada solicitud." />
        <BandejaActividades key={identidad?.acceso.usuarioId ?? ''} />
    </PanelLayout>;
}

function BandejaActividades() {
    const [pagina, setPagina] = useState(0);
    const [paginaTabla, setPaginaTabla] = useState(0);
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
    const libres = datos.length - conInscripcion.length;
    const sesiones: FilaSesion[] = conInscripcion.flatMap(a => (a.sesiones ?? []).map(s => ({ actividad: a, sesion: s })))
        .sort((x, y) => x.sesion.inicio.localeCompare(y.sesion.inicio));
    const cuenta = (f: FiltroSesiones) => sesiones.filter(x => f === 'todas' || x.sesion.estado === ESTADO_FILTRO[f]).length;
    const abiertas = sesiones.filter(f => f.sesion.registroAbierto).length;
    const texto = busqueda.trim().toLowerCase();
    const filtradas = sesiones.filter(f => (filtro === 'todas' || f.sesion.estado === ESTADO_FILTRO[filtro])
        && (!registro || (registro === 'abierto') === f.sesion.registroAbierto)
        && (!texto || f.actividad.titulo.toLowerCase().includes(texto)));
    const paginas = Math.max(1, Math.ceil(filtradas.length / FILAS_POR_PAGINA));
    const pag = Math.min(paginaTabla, paginas - 1);
    const visibles = filtradas.slice(pag * FILAS_POR_PAGINA, (pag + 1) * FILAS_POR_PAGINA);
    const cupos = useCupos(visibles.map(f => f.sesion.id), intento);
    const elegir = (f: FiltroSesiones) => { setFiltro(f); setPaginaTabla(0); };
    const limpiar = () => { setBusqueda(''); setRegistro(''); elegir('todas'); };

    if (!actual) return <CargandoFilas texto="Cargando actividades…" />;
    if (actual.error) return <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar las actividades" texto={actual.error} accion={{ texto: 'Reintentar', alPresionar: () => recargar(x => x + 1) }} />;

    return <>
        <AccesosRapidos accesos={[
            { clave: 'abiertas', icono: <IconoReloj />, cifra: abiertas, titulo: abiertas === 1 ? 'Sesión con registro abierto' : 'Sesiones con registro abierto', texto: 'Reciben inscripciones ahora.', enlace: 'Ver abiertas', tono: 'guinda', activo: registro === 'abierto', alPresionar: () => { setRegistro(registro === 'abierto' ? '' : 'abierto'); setPaginaTabla(0); } },
            { clave: 'programadas', icono: <IconoBandera />, cifra: cuenta('programadas'), titulo: cuenta('programadas') === 1 ? 'Sesión programada' : 'Sesiones programadas', texto: 'Aún no se realizan.', enlace: 'Ver programadas', tono: 'azul', activo: filtro === 'programadas', alPresionar: () => elegir(filtro === 'programadas' ? 'todas' : 'programadas') },
            { clave: 'actividades', icono: <IconoLista />, cifra: conInscripcion.length, titulo: conInscripcion.length === 1 ? 'Actividad con inscripción' : 'Actividades con inscripción', texto: libres ? `Más ${libres} de entrada libre.` : 'Todas piden inscripción.', tono: 'gris' },
        ]} />

        <ControlesLista
            etiqueta="Filtros de sesiones"
            chips={{ etiqueta: 'Estado de la sesión', activa: filtro, alElegir: elegir, opciones: [
                { valor: 'todas', texto: `Todas (${sesiones.length})` },
                { valor: 'programadas', texto: `Programadas (${cuenta('programadas')})` },
                { valor: 'realizadas', texto: `Realizadas (${cuenta('realizadas')})` },
                { valor: 'canceladas', texto: `Canceladas (${cuenta('canceladas')})` },
            ] }}
            busqueda={{ etiqueta: 'Buscar actividad', marcador: 'Nombre de la actividad…', texto: busqueda, alBuscar: v => { setBusqueda(v); setPaginaTabla(0); } }}
            grupos={[{ etiqueta: 'Registro', opciones: [{ valor: '', texto: 'Abierto o cerrado' }, { valor: 'abierto', texto: 'Registro abierto' }, { valor: 'cerrado', texto: 'Registro cerrado' }], activa: registro, alElegir: v => { setRegistro(v); setPaginaTabla(0); } }]}
            alLimpiar={limpiar}
        />

        <SeccionLista
            id="sesiones-inscripcion"
            icono={<IconoLista />}
            titulo="Sesiones con inscripción"
            texto="Abre una sesión para ver a las personas inscritas y decidir cada solicitud."
            extra={<button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => recargar(x => x + 1)}>Actualizar</button>}
        >
            <CuerpoLista>
                {sesiones.length === 0 ? (
                    <EstadoVacio icono={vacioCheck} titulo="No hay sesiones con inscripción" texto="Cuando gestiones actividades que pidan inscripción, sus sesiones aparecerán aquí." />
                ) : visibles.length === 0 ? (
                    <EstadoVacio icono={vacioBuscar} titulo="Sin resultados" texto="No hay sesiones con esos filtros." accion={{ texto: 'Quitar filtros', alPresionar: limpiar }} />
                ) : (
                    <TablaLista
                        clase="ac-tabla--sesiones"
                        etiqueta="Sesiones con inscripción"
                        filas={visibles}
                        clave={f => f.sesion.id}
                        columnas={[
                            { titulo: 'Actividad', celda: f => <CeldaDoble arriba={f.actividad.titulo} abajo={f.actividad.requerimientos ? `Requisitos: ${f.actividad.requerimientos}` : 'Sin requisitos'} /> },
                            { titulo: 'Sesión', celda: f => <CeldaDoble arriba={dia(f.sesion.inicio)} abajo={`${hora(f.sesion.inicio)} · hora de Tepic`} /> },
                            { titulo: 'Cupo', celda: f => <CeldaCupo cupo={cupos[f.sesion.id]} /> },
                            { titulo: 'Estado', celda: f => <CeldaDoble arriba={<Chip tono={TONO_SESION[f.sesion.estado] ?? 'gris'}>{NOMBRE_SESION[f.sesion.estado] ?? f.sesion.estado}</Chip>} abajo={f.sesion.registroAbierto ? 'Registro abierto' : 'Registro cerrado'} /> },
                            { titulo: 'Acción', celda: f => <Link to={`${BASE}/${f.sesion.id}`} className="contenidos-tabla__accion">Ver inscritos →<span className="tr-oculto"> {f.actividad.titulo}</span></Link> },
                        ]}
                    />
                )}
            </CuerpoLista>
            {filtradas.length > 0 && <PieLista texto={`Mostrando ${visibles.length} de ${filtradas.length} sesiones`} pagina={pag} paginas={paginas} alCambiar={setPaginaTabla} />}
            {(pagina > 0 || datos.length >= 20) && <div className="contenidos-lista__pie"><p>Actividades: grupo {pagina + 1}</p>
                <div className="contenidos-paginas" role="group" aria-label="Más actividades">
                    <button type="button" disabled={pagina === 0} onClick={() => { setPagina(x => x - 1); setPaginaTabla(0); }}>‹ Anteriores</button>
                    <button type="button" disabled={datos.length < 20} onClick={() => { setPagina(x => x + 1); setPaginaTabla(0); }}>Siguientes ›</button>
                </div></div>}
        </SeccionLista>
    </>;
}

// Cupo de cada sesión visible (se pide solo para las 5 de la página)
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

function CeldaCupo({ cupo }: { cupo?: CuposInscripciones | 'error' }) {
    if (!cupo) return <span className="ac-cifra-cargando" aria-label="Cargando cupo" />;
    if (cupo === 'error') return <small className="ac-sin-accion">Sin datos</small>;
    const p = cupo.capacidad ? Math.min(100, Math.round((cupo.confirmados / cupo.capacidad) * 100)) : 0;
    const lleno = cupo.disponibles <= 0;
    return <span className="ac-cupo ac-cupo--celda">
        <span className="ac-cupo__barra" aria-hidden="true"><span className={`ac-cupo__relleno ac-cupo__relleno--${lleno ? 'guinda' : p >= 80 ? 'dorado' : 'verde'}`} style={{ width: `${p}%` }} /></span>
        <span>{cupo.confirmados}/{cupo.capacidad}</span>
    </span>;
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
    return <PanelLayout titulo="Actividades" tema="contenidos">
        <Migas raiz="Actividades" pasos={[['Inscripciones y cupos', BASE], [conocida?.actividad.titulo ?? 'Sesión']]} />
        <EncabezadoPagina volver={{ texto: 'Volver a inscripciones y cupos', ruta: BASE }} etiqueta="Actividades · Inscripciones"
            titulo={conocida?.actividad.titulo ?? 'Inscripciones de la sesión'}
            texto={conocida ? `${dia(conocida.sesion.inicio)} · ${hora(conocida.sesion.inicio)} (hora de Tepic). Confirmar ocupa un lugar del cupo.`
                : 'Confirma, rechaza o cancela cada inscripción. Confirmar ocupa un lugar del cupo.'}
            accion={conocida && <Chip tono={conocida.sesion.registroAbierto ? 'verde' : 'gris'}>{conocida.sesion.registroAbierto ? 'Registro abierto' : 'Registro cerrado'}</Chip>} />
        {folio && <ListaSesion key={`${identidad?.acceso.usuarioId}:${folio}`} sesion={folio} seleccionada={id} />}
    </PanelLayout>;
}

type FiltroInscripcion = 'todas' | SolicitudInscripcion['status'];

function ListaSesion({ sesion, seleccionada }: { sesion: string; seleccionada?: string }) {
    const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0);
    const [filtro, setFiltro] = useState<FiltroInscripcion>('todas');
    const [busqueda, setBusqueda] = useState('');
    const [paginaLista, setPaginaLista] = useState(0);
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
    const ocupacion = cupos && cupos.capacidad ? Math.min(100, Math.round((cupos.confirmados / cupos.capacidad) * 100)) : 0;
    const lleno = (cupos?.disponibles ?? 1) <= 0;
    const solicitudes = actual?.solicitudes ?? [];
    const cuenta = (f: FiltroInscripcion) => solicitudes.filter(s => f === 'todas' || s.status === f).length;
    const texto = busqueda.trim().toLowerCase();
    const visibles = solicitudes.filter(s => (filtro === 'todas' || s.status === filtro) && (!texto || (s.nombre || '').toLowerCase().includes(texto)))
        .sort((a, b) => Number(b.status === 'pendiente') - Number(a.status === 'pendiente') || a.creadoA.localeCompare(b.creadoA));
    const sinCifra = <span className="ac-cifra-cargando" aria-label="Cargando" />;
    const paginasLista = Math.max(1, Math.ceil(visibles.length / FILAS_POR_PAGINA));
    const pagLista = Math.min(paginaLista, paginasLista - 1);
    const enPagina = visibles.slice(pagLista * FILAS_POR_PAGINA, (pagLista + 1) * FILAS_POR_PAGINA);

    return <>
        <section className="ac-cupo-sesion" aria-label="Cupo de la sesión">
            <div className="ac-cupo-sesion__cifras">
                <div><span>Confirmadas</span><strong>{cupos ? cupos.confirmados : sinCifra}</strong></div>
                <div><span>Lugares libres</span><strong className={lleno ? 'ac-cupo-sesion__lleno' : undefined}>{cupos ? cupos.disponibles : sinCifra}</strong></div>
                <div><span>Cupo total</span><strong>{cupos ? cupos.capacidad : sinCifra}</strong></div>
                <div><span>Por decidir</span><strong>{actual ? cuenta('pendiente') : sinCifra}</strong></div>
            </div>
            <div className="ac-cupo">
                <span className="ac-cupo__barra"><span className={`ac-cupo__relleno ac-cupo__relleno--${lleno ? 'guinda' : ocupacion >= 80 ? 'dorado' : 'verde'}`} style={{ width: `${ocupacion}%` }} /></span>
                <span>{cupos ? (lleno ? 'Cupo lleno: ya no se pueden confirmar más personas.' : `${ocupacion}% del cupo ocupado`) : 'Calculando cupo…'}</span>
            </div>
        </section>

        {solicitudes.length > 0 && <ControlesLista
            etiqueta="Filtros de inscripciones"
            chips={{ etiqueta: 'Estado de la inscripción', activa: filtro, alElegir: (v: FiltroInscripcion) => { setFiltro(v); setPaginaLista(0); }, opciones: [
                { valor: 'todas', texto: `Todas (${cuenta('todas')})` },
                { valor: 'pendiente', texto: `Por decidir (${cuenta('pendiente')})` },
                { valor: 'confirmada', texto: `Confirmadas (${cuenta('confirmada')})` },
                { valor: 'rechazada', texto: `Rechazadas (${cuenta('rechazada')})` },
                { valor: 'cancelada', texto: `Canceladas (${cuenta('cancelada')})` },
            ] }}
            busqueda={{ etiqueta: 'Buscar por nombre', marcador: 'Nombre de la persona…', texto: busqueda, alBuscar: v => { setBusqueda(v); setPaginaLista(0); } }}
            alLimpiar={() => { setFiltro('todas'); setBusqueda(''); setPaginaLista(0); }}
        />}

        <SeccionLista
            id="inscritos-titulo"
            icono={<IconoLista />}
            titulo="Personas inscritas"
            texto="Las que esperan decisión aparecen primero."
            extra={<button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => recargar(x => x + 1)}>Actualizar</button>}
        >
            <CuerpoLista>
            {!actual ? <CargandoFilas texto="Cargando inscripciones…" filas={3} />
                : actual.error ? <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar las inscripciones" texto={actual.error} accion={{ texto: 'Reintentar', alPresionar: () => recargar(x => x + 1) }} />
                : !solicitudes.length ? <EstadoVacio icono={vacioCheck} titulo="Todavía no hay inscripciones" texto="Cuando alguien se inscriba a la sesión desde el portal, aparecerá aquí." />
                : !visibles.length ? <EstadoVacio icono={vacioBuscar} titulo="Sin resultados" texto="No hay inscripciones con esos filtros." accion={{ texto: 'Quitar filtros', alPresionar: () => { setFiltro('todas'); setBusqueda(''); } }} />
                : <ul className="ac-inscritos">{enPagina.map(i => <Solicitud key={i.id} solicitud={i} seleccionada={seleccionada === i.id} sinCupo={lleno} alActualizar={() => recargar(x => x + 1)} />)}</ul>}
            </CuerpoLista>
            {visibles.length > 0 && <PieLista texto={`Mostrando ${enPagina.length} de ${visibles.length} inscripciones`} pagina={pagLista} paginas={paginasLista} alCambiar={setPaginaLista} />}
            {actual?.solicitudes && (pagina > 0 || actual.solicitudes.length >= 20) && <div className="contenidos-lista__pie"><p>Página {pagina + 1}</p>
                <div className="contenidos-paginas" role="group" aria-label="Páginas">
                    <button type="button" disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>‹ Anterior</button>
                    <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina + 1}</button>
                    <button type="button" disabled={actual.solicitudes.length < 20} onClick={() => setPagina(x => x + 1)}>Siguiente ›</button>
                </div></div>}
        </SeccionLista>
    </>;
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
    return <li className={`ac-inscrito${seleccionada ? ' ac-inscrito--seleccionada' : ''}${abierta ? ' ac-inscrito--abierta' : ''}`}>
        <div className="ac-inscrito__fila">
            <span className="at-persona__inicial" aria-hidden="true">{nombre.charAt(0).toUpperCase()}</span>
            <span className="ac-inscrito__textos"><strong>{nombre}</strong><small>Se inscribió el {fecha(i.creadoA)}</small></span>
            <Chip tono={TONO_INSCRIPCION[i.status] ?? 'gris'}>{NOMBRE_INSCRIPCION[i.status] ?? i.status}</Chip>
            {decidible
                ? <button type="button" className={`contenidos-boton contenidos-boton--chico ${i.status === 'pendiente' && !abierta ? 'contenidos-boton--oscuro' : 'contenidos-boton--contorno'}`}
                    aria-expanded={abierta} onClick={() => { setAbierta(x => !x); setError(''); }}>{abierta ? 'Cerrar' : i.status === 'pendiente' ? 'Decidir' : 'Cancelar…'}</button>
                : <span className="ac-inscrito__sin-accion">Sin acciones</span>}
        </div>
        {abierta && <form onSubmit={enviar} className="ac-inscrito__decision">
            <fieldset className="tr-campos" disabled={ocupado}>
                <legend className="tr-oculto">Decisión sobre {nombre}</legend>
                {opciones.length > 1 && <div className="contenidos-filtros tr-decisiones" role="radiogroup" aria-label="Decisión">
                    {opciones.map(op => (
                        <label key={op} className={`contenidos-filtro${accion === op ? ' contenidos-filtro--activo' : ''}${op === 'confirmar' && sinCupo ? ' tr-deshabilitada' : ''}`}>
                            <input type="radio" name={`decision-${i.id}`} value={op} checked={accion === op} disabled={op === 'confirmar' && sinCupo} onChange={() => setAccion(op)} className="tr-oculto" />
                            {DECISIONES[op]}
                        </label>
                    ))}
                </div>}
                {sinCupo && i.status === 'pendiente' && <p className="contenidos-campo__ayuda">No hay lugares libres: solo puedes rechazar o cancelar.</p>}
                <div className="contenidos-campo"><label htmlFor={`motivo-${i.id}`}>Motivo <span className="contenidos-campo__obligatorio">*</span></label>
                    <textarea id={`motivo-${i.id}`} name="motivo" rows={2} maxLength={500} required
                        placeholder={accion === 'confirmar' ? 'Ej.: cumple con los requisitos.' : 'Ej.: la persona pidió cancelar.'} /></div>
                <label className="at-casilla"><input key={accion} type="checkbox" required /> {accion === 'confirmar'
                    ? 'Revisé los requisitos de la actividad.'
                    : 'Revisé la solicitud y confirmo la decisión.'}</label>
                <div className="tr-acciones">
                    <button className={`contenidos-boton contenidos-boton--chico ${accion === 'confirmar' ? 'contenidos-boton--oscuro' : 'at-boton--guinda-lleno'}`} disabled={accion === 'confirmar' && sinCupo}>{ocupado ? 'Guardando…' : `Guardar: ${DECISIONES[accion].toLowerCase()}`}</button>
                </div>
            </fieldset>
        </form>}
        {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se guardó</strong><p>{error}</p>
            <p className="tr-acciones"><button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alActualizar}>Consultar estado actual</button></p></div>}
    </li>;
}

