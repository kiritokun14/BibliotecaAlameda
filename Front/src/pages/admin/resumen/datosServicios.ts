// Datos del Resumen de Servicios Digitales (22 nov 2026): lo real de Contactos (/v1/admin/contacto) y de Altas asistidas
// (/cuentas/alta-asistida) para la cuenta que los atiende. Las piezas que lo muestran están en servicios.tsx.
import { useEffect, useState } from "react";
import { ErrorServicio, mensajeError } from "../../../servicios/api";
import { listarCasos, type Caso } from "../../../servicios/atencionComunidad";
import { listarSolicitudes, type SolicitudAbierta } from "../../../servicios/altaAsistida";
import type { TonoEstado } from "./datos";

export type EstadoFuente = "cargando" | "listo" | "apagado" | "error" | "sin-permiso";
export type DatosServicios = {
    contactos: { estado: EstadoFuente; sinAtender: Caso[]; enAtencion: Caso[]; totalSinAtender: number; totalEnAtencion: number; error: string };
    altas: { estado: EstadoFuente; solicitudes: SolicitudAbierta[]; error: string };
};

export const RUTA_CONTACTOS = "/admin/atencion/contactos";
export const RUTA_ALTAS = "/admin/atencion/altas-asistidas";

export function useServicios(activo: boolean, veContactos: boolean, veAltas: boolean): DatosServicios {
    const [d, setD] = useState<DatosServicios>({
        contactos: { estado: veContactos ? "cargando" : "sin-permiso", sinAtender: [], enAtencion: [], totalSinAtender: 0, totalEnAtencion: 0, error: "" },
        altas: { estado: veAltas ? "cargando" : "sin-permiso", solicitudes: [], error: "" },
    });
    useEffect(() => {
        if (!activo) return;
        let vigente = true;
        if (veContactos) {
            Promise.all([listarCasos(false, "recibido", 1), listarCasos(false, "en_atencion", 1)])
                .then(([r, a]) => { if (vigente) setD((x) => ({ ...x, contactos: { estado: "listo", sinAtender: r.items, enAtencion: a.items, totalSinAtender: r.total, totalEnAtencion: a.total, error: "" } })); })
                .catch((e) => { if (vigente) setD((x) => ({ ...x, contactos: { ...x.contactos, estado: "error", error: mensajeError(e) } })); });
        }
        if (veAltas) {
            listarSolicitudes()
                .then((s) => { if (vigente) setD((x) => ({ ...x, altas: { estado: "listo", solicitudes: s, error: "" } })); })
                .catch((e) => {
                    if (!vigente) return;
                    const apagado = e instanceof ErrorServicio && e.estado === 503;
                    setD((x) => ({ ...x, altas: { ...x.altas, estado: apagado ? "apagado" : "error", error: mensajeError(e) } }));
                });
        }
        return () => { vigente = false; };
    }, [activo, veContactos, veAltas]);
    return d;
}

// Cuánto hay por atender (para el saludo y los accesos rápidos)
export function cifrasServicios(d: DatosServicios) {
    const altasRevision = d.altas.solicitudes.filter((s) => s.estado === "en_revision").length;
    return {
        sinAtender: d.contactos.totalSinAtender,
        enAtencion: d.contactos.totalEnAtencion,
        altasRevision,
        altasEsperando: d.altas.solicitudes.length - altasRevision,
        total: d.contactos.totalSinAtender + d.contactos.totalEnAtencion + altasRevision,
    };
}

export function estadoAccesoServicios(ruta: string, d: DatosServicios): { texto: string; tono: TonoEstado } | null {
    const c = cifrasServicios(d);
    if (ruta === RUTA_CONTACTOS) {
        if (d.contactos.estado === "cargando") return { texto: "Revisando…", tono: "gris" };
        if (d.contactos.estado !== "listo") return { texto: "Sin conexión", tono: "gris" };
        if (c.sinAtender) return { texto: `${c.sinAtender} sin atender`, tono: "guinda" };
        return c.enAtencion ? { texto: `${c.enAtencion} en atención`, tono: "dorado" } : { texto: "Al día", tono: "verde" };
    }
    if (ruta === RUTA_ALTAS) {
        if (d.altas.estado === "apagado") return { texto: "Sin habilitar", tono: "gris" };
        if (d.altas.estado === "cargando") return { texto: "Revisando…", tono: "gris" };
        if (d.altas.estado !== "listo") return { texto: "Sin conexión", tono: "gris" };
        if (c.altasRevision) return { texto: `${c.altasRevision} por decidir`, tono: "guinda" };
        return c.altasEsperando ? { texto: `${c.altasEsperando} esperan a la persona`, tono: "dorado" } : { texto: "Al día", tono: "verde" };
    }
    return null;
}

// Ninguna fuente respondió: no hay cifras que mostrar (ni «0» ni «Estás al día»)
export const sinDatosServicios = (d: DatosServicios) =>
    ![d.contactos.estado, d.altas.estado].some((e) => e === "listo" || e === "cargando");

export function textoServicios(d: DatosServicios) {
    const c = cifrasServicios(d);
    if (d.contactos.estado === "cargando" || d.altas.estado === "cargando") return "Revisando lo que tienes por atender…";
    if (sinDatosServicios(d)) return "No pudimos revisar tus pendientes: los servicios no respondieron.";
    if (c.total === 0) return "Estás al día: no hay mensajes ni altas esperando tu atención.";
    const partes = [
        c.sinAtender ? `${c.sinAtender} ${c.sinAtender === 1 ? "mensaje sin atender" : "mensajes sin atender"}` : "",
        c.enAtencion ? `${c.enAtencion} en atención` : "",
        c.altasRevision ? `${c.altasRevision} ${c.altasRevision === 1 ? "alta por decidir" : "altas por decidir"}` : "",
    ].filter(Boolean);
    return `Tienes ${partes.join(", ")}. Empieza por lo que lleva más tiempo esperando.`;
}
