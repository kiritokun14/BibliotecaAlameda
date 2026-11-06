export function esCorreoValido(correo: string) {
    // algo@algo.algo
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

export function tieneDigitos(texto: string, cantidad: number) {
    return new RegExp(`^[0-9]{${cantidad}}$`).test(texto);
}

// fecha viene del <input type="date"> como "AAAA-MM-DD"
export function calcularEdad(fecha: string) {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const hoy = new Date();
    let edad = hoy.getFullYear() - anio;
    // Si este año todavía no cumple, le restamos uno
    const yaCumplio = hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
    if (!yaCumplio) edad--;
    return edad;
}

export const MENSAJE_CORREO = "Escribe un correo completo, por ejemplo nombre@ejemplo.mx.";
export const MENSAJE_OBLIGATORIO = "Este campo es obligatorio.";
