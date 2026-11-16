import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { mensajeError } from '../../../servicios/api';
import { estadoInscripcionPropia, listarInscripcionesPropias, type EventoPropio } from '../../../servicios/inscripciones';
import InscripcionSesion from '../eventos/InscripcionSesion';
import '../eventos/Agenda.css';
import { EncabezadoSeccion } from './piezas';
import { sesionSimulada } from './usarSesion';

export default function MisEventos() {
    const [pagina, setPagina] = useState(0);
    const [intento, recargar] = useState(0);
    const [seleccion, setSeleccion] = useState<string>();
    const clave = `${pagina}:${intento}`;
    const [resultado, setResultado] = useState<{ clave: string; eventos?: EventoPropio[]; error?: string }>();
    const actual = resultado?.clave === clave ? resultado : undefined;
    useEffect(() => {
        if (sesionSimulada) return;
        let vigente = true;
        listarInscripcionesPropias(pagina).then(eventos => { if (vigente) setResultado({ clave, eventos }); })
            .catch(e => { if (vigente) setResultado({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [clave, pagina]);
    function irA(nuevaPagina: number) { setSeleccion(undefined); setPagina(nuevaPagina); }
    return <>
        <EncabezadoSeccion sobretitulo="MIS EVENTOS" titulo="Mis eventos" texto="Consulta el estado de tus inscripciones por sesión." />
        {sesionSimulada ? <p>Inicia sesión con tu cuenta para consultar inscripciones.</p> : <>
            {!actual && <p role="status">Cargando inscripciones…</p>}
            {actual?.error && <p role="alert">{actual.error} <button type="button" onClick={() => recargar(i => i + 1)}>Reintentar</button></p>}
            {actual?.eventos?.length === 0 && <p className="perfil-vacio">{pagina === 0 ? 'Todavía no tienes inscripciones.' : 'No hay inscripciones en esta página.'}</p>}
            <ul className="perfil-eventos">{actual?.eventos?.slice(0, 20).map(evento => <li key={evento.id} className="perfil-evento">
                <div className="perfil-evento__textos">
                    <h3>{evento.titulo}</h3>
                    <p>{new Date(evento.inicio).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })} · Hora de Tepic</p>
                    {seleccion === evento.id ? <InscripcionSesion key={evento.sesionId} sesion={evento.sesionId} desdePerfil />
                        : <><p>{estadoInscripcionPropia[evento.status]}</p>
                            {['pendiente', 'confirmada'].includes(evento.status) && <button type="button" className="perfil-boton perfil-boton--contorno" onClick={() => setSeleccion(evento.id)}>Gestionar inscripción</button>}</>}
                    {evento.publicada && <Link to={`/eventos/${evento.folio}`}>Ver actividad</Link>}
                </div>
            </li>)}</ul>
            {(pagina > 0 || (actual?.eventos?.length ?? 0) > 20) && <div className="perfil-acciones">
                <button type="button" disabled={!actual || pagina === 0} onClick={() => irA(pagina - 1)}>Anterior</button>
                <button type="button" disabled={(actual?.eventos?.length ?? 0) <= 20 || pagina >= 5000} onClick={() => irA(pagina + 1)}>Siguiente</button>
            </div>}
        </>}
        <Link to="/eventos" className="perfil-boton">Explorar actividades</Link>
    </>;
}
