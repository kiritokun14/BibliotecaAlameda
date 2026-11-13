// Convierte lo que devuelve el backend (Back/espacios.py, T-076) al formato que usan
// la bandeja y el detalle de Atención › Espacios.
import { diaLocal, horarioLocal, type EstadoSolicitudEspacio, type SolicitudEspacioPersonal } from "../../../../servicios/espacios";
import { formatearFecha, type Estado, type Resolucion, type SolicitudEspacio } from "../datos";

export type SolicitudEspacioReal = SolicitudEspacio & { api: SolicitudEspacioPersonal };

const ESTADO: Record<EstadoSolicitudEspacio, Estado> = {
    en_revision: "pendiente",
    requiere_correccion: "observaciones",
    aprobada: "aprobada",
    rechazada: "rechazada",
    cancelada: "rechazada", // con resolucion.cancelada
};

// Lo vigente: lo acordado (si la persona aceptó un cambio o ya se aprobó) o lo que pidió
export function vigente(s: SolicitudEspacioPersonal) {
    return s.acuerdo ?? { espacio: s.espacio, inicio: s.inicio, fin: s.fin, condiciones: null };
}

function ultima(s: SolicitudEspacioPersonal, accion: string) {
    return [...(s.historial ?? [])].reverse().find((h) => h.accion === accion);
}

function resolucion(s: SolicitudEspacioPersonal): Resolucion | undefined {
    const fecha = (iso: string | null | undefined) => (iso ? formatearFecha(diaLocal(iso)) : "Por confirmar");
    switch (s.estado) {
        case "aprobada":
            return { fecha: fecha(s.resueltaEn), condiciones: s.acuerdo?.condiciones ?? undefined, mensaje: ultima(s, "aprobacion")?.nota ?? undefined };
        case "rechazada":
            return { fecha: fecha(s.resueltaEn), motivo: String(ultima(s, "rechazo")?.detalles?.motivo ?? "") || undefined, mensaje: s.observaciones ?? undefined };
        case "cancelada":
            return { fecha: fecha(s.canceladaEn), motivo: s.motivoCancelacion ?? undefined, mensaje: s.observaciones ?? undefined, cancelada: true };
        case "requiere_correccion":
            return { fecha: fecha(s.actualizadoEn), mensaje: s.propuesta?.mensaje ?? undefined };
        default:
            return undefined;
    }
}

export function aSolicitudAdmin(s: SolicitudEspacioPersonal): SolicitudEspacioReal {
    const v = vigente(s);
    const contacto = [s.solicitante.correo, s.solicitante.telefono].filter(Boolean).join(" · ");
    return {
        api: s,
        folio: s.folio,
        persona: s.solicitante.nombre || "Sin nombre",
        enviada: diaLocal(s.creadaEn),
        estado: ESTADO[s.estado],
        cotejo: [],
        notas: [],
        responsable: s.autorizadoPor ?? "Sin asignar",
        resolucion: resolucion(s),
        area: v.espacio?.nombre ?? (s.tipo === "visita" ? "Visita (sin área)" : "Por confirmar"),
        fecha: diaLocal(v.inicio),
        horario: horarioLocal(v.inicio, v.fin),
        personas: s.personas,
        motivo: s.motivo,
        contacto: contacto || "Sin datos de contacto",
    };
}
