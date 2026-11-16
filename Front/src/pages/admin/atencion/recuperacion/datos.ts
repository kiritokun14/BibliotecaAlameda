// Atención › Recuperación asistida (Figma 577:35507): ayudar a una persona que no puede entrar a su cuenta.
// El personal nunca ve ni escribe la contraseña: solo verifica la identidad y manda el enlace al correo de la cuenta.
// TODO backend: no hay endpoints para el personal. Se espera GET /recuperacion-asistida/buscar?texto=
// (cuenta con correo enmascarado y estado), POST /recuperacion-asistida/:id/enviar (registra quién
// verificó y envía el enlace al correo de la cuenta), POST .../fallida (registra el intento) y
// GET /recuperacion-asistida/historial. Mientras tanto, datos de ejemplo guardados en esta pestaña.
import { useSyncExternalStore } from "react";

export type CuentaRecuperacion = {
    id: string;
    nombre: string;
    correo: string;
    credencial: string;
    creada: string; // AAAA-MM-DD
    bloqueada: boolean;
};

export type ResultadoRecuperacion = "enviado" | "fallida";
export type IntentoRecuperacion = { folio: string; cuentaId: string; persona: string; fecha: string; resultado: ResultadoRecuperacion; atendio: string };

export const CUENTAS: CuentaRecuperacion[] = [
    { id: "C-0214", nombre: "Persona usuaria A (ejemplo)", correo: "persona.a@correo.mx", credencial: "BSA-0099", creada: "2026-09-12", bloqueada: false },
    { id: "C-0213", nombre: "Persona usuaria B (ejemplo)", correo: "lector.b@correo.mx", credencial: "Sin credencial", creada: "2026-08-03", bloqueada: false },
    { id: "C-0211", nombre: "Persona usuaria D (ejemplo)", correo: "persona.d@correo.mx", credencial: "BSA-0071", creada: "2026-05-21", bloqueada: true },
];

const HISTORIAL_EJEMPLO: IntentoRecuperacion[] = [
    { folio: "RA-0016", cuentaId: "C-0213", persona: "Persona usuaria B (ejemplo)", fecha: "2026-11-07", resultado: "enviado", atendio: "Personal (ejemplo)" },
    { folio: "RA-0015", cuentaId: "C-0211", persona: "Persona usuaria D (ejemplo)", fecha: "2026-11-05", resultado: "fallida", atendio: "Personal (ejemplo)" },
];

// Lo que se revisa con la persona; los tres primeros son obligatorios para enviar el enlace
export const PUNTOS_VERIFICACION = [
    { titulo: "Identificación oficial vigente", obligatorio: true },
    { titulo: "El nombre coincide con la cuenta", obligatorio: true },
    { titulo: "Responde un dato de la cuenta (fecha de registro)", obligatorio: true },
    { titulo: "Credencial de la biblioteca a la mano", obligatorio: false },
];

// ---------- Reglas puras (pruebas en tests/recuperacionAsistida.test.ts) ----------

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function buscarCuenta(cuentas: CuentaRecuperacion[], texto: string) {
    const buscado = normalizar(texto);
    if (buscado.length < 3) return undefined;
    return cuentas.find((c) => [c.correo, c.nombre, c.credencial, c.id].some((v) => normalizar(v).includes(buscado)));
}

// «persona.a@correo.mx» → «pe***@correo.mx» (el personal no necesita ver el correo completo)
export function enmascararCorreo(correo: string) {
    const [usuario, dominio] = correo.split("@");
    if (!dominio) return "***";
    return `${usuario.slice(0, 2)}***@${dominio}`;
}

export const puedeEnviar = (marcados: boolean[]) => PUNTOS_VERIFICACION.every((p, i) => !p.obligatorio || marcados[i]);

export function siguienteFolio(lista: IntentoRecuperacion[]) {
    const mayor = lista.reduce((m, i) => Math.max(m, Number(i.folio.replace(/\D/g, "")) || 0), 0);
    return `RA-${String(mayor + 1).padStart(4, "0")}`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(fecha: string) {
    const [a, m, d] = fecha.split("-").map(Number);
    return `${d} ${MESES[m - 1]} ${a}`;
}

// ---------- Historial de la pestaña ----------

const CLAVE = "biblioteca-panel-recuperacion";
const escuchas = new Set<() => void>();

function leer(): IntentoRecuperacion[] {
    try {
        const guardado = JSON.parse(sessionStorage.getItem(CLAVE) ?? "null");
        if (Array.isArray(guardado)) return guardado;
    } catch { /* sin almacenamiento */ }
    return HISTORIAL_EJEMPLO;
}

let historial = leer();

export function useHistorialRecuperacion() {
    return useSyncExternalStore((avisar) => { escuchas.add(avisar); return () => { escuchas.delete(avisar); }; }, () => historial);
}

export function registrarIntento(cuenta: CuentaRecuperacion, resultado: ResultadoRecuperacion) {
    const intento: IntentoRecuperacion = { folio: siguienteFolio(historial), cuentaId: cuenta.id, persona: cuenta.nombre, fecha: new Date().toISOString().slice(0, 10), resultado, atendio: "Tú (ejemplo)" };
    historial = [intento, ...historial];
    try { sessionStorage.setItem(CLAVE, JSON.stringify(historial)); } catch { /* no pasa nada */ }
    escuchas.forEach((avisar) => avisar());
    return intento;
}

export const obtenerCuenta = (id?: string) => CUENTAS.find((c) => c.id === id);
