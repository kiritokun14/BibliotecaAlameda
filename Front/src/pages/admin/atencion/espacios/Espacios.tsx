import PanelLayout from "../../PanelLayout";
import Bandeja, { CeldaDoble, type Columna, type ConfigArea } from "../Bandeja";
import { formatearFecha, useSolicitudes, type SolicitudEspacio } from "../datos";
import resumenCalendario from "../../../../assets/admin/resumen-calendar.svg";
import resumenReloj from "../../../../assets/admin/resumen-clock.svg";

const configEspacios: ConfigArea = {
    ruta: "/admin/atencion/espacios",
    titulo: "Solicitudes de espacios",
    tituloTodas: "Todas las solicitudes de espacios",
    descripcion:
        "Revisa la disponibilidad de las áreas y decide cada solicitud. Una solicitud no es una reserva hasta que se aprueba. Datos de ejemplo.",
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
};

const columnas: Columna<SolicitudEspacio>[] = [
    { titulo: "PERSONA SOLICITANTE", celda: (s) => <CeldaDoble arriba={s.persona} abajo="(ejemplo)" /> },
    { titulo: "ÁREA", ancho: 230, celda: (s) => s.area },
    {
        titulo: "FECHA Y HORARIO",
        ancho: 190,
        celda: (s) => <CeldaDoble arriba={formatearFecha(s.fecha)} abajo={s.horario || "Horario por confirmar"} />,
    },
    { titulo: "PERSONAS", ancho: 100, celda: (s) => s.personas },
];

function Espacios({ vista }: { vista: "bandeja" | "todas" }) {
    const solicitudes = useSolicitudes("espacios");

    return (
        <PanelLayout titulo="Atención">
            <Bandeja
                vista={vista}
                config={configEspacios}
                solicitudes={solicitudes}
                columnas={columnas}
                coincide={(s, texto) => s.folio.toLowerCase().includes(texto) || s.persona.toLowerCase().includes(texto)}
            />
        </PanelLayout>
    );
}

export default Espacios;
