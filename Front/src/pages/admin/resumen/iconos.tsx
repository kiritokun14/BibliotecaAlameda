import type { ReactNode } from "react";
import type { IconoAcceso } from "./datos";

// Íconos de trazo del Resumen (21 nov 2026). Van en línea para heredar el color del texto (currentColor):
// así cambian con la paleta y con el estado (pasar el mouse, foco) sin archivos extra.
function Trazo({ children }: { children: ReactNode }) {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
    );
}

const TRAZOS: Record<IconoAcceso | "hoy" | "alerta" | "lista" | "reloj" | "check" | "info" | "usuario" | "portal" | "salir", ReactNode> = {
    salir: <><path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" /><path d="M10 8l-4 4 4 4M6 12h9" /></>,
    portal: <><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" /></>,
    credencial: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16c.6-1.5 1.8-2.3 3.2-2.3s2.6.8 3.2 2.3M14.5 10h4M14.5 13.5h3" /></>,
    cotejo: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8h8M8 11.5h5" /><path d="m9 16 2 2 4-4" /></>,
    propuesta: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></>,
    espacios: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></>,
    inscripciones: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.7-3 3-4.6 5.5-4.6s4.8 1.6 5.5 4.6" /><path d="m15.5 11 1.8 1.8 3.4-3.6" /></>,
    asistencia: <><rect x="5" y="4.5" width="14" height="16" rx="2" /><path d="M9 3h6v3H9z" /><path d="m9 13 2 2 4-4" /></>,
    calendario: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h2M14 14h2M8 17h2" /></>,
    mensajes: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    contenido: <><path d="M14.5 4.5 19.5 9.5 9 20H4v-5L14.5 4.5Z" /><path d="m12.5 6.5 5 5" /></>,
    aviso: <><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 6 1.5 6h-15S6 14 6 10Z" /><path d="M10 19.5a2.2 2.2 0 0 0 4 0" /></>,
    foro: <><path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3.5V15H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M17 9h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v2.5L16 19h-3" /></>,
    cuentas: <><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3Z" /><circle cx="12" cy="10" r="2.2" /><path d="M8.6 15.5c.7-1.4 1.9-2.1 3.4-2.1s2.7.7 3.4 2.1" /></>,
    hoy: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    alerta: <><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5M12 17.5v.01" /></>,
    lista: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
    reloj: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
    info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.5v.01" /></>,
    usuario: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1-3.6 3.8-5.5 7-5.5s6 1.9 7 5.5" /></>,
};

export type NombreIcono = keyof typeof TRAZOS;
export function Icono({ nombre }: { nombre: NombreIcono }) {
    return <Trazo>{TRAZOS[nombre]}</Trazo>;
}
