// Folios de los mensajes de contacto que la persona envió (o consultó) con su sesión, guardados en este navegador.
// Así «Mis mensajes» los lista solos, sin escribir el folio.
// TODO backend: cuando GET /mis-solicitudes incluya los mensajes de contacto, esta lista sale de ahí y esto se puede quitar.
// Límite: solo se ven en el navegador donde se enviaron; desde otro equipo se consulta con el folio.

const CLAVE = "alameda.mis-mensajes";
const MAXIMO = 30;

export type MensajeGuardado = { folio: string; cuenta: string; guardadoEn: string };

function leer(): MensajeGuardado[] {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
        return Array.isArray(datos) ? datos.filter((d) => d && typeof d.folio === "string" && typeof d.cuenta === "string") : [];
    } catch {
        return [];
    }
}

function escribir(lista: MensajeGuardado[]) {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAXIMO))); } catch { /* sin almacenamiento: no se guarda */ }
}

// Los de esta cuenta, del más reciente al más antiguo
export function foliosDe(cuenta: string): string[] {
    return leer().filter((m) => m.cuenta === cuenta).map((m) => m.folio);
}

// Agrega (o sube al principio) un folio de esta cuenta
export function guardarFolio(folio: string, cuenta: string, ahora = new Date()) {
    const limpio = folio.trim();
    if (!limpio || !cuenta) return;
    const resto = leer().filter((m) => !(m.folio === limpio && m.cuenta === cuenta));
    escribir([{ folio: limpio, cuenta, guardadoEn: ahora.toISOString() }, ...resto]);
}

// Quita un folio de esta cuenta (por ejemplo, si ya no existe)
export function olvidarFolio(folio: string, cuenta: string) {
    escribir(leer().filter((m) => !(m.folio === folio && m.cuenta === cuenta)));
}
