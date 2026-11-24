// Fotos de los espacios para eventos (tomadas por Aldahir en la biblioteca, 19 nov 2026).
// Cada espacio tiene sus fotos en assets/espacios/fotos/<slug>-<n>.webp (grande, para la vista previa) y
// <slug>-<n>-mini.webp (para la tarjeta). Para agregar una foto basta con dejar los dos archivos con ese nombre.
export type FotoEspacio = { grande: string; mini: string };

const archivos = import.meta.glob("../../../assets/espacios/fotos/*.webp", { eager: true, import: "default" }) as Record<string, string>;

// Ícono de cada espacio (assets/espacios/iconos/<slug>.svg, trazo verde), para la lista de espacios
const iconos = import.meta.glob("../../../assets/espacios/iconos/*.svg", { eager: true, import: "default" }) as Record<string, string>;
export const iconoDe = (slug: string) => iconos[`../../../assets/espacios/iconos/${slug}.svg`];

export function fotosDe(slug: string): FotoEspacio[] {
    const fotos: FotoEspacio[] = [];
    for (let n = 1; ; n++) {
        const grande = archivos[`../../../assets/espacios/fotos/${slug}-${n}.webp`];
        const mini = archivos[`../../../assets/espacios/fotos/${slug}-${n}-mini.webp`];
        if (!grande || !mini) return fotos;
        fotos.push({ grande, mini });
    }
}
