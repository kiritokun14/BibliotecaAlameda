import { beforeEach, describe, expect, it, vi } from "vitest";
import { foliosDe, guardarFolio, olvidarFolio } from "../src/pages/publico/perfil/mensajesGuardados";

// Almacenamiento en memoria para simular el del navegador
function memoria() {
    const datos = new Map<string, string>();
    return {
        getItem: (k: string) => datos.get(k) ?? null,
        setItem: (k: string, v: string) => { datos.set(k, v); },
        removeItem: (k: string) => { datos.delete(k); },
        clear: () => datos.clear(),
    };
}

describe("folios de Mis mensajes guardados en el navegador", () => {
    beforeEach(() => { vi.stubGlobal("localStorage", memoria()); });

    it("guarda los folios de cada cuenta por separado, del más reciente al más antiguo", () => {
        guardarFolio("folio-a", "cuenta-1");
        guardarFolio("folio-b", "cuenta-1");
        guardarFolio("folio-c", "cuenta-2");
        expect(foliosDe("cuenta-1")).toEqual(["folio-b", "folio-a"]);
        expect(foliosDe("cuenta-2")).toEqual(["folio-c"]);
    });

    it("no repite un folio: si se vuelve a guardar, sube al principio", () => {
        guardarFolio("folio-a", "cuenta-1");
        guardarFolio("folio-b", "cuenta-1");
        guardarFolio(" folio-a ", "cuenta-1");
        expect(foliosDe("cuenta-1")).toEqual(["folio-a", "folio-b"]);
    });

    it("olvida un folio solo de esa cuenta", () => {
        guardarFolio("folio-a", "cuenta-1");
        guardarFolio("folio-a", "cuenta-2");
        olvidarFolio("folio-a", "cuenta-1");
        expect(foliosDe("cuenta-1")).toEqual([]);
        expect(foliosDe("cuenta-2")).toEqual(["folio-a"]);
    });

    it("ignora datos dañados y no falla sin almacenamiento", () => {
        localStorage.setItem("alameda.mis-mensajes", "{no es json");
        expect(foliosDe("cuenta-1")).toEqual([]);
        vi.stubGlobal("localStorage", undefined);
        expect(() => guardarFolio("folio-a", "cuenta-1")).not.toThrow();
        expect(foliosDe("cuenta-1")).toEqual([]);
    });
});
