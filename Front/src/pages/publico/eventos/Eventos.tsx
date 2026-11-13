import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import PaginaPublica from '../../../components/portal/PaginaPublica';
import { EncabezadoNoticias } from '../noticias/piezas';
import { consultarActividadPublica, type ActividadPublica } from '../../../servicios/actividades';
import { mensajeError } from '../../../servicios/api';
import { sesionesDeAgenda } from '../../../servicios/agendaPublica';
import { fechaCompleta } from './datosAgenda';
import './Agenda.css';
import calendario from '../../../assets/eventos/detalle-calendario.svg';
import reloj from '../../../assets/eventos/detalle-reloj.svg';
import pin from '../../../assets/eventos/destacada-pin.svg';
import cupo from '../../../assets/eventos/detalle-cupo.svg';
import circuloGrande from '../../../assets/comun/iconos/circulo-grande.svg';
import circuloChico from '../../../assets/comun/iconos/circulo-chico.svg';

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
            {!actual && <p role="status">Consultando actividad…</p>}
            {actual?.error && <p role="alert">{actual.error} <button className="agenda-boton agenda-boton--verde" onClick={() => recargar(v => v + 1)}>Reintentar</button></p>}
            {actual?.actividad && <Detalle actividad={actual.actividad} />}
        </div>
    </PaginaPublica>;
}

function Detalle({ actividad: a }: { actividad: ActividadPublica }) {
    const sesiones = sesionesDeAgenda(a);
    const primera = sesiones[0];
    return <>
        <div className="detalle-actividad">
            <div className="detalle-actividad__contenido">
                {primera && <><img className="detalle-actividad__foto" src={primera.imagen} alt="Imagen ilustrativa de una actividad de lectura" /><p className="detalle-actividad__nota">Imagen ilustrativa</p></>}
                <p className="agenda-sobretitulo agenda-sobretitulo--verde">SOBRE LA ACTIVIDAD</p>
                <p className="detalle-actividad__texto" style={{ whiteSpace: 'pre-wrap' }}>{a.descripcion}</p>
                <h2>Materiales y requisitos</h2><p>{a.materiales || 'Sin requisitos adicionales publicados.'}</p>
                <h2>Área o responsable</h2><p>{a.responsable || 'Consulta con el personal de la biblioteca.'}</p>
            </div>
            <aside className="detalle-actividad__info">
                <img className="detalle-actividad__circulo detalle-actividad__circulo--1" src={circuloGrande} alt="" />
                <img className="detalle-actividad__circulo detalle-actividad__circulo--2" src={circuloChico} alt="" />
                <span className="detalle-actividad__chip">Información publicada</span>
                <dl>{primera && <>
                    <Dato icono={calendario} etiqueta="FECHA" valor={fechaCompleta(primera.fecha)} />
                    <Dato icono={reloj} etiqueta="HORARIO" valor={primera.horario} />
                    <Dato icono={pin} etiqueta="LUGAR" valor={primera.lugar} />
                    <Dato icono={cupo} etiqueta="CAPACIDAD" valor={`${a.sesiones[0].cupo} personas; disponibilidad por confirmar`} />
                </>}</dl>
                <p className="detalle-actividad__nota">{a.inscripcion ? 'Requiere inscripción. El registro en línea de participación todavía no está habilitado; consulta al personal.' : 'Entrada libre, sujeta a la disponibilidad del espacio.'}</p>
            </aside>
        </div>
        <section className="agenda-mas"><h2>Sesiones y avisos</h2><p>Horarios de Tepic, Nayarit.</p>
            {a.sesiones.map(s => <article className="agenda-vacio" key={s.id}>
                <h3>{fechaCompleta(s.fecha)} · {s.inicio} a {s.fin}</h3><p>{s.espacio} · Capacidad: {s.cupo}</p>
                <p>{s.estado === 'cancelada' ? 'Esta sesión está cancelada.' : s.estado === 'finalizada' ? 'Sesión finalizada.' : s.estado === 'en_curso' ? 'Sesión en curso.' : 'Sesión programada.'}</p>
            </article>)}
            <Link className="agenda-boton agenda-boton--verde" to="/eventos/todas">Ver todas las actividades</Link>
        </section>
    </>;
}
function Dato({ icono, etiqueta, valor }: { icono: string; etiqueta: string; valor: string }) {
    return <div><img src={icono} alt="" /><dt>{etiqueta}</dt><dd>{valor}</dd></div>;
}
