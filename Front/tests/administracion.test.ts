import { describe, expect, it } from "vitest";
import { CONFIGURACION_INICIAL, MOVIMIENTOS, estadisticas, filtrarBitacora, hayCambios, porcentaje, validarConfiguracion } from "../src/pages/admin/administracion/datos";
import { capacidadAdmiteRoles, capacidadesDe, rolesDe } from "../src/servicios/cuentasAtencion";

const sinFiltros = { modulo: "todos" as const, texto: "", tipo: "todos" as const, desde: "", hasta: "" };

describe("Administración · Cuentas y permisos", () => {
    it("aplica las mismas reglas de roles que el backend", () => {
        expect(capacidadAdmiteRoles("gestionar_actividades", ["editor"])).toBe(false);
        expect(capacidadAdmiteRoles("gestionar_actividades", ["responsable_actividades"])).toBe(true);
        expect(capacidadAdmiteRoles("preparar_contenidos", [])).toBe(false);
        expect(capacidadAdmiteRoles("preparar_contenidos", ["editor"])).toBe(true);
        expect(capacidadAdmiteRoles("publicar_contenidos", ["administrador"])).toBe(true);
        expect(capacidadAdmiteRoles("enviar_avisos", [])).toBe(true);
    });

    it("lee roles y capacidades globales de la cuenta", () => {
        const cuenta = { roles: [{ rolCodigo: "usuario" }, { rolCodigo: "editor" }], permisosAdicionales: [
            { capacidad: "preparar_contenidos", ambito: "global" as const, actividadId: null },
            { capacidad: "registrar_asistencia", ambito: "actividades_asignadas" as const, actividadId: "a1" },
        ] };
        expect(rolesDe(cuenta)).toEqual(["usuario", "editor"]);
        expect(capacidadesDe(cuenta)).toEqual(["preparar_contenidos"]);
    });
});

describe("Administración · Estadísticas", () => {
    it("da indicadores, una serie de 5 semanas y su tabla para cada sección", () => {
        for (const seccion of ["portal", "actividades", "contenidos"] as const) {
            const d = estadisticas(seccion, "30dias");
            expect(d.indicadores).toHaveLength(4);
            expect(d.serie).toHaveLength(5);
            expect(d.tabla.length).toBeGreaterThan(0);
        }
        expect(estadisticas("portal", "anio").serie[0].valor).toBeGreaterThan(estadisticas("portal", "30dias").serie[0].valor);
        expect(porcentaje(25, 100)).toBe("25%");
        expect(porcentaje(1, 0)).toBe("0%");
    });
});

describe("Administración · Bitácora", () => {
    it("filtra por módulo, tipo, fechas y texto", () => {
        expect(filtrarBitacora(MOVIMIENTOS, sinFiltros)).toHaveLength(MOVIMIENTOS.length);
        expect(filtrarBitacora(MOVIMIENTOS, { ...sinFiltros, modulo: "Contenidos" }).map((m) => m.folio)).toEqual(["BT-1479"]);
        expect(filtrarBitacora(MOVIMIENTOS, { ...sinFiltros, tipo: "Sensible" }).every((m) => m.tipo === "Sensible")).toBe(true);
        expect(filtrarBitacora(MOVIMIENTOS, { ...sinFiltros, desde: "2026-10-28" }).map((m) => m.folio)).toEqual(["BT-1482", "BT-1481"]);
        expect(filtrarBitacora(MOVIMIENTOS, { ...sinFiltros, texto: "ASISTENCIA" }).map((m) => m.folio)).toEqual(["BT-1481"]);
    });
});

describe("Administración · Configuración", () => {
    it("pide los datos obligatorios y revisa horarios y números", () => {
        const errores = validarConfiguracion(CONFIGURACION_INICIAL);
        expect(errores.correo).toBeDefined(); // el correo inicial está vacío
        const valida = { ...CONFIGURACION_INICIAL, correo: "contacto@biblioteca.mx" };
        expect(validarConfiguracion(valida)).toEqual({});
        expect(validarConfiguracion({ ...valida, horarios: [{ dia: "Lunes", abre: "20:00", cierra: "09:00", abierto: true }] }).horarios).toBeDefined();
        expect(validarConfiguracion({ ...valida, cupoMaximo: 0 }).cupoMaximo).toBeDefined();
        expect(validarConfiguracion({ ...valida, mantenimiento: true, mensajeMantenimiento: " " }).mensajeMantenimiento).toBeDefined();
    });

    it("detecta cambios sin guardar", () => {
        expect(hayCambios(CONFIGURACION_INICIAL, { ...CONFIGURACION_INICIAL })).toBe(false);
        expect(hayCambios(CONFIGURACION_INICIAL, { ...CONFIGURACION_INICIAL, ciudad: "Tepic" })).toBe(true);
    });
});
