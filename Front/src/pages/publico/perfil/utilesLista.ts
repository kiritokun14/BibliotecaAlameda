// Listas del perfil (22 nov 2026): reglas puras compartidas por Mis eventos, Mis propuestas, Mis espacios y Mis mensajes.
// Pruebas en tests/utilesLista.test.ts.
// ¿El texto buscado aparece en alguno de los campos? (sin distinguir mayúsculas ni acentos)
const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function coincide(buscado: string, ...campos: (string | null | undefined)[]) {
    const b = normal(buscado.trim());
    return !b || campos.some((c) => !!c && normal(c).includes(b));
}

// Día y mes para el bloque de fecha («30 / nov»), en la hora de Tepic
const DIA = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mazatlan", day: "numeric" });
const MES = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mazatlan", month: "short" });
export function diaMes(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return { dia: DIA.format(d), mes: MES.format(d).replace(".", "") };
}
