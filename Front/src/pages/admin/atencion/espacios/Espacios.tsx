// Panel › Atención › Espacios: bandeja y «todas» de las solicitudes de espacios.
// La tabla, filtros y resumen los dibuja Bandeja; aquí solo va la configuración de esta área.
// Las solicitudes vienen de GET /espacios/atencion/solicitudes (T-076).
import { useEffect, useState } from "react";
import PanelLayout from "../../PanelLayout";
import Bandeja, { CeldaDoble, type Columna, type ConfigArea } from "../Bandeja";
import { formatearFecha } from "../datos";
import { mensajeError } from "../../../../servicios/api";
import { bandejaEspacios } from "../../../../servicios/espacios";
import { aSolicitudAdmin, type SolicitudEspacioReal } from "./mapeo";
import resumenCalendario from "../../../../assets/admin/resumen-calendar.svg";
import resumenReloj from "../../../../assets/admin/resumen-clock.svg";

const configEspacios: ConfigArea = {
    ruta: "/admin/atencion/espacios",
    titulo: "Solicitudes de espacios",
    tituloTodas: "Todas las solicitudes de espacios",
    descripcion:
        "Revisa la disponibilidad de las áreas y decide cada solicitud. Una solicitud no es una reserva hasta que se aprueba.",
    etiquetaBloque: "Solicitudes",
    pregunta: "¿Cómo van las solicitudes de espacios?",
    sustantivo: "solicitudes",
    estados: {
        pendiente: "Por revisar",
        observaciones: "Cambio propuesto",
        aprobada: "Aprobada",
        rechazada: "Rechazada",
    },
    filtroObservaciones: "Con cambios propuestos",
    resumen: [
        { icono: resumenCalendario, detalle: "Falta verificar disponibilidad", texto: (n) => `${n} por revisar` },
        { icono: resumenReloj, detalle: "Esperan respuesta de la persona", texto: (n) => `${n} con cambios propuestos` },
    ],
    periodoResueltas: "este mes",
    buscarPor: "folio o nombre",
    accionPendiente: "Revisar",
    notaBandeja: "Las áreas, horarios y plazos de respuesta están por confirmar con la biblioteca.",
    textoVacio: "Cuando alguien pida un espacio de la biblioteca, aparecerá aquí.",
    ejemplo: false,
};

const columnas: Columna<SolicitudEspacioReal>[] = [
    { titulo: "PERSONA SOLICITANTE", celda: (s) => <CeldaDoble arriba={s.persona} abajo={s.api.tipo === "visita" ? "Visita guiada" : "Uso de un área"} /> },
    { titulo: "ÁREA", ancho: 230, celda: (s) => s.area },
    {
        titulo: "FECHA Y HORARIO",
        ancho: 190,
        celda: (s) => <CeldaDoble arriba={formatearFecha(s.fecha)} abajo={s.horario || "Horario por confirmar"} />,
    },
    { titulo: "PERSONAS", ancho: 100, celda: (s) => s.personas },
];

function Espacios({ vista }: { vista: "bandeja" | "todas" }) {
    const [carga, setCarga] = useState<{ solicitudes: SolicitudEspacioReal[] } | { error: string } | null>(null);
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        let vigente = true;
        bandejaEspacios()
            .then((datos) => { if (vigente) setCarga({ solicitudes: datos.solicitudes.map(aSolicitudAdmin) }); })
            .catch((e) => { if (vigente) setCarga({ error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [intento]);

    if (!carga || "error" in carga) {
        return (
            <PanelLayout titulo="Atención" tema="contenidos">
                {!carga ? <p role="status">Cargando solicitudes de espacios…</p> : (
                    <p role="alert">
                        {carga.error}{" "}
                        <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico"
                            onClick={() => { setCarga(null); setIntento((x) => x + 1); }}>Reintentar</button>
                    </p>
                )}
            </PanelLayout>
        );
    }

    return (
        <PanelLayout titulo="Atención" tema="contenidos">
            <Bandeja
                vista={vista}
                config={configEspacios}
                solicitudes={carga.solicitudes}
                columnas={columnas}
                coincide={(s, texto) => s.folio.toLowerCase().includes(texto) || s.persona.toLowerCase().includes(texto)}
            />
        </PanelLayout>
    );
}

export default Espacios;
