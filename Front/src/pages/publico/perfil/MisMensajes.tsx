// Mi perfil › Mis mensajes: seguimiento de lo que la persona escribió en Contacto y sugerencias.
// Consulta real: GET /v1/public/contacto/seguimiento/{folio} (estados recibido, en_atencion y cerrado),
// mostrada como el flujo de la credencial: Se registró tu petición → En revisión → Atendida.
// El folio llega en la confirmación al enviar (con sesión) y en el aviso «Contacto recibido».
// TODO backend: GET /mis-solicitudes no incluye los mensajes de contacto; cuando los incluya,
// aquí se listan solos y ya no hace falta escribir el folio.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { consultarContacto, type Seguimiento } from "../../../servicios/atencionComunidad";
import { mensajeError } from "../../../servicios/api";
import { Chip, EtapasTramite, type ColorChip } from "../credencial/piezas";
import { NOMBRE_ESTADO, esFolio, etapasContacto, type EstadoContacto } from "../contacto/seguimiento";
import { EncabezadoSeccion, TarjetaPerfil } from "./piezas";
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

export function MisMensajes() {
    const [parametros, setParametros] = useSearchParams();
    const folioUrl = parametros.get("folio") ?? "";
    const [folio, setFolio] = useState(folioUrl);
    const [consulta, setConsulta] = useState<Consulta>({ tipo: "inicio" });

    const consultar = useCallback(async (valor: string) => {
        if (!esFolio(valor)) { setConsulta({ tipo: "error", texto: "Escribe el folio completo que recibiste al enviar tu mensaje." }); return; }
        setConsulta({ tipo: "cargando" });
        try { setConsulta({ tipo: "listo", seguimiento: await consultarContacto(valor.trim()) }); }
        catch (e) { setConsulta({ tipo: "error", texto: mensajeError(e) }); }
    }, []);

    // Al llegar desde la confirmación de Contacto (?folio=…) se consulta solo
    useEffect(() => {
        if (!esFolio(folioUrl)) return;
        let vigente = true;
        consultarContacto(folioUrl.trim())
            .then((seguimiento) => { if (vigente) setConsulta({ tipo: "listo", seguimiento }); })
            .catch((e) => { if (vigente) setConsulta({ tipo: "error", texto: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [folioUrl]);

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
            <EncabezadoSeccion sobretitulo="MIS MENSAJES" titulo="Contacto y sugerencias"
                texto="Consulta en qué va un mensaje o sugerencia que enviaste a la biblioteca." />

            <TarjetaPerfil color="blanca" icono={tarjetaLista} titulo="Consultar un mensaje"
                texto="Escribe el folio que recibiste al enviarlo. También lo encuentras en tus avisos («Contacto recibido»).">
                <form className="perfil-mensajes__buscar" onSubmit={enviar}>
                    <div className="perfil-campo">
                        <label htmlFor="folio-mensaje">Folio del mensaje</label>
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

            <p className="perfil-nota">
                <span>
                    ¿Tienes otra duda? <Link to="/contacto">Escríbele a la biblioteca</Link>. Con tu sesión iniciada, el folio te llega
                    al enviar y puedes seguir tu mensaje desde aquí.
                </span>
            </p>
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
