import type { ReactNode } from "react";
import tarjetaPersona from "../../../assets/admin/tarjeta-user.svg";
import { Link } from "react-router";
import {
    AvisoResultado,
    Chip,
    Dato,
    EncabezadoPagina,
    Migas,
    Tarjeta,
    TarjetaHistorial,
    TarjetaResponsable,
    type EventoHistorial,
} from "../componentes";
import { actualizarSolicitud, type Area, type Estado, type Nota, type Resolucion } from "./datos";

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
    alGuardarNota?: (nota: Nota) => void; // si no se da, la nota se guarda en los datos de ejemplo
    flujo?: ReactNode; // etapas del trámite (Flujo.tsx), debajo del encabezado
    persona?: ReactNode; // tarjeta «Persona solicitante» (TarjetaPersona), después de la decisión
};

// Nombre de cada área en las migas
const SECCION: Record<Area, string> = {
    credenciales: "Solicitudes de credencial",
    espacios: "Solicitudes de espacios",
    propuestas: "Propuestas de eventos",
};

function DetalleSolicitud({ area, solicitud, textos, prefijo, volver, historial, principal, decision, alGuardarNota, flujo, persona }: DetalleSolicitudProps) {
    const texto = textos[solicitud.estado];

    return (
        <>
            <Migas pasos={[[SECCION[area], volver.ruta], [solicitud.folio]]} />
            <EncabezadoPagina
                volver={volver}
                etiqueta={`${prefijo} ${solicitud.folio} · ${texto.etiqueta}`}
                titulo={texto.titulo}
                texto={texto.texto}
            />

            {flujo}
            {/* Con la barra de etapas, el aviso repetiría lo mismo que su «siguiente paso» */}
            {!flujo && texto.aviso && <AvisoResultado {...texto.aviso} />}

            <div className="contenidos-formulario">
                <div className="at-columna">{principal}</div>
                <aside className="contenidos-formulario__lateral tr-lateral tr-lateral--alto">
                    {decision}
                    {persona}
                    <TarjetaResponsable
                        responsable={solicitud.responsable}
                        notas={solicitud.notas}
                        alGuardarNota={alGuardarNota ?? ((nota) =>
                            actualizarSolicitud(area, solicitud.folio, { notas: [...solicitud.notas, nota] }))
                        }
                    />
                    <TarjetaHistorial eventos={historial} />
                </aside>
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
                <button type="button" className="contenidos-boton contenidos-boton--principal contenidos-boton--ancho" onClick={aprobar.alPresionar}>
                    {aprobar.texto}
                </button>
            )}
            <p className="at-subtitulo">Otras opciones</p>
            {opciones}
            <hr className="at-divisor" />
            {peligro}
            <p className="contenidos-nota">{nota}</p>
        </Tarjeta>
    );
}

// ---------- Tarjeta "Resolución" (cuando ya se decidió) ----------

type TarjetaResolucionProps = {
    estado: Estado;
    resolucion?: Resolucion;
    rutaBandeja: string;
    extra?: ReactNode; // botón adicional abajo (p. ej. "Ver en Eventos")
    decidio?: string; // quién decidió (si se conoce)
};

export function TarjetaResolucion({ estado, resolucion, rutaBandeja, extra, decidio = "Administrador" }: TarjetaResolucionProps) {
    const aprobada = estado === "aprobada";

    return (
        <Tarjeta variante="decision" tonoIcono="dorado" titulo="Resolución" subtitulo="Decisión ya tomada.">
            <p className="contenidos-estado-linea">
                <Chip tono={aprobada ? "verde" : "guinda"}>
                    {aprobada ? "Aprobada" : resolucion?.cancelada ? "Cancelada" : "Rechazada"}
                </Chip>
            </p>
            <Dato etiqueta="Decidió" alto>
                {decidio}
            </Dato>
            <Dato etiqueta="Fecha" alto>
                {resolucion?.fecha ?? "Hoy"}
            </Dato>
            {resolucion?.motivo && (
                <Dato etiqueta="Motivo" alto>
                    {resolucion.motivo}
                </Dato>
            )}
            {resolucion?.condiciones && (
                <Dato etiqueta="Condiciones" alto>
                    {resolucion.condiciones}
                </Dato>
            )}
            {resolucion?.mensaje && (
                <div className="at-nota">
                    <p className="at-nota__autor">Mensaje enviado a la persona</p>
                    <p>{resolucion.mensaje}</p>
                </div>
            )}
            <Link to={rutaBandeja} className="contenidos-boton contenidos-boton--oscuro contenidos-boton--ancho">
                Volver a la bandeja
            </Link>
            {extra}
        </Tarjeta>
    );
}

export default DetalleSolicitud;

// ---------- Tarjeta «Persona solicitante»: nombre, teléfono y correo (se pueden marcar o escribir) ----------
export function TarjetaPersona({ nombre, telefono, correo }: { nombre: string; telefono?: string | null; correo?: string | null }) {
    return (
        <Tarjeta icono={tarjetaPersona} titulo="Persona solicitante">
            <div className="at-persona">
                <span className="at-persona__inicial" aria-hidden="true">{nombre.charAt(0).toUpperCase()}</span>
                <div><small>Nombre</small><strong>{nombre}</strong></div>
            </div>
            {telefono && <a className="tr-telefono" href={`tel:${telefono}`}><span aria-hidden="true">☎</span><span><small>Teléfono</small><strong>{telefono}</strong></span></a>}
            {correo && <a className="tr-telefono" href={`mailto:${correo}`}><span aria-hidden="true">@</span><span><small>Correo</small><strong className="tr-correo">{correo}</strong></span></a>}
            {!telefono && !correo && <p className="contenidos-campo__ayuda">Sin datos de contacto.</p>}
        </Tarjeta>
    );
}
