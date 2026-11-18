import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { mensajeError } from '../../../servicios/api';
import { estadoInscripcionPropia, listarInscripcionesPropias, type EventoPropio } from '../../../servicios/inscripciones';
import InscripcionSesion from '../eventos/InscripcionSesion';
import '../eventos/Agenda.css';
import '../credencial/CredencialSesion.css';
import { Chip } from '../credencial/piezas';
import { EncabezadoSeccion } from './piezas';
import { sesionSimulada } from './usarSesion';
import { EsqueletoLista } from '../../../components/portal/Esqueleto';
import filaCalendario from '../../../assets/perfil/fila-calendario-verde.svg';

// Perfil › Mis eventos (datos reales: GET /mis-inscripciones). Mismo diseño de lista que «Mis propuestas».
const COLOR = { pendiente: 'dorado', confirmada: 'verde', rechazada: 'gris', cancelada: 'guinda' } as const;
const NOMBRE = { pendiente: 'Por confirmar', confirmada: 'Confirmada', rechazada: 'Rechazada', cancelada: 'Cancelada' } as const;
const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { timeZone: 'America/Mazatlan', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
type Filtro = 'todas' | 'activas' | 'anteriores';

export default function MisEventos() {
    const [pagina, setPagina] = useState(0);
    const [intento, recargar] = useState(0);
    const [seleccion, setSeleccion] = useState<string>();
    const [filtro, setFiltro] = useState<Filtro>('todas');
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

    const eventos = actual?.eventos?.slice(0, 20) ?? [];
    const ahora = new Date().toISOString();
    const activa = (e: EventoPropio) => ['pendiente', 'confirmada'].includes(e.status) && e.inicio >= ahora;
    const cuenta = (f: Filtro) => eventos.filter(e => f === 'todas' || (f === 'activas' ? activa(e) : !activa(e))).length;
    const visibles = eventos.filter(e => filtro === 'todas' || (filtro === 'activas' ? activa(e) : !activa(e)));

    return <>
        <EncabezadoSeccion sobretitulo="MIS EVENTOS" titulo="Mis eventos" texto="Tus inscripciones a talleres, clubes y visitas. El personal confirma cada una según el cupo." />

        {sesionSimulada ? (
            <div className="perfil-vacio">
                <p>En la vista de ejemplo no hay inscripciones reales. Entra con tu cuenta para ver las tuyas.</p>
            </div>
        ) : !actual ? (
            <EsqueletoLista filas={3} texto="Cargando inscripciones…" />
        ) : actual.error ? (
            <div className="perfil-vacio" role="alert">
                <p><strong>No pudimos cargar tus inscripciones.</strong> {actual.error}</p>
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" onClick={() => recargar(i => i + 1)}>Reintentar</button>
            </div>
        ) : eventos.length === 0 ? (
            <div className="perfil-vacio">
                <p>{pagina === 0 ? 'Todavía no te inscribes a ninguna actividad. Cuando lo hagas, aquí verás si el personal ya la confirmó.' : 'No hay inscripciones en esta página.'}</p>
            </div>
        ) : <>
            <div className="perfil-filtros" role="group" aria-label="Filtrar inscripciones">
                {([['todas', 'Todas'], ['activas', 'Próximas'], ['anteriores', 'Anteriores o canceladas']] as const).map(([v, t]) => (
                    <button key={v} type="button" aria-pressed={filtro === v} className={`perfil-filtro${filtro === v ? ' perfil-filtro--activo' : ''}`} onClick={() => setFiltro(v)}>{t} ({cuenta(v)})</button>
                ))}
            </div>
            {visibles.length === 0
                ? <p className="perfil-vacio">No hay inscripciones en este grupo.</p>
                : <ul className="perfil-solicitudes">{visibles.map(e => {
                    const gestionable = ['pendiente', 'confirmada'].includes(e.status);
                    const abierta = seleccion === e.id;
                    return <li key={e.id} className="perfil-solicitud perfil-solicitud--con-panel">
                        <span className="perfil-lista__icono"><img src={filaCalendario} alt="" /></span>
                        <div className="perfil-solicitud__textos">
                            <strong>{e.titulo}</strong>
                            <span className="perfil-mayuscula">{fecha(e.inicio)} · hora de Tepic</span>
                        </div>
                        <Chip color={COLOR[e.status]}>{NOMBRE[e.status] ?? estadoInscripcionPropia[e.status]}</Chip>
                        <span className="perfil-solicitud__acciones">
                            {e.publicada && <Link to={`/eventos/${e.folio}`} className="perfil-boton perfil-boton--chico perfil-boton--contorno">Ver actividad</Link>}
                            {gestionable && <button type="button" className={`perfil-boton perfil-boton--chico${abierta ? ' perfil-boton--contorno' : ''}`} aria-expanded={abierta}
                                onClick={() => setSeleccion(abierta ? undefined : e.id)}>{abierta ? 'Cerrar' : 'Gestionar'}</button>}
                        </span>
                        {abierta && <div className="perfil-solicitud__panel"><InscripcionSesion key={e.sesionId} sesion={e.sesionId} desdePerfil /></div>}
                    </li>;
                })}</ul>}
            {(pagina > 0 || (actual.eventos?.length ?? 0) > 20) && <div className="perfil-acciones">
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={pagina === 0} onClick={() => irA(pagina - 1)}>‹ Anteriores</button>
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={(actual.eventos?.length ?? 0) <= 20 || pagina >= 5000} onClick={() => irA(pagina + 1)}>Siguientes ›</button>
            </div>}
        </>}

        <div className="perfil-acciones">
            <Link to="/eventos" className="perfil-boton">Explorar actividades</Link>
        </div>
    </>;
}
