// Actividades › Propuestas de actividades (datos reales: servicios/actividades).
// Diseño: el mismo de Atención (piezas de ../componentes, clases «contenidos-*» y «tr-*»). La lógica no cambia.
import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { CambioSesion } from './CambioSesion';
import { EstadoVacio, Migas } from '../componentes';
import { type Etapa } from '../atencion/Flujo';
import { Bloque } from '../../../components/portal/Esqueleto';
import { ContextoPanel, permisoGlobal } from '../../../servicios/accesoPanel';
import { mensajeError } from '../../../servicios/api';
import { actividadEnMemoria, actividadesEnMemoria, consultarActividad, consultarEspaciosAgenda, decidirActividad, guardarActividad, listarActividades,
    type AccionActividad, type ActividadGestion, type DatosActividadReal } from '../../../servicios/actividades';
import vacioBuscar from '../../../assets/admin/vacio-search.svg';
import '../atencion/AtencionTramites.css';
import './Actividades.css';
import { Aviso, Buscador, Cabecera, Chip as ChipPz, Cifra, Dato, Datos, Encabezado as EncabezadoPz, FiltrosAvanzados, Icono as IconoPz, Plegable, Tarjeta as TarjetaPz, Vacio as VacioPz, type NombreIcono, type TonoEstado } from '../piezasPanel';

const BASE = '/admin/actividades/propuestas';
const vacia: DatosActividadReal = { nombre: '', tipo: 'Taller', descripcion: '', fecha: '', inicio: '', fin: '', espacio: '',
    cupo: '', inscripcion: true, publico: 'Público en general', responsable: '', materiales: '' };
const estados: Record<string, string> = { borrador: 'Borrador', 'en-revision': 'En revisión', aprobada: 'Aprobada', publicada: 'Publicada', archivada: 'Archivada o retirada', cancelada: 'Cancelada' };
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
    return <PanelLayout titulo="Actividades" tema="contenidos paleta">
        <Migas raiz="Actividades" pasos={enLista ? [['Propuestas de actividades']] : [['Propuestas de actividades', BASE], [nueva ? 'Nueva' : folio ?? '']]} />
        {!enLista && (!actual || actual.error) && <div className="pz-pagina"><EncabezadoPz titulo={titulo} texto={nueva ? 'Registra la actividad como borrador o envíala de una vez a revisión.' : 'Consultando la actividad…'} /></div>}
        {confirmado?.folio === folio && confirmado && <div className="at-bloque at-bloque--info" role="status"><strong>Listo</strong><p>{confirmado.texto}</p></div>}
        {!actual && <div className="contenidos-tabla" aria-busy="true" role="status"><span className="solo-lectores">Cargando actividades…</span>{[0, 1, 2, 3].map(i => <Bloque key={i} clase="tr-esqueleto" />)}</div>}
        {actual?.error && <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar las actividades" texto={actual.error} accion={{ texto: 'Reintentar', alPresionar: () => recargar(x => x + 1) }} />}
        {actual && !actual.error && (nueva || editar) && <Formulario key={clave} actividad={actual.actividad} />}
        {actual?.lista && <Lista lista={actual.lista} />}
        {actual?.actividad && !editar && <Detalle key={`${clave}:${actual.actividad.actualizado}`} actividad={actual.actividad} alRecargar={() => recargar(x => x + 1)} alCambiarSesion={texto => { setConfirmado({ folio, texto }); recargar(x => x + 1); }} />}
    </PanelLayout>;
}

// ---------- Lista (21 nov 2026, con las piezas del panel): cifras que filtran | lista con bloque de fecha | lateral ----------
const TONO_PZ: Record<string, TonoEstado> = { borrador: 'gris', 'en-revision': 'dorado', aprobada: 'dorado', publicada: 'verde', archivada: 'gris', cancelada: 'guinda' };
const ICONO_TIPO_ACTIVIDAD: Record<string, NombreIcono> = { Taller: 'contenido', 'Club de lectura': 'fuentes', Club: 'fuentes', Visita: 'grupo', Evento: 'calendario', Charla: 'mensajes', Presentación: 'fuentes' };
// Primero lo que necesita atención; después lo publicado y al final lo cancelado o archivado
const ORDEN_ESTADO: Record<string, number> = { 'en-revision': 0, aprobada: 1, borrador: 2, publicada: 3, cancelada: 4, archivada: 5 };
const accionDe = (estado: string) => (estado === 'en-revision' ? 'Revisar' : estado === 'aprobada' ? 'Publicar' : estado === 'borrador' ? 'Continuar' : 'Abrir');

function Lista({ lista }: { lista: ActividadGestion[] }) {
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('');
    const [tipo, setTipo] = useState('');
    const cuenta = (estado: string) => lista.filter(a => a.estado === estado).length;
    const tipos = [...new Set(lista.map(a => a.tipo).filter(Boolean))].sort();
    const coincide = (a: ActividadGestion) => `${a.nombre} ${a.folio} ${a.espacio}`.toLowerCase().includes(busqueda.toLowerCase());
    const visibles = lista.filter(a => (!filtro || a.estado === filtro) && (!tipo || a.tipo === tipo) && coincide(a))
        .sort((x, y) => (ORDEN_ESTADO[x.estado] ?? 9) - (ORDEN_ESTADO[y.estado] ?? 9) || (x.fecha || '9999').localeCompare(y.fecha || '9999'));
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mazatlan' });
    const proximas = lista.filter(a => a.estado === 'publicada').map(a => ({ a, s: proximaSesion(a) }))
        .filter(x => x.s && !x.s.pasada && x.s.fecha >= hoy).sort((x, y) => `${x.s!.fecha}${x.s!.inicio}`.localeCompare(`${y.s!.fecha}${y.s!.inicio}`)).slice(0, 5);
    const alternar = (estado: string) => setFiltro(filtro === estado ? '' : estado);
    const activos = (filtro ? 1 : 0) + (tipo ? 1 : 0);

    return (
        <div className="pz-pagina">
            <EncabezadoPz titulo="Propuestas de actividades" texto="Registra actividades, envíalas a revisión y publícalas en la agenda. La autorización va antes de la publicación.">
                <Cifra icono="reloj" valor={cuenta('en-revision')} texto="en revisión" activa={filtro === 'en-revision'} alPresionar={() => alternar('en-revision')} />
                <Cifra icono="alerta" tono="vino" valor={cuenta('aprobada')} texto="por publicar" activa={filtro === 'aprobada'} alPresionar={() => alternar('aprobada')} />
                <Cifra icono="check" valor={cuenta('publicada')} texto="publicadas" activa={filtro === 'publicada'} alPresionar={() => alternar('publicada')} />
            </EncabezadoPz>

            <div className="pz-columnas">
                <TarjetaPz icono="calendario" id="actividades-lista" titulo="Actividades registradas" texto="Primero lo que necesita tu atención; después por fecha" className="pz-pendientes"
                    accion={<Link className="pz-boton pz-boton--chico" to={`${BASE}/nueva`}>Nueva actividad</Link>}>
                    <Buscador etiqueta="Buscar por nombre, folio o espacio" placeholder="Buscar por nombre, folio o espacio" valor={busqueda} alCambiar={setBusqueda}>
                        <FiltrosAvanzados activos={activos} alQuitar={() => { setFiltro(''); setTipo(''); }} grupos={[
                            { titulo: 'Estado', valor: filtro, alCambiar: setFiltro, opciones: [{ valor: '', texto: 'Todas', cantidad: lista.length }, ...Object.entries(estados).map(([v, t]) => ({ valor: v, texto: t, cantidad: cuenta(v) }))] },
                            { titulo: 'Tipo', valor: tipo, alCambiar: setTipo, opciones: [{ valor: '', texto: 'Todos' }, ...tipos.map(t => ({ valor: t, texto: t, cantidad: lista.filter(a => a.tipo === t).length }))] },
                        ]} />
                    </Buscador>
                    {visibles.length === 0 ? (
                        lista.length === 0
                            ? <VacioPz icono="calendario" titulo="Aún no hay actividades" texto="Cuando registres una actividad, aparecerá aquí."
                                accion={<Link className="pz-boton pz-boton--chico" to={`${BASE}/nueva`}>Nueva actividad</Link>} />
                            : <VacioPz icono="buscarCuenta" titulo="Sin resultados" texto="No hay actividades con esos filtros."
                                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { setFiltro(''); setTipo(''); setBusqueda(''); }}>Quitar filtros</button>} />
                    ) : (
                        <div className="pz-grupos" tabIndex={0} role="region" aria-label="Actividades registradas">
                            <ul className="pz-filas">
                                {visibles.map(a => {
                                    const [dia, mes] = partesFecha(a.fecha || '');
                                    return (
                                        <li key={a.folio}>
                                            <article className={`pz-fila${a.estado === 'en-revision' || a.estado === 'aprobada' ? ' pz-fila--espera' : ''}`}>
                                                {a.fecha ? <span className="pz-fecha" aria-hidden="true"><strong>{dia}</strong><span>{mes}</span></span>
                                                    : <span className="pz-fila__icono" aria-hidden="true"><IconoPz nombre={ICONO_TIPO_ACTIVIDAD[a.tipo] ?? 'calendario'} /></span>}
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{a.nombre}</h4>
                                                    <p className="pz-fila__detalle">
                                                        <span className="pz-fila__folio">{a.folio}</span><span>{a.tipo}</span><span>{a.espacio || 'Sin espacio'}</span>
                                                        <span>{a.cupo ? `${a.inscritos} de ${a.cupo} lugares` : `${a.inscritos} inscritos`}</span>
                                                    </p>
                                                </div>
                                                <ChipPz tono={TONO_PZ[a.estado] ?? 'gris'}>{estados[a.estado] ?? a.estado}</ChipPz>
                                                <Link to={`${BASE}/${a.folio}`} className={`pz-boton pz-boton--chico${a.estado === 'en-revision' || a.estado === 'aprobada' ? '' : ' pz-boton--contorno'}`}>
                                                    {accionDe(a.estado)}<span className="solo-lectores"> {a.folio}</span>
                                                </Link>
                                            </article>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                    <div className="pz-tarjeta__pie"><p aria-live="polite">{visibles.length} de {lista.length} actividades</p></div>
                </TarjetaPz>

                <aside className="pz-lateral" aria-label="Lo que viene">
                    <TarjetaPz icono="hoy" id="actividades-proximas" titulo="Lo que viene en la agenda" texto="Las próximas sesiones publicadas" className="pz-tarjeta--actividades">
                        {proximas.length ? (
                            <ul className="pz-actividades">
                                {proximas.map(({ a, s }) => {
                                    const [dia, mes] = partesFecha(s!.fecha);
                                    return (
                                        <li key={`${a.folio}-${s!.fecha}-${s!.inicio}`}>
                                            <span className="pz-actividades__hora"><strong>{dia}</strong><span>{mes}</span></span>
                                            <div className="pz-actividades__textos">
                                                <Link to={`${BASE}/${a.folio}`} className="pz-actividades__titulo pz-enlace-fila">{a.nombre}</Link>
                                                <p className="pz-actividades__detalle">{s!.inicio ? `${s!.inicio.slice(0, 5)} h, ` : ''}{a.espacio || 'Sin espacio'}</p>
                                                <p className="pz-actividades__detalle">{a.cupo ? `${a.inscritos} de ${a.cupo} lugares` : `${a.inscritos} inscritos`}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : <p className="pz-acciones__nota">No hay sesiones publicadas próximas.</p>}
                        <Link to="/admin/actividades/calendario" className="pz-enlace">Ver el calendario</Link>
                    </TarjetaPz>
                    <Plegable titulo="Cómo se publica una actividad">
                        <ul>
                            <li>Registras la actividad como borrador; puedes editarla cuantas veces quieras.</li>
                            <li>La envías a revisión y alguien con permiso la autoriza o la devuelve con motivo.</li>
                            <li>Ya autorizada, se publica en la agenda; se comprueba que el espacio siga libre.</li>
                            <li>Si cambia algo, reprograma o cancela la sesión desde su ficha.</li>
                        </ul>
                    </Plegable>
                </aside>
            </div>
        </div>
    );
}

// ---------- Formulario (nueva actividad o borrador) ----------
const ETIQUETAS: Record<string, string> = { nombre: 'Nombre', tipo: 'Tipo de actividad', descripcion: 'Descripción pública', fecha: 'Fecha', inicio: 'Hora de inicio', fin: 'Hora de fin', cupo: 'Cupo máximo', publico: 'Público', responsable: 'Área o responsable público', materiales: 'Materiales o requisitos' };

const TIPOS_SUGERIDOS = ['Taller', 'Club', 'Charla', 'Visita', 'Evento', 'Presentación'];
// Lo que hace falta para enviar a revisión (el borrador solo pide el nombre)
const REQUISITOS: { campo: keyof DatosActividadReal; texto: string }[] = [
    { campo: 'nombre', texto: 'Nombre' }, { campo: 'descripcion', texto: 'Descripción pública' }, { campo: 'fecha', texto: 'Fecha' },
    { campo: 'inicio', texto: 'Hora de inicio' }, { campo: 'fin', texto: 'Hora de fin' }, { campo: 'espacio', texto: 'Espacio' },
    { campo: 'cupo', texto: 'Cupo' }, { campo: 'responsable', texto: 'Responsable público' },
];

function Formulario({ actividad }: { actividad?: ActividadGestion }) {
    const navigate = useNavigate();
    const inicial = actividad ? Object.fromEntries(Object.keys(vacia).map(k => [k, actividad[k as keyof DatosActividadReal]])) as unknown as DatosActividadReal : vacia;
    const [datos, setDatos] = useState<DatosActividadReal>(inicial);
    const [espacios, setEspacios] = useState<{ nombre: string; capacidad: number }[]>();
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState<'' | 'borrador' | 'en-revision'>('');
    const bloqueo = useRef(false);
    useEffect(() => {
        let activo = true;
        consultarEspaciosAgenda().then(datos => { if (activo) setEspacios(datos); }).catch(error => { if (activo) setError(mensajeError(error)); });
        return () => { activo = false; };
    }, []);
    if (actividad && actividad.estado !== 'borrador') return (
        <div className="pz-pagina">
            <EncabezadoPz titulo="Editar borrador" texto={actividad.nombre} />
            <TarjetaPz icono="alerta" id="actividad-no-editable" titulo="Solo se edita un borrador" texto="Esta actividad ya avanzó en su publicación.">
                <VacioPz icono="calendario" titulo="Ya no es un borrador" texto="Para cambiar fecha u horario, reprograma o cancela la sesión desde la actividad."
                    accion={<Link className="pz-boton pz-boton--chico" to={`${BASE}/${actividad.folio}`}>Abrir la actividad</Link>} />
            </TarjetaPz>
        </div>
    );
    const cambiar = (campo: keyof DatosActividadReal, valor: string | boolean) => setDatos(d => ({ ...d, [campo]: valor }));
    const faltan = REQUISITOS.filter(r => !String(datos[r.campo] ?? '').trim());
    const cambios = JSON.stringify(datos) !== JSON.stringify(inicial);
    const espacio = espacios?.find(e => e.nombre === datos.espacio);
    const excede = !!espacio && !!datos.cupo && Number(datos.cupo) > espacio.capacidad;
    const horario = !!datos.inicio && !!datos.fin && datos.fin <= datos.inicio;
    async function guardar(estado: 'borrador' | 'en-revision') {
        if (bloqueo.current) return;
        setError('');
        if (!datos.nombre.trim()) return setError('Escribe el nombre de la actividad.');
        if (estado === 'en-revision' && faltan.length) return setError(`Para enviarla a revisión falta: ${faltan.map(f => f.texto.toLowerCase()).join(', ')}.`);
        if (horario) return setError('La hora de fin debe ser posterior al inicio.');
        if (excede) return setError(`El cupo no puede ser mayor que la capacidad del espacio (${espacio!.capacidad} personas).`);
        bloqueo.current = true; setGuardando(estado);
        try { const guardada = await guardarActividad(datos, estado, actividad); navigate(`${BASE}/${guardada.folio}`); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setGuardando(''); }
    }
    const texto = (c: 'nombre' | 'publico' | 'responsable' | 'materiales', extra: { placeholder?: string; max?: number; obligatorio?: boolean } = {}) => (
        <label className="pz-campo pz-campo--lleno" key={c}>
            <span>{ETIQUETAS[c]}{extra.obligatorio && <span className="contenidos-campo__obligatorio"> *</span>}</span>
            <input type="text" maxLength={extra.max ?? 150} placeholder={extra.placeholder} value={datos[c]} onChange={e => cambiar(c, e.target.value)} />
        </label>
    );
    const [dia, mes] = partesFecha(datos.fecha);
    return (
        <div className="pz-pagina">
            <EncabezadoPz titulo={actividad ? 'Editar borrador' : 'Nueva actividad'}
                texto={actividad ? `${actividad.folio}. Mientras sea borrador puedes cambiar todo; al enviarla a revisión ya no.` : 'Regístrala como borrador o envíala de una vez a revisión. Nadie del público la ve hasta que se publica.'} />
            <div className="pz-columnas pz-columnas--libre">
                <fieldset disabled={!!guardando} className="pz-formulario">
                    <TarjetaPz icono="info" id="actividad-publico" titulo="Lo que verá el público" texto="Así aparece en la agenda del portal">
                        {texto('nombre', { placeholder: 'Ej.: Taller de encuadernación japonesa', obligatorio: true })}
                        <div className="pz-campo pz-campo--lleno">
                            <span>{ETIQUETAS.tipo}</span>
                            <div className="pz-pastillas" role="group" aria-label="Tipos frecuentes">
                                {TIPOS_SUGERIDOS.map(t => (
                                    <button key={t} type="button" className={`pz-pastilla${datos.tipo === t ? ' pz-pastilla--elegida' : ''}`} aria-pressed={datos.tipo === t} onClick={() => cambiar('tipo', t)}>{t}</button>
                                ))}
                                <input type="text" aria-label="Otro tipo" placeholder="Otro tipo" maxLength={80} className="pz-pastillas__otro"
                                    value={TIPOS_SUGERIDOS.includes(datos.tipo) ? '' : datos.tipo} onChange={e => cambiar('tipo', e.target.value)} />
                            </div>
                        </div>
                        <label className="pz-campo pz-campo--lleno">
                            <span>{ETIQUETAS.descripcion}</span>
                            <textarea rows={5} maxLength={1000} placeholder="Qué se hará, para quién es y qué se llevan las personas." value={datos.descripcion} onChange={e => cambiar('descripcion', e.target.value)} />
                            <small className="pz-campo__ayuda">{datos.descripcion.length} de 1000 caracteres</small>
                        </label>
                        <div className="pz-campos-fila">
                            {texto('publico', { placeholder: 'Público en general' })}
                            {texto('responsable', { placeholder: 'Ej.: Sala infantil' })}
                        </div>
                        {texto('materiales', { placeholder: 'Ej.: Traer tijeras y pegamento', max: 1000 })}
                    </TarjetaPz>

                    <TarjetaPz icono="calendario" id="actividad-cuando" titulo="Cuándo y dónde" texto="Hora de Tepic">
                        <div className="pz-campos-fila pz-campos-fila--tres">
                            <label className="pz-campo pz-campo--lleno"><span>{ETIQUETAS.fecha}</span><input type="date" value={datos.fecha} onChange={e => cambiar('fecha', e.target.value)} /></label>
                            <label className="pz-campo pz-campo--lleno"><span>{ETIQUETAS.inicio}</span><input type="time" value={datos.inicio} onChange={e => cambiar('inicio', e.target.value)} /></label>
                            <label className={`pz-campo pz-campo--lleno${horario ? ' pz-campo--error' : ''}`}><span>{ETIQUETAS.fin}</span><input type="time" value={datos.fin} aria-invalid={horario} onChange={e => cambiar('fin', e.target.value)} /></label>
                        </div>
                        {horario && <p className="pz-campo__error" role="alert">La hora de fin debe ser posterior al inicio.</p>}
                        <div className="pz-campos-fila">
                            <label className="pz-campo pz-campo--lleno"><span>Espacio</span>
                                <select value={datos.espacio} onChange={e => cambiar('espacio', e.target.value)}>
                                    <option value="">{espacios ? 'Elige un espacio' : 'Cargando espacios…'}</option>
                                    {espacios?.map(e => <option key={e.nombre} value={e.nombre}>{e.nombre} (hasta {e.capacidad} personas)</option>)}
                                </select>
                            </label>
                            <label className={`pz-campo pz-campo--lleno${excede ? ' pz-campo--error' : ''}`}><span>{ETIQUETAS.cupo}</span>
                                <input type="number" min={1} max={espacio?.capacidad} value={datos.cupo} aria-invalid={excede} onChange={e => cambiar('cupo', e.target.value)} />
                                <small className="pz-campo__ayuda">{espacio ? `El espacio admite hasta ${espacio.capacidad} personas` : 'Elige primero el espacio'}</small>
                            </label>
                        </div>
                        {excede && <p className="pz-campo__error" role="alert">El cupo supera la capacidad del espacio.</p>}
                        <label className={`pz-casilla${datos.inscripcion ? ' pz-casilla--elegida' : ''}`}>
                            <input type="checkbox" checked={datos.inscripcion} onChange={e => cambiar('inscripcion', e.target.checked)} />
                            <span><strong>Requiere inscripción</strong><small>{datos.inscripcion ? 'Las personas apartan su lugar desde el portal con su cuenta.' : 'Entrada libre: no se lleva registro de lugares.'}</small></span>
                        </label>
                    </TarjetaPz>
                </fieldset>

                <aside className="pz-lateral" aria-label="Vista previa y guardar">
                    <TarjetaPz icono="portal" id="actividad-previa" titulo="Así se verá en la agenda" texto="Vista previa">
                        <article className="pz-fila pz-fila--previa">
                            {datos.fecha ? <span className="pz-fecha" aria-hidden="true"><strong>{dia}</strong><span>{mes}</span></span>
                                : <span className="pz-fila__icono" aria-hidden="true"><IconoPz nombre="calendario" /></span>}
                            <div className="pz-fila__textos">
                                <h4 className="pz-fila__titulo">{datos.nombre || 'Nombre de la actividad'}</h4>
                                <p className="pz-fila__detalle"><span>{datos.tipo || 'Tipo'}</span><span>{datos.inicio ? `${datos.inicio} a ${datos.fin || '…'} h` : 'Sin horario'}</span></p>
                                <p className="pz-fila__detalle"><span>{datos.espacio || 'Sin espacio'}</span><span>{datos.inscripcion ? (datos.cupo ? `${datos.cupo} lugares` : 'Con inscripción') : 'Entrada libre'}</span></p>
                            </div>
                        </article>
                    </TarjetaPz>
                    <section className={`pz-tarjeta pz-guardar pz-envio${cambios ? ' pz-guardar--cambios' : ''}${faltan.length ? '' : ' pz-envio--listo'}`} aria-labelledby="actividad-guardar">
                        <Cabecera icono={faltan.length ? 'lista' : 'check'} id="actividad-guardar" titulo={faltan.length ? 'Antes de enviarla' : 'Lista para enviar'}
                            texto={cambios ? 'Tienes cambios sin guardar' : actividad ? 'Sin cambios desde que la abriste' : 'Aún no escribes nada'} />
                        <div className="pz-envio__avance">
                            <p><strong>{REQUISITOS.length - faltan.length} de {REQUISITOS.length}</strong> datos listos</p>
                            <span className="pz-envio__barra" aria-hidden="true"><span style={{ width: `${((REQUISITOS.length - faltan.length) / REQUISITOS.length) * 100}%` }} /></span>
                        </div>
                        <ul className="pz-envio__lista" aria-label="Datos para enviar a revisión">
                            {REQUISITOS.map(r => {
                                const listo = !!String(datos[r.campo] ?? '').trim();
                                return (
                                    <li key={r.campo} className={listo ? 'pz-envio__dato--listo' : undefined}>
                                        <span className="pz-envio__marca" aria-hidden="true">{listo && <IconoPz nombre="check" />}</span>
                                        {r.texto}<span className="solo-lectores">{listo ? ', listo' : ', falta'}</span>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="pz-acciones__nota">{faltan.length ? 'Puedes guardarla como borrador solo con el nombre y completar lo demás después.' : 'Al enviarla, quien tenga permiso la autoriza o te la devuelve con motivo.'}</p>
                        {error && <Aviso tono="error" titulo="Revisa los datos" texto={error} />}
                        <div className="pz-acciones">
                            {!actividad && <button type="button" className="pz-boton" disabled={!!guardando || faltan.length > 0} onClick={() => void guardar('en-revision')}>{guardando === 'en-revision' ? 'Enviando…' : 'Guardar y enviar a revisión'}</button>}
                            <button type="button" className={`pz-boton${actividad ? '' : ' pz-boton--contorno'}`} disabled={!!guardando || !datos.nombre.trim()} onClick={() => void guardar('borrador')}>{guardando === 'borrador' ? 'Guardando…' : 'Guardar borrador'}</button>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
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

const PASO_HISTORIAL: Record<string, { icono: NombreIcono; tono: TonoEstado }> = {
    crear: { icono: 'contenido', tono: 'gris' }, enviar: { icono: 'revision', tono: 'dorado' }, aprobar: { icono: 'check', tono: 'verde' },
    rechazar: { icono: 'alerta', tono: 'guinda' }, publicar: { icono: 'portal', tono: 'verde' }, retirar: { icono: 'alerta', tono: 'guinda' },
    archivar: { icono: 'alerta', tono: 'gris' }, cancelar: { icono: 'alerta', tono: 'guinda' }, reprogramar: { icono: 'calendario', tono: 'dorado' },
    reprogramacion: { icono: 'calendario', tono: 'dorado' }, cancelacion: { icono: 'alerta', tono: 'guinda' }, cancelar_sesion: { icono: 'alerta', tono: 'guinda' },
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
    const ocurridas = new Set(['borrador', ...a.historial.map(h => PASO[h.accion]).filter(Boolean), ...(a.publicadaEl ? ['publicada'] : [])]);
    const indiceActual = ETAPAS.findIndex(e => e.id === a.estado);
    const proxima = proximaSesion(a);
    const ocupacion = a.cupo ? Math.min(100, Math.round((a.inscritos / Number(a.cupo)) * 100)) : 0;
    const siguiente = SIGUIENTE[a.estado] ?? { titulo: 'Sin acciones pendientes', texto: 'Esta actividad no requiere nada por ahora.' };
    const historial = [...a.historial].reverse();
    return (
        <div className="pz-pagina">
            <EncabezadoPz titulo={a.nombre} texto={`${a.tipo || 'Actividad'} con folio ${a.folio}. ${siguiente.texto}`}>
                <ChipPz tono={TONO_PZ[a.estado] ?? 'gris'}>{estados[a.estado] ?? a.estado}</ChipPz>
                {a.estado === 'borrador' && <Link className="pz-boton pz-boton--chico" to={`${BASE}/${a.folio}/editar`}>Editar borrador</Link>}
                {a.estado === 'publicada' && <Link className="pz-boton pz-boton--contorno pz-boton--chico" to={`/eventos/${a.folio}`}>Ver en la agenda</Link>}
            </EncabezadoPz>

            <ol className="pz-etapas" aria-label="Etapas de la publicación">
                {ETAPAS.map((e, i) => {
                    const hecha = !cerrada && (i < indiceActual || ocurridas.has(e.id)) && e.id !== a.estado;
                    const actual = e.id === a.estado;
                    return (
                        <li key={e.id} className={`pz-etapas__paso${hecha ? ' pz-etapas__paso--hecho' : ''}${actual ? ' pz-etapas__paso--actual' : ''}`} aria-current={actual ? 'step' : undefined}>
                            <span className="pz-etapas__numero" aria-hidden="true">{hecha ? <IconoPz nombre="check" /> : i + 1}</span>
                            <span className="pz-etapas__texto">{e.texto}</span>
                        </li>
                    );
                })}
                {cerrada && <li className="pz-etapas__paso pz-etapas__paso--cerrado" aria-current="step"><span className="pz-etapas__numero" aria-hidden="true"><IconoPz nombre="alerta" /></span><span className="pz-etapas__texto">{estados[a.estado]}</span></li>}
            </ol>

            <div className="pz-columnas pz-columnas--libre">
                <div className="pz-pila">
                    <TarjetaPz icono="info" id="actividad-acerca" titulo="Acerca de la actividad" texto="Lo que ve el público en la agenda">
                        <Datos>
                            <Dato icono="calendario" etiqueta={proxima?.pasada ? 'Última sesión' : 'Próxima sesión'}>
                                {proxima ? fechaLarga(proxima.fecha) : a.fecha ? fechaLarga(a.fecha) : 'Sin programar'}
                                <small className="pz-dato__nota">{proxima ? `${proxima.inicio} a ${proxima.fin} h` : a.inicio ? `${a.inicio} a ${a.fin} h` : 'Agrega fecha y horario'}</small>
                            </Dato>
                            <Dato icono="espacios" etiqueta="Espacio">
                                {proxima?.espacio || a.espacio || 'Sin espacio'}
                                <small className="pz-dato__nota">{a.sesiones.length ? `${a.sesiones.length} ${a.sesiones.length === 1 ? 'sesión' : 'sesiones'} en total` : 'Aún sin sesiones'}</small>
                            </Dato>
                            <Dato icono="inscripciones" etiqueta="Ocupación">
                                {a.inscripcion ? `${a.inscritos}${a.cupo ? ` de ${a.cupo}` : ''} inscritos` : 'Entrada libre'}
                                {a.inscripcion && a.cupo
                                    ? <span className="pz-ocupacion" aria-hidden="true"><span className={`pz-ocupacion__relleno pz-ocupacion__relleno--${ocupacion >= 100 ? 'guinda' : ocupacion >= 80 ? 'dorado' : 'verde'}`} style={{ width: `${ocupacion}%` }} /></span>
                                    : <small className="pz-dato__nota">{a.inscripcion ? 'Sin cupo definido' : 'No requiere inscripción'}</small>}
                            </Dato>
                            <Dato icono="grupo" etiqueta="Público">{a.publico || 'Por definir'}<small className="pz-dato__nota">Responsable: {a.responsable || 'por definir'}</small></Dato>
                            <Dato ancho icono="contenido" etiqueta="Descripción pública">{a.descripcion || 'Sin descripción. El público solo verá el nombre y la fecha.'}</Dato>
                            <Dato ancho icono="lista" etiqueta="Requisitos o materiales">{a.materiales || 'Sin requisitos adicionales'}</Dato>
                            {a.autorizo && <Dato ancho icono="check" etiqueta="Autorizó">{a.autorizo.quien}, el {new Date(a.autorizo.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</Dato>}
                        </Datos>
                    </TarjetaPz>

                    <TarjetaPz icono="calendario" id="actividad-sesiones" titulo="Sesiones"
                        texto={a.sesiones.length ? 'Desde aquí ves sus inscripciones o la reprogramas' : 'Fecha y horario de la actividad'}>
                        {a.sesiones.length ? (
                            <ul className="pz-filas">
                                {[...a.sesiones].sort((x, y) => `${x.fecha}${x.inicio}`.localeCompare(`${y.fecha}${y.inicio}`)).map(s => {
                                    const [dia, mes] = partesFecha(s.fecha);
                                    const cambiable = a.estado === 'publicada' && s.estado === 'programada' && permiso('registrar_resoluciones_actividades');
                                    return (
                                        <li key={s.id} className={s.estado === 'cancelada' ? 'pz-sesion--cancelada' : undefined}>
                                            <article className="pz-fila">
                                                <span className="pz-fecha" aria-hidden="true"><strong>{dia}</strong><span>{mes}</span></span>
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{fechaLarga(s.fecha)}</h4>
                                                    <p className="pz-fila__detalle"><span>{s.inicio} a {s.fin} h</span><span>{s.espacio || 'Sin espacio'}</span><span>Cupo de {s.cupo}</span></p>
                                                </div>
                                                <ChipPz tono={s.estado === 'programada' ? 'verde' : s.estado === 'cancelada' ? 'guinda' : 'gris'}>{NOMBRE_SESION[s.estado] ?? s.estado}</ChipPz>
                                                {a.inscripcion && s.estado !== 'cancelada'
                                                    ? <Link to={`/admin/actividades/inscripciones/${s.id}`} className="pz-boton pz-boton--contorno pz-boton--chico">Inscripciones</Link>
                                                    : <span aria-hidden="true" />}
                                            </article>
                                            {cambiable && <CambioSesion actividad={a} sesion={s} alGuardar={alCambiarSesion} />}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : <VacioPz icono="calendario" titulo="Sin sesiones" texto={a.fecha ? `${fechaLarga(a.fecha)}, de ${a.inicio} a ${a.fin} h, en ${a.espacio || 'un espacio por definir'}.` : 'Completa la fecha en el borrador.'} />}
                    </TarjetaPz>
                </div>

                <aside className="pz-lateral" aria-label="Qué sigue e historial">
                    <TarjetaPz icono="revision" id="actividad-decision" titulo={siguiente.titulo}
                        texto={ofrecidas.length ? 'Elige qué hacer con esta actividad' : 'Tu cuenta no tiene decisiones en este estado'}>
                        {ofrecidas.length > 0 && <div className="pz-acciones">
                            {ofrecidas.map(op => {
                                const rojo = ['retirar', 'archivar', 'rechazar'].includes(op);
                                return <button key={op} type="button" disabled={guardando} aria-pressed={accion === op}
                                    onClick={() => { setAccion(accion === op ? undefined : op); setError(''); setConfirmacion(false); }}
                                    className={`pz-boton${rojo ? ' pz-boton--guinda pz-boton--contorno' : accion === op || ofrecidas.length === 1 ? '' : ' pz-boton--contorno'}`}>{acciones[op]}</button>;
                            })}
                        </div>}
                        {accion && <fieldset key={accion} disabled={guardando} className="pz-decision">
                            {accion === 'aprobar' && <label className="pz-campo pz-campo--lleno"><span>Referencia de autorización institucional <span className="contenidos-campo__obligatorio">*</span></span>
                                <input type="text" maxLength={200} placeholder="Ej.: Oficio DBP/123/2026" value={referencia} onChange={e => setReferencia(e.target.value)} /></label>}
                            {negativa && <label className="pz-campo pz-campo--lleno"><span>Motivo <span className="contenidos-campo__obligatorio">*</span></span>
                                <textarea rows={3} maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>}
                            {accion === 'enviar' && <p className="pz-acciones__nota">Ya no podrás editarla mientras esté en revisión.</p>}
                            {accion === 'publicar' && <p className="pz-acciones__nota">Autorizó {a.autorizo?.quien ?? 'la coordinación'}. Al publicarla se comprueba que el espacio siga libre.</p>}
                            {accion === 'retirar' && <p className="pz-acciones__nota">Se oculta de la agenda y se cierra el registro. No cancela las sesiones ni avisa a las personas inscritas.</p>}
                            <label className={`pz-casilla${confirmacion ? ' pz-casilla--elegida' : ''}`}>
                                <input type="checkbox" checked={confirmacion} onChange={e => setConfirmacion(e.target.checked)} />
                                <span><strong>Revisé los datos</strong><small>Confirmo esta decisión.</small></span>
                            </label>
                            <button type="button" className={`pz-boton${negativa ? ' pz-boton--guinda' : ''}`} onClick={() => void decidir()}>
                                {guardando ? 'Guardando…' : `Sí, ${acciones[accion].toLowerCase()}`}
                            </button>
                        </fieldset>}
                        {error && <Aviso tono="error" titulo="No se guardó" texto={error}>
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={alRecargar}>Recargar versión actual</button>
                        </Aviso>}
                    </TarjetaPz>

                    <TarjetaPz icono="reloj" id="actividad-historial" titulo="Historial" texto={a.historial.length ? 'Lo más reciente arriba' : 'Sin decisiones registradas'}>
                        {historial.length ? (
                            <ol className="pz-linea" aria-label="Historial de la actividad">
                                {historial.map((h, i) => {
                                    const paso = PASO_HISTORIAL[h.accion] ?? { icono: 'info' as NombreIcono, tono: 'gris' as TonoEstado };
                                    return (
                                        <li key={`${h.accion}:${h.fecha}:${i}`} className={`pz-linea__paso pz-linea__paso--${paso.tono}${i === 0 ? ' pz-linea__paso--actual' : ''}`}>
                                            <span className="pz-linea__icono" aria-hidden="true"><IconoPz nombre={paso.icono} /></span>
                                            <div className="pz-linea__textos">
                                                <p className="pz-linea__titulo">{ACCIONES_HISTORIAL[h.accion] ?? h.accion}</p>
                                                <p className="pz-linea__detalle">{new Date(h.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                {h.referencia && <p className="pz-linea__nota">Referencia: {h.referencia}</p>}
                                                {h.motivo && <p className="pz-linea__nota">{h.motivo}</p>}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        ) : <p className="pz-acciones__nota">Aquí aparecerá cada envío, autorización y publicación.</p>}
                    </TarjetaPz>
                </aside>
            </div>
        </div>
    );
}
