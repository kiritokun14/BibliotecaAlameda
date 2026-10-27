import type { ReactNode } from "react";
import { Link } from "react-router";
import {
    AvisoResultado,
    Chip,
    Dato,
    EncabezadoPagina,
    Tarjeta,
    TarjetaHistorial,
    TarjetaResponsable,
    type EventoHistorial,
} from "../componentes";
import { actualizarSolicitud, type Area, type Estado, type Nota, type Resolucion } from "./datos";
import botonCheck from "../../../assets/admin/boton-check.svg";
import chipCheck from "../../../assets/admin/chip-check.svg";
import chipX from "../../../assets/admin/chip-x.svg";

// Lo que dice el encabezado (y el aviso de color) en cada estado
export type TextosEstado = Record<
    Estado,
    {
        etiqueta: string; // "POR COTEJAR"
        titulo: string;
        texto: string;
        aviso?: { tono: "exito" | "espera" | "error"; titulo: string; texto: string; chip: string };
    }
>;

type DetalleSolicitudProps = {
    area: Area;
    solicitud: { folio: string; estado: Estado; responsable: string; notas: Nota[] };
    textos: TextosEstado;
    prefijo: string; // "SOLICITUD" / "PROPUESTA"
    volver: { texto: string; ruta: string };
    historial: EventoHistorial[];
    principal: ReactNode; // columna ancha
    decision: ReactNode; // primera tarjeta de la columna angosta
};

function DetalleSolicitud({ area, solicitud, textos, prefijo, volver, historial, principal, decision }: DetalleSolicitudProps) {
    const texto = textos[solicitud.estado];

    return (
        <>
            <EncabezadoPagina
                volver={volver}
                etiqueta={`${prefijo} ${solicitud.folio} · ${texto.etiqueta}`}
                titulo={texto.titulo}
                texto={texto.texto}
            />

            {texto.aviso && <AvisoResultado {...texto.aviso} />}

            <div className="columnas">
                <div className="columna-principal">{principal}</div>
                <div className="columna-lateral">
                    {decision}
                    <TarjetaResponsable
                        responsable={solicitud.responsable}
                        notas={solicitud.notas}
                        alGuardarNota={(nota) =>
                            actualizarSolicitud(area, solicitud.folio, { notas: [...solicitud.notas, nota] })
                        }
                    />
                    <TarjetaHistorial eventos={historial} />
                </div>
            </div>
        </>
    );
}

// ---------- Tarjeta "Decisión" (cuando aún no se resuelve) ----------

type TarjetaDecisionProps = {
    titulo?: string;
    subtitulo: string;
    aprobar?: { texto: string; alPresionar: () => void };
    opciones?: ReactNode; // BotonOpcion normales
    peligro: ReactNode; // BotonOpcion rojo, va después de la línea divisoria
    nota: string;
};

export function TarjetaDecision({ titulo = "Decisión", subtitulo, aprobar, opciones, peligro, nota }: TarjetaDecisionProps) {
    return (
        <Tarjeta variante="decision" tonoIcono="dorado" titulo={titulo} subtitulo={subtitulo}>
            {aprobar && (
                <button type="button" className="boton-panel boton-panel--verde boton-panel--grande boton-panel--ancho" onClick={aprobar.alPresionar}>
                    {aprobar.texto}
                    <img src={botonCheck} alt="" />
                </button>
            )}
            <p className="decision__subtitulo">OTRAS OPCIONES</p>
            {opciones}
            <hr className="decision__divisor" />
            {peligro}
            <p className="decision__nota">{nota}</p>
        </Tarjeta>
    );
}

// ---------- Tarjeta "Resolución" (cuando ya se decidió) ----------

type TarjetaResolucionProps = {
    estado: Estado;
    resolucion?: Resolucion;
    rutaBandeja: string;
    extra?: ReactNode; // botón adicional abajo (p. ej. "Ver en Eventos")
};

export function TarjetaResolucion({ estado, resolucion, rutaBandeja, extra }: TarjetaResolucionProps) {
    const aprobada = estado === "aprobada";

    return (
        <Tarjeta variante="decision" tonoIcono="dorado" titulo="Resolución" subtitulo="Decisión ya tomada.">
            <div>
                <Chip tono={aprobada ? "verde" : "guinda"} icono={aprobada ? chipCheck : chipX}>
                    {aprobada ? "Aprobada" : resolucion?.cancelada ? "Cancelada" : "Rechazada"}
                </Chip>
            </div>
            <Dato etiqueta="DECIDIÓ" alto>
                Administrador
            </Dato>
            <Dato etiqueta="FECHA" alto>
                {resolucion?.fecha ?? "Hoy (ejemplo)"}
            </Dato>
            {resolucion?.motivo && (
                <Dato etiqueta="MOTIVO" alto>
                    {resolucion.motivo}
                </Dato>
            )}
            {resolucion?.condiciones && (
                <Dato etiqueta="CONDICIONES" alto>
                    {resolucion.condiciones}
                </Dato>
            )}
            {resolucion?.mensaje && (
                <div className="mensaje-enviado">
                    <p>MENSAJE ENVIADO A LA PERSONA</p>
                    <p>{resolucion.mensaje}</p>
                </div>
            )}
            <Link to={rutaBandeja} className="boton-panel boton-panel--oscuro boton-panel--ancho boton-panel--alto">
                Volver a la bandeja
            </Link>
            {extra}
        </Tarjeta>
    );
}

export default DetalleSolicitud;
