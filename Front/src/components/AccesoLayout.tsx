import type { ReactNode } from "react";
import { Link } from "react-router";
import "../pages/Acceso.css";
import circuloGrande from "../assets/login/circulo-grande.svg";
import circuloChico from "../assets/login/circulo-chico.svg";
import iconoFlechaIzq from "../assets/login/icono-flecha-izq.svg";
import punto from "../assets/login/punto.svg";
import iconoCheck from "../assets/login/icono-check.svg";
import { FranjaInstitucional, PieInstitucional } from "./Institucional";

// Estructura común de Iniciar sesión y Crear cuenta:
// franja, foto con bienvenida (izquierda), formulario (derecha) y pie.
type AccesoLayoutProps = {
    etiqueta?: string;
    // La palabra en dorado va dentro de <span>, por ejemplo: <>Inicia <span>sesión</span></>
    titulo: ReactNode;
    texto: string;
    beneficios?: string[];
    children: ReactNode;
};

function AccesoLayout({
    etiqueta = "ACCESO DE USUARIOS",
    titulo,
    texto,
    beneficios = [],
    children,
}: AccesoLayoutProps) {
    return (
        <div className="pagina-acceso">
            <FranjaInstitucional />

            <main className="acceso">
                <section className="presentacion">
                    <img className="presentacion__circulo presentacion__circulo--grande" src={circuloGrande} alt="" />
                    <img className="presentacion__circulo presentacion__circulo--chico" src={circuloChico} alt="" />

                    <Link className="boton-volver" to="/">
                        <img src={iconoFlechaIzq} alt="" />
                        Volver al inicio
                    </Link>

                    <div className="presentacion__contenido">
                        <span className="etiqueta">
                            <img src={punto} alt="" />
                            {etiqueta}
                        </span>
                        <h1 className="presentacion__titulo">{titulo}</h1>
                        <p className="presentacion__texto">{texto}</p>
                        {beneficios.length > 0 && (
                            <ul className="beneficios">
                                {beneficios.map((beneficio) => (
                                    <li key={beneficio}>
                                        <span className="beneficios__icono">
                                            <img src={iconoCheck} alt="" />
                                        </span>
                                        {beneficio}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                <section className="formulario">{children}</section>
            </main>

            <PieInstitucional />
        </div>
    );
}

export default AccesoLayout;
