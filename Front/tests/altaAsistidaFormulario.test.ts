// Altas asistidas: reglas del formulario (src/pages/personal/datosAlta.ts) y fechas de Servicios Digitales.
import { describe, expect, it } from "vitest";
import { armarSolicitud, datosIniciales, edadDe, servicioConError, validar } from "../src/pages/personal/datosAlta";
import { fechaCorta, fechaHora } from "../src/pages/admin/atencion/comun/fechas";
import { ErrorServicio } from "../src/servicios/api";

const adulta = {
    ...datosIniciales, nombre: "Ana", primerApellido: "López", fechaNacimiento: "1990-05-10", telefono: "3111234567",
    calle: "Juárez", numeroExterior: "10", colonia: "Centro", codigoPostal: "63000", municipio: "Tepic",
    correo: "ana@correo.mx", motivo: "No tiene computadora",
};

describe("Altas asistidas: formulario", () => {
    it("acepta a una persona adulta con todos sus datos", () => {
        expect(validar(adulta, true, false, false)).toEqual({});
    });

    it("pide el aviso de privacidad y revisa teléfono, código postal y correo", () => {
        const errores = validar({ ...adulta, telefono: "311", codigoPostal: "63", correo: "ana@" }, false, false, false);
        expect(Object.keys(errores).sort()).toEqual(["codigoPostal", "correo", "privacidad", "telefono"]);
    });

    it("con una persona menor pide al tutor y, si vive en otro domicilio, también el suyo", () => {
        expect(validar(adulta, true, true, true)).toHaveProperty("tutorNombre");
        expect(validar(adulta, true, true, true)).not.toHaveProperty("tutorCalle");
        expect(validar(adulta, true, true, false)).toHaveProperty("tutorCalle");
    });

    it("arma la solicitud sin campos vacíos y copia el domicilio al tutor", () => {
        const s = armarSolicitud({ ...adulta, tutorNombre: "Luis", tutorApellidos: "López", tutorRelacion: "Padre" }, true, true);
        expect(s).not.toHaveProperty("segundoApellido");
        expect(s.domicilio).not.toHaveProperty("numeroInterior");
        expect(s.tutor?.relacion).toBe("padre");
        expect(s.tutor?.domicilio).toEqual(s.domicilio);
    });

    it("calcula la edad solo con una fecha válida", () => {
        expect(edadDe("")).toBeNull();
        expect(edadDe("3000-01-01")).toBeNull();
        expect(edadDe("2000-01-01")).toBeGreaterThan(20);
    });

    it("distingue el servicio sin habilitar (503) de un error", () => {
        expect(servicioConError(new ErrorServicio("apagado", 503)).estado).toBe("apagado");
        expect(servicioConError(new ErrorServicio("falló", 500)).estado).toBe("error");
    });
});

describe("Servicios Digitales: fechas", () => {
    it("escribe la fecha de nacimiento sin correr el día", () => {
        expect(fechaCorta("2014-03-05")).toBe("5 mar 2014");
        expect(fechaCorta("sin fecha")).toBe("sin fecha");
    });

    it("da fecha y hora en la zona de la biblioteca", () => {
        expect(fechaHora("2026-11-22T18:30:00Z")).toMatch(/2026/);
    });
});
