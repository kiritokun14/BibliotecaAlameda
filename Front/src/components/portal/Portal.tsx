import { Link } from "react-router";
import "./Portal.css";
import logoMexico from "../../assets/comun/logos/logo-gobierno-mexico.webp";
import logoNayarit from "../../assets/comun/logos/logo-nayarit-blanco.png";
import facebookGrande from "../../assets/portal/red-facebook-30.svg";
import instagramGrande from "../../assets/portal/red-instagram-30.svg";
import whatsappGrande from "../../assets/portal/red-whatsapp-30.svg";

// Encabezado y pie institucionales del portal público (Inicio, Catálogo, Servicios...).
// Las pantallas de acceso no los usan: llevan sus propios logos sobre la foto (AccesoLayout).

// Facebook es la página oficial (Aldahir, 21 nov 2026). TODO: confirmar Instagram y WhatsApp; mientras tanto no enlazan.
const redes: { nombre: string; iconoGrande: string; enlace?: string }[] = [
    { nombre: "Facebook", iconoGrande: facebookGrande, enlace: "https://www.facebook.com/BibliotecaSolonArguello" },
    { nombre: "Instagram", iconoGrande: instagramGrande },
    { nombre: "WhatsApp", iconoGrande: whatsappGrande },
];

export function EncabezadoPortal() {
    return (
        <header className="encabezado-portal">
            <div className="encabezado-portal__logos">
                <img src={logoMexico} alt="Gobierno de México" className="logo-mexico" />
                <span className="encabezado-portal__separador" aria-hidden="true" />
                <img src={logoNayarit} alt="Gobierno de Nayarit" className="logo-nayarit" />
                <span className="encabezado-portal__separador" aria-hidden="true" />
                <Link to="/" className="encabezado-portal__biblioteca" aria-label="Biblioteca Solón Argüello, ir al inicio">
                    <span className="logo-solon logo-solon--blanco" />
                </Link>
            </div>
        </header>
    );
}

const columnas = [
    {
        titulo: "Servicios de la biblioteca",
        enlaces: [
            { texto: "Actividades y eventos", ruta: "/eventos" },
            { texto: "Credencial de la biblioteca", ruta: "/credencial" },
            { texto: "Agenda de espacios", ruta: "/espacios" },
            { texto: "Proponer un evento", ruta: "/eventos" },
            { texto: "Catálogo de la biblioteca", ruta: "/catalogo" },
        ],
    },
    {
        // TODO: enlazar cuando existan las páginas de accesibilidad, términos y alerta
        titulo: "Información",
        enlaces: [
            { texto: "Declaración de accesibilidad" },
            { texto: "Términos y condiciones" },
            { texto: "Alerta" },
        ],
    },
    {
        titulo: "Biblioteca",
        enlaces: [
            { texto: "Biblioteca Pública Central Estatal" },
            { texto: "Solón Argüello" },
            { texto: "Tepic, Nayarit" },
            { texto: "Contacto y ubicación", ruta: "/contacto" },
        ],
    },
];

// Pie: logos apilados a la izquierda y columnas de enlaces a la derecha
export function PiePortal() {
    return (
        <footer className="pie-portal">
            <div className="pie-portal__contenido">
                <div className="pie-portal__logos">
                    <div>
                        <small>FEDERACIÓN</small>
                        <img src={logoMexico} alt="Gobierno de México" className="pie-portal__logo-mexico" />
                    </div>
                    <div>
                        <small>ESTADO</small>
                        <img src={logoNayarit} alt="Gobierno de Nayarit" className="pie-portal__logo-nayarit" />
                    </div>
                    <div>
                        <small>BIBLIOTECA</small>
                        <span className="logo-solon logo-solon--blanco" role="img" aria-label="Biblioteca Solón Argüello" />
                    </div>
                </div>

                <div className="pie-portal__columnas">
                    {columnas.map((columna) => (
                        <nav key={columna.titulo} aria-label={columna.titulo}>
                            <h2>{columna.titulo}</h2>
                            <ul>
                                {columna.enlaces.map((enlace) => (
                                    <li key={enlace.texto}>
                                        {enlace.ruta ? <Link to={enlace.ruta}>{enlace.texto}</Link> : enlace.texto}
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                    <div>
                        <h2>Síguenos</h2>
                        <ul className="redes redes--grandes">
                            {redes.map((red) => (
                                <li key={red.nombre}>
                                    {red.enlace ? (
                                        <a href={red.enlace} target="_blank" rel="noopener noreferrer" aria-label={`${red.nombre} de la biblioteca (se abre en otra pestaña)`}>
                                            <img src={red.iconoGrande} alt="" />
                                        </a>
                                    ) : <img src={red.iconoGrande} alt={red.nombre} />}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="pie-portal__legal">
                <p>Gobierno de México · Gobierno de Nayarit · Biblioteca Solón Argüello</p>
            </div>
        </footer>
    );
}
