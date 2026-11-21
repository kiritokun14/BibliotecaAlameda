import { describe, expect, it } from "vitest";
import { ahoraTepic, sesionTerminada, sesionVigente, yaTermino } from "../src/servicios/vigenciaActividades";
import type { ActividadPublica } from "../src/servicios/actividades";

const ahora = { fecha: "2026-11-21", hora: "17:00" };
const sesion = (id: string, fecha: string, inicio: string, fin: string) =>
    ({ id, fecha, inicio, fin, espacio: "", cupo: 20, estado: "programada", registroAbierto: true }) as unknown as ActividadPublica["sesiones"][number];
const actividad = (sesiones: ActividadPublica["sesiones"], fecha = "2026-11-21", fin = "12:00") =>
    ({ folio: "A-1", nombre: "Taller", tipo: "Taller", fecha, inicio: "10:00", fin, sesiones }) as unknown as ActividadPublica;

describe("Actividades que ya terminaron (no se muestran)", () => {
    it("una sesión termina a su hora de fin, en hora de Tepic", () => {
        expect(yaTermino("2026-11-20", "19:00", ahora)).toBe(true);
        expect(yaTermino("2026-11-21", "16:30", ahora)).toBe(true);
        expect(yaTermino("2026-11-21", "17:00:00", ahora)).toBe(true);
        expect(yaTermino("2026-11-21", "18:00", ahora)).toBe(false);
        expect(yaTermino("2026-11-22", "09:00", ahora)).toBe(false);
        expect(yaTermino("2026-11-21", "", ahora)).toBe(false);
    });
    it("lee el fin del horario de la agenda", () => {
        expect(sesionTerminada({ fecha: "2026-11-21", horario: "10:00 a 12:00" }, ahora)).toBe(true);
        expect(sesionTerminada({ fecha: "2026-11-21", horario: "16:00 a 18:30" }, ahora)).toBe(false);
    });
    it("elige la próxima sesión que no ha terminado", () => {
        const a = actividad([sesion("s3", "2026-11-28", "10:00", "12:00"), sesion("s1", "2026-11-14", "10:00", "12:00"), sesion("s2", "2026-11-21", "18:00", "19:00")]);
        expect(sesionVigente(a, ahora)?.fecha).toBe("2026-11-21");
        expect(sesionVigente(actividad([sesion("s1", "2026-11-14", "10:00", "12:00")]), ahora)).toBeUndefined();
        expect(sesionVigente(actividad([], "2026-11-21", "12:00"), ahora)).toBeUndefined();
        expect(sesionVigente(actividad([], "2026-11-21", "19:00"), ahora)?.fecha).toBe("2026-11-21");
    });
    it("da la fecha y la hora de Tepic", () => {
        expect(ahoraTepic(new Date("2026-11-21T03:30:00Z"))).toEqual({ fecha: "2026-11-20", hora: "20:30" });
    });
});
