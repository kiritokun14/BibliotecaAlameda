import { expect, it } from "vitest";
import { imagenFallo, marcarImagenFallida } from "../src/servicios/imagenesFallidas";

it("recuerda las imágenes del servidor que fallaron, para mostrar el respaldo sin volver a esperar", () => {
    expect(imagenFallo("/api/contenidos/publicos/CN-1/imagen")).toBe(false);
    marcarImagenFallida("/api/contenidos/publicos/CN-1/imagen");
    expect(imagenFallo("/api/contenidos/publicos/CN-1/imagen")).toBe(true);
    expect(imagenFallo("/api/contenidos/publicos/CN-2/imagen")).toBe(false);
    expect(imagenFallo(undefined)).toBe(false);
    marcarImagenFallida(null); // sin dirección no se guarda nada
    expect(imagenFallo(null)).toBe(false);
});
