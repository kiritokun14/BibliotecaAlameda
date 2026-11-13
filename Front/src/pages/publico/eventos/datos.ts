// Eventos para visitante (T-052): solo muestra la actividad elegida en el carrusel de Inicio.
// TODO backend: GET /actividades/:id cuando exista; por ahora se usan los datos de Inicio.
import { actividades, type Actividad } from "../inicio/datos";
import { agendaEjemplo, comoActividad } from "./datosAgenda";

// null si no se eligió ninguna o el id no existe
export function actividadElegida(id: string | undefined, lista: Actividad[] = [...actividades, ...agendaEjemplo.map(comoActividad)]): Actividad | null {
    if (!id) return null;
    return lista.find((a) => a.id === id) ?? null;
}

// "Sáb 8 nov" → { dia: "8", mes: "NOV" } para la caja de fecha
export function partirFecha(fecha: string): { dia: string; mes: string } {
    const partes = fecha.trim().split(/\s+/);
    const dia = partes.find((p) => /^\d{1,2}$/.test(p)) ?? "";
    const mes = partes.length > 0 ? partes[partes.length - 1].slice(0, 3).toUpperCase() : "";
    return { dia, mes: dia ? mes : "" };
}
