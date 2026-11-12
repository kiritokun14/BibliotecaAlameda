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
import { EtapasTramite } from "../credencial/piezas";
import { etapasContacto } from "./seguimiento";
import "../credencial/CredencialSesion.css";

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
// Con sesión: folio y flujo «Se registró tu petición → En revisión → Atendida», con enlace al seguimiento
// en Mi perfil › Mis mensajes. Visitante sin cuenta: no ve folio (no tendría dónde consultarlo); se le
// agradece y se le invita a registrarse para dar seguimiento.

export const Confirmacion = forwardRef<HTMLHeadingElement, {
    etiqueta: string;
    titulo: string;
    alEnviarOtro: () => void;
    folio?: string;
    conSesion: boolean;
}>(function Confirmacion({ etiqueta, titulo, alEnviarOtro, folio, conSesion }, ref) {
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
                {conSesion ? (
                    <>
                        <p className="confirmacion-contacto__texto">
                            Se registró tu petición{folio && <> con el folio <strong>{folio}</strong></>}.
                            Puedes seguir su avance desde tu perfil.
                        </p>
                        <div className="confirmacion-contacto__etapas">
                            <EtapasTramite etapas={etapasContacto("recibido")} />
                        </div>
                        <div className="confirmacion-contacto__botones">
                            <Link to={folio ? `/mi-perfil/mensajes?folio=${encodeURIComponent(folio)}` : "/mi-perfil/mensajes"}
                                className="boton-contacto boton-contacto--verde">
                                Ver el seguimiento en mi perfil
                                <img src={flechaBlanca} alt="" />
                            </Link>
                            <button type="button" className="boton-contacto boton-contacto--contorno" onClick={alEnviarOtro}>
                                Enviar otro mensaje
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="confirmacion-contacto__texto">
                            Tu petición será revisada por el personal de la biblioteca. ¡Muchas gracias por escribirnos!
                        </p>
                        <p className="confirmacion-contacto__invitacion">
                            Si quieres un seguimiento más adecuado o más información, regístrate en el portal:
                            con tu cuenta verás en qué va cada mensaje que nos envíes.
                        </p>
                        <div className="confirmacion-contacto__botones">
                            <Link to="/crear-cuenta" className="boton-contacto boton-contacto--verde">
                                Crear mi cuenta
                                <img src={flechaBlanca} alt="" />
                            </Link>
                            <Link to="/" className="boton-contacto boton-contacto--contorno">Volver al inicio</Link>
                            <button type="button" className="boton-contacto boton-contacto--contorno" onClick={alEnviarOtro}>
                                Enviar otro mensaje
                            </button>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
});

// ---------- Otras formas de comunicarte ----------
// Llamar, escribir o visitar: los datos salen de datosBiblioteca (los mismos de la tarjeta verde).
const MAPA_BIBLIOTECA = "https://maps.app.goo.gl/3kJpfUj9dDBsZZNz9"; // el mismo enlace del mapa de Inicio

export function CanalesContacto() {
    const telefono = datosBiblioteca.telefono;
    const correo = datosBiblioteca.correo;
    const canales = [
        telefono && { id: "llamar", titulo: "Llámanos", texto: `En horario de atención: ${telefono}`, accion: "Llamar ahora", href: `tel:+52${telefono.replace(/\D/g, "")}`, icono: iconoTelefono, externo: false },
        correo && { id: "escribir", titulo: "Escríbenos un correo", texto: correo, accion: "Enviar correo", href: `mailto:${correo}`, icono: iconoCorreo, externo: false },
        { id: "visitar", titulo: "Visítanos", texto: datosBiblioteca.direccion, accion: "Cómo llegar", href: MAPA_BIBLIOTECA, icono: iconoPin, externo: true },
    ].filter(Boolean) as { id: string; titulo: string; texto: string; accion: string; href: string; icono: string; externo: boolean }[];

    return (
        <section className="contacto-seccion contacto-seccion--blanca" aria-labelledby="titulo-canales">
            <div className="contacto-bloque">
                <p className="contacto-bloque__etiqueta">OTRAS FORMAS</p>
                <h2 id="titulo-canales">Otras formas de comunicarte</h2>
                <ul className="canales-contacto">
                    {canales.map((c) => (
                        <li key={c.id}>
                            <a className="canal-contacto" href={c.href} {...(c.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                                <span className="canal-contacto__icono"><img src={c.icono} alt="" /></span>
                                <strong>{c.titulo}</strong>
                                <span className="canal-contacto__texto">{c.texto}</span>
                                <span className="canal-contacto__accion">
                                    {c.accion} <span aria-hidden="true">→</span>
                                    {c.externo && <span className="solo-lectores"> (se abre en una pestaña nueva)</span>}
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

// ---------- Preguntas frecuentes ----------
// Respuestas que remiten a lo que ya existe en el portal (no inventan reglas de la biblioteca).
const PREGUNTAS: { pregunta: string; respuesta: string; enlace: { texto: string; ruta: string } }[] = [
    { pregunta: "¿Cómo tramito mi credencial?", respuesta: "La solicitas desde el portal con tu cuenta y después acudes a la biblioteca para el cotejo de tus datos.", enlace: { texto: "Ver el trámite de credencial", ruta: "/credencial" } },
    { pregunta: "¿Cómo solicito un espacio de la biblioteca?", respuesta: "Con tu sesión iniciada eliges el área, la fecha y el horario; la biblioteca revisa y confirma cada solicitud.", enlace: { texto: "Ver la agenda de espacios", ruta: "/espacios" } },
    { pregunta: "¿Dónde consulto los talleres y actividades?", respuesta: "En Eventos encuentras la agenda con las próximas actividades, sus horarios y lugares.", enlace: { texto: "Ver eventos y actividades", ruta: "/eventos" } },
    { pregunta: "¿Cómo sé en qué va mi mensaje?", respuesta: "Si lo envías con tu sesión iniciada, recibes un folio y puedes seguir su avance en Mi perfil › Mis mensajes.", enlace: { texto: "Ir a Mis mensajes", ruta: "/mi-perfil/mensajes" } },
];

export function PreguntasFrecuentes() {
    return (
        <section className="contacto-seccion contacto-seccion--crema" aria-labelledby="titulo-preguntas">
            <div className="contacto-bloque">
                <p className="contacto-bloque__etiqueta">ANTES DE ESCRIBIR</p>
                <h2 id="titulo-preguntas">Preguntas frecuentes</h2>
                <div className="preguntas-contacto">
                    {PREGUNTAS.map((p) => (
                        <details key={p.pregunta} className="pregunta-contacto">
                            <summary>{p.pregunta}</summary>
                            <div className="pregunta-contacto__respuesta">
                                <p>{p.respuesta}</p>
                                <Link to={p.enlace.ruta}>{p.enlace.texto} <span aria-hidden="true">→</span></Link>
                            </div>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
