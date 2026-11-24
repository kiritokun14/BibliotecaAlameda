// ¿La pantalla es de tableta o teléfono (≤ 1024 px)? Para cambios que solo aplican en el diseño responsivo y no se
// pueden hacer con CSS (p. ej. paginar de 10 en 10). En escritorio devuelve false y nada cambia.
import { useSyncExternalStore } from "react";

const CONSULTA = "(max-width: 1024px)";
const suscribir = (avisar: () => void) => {
    const m = window.matchMedia(CONSULTA);
    m.addEventListener("change", avisar);
    return () => m.removeEventListener("change", avisar);
};

export function useResponsivo() {
    return useSyncExternalStore(suscribir, () => window.matchMedia(CONSULTA).matches, () => false);
}

// Números a mostrar, como el buscador de Google: hasta `cuantos` páginas alrededor de la actual
export function numerosPagina(actual: number, total: number, cuantos = 8) {
    const n = Math.min(cuantos, total);
    let desde = Math.max(1, actual - Math.floor(n / 2));
    desde = Math.min(desde, total - n + 1);
    return Array.from({ length: n }, (_, i) => desde + i);
}
