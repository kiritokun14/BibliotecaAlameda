import { useSyncExternalStore } from "react";

// Salas y bloqueos SIMULADOS (Calendario y salas). Se reinician al recargar.
// TODO backend: GET/PATCH /espacios y GET/POST/PATCH/DELETE /bloqueos

export type Sala = {
    id: string; // "auditorio"
    nombre: string;
    capacidad: number;
    equipo: string;
    accesibilidad: string;
    ubicacion: string;
    abre: string; // "09:00"
    cierra: string;
    dias: string; // "Lun a sáb"
    habilitada: boolean;
};

export type Bloqueo = {
    id: string; // BL-0003
    sala: string; // nombre de la sala
    fecha: string; // YYYY-MM-DD
    desde: string; // "" = todo el día
    hasta: string;
    motivo: string;
};

export type DatosBloqueo = Omit<Bloqueo, "id">;

// Fechas relativas a hoy para que los ejemplos tengan sentido cualquier día
export function isoLocal(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function hoyISO() {
    return isoLocal(new Date());
}
function enDias(n: number) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return isoLocal(d);
}

const salasIniciales: Sala[] = [
    { id: "sala-infantil", nombre: "Sala infantil", capacidad: 25, equipo: "Tapetes, pizarrón", accesibilidad: "Acceso a nivel de calle", ubicacion: "Planta baja", abre: "09:00", cierra: "19:00", dias: "Lun a sáb", habilitada: true },
    { id: "sala-de-lectura", nombre: "Sala de lectura", capacidad: 30, equipo: "Mesas, proyector", accesibilidad: "Elevador", ubicacion: "Primer piso", abre: "09:00", cierra: "19:00", dias: "Lun a sáb", habilitada: true },
    { id: "auditorio", nombre: "Auditorio", capacidad: 60, equipo: "Sonido, proyector, 60 sillas", accesibilidad: "Rampa y lugares reservados", ubicacion: "Planta baja", abre: "09:00", cierra: "19:00", dias: "Lun a sáb", habilitada: true },
    { id: "sala-de-computo", nombre: "Sala de cómputo", capacidad: 16, equipo: "16 equipos", accesibilidad: "Elevador", ubicacion: "Primer piso", abre: "09:00", cierra: "18:00", dias: "Lun a vie", habilitada: true },
    { id: "sala-b", nombre: "Sala B", capacidad: 12, equipo: "Mesas", accesibilidad: "Escaleras (sin elevador)", ubicacion: "Segundo piso", abre: "09:00", cierra: "17:00", dias: "Lun a vie", habilitada: true },
];

const bloqueosIniciales: Bloqueo[] = [
    { id: "BL-0001", sala: "Sala B", fecha: hoyISO(), desde: "", hasta: "", motivo: "Mantenimiento de mobiliario (ejemplo)" },
    { id: "BL-0002", sala: "Auditorio", fecha: hoyISO(), desde: "11:00", hasta: "15:00", motivo: "Mantenimiento de sonido (ejemplo)" },
    { id: "BL-0003", sala: "Auditorio", fecha: enDias(7), desde: "", hasta: "", motivo: "Evento institucional (ejemplo)" },
];

type Estado = { salas: Sala[]; bloqueos: Bloqueo[] };
let estado: Estado = { salas: salasIniciales, bloqueos: bloqueosIniciales };
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function useSalas(): Estado {
    return useSyncExternalStore(
        (o) => {
            oyentes.add(o);
            return () => {
                oyentes.delete(o);
            };
        },
        () => estado,
    );
}

export function leerSalas() {
    return estado;
}

export function reiniciarSalas() {
    estado = { salas: salasIniciales, bloqueos: bloqueosIniciales };
    avisar();
}

export function obtenerSala(id: string | undefined) {
    return estado.salas.find((s) => s.id === id || s.nombre === id);
}

export function obtenerBloqueo(id: string | undefined) {
    return estado.bloqueos.find((b) => b.id === id);
}

export function actualizarSala(id: string, cambios: Partial<Sala>) {
    estado = { ...estado, salas: estado.salas.map((s) => (s.id === id ? { ...s, ...cambios } : s)) };
    avisar();
}

// En desarrollo: ?simular=error-bloqueo hace fallar el guardado
function simulacion(): string | null {
    if (!import.meta.env.DEV || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("simular");
}

// TODO backend: POST /bloqueos o PATCH /bloqueos/:id
export async function guardarBloqueo(datos: DatosBloqueo, id?: string): Promise<string> {
    await new Promise((r) => setTimeout(r, 300));
    if (simulacion() === "error-bloqueo") throw new Error("No se pudo guardar");
    if (id) {
        estado = { ...estado, bloqueos: estado.bloqueos.map((b) => (b.id === id ? { ...datos, id } : b)) };
        avisar();
        return id;
    }
    const mayor = Math.max(0, ...estado.bloqueos.map((b) => Number(b.id.replace(/\D/g, ""))));
    const nuevo = `BL-${String(mayor + 1).padStart(4, "0")}`;
    estado = { ...estado, bloqueos: [...estado.bloqueos, { ...datos, id: nuevo }] };
    avisar();
    return nuevo;
}

// TODO backend: DELETE /bloqueos/:id
export function quitarBloqueo(id: string) {
    estado = { ...estado, bloqueos: estado.bloqueos.filter((b) => b.id !== id) };
    avisar();
}

export function validarBloqueo(d: DatosBloqueo): Partial<Record<keyof DatosBloqueo, string>> {
    const e: Partial<Record<keyof DatosBloqueo, string>> = {};
    if (!d.sala) e.sala = "Elige la sala.";
    if (!d.fecha) e.fecha = "Elige la fecha.";
    if (d.desde || d.hasta) {
        if (!d.desde) e.desde = "Elige la hora de inicio.";
        if (!d.hasta) e.hasta = "Elige la hora de fin.";
        else if (d.desde && d.hasta <= d.desde) e.hasta = "La hora de fin debe ser posterior al inicio.";
    }
    if (!d.motivo.trim()) e.motivo = "Escribe el motivo del bloqueo.";
    return e;
}

export function horarioBloqueo(b: Pick<Bloqueo, "desde" | "hasta">) {
    return b.desde ? `${b.desde} a ${b.hasta}` : "Todo el día";
}
