// Atención › Recuperación asistida: ayudar a una persona que no puede entrar a su cuenta.
// El personal nunca ve ni escribe la contraseña: verifica la identidad y manda el enlace al correo de la cuenta.
// 22 nov 2026: el envío ya es real (POST /auth/recuperar, servicios/auth.ts → enviarEnlaceRecuperacion); por seguridad
// la respuesta es la misma exista o no la cuenta. Ya no hay cuentas ni historial inventados.
// TODO backend: no hay registro para el personal. Se espera POST /recuperacion-asistida (quién verificó, qué puntos,
// resultado) y GET /recuperacion-asistida/historial. Mientras tanto, el historial es solo de esta pestaña.
import { useSyncExternalStore } from "react";

export type ResultadoRecuperacion = "enviado" | "fallida";
export type IntentoRecuperacion = { folio: string; correo: string; fecha: string; resultado: ResultadoRecuperacion };

// Lo que se revisa con la persona; los tres primeros son obligatorios para enviar el enlace
export const PUNTOS_VERIFICACION = [
    { titulo: "Identificación oficial vigente", detalle: "INE, pasaporte o credencial escolar con foto", obligatorio: true, icono: "credencial" },
    { titulo: "El nombre coincide con la identificación", detalle: "Pregúntale el nombre con el que se registró", obligatorio: true, icono: "usuario" },
    { titulo: "Tiene acceso a su correo", detalle: "El enlace solo llega al correo de la cuenta", obligatorio: true, icono: "mensajes" },
    { titulo: "Credencial de la biblioteca a la mano", detalle: "Ayuda, pero no es necesaria", obligatorio: false, icono: "cuentas" },
] as const;

// ---------- Reglas puras (pruebas en tests/atencionNuevos.test.ts) ----------

// «persona.a@correo.mx» → «pe***@correo.mx» (el historial no guarda el correo completo)
export function enmascararCorreo(correo: string) {
    const [usuario, dominio] = correo.trim().split("@");
    if (!dominio) return "***";
    return `${usuario.slice(0, 2)}***@${dominio}`;
}

export const puedeEnviar = (marcados: boolean[]) => PUNTOS_VERIFICACION.every((p, i) => !p.obligatorio || marcados[i]);

export function siguienteFolio(lista: Pick<IntentoRecuperacion, "folio">[]) {
    const mayor = lista.reduce((m, i) => Math.max(m, Number(i.folio.replace(/\D/g, "")) || 0), 0);
    return `RA-${String(mayor + 1).padStart(4, "0")}`;
}

export const esDeHoy = (iso: string, hoy = new Date()) => new Date(iso).toDateString() === hoy.toDateString();

export { fechaHora as horaCorta } from "../comun/fechas";

// ---------- Historial de la pestaña ----------

const CLAVE = "biblioteca-panel-recuperacion-v2";
const escuchas = new Set<() => void>();

function leer(): IntentoRecuperacion[] {
    try {
        const guardado = JSON.parse(sessionStorage.getItem(CLAVE) ?? "null");
        if (Array.isArray(guardado)) return guardado;
    } catch { /* sin almacenamiento */ }
    return [];
}

let historial = leer();

export function useHistorialRecuperacion() {
    return useSyncExternalStore((avisar) => { escuchas.add(avisar); return () => { escuchas.delete(avisar); }; }, () => historial);
}

export function registrarIntento(correo: string, resultado: ResultadoRecuperacion) {
    const intento: IntentoRecuperacion = { folio: siguienteFolio(historial), correo: correo.trim() ? enmascararCorreo(correo) : "Sin correo", fecha: new Date().toISOString(), resultado };
    historial = [intento, ...historial];
    try { sessionStorage.setItem(CLAVE, JSON.stringify(historial)); } catch { /* no pasa nada */ }
    escuchas.forEach((avisar) => avisar());
    return intento;
}
