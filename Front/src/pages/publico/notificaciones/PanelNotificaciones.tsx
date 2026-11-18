import type { CSSProperties } from "react";
import { Link, useNavigate } from "react-router";
import { nombreArea, notificaciones, sinLeer, useNotificaciones, type Area } from "./datos";
import { iconosSeccion } from "../perfil/iconos";
import "./PanelNotificaciones.css";

// Panel que se abre desde la campana (Figma 476:14320): las tres más recientes sin leer y «Ver todas».
// Con el diseño de las tarjetas de lista de Mis eventos: cada aviso es una tarjeta con borde dorado (sin leer)
// y el ícono de su área; si no hay pendientes, «Estás al día» con insignia.
const iconoArea: Record<Area, string> = {
    propuesta: iconosSeccion.propuestas, espacios: iconosSeccion.espacios, credencial: iconosSeccion.credencial,
    actividades: iconosSeccion.eventos, avisos: iconosSeccion.avisos,
};

export default function PanelNotificaciones({ id, alCerrar }: { id: string; alCerrar: () => void }) {
    const navegar = useNavigate();
    const lista = useNotificaciones();
    const pendientes = sinLeer(lista);
    const recientes = lista.filter((n) => !n.leida).slice(0, 3);
    function abrir(idNotificacion: string, ruta?: string) {
        notificaciones.marcarLeida(idNotificacion);
        alCerrar();
        navegar(ruta ?? "/notificaciones");
    }
    return (
        <div id={id} className="panel-notif" role="region" aria-label="Notificaciones"
            style={{ "--icono-seccion": `url("${iconosSeccion.avisos}")` } as CSSProperties}>
            <div className="panel-notif__cabecera">
                <p className="panel-notif__titulo">Notificaciones</p>
                {pendientes > 0 && <span className="panel-notif__cuenta">{pendientes} sin leer</span>}
            </div>
            {recientes.length ? (
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
