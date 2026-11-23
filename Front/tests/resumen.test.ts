import { describe, expect, it } from "vitest";
import {
    contarPorPlazo,
    diasParaVencer,
    momentosDelDia,
    filtrarPendientes,
    ordenarPorVencimiento,
    pendientesPorRuta,
    plazoDe,
    type Pendiente,
} from "../src/pages/admin/resumen/datos";

const base = { area: "propuestas", responsable: "Ana M.", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/atencion/propuestas" } as const;
const p = (folio: string, vence: string, extra: Partial<Pendiente> = {}): Pendiente => ({ ...base, folio, asunto: `Asunto ${folio}`, vence, ...extra });

describe("Resumen · pendientes por vencimiento", () => {
    it("entiende los textos de vencimiento", () => {
        expect(diasParaVencer(p("A", "Hoy"))).toBe(0);
        expect(diasParaVencer(p("B", "Mañana"))).toBe(1);
        expect(diasParaVencer(p("C", "En 3 días"))).toBe(3);
        expect(diasParaVencer(p("D", "En 1 dia"))).toBe(1);
        expect(diasParaVencer(p("E", "Sin fecha"))).toBe(99);
        expect(plazoDe(p("F", "En 5 días", { urgente: true }))).toBe("hoy");
    });

    it("ordena por lo que vence antes y cuenta por plazo", () => {
        const lista = [p("A", "En 4 días"), p("B", "Hoy"), p("C", "Mañana"), p("D", "En 2 días")];
        expect(ordenarPorVencimiento(lista).map((x) => x.folio)).toEqual(["B", "C", "D", "A"]);
        expect(contarPorPlazo(lista)).toEqual({ hoy: 1, manana: 1, semana: 2 });
    });

    it("filtra por plazo, área y texto a la vez", () => {
        const lista = [p("PR-1", "Hoy"), p("PR-2", "Mañana"), p("VS-1", "Hoy", { area: "visitas" })];
        expect(filtrarPendientes(lista, null, "", "hoy").map((x) => x.folio)).toEqual(["PR-1", "VS-1"]);
        expect(filtrarPendientes(lista, "propuestas", "", "hoy").map((x) => x.folio)).toEqual(["PR-1"]);
        expect(filtrarPendientes(lista, null, "pr-2").map((x) => x.folio)).toEqual(["PR-2"]);
    });

    it("cuenta lo que espera en cada pantalla para los accesos rápidos", () => {
        const lista = [p("A", "Hoy"), p("B", "En 3 días"), p("C", "Mañana", { ruta: "/admin/actividades/visitas" })];
        expect(pendientesPorRuta(lista)).toEqual({
            "/admin/atencion/propuestas": { total: 2, hoy: 1 },
            "/admin/actividades/visitas": { total: 1, hoy: 0 },
        });
    });
});

describe("Resumen · actividades de hoy", () => {
    const horas = ["09:00", "11:00", "16:00"];
    it("marca la que está ahora, la que sigue y las que pasaron", () => {
        expect(momentosDelDia(horas, 11 * 60 + 30)).toEqual(["pasada", "ahora", "siguiente"]);
        expect(momentosDelDia(horas, 8 * 60)).toEqual(["siguiente", "despues", "despues"]);
        expect(momentosDelDia(horas, 23 * 60)).toEqual(["pasada", "pasada", "pasada"]);
    });
    it("una actividad deja de estar en curso a los 90 min o cuando empieza la siguiente", () => {
        expect(momentosDelDia(["09:00", "09:30"], 9 * 60 + 40)).toEqual(["pasada", "ahora"]);
        expect(momentosDelDia(["09:00"], 10 * 60 + 31)).toEqual(["pasada"]);
    });
});
