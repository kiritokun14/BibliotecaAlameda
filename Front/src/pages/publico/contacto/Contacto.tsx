import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
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
import { CampoContacto, Confirmacion, PreguntasFrecuentes, TarjetaDatos } from "./piezas";
import { useSesion } from "../perfil/usarSesion";
import { iconosSeccion } from "../perfil/iconos";
import "../perfil/Perfil.css";
import { guardarFolio } from "../perfil/mensajesGuardados";
import { LIMITE_EN_PROCESO, lugaresLibres, useMensajesEnProceso } from "./limite";
import { ErrorServicio } from "../../../servicios/api";
import iconoCandado from "../../../assets/contacto/privacidad-candado.svg";
import iconoAviso from "../../../assets/contacto/aviso-alerta.svg";
import iconoReintentar from "../../../assets/comun/iconos/reintentar-blanco.svg";

type Envio = "editando" | "enviando" | "error" | "enviado";

const VACIO = { nombre: "", correo: "", telefono: "", mensaje: "" };
const ORDEN_CAMPOS: CampoMensaje[] = ["nombre", "correo", "telefono", "mensaje"];

// /contacto?tipo=sugerencia abre directamente el buzón de sugerencias
function tipoInicial(valor: string | null): TipoMensaje {
    return valor === "sugerencia" ? "sugerencia" : "contacto";
}

// T-053: formulario de contacto y buzón de sugerencias.
// Solo con sesión y hasta 3 mensajes en proceso a la vez (limite.ts); sin sesión o con el cupo lleno, la columna
// del formulario muestra cómo seguir (iniciar sesión o ver Mis mensajes).
function Contacto() {
    const [parametros] = useSearchParams();
    const sesion = useSesion(); // con sesión, la confirmación lleva al seguimiento en Mi perfil
    const [tipo, setTipo] = useState<TipoMensaje>(() => tipoInicial(parametros.get("tipo")));
    const [valores, setValores] = useState(VACIO);
    const [errores, setErrores] = useState<ErroresMensaje>({});
    const [intentoEnviar, setIntentoEnviar] = useState(false); // tras el primer intento se valida al escribir
    const [envio, setEnvio] = useState<Envio>("editando");
    const [enProceso, sumarEnProceso, fijarEnProceso] = useMensajesEnProceso(sesion);
    const libres = enProceso === undefined ? undefined : lugaresLibres(enProceso);

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
            if (sesion && sesion !== "simulado" && acuse.folio) guardarFolio(acuse.folio, sesion); // aparece solo en Mi perfil › Mis mensajes
            sumarEnProceso();
            setEnvio("enviado");
        } catch (e) {
            if (!montado.current) return;
            // El backend rechaza si ya hay 3 en proceso (429): se muestra el aviso de cupo lleno
            if (e instanceof ErrorServicio && e.estado === 429) { fijarEnProceso(LIMITE_EN_PROCESO); setEnvio("editando"); return; }
            // Lo escrito se conserva para poder reintentar
            setEnvio("error");
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
                icono={iconosSeccion.mensajes}
                etiqueta="Contacto y sugerencias"
                titulo={<>Escríbenos, <span>te leemos</span></>}
                texto="Cuéntanos tu duda, comentario o idea para mejorar la biblioteca."
            />

            {envio === "enviado" ? (
                <Confirmacion
                    ref={tituloEnviado}
                    folio={folio}
                    conSesion={Boolean(sesion)}
                    etiqueta={textos.enviado.etiqueta}
                    titulo={textos.enviado.titulo}
                    alEnviarOtro={enviarOtro}
                />
            ) : (
                <section className="contacto-seccion contacto-seccion--crema contacto-pagina">
                    <div className="contacto-pila">
                    <TarjetaDatos />
                    <div className="contacto-columnas contacto-columnas--nuevo">

                        {sesion === null ? (
                            <AvisoFormulario titulo="Inicia sesión para escribirnos"
                                texto="Así cada mensaje queda en tu perfil con su folio y puedes ver en qué va y la respuesta de la biblioteca.">
                                <Link to="/iniciar-sesion" className="perfil-boton">Iniciar sesión</Link>
                            </AvisoFormulario>
                        ) : sesion === undefined || (libres === undefined) ? (
                            <AvisoFormulario titulo="Cargando…" texto="Revisando tu cuenta." cargando />
                        ) : libres === 0 ? (
                            <AvisoFormulario titulo={`Tienes ${LIMITE_EN_PROCESO} mensajes en proceso`}
                                texto={`Para que el personal pueda atender a todas las personas, puedes tener hasta ${LIMITE_EN_PROCESO} mensajes en proceso a la vez. Cuando atiendan alguno, podrás escribir de nuevo.`}>
                                <Link to="/mi-perfil/mensajes" className="perfil-boton">Ver mis mensajes</Link>
                            </AvisoFormulario>
                        ) : (
                        <form className="formulario-contacto" onSubmit={enviar} noValidate aria-labelledby="titulo-formulario" aria-busy={enviando}>
                            <h2 id="titulo-formulario" className="formulario-contacto__titulo">Envíanos un mensaje</h2>

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

                            {/* Cupo: cuántos mensajes puede enviar todavía (puntos llenos = en proceso) */}
                            <div className="formulario-contacto__cupo" role="note">
                                <span className="formulario-contacto__cupo-numero" aria-hidden="true">{libres}</span>
                                <span className="formulario-contacto__cupo-textos">
                                    <strong>{libres === 1 ? "Te queda 1 mensaje disponible" : `Te quedan ${libres} mensajes disponibles`}</strong>
                                    <span>Puedes tener hasta {LIMITE_EN_PROCESO} mensajes en proceso a la vez; cuando atendamos uno, se libera un lugar.</span>
                                </span>
                                <span className="formulario-contacto__cupo-puntos" aria-hidden="true">
                                    {Array.from({ length: LIMITE_EN_PROCESO }, (_, i) => (
                                        <span key={i} className={i < LIMITE_EN_PROCESO - (libres ?? 0) ? "formulario-contacto__cupo-punto--usado" : undefined} />
                                    ))}
                                </span>
                            </div>

                            <p className="formulario-contacto__privacidad">
                                <img src={iconoCandado} alt="" />
                                Usaremos tus datos solo para atender tu mensaje. * Campo obligatorio.
                            </p>

                            <button type="submit" className="boton-contacto boton-contacto--verde boton-contacto--grande" disabled={enviando}>
                                {enviando ? "Enviando…" : envio === "error" ? "Reintentar envío" : textos.boton}
                                {enviando && <img className="boton-contacto__girando" src={iconoReintentar} alt="" />}
                            </button>
                            {/* Anuncio para lectores de pantalla mientras se envía */}
                            <p className="solo-lectores" role="status">{enviando ? "Enviando, espera un momento." : ""}</p>
                        </form>
                        )}
                        <div className="contacto-lateral">
                            <PreguntasFrecuentes />
                            {/* Seguimiento: dónde ver en qué va un mensaje ya enviado */}
                            <section className="contacto-seguimiento" aria-labelledby="titulo-seguimiento">
                                <span className="contacto-seguimiento__insignia" aria-hidden="true" />
                                <h2 id="titulo-seguimiento">{sesion ? "¿Ya nos escribiste?" : "¿Aún no tienes cuenta?"}</h2>
                                <p>{sesion ? "Consulta en qué va cada mensaje desde tu perfil." : "Crea tu cuenta gratis para escribirnos y seguir cada mensaje desde tu perfil."}</p>
                                <Link to={sesion ? "/mi-perfil/mensajes" : "/crear-cuenta"} className="perfil-boton perfil-boton--guardar">{sesion ? "Ver mis mensajes" : "Crear cuenta"}</Link>
                            </section>
                        </div>
                    </div>
                    </div>
                </section>
            )}
        </PaginaPublica>
    );
}

// Lo que ocupa el lugar del formulario cuando no se puede escribir (sin sesión o con el cupo lleno)
function AvisoFormulario({ titulo, texto, cargando, children }: { titulo: string; texto: string; cargando?: boolean; children?: ReactNode }) {
    return (
        <div className={`perfil-vacio perfil-vacio--eventos contacto-aviso${cargando ? " contacto-aviso--cargando" : ""}`}
            role="status" style={{ "--icono-seccion": `url("${iconosSeccion.mensajes}")` } as CSSProperties}>
            {!cargando && <span className="perfil-vacio__insignia" aria-hidden="true" />}
            <p><strong>{titulo}</strong>{texto}</p>
            {children}
        </div>
    );
}

export default Contacto;
