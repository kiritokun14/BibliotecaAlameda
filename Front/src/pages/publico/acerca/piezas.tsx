import type { ReactNode } from "react";
import { Bloque } from "../inicio/Bloque";
import circuloGrande from "../../../assets/acerca/circulo-grande.svg";
import circuloChico from "../../../assets/acerca/circulo-chico.svg";
import texturaLibros from "../../../assets/acerca/textura-libros.svg";
import texturaRama from "../../../assets/acerca/textura-rama.svg";
import texturaCredencial from "../../../assets/acerca/textura-credencial.svg";

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
