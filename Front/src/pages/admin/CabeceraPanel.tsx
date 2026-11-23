import { useContext, useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ContextoPanel, capacidadPanel, nombresRoles, permisoGlobal } from "../../servicios/accesoPanel";
import { cerrarSesion } from "../../servicios/auth";
import { mensajeError } from "../../servicios/api";
import { AREAS_NOTIFICACION, useNotificaciones, type AreaNotificacion, type Notificacion } from "./notificaciones/datos";
import { Icono } from "./resumen/iconos";
import { RESUMEN, SECCIONES_MENU } from "./menu";

// Cabecera del panel (21 nov 2026, a pedido de Aldahir): título de la pantalla y, a la derecha, tres grupos separados:
// «Ver el portal» (misma pestaña; el portal muestra «Volver al panel»), las notificaciones (campana con texto y contador,
// abre un panel con las más recientes) y el menú del perfil (identidad, Mi cuenta, Configuración y Cerrar sesión).
// Solo un menú abierto a la vez; Esc, un clic fuera o cambiar de página lo cierran y el foco vuelve a su botón.

type Abierto = "avisos" | "perfil" | null;
// Ícono y nombre del área de cada notificación (el mismo ícono que su sección)
const ICONO_AREA: Record<AreaNotificacion, Parameters<typeof Icono>[0]["nombre"]> = {
    contenidos: "contenido", actividades: "calendario", atencion: "mensajes", participantes: "inscripciones",
};
const nombreArea = (area: AreaNotificacion) => AREAS_NOTIFICACION.find((a) => a.id === area)?.nombre ?? "Panel";
const MAXIMO_AVISOS = 5;

// «admin@biblioteca.test» → «A»
const inicial = (correo: string) => (correo.trim().charAt(0) || "P").toUpperCase();

export default function CabeceraPanel({ titulo, menuAbierto, alAbrirMenu }: { titulo: string; menuAbierto: boolean; alAbrirMenu: () => void }) {
    const { pathname } = useLocation();
    const [abiertoEn, setAbiertoEn] = useState<{ cual: Abierto; ruta: string }>({ cual: null, ruta: pathname });
    // Al cambiar de página se cierra solo (sin efecto: se compara la ruta en que se abrió)
    const abierto = abiertoEn.ruta === pathname ? abiertoEn.cual : null;
    const abrir = (cual: Abierto) => setAbiertoEn({ cual, ruta: pathname });
    const iconoSeccion = SECCIONES_MENU.find((s) => pathname.startsWith(s.prefijo))?.icono ?? RESUMEN.icono;
    const contenedor = useRef<HTMLDivElement>(null);
    const botonAvisos = useRef<HTMLButtonElement>(null);
    const botonPerfil = useRef<HTMLButtonElement>(null);

    // Esc cierra y regresa el foco a su botón; un clic fuera también cierra
    useEffect(() => {
        if (!abierto) return;
        const tecla = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            (abierto === "avisos" ? botonAvisos : botonPerfil).current?.focus();
            setAbiertoEn((a) => ({ ...a, cual: null }));
        };
        const clic = (e: MouseEvent) => { if (!contenedor.current?.contains(e.target as Node)) setAbiertoEn((a) => ({ ...a, cual: null })); };
        document.addEventListener("keydown", tecla);
        document.addEventListener("mousedown", clic);
        return () => { document.removeEventListener("keydown", tecla); document.removeEventListener("mousedown", clic); };
    }, [abierto]);

    return (
        <header className="panel-cabecera panel-cabecera--nueva">
            {/* Solo en tableta y teléfono: abre el menú lateral */}
            <button type="button" className="panel-cabecera__menu" onClick={alAbrirMenu} aria-expanded={menuAbierto} aria-controls="menu-panel">Menú</button>
            {/* Título con el ícono de su sección en una insignia (círculo claro con aro), como los encabezados del portal */}
            <div className="cab-titulo">
                <span className="cab-titulo__icono" aria-hidden="true" style={{ "--icono-cab": `url("${iconoSeccion}")` } as CSSProperties} />
                <h1 className="panel-cabecera__titulo">{titulo}</h1>
            </div>

            <div className="cab-acciones" ref={contenedor}>
                {/* Mismo sitio, misma pestaña: la sesión sigue activa y el portal ofrece «Volver al panel» */}
                <Link to="/" className="cab-portal">
                    <span className="cab-portal__icono" aria-hidden="true"><Icono nombre="portal" /></span>
                    <span className="cab-portal__texto">Ver el portal</span>
                </Link>
                <Avisos abierto={abierto === "avisos"} boton={botonAvisos}
                    alAlternar={() => abrir(abierto === "avisos" ? null : "avisos")} alCerrar={() => abrir(null)} />
                <Perfil abierto={abierto === "perfil"} boton={botonPerfil}
                    alAlternar={() => abrir(abierto === "perfil" ? null : "perfil")} />
            </div>
        </header>
    );
}

// ---------- Notificaciones ----------
function Avisos({ abierto, boton, alAlternar, alCerrar }: {
    abierto: boolean; boton: RefObject<HTMLButtonElement | null>; alAlternar: () => void; alCerrar: () => void;
}) {
    const identidadAvisos = useContext(ContextoPanel);
    const { lista, pendientes, leer, leerTodas } = useNotificaciones(identidadAvisos?.acceso);
    const navegar = useNavigate();
    const id = useId();
    // Primero las sin leer; después las demás, en el orden en que llegaron
    const recientes = [...lista.filter((n) => !n.leida), ...lista.filter((n) => n.leida)].slice(0, MAXIMO_AVISOS);
    const etiqueta = pendientes > 0 ? `Notificaciones, ${pendientes} sin leer` : "Notificaciones, ninguna sin leer";

    function abrirNotificacion(n: Notificacion) {
        leer(n.id); alCerrar(); navegar(n.ruta);
    }

    return (
        <div className="cab-menu">
            <button ref={boton} type="button" className={`cab-boton cab-avisos${pendientes > 0 ? " cab-avisos--pendientes" : ""}`}
                aria-expanded={abierto} aria-controls={id} aria-haspopup="true" aria-label={etiqueta} onClick={alAlternar}>
                <span className="cab-avisos__icono" aria-hidden="true">
                    <Icono nombre="aviso" />
                    {pendientes > 0 && <span className="cab-avisos__insignia">{pendientes > 9 ? "9+" : pendientes}</span>}
                </span>
                <span className="cab-boton__texto" aria-hidden="true">Notificaciones</span>
                {pendientes > 0 && <span className="cab-avisos__cuenta" aria-hidden="true">{pendientes > 9 ? "9+" : pendientes}</span>}
            </button>
            {abierto && (
                <section id={id} className="cab-desplegable cab-desplegable--avisos" aria-label="Notificaciones recientes">
                    <div className="cab-desplegable__cabecera">
                        <p className="cab-desplegable__titulo">Notificaciones</p>
                        {pendientes > 0 && <span className="cab-cuenta">{pendientes} sin leer</span>}
                    </div>
                    {recientes.length === 0 ? (
                        <div className="cab-vacio" role="status">
                            <span className="cab-insignia" aria-hidden="true"><Icono nombre="aviso" /></span>
                            <p className="cab-vacio__titulo">Estás al día</p>
                            <p>No tienes notificaciones. Cuando llegue algo que atender, aparecerá aquí.</p>
                        </div>
                    ) : (
                        <ul className="cab-lista">
                            {recientes.map((n) => (
                                <li key={n.id}>
                                    <button type="button" className={`cab-aviso${n.leida ? "" : " cab-aviso--nuevo"}`} onClick={() => abrirNotificacion(n)}>
                                        <span className="cab-aviso__icono" aria-hidden="true"><Icono nombre={ICONO_AREA[n.area]} /></span>
                                        <span className="cab-aviso__textos">
                                            <span className="cab-aviso__titulo">{n.titulo}{!n.leida && <span className="solo-lectores"> (sin leer)</span>}</span>
                                            <span className="cab-aviso__cuando">{nombreArea(n.area)} · {n.cuando}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="cab-desplegable__acciones">
                        <Link to="/admin/notificaciones" className="cab-principal" onClick={alCerrar}>Ver todas las notificaciones</Link>
                        {pendientes > 0 && <button type="button" className="cab-enlace" onClick={leerTodas}>Marcar todas como leídas</button>}
                    </div>
                </section>
            )}
        </div>
    );
}

// ---------- Perfil ----------
function Perfil({ abierto, boton, alAlternar }: { abierto: boolean; boton: RefObject<HTMLButtonElement | null>; alAlternar: () => void }) {
    const identidad = useContext(ContextoPanel);
    const navegar = useNavigate();
    const id = useId();
    const [saliendo, setSaliendo] = useState(false);
    const [error, setError] = useState("");
    const correo = identidad?.correo ?? "Personal de la biblioteca";
    const roles = identidad ? nombresRoles(identidad.acceso).split(", ").filter((r) => r && r !== "Usuario / Cliente") : [];
    const rolPrincipal = roles[0] ?? "Personal de la biblioteca";
    const puedeConfigurar = !!identidad && permisoGlobal(identidad.acceso, capacidadPanel("/admin/administracion/configuracion") ?? "");

    async function salir() {
        setSaliendo(true); setError("");
        try { await cerrarSesion(); navegar("/iniciar-sesion", { replace: true }); }
        catch (e) { setError(mensajeError(e)); setSaliendo(false); }
    }

    return (
        <div className="cab-menu">
            <button ref={boton} type="button" className="cab-boton cab-perfil" aria-expanded={abierto} aria-controls={id} aria-haspopup="true" onClick={alAlternar}>
                <span className="cab-perfil__avatar" aria-hidden="true">{inicial(correo)}</span>
                <span className="cab-perfil__textos">
                    <span className="cab-perfil__nombre">{correo}</span>
                    <span className="cab-perfil__rol">{rolPrincipal}</span>
                </span>
                <span className="cab-perfil__flecha" aria-hidden="true" />
                <span className="solo-lectores">Menú de mi cuenta</span>
            </button>
            {abierto && (
                <section id={id} className="cab-desplegable cab-desplegable--perfil" aria-label="Menú de mi cuenta">
                    <div className="cab-identidad">
                        <span className="cab-perfil__avatar cab-perfil__avatar--grande" aria-hidden="true">{inicial(correo)}</span>
                        <span className="cab-identidad__textos">
                            <strong>{rolPrincipal}</strong>
                            <span>{correo}</span>
                        </span>
                    </div>
                    {roles.length > 1 && (
                        <ul className="cab-identidad__roles" aria-label="Otros roles de la cuenta">
                            {roles.slice(1).map((r) => <li key={r}>{r}</li>)}
                        </ul>
                    )}
                    <ul className="cab-opciones">
                        <Opcion ruta="/admin/perfil" icono="usuario" texto="Mi cuenta" detalle="Mis datos y lo que puedo hacer" />
                        <Opcion ruta="/admin/perfil/datos" icono="contenido" texto="Mis datos" detalle="Nombre y teléfono" />
                        <Opcion ruta="/admin/perfil/avisos" icono="aviso" texto="Avisos que recibo" detalle="Cómo y cuándo te avisamos" />
                        {puedeConfigurar && <Opcion ruta="/admin/administracion/configuracion" icono="calendario" texto="Configuración del portal" detalle="Datos, horarios y mantenimiento" />}
                        <Opcion ruta="/admin/perfil/seguridad" icono="cuentas" texto="Seguridad" detalle="Contraseña y sesión" />
                    </ul>
                    <div className="cab-salir">
                        {/* Única opción con ícono dentro del botón (AGENTS §2, como «Cerrar sesión» del perfil del portal) */}
                        <button type="button" className="cab-opcion cab-salir__boton" onClick={() => void salir()} disabled={saliendo}>
                            <span className="cab-opcion__icono" aria-hidden="true"><Icono nombre="salir" /></span>
                            <span className="cab-opcion__texto">{saliendo ? "Cerrando…" : "Cerrar sesión"}</span>
                        </button>
                        {error && <p className="cab-salir__error" role="alert">{error}</p>}
                    </div>
                </section>
            )}
        </div>
    );
}

function Opcion({ ruta, icono, texto, detalle }: { ruta: string; icono: Parameters<typeof Icono>[0]["nombre"]; texto: string; detalle: string }) {
    return (
        <li>
            <Link to={ruta} className="cab-opcion">
                <span className="cab-opcion__icono" aria-hidden="true"><Icono nombre={icono} /></span>
                <span className="cab-opcion__textos"><span className="cab-opcion__texto">{texto}</span><span className="cab-opcion__detalle">{detalle}</span></span>
            </Link>
        </li>
    );
}
