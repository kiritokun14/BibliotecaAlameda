// Mapa 2D de la Biblioteca Pública Central Estatal «Solón Argüello» (levantamiento de Aldahir, 20 nov 2026).
// Única fuente de las áreas: el mapa (MapaBiblioteca), la página de Espacios, el formulario y Proponer.
// Las capacidades son aproximadas, calculadas según el tamaño de cada área.
// Los seis espacios para eventos están registrados con estos `slug` en public.espacio (Supabase/espacios_mapa.sql).

export type Planta = "baja" | "alta";
export type Categoria = "lectura" | "infantil" | "publico" | "oficina" | "bano" | "restringido" | "exterior" | "mesanim";
export type Disponibilidad = "disponible" | "ludico" | "condiciones" | "no";

// Forma en el plano (coordenadas del viewBox del SVG)
export type Forma = { rect: [number, number, number, number] } | { circulo: [number, number, number] } | { ruta: string };

export type Zona = {
    id: string;                 // número del plano («04», «15a», «M»)
    numero: string;             // número visible en la etiqueta
    nombre: string;
    corto?: string;             // nombre corto para la etiqueta del plano
    categoria: Categoria;
    planta: Planta;
    forma: Forma;
    etiqueta: [number, number, number]; // x, y, escala de la etiqueta
    relleno?: "baldosa" | "adoquin" | "rayas";
};

// Datos de un espacio para eventos
export type EspacioEvento = {
    slug: string;               // identificador en el backend (public.espacio.slug)
    disponibilidad: Exclude<Disponibilidad, "no">;
    capacidad: number;
    capacidadTexto: string;
    uso: string;
    condiciones: string[];
};

export const nombresCategoria: Record<Categoria, string> = {
    lectura: "Lectura y acervo", infantil: "Infantil", publico: "Servicios al público", oficina: "Oficinas",
    bano: "Baños", restringido: "Acceso restringido", exterior: "Exterior", mesanim: "Mesanim (planta alta)",
};

export const nombresDisponibilidad: Record<Disponibilidad, string> = {
    disponible: "Disponible para eventos",
    ludico: "Solo actividades lúdicas",
    condiciones: "Con condiciones",
    no: "No disponible",
};

const FORMA_INFANTIL = "M735,185 L1045,185 L1045,508 L925,508 Q890,470 870,425 Q850,385 790,370 Q745,350 738,300 Z";
export const FORMA_MESANIM = FORMA_INFANTIL; // el Mesanim está justo encima del Área infantil

export const zonas: Zona[] = [
    { id: "04", numero: "04", nombre: "Sala general", categoria: "lectura", planta: "baja", forma: { rect: [45, 180, 1005, 675] }, etiqueta: [555, 405, 1.25], relleno: "baldosa" },
    { id: "17", numero: "17", nombre: "Baño de caballeros", corto: "Baño H", categoria: "bano", planta: "baja", forma: { rect: [305, 115, 113, 70] }, etiqueta: [361, 150, 0.78] },
    { id: "18", numero: "18", nombre: "Solo personal autorizado", corto: "Solo personal", categoria: "restringido", planta: "baja", forma: { rect: [418, 115, 104, 70] }, etiqueta: [470, 150, 0.78], relleno: "rayas" },
    { id: "19", numero: "19", nombre: "Dirección", categoria: "oficina", planta: "baja", forma: { rect: [522, 115, 113, 70] }, etiqueta: [578, 150, 0.78] },
    { id: "20", numero: "20", nombre: "Baño de damas", corto: "Baño M", categoria: "bano", planta: "baja", forma: { rect: [635, 115, 100, 70] }, etiqueta: [685, 150, 0.78] },
    { id: "15a", numero: "15", nombre: "Oficina 1", corto: "Oficina", categoria: "oficina", planta: "baja", forma: { rect: [50, 185, 246, 183] }, etiqueta: [173, 276, 1] },
    { id: "15b", numero: "15", nombre: "Oficina 2", corto: "Oficina", categoria: "oficina", planta: "baja", forma: { rect: [50, 368, 208, 127] }, etiqueta: [154, 431, 1] },
    { id: "15c", numero: "15", nombre: "Oficina 3", corto: "Oficina", categoria: "oficina", planta: "baja", forma: { rect: [50, 495, 208, 113] }, etiqueta: [154, 551, 1] },
    { id: "14", numero: "14", nombre: "Sala Braille y de usos múltiples", corto: "Braille y usos múltiples", categoria: "publico", planta: "baja", forma: { rect: [50, 608, 206, 242] }, etiqueta: [153, 729, 1] },
    { id: "13", numero: "13", nombre: "Sala de servicios digitales", corto: "Servicios digitales", categoria: "publico", planta: "baja", forma: { rect: [256, 730, 179, 120] }, etiqueta: [345, 812, 0.85] },
    { id: "11", numero: "11", nombre: "Seguridad", categoria: "restringido", planta: "baja", forma: { rect: [438, 768, 74, 82] }, etiqueta: [475, 810, 0.7], relleno: "rayas" },
    { id: "01", numero: "01", nombre: "Acceso", categoria: "publico", planta: "baja", forma: { rect: [512, 768, 83, 87] }, etiqueta: [553, 800, 0.7] },
    { id: "02", numero: "02", nombre: "Recepción, guardarropa e información", corto: "Recepción", categoria: "publico", planta: "baja", forma: { rect: [595, 757, 100, 93] }, etiqueta: [645, 803, 0.72] },
    { id: "03", numero: "03", nombre: "Préstamo a domicilio", corto: "Préstamo", categoria: "publico", planta: "baja", forma: { rect: [695, 757, 90, 93] }, etiqueta: [740, 803, 0.72] },
    { id: "10", numero: "10", nombre: "Vestíbulo", categoria: "exterior", planta: "baja", forma: { rect: [415, 855, 275, 140] }, etiqueta: [553, 887, 0.9], relleno: "adoquin" },
    { id: "05", numero: "05", nombre: "Coliseo bibliográfico", corto: "Coliseo", categoria: "lectura", planta: "baja", forma: { circulo: [588, 520, 82] }, etiqueta: [588, 520, 1] },
    { id: "06", numero: "06", nombre: "Área infantil", categoria: "infantil", planta: "baja", forma: { ruta: FORMA_INFANTIL }, etiqueta: [905, 322, 1.15] },
    { id: "07", numero: "07", nombre: "Comicteca y publicaciones periódicas", corto: "Comicteca", categoria: "lectura", planta: "baja", forma: { rect: [925, 512, 120, 118] }, etiqueta: [985, 571, 0.85] },
    { id: "08", numero: "08", nombre: "Oficina de la Comicteca", corto: "Oficina", categoria: "oficina", planta: "baja", forma: { rect: [849, 630, 196, 90] }, etiqueta: [947, 675, 0.9] },
    { id: "09", numero: "09", nombre: "Acervo especializado Heriberto Camacho", corto: "Acervo H. Camacho", categoria: "lectura", planta: "baja", forma: { rect: [849, 720, 196, 130] }, etiqueta: [947, 785, 0.9] },
    { id: "M", numero: "M", nombre: "Mesanim", categoria: "mesanim", planta: "alta", forma: { ruta: FORMA_MESANIM }, etiqueta: [890, 290, 1.35] },
];

// Los seis espacios que se pueden pedir para un evento (por número del plano)
export const espaciosEvento: Record<string, EspacioEvento> = {
    "04": { slug: "sala-general", disponibilidad: "disponible", capacidad: 120, capacidadTexto: "Unas 120 personas sentadas",
        uso: "Presentaciones de libro, lecturas, conferencias y eventos amplios.",
        condiciones: ["Se comparte con las personas usuarias en horario de servicio.", "La estantería es fija: el acomodo de sillas depende del espacio libre."] },
    "14": { slug: "sala-usos-multiples", disponibilidad: "disponible", capacidad: 40, capacidadTexto: "Unas 40 en auditorio o 24 con mesas",
        uso: "Talleres, conferencias, presentaciones y actividades inclusivas.", condiciones: [] },
    "10": { slug: "vestibulo", disponibilidad: "disponible", capacidad: 35, capacidadTexto: "Unas 35 personas",
        uso: "Inauguraciones, exposiciones temporales y recepción de invitados.",
        condiciones: ["Espacio exterior techado (pórtico): considera el clima."] },
    "05": { slug: "coliseo-bibliografico", disponibilidad: "disponible", capacidad: 25, capacidadTexto: "Unas 25 personas",
        uso: "Círculos de lectura, charlas y presentaciones en formato íntimo.", condiciones: [] },
    "06": { slug: "area-infantil", disponibilidad: "ludico", capacidad: 30, capacidadTexto: "Unas 30 niñas y niños con sus acompañantes",
        uso: "Solo actividades lúdicas: lectura de cuentos, visitas escolares de preescolar y talleres infantiles.",
        condiciones: ["No se usa para eventos formales."] },
    "M": { slug: "mesanim", disponibilidad: "condiciones", capacidad: 50, capacidadTexto: "Unas 50 personas sentadas",
        uso: "Eventos pequeños: presentaciones, recitales acústicos y talleres.",
        condiciones: ["Piso de duela: sin tacones de aguja ni calzado que raye.", "No se arrastran muebles; se usan protectores en las patas.",
            "Sin alimentos ni bebidas.", "Acceso solo por escalera: no es accesible en silla de ruedas.", "Sujeto a aprobación de la Dirección."] },
};

// Colores de disponibilidad (los del portal: verde = listo, dorado = en curso o limitado, guinda = requiere atención, gris = no)
export const colorDisponibilidad: Record<Disponibilidad, string> = {
    disponible: "#1f6b5c", ludico: "#c9a24a", condiciones: "#9b2247", no: "#b9b3a5",
};

// Pasos del trámite de un espacio (indicador de arriba) y a dónde lleva cada uno
export const pasosEspacio = ["Elige el espacio", "Fecha y datos", "Seguimiento"];
export const rutasEspacio = (slug?: string) => ["/espacios", slug ? `/espacios/solicitar?espacio=${slug}` : "/espacios", "/mi-perfil/espacios"];

// El espacio de una sesión de actividad viene como texto («Sala de lectura (provisional)»): se busca su zona del mapa
// por palabras clave. TODO backend: cuando las sesiones traigan el `slug` del espacio, usar zonaPorSlug.
const sinAcentos = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const claves: [string, string][] = [
    ["usos multiples", "14"], ["braille", "14"], ["infantil", "06"], ["coliseo", "05"], ["mesanim", "M"],
    ["vestibulo", "10"], ["sala general", "04"], ["sala de lectura", "04"], ["lectura", "04"],
];
export function zonaPorNombreEspacio(nombre: string | null | undefined) {
    if (!nombre) return undefined;
    const n = sinAcentos(nombre);
    const clave = claves.find(([palabra]) => n.includes(palabra));
    return clave ? zonaPorId(clave[1]) : undefined;
}

export const plantaDe = (z: Zona) => (z.planta === "alta" ? "Planta alta, sobre el Área infantil" : "Planta baja");
export const disponibilidadDe = (id: string): Disponibilidad => espaciosEvento[id]?.disponibilidad ?? "no";
export const zonaPorId = (id: string) => zonas.find((z) => z.id === id);
export const zonaPorSlug = (slug: string) => zonas.find((z) => espaciosEvento[z.id]?.slug === slug);

// Lista simple de áreas (Proponer y pruebas): las que se pueden pedir y algunas que no, con su motivo
export type Area = { id: string; nombre: string; solicitable: boolean; nota?: string };
export const areas: Area[] = [
    ...zonas.filter((z) => espaciosEvento[z.id]).map((z) => ({ id: espaciosEvento[z.id].slug, nombre: z.nombre, solicitable: true })),
    { id: "acervo-especializado", nombre: "Acervo especializado Heriberto Camacho", solicitable: false, nota: "Solo consulta" },
    { id: "prestamo", nombre: "Préstamo a domicilio", solicitable: false, nota: "Módulo de servicio" },
];

// Separa las que se pueden solicitar de las que no
export function separarAreas(lista: Area[] = areas) {
    return {
        solicitables: lista.filter((a) => a.solicitable),
        noSolicitables: lista.filter((a) => !a.solicitable),
    };
}
