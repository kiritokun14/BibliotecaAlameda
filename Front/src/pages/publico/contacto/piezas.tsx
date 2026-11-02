import { forwardRef, type ChangeEvent } from "react";
import { Link } from "react-router";
import { datosBiblioteca } from "./datos";
import circulo1 from "../../../assets/contacto/tarjeta-circulo-1.svg";
import circulo2 from "../../../assets/contacto/tarjeta-circulo-2.svg";
import iconoPin from "../../../assets/contacto/dato-pin.svg";
import iconoReloj from "../../../assets/contacto/dato-reloj.svg";
import iconoTelefono from "../../../assets/contacto/dato-telefono.svg";
import iconoCorreo from "../../../assets/contacto/dato-correo.svg";
import iconoAlerta from "../../../assets/contacto/campo-alerta.svg";
import iconoCheck from "../../../assets/contacto/enviado-check.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";

// ---------- Tarjeta verde "Cómo encontrarnos" ----------

const datos = [
    { id: "direccion", titulo: "DIRECCIÓN", valor: datosBiblioteca.direccion, icono: iconoPin },
    { id: "horario", titulo: "HORARIO", valor: datosBiblioteca.horario, icono: iconoReloj },
    { id: "telefono", titulo: "TELÉFONO", valor: datosBiblioteca.telefono, icono: iconoTelefono },
    { id: "correo", titulo: "CORREO", valor: datosBiblioteca.correo, icono: iconoCorreo },
];

export function TarjetaDatos() {
    const hayPendientes = datos.some((dato) => !dato.valor);
    return (
        <aside className="tarjeta-datos" aria-labelledby="titulo-datos">
            <img className="tarjeta-datos__circulo tarjeta-datos__circulo--1" src={circulo1} alt="" />
            <img className="tarjeta-datos__circulo tarjeta-datos__circulo--2" src={circulo2} alt="" />
            <p className="tarjeta-datos__etiqueta">CONTACTO</p>
            <h2 id="titulo-datos">Cómo encontrarnos</h2>
            <ul className="tarjeta-datos__lista">
                {datos.map((dato) => (
                    <li key={dato.id}>
                        <span className="tarjeta-datos__icono">
                            <img src={dato.icono} alt="" />
                        </span>
                        <div>
                            <p className="tarjeta-datos__titulo">{dato.titulo}</p>
                            {dato.valor
                                ? <p className="tarjeta-datos__valor">{dato.valor}</p>
                                : <span className="tarjeta-datos__pendiente">Por confirmar</span>}
                        </div>
                    </li>
                ))}
            </ul>
            {hayPendientes && (
                <p className="tarjeta-datos__nota">
                    Los datos marcados «por confirmar» se incorporarán tras la validación de la biblioteca.
                </p>
            )}
        </aside>
    );
}

// ---------- Campo del formulario ----------

type CampoContactoProps = {
    id: string;
    etiqueta: string;
    obligatorio?: boolean;
    valor: string;
    alCambiar: (valor: string) => void;
    marcador: string;
    ayuda: string;
    error?: string;
    multilinea?: boolean;
    tipo?: "text" | "email" | "tel";
    autocompletar?: string;
    maximo: number;
};

// Etiqueta con * u «Opcional», caja de texto y abajo la ayuda o el error.
// forwardRef permite llevar el foco al primer campo con error al enviar.
export const CampoContacto = forwardRef<HTMLInputElement & HTMLTextAreaElement, CampoContactoProps>(
    function CampoContacto(
        { id, etiqueta, obligatorio, valor, alCambiar, marcador, ayuda, error, multilinea, tipo = "text", autocompletar, maximo },
        ref,
    ) {
        const idNota = `${id}-nota`;
        const propiedades = {
            id,
            name: id,
            value: valor,
            placeholder: marcador,
            maxLength: maximo,
            autoComplete: autocompletar,
            required: obligatorio,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": idNota,
            className: `campo-contacto__entrada${error ? " campo-contacto__entrada--error" : ""}`,
            onChange: (evento: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => alCambiar(evento.target.value),
        };

        return (
            <div className="campo-contacto">
                <label htmlFor={id} className="campo-contacto__etiqueta">
                    {etiqueta}
                    {obligatorio
                        ? <span className="campo-contacto__obligatorio" aria-hidden="true">*</span>
                        : <span className="campo-contacto__opcional">Opcional</span>}
                </label>
                {multilinea
                    ? <textarea ref={ref} rows={4} {...propiedades} />
                    : <input ref={ref} type={tipo} {...propiedades} />}
                {error ? (
                    <p className="campo-contacto__error" id={idNota}>
                        <img src={iconoAlerta} alt="" />
                        {error}
                    </p>
                ) : (
                    <p className="campo-contacto__ayuda" id={idNota}>{ayuda}</p>
                )}
            </div>
        );
    },
);

// ---------- Mensaje enviado ----------

export const Confirmacion = forwardRef<HTMLHeadingElement, {
    etiqueta: string;
    titulo: string;
    alEnviarOtro: () => void;
}>(function Confirmacion({ etiqueta, titulo, alEnviarOtro }, ref) {
    return (
        <section className="contacto-seccion contacto-seccion--verde">
            <div className="confirmacion-contacto" role="status">
                <span className="confirmacion-contacto__anillo">
                    <span className="confirmacion-contacto__icono">
                        <img src={iconoCheck} alt="" />
                    </span>
                </span>
                <p className="confirmacion-contacto__etiqueta">{etiqueta}</p>
                {/* tabIndex -1: recibe el foco al terminar para que el lector anuncie el resultado */}
                <h2 ref={ref} tabIndex={-1}>{titulo}</h2>
                <p className="confirmacion-contacto__texto">El personal de la biblioteca lo revisará.</p>
                <div className="confirmacion-contacto__botones">
                    <Link to="/" className="boton-contacto boton-contacto--verde">
                        Volver al inicio
                        <img src={flechaBlanca} alt="" />
                    </Link>
                    <button type="button" className="boton-contacto boton-contacto--contorno" onClick={alEnviarOtro}>
                        Enviar otro mensaje
                    </button>
                </div>
            </div>
        </section>
    );
});
