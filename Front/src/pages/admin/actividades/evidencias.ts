import { useSyncExternalStore } from "react";

// Evidencias privadas de actividades (fotos, listas firmadas, informes), SIMULADAS.
// TODO backend: GET/POST /actividades/evidencias (archivo a almacenamiento privado), GET .../:folio/descarga
// (URL firmada y registro en bitácora), PATCH .../:folio/acceso, DELETE .../:folio, POST .../:folio/solicitud-acceso.
// Nunca se publican en el portal.

export type TipoEvidencia = "Fotografía" | "Lista firmada" | "Informe";
export type Acceso = "personal" | "coordinacion";
export const NOMBRE_ACCESO: Record<Acceso, string> = { personal: "Solo personal autorizado", coordinacion: "Solo Coordinación y Administración" };
export const TIPOS_EVIDENCIA: TipoEvidencia[] = ["Fotografía", "Lista firmada", "Informe"];

export type Consulta = { fecha: string; persona: string; accion: string };

export type Evidencia = {
    folio: string; // EV-0061
    actividad: string; // AC-0098
    actividadTexto: string; // "Club de lectura · 27 oct"
    tipo: TipoEvidencia;
    archivo: string;
    tamano: number; // MB
    subio: string;
    fecha: string; // ISO
    acceso: Acceso;
    nota: string;
    consultas: Consulta[];
    retirada?: { motivo: string; fecha: string };
    solicitada?: boolean; // pidió acceso quien no puede verla
};

// En esta simulación, la cuenta es "personal autorizado": no abre lo restringido a Coordinación
export const PUEDE_VER_COORDINACION = false;
export const YO = "Tú (ejemplo)";

const iniciales: Evidencia[] = [
    { folio: "EV-0061", actividad: "AC-0098", actividadTexto: "Club de lectura · 27 oct", tipo: "Lista firmada", archivo: "lista-club-lectura.pdf", tamano: 1.2, subio: "Personal (ejemplo)", fecha: "2026-10-27T10:50:00", acceso: "personal", nota: "Lista firmada por las personas asistentes.", consultas: [{ fecha: "2026-10-27T10:50:00", persona: "Personal (ejemplo)", accion: "Subió el archivo" }, { fecha: "2026-10-27T12:05:00", persona: "Coordinación (ejemplo)", accion: "Consultó" }, { fecha: "2026-10-28T09:30:00", persona: "Administrador (ejemplo)", accion: "Descargó" }] },
    { folio: "EV-0060", actividad: "AC-0099", actividadTexto: "Taller de dibujo · 20 oct", tipo: "Fotografía", archivo: "taller-dibujo-01.jpg", tamano: 3.4, subio: "Personal (ejemplo)", fecha: "2026-10-20T18:10:00", acceso: "personal", nota: "Fotos sin rostros identificables (ejemplo).", consultas: [{ fecha: "2026-10-20T18:10:00", persona: "Personal (ejemplo)", accion: "Subió el archivo" }] },
    { folio: "EV-0059", actividad: "AC-0099", actividadTexto: "Taller de dibujo · 20 oct", tipo: "Lista firmada", archivo: "lista-taller-dibujo.pdf", tamano: 0.9, subio: "Personal (ejemplo)", fecha: "2026-10-20T18:00:00", acceso: "personal", nota: "", consultas: [{ fecha: "2026-10-20T18:00:00", persona: "Personal (ejemplo)", accion: "Subió el archivo" }] },
    { folio: "EV-0058", actividad: "AC-0104", actividadTexto: "Cuentacuentos de otoño · 24 oct", tipo: "Informe", archivo: "informe-cancelacion.pdf", tamano: 0.4, subio: "Coordinación (ejemplo)", fecha: "2026-10-24T13:00:00", acceso: "coordinacion", nota: "Informe de la cancelación.", consultas: [{ fecha: "2026-10-24T13:00:00", persona: "Coordinación (ejemplo)", accion: "Subió el archivo" }] },
    { folio: "EV-0057", actividad: "AC-0098", actividadTexto: "Club de lectura · 27 oct", tipo: "Fotografía", archivo: "club-lectura-01.jpg", tamano: 2.8, subio: "Personal (ejemplo)", fecha: "2026-10-27T10:55:00", acceso: "personal", nota: "", consultas: [{ fecha: "2026-10-27T10:55:00", persona: "Personal (ejemplo)", accion: "Subió el archivo" }] },
    { folio: "EV-0056", actividad: "AC-0099", actividadTexto: "Taller de dibujo · 20 oct", tipo: "Lista firmada", archivo: "lista-taller-dibujo-2.pdf", tamano: 0.7, subio: "Personal (ejemplo)", fecha: "2026-10-20T18:05:00", acceso: "coordinacion", nota: "Incluye datos de menores.", consultas: [{ fecha: "2026-10-20T18:05:00", persona: "Personal (ejemplo)", accion: "Subió el archivo" }] },
];

let lista: Evidencia[] = iniciales;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function useEvidencias(): Evidencia[] {
    return useSyncExternalStore(
        (o) => {
            oyentes.add(o);
            return () => {
                oyentes.delete(o);
            };
        },
        () => lista,
    );
}

export function reiniciarEvidencias() {
    lista = iniciales;
    avisar();
}

export const obtenerEvidencia = (folio: string | undefined) => lista.find((e) => e.folio === folio);
export const puedeVer = (e: Evidencia) => e.acceso === "personal" || PUEDE_VER_COORDINACION;

function actualizar(folio: string, cambios: Partial<Evidencia>) {
    lista = lista.map((e) => (e.folio === folio ? { ...e, ...cambios } : e));
    avisar();
}

const registro = (accion: string): Consulta => ({ fecha: new Date().toISOString(), persona: YO, accion });

// Solo PDF, JPG o PNG de hasta 10 MB
export function revisarArchivo(a: { name: string; size: number; type: string }) {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(a.type)) return "Solo se aceptan archivos PDF, JPG o PNG.";
    if (a.size > 10 * 1024 * 1024) return "El archivo pesa más de 10 MB. Reduce su tamaño o sube una versión comprimida.";
    return null;
}

export type DatosEvidencia = { actividad: string; actividadTexto: string; tipo: TipoEvidencia; archivo: string; tamano: number; nota: string; acceso: Acceso };

export function subirEvidencia(d: DatosEvidencia): string {
    if (!d.actividad || !d.archivo) throw new Error("Faltan la actividad o el archivo.");
    if (d.tamano > 10) throw new Error("El archivo pesa más de 10 MB.");
    const mayor = Math.max(0, ...lista.map((e) => Number(e.folio.replace(/\D/g, ""))));
    const folio = `EV-${String(mayor + 1).padStart(4, "0")}`;
    lista = [{ ...d, folio, subio: YO, fecha: new Date().toISOString(), nota: d.nota.trim(), consultas: [registro("Subió el archivo")] }, ...lista];
    avisar();
    return folio;
}

// Cada consulta o descarga queda registrada
export function registrarConsulta(folio: string, accion: "Consultó" | "Descargó") {
    const e = obtenerEvidencia(folio);
    if (!e || !puedeVer(e)) throw new Error("Sin permiso para abrir esta evidencia.");
    actualizar(folio, { consultas: [...e.consultas, registro(accion)] });
}

export function cambiarAcceso(folio: string, acceso: Acceso) {
    const e = obtenerEvidencia(folio);
    if (!e) throw new Error("No existe la evidencia.");
    actualizar(folio, { acceso, consultas: [...e.consultas, registro(`Cambió el acceso a «${NOMBRE_ACCESO[acceso]}»`)] });
}

export function retirarEvidencia(folio: string, motivo: string) {
    const e = obtenerEvidencia(folio);
    if (!e || e.retirada) throw new Error("La evidencia ya fue retirada.");
    if (!motivo.trim()) throw new Error("Escribe el motivo.");
    actualizar(folio, { retirada: { motivo: motivo.trim(), fecha: new Date().toISOString() }, consultas: [...e.consultas, registro("Retiró la evidencia")] });
}

export function pedirAcceso(folio: string) {
    const e = obtenerEvidencia(folio);
    if (!e) throw new Error("No existe la evidencia.");
    actualizar(folio, { solicitada: true });
}
