import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router";
import { nombreArea, notificaciones, sinLeer, useNotificaciones, type Area } from "./datos";
import { iconosSeccion } from "../perfil/iconos";
import { sesionSimulada } from "../perfil/usarSesion";
import { consultarAvisosCambios } from "../../../servicios/cambiosActividad";
import { obtenerSupabase, pedirApi } from "../../../servicios/api";
import "./PanelNotificaciones.css";

// Panel que se abre desde la campana (Figma 476:14320): las tres más recientes sin leer y «Ver todas».
// Con el diseño de las tarjetas de lista de Mis eventos: cada aviso es una tarjeta con borde dorado (sin leer)
// y el ícono de su área; si no hay pendientes, «Estás al día» con insignia.
const iconoArea: Record<Area, string> = {
    propuesta: iconosSeccion.propuestas, espacios: iconosSeccion.espacios, credencial: iconosSeccion.credencial,
    actividades: iconosSeccion.eventos, avisos: iconosSeccion.avisos,
};

export default function PanelNotificaciones({ id, alCerrar, saliendo = false }: { id: string; alCerrar: () => void; saliendo?: boolean }) {
    const navegar = useNavigate();
    const lista = useNotificaciones();
    const pendientes = sinLeer(lista);
    const recientes = lista.filter((n) => !n.leida).slice(0, 3);
    const [avisosReales, setAvisosReales] = useState<{ titulo: string; fecha: string }[]>();
    const [errorReales, setErrorReales] = useState(false);
    useEffect(() => {
        if (sesionSimulada) return;
        let vigente = true;
        async function cargar() {
            const { data, error } = await (await obtenerSupabase()).auth.getSession();
            if (error || !data.session) throw new Error('No hay sesión');
            const [cambios, actividades] = await Promise.all([
                consultarAvisosCambios(),
                pedirApi<{ titulo: string; creadoEn: string }[]>('/notificaciones/actividades?pagina=0', {
                    headers: { Authorization: `Bearer ${data.session.access_token}` },
                }),
            ]);
            return [
                ...cambios.avisos.map(a => ({ titulo: a.titulo, fecha: a.fecha })),
                ...actividades.map(a => ({ titulo: a.titulo, fecha: a.creadoEn })),
            ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3);
        }
        cargar().then(avisos => { if (vigente) setAvisosReales(avisos); })
            .catch(() => { if (vigente) setErrorReales(true); });
        return () => { vigente = false; };
    }, []);
    function abrir(idNotificacion: string, ruta?: string) {
        notificaciones.marcarLeida(idNotificacion);
        alCerrar();
        navegar(ruta ?? "/notificaciones");
    }
    return (
        <div id={id} className={`panel-notif${saliendo ? " menu-desplegable--saliendo" : ""}`} role="region" aria-label="Notificaciones"
            style={{ "--icono-seccion": `url("${iconosSeccion.avisos}")` } as CSSProperties}>
            <button type="button" className="menu-desplegable__cerrar" aria-label="Cerrar las notificaciones" onClick={alCerrar}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>
            <div className="panel-notif__cabecera">
                <p className="panel-notif__titulo">Notificaciones</p>
                {sesionSimulada && pendientes > 0 && <span className="panel-notif__cuenta">{pendientes} sin leer</span>}
            </div>
            {!sesionSimulada ? (
                errorReales ? <p role="alert">No se pudieron cargar los avisos. Abre tus notificaciones para intentarlo de nuevo.</p> :
                !avisosReales ? <p role="status">Cargando avisos…</p> : avisosReales.length ? <ul className="panel-notif__lista">
                    {avisosReales.map((aviso, i) => <li key={`${aviso.fecha}-${i}`}><Link className="panel-notif__item" to="/notificaciones" onClick={alCerrar}>
                        <span className="panel-notif__textos"><strong>{aviso.titulo}</strong><small>{new Date(aviso.fecha).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })}</small></span>
                    </Link></li>)}
                </ul> : <div className="panel-notif__vacio"><strong>No hay avisos de actividades</strong></div>
            ) : recientes.length ? (
                <ul className="panel-notif__lista">
                    {recientes.map((n) => (
                        <li key={n.id}>
                            <button type="button" className="panel-notif__item" onClick={() => abrir(n.id, n.accion?.ruta)}>
                                <span className="panel-notif__icono"><img src={iconoArea[n.area]} alt="" /></span>
                                <span className="panel-notif__textos">
                                    <strong>{n.titulo}</strong>
                                    <small>{nombreArea[n.area]} · {n.cuando}</small>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="panel-notif__vacio">
                    <span className="panel-notif__insignia" aria-hidden="true" />
                    <strong>Estás al día</strong>
                    <span>No tienes notificaciones sin leer.</span>
                </div>
            )}
            <div className="panel-notif__pie">
                <Link to="/notificaciones" className="panel-notif__boton" onClick={alCerrar}>
                    Ver todas las notificaciones
                </Link>
            </div>
        </div>
    );
}
