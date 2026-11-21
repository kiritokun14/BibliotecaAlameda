import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { NavLink } from "react-router";
import { seccionesDe, type ClaveSeccion } from "./datos";
import { iconosSeccion } from "./iconos";
import circulo1 from "../../../assets/perfil/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/perfil/encabezado-circulo-2.svg";
import iconoUsuarioGrande from "../../../assets/perfil/encabezado-usuario.svg";
import chipCheck from "../../../assets/perfil/chip-check.svg";
import chipUsuario from "../../../assets/perfil/chip-usuario.svg";
import chipArchivo from "../../../assets/perfil/chip-archivo.svg";
import iconoSalirGrande from "../../../assets/perfil/modal-salir.svg";
import iconoSalir from "../../../assets/perfil/menu-salir.svg";
import iconoSecciones from "../../../assets/inicio/etiqueta-accesos.svg";

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
                    <EtiquetaPerfil icono={iconosSeccion.datos} claro>Mi perfil</EtiquetaPerfil>
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

export function MenuPerfil({ activa, menor, alCerrarSesion }: { activa: ClaveSeccion; menor: boolean; alCerrarSesion: () => void }) {
    // En teléfono el menú es una fila que se desliza de lado: se centra la sección activa (sin mover la página)
    const lista = useRef<HTMLUListElement>(null);
    useEffect(() => {
        const ul = lista.current;
        const li = ul?.querySelector<HTMLElement>(".perfil-menu__opcion--activa")?.parentElement;
        if (ul && li && ul.scrollWidth > ul.clientWidth) ul.scrollLeft = li.offsetLeft - (ul.clientWidth - li.clientWidth) / 2;
    }, [activa]);
    return (
        <nav className="perfil-menu" aria-label="Secciones del perfil">
            <EtiquetaPerfil icono={iconoSecciones}>Secciones del perfil</EtiquetaPerfil>
            <ul ref={lista}>
                {seccionesDe(menor).map((s) => (
                    <li key={s.clave}>
                        <NavLink to={s.ruta} className={`perfil-menu__opcion${s.clave === activa ? " perfil-menu__opcion--activa" : ""}`}
                            aria-current={s.clave === activa ? "page" : undefined}>
                            <img src={iconosSeccion[s.clave]} alt="" /><span className="perfil-menu__texto">{s.texto}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
            <hr className="perfil-divisor" />
            {/* Excepción pedida por Aldahir (18 nov): «Cerrar sesión» lleva su ícono */}
            <button type="button" className="perfil-menu__opcion perfil-menu__salir" onClick={alCerrarSesion}>
                <img src={iconoSalir} alt="" />Cerrar sesión
            </button>
        </nav>
    );
}

// ---------- Etiqueta del perfil: pastilla dorada con su ícono en un círculo verde ----------
// La misma en todo el perfil y en notificaciones («Secciones del perfil», «Resumen de mi cuenta», «Mi progreso»…).
export function EtiquetaPerfil({ icono, id, claro = false, children }: { icono: string; id?: string; claro?: boolean; children: ReactNode }) {
    return (
        <p id={id} className={`perfil-etiqueta${claro ? " perfil-etiqueta--claro" : ""}`}>
            <span className="perfil-etiqueta__icono" style={{ "--icono": `url("${icono}")` } as CSSProperties} aria-hidden="true" />
            {children}
        </p>
    );
}

// ---------- Encabezado de cada sección: insignia, título, texto y acción opcional a la derecha ----------
// «sobretitulo» se sigue aceptando, pero ya no se muestra: repetía el título y el menú ya marca la sección.
export function EncabezadoSeccion({ titulo, texto, accion }: { sobretitulo?: string; titulo: string; texto: string; accion?: ReactNode }) {
    return (
        <header className={`perfil-seccion__encabezado${accion ? " perfil-seccion__encabezado--con-accion" : ""}`}>
            <h2>{titulo}</h2>
            <p>{texto}</p>
            {accion && <div className="perfil-seccion__accion">{accion}</div>}
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

// Dato de solo lectura: «Nombre(s) / Ana / nota». icono: se ve junto a la etiqueta; ancho: fichas que ocupan 2 o 4 columnas.
export function Dato({ etiqueta, valor, nota, icono, ancho }: { etiqueta: string; valor: string; nota?: string; icono?: string; ancho?: 2 | 4 }) {
    return (
        <div className={`perfil-dato${icono ? " perfil-dato--icono" : ""}${ancho ? ` perfil-dato--ancho-${ancho}` : ""}`}
            style={icono ? { "--icono": `url("${icono}")` } as CSSProperties : undefined}>
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
