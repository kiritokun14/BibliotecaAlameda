// ¿La biblioteca está abierta ahora? Horario publicado en Contacto (contacto/datos.ts):
// lunes a viernes de 8:00 a 19:30 h y sábados de 9:00 a 14:00 h; domingos cerrado. Hora de Tepic.
// TODO backend: los días festivos y cierres especiales vendrán de Configuración del portal; hoy no se consideran.
import { useEffect, useState } from "react";

const ZONA = "America/Mazatlan"; // Tepic, Nayarit

// Minutos desde medianoche; índice = día de la semana (0 domingo … 6 sábado)
const HORARIO: ({ abre: number; cierra: number } | null)[] = [
    null,
    { abre: 8 * 60, cierra: 19 * 60 + 30 },
    { abre: 8 * 60, cierra: 19 * 60 + 30 },
    { abre: 8 * 60, cierra: 19 * 60 + 30 },
    { abre: 8 * 60, cierra: 19 * 60 + 30 },
    { abre: 8 * 60, cierra: 19 * 60 + 30 },
    { abre: 9 * 60, cierra: 14 * 60 },
];
const DIAS = ["el domingo", "el lunes", "el martes", "el miércoles", "el jueves", "el viernes", "el sábado"];

export type EstadoBiblioteca = { abierta: boolean; texto: string };

const reloj = (minutos: number) => `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, "0")}`;

// Día de la semana y minutos del día en la hora de Tepic
function horaTepic(fecha: Date) {
    const partes = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(fecha);
    const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "0";
    const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(valor("weekday"));
    return { dia, minutos: Number(valor("hour")) * 60 + Number(valor("minute")) };
}

export function estadoBiblioteca(fecha: Date = new Date()): EstadoBiblioteca {
    const { dia, minutos } = horaTepic(fecha);
    const hoy = HORARIO[dia];
    if (hoy && minutos >= hoy.abre && minutos < hoy.cierra) {
        return { abierta: true, texto: `Abierto ahora · cierra a las ${reloj(hoy.cierra)} h` };
    }
    if (hoy && minutos < hoy.abre) {
        return { abierta: false, texto: `Cerrado ahora · abre hoy a las ${reloj(hoy.abre)} h` };
    }
    // Busca el siguiente día con horario
    for (let salto = 1; salto <= 7; salto++) {
        const siguiente = (dia + salto) % 7;
        const horario = HORARIO[siguiente];
        if (horario) {
            const cuando = salto === 1 ? "mañana" : DIAS[siguiente];
            return { abierta: false, texto: `Cerrado ahora · abre ${cuando} a las ${reloj(horario.abre)} h` };
        }
    }
    return { abierta: false, texto: "Cerrado ahora" };
}

// Se recalcula cada minuto mientras la página está abierta
export function useEstadoBiblioteca(): EstadoBiblioteca {
    const [estado, setEstado] = useState(() => estadoBiblioteca());
    useEffect(() => {
        const id = window.setInterval(() => setEstado(estadoBiblioteca()), 60_000);
        return () => window.clearInterval(id);
    }, []);
    return estado;
}
