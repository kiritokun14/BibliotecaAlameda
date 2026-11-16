import { describe, expect, it } from 'vitest';
import {
    esMenorDeEdad, formatearFecha, nombreCompleto, porcentajeProgreso, seccionDeRuta, tipoDeCuenta,
    validarCorreo, validarDatos, type Domicilio,
} from '../src/pages/publico/perfil/datos';

const domicilio: Domicilio = {
    calle: 'Av. Allende', numeroExterior: '110', numeroInterior: '', colonia: 'Centro',
    codigoPostal: '63000', municipio: 'Tepic', estado: 'Nayarit',
};

describe('Perfil · datos de la persona', () => {
    it('arma el nombre completo sin segundo apellido vacío', () => {
        expect(nombreCompleto({ nombres: 'Ana', primerApellido: 'Pérez', segundoApellido: null })).toBe('Ana Pérez');
        expect(nombreCompleto({ nombres: 'Ana', primerApellido: 'Pérez', segundoApellido: 'Ruiz' })).toBe('Ana Pérez Ruiz');
    });
    it('formatea la fecha sin correr el día por la zona horaria', () => {
        expect(formatearFecha('2000-01-31')).toBe('31 / 01 / 2000');
        expect(formatearFecha('2000-01-31T00:00:00Z')).toBe('31 / 01 / 2000');
    });
    it('sabe si la persona es menor de edad el día de hoy', () => {
        const hoy = new Date(2026, 10, 3); // 3 nov 2026
        expect(esMenorDeEdad('2008-11-03', hoy)).toBe(false); // cumple 18 hoy
        expect(esMenorDeEdad('2008-11-04', hoy)).toBe(true);  // cumple 18 mañana
        expect(tipoDeCuenta('2015-05-01', hoy)).toBe('Cuenta de persona menor de edad');
        expect(tipoDeCuenta('1990-05-01', hoy)).toBe('Cuenta de persona adulta');
    });
    it('reconoce las secciones del menú y rechaza las que no existen', () => {
        expect(seccionDeRuta(undefined)).toBe('resumen');
        expect(seccionDeRuta('datos')).toBe('datos');
        expect(seccionDeRuta('otra')).toBeNull();
    });
    it('limita el progreso entre 0 y 100 %', () => {
        expect(porcentajeProgreso(3, 6)).toBe(50);
        expect(porcentajeProgreso(9, 6)).toBe(100);
        expect(porcentajeProgreso(1, 0)).toBe(0);
    });
});

describe('Perfil · validaciones de «Editar mis datos»', () => {
    it('acepta datos completos', () => {
        expect(validarDatos({ nombres: 'Ana', telefono: '3110000000' }, domicilio)).toEqual({});
    });
    it('marca nombre vacío, teléfono y código postal mal escritos', () => {
        const errores = validarDatos({ nombres: '  ', telefono: '311' }, { ...domicilio, codigoPostal: '630', calle: '' });
        expect(Object.keys(errores).sort()).toEqual(['calle', 'codigoPostal', 'nombres', 'telefono']);
    });
    it('el número interior es opcional', () => {
        expect(validarDatos({ nombres: 'Ana', telefono: '3110000000' }, { ...domicilio, numeroInterior: '' }).numeroInterior).toBeUndefined();
    });
    it('pide un correo válido y distinto al actual', () => {
        expect(validarCorreo('ana', 'ana@ejemplo.mx')).toBe('Escribe un correo válido.');
        expect(validarCorreo(' ANA@ejemplo.mx ', 'ana@ejemplo.mx')).toBe('Escribe un correo distinto al actual.');
        expect(validarCorreo('nuevo@ejemplo.mx', 'ana@ejemplo.mx')).toBe('');
    });
});
