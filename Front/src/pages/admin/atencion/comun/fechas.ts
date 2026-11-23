// Fechas de las pantallas de Servicios Digitales (Altas asistidas, Contactos y sugerencias, Recuperación asistida).
// Los formateadores se crean una sola vez: toLocaleString con opciones arma uno nuevo en cada fila de la lista.
const FECHA_HORA = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mazatlan" });
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// «22 nov 2026, 10:30»
export const fechaHora = (iso: string) => FECHA_HORA.format(new Date(iso));

// «2014-03-05» → «5 mar 2014» (fechas sin hora, como la de nacimiento; no se pasan por Date para no correr el día)
export function fechaCorta(fecha: string) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}` : fecha;
}
