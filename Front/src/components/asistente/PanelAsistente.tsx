import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import "./Asistente.css";
import { LIMITE_PREGUNTA, PREGUNTAS_SUGERIDAS, type Conversacion, type Mensaje } from "./conversacion";
import type { RespuestaAsistente } from "./servicio";
import cabeceraCirculo1 from "../../assets/asistente/cabecera-circulo-1.svg";
import cabeceraCirculo2 from "../../assets/asistente/cabecera-circulo-2.svg";
import expandidoCirculo1 from "../../assets/asistente/expandido-circulo-1.svg";
import expandidoCirculo2 from "../../assets/asistente/expandido-circulo-2.svg";
import bienvenidaCirculo from "../../assets/asistente/bienvenida-circulo.svg";
import bienvenidaGrande1 from "../../assets/asistente/bienvenida-grande-circulo-1.svg";
import bienvenidaGrande2 from "../../assets/asistente/bienvenida-grande-circulo-2.svg";
import lateralCirculo from "../../assets/asistente/lateral-circulo.svg";
import libroDorado from "../../assets/asistente/libro-dorado.svg";
import libroChico from "../../assets/asistente/libro-chico.svg";
import puntoEnLinea from "../../assets/asistente/punto-en-linea.svg";
import iconoMas from "../../assets/asistente/nueva-consulta.svg";
import iconoMasChico from "../../assets/asistente/mas-chico.svg";
import iconoMasVerde from "../../assets/asistente/boton-mas-verde.svg";
import iconoExpandir from "../../assets/asistente/expandir.svg";
import iconoContraer from "../../assets/asistente/contraer.svg";
import iconoMinimizar from "../../assets/asistente/minimizar.svg";
import iconoCerrar from "../../assets/asistente/cerrar.svg";
import iconoCerrarChico from "../../assets/asistente/cerrar-chico.svg";
import iconoBuscar from "../../assets/asistente/sugerencia-buscar.svg";
import iconoFlecha from "../../assets/asistente/sugerencia-flecha.svg";
import iconoEnviar from "../../assets/asistente/enviar.svg";
import iconoArchivo from "../../assets/asistente/fuente-archivo.svg";
import escribiendo from "../../assets/asistente/escribiendo.svg";
import iconoInfo from "../../assets/asistente/aviso-info.svg";
import iconoAlerta from "../../assets/asistente/aviso-alerta.svg";
import iconoCandado from "../../assets/asistente/aviso-candado.svg";
import iconoCorreo from "../../assets/asistente/boton-correo.svg";
import iconoCheck from "../../assets/asistente/enviada-check.svg";
import iconoReintentar from "../../assets/servicios/boton-reintentar.svg";
import temaLibro from "../../assets/asistente/tema-libro.svg";
import temaCalendario from "../../assets/asistente/tema-calendario.svg";
import temaPersona from "../../assets/acerca/pestana-persona.svg";
import notaInfo from "../../assets/asistente/nota-info.svg";

type Modo = "compacto" | "expandido";

type PanelProps = {
    modo: Modo;
    conversacion: Conversacion;
    alExpandir: () => void;
    alContraer: () => void;
    alMinimizar: () => void;
    alCerrar: () => void;
};

// Ventana del asistente. Compacta: esquina inferior derecha. Expandida: al centro, sobre un velo.
export default function PanelAsistente({ modo, conversacion, alExpandir, alContraer, alMinimizar, alCerrar }: PanelProps) {
    const expandido = modo === "expandido";
    const { mensajes, ocupado } = conversacion;
    const [texto, setTexto] = useState("");
    const entrada = useRef<HTMLInputElement>(null);
    const hilo = useRef<HTMLDivElement>(null);

    // Al abrir (o al cambiar de tamaño) el cursor queda listo para escribir
    useEffect(() => { entrada.current?.focus(); }, [modo]);

    // Cada mensaje nuevo se ve sin tener que desplazarse
    useEffect(() => {
        const caja = hilo.current;
        if (caja) caja.scrollTop = caja.scrollHeight;
    }, [mensajes]);

    // Escape: la ventana grande vuelve a la compacta; la compacta se minimiza
    useEffect(() => {
        function alTeclear(evento: KeyboardEvent) {
            if (evento.key !== "Escape") return;
            if (expandido) alContraer();
            else alMinimizar();
        }
        document.addEventListener("keydown", alTeclear);
        return () => document.removeEventListener("keydown", alTeclear);
    }, [expandido, alContraer, alMinimizar]);

    function enviar(evento: FormEvent) {
        evento.preventDefault();
        if (!texto.trim() || ocupado) return;
        conversacion.preguntar(texto);
        setTexto("");
    }

    function reformular() {
        setTexto(conversacion.ultimaPregunta);
        entrada.current?.focus();
    }

    // Al abrir una fuente desde la ventana grande, se contrae para que se vea la página
    const alAbrirFuente = expandido ? alContraer : undefined;

    const panel = (
        <section
            className={`panel-asistente panel-asistente--${modo}`}
            role="dialog"
            aria-modal={expandido}
            aria-labelledby="titulo-asistente"
        >
            <Cabecera
                expandido={expandido}
                conConversacion={mensajes.length > 0}
                ocupado={ocupado}
                alNuevaConsulta={conversacion.nuevaConsulta}
                alExpandir={alExpandir}
                alContraer={alContraer}
                alMinimizar={alMinimizar}
                alCerrar={alCerrar}
            />

            <div className="panel-asistente__contenido">
                {expandido && <BarraLateral />}

                <div className="panel-asistente__principal">
                    <div ref={hilo} className="panel-asistente__conversacion" role="log" aria-live="polite" aria-label="Conversación con el asistente">
                        <div className="panel-asistente__hilo">
                            {mensajes.length === 0 ? (
                                <Bienvenida expandido={expandido} alElegir={conversacion.preguntar} />
                            ) : (
                                mensajes.map((mensaje) => (
                                    <MensajeConversacion
                                        key={mensaje.id}
                                        mensaje={mensaje}
                                        expandido={expandido}
                                        conversacion={conversacion}
                                        alReformular={reformular}
                                        alAbrirFuente={alAbrirFuente}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <form className="entrada-asistente" onSubmit={enviar}>
                        <div className="entrada-asistente__fila">
                            <label htmlFor="pregunta-asistente" className="solo-lectores">Escribe tu pregunta</label>
                            <input
                                ref={entrada}
                                id="pregunta-asistente"
                                className="entrada-asistente__campo"
                                value={texto}
                                onChange={(e) => setTexto(e.target.value)}
                                placeholder="Escribe tu pregunta…"
                                maxLength={LIMITE_PREGUNTA}
                                autoComplete="off"
                            />
                            <button type="submit" className="entrada-asistente__enviar" disabled={!texto.trim() || ocupado} aria-label="Enviar pregunta">
                                <img src={iconoEnviar} alt="" />
                            </button>
                        </div>
                        <p className="entrada-asistente__nota">Las respuestas se basan en la información publicada por la biblioteca.</p>
                    </form>
                </div>
            </div>
        </section>
    );

    if (!expandido) return panel;
    return (
        <div className="velo-asistente" onMouseDown={(e) => { if (e.target === e.currentTarget) alContraer(); }}>
            {panel}
        </div>
    );
}

// ---------- Cabecera ----------

function Cabecera({
    expandido,
    conConversacion,
    ocupado,
    alNuevaConsulta,
    alExpandir,
    alContraer,
    alMinimizar,
    alCerrar,
}: {
    expandido: boolean;
    conConversacion: boolean;
    ocupado: boolean;
    alNuevaConsulta: () => void;
    alExpandir: () => void;
    alContraer: () => void;
    alMinimizar: () => void;
    alCerrar: () => void;
}) {
    return (
        <header className="cabecera-asistente">
            <img className="cabecera-asistente__circulo cabecera-asistente__circulo--1" src={expandido ? expandidoCirculo1 : cabeceraCirculo1} alt="" />
            <img className="cabecera-asistente__circulo cabecera-asistente__circulo--2" src={expandido ? expandidoCirculo2 : cabeceraCirculo2} alt="" />
            <span className="cabecera-asistente__avatar">
                <img src={libroDorado} alt="" />
            </span>
            <div className="cabecera-asistente__textos">
                <h2 id="titulo-asistente">Asistente de la biblioteca</h2>
                <p><img src={puntoEnLinea} alt="" />En línea</p>
            </div>

            {expandido ? (
                <div className="cabecera-asistente__botones">
                    {conConversacion && (
                        <BotonTexto icono={iconoMasChico} alPresionar={alNuevaConsulta} desactivado={ocupado}>Nueva consulta</BotonTexto>
                    )}
                    <BotonTexto icono={iconoContraer} alPresionar={alContraer}>Contraer</BotonTexto>
                    <BotonTexto icono={iconoContraer} alPresionar={alMinimizar}>Minimizar</BotonTexto>
                    <BotonTexto icono={iconoCerrarChico} alPresionar={alCerrar}>Cerrar</BotonTexto>
                </div>
            ) : (
                <div className="cabecera-asistente__botones">
                    {conConversacion && (
                        <BotonIcono icono={iconoMas} etiqueta="Nueva consulta" alPresionar={alNuevaConsulta} desactivado={ocupado} />
                    )}
                    {/* Mientras consulta no se cambia de tamaño (así está en Figma) */}
                    {!ocupado && <BotonIcono icono={iconoExpandir} etiqueta="Expandir el asistente" alPresionar={alExpandir} />}
                    <BotonIcono icono={iconoMinimizar} etiqueta="Minimizar el asistente" alPresionar={alMinimizar} />
                    <BotonIcono icono={iconoCerrar} etiqueta="Cerrar el asistente" alPresionar={alCerrar} />
                </div>
            )}
        </header>
    );
}

function BotonIcono({ icono, etiqueta, alPresionar, desactivado }: { icono: string; etiqueta: string; alPresionar: () => void; desactivado?: boolean }) {
    return (
        <button type="button" className="boton-cabecera-asistente" onClick={alPresionar} aria-label={etiqueta} title={etiqueta} disabled={desactivado}>
            <img src={icono} alt="" />
        </button>
    );
}

function BotonTexto({ icono, alPresionar, desactivado, children }: { icono: string; alPresionar: () => void; desactivado?: boolean; children: string }) {
    return (
        <button type="button" className="boton-cabecera-asistente boton-cabecera-asistente--texto" onClick={alPresionar} disabled={desactivado}>
            <img src={icono} alt="" />
            {children}
        </button>
    );
}

// ---------- Barra lateral (solo expandido) ----------

function BarraLateral() {
    const temas = [
        { icono: temaLibro, texto: "Servicios de la biblioteca" },
        { icono: temaCalendario, texto: "Actividades y eventos" },
        { icono: temaPersona, texto: "Trámites, como la credencial" },
    ];
    return (
        <aside className="lateral-asistente">
            <img className="lateral-asistente__circulo" src={lateralCirculo} alt="" />
            <p className="sobretitulo-asistente"><span className="punto-dorado" />SOBRE EL ASISTENTE</p>
            <h3>Pregunta con tus propias palabras</h3>
            <p className="lateral-asistente__texto">Puedo orientarte sobre estos temas con la información publicada en el portal:</p>
            <ul className="lateral-asistente__temas">
                {temas.map((tema) => (
                    <li key={tema.texto}>
                        <span className="lateral-asistente__icono"><img src={tema.icono} alt="" /></span>
                        {tema.texto}
                    </li>
                ))}
            </ul>
            <p className="lateral-asistente__nota">
                <img src={notaInfo} alt="" />
                Tu conversación se conserva al contraer o minimizar el asistente. Para empezar de cero, usa «Nueva consulta».
            </p>
        </aside>
    );
}

// ---------- Bienvenida y preguntas sugeridas ----------

function Bienvenida({ expandido, alElegir }: { expandido: boolean; alElegir: (pregunta: string) => void }) {
    return (
        <>
            <div className={`bienvenida-asistente${expandido ? " bienvenida-asistente--grande" : ""}`}>
                {expandido ? (
                    <>
                        <img className="bienvenida-asistente__circulo bienvenida-asistente__circulo--1" src={bienvenidaGrande1} alt="" />
                        <img className="bienvenida-asistente__circulo bienvenida-asistente__circulo--2" src={bienvenidaGrande2} alt="" />
                    </>
                ) : (
                    <img className="bienvenida-asistente__circulo bienvenida-asistente__circulo--1" src={bienvenidaCirculo} alt="" />
                )}
                <p className="sobretitulo-asistente"><span className="punto-dorado" />BIENVENIDA</p>
                <h3>Hola, ¿en qué te puedo ayudar?</h3>
                <p className="bienvenida-asistente__texto">
                    Te oriento sobre los servicios, las actividades y los trámites de la biblioteca, con la información publicada en este portal.
                </p>
            </div>
            <p className="etiqueta-sugerencias">PREGUNTAS SUGERIDAS</p>
            <ul className="sugerencias-asistente">
                {PREGUNTAS_SUGERIDAS.map((pregunta) => (
                    <li key={pregunta}>
                        <button type="button" className="sugerencia-asistente" onClick={() => alElegir(pregunta)}>
                            <span className="sugerencia-asistente__icono"><img src={iconoBuscar} alt="" /></span>
                            <span className="sugerencia-asistente__texto">{pregunta}</span>
                            <img className="sugerencia-asistente__flecha" src={iconoFlecha} alt="" />
                        </button>
                    </li>
                ))}
            </ul>
        </>
    );
}

// ---------- Mensajes ----------

function MensajeConversacion({
    mensaje,
    expandido,
    conversacion,
    alReformular,
    alAbrirFuente,
}: {
    mensaje: Mensaje;
    expandido: boolean;
    conversacion: Conversacion;
    alReformular: () => void;
    alAbrirFuente?: () => void;
}) {
    if (mensaje.autor === "persona") {
        return (
            <div className="mensaje-asistente mensaje-asistente--persona">
                <p className="burbuja-persona">{mensaje.texto}</p>
            </div>
        );
    }

    if (mensaje.estado === "consultando") {
        return (
            <BurbujaAsistente>
                <img className="burbuja-asistente__escribiendo" src={escribiendo} alt="" />
                <p className="burbuja-asistente__buscando">Buscando en la información de la biblioteca…</p>
            </BurbujaAsistente>
        );
    }

    if (mensaje.estado === "error") {
        return (
            <BurbujaAsistente variante="aviso">
                <Aviso icono={iconoAlerta} titulo="El asistente no está disponible" />
                <p className="burbuja-asistente__texto burbuja-asistente__texto--aviso">
                    No se pudo completar tu consulta. Inténtalo de nuevo en unos minutos o escríbenos desde Contacto.
                </p>
                <div className="burbuja-asistente__acciones">
                    <button type="button" className="boton-asistente boton-asistente--verde" onClick={() => conversacion.reintentar(mensaje.id)} disabled={conversacion.ocupado}>
                        Reintentar <img src={iconoReintentar} alt="" />
                    </button>
                    <Link to="/contacto" className="boton-asistente boton-asistente--contorno" onClick={alAbrirFuente}>Ir a Contacto</Link>
                </div>
            </BurbujaAsistente>
        );
    }

    return <Respuesta respuesta={mensaje.respuesta} expandido={expandido} conversacion={conversacion} alReformular={alReformular} alAbrirFuente={alAbrirFuente} />;
}

function Respuesta({
    respuesta,
    expandido,
    conversacion,
    alReformular,
    alAbrirFuente,
}: {
    respuesta: RespuestaAsistente;
    expandido: boolean;
    conversacion: Conversacion;
    alReformular: () => void;
    alAbrirFuente?: () => void;
}) {
    switch (respuesta.tipo) {
        case "insuficiente":
            return (
                <BurbujaAsistente variante="aviso">
                    <Aviso icono={iconoInfo} titulo="No encontré información suficiente" />
                    <p className="burbuja-asistente__texto burbuja-asistente__texto--aviso">
                        No puedo responderte con certeza. Puedes reformular tu pregunta o enviarla al personal para que te respondan.
                    </p>
                    <div className="burbuja-asistente__acciones">
                        <button type="button" className="boton-asistente boton-asistente--verde" onClick={conversacion.hablarConPersonal} disabled={conversacion.ocupado}>
                            Hablar con el personal <img src={iconoCorreo} alt="" />
                        </button>
                        <button type="button" className="boton-asistente boton-asistente--contorno" onClick={alReformular}>
                            Reformular mi pregunta
                        </button>
                    </div>
                </BurbujaAsistente>
            );
        case "privada":
            return (
                <BurbujaAsistente variante="aviso">
                    <Aviso icono={iconoCandado} titulo="Consulta privada" />
                    <p className="burbuja-asistente__texto burbuja-asistente__texto--aviso">
                        No puedo compartir información personal de otros usuarios. Puedo ayudarte con tu propia cuenta o con dudas generales de la biblioteca.
                    </p>
                </BurbujaAsistente>
            );
        case "enviada":
            return (
                <BurbujaAsistente variante="exito">
                    <div className="aviso-burbuja">
                        <span className="aviso-burbuja__check"><img src={iconoCheck} alt="" /></span>
                        <p className="aviso-burbuja__titulo aviso-burbuja__titulo--exito">Consulta enviada al personal</p>
                    </div>
                    <p className="burbuja-asistente__texto burbuja-asistente__texto--exito">
                        Te responderán por correo. {respuesta.folio ? `Folio: ${respuesta.folio}.` : "Folio por asignar."}
                    </p>
                    <button type="button" className="boton-asistente boton-asistente--contorno boton-asistente--chico" onClick={conversacion.nuevaConsulta}>
                        Nueva consulta <img src={iconoMasVerde} alt="" />
                    </button>
                </BurbujaAsistente>
            );
        default:
            return (
                <BurbujaAsistente>
                    {respuesta.parrafos.map((parrafo) => (
                        <p key={parrafo} className="burbuja-asistente__texto">{parrafo}</p>
                    ))}
                    {respuesta.actividades && (
                        <ul className={`actividades-asistente${expandido ? " actividades-asistente--dos" : ""}`}>
                            {respuesta.actividades.map((actividad) => (
                                <li key={actividad.titulo}>
                                    <span className="actividades-asistente__fecha">
                                        <strong>{actividad.dia}</strong>
                                        <small>{actividad.mes}</small>
                                    </span>
                                    <span className="actividades-asistente__textos">
                                        <strong>{actividad.titulo}</strong>
                                        <small>{actividad.detalle}</small>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {respuesta.cierre && <p className="burbuja-asistente__texto">{respuesta.cierre}</p>}
                    <div className="fuentes-asistente">
                        <p>FUENTES</p>
                        <ul>
                            {respuesta.fuentes.map((fuente) => (
                                <li key={fuente.titulo}>
                                    {fuente.ruta ? (
                                        <Link to={fuente.ruta} className="fuente-asistente" onClick={alAbrirFuente}>
                                            <img src={iconoArchivo} alt="" />{fuente.titulo}
                                        </Link>
                                    ) : (
                                        <span className="fuente-asistente"><img src={iconoArchivo} alt="" />{fuente.titulo}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </BurbujaAsistente>
            );
    }
}

function BurbujaAsistente({ variante, children }: { variante?: "aviso" | "exito"; children: ReactNode }) {
    return (
        <div className="mensaje-asistente">
            <span className="mensaje-asistente__avatar"><img src={libroChico} alt="" /></span>
            <div className={`burbuja-asistente${variante ? ` burbuja-asistente--${variante}` : ""}`}>{children}</div>
        </div>
    );
}

function Aviso({ icono, titulo }: { icono: string; titulo: string }) {
    return (
        <div className="aviso-burbuja">
            <img src={icono} alt="" />
            <p className="aviso-burbuja__titulo">{titulo}</p>
        </div>
    );
}
