import { describe, expect, it } from 'vitest';
import { prepararEnvio, validarMensaje, type MensajeContacto } from '../src/pages/publico/contacto/datos';

const valido: MensajeContacto = {
    tipo: 'contacto',
    nombre: 'Ana López',
    correo: 'ana.lopez@correo.mx',
    telefono: '',
    mensaje: 'Quisiera saber si puedo consultar el archivo histórico.',
};

describe('Formulario de contacto y sugerencias (T-053)', () => {
    it('un mensaje completo no tiene errores', () => {
        expect(validarMensaje(valido)).toEqual({});
    });

    it('nombre, correo y mensaje son obligatorios', () => {
        const errores = validarMensaje({ ...valido, nombre: '  ', correo: '', mensaje: '' });
        expect(Object.keys(errores).sort()).toEqual(['correo', 'mensaje', 'nombre']);
    });

    it('el correo incompleto muestra el texto de Figma', () => {
        expect(validarMensaje({ ...valido, correo: 'ana.lopez@' }).correo)
            .toBe('Escribe un correo válido, por ejemplo nombre@correo.mx');
    });

    it('el teléfono es opcional, pero si se escribe deben ser 10 dígitos', () => {
        expect(validarMensaje({ ...valido, telefono: '311 123 4567' }).telefono).toBeUndefined();
        expect(validarMensaje({ ...valido, telefono: '311-123-4567' }).telefono).toBeUndefined();
        expect(validarMensaje({ ...valido, telefono: '3111' }).telefono).toBeDefined();
        expect(validarMensaje({ ...valido, telefono: 'abc' }).telefono).toBeDefined();
    });

    it('el aviso del mensaje vacío cambia en sugerencias', () => {
        expect(validarMensaje({ ...valido, mensaje: '' }).mensaje).toBe('Escribe tu mensaje para poder enviarlo.');
        expect(validarMensaje({ ...valido, tipo: 'sugerencia', mensaje: '' }).mensaje).toBe('Escribe tu sugerencia para poder enviarla.');
    });

    it('lo que se envía va sin espacios sobrantes y el teléfono solo con dígitos', () => {
        expect(prepararEnvio({ ...valido, nombre: '  Ana López ', telefono: ' 311 123 4567 ' })).toEqual({
            ...valido,
            telefono: '3111234567',
        });
    });
});
