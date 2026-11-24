// Insignias de participación (22 nov 2026, a pedido de Aldahir): logros que la persona gana al participar en la biblioteca.
// Son distintas de las recompensas (que se entregan en físico): una insignia se gana sola al cumplir su regla y la
// persona la ve en Mi perfil › Mi progreso; el personal la ve en la ficha del participante.
// TODO backend: GET /v1/me/insignias y GET /participantes/:folio/insignias con { id, obtenida, fecha } (las reglas son estas).

export type Dibujo = "semilla" | "libro" | "brujula" | "estrella" | "pluma" | "manos" | "credencial" | "corona";
export type ColorInsignia = "verde" | "dorado" | "guinda" | "pizarra";

export type Insignia = {
    id: string;
    nombre: string;
    descripcion: string; // qué reconoce
    regla: string; // cómo se gana, dicho para la persona
    dibujo: Dibujo;
    color: ColorInsignia;
    meta: number; // cuánto pide
    medida: keyof DatosInsignias;
};

// Lo que se cuenta para las insignias (asistencias verificadas por el personal)
export type DatosInsignias = {
    asistencias: number;
    clubes: number; // asistencias a clubes de lectura
    talleres: number; // asistencias a talleres y cursos
    credencial: number; // 1 si tiene la credencial vigente
    propuestas: number; // propuestas de actividad aprobadas
};

export const INSIGNIAS: Insignia[] = [
    { id: "primer-paso", nombre: "Primer paso", descripcion: "Tu primera actividad en la biblioteca.", regla: "Asiste a 1 actividad.", dibujo: "semilla", color: "verde", meta: 1, medida: "asistencias" },
    { id: "credencial", nombre: "Lector con credencial", descripcion: "Ya eres parte de la biblioteca.", regla: "Ten tu credencial vigente.", dibujo: "credencial", color: "pizarra", meta: 1, medida: "credencial" },
    { id: "lector-constante", nombre: "Lector frecuente", descripcion: "Vienes seguido a las actividades.", regla: "Asiste a 3 actividades.", dibujo: "libro", color: "verde", meta: 3, medida: "asistencias" },
    { id: "club", nombre: "Voz del club", descripcion: "Te gusta comentar lo que lees.", regla: "Asiste a 3 sesiones de un club de lectura.", dibujo: "pluma", color: "guinda", meta: 3, medida: "clubes" },
    { id: "taller", nombre: "Manos creativas", descripcion: "Aprendes haciendo.", regla: "Asiste a 3 talleres o cursos.", dibujo: "manos", color: "dorado", meta: 3, medida: "talleres" },
    { id: "explorador", nombre: "Explorador de la Alameda", descripcion: "Conoces bien la biblioteca.", regla: "Asiste a 6 actividades.", dibujo: "brujula", color: "dorado", meta: 6, medida: "asistencias" },
    { id: "comunidad", nombre: "Voz de la comunidad", descripcion: "Propusiste algo para todos.", regla: "Logra que aprueben 1 propuesta de actividad.", dibujo: "estrella", color: "guinda", meta: 1, medida: "propuestas" },
    { id: "asiduo", nombre: "Asiduo de la Alameda", descripcion: "La biblioteca es tu segunda casa.", regla: "Asiste a 12 actividades.", dibujo: "corona", color: "dorado", meta: 12, medida: "asistencias" },
];

export type EstadoInsignia = Insignia & { obtenida: boolean; avance: number; valor: number };

export function insigniasDe(datos: DatosInsignias): EstadoInsignia[] {
    return INSIGNIAS.map((i) => {
        const valor = Math.min(datos[i.medida], i.meta);
        return { ...i, valor, obtenida: datos[i.medida] >= i.meta, avance: Math.round((valor / i.meta) * 100) };
    });
}

// Cuenta clubes y talleres por el nombre de la actividad (mientras el backend no dé el tipo de cada asistencia)
export function contarPorTipo(actividades: string[]) {
    const n = (palabra: RegExp) => actividades.filter((a) => palabra.test(a.toLowerCase())).length;
    return { clubes: n(/club/), talleres: n(/taller/) };
}
