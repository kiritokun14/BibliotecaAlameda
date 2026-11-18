import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import PaginaPublica from '../../../components/portal/PaginaPublica';
import { EncabezadoNoticias } from '../noticias/piezas';
import { consultarActividadPublica, type ActividadPublica } from '../../../servicios/actividades';
import { mensajeError } from '../../../servicios/api';
import { sesionesDeAgenda } from '../../../servicios/agendaPublica';
import { fechaCompleta } from './datosAgenda';
import { useSesion, sesionSimulada } from '../perfil/usarSesion';
import InscripcionSesion from './InscripcionSesion';
import '../noticias/Noticias.css'; // botón «Volver» del encabezado
import './Agenda.css';
import calendario from '../../../assets/eventos/detalle-calendario.svg';
import reloj from '../../../assets/eventos/detalle-reloj.svg';
import pin from '../../../assets/eventos/destacada-pin.svg';
import cupo from '../../../assets/eventos/detalle-cupo.svg';
import circuloGrande from '../../../assets/comun/iconos/circulo-grande.svg';
import circuloChico from '../../../assets/comun/iconos/circulo-chico.svg';

import { EsqueletoArticulo } from "../../../components/portal/Esqueleto";
export default function Eventos() {
    const { id = '' } = useParams();
    const [intento, recargar] = useState(0);
    const clave = JSON.stringify([id, intento]);
    const [resultado, setResultado] = useState<{ clave: string; actividad?: ActividadPublica; error?: string }>();
    const actual = resultado?.clave === clave ? resultado : undefined;
    useEffect(() => {
        let vigente = true;
        consultarActividadPublica(id).then(actividad => { if (vigente) setResultado({ clave, actividad }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [id, clave]);
    return <PaginaPublica>
        <EncabezadoNoticias regreso={{ texto: 'Volver a Eventos y actividades', ruta: '/eventos' }} etiqueta={actual?.actividad?.tipo ?? 'Eventos y actividades'} titulo={actual?.actividad?.nombre ?? 'Detalle de actividad'} texto={actual?.actividad?.publico ?? 'Consulta la información publicada por la biblioteca.'} />
        <div className="agenda-cuerpo">
            {!actual && <EsqueletoArticulo texto="Consultando actividad…" />}
            {actual?.error && <div className="agenda-vacio" role="alert"><h3>No pudimos cargar la actividad</h3><p>{actual.error}</p><button type="button" className="agenda-boton agenda-boton--verde" onClick={() => recargar(v => v + 1)}>Reintentar</button></div>}
            {actual?.actividad && <Detalle actividad={actual.actividad} />}
        </div>
    </PaginaPublica>;
}

function Detalle({ actividad: a }: { actividad: ActividadPublica }) {
    const usuario = useSesion();
    const [seleccion, setSeleccion] = useState<string>();
    const sesiones = sesionesDeAgenda(a);
    const primera = sesiones[0];
    const abiertas = a.sesiones.filter(s => s.estado === 'programada' && s.registroAbierto).length;
    return <>
        <div className="detalle-actividad">
            <div className="detalle-actividad__contenido">
                {primera && <><img className="detalle-actividad__foto" src={primera.imagen} alt="" /><p className="detalle-real__nota-foto">Imagen ilustrativa</p></>}
                <p className="agenda-sobretitulo agenda-sobretitulo--verde">SOBRE LA ACTIVIDAD</p>
                <p className="detalle-actividad__texto detalle-real__descripcion">{a.descripcion || 'La biblioteca todavía no publica la descripción de esta actividad.'}</p>
                <div className="detalle-real__bloques">
                    <section className="detalle-real__bloque">
                        <p className="agenda-sobretitulo agenda-sobretitulo--verde">MATERIALES Y REQUISITOS</p>
                        <p>{a.materiales || 'Sin requisitos adicionales publicados.'}</p>
                    </section>
                    <section className="detalle-real__bloque">
                        <p className="agenda-sobretitulo agenda-sobretitulo--verde">ÁREA O RESPONSABLE</p>
                        <p>{a.responsable || 'Consulta con el personal de la biblioteca.'}</p>
                    </section>
                </div>
            </div>
            <aside className="detalle-actividad__info">
                <img className="detalle-actividad__circulo detalle-actividad__circulo--1" src={circuloGrande} alt="" />
                <img className="detalle-actividad__circulo detalle-actividad__circulo--2" src={circuloChico} alt="" />
                <span className="detalle-actividad__chip">{a.inscripcion ? (abiertas ? 'Inscripción abierta' : 'Registro cerrado') : 'Entrada libre'}</span>
                <dl>{primera && <>
                    <Dato icono={calendario} etiqueta={a.sesiones.length > 1 ? 'PRÓXIMA SESIÓN' : 'FECHA'} valor={fechaCompleta(primera.fecha)} />
                    <Dato icono={reloj} etiqueta="HORARIO" valor={primera.horario} />
                    <Dato icono={pin} etiqueta="LUGAR" valor={primera.lugar} />
                    <Dato icono={cupo} etiqueta="CUPO" valor={`${a.sesiones[0].cupo} personas`} />
                </>}</dl>
                {a.inscripcion && a.sesiones.length > 0 && <a href="#sesiones" className="agenda-boton agenda-boton--dorado agenda-boton--ancho">{usuario ? 'Ver sesiones e inscribirme' : 'Ver sesiones'}</a>}
                <p className="detalle-actividad__nota">{a.inscripcion ? 'Elige una sesión para solicitar tu lugar o consultar tu inscripción. El personal la confirma según el cupo.' : 'Entrada libre, sujeta a la disponibilidad del espacio.'}</p>
            </aside>
        </div>

        <section className="agenda-mas detalle-real__sesiones" id="sesiones" aria-labelledby="sesiones-titulo">
            <h3 id="sesiones-titulo">Sesiones</h3>
            <p>{a.sesiones.length === 1 ? 'Una sesión' : `${a.sesiones.length} sesiones`} · horarios de Tepic, Nayarit.</p>
            {a.sesiones.length === 0 && <div className="agenda-vacio"><h3>Sin sesiones publicadas</h3><p>La biblioteca publicará pronto la fecha y el horario.</p></div>}
            <ul className="detalle-real__lista">
                {a.sesiones.map(s => {
                    const [dia, mes] = diaYMes(s.fecha);
                    const estado = ESTADO_SESION[s.estado] ?? { texto: 'Programada', tono: 'verde' };
                    const abierta = seleccion === s.id;
                    return <li key={s.id} className={`detalle-real__sesion${s.estado === 'cancelada' ? ' detalle-real__sesion--cancelada' : ''}`}>
                        <div className="detalle-real__fila">
                            <span className="detalle-real__fecha" aria-hidden="true"><strong>{dia}</strong><small>{mes}</small></span>
                            <span className="detalle-real__textos">
                                <strong>{fechaCompleta(s.fecha)}</strong>
                                <small>{s.inicio} a {s.fin} · {s.espacio} · cupo {s.cupo}</small>
                            </span>
                            <span className={`detalle-real__chip detalle-real__chip--${estado.tono}`}>{s.estado === 'programada' && a.inscripcion ? (s.registroAbierto ? 'Inscripción abierta' : 'Registro cerrado') : estado.texto}</span>
                            {a.inscripcion && usuario && !sesionSimulada && s.estado !== 'cancelada' && (
                                <button type="button" className={`agenda-boton ${abierta ? 'agenda-boton--contorno-verde' : 'agenda-boton--verde'} detalle-real__boton`} aria-expanded={abierta}
                                    onClick={() => setSeleccion(abierta ? undefined : s.id)}>{abierta ? 'Cerrar' : 'Mi inscripción'}</button>
                            )}
                            {a.inscripcion && usuario === null && s.estado === 'programada' && s.registroAbierto &&
                                <Link className="agenda-boton agenda-boton--verde detalle-real__boton" to="/iniciar-sesion">Inicia sesión para inscribirte</Link>}
                        </div>
                        {abierta && usuario && <InscripcionSesion key={`${usuario}:${s.id}`} sesion={s.id} />}
                    </li>;
                })}
            </ul>
            <div className="detalle-real__pie">
                <Link className="agenda-boton agenda-boton--contorno-verde" to="/eventos/todas">Ver todas las actividades</Link>
            </div>
        </section>
    </>;
}

const ESTADO_SESION: Record<string, { texto: string; tono: 'verde' | 'gris' | 'guinda' | 'dorado' }> = {
    programada: { texto: 'Programada', tono: 'verde' }, en_curso: { texto: 'En curso', tono: 'dorado' },
    finalizada: { texto: 'Finalizada', tono: 'gris' }, cancelada: { texto: 'Cancelada', tono: 'guinda' },
};
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function diaYMes(fecha: string): [string, string] {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    return m ? [String(Number(m[3])), MESES[Number(m[2]) - 1]] : ['', ''];
}
function Dato({ icono, etiqueta, valor }: { icono: string; etiqueta: string; valor: string }) {
    return <div className="detalle-actividad__dato"><span><img src={icono} alt="" /></span><dt>{etiqueta}</dt><dd>{valor}</dd></div>;
}
