import { useEffect, useRef, type ReactNode } from "react";
import { NavLink } from "react-router";
import { seccionesDe, type ClaveSeccion } from "./datos";
import circulo1 from "../../../assets/perfil/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/perfil/encabezado-circulo-2.svg";
import iconoUsuarioGrande from "../../../assets/perfil/encabezado-usuario.svg";
import chipCheck from "../../../assets/perfil/chip-check.svg";
import chipUsuario from "../../../assets/perfil/chip-usuario.svg";
import chipArchivo from "../../../assets/perfil/chip-archivo.svg";
import iconoLista from "../../../assets/perfil/menu-lista.svg";
import iconoUsuario from "../../../assets/perfil/menu-usuario.svg";
import iconoArchivo from "../../../assets/perfil/menu-archivo.svg";
import iconoCalendario from "../../../assets/perfil/menu-calendario.svg";
import iconoPin from "../../../assets/perfil/menu-pin.svg";
import iconoEstrella from "../../../assets/perfil/menu-estrella.svg";
import iconoCampana from "../../../assets/perfil/menu-campana.svg";
import iconoCorreo from "../../../assets/perfil/menu-correo.svg";
import iconoCandado from "../../../assets/perfil/menu-candado.svg";
import iconoSalir from "../../../assets/perfil/menu-salir.svg";
import iconoSalirGrande from "../../../assets/perfil/modal-salir.svg";

// ---------- Encabezado verde con avatar, nombre, correo y etiquetas ----------
export function EncabezadoPerfil({ nombre, correo, tipoCuenta, credencial }: {
    nombre: string; correo: string; tipoCuenta: string; credencial: string | null;
}) {
    return (
        <section className="perfil-encabezado">
            <img className="perfil-encabezado__circulo perfil-encabezado__circulo--1" src={circulo1} alt="" />
            <img className="perfil-encabezado__circulo perfil-encabezado__circulo--2" src={circulo2} alt="" />
            <div className="perfil-encabezado__contenido">
                <span className="perfil-encabezado__avatar"><img src={iconoUsuarioGrande} alt="" /></span>
                <div className="perfil-encabezado__textos">
                    <p className="perfil-sobretitulo perfil-sobretitulo--claro">MI PERFIL</p>
                    <h1>{nombre}</h1>
                    <p className="perfil-encabezado__correo">{correo}</p>
                    <ul className="perfil-encabezado__chips">
                        <li><img src={chipCheck} alt="" />Cuenta activa</li>
                        <li><img src={chipUsuario} alt="" />{tipoCuenta}</li>
                        {credencial && <li className="perfil-encabezado__chip--oscuro"><img src={chipArchivo} alt="" />{credencial}</li>}
                    </ul>
                </div>
            </div>
        </section>
    );
}

// ---------- Menú lateral «Secciones del perfil» ----------
const iconosSeccion: Record<ClaveSeccion, string> = {
    resumen: iconoLista, datos: iconoUsuario, credencial: iconoArchivo, eventos: iconoCalendario,
    propuestas: iconoArchivo, espacios: iconoPin, progreso: iconoEstrella, mensajes: iconoCorreo, avisos: iconoCampana, seguridad: iconoCandado,
};

export function MenuPerfil({ activa, menor, alCerrarSesion }: { activa: ClaveSeccion; menor: boolean; alCerrarSesion: () => void }) {
    return (
        <nav className="perfil-menu" aria-label="Secciones del perfil">
            <p className="perfil-sobretitulo">SECCIONES DEL PERFIL</p>
            <ul>
                {seccionesDe(menor).map((s) => (
                    <li key={s.clave}>
                        <NavLink to={s.ruta} className={`perfil-menu__opcion${s.clave === activa ? " perfil-menu__opcion--activa" : ""}`}
                            aria-current={s.clave === activa ? "page" : undefined}>
                            <img src={iconosSeccion[s.clave]} alt="" />{s.texto}
                        </NavLink>
                    </li>
                ))}
            </ul>
            <hr className="perfil-divisor" />
            <button type="button" className="perfil-menu__opcion perfil-menu__salir" onClick={alCerrarSesion}>
                <img src={iconoSalir} alt="" />Cerrar sesión
            </button>
        </nav>
    );
}

// ---------- Encabezado de cada sección: «MIS DATOS / Mis datos / texto» ----------
export function EncabezadoSeccion({ sobretitulo, titulo, texto }: { sobretitulo: string; titulo: string; texto: string }) {
    return (
        <header className="perfil-seccion__encabezado">
            <p className="perfil-sobretitulo">{sobretitulo}</p>
            <h2>{titulo}</h2>
            <p>{texto}</p>
        </header>
    );
}

// ---------- Tarjeta con ícono redondo y título (Datos personales, Domicilio, Correo…) ----------
export function TarjetaPerfil({ color, icono, titulo, texto, children }: {
    color: "verde" | "dorada" | "blanca" | "rosa"; icono: string; titulo: string; texto?: string; children: ReactNode;
}) {
    return (
        <section className={`perfil-tarjeta perfil-tarjeta--${color}`}>
            <div className="perfil-tarjeta__cabecera">
                <span className="perfil-tarjeta__icono"><img src={icono} alt="" /></span>
                <div>
                    <h3>{titulo}</h3>
                    {texto && <p>{texto}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

// Dato de solo lectura: «NOMBRE(S) / Ana / nota»
export function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
    return (
        <div className="perfil-dato">
            <dt>{etiqueta}</dt>
            <dd>{valor || "Sin dato"}</dd>
            {nota && <dd className="perfil-dato__nota">{nota}</dd>}
        </div>
    );
}

// ---------- Modal «¿Quieres cerrar tu sesión?» ----------
export function ModalCerrarSesion({ cerrando, error, alConfirmar, alCancelar }: {
    cerrando: boolean; error: string; alConfirmar: () => void; alCancelar: () => void;
}) {
    const primero = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        primero.current?.focus();
        const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !cerrando) alCancelar(); };
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [alCancelar, cerrando]);
    return (
        <div className="perfil-velo" onClick={(e) => { if (e.target === e.currentTarget && !cerrando) alCancelar(); }}>
            <div className="perfil-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-cerrar-sesion" aria-describedby="texto-cerrar-sesion">
                <span className="perfil-modal__anillo"><img src={iconoSalirGrande} alt="" /></span>
                <h2 id="titulo-cerrar-sesion">¿Quieres cerrar tu sesión?</h2>
                <p id="texto-cerrar-sesion">Para volver a entrar necesitarás tu correo y tu contraseña. Cierra tu sesión si usas un equipo compartido.</p>
                {error && <p className="perfil-error" role="alert">{error}</p>}
                <div className="perfil-acciones perfil-acciones--centro">
                    <button ref={primero} type="button" className="perfil-boton" onClick={alConfirmar} disabled={cerrando}>
                        {cerrando ? "Cerrando…" : "Sí, cerrar sesión"}
                    </button>
                    <button type="button" className="perfil-boton perfil-boton--contorno" onClick={alCancelar} disabled={cerrando}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}
