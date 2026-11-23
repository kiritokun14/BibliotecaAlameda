// Datos del Resumen de Préstamos (22 nov 2026, T3): para la cuenta que atiende las solicitudes de credencial y el cotejo.
// Lo real de las solicitudes (servicios/tramites.ts, el mismo backend de Atención › Solicitudes de credencial) y los
// cotejos pendientes (participantes/cotejos.ts, todavía simulado: TODO backend ahí). Mismo patrón que datosServicios.ts.
import { useEffect, useState } from "react";
import { mensajeError } from "../../../servicios/api";
import { conteosTramites, estadoTramite, listarTramites, type SolicitudAtencion } from "../../../servicios/tramites";
import { enFiltroCotejo, textoResultado, useCotejos, type Cotejo } from "../participantes/cotejos";
import type { TonoEstado } from "./datos";

export type EstadoFuente = "cargando" | "listo" | "error" | "sin-permiso";
export type DatosPrestamos = {
    credenciales: { estado: EstadoFuente; abiertas: SolicitudAtencion[]; porEstado: Record<string, number>; error: string };
    cotejos: { estado: EstadoFuente; pendientes: Cotejo[] };
};

export const RUTA_SOLICITUDES = "/admin/atencion/credenciales";
export const RUTA_COTEJOS = "/admin/participantes/cotejo";
const ABIERTAS = ["recibida", "en_atencion", "cita_programada"];

export function usePrestamos(activo: boolean, veCredenciales: boolean, veCotejo: boolean): DatosPrestamos {
    const cotejos = useCotejos();
    const [credenciales, setCredenciales] = useState<DatosPrestamos["credenciales"]>({
        estado: veCredenciales ? "cargando" : "sin-permiso", abiertas: [], porEstado: {}, error: "",
    });
    useEffect(() => {
        if (!activo || !veCredenciales) return;
        let vigente = true;
        // Las cifras salen del conteo (las 50 más recientes); la lista, de la primera página de la bandeja
        Promise.all([conteosTramites("credencial"), listarTramites("credencial", false, 0, "", "")])
            .then(([conteo, lista]) => {
                if (vigente) setCredenciales({ estado: "listo", abiertas: lista.solicitudes.filter((s) => ABIERTAS.includes(estadoTramite(s))), porEstado: conteo.porEstado, error: "" });
            })
            .catch((e) => { if (vigente) setCredenciales((x) => ({ ...x, estado: "error", error: mensajeError(e) })); });
        return () => { vigente = false; };
    }, [activo, veCredenciales]);
    return {
        credenciales,
        cotejos: veCotejo ? { estado: "listo", pendientes: cotejos.filter((c) => enFiltroCotejo(c, "pendientes")) } : { estado: "sin-permiso", pendientes: [] },
    };
}

// Cuánto hay por atender (para el saludo, las cifras y los accesos rápidos)
export function cifrasPrestamos(d: DatosPrestamos) {
    const n = (e: string) => d.credenciales.porEstado[e] ?? 0;
    const diferencias = d.cotejos.pendientes.filter((c) => enFiltroCotejo(c, "diferencias")).length;
    return {
        porAtender: n("recibida"),
        enProceso: n("en_atencion") + n("cita_programada"),
        conCita: n("cita_programada"),
        porCotejar: d.cotejos.pendientes.length,
        diferencias,
        total: n("recibida") + n("en_atencion") + n("cita_programada") + d.cotejos.pendientes.length,
        // Lo que pide acción ya (las filas en guinda de «Por atender»): solicitudes sin revisar y cotejos que no coinciden
        urgentes: n("recibida") + d.cotejos.pendientes.filter((c) => textoResultado(c).tono === "guinda").length,
    };
}

export function estadoAccesoPrestamos(ruta: string, d: DatosPrestamos): { texto: string; tono: TonoEstado } | null {
    const c = cifrasPrestamos(d);
    if (ruta === RUTA_SOLICITUDES) {
        if (d.credenciales.estado === "cargando") return { texto: "Revisando…", tono: "gris" };
        if (d.credenciales.estado !== "listo") return { texto: "Sin conexión", tono: "gris" };
        if (c.porAtender) return { texto: `${c.porAtender} por atender`, tono: "guinda" };
        return c.enProceso ? { texto: `${c.enProceso} en proceso`, tono: "dorado" } : { texto: "Al día", tono: "verde" };
    }
    if (ruta === RUTA_COTEJOS) {
        if (d.cotejos.estado !== "listo") return null;
        if (c.diferencias) return { texto: `${c.diferencias} con diferencias`, tono: "guinda" };
        return c.porCotejar ? { texto: `${c.porCotejar} por cotejar`, tono: "dorado" } : { texto: "Al día", tono: "verde" };
    }
    return null;
}

export function textoPrestamos(d: DatosPrestamos) {
    const c = cifrasPrestamos(d);
    if (d.credenciales.estado === "cargando") return "Revisando las solicitudes y los cotejos…";
    if (c.total === 0) return "Estás al día: no hay solicitudes ni cotejos esperando.";
    const partes = [
        c.porAtender ? `${c.porAtender} ${c.porAtender === 1 ? "solicitud por atender" : "solicitudes por atender"}` : "",
        c.conCita ? `${c.conCita} ${c.conCita === 1 ? "cita de cotejo" : "citas de cotejo"}` : "",
        c.porCotejar ? `${c.porCotejar} ${c.porCotejar === 1 ? "cuenta por cotejar" : "cuentas por cotejar"}` : "",
    ].filter(Boolean);
    return `Tienes ${partes.join(", ")}. Empieza por lo que lleva más tiempo esperando.`;
}
