import { describe, expect, it } from "vitest";
import { EJEMPLO, eliminarLeidas, filtrarNotificaciones, marcarLeida, marcarTodasLeidas, sinLeer } from "../src/pages/admin/notificaciones/datos";

describe("Notificaciones del panel", () => {
    it("cuenta las que no se han leído", () => {
        expect(sinLeer(EJEMPLO)).toBe(3);
    });

    it("filtra por sin leer, por área y por texto sin importar acentos", () => {
        expect(filtrarNotificaciones(EJEMPLO, "todas", "")).toHaveLength(5);
        expect(filtrarNotificaciones(EJEMPLO, "sin-leer", "").every((n) => !n.leida)).toBe(true);
        expect(filtrarNotificaciones(EJEMPLO, "contenidos", "").map((n) => n.id)).toEqual(["CN-0030"]);
        expect(filtrarNotificaciones(EJEMPLO, "todas", "CREDENCIAL").map((n) => n.id)).toEqual(["CT-0051"]);
        expect(filtrarNotificaciones(EJEMPLO, "atencion", "asistencia")).toHaveLength(0);
    });

    it("marca una o todas como leídas sin cambiar la lista original", () => {
        const una = marcarLeida(EJEMPLO, "PR-0013");
        expect(sinLeer(una)).toBe(2);
        expect(sinLeer(EJEMPLO)).toBe(3);
        expect(sinLeer(marcarTodasLeidas(EJEMPLO))).toBe(0);
    });

    it("eliminar leídas conserva las pendientes", () => {
        const quedan = eliminarLeidas(EJEMPLO);
        expect(quedan).toHaveLength(3);
        expect(quedan.every((n) => !n.leida)).toBe(true);
        expect(eliminarLeidas(marcarTodasLeidas(EJEMPLO))).toEqual([]);
    });
});
