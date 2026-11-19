import { describe, expect, it } from "vitest";
import { LIMITE_EN_PROCESO, contarEnProceso, lugaresLibres } from "../src/pages/publico/contacto/limite";

describe("límite de mensajes de contacto", () => {
    it("el límite es de 3 mensajes en proceso", () => {
        expect(LIMITE_EN_PROCESO).toBe(3);
    });

    it("cuenta como en proceso todo lo que no está cerrado", () => {
        expect(contarEnProceso(["recibido", "en_atencion", "cerrado"])).toBe(2);
        expect(contarEnProceso(["cerrado", "cerrado"])).toBe(0);
        expect(contarEnProceso([])).toBe(0);
    });

    it("los lugares libres nunca son negativos", () => {
        expect(lugaresLibres(0)).toBe(3);
        expect(lugaresLibres(2)).toBe(1);
        expect(lugaresLibres(3)).toBe(0);
        expect(lugaresLibres(5)).toBe(0);
    });
});
