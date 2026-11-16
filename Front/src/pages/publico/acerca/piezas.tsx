import type { ReactNode } from "react";
import { Link } from "react-router";
import { Bloque } from "../inicio/Bloque";
import circuloGrande from "../../../assets/acerca/circulo-grande.svg";
import circuloChico from "../../../assets/acerca/circulo-chico.svg";
import texturaLibros from "../../../assets/acerca/textura-libros.svg";
import texturaRama from "../../../assets/acerca/textura-rama.svg";
import texturaCredencial from "../../../assets/acerca/textura-credencial.svg";
import iconoLibro from "../../../assets/comun/iconos/lecturas-libro.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";

// Piezas que comparten las pestañas de "Acerca de"

// Foto con marco dorado y pie de foto (como en Inicio)
export function FotoConMarco({
    src,
    pie,
    alto,
    className = "",
}: {
    src: string;
    pie: string;
    alto: number;
    className?: string;
}) {
    return (
        <figure className={`foto-marco ${className}`}>
            <img src={src} alt={pie} style={{ height: alto }} />
            <figcaption>{pie}</figcaption>
        </figure>
    );
}

// Nota gris al pie de cada pestaña
export function NotaAcerca({ children }: { children: ReactNode }) {
    return <p className="nota-acerca">{children}</p>;
}

const texturas = {
    libros: { src: texturaLibros, ancho: 420, alto: 200 },
    rama: { src: texturaRama, ancho: 380, alto: 380 },
    credencial: { src: texturaCredencial, ancho: 380, alto: 260 },
};

// Una sección = fondo de color + bloque verde redondeado (igual que en Inicio)
export function SeccionAcerca({
    fondo = "crema",
    textura,
    className = "",
    children,
}: {
    fondo?: "crema" | "blanca";
    textura: keyof typeof texturas;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={`seccion-inicio seccion-inicio--${fondo} seccion-acerca`}>
            <Bloque tema="verde" className={className} circulos={[circuloGrande, circuloChico]} textura={texturas[textura]}>
                {children}
            </Bloque>
        </section>
    );
}

// Sección de «Acerca de» que todavía no tiene información publicada
export function SinInformacion({ seccion, otra }: { seccion: string; otra: { texto: string; ruta: string } }) {
    return (
        <div className="estado-acerca" role="status">
            <span className="estado-acerca__anillo">
                <span className="estado-acerca__icono">
                    <img src={iconoLibro} alt="" />
                </span>
            </span>
            <p className="estado-acerca__etiqueta">SIN INFORMACIÓN PUBLICADA</p>
            <h2>{seccion} todavía no tiene información</h2>
            <p className="estado-acerca__texto">La biblioteca está preparando este contenido. Mientras tanto, puedes conocer otra sección o escribirnos si tienes dudas.</p>
            <div className="estado-acerca__botones">
                <Link to={otra.ruta} className="boton-acerca boton-acerca--verde">
                    {otra.texto}
                    <img src={flechaBlanca} alt="" />
                </Link>
                <Link to="/contacto" className="boton-acerca boton-acerca--contorno">Ir a Contacto</Link>
            </div>
        </div>
    );
}
