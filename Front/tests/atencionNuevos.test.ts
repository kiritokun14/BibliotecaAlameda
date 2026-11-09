import { describe, expect, it } from "vitest";
import { estadoAlPublicar, filtrarAvisos, siguienteFolio as folioAviso, validarAviso, vigencia, EJEMPLO as AVISOS, MAXIMO_MENSAJE } from "../src/pages/admin/atencion/avisos/datos";
import { buscarCuenta, enmascararCorreo, puedeEnviar, siguienteFolio as folioRecuperacion, CUENTAS } from "../src/pages/admin/atencion/recuperacion/datos";
import { estadoCuenta, nombreCompleto, ocultarCorreo } from "../src/servicios/cuentasAtencion";

describe("Atención · Avisos", () => {
    const valido = { titulo: "Cierre", tipo: "Cierre" as const, mensaje: "Cerrado el sábado.", desde: "2026-11-10", hasta: "2026-11-12", donde: "Inicio" };

    it("valida los campos obligatorios, el largo del mensaje y las fechas", () => {
        expect(validarAviso(valido)).toEqual({});
        expect(Object.keys(validarAviso({ ...valido, titulo: " ", mensaje: "", desde: "", hasta: "" }))).toEqual(["titulo", "mensaje", "desde", "hasta"]);
        expect(validarAviso({ ...valido, mensaje: "x".repeat(MAXIMO_MENSAJE + 1) }).mensaje).toMatch(/Máximo/);
        expect(validarAviso({ ...valido, hasta: "2026-11-01" }).hasta).toMatch(/antes/);
    });

    it("queda programado si todavía no empieza y publicado si ya empezó", () => {
        expect(estadoAlPublicar("2026-12-01", "2026-11-08")).toBe("programado");
        expect(estadoAlPublicar("2026-11-08", "2026-11-08")).toBe("publicado");
    });

    it("filtra por estado y busca sin importar acentos", () => {
        expect(filtrarAvisos(AVISOS, "publicado", "").every((a) => a.estado === "publicado")).toBe(true);
        expect(filtrarAvisos(AVISOS, "todos", "CATALOGO").map((a) => a.folio)).toEqual(["AV-0011"]);
    });

    it("escribe la vigencia y el siguiente folio", () => {
        expect(vigencia({ desde: "2026-12-01", hasta: "2026-12-31", estado: "programado" })).toBe("1 al 31 dic 2026");
        expect(vigencia({ desde: "2026-10-20", hasta: "2026-10-31", estado: "publicado" })).toBe("Hasta 31 oct 2026");
        expect(vigencia({ desde: "2026-10-12", hasta: "2026-10-12", estado: "archivado" })).toBe("12 oct 2026");
        expect(folioAviso(AVISOS)).toBe("AV-0014");
    });
});

describe("Atención · Recuperación asistida", () => {
    it("busca por correo, nombre o credencial con al menos 3 letras", () => {
        expect(buscarCuenta(CUENTAS, "persona.a")?.id).toBe("C-0214");
        expect(buscarCuenta(CUENTAS, "bsa-0071")?.id).toBe("C-0211");
        expect(buscarCuenta(CUENTAS, "pe")).toBeUndefined();
        expect(buscarCuenta(CUENTAS, "nadie@otro.mx")).toBeUndefined();
    });

    it("oculta el correo y exige los tres puntos obligatorios", () => {
        expect(enmascararCorreo("persona.a@correo.mx")).toBe("pe***@correo.mx");
        expect(puedeEnviar([true, true, true, false])).toBe(true);
        expect(puedeEnviar([true, true, false, true])).toBe(false);
        expect(folioRecuperacion([{ folio: "RA-0016", cuentaId: "", persona: "", fecha: "", resultado: "enviado", atendio: "" }])).toBe("RA-0017");
    });
});

describe("Atención · Consulta de cuentas", () => {
    it("nombra el estado de la cuenta como en las pantallas", () => {
        expect(estadoCuenta({ estatus: "activo", correoConfirmado: true })).toBe("Activa");
        expect(estadoCuenta({ estatus: "activo", correoConfirmado: false })).toBe("Pendiente de activar");
        expect(estadoCuenta({ estatus: "inactivo", correoConfirmado: true })).toBe("Suspendida");
        expect(estadoCuenta({ estatus: "bloqueado", correoConfirmado: true })).toBe("Bloqueada");
    });

    it("arma el nombre y oculta el correo", () => {
        expect(nombreCompleto({ nombres: "Ana", primerApellido: "López", segundoApellido: null })).toBe("Ana López");
        expect(ocultarCorreo("ana@correo.mx")).toBe("an***@correo.mx");
    });
});
