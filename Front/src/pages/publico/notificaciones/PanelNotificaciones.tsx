import { Link, useNavigate } from "react-router";
import { nombreArea, notificaciones, useNotificaciones } from "./datos";
import "./PanelNotificaciones.css";
import puntoSinLeer from "../../../assets/notificaciones/panel-punto.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";

// Panel que se abre desde la campana (Figma 476:14320): las tres más recientes sin leer y «Ver todas».
export default function PanelNotificaciones({ id, alCerrar }: { id: string; alCerrar: () => void }) {
    const navegar = useNavigate();
    const lista = useNotificaciones();
    const recientes = lista.filter((n) => !n.leida).slice(0, 3);
    function abrir(idNotificacion: string, ruta?: string) {
        notificaciones.marcarLeida(idNotificacion);
        alCerrar();
        navegar(ruta ?? "/notificaciones");
    }
    return (
        <div id={id} className="panel-notif" role="region" aria-label="Notificaciones">
            <p className="panel-notif__titulo">Notificaciones</p>
            {recientes.length ? (
                <ul className="panel-notif__lista">
                    {recientes.map((n) => (
                        <li key={n.id}>
                            <button type="button" className="panel-notif__item" onClick={() => abrir(n.id, n.accion?.ruta)}>
                                <span className="panel-notif__area">{nombreArea[n.area]}<img src={puntoSinLeer} alt="Sin leer" /></span>
                                <strong>{n.titulo}</strong>
                                <small>{n.cuando}</small>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : <p className="panel-notif__vacio">Estás al día. No tienes notificaciones sin leer.</p>}
            <div className="panel-notif__pie">
                <Link to="/notificaciones" className="panel-notif__boton" onClick={alCerrar}>
                    Ver todas las notificaciones <img src={flechaBlanca} alt="" />
                </Link>
            </div>
        </div>
    );
}
