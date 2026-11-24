import type { ReactNode } from "react";
import "./Portal.css"; // .logo-solon
import "./PantallaEstado.css";

// Pantalla completa para los momentos de paso: comprobando la sesión, sesión iniciada, sin permiso…
// Fondo verde con la foto de la biblioteca, anillos dorados animados y una tarjeta al centro.
// Sin la barra del portal: se usa antes de saber a dónde va la persona.

type Tono = "verde" | "guinda" | "dorado";

type PantallaEstadoProps = {
    tono?: Tono;
    icono?: ReactNode; // sin ícono (y con «cargando») se muestra el anillo giratorio
    cargando?: boolean;
    etiqueta: string;
    titulo: string;
    texto?: ReactNode;
    segundos?: number; // barra que se llena mientras se redirige sola
    children?: ReactNode; // botones
};

export default function PantallaEstado({ tono = "verde", icono, cargando, etiqueta, titulo, texto, segundos, children }: PantallaEstadoProps) {
    return (
        <main className={`pantalla-estado pantalla-estado--${tono}`} role={cargando ? "status" : undefined} aria-live="polite">
            <span className="pantalla-estado__circulo pantalla-estado__circulo--uno" aria-hidden="true" />
            <span className="pantalla-estado__circulo pantalla-estado__circulo--dos" aria-hidden="true" />
            <span className="logo-solon logo-solon--blanco pantalla-estado__logo" aria-label="Biblioteca Solón Argüello" role="img" />

            <div className="pantalla-estado__tarjeta">
                <div className={`pantalla-estado__sello${cargando ? " pantalla-estado__sello--cargando" : ""}`} aria-hidden="true">
                    <span className="pantalla-estado__orbita" />
                    <span className="pantalla-estado__icono">{icono ?? <IconoLibro />}</span>
                </div>
                <p className="pantalla-estado__etiqueta"><span />{etiqueta}</p>
                <h1 className="pantalla-estado__titulo">{titulo}</h1>
                {texto && <p className="pantalla-estado__texto">{texto}</p>}
                {segundos !== undefined && (
                    <span className="pantalla-estado__progreso" aria-hidden="true">
                        <span style={{ animationDuration: `${segundos}s` }} />
                    </span>
                )}
                {children && <div className="pantalla-estado__acciones">{children}</div>}
            </div>

            <p className="pantalla-estado__pie">Biblioteca Pública Central Estatal Solón Argüello · Tepic, Nayarit</p>
        </main>
    );
}

// Íconos de trazo (mismo grosor que el resto del portal)
const Trazo = ({ children }: { children: ReactNode }) => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
export const IconoLibro = () => <Trazo><path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6.5A2.5 2.5 0 0 0 4 20.5 2.5 2.5 0 0 0 6.5 23H20" /><path d="M8 7h8M8 11h6" /></Trazo>;
export const IconoPalomita = () => <Trazo><path className="pantalla-estado__trazo" d="M20 6 9 17l-5-5" /></Trazo>;
export const IconoCandado = () => <Trazo><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /><path d="M12 15v2" /></Trazo>;
