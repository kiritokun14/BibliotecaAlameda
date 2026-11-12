import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import PanelLayout from '../PanelLayout';
import { Pagina } from '../contenidoDemo/piezas';
import '../contenidoDemo/Contenidos.css';
import '../../publico/tramites/Tramites.css';
import { ContextoPanel } from '../../../servicios/accesoPanel';
import { mensajeError } from '../../../servicios/api';
import { listarActividadesInscripciones, listarSolicitudesInscripcion, consultarCuposInscripciones, confirmarSolicitudInscripcion, type ActividadInscripciones, type SolicitudInscripcion, type CuposInscripciones } from '../../../servicios/inscripciones';

const BASE = '/admin/actividades/inscripciones';
const fecha = (valor: string) => new Date(valor).toLocaleString('es-MX');
export default function Inscripciones() {
    const identidad = useContext(ContextoPanel);
    return <PanelLayout titulo="Inscripciones y cupos"><Pagina><h1>Inscripciones y cupos</h1><BandejaActividades key={identidad?.acceso.usuarioId ?? ''} /></Pagina></PanelLayout>;
}
function BandejaActividades() {
    const [pagina, setPagina] = useState(0);
    const [intento, recargar] = useState(0);
    const clave = `${pagina}:${intento}`;
    const [carga, setCarga] = useState<{ clave: string; datos?: ActividadInscripciones[]; error?: string }>({ clave: '' });
    const actual = carga.clave === clave ? carga : undefined;
    useEffect(() => {
        let vigente = true;
        listarActividadesInscripciones(pagina).then(datos => { if (vigente) setCarga({ clave, datos }); })
            .catch(error => { if (vigente) setCarga({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [pagina, clave]);
    return <><p>Consulta las sesiones de las actividades que tienes permiso de gestionar.</p>
        {!actual && <p role="status">Cargando actividades...</p>}
        {actual?.error && <p role="alert">{actual.error} <button onClick={() => recargar(x => x + 1)}>Reintentar</button></p>}
        {actual?.datos && <>{actual.datos.length === 0 && <p>No hay actividades en esta página.</p>}
            {actual.datos.map(a => <section className="cn-tarjeta" key={a.id}><h2>{a.titulo}</h2>
                <p>Requerimientos: {a.requerimientos || 'Sin requerimientos indicados.'}</p>
                {!a.requiereInscripcion ? <p>Esta actividad no requiere inscripción.</p> : <>{!a.sesiones?.length && <p>Sin sesiones programadas.</p>}
                    {a.sesiones?.map(s => <p key={s.id}><Link to={`${BASE}/${s.id}`}>{fecha(s.inicio)} · {s.estado}</Link> · Registro {s.registroAbierto ? 'abierto' : 'cerrado'}</p>)}</>}
            </section>)}
            <button disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button> Página {pagina + 1} <button disabled={actual.datos.length < 20} onClick={() => setPagina(x => x + 1)}>Siguiente</button>
        </>}
    </>;
}
export function InscritosActividad() {
    const { folio, id } = useParams();
    const identidad = useContext(ContextoPanel);
    return <PanelLayout titulo="Inscripciones y cupos"><Pagina><Link to={BASE}>Volver a actividades</Link><h1>Inscripciones de la sesión</h1>
        {folio && <ListaSesion key={`${identidad?.acceso.usuarioId}:${folio}`} sesion={folio} seleccionada={id} />}
    </Pagina></PanelLayout>;
}
function ListaSesion({ sesion, seleccionada }: { sesion: string; seleccionada?: string }) {
    const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0);
    const clave = `${pagina}:${intento}`;
    const [carga, setCarga] = useState<{ clave: string; solicitudes?: SolicitudInscripcion[]; cupos?: CuposInscripciones; error?: string }>({ clave: '' });
    const actual = carga.clave === clave ? carga : undefined;
    useEffect(() => {
        let vigente = true;
        Promise.all([listarSolicitudesInscripcion(sesion, pagina), consultarCuposInscripciones(sesion)]).then(([solicitudes, cupos]) => { if (vigente) setCarga({ clave, solicitudes, cupos }); })
            .catch(error => { if (vigente) setCarga({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [sesion, pagina, clave]);
    return <><p>Sesión: {sesion}</p><button onClick={() => recargar(x => x + 1)}>Actualizar cupos y solicitudes</button>
        {!actual && <p role="status">Cargando inscripciones...</p>}
        {actual?.error && <p role="alert">{actual.error}</p>}
        {actual?.cupos && <p role="status">Cupo: {actual.cupos.capacidad} · Confirmadas: {actual.cupos.confirmados} · Lugares disponibles: {actual.cupos.disponibles}</p>}
        {actual?.solicitudes && <>{actual.solicitudes.length === 0 && <p>No hay inscripciones en esta página.</p>}
            {actual.solicitudes.map(i => <Solicitud key={i.id} solicitud={i} seleccionada={seleccionada === i.id} sinCupo={(actual.cupos?.disponibles ?? 0) <= 0} alActualizar={() => recargar(x => x + 1)} />)}
            <button disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button> Página {pagina + 1} <button disabled={actual.solicitudes.length < 20} onClick={() => setPagina(x => x + 1)}>Siguiente</button>
        </>}
    </>;
}
function Solicitud({ solicitud: i, sinCupo, seleccionada, alActualizar }: { solicitud: SolicitudInscripcion; sinCupo: boolean; seleccionada: boolean; alActualizar: () => void }) {
    const [ocupado, setOcupado] = useState(false); const [error, setError] = useState(''); const [confirmada, setConfirmada] = useState(false); const bloqueo = useRef(false);
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const motivo = String(new FormData(e.currentTarget).get('motivo') ?? '').trim();
        if (!motivo) return setError('Escribe el motivo de la confirmación.');
        bloqueo.current = true; setOcupado(true); setError('');
        try { await confirmarSolicitudInscripcion(i.id, motivo); setConfirmada(true); alActualizar(); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setOcupado(false); }
    }
    return <section className="cn-tarjeta" aria-label={seleccionada ? 'Inscripción seleccionada' : undefined}><h2>{i.nombre || 'Persona inscrita'}</h2><p>Folio: {i.id}</p><p>Solicitud: {fecha(i.creadoA)} · Estado: {confirmada ? 'confirmada' : i.status}</p>
        {i.status === 'pendiente' && !confirmada && <form onSubmit={enviar}><fieldset className="tramites-campos" disabled={ocupado || sinCupo}>
            <label>Motivo de confirmación<textarea name="motivo" maxLength={500} required /></label>
            <label><input type="checkbox" required /> Revisé los requerimientos de la actividad.</label>
            <button className="boton-panel">{ocupado ? 'Confirmando...' : 'Confirmar inscripción'}</button>
        </fieldset>{sinCupo && <p>No hay lugares disponibles para confirmar.</p>}</form>}
        {error && <p role="alert">{error} <button onClick={alActualizar}>Consultar estado actual</button></p>}
    </section>;
}
