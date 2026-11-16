import { describe, expect, it } from "vitest";
import { accionesDisponibles, buscarFuentes } from "../src/pages/admin/comunidad/reglasFuentes";
import { prioridades, vistaEnlace } from "../src/pages/admin/resumen/datos";
import type { AccesoCuenta } from "../src/servicios/auth";

describe("Fuentes del asistente · estados de aprobación (HU-31)", () => {
    it("una fuente en borrador o en revisión no se puede activar sin aprobarse", () => {
        expect(accionesDisponibles({ estadoFuente: "borrador", activa: false }, true)).toEqual(["aprobar", "retirar", "version"]);
        expect(accionesDisponibles({ estadoFuente: "en_revision", activa: false }, true)).not.toContain("activar");
    });

    it("solo el administrador aprueba", () => {
        expect(accionesDisponibles({ estadoFuente: "en_revision", activa: false }, false)).toEqual(["retirar", "version"]);
    });

    it("una aprobada se activa a mano; una activa ya no muestra activar", () => {
        expect(accionesDisponibles({ estadoFuente: "aprobada", activa: false }, true)).toEqual(["devolver", "activar", "retirar", "version"]);
        expect(accionesDisponibles({ estadoFuente: "aprobada", activa: true }, true)).toEqual(["retirar", "version"]);
    });

    it("una retirada no admite acciones", () => {
        expect(accionesDisponibles({ estadoFuente: "retirada", activa: false }, true)).toEqual([]);
    });

    it("busca por título o tipo sin importar acentos", () => {
        const lista = [{ tituloFuente: "Reglamento de préstamo", tipoFuente: "Documento" }, { tituloFuente: "Horarios", tipoFuente: "Página" }];
        expect(buscarFuentes(lista, "PRESTAMO")).toHaveLength(1);
        expect(buscarFuentes(lista, "pagina")[0].tituloFuente).toBe("Horarios");
        expect(buscarFuentes(lista, " ")).toHaveLength(2);
    });
});

describe("Resumen: accesos según permisos", () => {
    const cuenta = (capacidades: string[]): AccesoCuenta => ({ usuarioId: "u", roles: [{ rolCodigo: "r", capacidades }], permisosAdicionales: [] });

    it("enlaza solo si la cuenta tiene el permiso de esa pantalla", () => {
        expect(vistaEnlace("/admin/contenidos/revision", cuenta(["publicar_contenidos"]))).toBe("enlace");
        expect(vistaEnlace("/admin/atencion/contactos", cuenta(["preparar_contenidos"]))).toBe("oculto");
        expect(vistaEnlace("/admin/atencion/contactos", null)).toBe("oculto");
    });

    it("una pantalla que todavía no existe se marca como «pronto»", () => {
        expect(vistaEnlace("/admin/no-existe", cuenta([]))).toBe("pronto");
    });

    it("una cuenta de editor no ve prioridades de otras áreas", () => {
        const editor = cuenta(["preparar_contenidos"]);
        expect(prioridades.filter((p) => vistaEnlace(p.ruta, editor) !== "oculto")).toEqual([]);
    });
});
