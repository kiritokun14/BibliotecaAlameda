// Notificaciones: una sola lista con el centro y los avisos del servidor (src/pages/publico/notificaciones/avisosCambios.ts)
import { describe, expect, it } from "vitest";
import { enFiltros, marcable, tipoDe, unirNotificaciones } from "../src/pages/publico/notificaciones/avisosCambios";
import type { Notificacion } from "../src/pages/publico/notificaciones/datos";

describe("Notificaciones · lista única", () => {
    const centro: Notificacion[] = [
        { id: "n1", area: "credencial", titulo: "Tu credencial está en revisión", texto: "El personal la revisa.", cuando: "Hace 2 h", leida: false },
        { id: "n2", area: "avisos", titulo: "Aviso institucional", texto: "Horario de fin de año.", cuando: "Hace 1 semana", leida: true },
    ];
    const sesiones = [{ id: "a", titulo: "Cambio de sala", cuerpoAviso: "El taller pasa a la Sala general.", creadoEn: "2026-11-20T10:00:00Z" }];
    const cambios = [
        { id: "b", titulo: "Sesión cancelada", texto: "Se canceló el club del sábado.", fecha: "2026-11-21T10:00:00Z", leida: false },
        { id: "a", titulo: "Cambio de sala", texto: "El taller pasa a la Sala general.", fecha: "2026-11-20T10:00:00Z", leida: true },
    ];

    it("distingue cancelaciones de cambios", () => {
        expect(tipoDe("Sesión cancelada", "")).toBe("cancelacion");
        expect(tipoDe("Cambio de horario", "Ahora a las 17:00")).toBe("cambio");
    });

    it("junta todo sin repetir: primero lo que falta por leer", () => {
        const lista = unirNotificaciones(centro, sesiones, cambios);
        expect(lista.map((x) => x.id)).toEqual(["n1", "b", "n2", "a"]);
        expect(lista.find((x) => x.id === "a")).toMatchObject({ origen: "cambio", leida: true, area: "actividades" });
    });

    it("filtra por área y por lectura y sabe qué se puede marcar", () => {
        const lista = unirNotificaciones(centro, sesiones, cambios);
        expect(lista.filter((x) => enFiltros(x, "actividades", "todas")).map((x) => x.id)).toEqual(["b", "a"]);
        expect(lista.filter((x) => enFiltros(x, "todas", "sin-leer")).map((x) => x.id)).toEqual(["n1", "b"]);
        expect(lista.filter(marcable).map((x) => x.id)).toEqual(["n1", "b"]);
    });
});
