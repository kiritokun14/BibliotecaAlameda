import type { ReactNode } from "react";
import { Link } from "react-router";

// Las secciones de Inicio son "bloques" redondeados de color (verde, guinda o dorado)
// con dos círculos decorativos y un dibujo de fondo abajo a la derecha.
type BloqueProps = {
    tema: "verde" | "guinda" | "dorado";
    circulos: [string, string];
    textura?: { src: string; ancho: number; alto: number };
    className?: string;
    children: ReactNode;
};

export function Bloque({ tema, circulos, textura, className = "", children }: BloqueProps) {
    return (
        <div className={`bloque bloque--${tema} ${className}`}>
            <img className="bloque__circulo bloque__circulo--grande" src={circulos[0]} alt="" />
            <img className="bloque__circulo bloque__circulo--chico" src={circulos[1]} alt="" />
            {textura && (
                <img
                    className="bloque__textura"
                    src={textura.src}
                    alt=""
                    style={{ width: textura.ancho, height: textura.alto }}
                />
            )}
            {children}
        </div>
    );
}

// Pastilla pequeña con ícono, como "Lecturas" o "Noticias"
export function Etiqueta({ icono, children, className = "" }: { icono?: string; children: ReactNode; className?: string }) {
    return (
        <span className={`etiqueta-inicio ${className}`}>
            {icono && <img src={icono} alt="" />}
            {children}
        </span>
    );
}

// Encabezado centrado: etiqueta, título grande y botón "Ver todas…"
export function EncabezadoSeccion({
    etiqueta,
    iconoEtiqueta,
    titulo,
    boton,
}: {
    etiqueta: string;
    iconoEtiqueta?: string;
    titulo: ReactNode;
    boton?: { texto: string; ruta: string; icono: string };
}) {
    return (
        <div className="encabezado-seccion">
            <div className="encabezado-seccion__titular">
                <Etiqueta icono={iconoEtiqueta}>{etiqueta}</Etiqueta>
                <h2 className="titulo-seccion">{titulo}</h2>
            </div>
            {boton && (
                <Link to={boton.ruta} className="boton-contorno boton-contorno--chico">
                    {boton.texto}
                    <img src={boton.icono} alt="" />
                </Link>
            )}
        </div>
    );
}
