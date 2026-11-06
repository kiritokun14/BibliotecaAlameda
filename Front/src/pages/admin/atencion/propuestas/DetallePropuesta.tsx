import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../../PanelLayout";
import { BotonOpcion, Chip, Dato, Datos, ListaCotejo, Tarjeta, type EventoHistorial } from "../../componentes";
import { VentanaFormulario } from "../../Ventana";
import DetalleSolicitud, { TarjetaDecision, TarjetaResolucion, type TextosEstado } from "../Detalle";
import { actualizarSolicitud, formatearFecha, useSolicitudes, type Propuesta } from "../datos";
import { fechaPropuesta } from "./fechaPropuesta";
import tarjetaEstrella from "../../../../assets/admin/tarjeta-star.svg";
import tarjetaInfo from "../../../../assets/admin/tarjeta-info.svg";
import tarjetaCheck from "../../../../assets/admin/tarjeta-check.svg";
import tarjetaCalendario from "../../../../assets/admin/tarjeta-calendar.svg";
import chipCheck from "../../../../assets/admin/chip-check.svg";
import chipInfo from "../../../../assets/admin/chip-info.svg";
import opcionInfo from "../../../../assets/admin/opcion-info.svg";
import opcionBuscar from "../../../../assets/admin/opcion-search.svg";
import opcionX from "../../../../assets/admin/opcion-x.svg";
import modalInfo from "../../../../assets/admin/modal-info.svg";
import modalAlerta from "../../../../assets/admin/modal-alert.svg";

const RUTA = "/admin/atencion/propuestas";

const textos: TextosEstado = {
    pendiente: {
        etiqueta: "POR REVISAR",
        titulo: "Revisión de la propuesta",
        texto: "Evalúa espacio, fechas y material, y decide si se aprueba, se piden cambios o se rechaza. Datos de ejemplo.",
    },
    observaciones: {
        etiqueta: "CON OBSERVACIONES",
        titulo: "Esperando respuesta de la persona",
        texto: "Dejaste observaciones. Cuando la persona corrija y reenvíe, la propuesta vuelve a Por revisar. Datos de ejemplo.",
        aviso: {
            tono: "espera",
            titulo: "Observaciones enviadas",
            texto: "La persona recibió tu mensaje en sus notificaciones.",
            chip: "Esperando respuesta",
        },
    },
    aprobada: {
        etiqueta: "APROBADA",
        titulo: "Propuesta aprobada y publicada",
        texto: "La propuesta ya aparece en Eventos. Aquí puedes consultar sus datos y el historial. Datos de ejemplo.",
        aviso: {
            tono: "exito",
            titulo: "Propuesta aprobada",
            texto: "Ya aparece en Eventos y la persona fue notificada.",
            chip: "Publicada",
        },
    },
    rechazada: {
        etiqueta: "RECHAZADA",
        titulo: "Propuesta rechazada",
        texto: "La propuesta no se aprobó. Aquí puedes consultar el motivo y el historial. Datos de ejemplo.",
        aviso: {
            tono: "error",
            titulo: "Propuesta rechazada",
            texto: "La persona ya recibió el motivo en sus notificaciones.",
            chip: "Rechazada",
        },
    },
};

const AREAS = [
    "Área de usos múltiples (por confirmar)",
    "Sala de lectura (por confirmar)",
    "Sala infantil (por confirmar)",
];

function historial(propuesta: Propuesta): EventoHistorial[] {
    const enviada: EventoHistorial = {
        titulo: "Propuesta enviada",
        detalle: `${formatearFecha(propuesta.enviada)} · por la persona`,
        tipo: "hecho",
    };
    const fecha = propuesta.resolucion?.fecha ?? "Hoy";

    switch (propuesta.estado) {
        case "pendiente":
            return [
                enviada,
                { titulo: "En revisión por el personal", detalle: "19 oct 2026", tipo: "proceso" },
                { titulo: "Sin decisión todavía", detalle: "En espera", tipo: "pendiente" },
            ];
        case "observaciones":
            return [
                enviada,
                { titulo: "Observaciones enviadas", detalle: `${fecha} · mensaje enviado`, tipo: "proceso" },
                { titulo: "Respuesta de la persona", detalle: "En espera", tipo: "pendiente" },
            ];
        default:
            return [
                enviada,
                { titulo: "Revisión del personal", detalle: "19 oct 2026", tipo: "proceso" },
                {
                    titulo: propuesta.estado === "aprobada" ? "Aprobada y publicada" : "Propuesta rechazada",
                    detalle: `${fecha} · por el administrador (ejemplo)`,
                    tipo: "pendiente",
                },
            ];
    }
}

type VentanaAbierta = "observaciones" | "sugerir" | "rechazar" | null;

function DetallePropuesta() {
    const { folio } = useParams();
    const navigate = useNavigate();
    const propuestas = useSolicitudes("propuestas");
    const propuesta = propuestas.find((p) => p.folio === folio);
    const [ventana, setVentana] = useState<VentanaAbierta>(null);

    if (!propuesta) return <Navigate to={RUTA} replace />;

    const { estado } = propuesta;
    const resuelta = estado === "aprobada" || estado === "rechazada";

    function decidir(cambios: Partial<Propuesta>) {
        actualizarSolicitud("propuestas", propuesta!.folio, cambios);
        setVentana(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function marcar(indice: number) {
        const cotejo = propuesta!.cotejo.map((valor, i) => (i === indice ? !valor : valor));
        actualizarSolicitud("propuestas", propuesta!.folio, { cotejo });
    }

    const puntosRevision = [
        { titulo: "La idea es adecuada para la biblioteca" },
        { titulo: "El espacio sugerido está disponible", detalle: "Consulta la agenda de espacios." },
        {
            titulo: "Hay fecha y horario definidos",
            detalle: propuesta.fecha ? "Fecha y horario indicados." : "Falta indicar fecha y horario.",
            alerta: !propuesta.fecha,
        },
        { titulo: "El material solicitado se puede proveer" },
    ];

    const principal = (
        <>
            <Tarjeta icono={tarjetaEstrella} titulo={propuesta.titulo} subtitulo="Propuesta enviada por la persona usuaria.">
                <Datos>
                    <Dato etiqueta="TIPO DE PROPUESTA">
                        {propuesta.tipo === "Evento" ? "Evento (actividad puntual)" : "Club (actividad recurrente)"}
                    </Dato>
                    <Dato etiqueta="PÚBLICO">{propuesta.publico}</Dato>
                    <Dato etiqueta="PARTICIPANTES ESTIMADOS">{propuesta.participantes}</Dato>
                    <Dato etiqueta="FECHA PROPUESTA">{fechaPropuesta(propuesta)}</Dato>
                    <Dato etiqueta="HORARIO PROPUESTO">{propuesta.horario || "Por confirmar"}</Dato>
                    <Dato etiqueta="ESPACIO SUGERIDO">{propuesta.espacio}</Dato>
                    <Dato etiqueta="MATERIAL">{propuesta.material}</Dato>
                    <Dato etiqueta="RESPONSABLE">{propuesta.persona} (ejemplo)</Dato>
                    <Dato etiqueta="CONTACTO">{propuesta.contacto}</Dato>
                </Datos>
            </Tarjeta>

            <Tarjeta icono={tarjetaInfo} tonoIcono="dorado" titulo="Descripción de la idea" subtitulo="Tal como la escribió la persona.">
                <p className="texto-tarjeta texto-tarjeta--grande">{propuesta.descripcion}</p>
            </Tarjeta>

            <Tarjeta icono={tarjetaCheck} titulo="Lista de revisión" subtitulo="Los criterios están por confirmar con la biblioteca.">
                <ListaCotejo puntos={puntosRevision} marcados={propuesta.cotejo} alCambiar={resuelta ? undefined : marcar} />
            </Tarjeta>

            <Tarjeta
                icono={tarjetaCalendario}
                tonoIcono="dorado"
                titulo="Agenda del espacio sugerido"
                subtitulo="Para detectar choques antes de aprobar."
            >
                <p className="texto-tarjeta">
                    {propuesta.fecha
                        ? `El ${formatearFecha(propuesta.fecha)} el espacio sugerido no tiene otras actividades registradas (ejemplo).`
                        : "Cuando la propuesta tenga fecha y horario, aquí se mostrará si el espacio ya está ocupado."}
                </p>
                <div className="fila-agenda">
                    {propuesta.fecha ? (
                        <Chip tono="verde" icono={chipCheck}>
                            Sin choques con la agenda
                        </Chip>
                    ) : (
                        <Chip tono="dorado" icono={chipInfo}>
                            Sin fecha para comparar
                        </Chip>
                    )}
                    {/* TODO: pantalla de agenda completa de espacios */}
                    <button type="button" className="boton-panel boton-panel--oscuro boton-panel--mediano-alto">
                        Ver agenda completa de espacios
                    </button>
                </div>
            </Tarjeta>
        </>
    );

    const decision = resuelta ? (
        <TarjetaResolucion
            estado={estado}
            resolucion={propuesta.resolucion}
            rutaBandeja={RUTA}
            extra={
                estado === "aprobada" && (
                    <Link to="/eventos" className="boton-panel boton-panel--guinda boton-panel--ancho boton-panel--alto">
                        Ver en Eventos
                    </Link>
                )
            }
        />
    ) : (
        <TarjetaDecision
            subtitulo="Elige una acción para esta propuesta."
            aprobar={{ texto: "Aprobar y publicar", alPresionar: () => navigate(`${RUTA}/${propuesta.folio}/publicar`) }}
            opciones={
                <>
                    <BotonOpcion icono={opcionInfo} alPresionar={() => setVentana("observaciones")}>
                        Dejar observaciones
                    </BotonOpcion>
                    <BotonOpcion icono={opcionBuscar} alPresionar={() => setVentana("sugerir")}>
                        Sugerir otro espacio o fecha
                    </BotonOpcion>
                </>
            }
            peligro={
                <BotonOpcion icono={opcionX} peligro alPresionar={() => setVentana("rechazar")}>
                    Rechazar propuesta
                </BotonOpcion>
            }
            nota="Antes de publicar verás una vista previa. La persona recibe el resultado en sus notificaciones."
        />
    );

    const cerrar = () => setVentana(null);

    return (
        <PanelLayout titulo="Atención">
            <DetalleSolicitud
                area="propuestas"
                solicitud={propuesta}
                textos={textos}
                prefijo="PROPUESTA"
                volver={{ texto: "Volver a propuestas de eventos", ruta: RUTA }}
                historial={historial(propuesta)}
                principal={principal}
                decision={decision}
            />

            {ventana === "observaciones" && (
                <VentanaFormulario
                    tono="dorado"
                    icono={modalInfo}
                    titulo="Dejar observaciones"
                    texto="La persona recibirá tus observaciones y podrá corregir y reenviar su propuesta."
                    textoConfirmar="Enviar observaciones"
                    campos={[
                        {
                            nombre: "motivo",
                            etiqueta: "¿Qué debe corregir?",
                            tipo: "select",
                            obligatorio: true,
                            placeholder: "Selecciona un punto",
                            opciones: ["Fecha y horario", "Espacio sugerido", "Material solicitado", "Descripción de la idea", "Otro punto"],
                        },
                        {
                            nombre: "mensaje",
                            etiqueta: "Observaciones para la persona",
                            obligatorio: true,
                            placeholder: "Indica el cambio que se necesita",
                        },
                    ]}
                    alConfirmar={(valores) => decidir({ estado: "observaciones", resolucion: { fecha: "Hoy", ...valores } })}
                    alCerrar={cerrar}
                />
            )}

            {ventana === "sugerir" && (
                <VentanaFormulario
                    tono="dorado"
                    icono={modalInfo}
                    titulo="Sugerir otro espacio o fecha"
                    texto="La persona recibirá tu sugerencia y podrá corregir y reenviar su propuesta."
                    textoConfirmar="Enviar sugerencia"
                    campos={[
                        { nombre: "espacio", etiqueta: "Espacio sugerido", tipo: "select", placeholder: "Selecciona un área", opciones: AREAS },
                        { nombre: "fecha", etiqueta: "Fecha sugerida", tipo: "fecha", mitad: true },
                        { nombre: "horario", etiqueta: "Horario sugerido", placeholder: "00:00 a 00:00", mitad: true },
                        { nombre: "mensaje", etiqueta: "Mensaje para la persona", obligatorio: true, placeholder: "Explica el motivo de la sugerencia" },
                    ]}
                    preparados={["El espacio sugerido no está disponible", "Esa fecha ya está ocupada"]}
                    alConfirmar={(valores) =>
                        decidir({ estado: "observaciones", resolucion: { fecha: "Hoy", mensaje: valores.mensaje } })
                    }
                    alCerrar={cerrar}
                />
            )}

            {ventana === "rechazar" && (
                <VentanaFormulario
                    tono="guinda"
                    icono={modalAlerta}
                    titulo="Rechazar propuesta"
                    texto="La persona recibirá el motivo en sus notificaciones y podrá enviar una nueva propuesta."
                    textoConfirmar="Sí, rechazar propuesta"
                    campos={[
                        {
                            nombre: "motivo",
                            etiqueta: "Motivo del rechazo",
                            tipo: "select",
                            obligatorio: true,
                            placeholder: "Selecciona un motivo",
                            opciones: ["No es adecuada para la biblioteca", "Ya hay una actividad similar", "Falta información", "Otro motivo"],
                        },
                        {
                            nombre: "mensaje",
                            etiqueta: "Mensaje para la persona",
                            obligatorio: true,
                            placeholder: "Escribe una explicación breve y clara",
                        },
                    ]}
                    preparados={["No es adecuada para la biblioteca", "Ya hay una actividad similar"]}
                    alConfirmar={(valores) => decidir({ estado: "rechazada", resolucion: { fecha: "Hoy", ...valores } })}
                    alCerrar={cerrar}
                />
            )}
        </PanelLayout>
    );
}

export default DetallePropuesta;
