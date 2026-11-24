import type { ReactNode } from "react";
import "../../pages/acceso/Acceso.css";
import logoSolon from "../../assets/comun/logos/logo-solon-arguello.png";
import logoMexico from "../../assets/comun/logos/logo-gobierno-mexico.webp";
import logoNayarit from "../../assets/comun/logos/logo-nayarit-blanco.png";

// Estructura común de las pantallas de acceso (iniciar sesión, crear cuenta, recuperar, confirmar correo…):
// la foto de la biblioteca de fondo, los logos institucionales y una sola tarjeta al centro.
type AccesoLayoutProps = {
    // Encabezado de la página para lectores de pantalla; la tarjeta ya lleva su título visible.
    titulo: ReactNode;
    children: ReactNode;
    ancho?: boolean; // tarjeta más ancha, para formularios largos (Crear cuenta)
};

function AccesoLayout({ titulo, children, ancho = false }: AccesoLayoutProps) {
    return (
        <div className="pagina-acceso">
            <main className="acceso">
                <div className={`acceso__columna${ancho ? " acceso__columna--ancha" : ""}`}>
                    <div className="acceso__logos">
                        <img className="acceso__logo acceso__logo--mexico" src={logoMexico} alt="Gobierno de México" />
                        <span className="acceso__separador" aria-hidden="true" />
                        <img className="acceso__logo acceso__logo--nayarit" src={logoNayarit} alt="Gobierno de Nayarit" />
                        <span className="acceso__separador" aria-hidden="true" />
                        <img className="acceso__logo acceso__logo--solon" src={logoSolon} alt="Biblioteca Pública Central Estatal Solón Argüello" />
                    </div>
                    <h1 className="acceso__oculto">{titulo}</h1>
                    {children}
                </div>
            </main>
        </div>
    );
}

export default AccesoLayout;
