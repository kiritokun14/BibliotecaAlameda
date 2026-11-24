import { forwardRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import { datosBiblioteca } from "./datos";
import iconoPin from "../../../assets/contacto/dato-pin.svg";
import iconoReloj from "../../../assets/contacto/dato-reloj.svg";
import iconoTelefono from "../../../assets/contacto/dato-telefono.svg";
import iconoCorreo from "../../../assets/contacto/dato-correo.svg";
import iconoAlerta from "../../../assets/contacto/campo-alerta.svg";
import iconoCheck from "../../../assets/contacto/enviado-check.svg";
import { EtapasTramite } from "../credencial/piezas";
import { EtiquetaPerfil } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";
import iconoPregunta from "../../../assets/inicio/etiqueta-accesos.svg";
import { etapasContacto } from "./seguimiento";
import "../credencial/CredencialSesion.css";

// ---------- Fila de tarjetas de datos ----------
// Sin datos, los de la biblioteca (Contacto); otra página pasa los suyos (p. ej. Credencial: costo, revisión, vigencia y cotejo).
export type DatoFila = { id: string; titulo: string; valor: string | null | undefined; icono: string };

const datosContacto: DatoFila[] = [
    { id: "direccion", titulo: "Dirección", valor: datosBiblioteca.direccion, icono: iconoPin },
    { id: "horario", titulo: "Horario", valor: datosBiblioteca.horario, icono: iconoReloj },
    { id: "telefono", titulo: "Teléfono", valor: datosBiblioteca.telefono, icono: iconoTelefono },
    { id: "correo", titulo: "Correo", valor: datosBiblioteca.correo, icono: iconoCorreo },
];

const MAPA_BIBLIOTECA = "https://maps.app.goo.gl/3kJpfUj9dDBsZZNz9"; // el mismo enlace del mapa de Inicio

export function TarjetaDatos({ datos = datosContacto, titulo = "Cómo encontrarnos" }: { datos?: DatoFila[]; titulo?: string }) {
    const enlaces: Record<string, { href: string; externo?: boolean } | undefined> = {
        direccion: { href: MAPA_BIBLIOTECA, externo: true },
        telefono: datosBiblioteca.telefono ? { href: `tel:+52${datosBiblioteca.telefono.replace(/\D/g, "")}` } : undefined,
        correo: datosBiblioteca.correo ? { href: `mailto:${datosBiblioteca.correo}` } : undefined,
    };
    return (
        <section className="contacto-datos" aria-labelledby="titulo-datos">
            <h2 id="titulo-datos" className="solo-lectores">{titulo}</h2>
            <ul className="tarjeta-datos__lista">
                {datos.map((dato) => {
                    const enlace = enlaces[dato.id];
                    const contenido = <>
                        <span className="tarjeta-datos__icono"><img src={dato.icono} alt="" /></span>
                        <span className="tarjeta-datos__textos">
                            <span className="tarjeta-datos__titulo">{dato.titulo}</span>
                            <span className="tarjeta-datos__valor">{dato.valor ?? "Por confirmar"}</span>
                        </span>
                    </>;
                    return (
                        <li key={dato.id}>
                            {enlace && dato.valor
                                ? <a className="tarjeta-datos__fila tarjeta-datos__fila--enlace" href={enlace.href} {...(enlace.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                                    {contenido}{enlace.externo && <span className="solo-lectores"> (se abre en una pestaña nueva)</span>}
                                </a>
                                : <div className="tarjeta-datos__fila">{contenido}</div>}
                        </li>
                    );
                })}
            </ul>
        </section>
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
                <EtiquetaPerfil icono={iconosSeccion.mensajes}>{etiqueta}</EtiquetaPerfil>
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

// ---------- Preguntas frecuentes ----------
// Respuestas que remiten a lo que ya existe en el portal (no inventan reglas de la biblioteca).
export type PreguntaFrecuente = { pregunta: string; respuesta: string; enlace: { texto: string; ruta: string } };
const PREGUNTAS: PreguntaFrecuente[] = [
    { pregunta: "¿Cómo tramito mi credencial?", respuesta: "La solicitas desde el portal con tu cuenta y después acudes a la biblioteca para el cotejo de tus datos.", enlace: { texto: "Ver el trámite de credencial", ruta: "/credencial" } },
    { pregunta: "¿Cómo solicito un espacio de la biblioteca?", respuesta: "Con tu sesión iniciada eliges el área, la fecha y el horario; la biblioteca revisa y confirma cada solicitud.", enlace: { texto: "Ver la agenda de espacios", ruta: "/espacios" } },
    { pregunta: "¿Dónde consulto los talleres y actividades?", respuesta: "En Eventos encuentras la agenda con las próximas actividades, sus horarios y lugares.", enlace: { texto: "Ver eventos y actividades", ruta: "/eventos" } },
    { pregunta: "¿Cómo sé en qué va mi mensaje?", respuesta: "Si lo envías con tu sesión iniciada, recibes un folio y puedes seguir su avance en Mi perfil › Mis mensajes.", enlace: { texto: "Ir a Mis mensajes", ruta: "/mi-perfil/mensajes" } },
];

// Solo una pregunta abierta a la vez: al abrir otra, la anterior se cierra (así la columna no se alarga de más)
export function PreguntasFrecuentes({ preguntas = PREGUNTAS }: { preguntas?: PreguntaFrecuente[] }) {
    const [abierta, setAbierta] = useState<number | null>(null);
    return (
        <section className="preguntas-tarjeta" aria-labelledby="titulo-preguntas">
            <EtiquetaPerfil id="titulo-preguntas" icono={iconoPregunta}>Preguntas frecuentes</EtiquetaPerfil>
            <div className="preguntas-contacto">
                {preguntas.map((p, i) => (
                    <details key={p.pregunta} className="pregunta-contacto" open={abierta === i}
                        onToggle={(e) => {
                            const abiertaAhora = (e.currentTarget as HTMLDetailsElement).open;
                            setAbierta((actual) => (abiertaAhora ? i : actual === i ? null : actual));
                        }}>
                        <summary>{p.pregunta}</summary>
                        <div className="pregunta-contacto__respuesta">
                            <p>{p.respuesta}</p>
                            <Link to={p.enlace.ruta}>{p.enlace.texto}</Link>
                        </div>
                    </details>
                ))}
            </div>
        </section>
    );
}
