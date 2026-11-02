// Áreas de la biblioteca (vista de visitante). Esquema ilustrativo: la biblioteca confirmará las áreas.
// TODO backend: GET /espacios cuando exista.
export type Area = { id: string; nombre: string; solicitable: boolean; nota?: string };

export const areas: Area[] = [
    { id: "sala-lectura-general", nombre: "Sala de lectura general", solicitable: true },
    { id: "hemeroteca-regional", nombre: "Hemeroteca regional", solicitable: true },
    { id: "sala-consulta", nombre: "Sala de consulta", solicitable: true },
    { id: "area-actividades", nombre: "Área de actividades y usos múltiples", solicitable: true },
    { id: "sala-computo", nombre: "Sala de cómputo", solicitable: true },
    { id: "cubiculos-estudio", nombre: "Cubículos de estudio", solicitable: true },
    { id: "fondo-especial", nombre: "Fondo especial", solicitable: false, nota: "Solo consulta" },
    { id: "prestamos", nombre: "Préstamos", solicitable: false, nota: "Módulo de servicio" },
];

// Separa las que se pueden solicitar de las que no
export function separarAreas(lista: Area[] = areas) {
    return {
        solicitables: lista.filter((a) => a.solicitable),
        noSolicitables: lista.filter((a) => !a.solicitable),
    };
}
