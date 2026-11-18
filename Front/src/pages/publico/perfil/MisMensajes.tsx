// Mi perfil › Mis mensajes: seguimiento de lo que la persona escribió en Contacto y sugerencias.
// Consulta real: GET /v1/public/contacto/seguimiento/{folio} (estados recibido, en_atencion y cerrado),
// mostrada como el flujo de la credencial: Se registró tu petición → En revisión → Atendida.
// El folio llega en la confirmación al enviar (con sesión) y en el aviso «Contacto recibido».
// TODO backend: GET /mis-solicitudes no incluye los mensajes de contacto; cuando los incluya,
// aquí se listan solos y ya no hace falta escribir el folio.
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { consultarContacto, type Seguimiento } from "../../../servicios/atencionComunidad";
import { mensajeError } from "../../../servicios/api";
import { Chip, EtapasTramite, type ColorChip } from "../credencial/piezas";
import { NOMBRE_ESTADO, esFolio, etapasContacto, type EstadoContacto } from "../contacto/seguimiento";
import { EncabezadoSeccion, EtiquetaPerfil, TarjetaPerfil } from "./piezas";
import { iconosSeccion } from "./iconos";
import { foliosDe, guardarFolio, olvidarFolio } from "./mensajesGuardados";
import { sesionSimulada, useSesion } from "./usarSesion";
import { ErrorServicio } from "../../../servicios/api";
import tarjetaEnviar from "../../../assets/perfil/tarjeta-enviar.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import "../credencial/CredencialSesion.css";

type Consulta =
    | { tipo: "inicio" }
    | { tipo: "cargando" }
    | { tipo: "error"; texto: string }
    | { tipo: "listo"; seguimiento: Seguimiento };

const COLOR_ESTADO: Record<EstadoContacto, ColorChip> = { recibido: "gris", en_atencion: "dorado", cerrado: "verde" };

function fechaLarga(iso: string) {
    const fecha = new Date(iso);
    return Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

// Con la sesión de ejemplo (?simular=sesion, solo en desarrollo) se ven dos mensajes de ejemplo
const ejemplos: Seguimiento[] = [
    { id: "ejemplo-1", asunto: "Sugerencia: más horario en sábado (ejemplo)", estadoAtencion: "en_atencion", creadoEn: "2026-11-12T16:00:00Z" },
    { id: "ejemplo-2", asunto: "Duda sobre la credencial (ejemplo)", estadoAtencion: "cerrado", creadoEn: "2026-11-03T18:30:00Z", respuestaFinal: "Puedes tramitarla en línea y acudir al cotejo." },
];
type Guardados = { folio: string; seguimiento?: Seguimiento; error?: boolean }[];

export function MisMensajes() {
    const sesion = useSesion();
    const [guardados, setGuardados] = useState<Guardados | null>(sesionSimulada ? ejemplos.map((s) => ({ folio: s.id, seguimiento: s })) : null);
    const [parametros, setParametros] = useSearchParams();
    const folioUrl = parametros.get("folio") ?? "";
    const [folio, setFolio] = useState(folioUrl);
    const [consulta, setConsulta] = useState<Consulta>({ tipo: "inicio" });

    const consultar = useCallback(async (valor: string) => {
        if (!esFolio(valor)) { setConsulta({ tipo: "error", texto: "Escribe el folio completo que recibiste al enviar tu mensaje." }); return; }
        setConsulta({ tipo: "cargando" });
        try {
            const seguimiento = await consultarContacto(valor.trim());
            setConsulta({ tipo: "listo", seguimiento });
            if (sesion && sesion !== "simulado") guardarFolio(valor.trim(), sesion);
        }
        catch (e) { setConsulta({ tipo: "error", texto: mensajeError(e) }); }
    }, [sesion]);

    // Mensajes guardados en este navegador para esta cuenta: se consulta el estado de cada uno
    useEffect(() => {
        if (sesionSimulada || !sesion) return;
        let vigente = true;
        const folios = foliosDe(sesion);
        Promise.all(folios.map((f): Promise<Guardados[number]> => consultarContacto(f)
            .then((seguimiento) => ({ folio: f, seguimiento }))
            .catch((e) => {
                if (e instanceof ErrorServicio && e.estado === 404) olvidarFolio(f, sesion); // ya no existe
                return { folio: f, error: !(e instanceof ErrorServicio && e.estado === 404) };
            })))
            .then((lista) => { if (vigente) setGuardados(lista.filter((x) => x.seguimiento || x.error)); });
        return () => { vigente = false; };
    }, [sesion]);

    // Al llegar desde la confirmación de Contacto (?folio=…) se consulta solo
    useEffect(() => {
        if (!esFolio(folioUrl)) return;
        let vigente = true;
        consultarContacto(folioUrl.trim())
            .then((seguimiento) => {
                if (!vigente) return;
                setConsulta({ tipo: "listo", seguimiento });
                if (sesion && sesion !== "simulado") guardarFolio(folioUrl.trim(), sesion);
            })
            .catch((e) => { if (vigente) setConsulta({ tipo: "error", texto: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [folioUrl, sesion]);

    // Un folio nuevo va a la dirección (y el efecto de arriba lo consulta); el mismo se vuelve a consultar aquí
    function enviar(e: FormEvent) {
        e.preventDefault();
        if (esFolio(folio) && folio.trim() !== folioUrl) {
            setConsulta({ tipo: "cargando" });
            setParametros({ folio: folio.trim() }, { replace: true });
        } else {
            void consultar(folio);
        }
    }

    return (
        <>
            <EncabezadoSeccion titulo="Mis mensajes" texto="Consulta en qué va un mensaje o sugerencia que enviaste a la biblioteca."
                accion={<Link to="/contacto" className="perfil-boton">Escribir a la biblioteca</Link>} />

            {!!guardados?.length && (
                <section className="perfil-panel perfil-panel--ajustado" aria-labelledby="titulo-mis-mensajes">
                    <EtiquetaPerfil id="titulo-mis-mensajes" icono={iconosSeccion.mensajes}>Mensajes que enviaste desde este navegador</EtiquetaPerfil>
                    <ul className="perfil-solicitudes">
                        {guardados.map(({ folio: f, seguimiento, error }) => {
                            const estado = seguimiento && (seguimiento.estadoAtencion in NOMBRE_ESTADO ? seguimiento.estadoAtencion : "recibido") as EstadoContacto;
                            const color = estado ? COLOR_ESTADO[estado] : "gris";
                            const abierto = consulta.tipo === "listo" && consulta.seguimiento.id === seguimiento?.id;
                            return (
                                <li key={f} className={`perfil-solicitud perfil-solicitud--${color}`}>
                                    <span className="perfil-lista__icono"><img src={iconosSeccion.mensajes} alt="" /></span>
                                    <div className="perfil-solicitud__textos">
                                        <strong>{seguimiento?.asunto ?? "Mensaje a la biblioteca"}</strong>
                                        <span>{error ? "No pudimos consultar su estado ahora." : `Enviado el ${fechaLarga(seguimiento!.creadoEn)} · folio ${f.slice(0, 8)}`}</span>
                                    </div>
                                    {estado && <Chip color={color}>{NOMBRE_ESTADO[estado]}</Chip>}
                                    <button type="button" className={`perfil-boton perfil-boton--chico${abierto ? "" : " perfil-boton--contorno"}`}
                                        onClick={() => seguimiento ? setConsulta({ tipo: "listo", seguimiento }) : void consultar(f)}>
                                        {abierto ? "Viendo" : "Ver seguimiento"}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <TarjetaPerfil color="blanca" icono={tarjetaLista} titulo={guardados?.length ? "¿Lo enviaste desde otro equipo?" : "Consultar un mensaje"}
                texto="Escribe el folio que recibiste al enviarlo. También lo encuentras en tus avisos («Contacto recibido»).">
                <form className="perfil-mensajes__buscar" onSubmit={enviar}>
                    <div className="perfil-campo">
                        <label htmlFor="folio-mensaje" className="perfil-campo__etiqueta--icono" style={{ "--icono": `url("${iconosSeccion.mensajes}")` } as CSSProperties}>Folio del mensaje</label>
                        <input id="folio-mensaje" value={folio} onChange={(e) => setFolio(e.target.value)} maxLength={36}
                            placeholder="Ej. 3f2a9c1e-…" autoComplete="off" spellCheck={false}
                            disabled={consulta.tipo === "cargando"} aria-invalid={consulta.tipo === "error" ? true : undefined} />
                    </div>
                    <button type="submit" className="perfil-boton" disabled={consulta.tipo === "cargando"}>
                        {consulta.tipo === "cargando" ? "Consultando…" : "Consultar"}
                    </button>
                </form>
                {consulta.tipo === "error" && <p className="perfil-campo__error" role="alert">{consulta.texto}</p>}
            </TarjetaPerfil>

            {consulta.tipo === "listo" && <ResultadoMensaje seguimiento={consulta.seguimiento} />}

            {/* Mientras no hay consulta: estado vacío importante del catálogo, con los pasos que sigue un mensaje */}
            {consulta.tipo !== "listo" && !guardados?.length && (
                <div className="perfil-vacio perfil-vacio--eventos perfil-vacio--panel">
                    <span className="perfil-vacio__insignia" aria-hidden="true" />
                    <p><strong>Sigue tu mensaje con su folio</strong>
                        Con tu sesión iniciada, el folio te llega al enviar el mensaje. Así avanza cada mensaje:</p>
                    <ul className="perfil-vacio__sugerencias" aria-label="Estados de un mensaje">
                        <li>Recibido</li><li>En revisión</li><li>Atendido</li>
                    </ul>
                </div>
            )}
        </>
    );
}

function ResultadoMensaje({ seguimiento }: { seguimiento: Seguimiento }) {
    const estado = (seguimiento.estadoAtencion in NOMBRE_ESTADO ? seguimiento.estadoAtencion : "recibido") as EstadoContacto;
    const fecha = fechaLarga(seguimiento.creadoEn);
    return (
        <TarjetaPerfil color="verde" icono={tarjetaEnviar} titulo={seguimiento.asunto}
            texto={fecha ? `Enviado el ${fecha}` : undefined}>
            <div className="perfil-mensajes__estado" role="status">
                <span>Estado:</span>
                <Chip color={COLOR_ESTADO[estado]}>{NOMBRE_ESTADO[estado]}</Chip>
            </div>
            <EtapasTramite etapas={etapasContacto(estado)} />
            {seguimiento.respuestaFinal && (
                <div className="perfil-mensajes__respuesta">
                    <strong>Respuesta de la biblioteca</strong>
                    <p>{seguimiento.respuestaFinal}</p>
                </div>
            )}
        </TarjetaPerfil>
    );
}
