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

// Perfil › Mis eventos (datos reales: GET /mis-inscripciones). Mismo diseño de lista que «Mis propuestas».
const COLOR = { pendiente: 'dorado', confirmada: 'verde', rechazada: 'gris', cancelada: 'guinda' } as const;
const NOMBRE = { pendiente: 'Por confirmar', confirmada: 'Confirmada', rechazada: 'Rechazada', cancelada: 'Cancelada' } as const;
const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { timeZone: 'America/Mazatlan', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
type Filtro = 'todas' | 'activas' | 'anteriores';
// Bloque de fecha de cada inscripción («20 / NOV»), como las tarjetas de la agenda
const partes = (iso: string) => {
    const d = new Date(iso);
    const dia = d.toLocaleString('es-MX', { timeZone: 'America/Mazatlan', day: 'numeric' });
    const mes = d.toLocaleString('es-MX', { timeZone: 'America/Mazatlan', month: 'short' }).replace('.', '');
    return { dia, mes };
};

// Con la sesión de ejemplo (?simular=sesion, solo en desarrollo) se ven inscripciones de ejemplo para revisar el diseño.
const enDias = (dias: number, hora: number) => { const d = new Date(); d.setDate(d.getDate() + dias); d.setHours(hora, 0, 0, 0); return d.toISOString(); };
const eventosEjemplo: EventoPropio[] = [
    { id: 'e1', status: 'confirmada', folio: 'ejemplo-1', titulo: 'Taller de escritura creativa (ejemplo)', inicio: enDias(3, 10), sesionId: 's1', publicada: false },
    { id: 'e2', status: 'pendiente', folio: 'ejemplo-2', titulo: 'Club de lectura mensual (ejemplo)', inicio: enDias(9, 17), sesionId: 's2', publicada: false },
    { id: 'e3', status: 'confirmada', folio: 'ejemplo-3', titulo: 'Visita guiada a la biblioteca (ejemplo)', inicio: enDias(-6, 11), sesionId: 's3', publicada: false },
    { id: 'e4', status: 'cancelada', folio: 'ejemplo-4', titulo: 'Presentación de libro (ejemplo)', inicio: enDias(-14, 18), sesionId: 's4', publicada: false },
];

export default function MisEventos() {
    const [pagina, setPagina] = useState(0);
    const [intento, recargar] = useState(0);
    const [seleccion, setSeleccion] = useState<string>();
    const [filtro, setFiltro] = useState<Filtro>('todas');
    const clave = `${pagina}:${intento}`;
    const [resultado, setResultado] = useState<{ clave: string; eventos?: EventoPropio[]; error?: string } | undefined>(sesionSimulada ? { clave: '0:0', eventos: eventosEjemplo } : undefined);
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
        <EncabezadoSeccion titulo="Mis eventos" texto="Tus inscripciones a talleres, clubes y visitas. El personal confirma cada una según el cupo."
            accion={eventos.length > 0 ? <Link to="/eventos" className="perfil-boton">Explorar actividades</Link> : undefined} />

        {!actual ? (
            <EsqueletoLista filas={3} texto="Cargando inscripciones…" />
        ) : actual.error ? (
            <div className="perfil-vacio" role="alert">
                <p><strong>No pudimos cargar tus inscripciones.</strong> {actual.error}</p>
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" onClick={() => recargar(i => i + 1)}>Reintentar</button>
            </div>
        ) : eventos.length === 0 ? (
            <div className="perfil-vacio perfil-vacio--eventos">
                <span className="perfil-vacio__insignia" aria-hidden="true" />
                <p><strong>{pagina === 0 ? 'Aún no tienes inscripciones' : 'No hay inscripciones en esta página'}</strong>
                    Cuando te inscribas a un taller, club o visita, aquí verás si el personal ya confirmó tu lugar.</p>
                <ul className="perfil-vacio__sugerencias" aria-label="Tipos de actividad">
                    {['Talleres', 'Clubes de lectura', 'Visitas guiadas', 'Presentaciones'].map(t => <li key={t}>{t}</li>)}
                </ul>
                <Link to="/eventos" className="perfil-boton">Explorar actividades</Link>
            </div>
        ) : <>
            <section className="perfil-panel" aria-label="Lista de inscripciones">
            <div className="perfil-filtros" role="group" aria-label="Filtrar inscripciones">
                {([['todas', 'Todas'], ['activas', 'Próximas'], ['anteriores', 'Anteriores o canceladas']] as const).map(([v, t]) => (
                    <button key={v} type="button" aria-pressed={filtro === v} className={`perfil-filtro${filtro === v ? ' perfil-filtro--activo' : ''}`} onClick={() => setFiltro(v)}>{t}<span className="perfil-filtro__cuenta">{cuenta(v)}</span></button>
                ))}
            </div>
            {visibles.length === 0
                ? <div className="perfil-vacio perfil-vacio--eventos perfil-vacio--panel"><span className="perfil-vacio__insignia" aria-hidden="true" /><p><strong>No hay inscripciones en este grupo</strong>Prueba con otro filtro.</p></div>
                : <ul className="perfil-solicitudes">{visibles.map(e => {
                    const gestionable = ['pendiente', 'confirmada'].includes(e.status);
                    const abierta = seleccion === e.id;
                    const { dia, mes } = partes(e.inicio);
                    return <li key={e.id} className={`perfil-solicitud perfil-solicitud--con-panel perfil-evento perfil-evento--${e.status}`}>
                        <span className="perfil-evento__fecha" aria-hidden="true"><strong>{dia}</strong>{mes}</span>
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
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={pagina === 0} onClick={() => irA(pagina - 1)}>Anteriores</button>
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={(actual.eventos?.length ?? 0) <= 20 || pagina >= 5000} onClick={() => irA(pagina + 1)}>Siguientes</button>
            </div>}
            </section>
        </>}


    </>;
}
