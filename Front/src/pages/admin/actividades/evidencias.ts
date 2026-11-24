// Evidencias privadas de actividades (fotos, listas firmadas, informes), conectadas a la API real
// (servicios/evidencias.ts → Back/evidencias.py). Nunca se publican en el portal.
import type { AccesoEvidencia, AccionEvidencia, EvidenciaDetalle, EvidenciaResumen, TipoEvidenciaApi } from "../../../servicios/evidencias";
import { diaLocal, horaLocal } from "../../../servicios/espacios";
import { fechaCorta } from "./datos";

export type TipoEvidencia = "Fotografía" | "Lista firmada" | "Informe";
export type Acceso = AccesoEvidencia;
export const NOMBRE_ACCESO: Record<Acceso, string> = { personal: "Solo personal autorizado", coordinacion: "Solo Coordinación y Administración" };
export const TIPOS_EVIDENCIA: TipoEvidencia[] = ["Fotografía", "Lista firmada", "Informe"];
export const TIPO_API: Record<TipoEvidencia, TipoEvidenciaApi> = { "Fotografía": "fotografia", "Lista firmada": "lista_firmada", Informe: "informe" };
export const NOMBRE_TIPO: Record<TipoEvidenciaApi, TipoEvidencia> = { fotografia: "Fotografía", lista_firmada: "Lista firmada", informe: "Informe" };

export type Consulta = { fecha: string; persona: string; accion: string };

export type Evidencia = {
    folio: string; // EV-0001
    actividad: string; // AC-000016
    actividadTexto: string; // "Club de lectura · 27 oct"
    tipo: TipoEvidencia;
    subio: string;
    fecha: string; // ISO
    acceso: Acceso;
    puedeVer: boolean;
    retirada: boolean;
};

export type EvidenciaCompleta = Evidencia & {
    solicitada: boolean;
    archivo: string;
    tamano: number; // MB
    nota: string;
    consultas: Consulta[];
    retiro?: { motivo: string; fecha: string };
};

// "2026-10-27T16:00:00+00:00" → "27 oct 2026" en la hora de Tepic
export const fechaLocal = (iso: string) => fechaCorta(diaLocal(iso));
export const horaDe = (iso: string) => horaLocal(iso);
export const textoSesion = (titulo: string, inicio: string) => `${titulo} · ${fechaLocal(inicio).split(" ").slice(0, 2).join(" ")}`;

function textoAccion(accion: AccionEvidencia, detalle: Record<string, unknown> | null) {
    switch (accion) {
        case "subio": return "Subió el archivo";
        case "consulto": return "Consultó";
        case "descargo": return "Descargó";
        case "cambio_acceso": return `Cambió el acceso a «${NOMBRE_ACCESO[(detalle?.acceso as Acceso) ?? "personal"]}»`;
        case "retiro": return "Retiró la evidencia";
        case "solicito_acceso": return "Pidió acceso";
    }
}

export function aEvidencia(e: EvidenciaResumen): Evidencia {
    return {
        folio: e.folio, actividad: e.actividad ?? "", actividadTexto: textoSesion(e.titulo, e.sesionInicio), tipo: NOMBRE_TIPO[e.tipo],
        subio: e.subio, fecha: e.subidaEn, acceso: e.acceso, puedeVer: e.puedeVer, retirada: e.retirada,
    };
}

export function aEvidenciaCompleta(e: EvidenciaDetalle): EvidenciaCompleta {
    return {
        ...aEvidencia(e), solicitada: e.solicitada, archivo: e.nombreArchivo ?? "", tamano: Math.round(((e.tamanoBytes ?? 0) / (1024 * 1024)) * 10) / 10 || 0.1,
        nota: e.nota ?? "", consultas: (e.historial ?? []).map((h) => ({ fecha: h.fecha, persona: h.persona, accion: textoAccion(h.accion, h.detalle) })),
        retiro: e.retiro ? { motivo: e.retiro.motivo, fecha: e.retiro.fecha } : undefined,
    };
}

// Solo PDF, JPG o PNG de hasta 10 MB (el servidor lo vuelve a comprobar)
export function revisarArchivo(a: { name: string; size: number; type: string }) {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(a.type)) return "Solo se aceptan archivos PDF, JPG o PNG.";
    if (a.size > 10 * 1024 * 1024) return "El archivo pesa más de 10 MB. Reduce su tamaño o sube una versión comprimida.";
    if (a.size === 0) return "El archivo está vacío.";
    return null;
}

// ---------- Consultas con memoria ----------
// Al volver a Evidencias se muestra al instante lo último recibido y se actualiza en segundo plano.
// La memoria se borra sola al subir, cambiar el acceso o retirar (servicios/api.ts) y al cerrar sesión.
export const CLAVE_LISTA = "evidencias:lista";
export const CLAVE_SESIONES = "evidencias:sesiones";
export const claveEvidencia = (folio: string) => `evidencias:${folio}`;
