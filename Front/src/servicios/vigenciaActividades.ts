// Las actividades que ya terminaron no se muestran en el portal (Aldahir, 21 nov 2026): ni en la agenda, ni en
// «Todas las actividades», ni en el calendario, ni en el inicio. Una sesión termina a su hora de fin (hora de Tepic);
// el detalle sigue abriéndose por su dirección.
import type { ActividadPublica } from './actividades';

export type Ahora = { fecha: string; hora: string }; // «2026-11-21», «17:05»

export function ahoraTepic(d = new Date()): Ahora {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d);
    const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '00';
    return { fecha: `${valor('year')}-${valor('month')}-${valor('day')}`, hora: `${valor('hour')}:${valor('minute')}` };
}

// fin: «19:30» o «19:30:00». Sin hora de fin, la sesión dura todo su día.
export function yaTermino(fecha: string, fin: string | null | undefined, ahora: Ahora = ahoraTepic()): boolean {
    if (!fecha) return false;
    if (fecha !== ahora.fecha) return fecha < ahora.fecha;
    const hora = (fin ?? '').trim().slice(0, 5).padStart(5, '0');
    return /^\d{2}:\d{2}$/.test(hora) && hora <= ahora.hora;
}

// Sesión de la agenda («10:00 a 12:00»): termina a la hora que va después de « a ».
export function sesionTerminada(s: { fecha: string; horario: string }, ahora: Ahora = ahoraTepic()) {
    return yaTermino(s.fecha, s.horario.split(' a ')[1], ahora);
}

// La próxima sesión que todavía no termina; si la actividad no trae sesiones, su propia fecha y horario.
export function sesionVigente(a: ActividadPublica, ahora: Ahora = ahoraTepic()) {
    if (a.sesiones.length === 0) return yaTermino(a.fecha, a.fin, ahora) ? undefined : { fecha: a.fecha, inicio: a.inicio, fin: a.fin };
    return [...a.sesiones].sort((x, y) => x.fecha.localeCompare(y.fecha) || x.inicio.localeCompare(y.inicio))
        .find(s => !yaTermino(s.fecha, s.fin, ahora));
}
