import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router';
import PaginaPublica from '../../../components/portal/PaginaPublica';
import { actividadPublicaEnMemoria, consultarActividadPublica, type ActividadPublica } from '../../../servicios/actividades';
import { mensajeError } from '../../../servicios/api';
import { sesionesDeAgenda } from '../../../servicios/agendaPublica';
import { fechaCompleta } from './datosAgenda';
import { useSesion } from '../perfil/usarSesion';
import { EtiquetaPerfil, TarjetaPerfil } from '../perfil/piezas';
import { iconosSeccion } from '../perfil/iconos';
import { Chip } from '../credencial/piezas';
import MapaBiblioteca from '../espacios/MapaBiblioteca';
import { espaciosEvento, plantaDe, zonaPorNombreEspacio } from '../espacios/datos';
import { fotosDe } from '../espacios/fotos';
import { VistaFotos } from '../espacios/piezas';
import InscripcionSesion from './InscripcionSesion';
import { Bloque, EsqueletoArticulo } from '../../../components/portal/Esqueleto';
import '../noticias/Noticias.css';
import '../perfil/Perfil.css';
import '../credencial/CredencialSesion.css';
import './Agenda.css';
import circulo1 from '../../../assets/comun/iconos/encabezado-circulo-1.svg';
import circulo2 from '../../../assets/comun/iconos/encabezado-circulo-2.svg';
import tarjetaLista from '../../../assets/perfil/tarjeta-lista.svg';
import iconoReloj from '../../../assets/contacto/dato-reloj.svg';

// Detalle de una actividad (plantilla C «Página de detalle», como Noticias y Memoria; Aldahir, 20 nov 2026).
// Franja compacta con el tipo y la próxima fecha en pastilla y el nombre → la foto montada sobre la franja, el texto,
// requisitos y responsable, y la tarjeta «Sesiones» (cada sesión con «Mi inscripción» en el lugar: ahí se inscribe la
// persona) | al lado: «Sobre la actividad», «Dónde es» (el mapa con su espacio iluminado y la foto del lugar) y los botones.
// Carga: si la actividad ya llegó con la agenda se pinta al instante y se actualiza al responder el servidor; si no, un
// esqueleto con la forma de toda la página (antes salía primero «Detalle de la actividad» como texto suelto).
export default function Eventos() {
    const { id = '' } = useParams();
    const [intento, recargar] = useState(0);
    const clave = JSON.stringify([id, intento]);
    const [resultado, setResultado] = useState<{ clave: string; actividad?: ActividadPublica; error?: string }>();
    const actual = resultado?.clave === clave ? resultado : undefined;
    const actividad = actual?.actividad ?? actividadPublicaEnMemoria(id);
    useEffect(() => { window.scrollTo(0, 0); }, [id]);
    useEffect(() => {
        let vigente = true;
        consultarActividadPublica(id).then(a => { if (vigente) setResultado({ clave, actividad: a }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [id, clave]);

    if (actividad) return <PaginaPublica><Detalle actividad={actividad} /></PaginaPublica>;
    return (
        <PaginaPublica>
            <article className="detalle-lectura detalle-evento">
                <header className="detalle-noticia__encabezado detalle-noticia__encabezado--compacto" aria-hidden={!actual?.error}>
                    <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
                    <img className="encabezado-publico__circulo detalle-noticia__circulo--2" src={circulo2} alt="" />
                    {actual?.error ? <h1>No pudimos abrir la <span>actividad</span></h1> : <>
                        <Bloque clase="esqueleto__chip esqueleto__bloque--claro" ancho="230px" />
                        <Bloque clase="esqueleto__titulo esqueleto__titulo--grande esqueleto__bloque--claro" ancho="460px" />
                    </>}
                </header>
                <div className="detalle-noticia__cuerpo">
                    {actual?.error ? (
                        <div className="perfil-vacio perfil-vacio--eventos" style={{ '--icono-seccion': `url("${iconosSeccion.eventos}")` } as CSSProperties}>
                            <span className="perfil-vacio__insignia" aria-hidden="true" />
                            <h2>No pudimos cargar la actividad</h2>
                            <p role="alert">{actual.error}</p>
                            <div className="perfil-acciones perfil-acciones--centro">
                                <button type="button" className="perfil-boton" onClick={() => recargar(v => v + 1)}>Reintentar</button>
                                <Link to="/eventos" className="perfil-boton perfil-boton--contorno">Volver a Eventos</Link>
                            </div>
                        </div>
                    ) : (
                        <div className="detalle-noticia__columnas detalle-evento__esqueleto">
                            <div className="detalle-noticia__texto"><EsqueletoArticulo texto="Cargando la actividad…" /></div>
                            <aside className="detalle-noticia__lateral" aria-hidden="true">
                                <div className="detalle-lateral__tarjeta">{['60%', '100%', '100%', '100%'].map((a, i) => <Bloque key={i} clase="esqueleto__linea" ancho={a} />)}</div>
                                <div className="detalle-lateral__tarjeta"><Bloque clase="esqueleto-articulo__imagen" /></div>
                            </aside>
                        </div>
                    )}
                </div>
            </article>
        </PaginaPublica>
    );
}

function Detalle({ actividad: a }: { actividad: ActividadPublica }) {
    const usuario = useSesion();
    const [seleccion, setSeleccion] = useState<string>();
    const sesiones = sesionesDeAgenda(a);
    const primera = sesiones[0];
    const proxima = a.sesiones.find(s => s.estado === 'programada') ?? a.sesiones[0];
    const abiertas = a.sesiones.filter(s => s.estado === 'programada' && s.registroAbierto).length;
    const acceso = a.inscripcion ? (abiertas ? 'Inscripción abierta' : 'Registro cerrado') : 'Entrada libre';

    return (
        <article className="detalle-lectura detalle-evento">
            <header className="detalle-noticia__encabezado detalle-noticia__encabezado--compacto">
                <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
                <img className="encabezado-publico__circulo detalle-noticia__circulo--2" src={circulo2} alt="" />
                <p className="detalle-noticia__meta">
                    <span className="detalle-evento__tipo">{a.tipo || 'Actividad'}</span>
                    {proxima && <span>{fechaCompleta(proxima.fecha)} · {proxima.inicio} a {proxima.fin} h</span>}
                </p>
                <h1>{a.nombre}</h1>
            </header>

            <div className="detalle-noticia__cuerpo">
                <div className="detalle-noticia__columnas">
                    <div className="detalle-noticia__texto">
                        {primera && <div className="detalle-noticia__imagen"><img src={primera.imagen} alt="" /></div>}
                        {a.publico && <p className="detalle-noticia__introduccion">Para {a.publico.charAt(0).toLowerCase() + a.publico.slice(1)}</p>}
                        <p>{a.descripcion || 'La biblioteca todavía no publica la descripción de esta actividad.'}</p>
                        <div className="detalle-evento__bloques">
                            <section>
                                <h2>Materiales y requisitos</h2>
                                <p>{a.materiales || 'Sin requisitos adicionales publicados.'}</p>
                            </section>
                            <section>
                                <h2>Quién la organiza</h2>
                                <p>{a.responsable || 'Consulta con el personal de la biblioteca.'}</p>
                            </section>
                        </div>
                        <Sesiones actividad={a} usuario={usuario} seleccion={seleccion} alElegir={setSeleccion} />
                    </div>

                    <aside className="detalle-noticia__lateral">
                        <section className="detalle-lateral__tarjeta" aria-labelledby="titulo-datos-actividad">
                            <EtiquetaPerfil id="titulo-datos-actividad" icono={iconosSeccion.eventos}>Sobre la actividad</EtiquetaPerfil>
                            <dl className="detalle-lateral__datos">
                                {proxima && <div><dt>{a.sesiones.length > 1 ? 'Próxima sesión' : 'Fecha'}</dt><dd>{fechaCompleta(proxima.fecha)}</dd></div>}
                                {proxima && <div><dt>Horario</dt><dd>{proxima.inicio} a {proxima.fin} h</dd></div>}
                                {proxima && <div><dt>Cupo</dt><dd>{proxima.cupo} personas</dd></div>}
                                <div><dt>Acceso</dt><dd>{acceso}</dd></div>
                            </dl>
                        </section>
                        {proxima && <DondeEs espacio={proxima.espacio} />}
                        <div className="detalle-lateral__botones">
                            <Link to="/eventos/calendario" className="perfil-boton">Ver en el calendario</Link>
                            <Link to="/eventos" className="perfil-boton perfil-boton--contorno">Volver a Eventos</Link>
                        </div>
                    </aside>
                </div>
            </div>
        </article>
    );
}

// «Dónde es»: el mapa de la biblioteca con el espacio de la sesión iluminado en verde con contorno dorado (el resto
// desenfocado) y, si hay, la foto del lugar, que abre la vista previa. Si el espacio no está en el mapa, solo su nombre.
function DondeEs({ espacio }: { espacio: string }) {
    const zona = zonaPorNombreEspacio(espacio);
    const evento = zona ? espaciosEvento[zona.id] : undefined;
    const fotos = evento ? fotosDe(evento.slug) : [];
    const [viendo, setViendo] = useState(false);
    return (
        <section className="detalle-lateral__tarjeta detalle-evento__donde" aria-labelledby="titulo-donde-es">
            <EtiquetaPerfil id="titulo-donde-es" icono={iconosSeccion.espacios}>Dónde es</EtiquetaPerfil>
            {zona && (
                <div className="detalle-evento__mapa">
                    <MapaBiblioteca planta={zona.planta} alCambiarPlanta={() => undefined} elegido={zona.id} alElegir={() => undefined} soloLectura />
                </div>
            )}
            <div className="detalle-evento__lugar">
                {fotos.length > 0 && (
                    <button type="button" className="detalle-evento__foto" onClick={() => setViendo(true)} aria-label={`Ver las fotos de ${zona?.nombre ?? espacio}`}>
                        <img src={fotos[0].mini} alt="" />
                    </button>
                )}
                <p><strong>{zona?.nombre ?? espacio}</strong>{zona ? plantaDe(zona) : 'Te lo confirma el personal'}</p>
            </div>
            {viendo && zona && <VistaFotos titulo={zona.nombre} fotos={fotos} alCerrar={() => setViendo(false)} />}
        </section>
    );
}

// Sesiones: tarjeta del catálogo con su cabecera; dentro, cada sesión en su tarjeta (Aldahir, 20 nov: «mejora la etiqueta
// de sesión»): bloque de fecha con el día de la semana | la fecha con su estado y, debajo, horario, lugar y cupo en tres
// datos con su ícono | el botón. «Mi inscripción» abre la inscripción en el lugar: aquí es donde se inscribe la persona.
function Sesiones({ actividad: a, usuario, seleccion, alElegir }: {
    actividad: ActividadPublica; usuario: string | null | undefined; seleccion?: string; alElegir: (id?: string) => void;
}) {
    const texto = a.inscripcion
        ? (usuario === null ? 'Inicia sesión y elige una sesión para pedir tu lugar; el personal lo confirma según el cupo.' : 'Elige una sesión para pedir tu lugar; el personal lo confirma según el cupo.')
        : 'Entrada libre, sujeta al espacio disponible. Horarios de Tepic, Nayarit.';
    return (
        <div className="detalle-evento__sesiones" id="sesiones">
            <TarjetaPerfil color="verde" icono={tarjetaLista} titulo={a.sesiones.length === 1 ? 'Sesión' : 'Sesiones'} texto={texto}>
                {a.sesiones.length === 0 && <p className="detalle-evento__nota">La biblioteca publicará pronto la fecha y el horario.</p>}
                <ul className="evento-sesiones">
                    {a.sesiones.map(s => {
                        const [dia, mes] = diaYMes(s.fecha);
                        const semana = SEMANA[new Date(`${s.fecha.slice(0, 10)}T12:00:00`).getDay()];
                        const lugar = zonaPorNombreEspacio(s.espacio)?.nombre ?? s.espacio.replace(/\s*\(provisional\)/i, '');
                        const estado = ESTADO_SESION[s.estado] ?? { texto: 'Programada', tono: 'verde' as const };
                        const abierta = seleccion === s.id;
                        const chip = s.estado === 'programada' && a.inscripcion ? (s.registroAbierto ? 'Inscripción abierta' : 'Registro cerrado') : estado.texto;
                        return (
                            <li key={s.id} className={`evento-sesion evento-sesion--${estado.tono}${abierta ? ' evento-sesion--abierta' : ''}`}>
                                <div className="evento-sesion__fila">
                                    <span className="evento-sesion__fecha" aria-hidden="true"><small>{semana}</small><strong>{dia}</strong>{mes}</span>
                                    <div className="evento-sesion__textos">
                                        <div className="evento-sesion__cabeza">
                                            <div className="evento-sesion__titulo">
                                                <strong>{fechaCompleta(s.fecha)}</strong>
                                                <Chip color={estado.tono === 'guinda' ? 'gris' : estado.tono}>{chip}</Chip>
                                            </div>
                                            {a.inscripcion && usuario && s.estado !== 'cancelada' && (
                                                <button type="button" className={`perfil-boton perfil-boton--chico${abierta ? ' perfil-boton--contorno' : ''}`} aria-expanded={abierta}
                                                    onClick={() => alElegir(abierta ? undefined : s.id)}>{abierta ? 'Cerrar' : 'Mi inscripción'}</button>
                                            )}
                                            {a.inscripcion && usuario === null && s.estado === 'programada' && s.registroAbierto &&
                                                <Link className="perfil-boton perfil-boton--chico" to="/iniciar-sesion">Inicia sesión</Link>}
                                        </div>
                                        <dl className="evento-sesion__datos">
                                            <div style={{ '--icono': `url("${iconoReloj}")` } as CSSProperties}><dt>Horario</dt><dd>{s.inicio} a {s.fin} h</dd></div>
                                            <div style={{ '--icono': `url("${iconosSeccion.espacios}")` } as CSSProperties}><dt>Lugar</dt><dd>{lugar}</dd></div>
                                            <div style={{ '--icono': `url("${iconosSeccion.datos}")` } as CSSProperties}><dt>Cupo</dt><dd>{s.cupo} lugares</dd></div>
                                        </dl>
                                    </div>
                                </div>
                                {abierta && usuario && <div className="evento-sesion__panel"><InscripcionSesion key={`${usuario}:${s.id}`} sesion={s.id} /></div>}
                            </li>
                        );
                    })}
                </ul>
            </TarjetaPerfil>
        </div>
    );
}

const ESTADO_SESION: Record<string, { texto: string; tono: 'verde' | 'gris' | 'guinda' | 'dorado' }> = {
    programada: { texto: 'Programada', tono: 'verde' }, en_curso: { texto: 'En curso', tono: 'dorado' },
    finalizada: { texto: 'Finalizada', tono: 'gris' }, cancelada: { texto: 'Cancelada', tono: 'guinda' },
};
const SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function diaYMes(fecha: string): [string, string] {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    return m ? [String(Number(m[3])), MESES[Number(m[2]) - 1]] : ['', ''];
}
