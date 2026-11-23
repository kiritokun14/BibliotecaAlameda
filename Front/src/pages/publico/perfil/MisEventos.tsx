import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { mensajeError } from '../../../servicios/api';
import { estadoInscripcionPropia, listarInscripcionesPropias, type EventoPropio } from '../../../servicios/inscripciones';
import InscripcionSesion from '../eventos/InscripcionSesion';
import '../eventos/Agenda.css';
import '../credencial/CredencialSesion.css';
import { EncabezadoSeccion } from './piezas';
import { sesionSimulada } from './usarSesion';
import { FilaPerfil, ListaPerfil } from './ListaPerfil';
import { coincide, diaMes } from './utilesLista';

// Perfil › Mis eventos (datos reales: GET /mis-inscripciones). Lista con las piezas del panel (ListaPerfil, 22 nov 2026):
// buscador con «Filtros», filas con bloque de fecha; 4 a la vista y las demás con scroll.
const TONO = { pendiente: 'dorado', confirmada: 'verde', rechazada: 'gris', cancelada: 'guinda' } as const;
const NOMBRE = { pendiente: 'Por confirmar', confirmada: 'Confirmada', rechazada: 'Rechazada', cancelada: 'Cancelada' } as const;
const FECHA = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mazatlan', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const fecha = (iso: string) => { const t = FECHA.format(new Date(iso)); return t.charAt(0).toUpperCase() + t.slice(1); };
type Filtro = 'todas' | 'activas' | 'anteriores';
const POR_SERVIDOR = 20; // el servidor entrega 20 por página (pide 21 para saber si hay más)

// Con la sesión de ejemplo (?simular=sesion, solo en desarrollo) se ven inscripciones de ejemplo para revisar el diseño.
const enDias = (dias: number, hora: number) => { const d = new Date(); d.setDate(d.getDate() + dias); d.setHours(hora, 0, 0, 0); return d.toISOString(); };
const eventosEjemplo: EventoPropio[] = [
    { id: 'e1', status: 'confirmada', folio: 'ejemplo-1', titulo: 'Taller de escritura creativa (ejemplo)', inicio: enDias(3, 10), sesionId: 's1', publicada: false },
    { id: 'e2', status: 'pendiente', folio: 'ejemplo-2', titulo: 'Club de lectura mensual (ejemplo)', inicio: enDias(9, 17), sesionId: 's2', publicada: false },
    { id: 'e3', status: 'confirmada', folio: 'ejemplo-3', titulo: 'Visita guiada a la biblioteca (ejemplo)', inicio: enDias(-6, 11), sesionId: 's3', publicada: false },
    { id: 'e4', status: 'cancelada', folio: 'ejemplo-4', titulo: 'Presentación de libro (ejemplo)', inicio: enDias(-14, 18), sesionId: 's4', publicada: false },
];

export default function MisEventos() {
    const [servidor, setServidor] = useState(0);
    const [intento, recargar] = useState(0);
    const [seleccion, setSeleccion] = useState<string>();
    const [filtro, setFiltro] = useState<Filtro>('todas');
    const [texto, setTexto] = useState('');
    const clave = `${servidor}:${intento}`;
    const [resultado, setResultado] = useState<{ clave: string; eventos?: EventoPropio[]; error?: string } | undefined>(sesionSimulada ? { clave: '0:0', eventos: eventosEjemplo } : undefined);
    const actual = resultado?.clave === clave ? resultado : undefined;
    useEffect(() => {
        if (sesionSimulada) return;
        let vigente = true;
        listarInscripcionesPropias(servidor).then(eventos => { if (vigente) setResultado({ clave, eventos }); })
            .catch(e => { if (vigente) setResultado({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [clave, servidor]);
    function irAlServidor(nueva: number) { setSeleccion(undefined); setServidor(nueva); }

    const eventos = actual?.eventos?.slice(0, POR_SERVIDOR) ?? [];
    const hayMas = (actual?.eventos?.length ?? 0) > POR_SERVIDOR;
    const ahora = new Date().toISOString();
    const activa = (e: EventoPropio) => ['pendiente', 'confirmada'].includes(e.status) && e.inicio >= ahora;
    const enFiltro = (e: EventoPropio, f: Filtro) => f === 'todas' || (f === 'activas' ? activa(e) : !activa(e));
    const filtrados = eventos.filter(e => enFiltro(e, filtro) && coincide(texto, e.titulo, fecha(e.inicio), NOMBRE[e.status]));
    const visibles = filtrados;
    const cambiar = <T,>(fijar: (v: T) => void) => (v: T) => { fijar(v); setSeleccion(undefined); };

    return <>
        <EncabezadoSeccion titulo="Mis eventos" texto="Tus inscripciones a talleres, clubes y visitas. El personal confirma cada una según el cupo."
            accion={<Link to="/eventos" className="perfil-boton">Explorar actividades</Link>} />

        <ListaPerfil icono="calendario" conFecha titulo="Tus inscripciones" texto="Gestionar abre tu lugar sin salir de aquí"
            buscar={{ etiqueta: 'Buscar una inscripción', placeholder: 'Nombre de la actividad o fecha', valor: texto, alCambiar: cambiar(setTexto) }}
            filtros={[{
                titulo: 'Cuándo', valor: filtro, alCambiar: cambiar((v: string) => setFiltro(v as Filtro)),
                opciones: ([['todas', 'Todas'], ['activas', 'Próximas'], ['anteriores', 'Anteriores o canceladas']] as const)
                    .map(([valor, t]) => ({ valor, texto: t, cantidad: eventos.filter(e => enFiltro(e, valor)).length })),
            }]}
            activos={filtro === 'todas' ? 0 : 1} alQuitar={() => cambiar(setFiltro)('todas')}
            estado={!actual ? 'cargando' : actual.error ? 'error' : 'listo'} error={actual?.error} alReintentar={() => recargar(i => i + 1)}
            hayElementos={eventos.length > 0} sinResultados={filtrados.length === 0}
            vacio={{
                titulo: servidor === 0 ? 'Aún no tienes inscripciones' : 'No hay inscripciones en esta página',
                texto: 'Cuando te inscribas a un taller, club o visita, aquí verás si el personal ya confirmó tu lugar.',
                accion: <Link to="/eventos" className="pz-boton pz-boton--chico">Explorar actividades</Link>,
            }}
            pie={(servidor > 0 || hayMas) && <>
                <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={servidor === 0} onClick={() => irAlServidor(servidor - 1)}>Inscripciones más recientes</button>
                <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={!hayMas || servidor >= 5000} onClick={() => irAlServidor(servidor + 1)}>Inscripciones más antiguas</button>
            </>}>
            {visibles.map(e => {
                const gestionable = ['pendiente', 'confirmada'].includes(e.status);
                const abierta = seleccion === e.id;
                return <FilaPerfil key={e.id} fecha={diaMes(e.inicio)} tono={TONO[e.status]} titulo={e.titulo}
                    detalle={<span>{fecha(e.inicio)} · hora de Tepic</span>}
                    estado={NOMBRE[e.status] ?? estadoInscripcionPropia[e.status]} apagada={!gestionable}
                    acciones={<>
                        {e.publicada && <Link to={`/eventos/${e.folio}`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver actividad</Link>}
                        {gestionable && <button type="button" className={`pz-boton pz-boton--chico${abierta ? ' pz-boton--contorno' : ''}`} aria-expanded={abierta}
                            onClick={() => setSeleccion(abierta ? undefined : e.id)}>{abierta ? 'Cerrar' : 'Gestionar'}</button>}
                    </>}
                    panel={abierta && <InscripcionSesion key={e.sesionId} sesion={e.sesionId} desdePerfil />} />;
            })}
        </ListaPerfil>
    </>;
}
