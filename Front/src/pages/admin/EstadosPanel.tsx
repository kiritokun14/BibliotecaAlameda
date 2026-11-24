// Estados del sistema dentro del panel (Figma «Estados del sistema», 583:45547).
// Pieza común (EstadoPanel) y los estados que la usan: página no encontrada, error del servidor,
// sesión caducada, sin conexión, portal en mantenimiento y los estados del Resumen.
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useConfiguracion } from "./administracion/datos";
import { Bloque } from "../../components/portal/Esqueleto";
import "./contenidos/Contenidos.css";
import "./EstadosPanel.css";

// ---------- Íconos de trazo ----------
const Trazo = ({ children, tam = 26 }: { children: ReactNode; tam?: number }) => (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONOS = {
    pregunta: <Trazo><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></Trazo>,
    alerta: <Trazo><path d="M12 8v5M12 16.5h.01" /><circle cx="12" cy="12" r="10" /></Trazo>,
    palomita: <Trazo><path d="M20 6 9 17l-5-5" /></Trazo>,
    candado: <Trazo><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Trazo>,
    nube: <Trazo><path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 0 1 0 9Z" /><path d="m3 3 18 18" /></Trazo>,
    herramienta: <Trazo><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z" /></Trazo>,
    reloj: <Trazo><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Trazo>,
};
type IconoEstado = keyof typeof ICONOS;

// ---------- Pieza común: etiqueta, franja guinda, aviso y acciones ----------
type EstadoPanelProps = {
    etiqueta?: string; // «ERROR 404»; sin etiqueta no se muestra
    titulo: string; // va en la franja guinda
    texto: string; // debajo de la franja
    aviso: { tono: "verde" | "guinda" | "dorado"; icono: IconoEstado; titulo: string; texto: ReactNode; chip: string };
    children?: ReactNode; // acciones
};

export function EstadoPanel({ etiqueta, titulo, texto, aviso, children }: EstadoPanelProps) {
    return (
        <div className="estado-panel">
            {etiqueta && <p className="estado-panel__etiqueta"><span />{etiqueta}</p>}
            <h1 className="estado-panel__franja">{titulo}</h1>
            <p className="estado-panel__texto">{texto}</p>
            <section className={`estado-panel__aviso estado-panel__aviso--${aviso.tono}`} role={aviso.tono === "verde" ? "status" : "alert"}>
                <span className="estado-panel__icono">{ICONOS[aviso.icono]}</span>
                <div>
                    <h2>{aviso.titulo}</h2>
                    <p>{aviso.texto}</p>
                </div>
                <span className="estado-panel__chip"><span />{aviso.chip}</span>
            </section>
            {children && <div className="estado-panel__acciones">{children}</div>}
        </div>
    );
}

// ---------- Página no encontrada dentro del panel (583:45979) ----------
export function ContenidoNoEncontrada() {
    return (
        <EstadoPanel etiqueta="Error 404" titulo="Página no encontrada" texto="Ese enlace no existe o fue movido."
            aviso={{ tono: "verde", icono: "pregunta", titulo: "No encontramos lo que buscas", texto: "Revisa el enlace o vuelve al Resumen.", chip: "404" }}>
            <Link to="/admin/resumen" className="contenidos-boton contenidos-boton--oscuro">Volver al Resumen</Link>
        </EstadoPanel>
    );
}

// ---------- Error del servidor (583:46332): si una pantalla falla, el menú sigue disponible ----------
export function ContenidoErrorServidor({ alReintentar }: { alReintentar: () => void }) {
    return (
        <EstadoPanel etiqueta="Error 500" titulo="Algo salió mal" texto="No pudimos completar la acción."
            aviso={{ tono: "guinda", icono: "alerta", titulo: "Error del servidor", texto: "No se perdió nada. Inténtalo de nuevo; si sigue, avisa a Administración.", chip: "Error" }}>
            <button type="button" className="contenidos-boton contenidos-boton--oscuro" onClick={alReintentar}>Reintentar</button>
            <Link to="/admin/resumen" className="contenidos-boton contenidos-boton--contorno">Volver al Resumen</Link>
        </EstadoPanel>
    );
}

type LimiteProps = { children: ReactNode };
type LimiteEstado = { error: boolean };
// Atrapa los errores de la pantalla abierta y muestra el estado 500 en lugar de dejar el panel en blanco
export class LimiteErrorPanel extends Component<LimiteProps, LimiteEstado> {
    state: LimiteEstado = { error: false };
    static getDerivedStateFromError(): LimiteEstado { return { error: true }; }
    componentDidCatch(error: Error, info: ErrorInfo) { console.error("Error en una pantalla del panel:", error, info.componentStack); }
    render() {
        return this.state.error ? <ContenidoErrorServidor alReintentar={() => this.setState({ error: false })} /> : this.props.children;
    }
}

// ---------- Avisos arriba del contenido: sin conexión (583:47210) y portal en mantenimiento (583:47576) ----------
function useEnLinea() {
    const [enLinea, setEnLinea] = useState(() => typeof navigator === "undefined" || navigator.onLine);
    useEffect(() => {
        const cambiar = () => setEnLinea(navigator.onLine);
        window.addEventListener("online", cambiar);
        window.addEventListener("offline", cambiar);
        return () => { window.removeEventListener("online", cambiar); window.removeEventListener("offline", cambiar); };
    }, []);
    return enLinea;
}

export function AvisosSistema() {
    const enLinea = useEnLinea();
    const { mantenimiento } = useConfiguracion();
    const { search } = useLocation();
    // Solo en desarrollo: ?simular=sin-conexion o ?simular=mantenimiento para revisar los avisos
    const simular = import.meta.env.DEV ? new URLSearchParams(search).get("simular") : null;
    return <>
        {(!enLinea || simular === "sin-conexion") && <AvisoSinConexion />}
        {(mantenimiento || simular === "mantenimiento") && <AvisoMantenimiento />}
    </>;
}

export function AvisoSinConexion() {
    return (
        <div className="aviso-sistema aviso-sistema--guinda" role="alert">
            <span className="aviso-sistema__icono" aria-hidden="true">!</span>
            <p>Sin conexión. Los cambios no se guardarán hasta que vuelva la conexión.</p>
            <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
    );
}

export function AvisoMantenimiento() {
    return (
        <div className="aviso-sistema aviso-sistema--dorado" role="status">
            <span className="aviso-sistema__icono" aria-hidden="true">◇</span>
            <p>El portal público está en modo mantenimiento. Solo el personal puede entrar.</p>
            <Link to="/admin/administracion/configuracion" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico">Ir a Configuración</Link>
        </div>
    );
}

// ---------- Sesión caducada (583:46945): ventana sobre el panel ----------
// alContinuar: solo en la vista previa del catálogo, para no salir del panel
export function VentanaSesionCaducada({ alContinuar }: { alContinuar?: () => void }) {
    const navegar = useNavigate();
    return (
        <div className="sesion-caducada" role="dialog" aria-modal="true" aria-labelledby="sesion-caducada-titulo">
            <div className="sesion-caducada__ventana">
                <h2 id="sesion-caducada-titulo">Tu sesión caducó</h2>
                <p>Por seguridad cerramos la sesión tras 30 minutos sin actividad. Tus cambios guardados están a salvo.</p>
                <div className="sesion-caducada__acciones">
                    <button type="button" className="contenidos-boton contenidos-boton--oscuro" autoFocus
                        onClick={() => (alContinuar ? alContinuar() : navegar("/iniciar-sesion?motivo=sesion-caducada", { replace: true }))}>Iniciar sesión de nuevo</button>
                </div>
            </div>
        </div>
    );
}

// ---------- Estados del Resumen ----------
// Cargando (583:47942)
export function ResumenCargando() {
    return (
        <div className="estado-panel" aria-busy="true">
            <h1 className="estado-panel__franja">Resumen del panel</h1>
            <p className="estado-panel__texto" role="status">Cargando…</p>
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="estado-panel__esqueleto">
                    <Bloque clase="esqueleto__titulo" ancho="34%" />
                    <Bloque clase="esqueleto__linea" ancho="9%" />
                    <Bloque clase="esqueleto__linea" ancho="22%" />
                </div>
            ))}
        </div>
    );
}

// Con error (583:48297)
export function ResumenConError({ alReintentar }: { alReintentar: () => void }) {
    return (
        <EstadoPanel titulo="Resumen del panel" texto="No se pudo cargar la información."
            aviso={{ tono: "guinda", icono: "alerta", titulo: "No pudimos cargar el Resumen", texto: "Tus datos están a salvo. Revisa tu conexión e inténtalo de nuevo.", chip: "Sin datos" }}>
            <button type="button" className="contenidos-boton contenidos-boton--oscuro" onClick={alReintentar}>Reintentar</button>
        </EstadoPanel>
    );
}

// Sin pendientes (583:48650)
export function ResumenSinPendientes() {
    return (
        <div className="estado-panel">
            <h1 className="estado-panel__titulo">Resumen del panel</h1>
            <p className="estado-panel__texto">Todo está al día.</p>
            <section className="estado-panel__tarjeta" aria-labelledby="sin-pendientes">
                <h2 id="sin-pendientes" className="estado-panel__barra"><span>{ICONOS.palomita}</span>Pendientes por atender</h2>
                <div className="estado-panel__vacio">
                    <span>{ICONOS.palomita}</span>
                    <strong>No tienes pendientes</strong>
                    <p>Cuando llegue algo que requiera tu atención, aparecerá aquí.</p>
                </div>
            </section>
        </div>
    );
}

// Con atención parcial (595:49373): algunos datos no se actualizaron, lo demás sí
export function AvisoResumenParcial({ alReintentar }: { alReintentar: () => void }) {
    return (
        <div className="aviso-sistema aviso-sistema--dorado aviso-sistema--doble" role="status">
            <span className="aviso-sistema__icono" aria-hidden="true">{ICONOS.reloj}</span>
            <div>
                <strong>Algunos datos no se pudieron actualizar</strong>
                <p>Contactos e inscripciones muestran la última cifra guardada (08:40); los demás pendientes están al día.</p>
            </div>
            <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alReintentar}>Reintentar</button>
        </div>
    );
}
