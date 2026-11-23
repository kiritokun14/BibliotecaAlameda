// Listas del perfil: búsqueda y bloque de fecha (src/pages/publico/perfil/utilesLista.ts)
import { describe, expect, it } from "vitest";
import { coincide, diaMes } from "../src/pages/publico/perfil/utilesLista";

describe("Perfil · listas", () => {
    it("busca sin distinguir mayúsculas ni acentos", () => {
        expect(coincide("", "Club")).toBe(true);
        expect(coincide("lectura", "Club de Lectura")).toBe(true);
        expect(coincide("revision", "En revisión")).toBe(true);
        expect(coincide("ajedrez", "Club de lectura", null)).toBe(false);
    });

    it("da el día y el mes en la hora de Tepic", () => {
        expect(diaMes("2026-11-30T15:01:00Z")).toEqual({ dia: "30", mes: "nov" });
        expect(diaMes("sin fecha")).toBeNull();
    });
});
