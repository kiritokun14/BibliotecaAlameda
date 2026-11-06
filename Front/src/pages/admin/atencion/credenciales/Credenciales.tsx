import PanelLayout from "../../PanelLayout";
import Bandeja, { CeldaDoble, type Columna, type ConfigArea } from "../Bandeja";
import { formatearFecha, useSolicitudes, type Credencial } from "../datos";
import resumenArchivo from "../../../../assets/admin/resumen-file.svg";
import resumenInfo from "../../../../assets/admin/resumen-info.svg";

const configCredenciales: ConfigArea = {
    ruta: "/admin/atencion/credenciales",
    titulo: "Solicitudes de credencial",
    tituloTodas: "Todas las solicitudes de credencial",
    descripcion:
        "Cotejo de los datos de registro de las personas que piden su credencial de la biblioteca. Cada solicitud tiene folio, estado y responsable. Datos de ejemplo.",
    etiquetaBloque: "Solicitudes",
    pregunta: "¿Cómo van las solicitudes de credencial?",
    sustantivo: "solicitudes",
    estados: {
        pendiente: "Por cotejar",
        observaciones: "Con observaciones",
        aprobada: "Aprobada",
        rechazada: "Rechazada",
    },
    filtroObservaciones: "Con observaciones",
    resumen: [
        { icono: resumenArchivo, detalle: "Esperan primera revisión", texto: (n) => `${n} por cotejar` },
        { icono: resumenInfo, detalle: "Esperan respuesta de la persona", texto: (n) => `${n} con observaciones` },
    ],
    periodoResueltas: "esta semana",
    buscarPor: "folio o nombre",
    accionPendiente: "Cotejar",
    notaBandeja: "Los estados y plazos de atención están por confirmar con la biblioteca.",
    textoVacio: "Cuando alguien solicite su credencial, aparecerá aquí.",
};

const columnas: Columna<Credencial>[] = [
    { titulo: "PERSONA SOLICITANTE", celda: (s) => <CeldaDoble arriba={s.persona} abajo="(ejemplo)" /> },
    { titulo: "TIPO DE CUENTA", ancho: 170, celda: (s) => s.tipoCuenta },
    { titulo: "ENVIADA", ancho: 150, celda: (s) => formatearFecha(s.enviada) },
];

function Credenciales({ vista }: { vista: "bandeja" | "todas" }) {
    const solicitudes = useSolicitudes("credenciales");

    return (
        <PanelLayout titulo="Atención">
            <Bandeja
                vista={vista}
                config={configCredenciales}
                solicitudes={solicitudes}
                columnas={columnas}
                coincide={(s, texto) => s.folio.toLowerCase().includes(texto) || s.persona.toLowerCase().includes(texto)}
            />
        </PanelLayout>
    );
}

export default Credenciales;
