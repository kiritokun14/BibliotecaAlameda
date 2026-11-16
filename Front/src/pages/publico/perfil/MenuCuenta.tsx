import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { consultarPerfil, type PerfilPropio } from "../../../servicios/perfil";
import { esMenorDeEdad, nombreCompleto, tipoDeCuenta } from "./datos";
import { sinLeer as contarSinLeer, useNotificaciones } from "../notificaciones/datos";
import PanelNotificaciones from "../notificaciones/PanelNotificaciones";
import "./MenuCuenta.css";
import iconoCampana from "../../../assets/perfil/fila-campana.svg";
import avatarBoton from "../../../assets/perfil/boton-avatar.svg";
import avatarMenu from "../../../assets/perfil/cuenta-avatar.svg";
import iconoUsuario from "../../../assets/perfil/menu-usuario.svg";
import iconoCalendario from "../../../assets/perfil/menu-calendario.svg";
import iconoArchivo from "../../../assets/perfil/menu-archivo.svg";
import iconoPin from "../../../assets/perfil/menu-pin.svg";
import iconoCandado from "../../../assets/perfil/menu-candado.svg";
import iconoSalir from "../../../assets/perfil/menu-salir.svg";

// Acciones de cuenta de la barra con sesión iniciada (Figma 476:20760 y menú 476:22512):
// campana con insignia, botón «Mi perfil · Sesión activa» y menú desplegable.
// La barra (components/portal/Navegacion.tsx) es de T1: este componente está listo para que lo coloque
// en lugar de los botones «Mi perfil» y «Cerrar sesión» cuando hay sesión.
const opciones = [
    { texto: "Ver mi perfil", detalle: "Resumen de mi cuenta", icono: iconoUsuario, ruta: "/mi-perfil" },
    { texto: "Mis eventos", detalle: "Inscripciones y asistencia", icono: iconoCalendario, ruta: "/mi-perfil/eventos" },
    { texto: "Mis propuestas", detalle: "Lo que he propuesto", icono: iconoArchivo, ruta: "/mi-perfil/propuestas" },
    { texto: "Mis espacios", detalle: "Mis solicitudes de espacio", icono: iconoPin, ruta: "/mi-perfil/espacios" },
    { texto: "Seguridad", detalle: "Contraseña y sesión", icono: iconoCandado, ruta: "/mi-perfil/seguridad" },
];

export default function MenuCuenta({ correo, cerrando = false, alCerrarSesion }: {
    correo: string; cerrando?: boolean; alCerrarSesion: () => void;
}) {
    // Solo uno abierto a la vez: el menú de cuenta o el panel de la campana.
    const [abierto, setAbiertoEn] = useState<"cuenta" | "notificaciones" | null>(null);
    const [perfil, setPerfil] = useState<PerfilPropio | null>(null);
    const contenedor = useRef<HTMLDivElement>(null);
    const boton = useRef<HTMLButtonElement>(null);
    const campana = useRef<HTMLButtonElement>(null);
    const idMenu = useId();
    const idPanel = useId();
    const ruta = useLocation().pathname;
    const sinLeer = contarSinLeer(useNotificaciones()); // TODO backend: ver notificaciones/datos.ts

    // Al cambiar de página se cierra el menú.
    const [rutaAnterior, setRutaAnterior] = useState(ruta);
    if (ruta !== rutaAnterior) { setRutaAnterior(ruta); setAbiertoEn(null); }

    // Nombre y tipo de cuenta: se piden la primera vez que se abre el menú.
    useEffect(() => {
        if (abierto !== "cuenta" || perfil) return;
        let vigente = true;
        consultarPerfil().then((p) => { if (vigente) setPerfil(p); }).catch(() => {});
        return () => { vigente = false; };
    }, [abierto, perfil]);

    // Escape o un clic fuera lo cierran.
    useEffect(() => {
        if (!abierto) return;
        const tecla = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            (abierto === "cuenta" ? boton : campana).current?.focus();
            setAbiertoEn(null);
        };
        const clic = (e: MouseEvent) => { if (!contenedor.current?.contains(e.target as Node)) setAbiertoEn(null); };
        document.addEventListener("keydown", tecla);
        document.addEventListener("mousedown", clic);
        return () => { document.removeEventListener("keydown", tecla); document.removeEventListener("mousedown", clic); };
    }, [abierto]);

    return (
        <div className="menu-cuenta" ref={contenedor}>
            <button ref={campana} type="button" className="menu-cuenta__campana" aria-expanded={abierto === "notificaciones"}
                aria-controls={idPanel} aria-label={sinLeer ? `Notificaciones, ${sinLeer} sin leer` : "Notificaciones"}
                onClick={() => setAbiertoEn((x) => (x === "notificaciones" ? null : "notificaciones"))}>
                <img src={iconoCampana} alt="" />
                {sinLeer > 0 && <span className="menu-cuenta__insignia" aria-hidden="true">{sinLeer > 9 ? "9+" : sinLeer}</span>}
            </button>
            {abierto === "notificaciones" && <PanelNotificaciones id={idPanel} alCerrar={() => setAbiertoEn(null)} />}
            <button ref={boton} type="button" className="menu-cuenta__boton" aria-expanded={abierto === "cuenta"} aria-controls={idMenu}
                onClick={() => setAbiertoEn((x) => (x === "cuenta" ? null : "cuenta"))}>
                <img src={avatarBoton} alt="" />
                <span><strong>Mi perfil</strong><small>Sesión activa</small></span>
            </button>
            {abierto === "cuenta" && (
                <div id={idMenu} className="menu-cuenta__panel">
                    <div className="menu-cuenta__persona">
                        <span className="menu-cuenta__avatar"><img src={avatarMenu} alt="" /></span>
                        <span className="menu-cuenta__textos">
                            <strong>{perfil ? nombreCompleto(perfil) : "Mi cuenta"}</strong>
                            <span>{perfil?.correo ?? correo}</span>
                        </span>
                    </div>
                    {perfil && <span className="menu-cuenta__tipo">{tipoDeCuenta(perfil.fechaNacimiento)}</span>}
                    <hr />
                    <ul>
                        {opciones.filter((o) => !(perfil && esMenorDeEdad(perfil.fechaNacimiento) && /propuestas|espacios/.test(o.ruta))).map((o) => (
                            <li key={o.ruta}>
                                <Link to={o.ruta} className="menu-cuenta__opcion">
                                    <img src={o.icono} alt="" />
                                    <span><strong>{o.texto}</strong><small>{o.detalle}</small></span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <hr />
                    <button type="button" className="menu-cuenta__opcion menu-cuenta__salir" onClick={alCerrarSesion} disabled={cerrando}>
                        <img src={iconoSalir} alt="" />
                        <strong>{cerrando ? "Cerrando…" : "Cerrar sesión"}</strong>
                    </button>
                </div>
            )}
        </div>
    );
}
