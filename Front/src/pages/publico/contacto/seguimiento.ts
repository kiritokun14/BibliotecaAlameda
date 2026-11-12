// Seguimiento de un mensaje de contacto o sugerencia (Mi perfil › Mis mensajes).
// Estados reales del backend (GET /v1/public/contacto/seguimiento/{folio}): recibido, en_atencion, cerrado.
// Se muestran como el flujo de la credencial: Registrada → En revisión → Atendida.
import type { Etapa } from "../credencial/datos";

export type EstadoContacto = "recibido" | "en_atencion" | "cerrado";

export const NOMBRE_ESTADO: Record<EstadoContacto, string> = {
    recibido: "Registrada",
    en_atencion: "En revisión",
    cerrado: "Atendida",
};

// El folio es el UUID que da el backend al registrar el mensaje
export function esFolio(texto: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(texto.trim());
}

// recibido:    ✓ Registrada · ○ En revisión · ○ Atendida
// en_atencion: ✓ Registrada · ● En revisión · ○ Atendida
// cerrado:     ✓ Registrada · ✓ En revisión · ✓ Atendida
export function etapasContacto(estado: string): Etapa[] {
    const revision: Etapa["estado"] = estado === "cerrado" ? "hecho" : estado === "en_atencion" ? "actual" : "pendiente";
    const atendida: Etapa["estado"] = estado === "cerrado" ? "hecho" : "pendiente";
    return [
        { titulo: "Se registró tu petición", texto: "Recibimos tu mensaje y le asignamos un folio.", estado: "hecho" },
        { titulo: "En revisión", texto: "El personal de la biblioteca está revisando tu mensaje.", estado: revision },
        { titulo: "Atendida", texto: "El personal dio respuesta a tu mensaje.", estado: atendida },
    ];
}
