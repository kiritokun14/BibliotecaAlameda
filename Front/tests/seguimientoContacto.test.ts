import { describe, expect, it } from "vitest";
import { esFolio, etapasContacto, NOMBRE_ESTADO } from "../src/pages/publico/contacto/seguimiento";

const estados = (estado: string) => etapasContacto(estado).map((e) => e.estado);

describe("Seguimiento de mensajes de contacto (Mi perfil › Mis mensajes)", () => {
    it("recibido: solo se registró la petición", () => {
        expect(estados("recibido")).toEqual(["hecho", "pendiente", "pendiente"]);
    });

    it("en atención: está en revisión", () => {
        expect(estados("en_atencion")).toEqual(["hecho", "actual", "pendiente"]);
    });

    it("cerrado: atendida, todo completo", () => {
        expect(estados("cerrado")).toEqual(["hecho", "hecho", "hecho"]);
    });

    it("las etapas y los nombres siguen el orden Registrada → En revisión → Atendida", () => {
        expect(etapasContacto("recibido").map((e) => e.titulo)).toEqual(["Se registró tu petición", "En revisión", "Atendida"]);
        expect(NOMBRE_ESTADO).toEqual({ recibido: "Registrada", en_atencion: "En revisión", cerrado: "Atendida" });
    });

    it("solo acepta el folio completo que da el backend", () => {
        expect(esFolio(" 3f2a9c1e-1b2c-4d5e-8f90-a1b2c3d4e5f6 ")).toBe(true);
        expect(esFolio("3f2a9c1e")).toBe(false);
        expect(esFolio("")).toBe(false);
    });
});
