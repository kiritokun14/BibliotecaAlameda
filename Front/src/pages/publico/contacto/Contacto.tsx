import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import "./Contacto.css";
import {
    LIMITES,
    enviarMensaje,
    prepararEnvio,
    textosPorTipo,
    validarMensaje,
    type CampoMensaje,
    type ErroresMensaje,
    type MensajeContacto,
    type TipoMensaje,
} from "./datos";
import { CampoContacto, Confirmacion, TarjetaDatos } from "./piezas";
import SeguimientoContacto from "./SeguimientoContacto";
import iconoCandado from "../../../assets/contacto/privacidad-candado.svg";
import iconoEnviar from "../../../assets/contacto/boton-enviar.svg";
import iconoAviso from "../../../assets/contacto/aviso-alerta.svg";
import iconoReintentar from "../../../assets/comun/iconos/reintentar-blanco.svg";

type Envio = "editando" | "enviando" | "error" | "enviado";

const VACIO = { nombre: "", correo: "", telefono: "", mensaje: "" };
const ORDEN_CAMPOS: CampoMensaje[] = ["nombre", "correo", "telefono", "mensaje"];

// /contacto?tipo=sugerencia abre directamente el buzón de sugerencias
function tipoInicial(valor: string | null): TipoMensaje {
    return valor === "sugerencia" ? "sugerencia" : "contacto";
}

// T-053: formulario de contacto y buzón de sugerencias, sin iniciar sesión
function Contacto() {
    const [parametros] = useSearchParams();
    const [tipo, setTipo] = useState<TipoMensaje>(() => tipoInicial(parametros.get("tipo")));
    const [valores, setValores] = useState(VACIO);
    const [errores, setErrores] = useState<ErroresMensaje>({});
    const [intentoEnviar, setIntentoEnviar] = useState(false); // tras el primer intento se valida al escribir
    const [envio, setEnvio] = useState<Envio>("editando");

    const campos = useRef<Partial<Record<CampoMensaje, HTMLInputElement & HTMLTextAreaElement | null>>>({});
    const ocupado = useRef(false);
    const [folio, setFolio] = useState("");
    const tituloEnviado = useRef<HTMLHeadingElement>(null);
    const montado = useRef(true);

    useEffect(() => {
        montado.current = true;
        return () => { montado.current = false; };
    }, []);

    // Al terminar, el foco pasa al título "Gracias…" para que se anuncie
    useEffect(() => {
        if (envio === "enviado") tituloEnviado.current?.focus();
    }, [envio]);

    const textos = textosPorTipo[tipo];
    const enviando = envio === "enviando";
    const datos: MensajeContacto = { tipo, ...valores };

    function cambiar(campo: CampoMensaje, valor: string) {
        const nuevos = { ...valores, [campo]: valor };
        setValores(nuevos);
        if (intentoEnviar) setErrores(validarMensaje({ tipo, ...nuevos }));
    }

    function cambiarTipo(nuevo: TipoMensaje) {
        if (nuevo === tipo) return;
        setTipo(nuevo);
        // Lo escrito se conserva; los avisos se reinician porque cambian los textos
        setErrores({});
        setIntentoEnviar(false);
        if (envio === "error") setEnvio("editando");
    }

    async function enviar(evento: FormEvent) {
        evento.preventDefault();
        if (ocupado.current) return;

        const encontrados = validarMensaje(datos);
        setIntentoEnviar(true);
        setErrores(encontrados);
        const primero = ORDEN_CAMPOS.find((campo) => encontrados[campo]);
        if (primero) {
            campos.current[primero]?.focus();
            return;
        }

        ocupado.current = true;
        setEnvio("enviando");
        try {
            const acuse = await enviarMensaje(prepararEnvio(datos));
            if (!montado.current) return;
            setFolio(acuse.folio);
            setEnvio("enviado");
        } catch {
            // Lo escrito se conserva para poder reintentar
            if (montado.current) setEnvio("error");
        } finally { ocupado.current = false; }
    }

    function enviarOtro() {
        setValores(VACIO);
        setErrores({});
        setIntentoEnviar(false);
        setEnvio("editando");
    }

    return (
        <PaginaPublica>
            <EncabezadoPublico
                etiqueta="Contacto y sugerencias"
                titulo={<>Escríbenos, <span>te leemos</span></>}
                texto="Cuéntanos tu duda, comentario o idea para mejorar la biblioteca."
            />

            <SeguimientoContacto />
            {envio === "enviado" ? (
                <Confirmacion
                    ref={tituloEnviado}
                    folio={folio}
                    etiqueta={textos.enviado.etiqueta}
                    titulo={textos.enviado.titulo}
                    alEnviarOtro={enviarOtro}
                />
            ) : (
                <section className="contacto-seccion contacto-seccion--crema">
                    <div className="contacto-columnas">
                        <TarjetaDatos />

                        <form className="formulario-contacto" onSubmit={enviar} noValidate aria-labelledby="titulo-formulario" aria-busy={enviando}>
                            <h2 id="titulo-formulario" className="formulario-contacto__etiqueta">ENVÍANOS UN MENSAJE</h2>

                            <div className="formulario-contacto__tipo">
                                <div className="selector-contacto" role="group" aria-label="Tipo de mensaje">
                                    {(["contacto", "sugerencia"] as const).map((opcion) => (
                                        <button
                                            key={opcion}
                                            type="button"
                                            className={`selector-contacto__opcion${tipo === opcion ? " selector-contacto__opcion--activa" : ""}`}
                                            aria-pressed={tipo === opcion}
                                            onClick={() => cambiarTipo(opcion)}
                                            disabled={enviando}
                                        >
                                            {opcion === "contacto" ? "Contacto" : "Sugerencia"}
                                        </button>
                                    ))}
                                </div>

                                <p className="formulario-contacto__descripcion">{textos.descripcion}</p>
                            </div>

                            {envio === "error" && (
                                <div className="aviso-contacto" role="alert">
                                    <img src={iconoAviso} alt="" />
                                    <div>
                                        <p className="aviso-contacto__titulo">
                                            {tipo === "contacto" ? "No pudimos enviar tu mensaje" : "No pudimos enviar tu sugerencia"}
                                        </p>
                                        <p className="aviso-contacto__texto">Tu texto se conservó. Revisa tu conexión e inténtalo de nuevo.</p>
                                    </div>
                                </div>
                            )}

                            {/* disabled en el fieldset bloquea todos los campos mientras se envía */}
                            <fieldset className="formulario-contacto__campos" disabled={enviando}>
                                <legend className="solo-lectores">Tus datos y tu mensaje</legend>
                                <div className="formulario-contacto__fila">
                                    <CampoContacto
                                        ref={(el) => { campos.current.nombre = el; }}
                                        id="nombre"
                                        etiqueta="Nombre"
                                        obligatorio
                                        valor={valores.nombre}
                                        alCambiar={(valor) => cambiar("nombre", valor)}
                                        marcador="Tu nombre completo"
                                        ayuda="Como quieres que te llamemos."
                                        error={errores.nombre}
                                        autocompletar="name"
                                        maximo={LIMITES.nombre}
                                    />
                                    <CampoContacto
                                        ref={(el) => { campos.current.correo = el; }}
                                        id="correo"
                                        etiqueta="Correo electrónico"
                                        obligatorio
                                        tipo="email"
                                        valor={valores.correo}
                                        alCambiar={(valor) => cambiar("correo", valor)}
                                        marcador="nombre@correo.mx"
                                        ayuda="Para que el personal pueda contactarte."
                                        error={errores.correo}
                                        autocompletar="email"
                                        maximo={LIMITES.correo}
                                    />
                                </div>
                                <CampoContacto
                                    ref={(el) => { campos.current.telefono = el; }}
                                    id="telefono"
                                    etiqueta="Teléfono"
                                    tipo="tel"
                                    valor={valores.telefono}
                                    alCambiar={(valor) => cambiar("telefono", valor)}
                                    marcador="Ej. 311 123 4567"
                                    ayuda="Opcional. Solo si prefieres que te llamen."
                                    error={errores.telefono}
                                    autocompletar="tel"
                                    maximo={LIMITES.telefono}
                                />
                                <CampoContacto
                                    ref={(el) => { campos.current.mensaje = el; }}
                                    id="mensaje"
                                    etiqueta="Mensaje"
                                    obligatorio
                                    multilinea
                                    valor={valores.mensaje}
                                    alCambiar={(valor) => cambiar("mensaje", valor)}
                                    marcador={textos.marcador}
                                    ayuda={textos.ayudaMensaje}
                                    error={errores.mensaje}
                                    maximo={LIMITES.mensaje}
                                />
                            </fieldset>

                            <p className="formulario-contacto__privacidad">
                                <img src={iconoCandado} alt="" />
                                Usaremos tus datos solo para atender tu mensaje. * Campo obligatorio.
                            </p>

                            <button type="submit" className="boton-contacto boton-contacto--verde boton-contacto--grande" disabled={enviando}>
                                {enviando ? "Enviando…" : envio === "error" ? "Reintentar envío" : textos.boton}
                                <img
                                    className={enviando ? "boton-contacto__girando" : undefined}
                                    src={enviando || envio === "error" ? iconoReintentar : iconoEnviar}
                                    alt=""
                                />
                            </button>
                            {/* Anuncio para lectores de pantalla mientras se envía */}
                            <p className="solo-lectores" role="status">{enviando ? "Enviando, espera un momento." : ""}</p>
                        </form>
                    </div>
                </section>
            )}
        </PaginaPublica>
    );
}

export default Contacto;
