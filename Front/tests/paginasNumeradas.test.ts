// Paginación numerada del diseño responsivo (src/components/portal/responsivo.ts)
import { describe, expect, it } from "vitest";
import { numerosPagina } from "../src/components/portal/responsivo";

describe("Paginación numerada", () => {
    it("muestra todas las páginas si son pocas", () => {
        expect(numerosPagina(1, 2)).toEqual([1, 2]);
    });
    it("muestra 8 números alrededor de la actual, como un buscador", () => {
        expect(numerosPagina(1, 20)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(numerosPagina(10, 20)).toEqual([6, 7, 8, 9, 10, 11, 12, 13]);
        expect(numerosPagina(20, 20)).toEqual([13, 14, 15, 16, 17, 18, 19, 20]);
    });
});
