// Para revisar estados sin backend: agrega ?simular=<modo> a la dirección (por ejemplo ?simular=error).
// Solo funciona en desarrollo (npm run dev); en producción siempre devuelve null.
export function simulacion(): string | null {
    if (!import.meta.env.DEV) return null;
    return new URLSearchParams(window.location.search).get("simular");
}
