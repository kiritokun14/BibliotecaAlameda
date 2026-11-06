import PanelLayout from "../../PanelLayout";
import Bandeja, { CeldaDoble, type Columna, type ConfigArea } from "../Bandeja";
import { useSolicitudes, type Propuesta } from "../datos";
import { fechaPropuesta } from "./fechaPropuesta";
import resumenEstrella from "../../../../assets/admin/resumen-star.svg";
import resumenInfo from "../../../../assets/admin/resumen-info.svg";

const configPropuestas: ConfigArea = {
    ruta: "/admin/atencion/propuestas",
    titulo: "Propuestas de eventos",
    tituloTodas: "Todas las propuestas de eventos",
    descripcion:
        "Revisa los eventos y clubes que propone la gente usuaria. Aprobar una propuesta la publica en Eventos. Datos de ejemplo.",
    etiquetaBloque: "Propuestas",
    pregunta: "¿Cómo van las propuestas de eventos?",
    sustantivo: "propuestas",
    estados: {
        pendiente: "Por revisar",
        observaciones: "Con observaciones",
        aprobada: "Aprobada",
        rechazada: "Rechazada",
    },
    filtroObservaciones: "Con observaciones",
    resumen: [
        { icono: resumenEstrella, detalle: "Aún sin primera revisión", texto: (n) => `${n} por revisar` },
        { icono: resumenInfo, detalle: "Esperan respuesta de la persona", texto: (n) => `${n} con observaciones` },
    ],
    periodoResueltas: "este mes",
    buscarPor: "folio o título",
    accionPendiente: "Revisar",
    notaBandeja: "Los criterios de revisión y los plazos están por confirmar con la biblioteca.",
    textoVacio: "Cuando alguien proponga un evento o club, aparecerá aquí.",
};

const columnas: Columna<Propuesta>[] = [
    { titulo: "PROPUESTA", celda: (p) => <CeldaDoble arriba={p.titulo} abajo={`${p.persona} (ejemplo)`} /> },
    { titulo: "TIPO", ancho: 120, celda: (p) => p.tipo },
    { titulo: "FECHA PROPUESTA", ancho: 170, celda: (p) => fechaPropuesta(p) },
    { titulo: "PARTICIPANTES", ancho: 130, celda: (p) => p.participantes },
];

function Propuestas({ vista }: { vista: "bandeja" | "todas" }) {
    const propuestas = useSolicitudes("propuestas");

    return (
        <PanelLayout titulo="Atención">
            <Bandeja
                vista={vista}
                config={configPropuestas}
                solicitudes={propuestas}
                columnas={columnas}
                coincide={(p, texto) => p.folio.toLowerCase().includes(texto) || p.titulo.toLowerCase().includes(texto)}
            />
        </PanelLayout>
    );
}

export default Propuestas;
