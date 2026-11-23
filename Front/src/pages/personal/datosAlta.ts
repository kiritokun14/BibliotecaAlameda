// Altas asistidas: reglas puras del formulario y de las solicitudes (pruebas en tests/altaAsistida.test.ts).
import { mensajeError, ErrorServicio } from "../../servicios/api";
import type { DatosAltaAsistida } from "../../servicios/altaAsistida";
import { calcularEdad, esCorreoValido, tieneDigitos, MENSAJE_CORREO, MENSAJE_OBLIGATORIO } from "../../servicios/validaciones";

// Mismos campos que Crear cuenta, sin contraseña: el titular la elige desde la invitación (HU-09).
export const datosIniciales = {
    nombre: "", primerApellido: "", segundoApellido: "", fechaNacimiento: "", telefono: "",
    calle: "", numeroExterior: "", numeroInterior: "", colonia: "", codigoPostal: "", municipio: "", estado: "Nayarit",
    tutorNombre: "", tutorApellidos: "", tutorTelefono: "", tutorCorreo: "", tutorRelacion: "",
    tutorCalle: "", tutorNumeroExterior: "", tutorNumeroInterior: "", tutorColonia: "",
    tutorCodigoPostal: "", tutorMunicipio: "", tutorEstado: "Nayarit",
    correo: "", motivo: "",
};

export type DatosFormulario = typeof datosIniciales;
export type Errores = Partial<Record<keyof DatosFormulario | "privacidad", string>>;

const obligatorios: (keyof DatosFormulario)[] = [
    "nombre", "primerApellido", "fechaNacimiento", "telefono", "calle", "numeroExterior",
    "colonia", "codigoPostal", "municipio", "estado", "correo", "motivo",
];
export const obligatoriosTutor: (keyof DatosFormulario)[] = ["tutorNombre", "tutorApellidos", "tutorTelefono", "tutorCorreo", "tutorRelacion"];
export const domicilioTutor: (keyof DatosFormulario)[] = ["tutorCalle", "tutorNumeroExterior", "tutorColonia", "tutorCodigoPostal", "tutorMunicipio", "tutorEstado"];

export function validar(datos: DatosFormulario, aceptaPrivacidad: boolean, conTutor: boolean, mismoDomicilio: boolean): Errores {
    const errores: Errores = {};
    const requeridos = [...obligatorios, ...(conTutor ? obligatoriosTutor : []), ...(conTutor && !mismoDomicilio ? domicilioTutor : [])];
    for (const campo of requeridos) {
        if (datos[campo].trim() === "") errores[campo] = MENSAJE_OBLIGATORIO;
    }
    if (datos.fechaNacimiento && (!Number.isFinite(calcularEdad(datos.fechaNacimiento)) || calcularEdad(datos.fechaNacimiento) < 0))
        errores.fechaNacimiento = "Revisa la fecha de nacimiento.";
    if (datos.telefono && !tieneDigitos(datos.telefono, 10)) errores.telefono = "El teléfono debe tener 10 dígitos.";
    if (datos.codigoPostal && !tieneDigitos(datos.codigoPostal, 5)) errores.codigoPostal = "El código postal debe tener 5 dígitos.";
    if (datos.correo && !esCorreoValido(datos.correo)) errores.correo = MENSAJE_CORREO;
    if (datos.motivo.length > 500) errores.motivo = "Máximo 500 caracteres.";
    if (conTutor) {
        if (datos.tutorTelefono && !tieneDigitos(datos.tutorTelefono, 10)) errores.tutorTelefono = "El teléfono debe tener 10 dígitos.";
        if (datos.tutorCorreo && !esCorreoValido(datos.tutorCorreo)) errores.tutorCorreo = MENSAJE_CORREO;
        if (!mismoDomicilio && datos.tutorCodigoPostal && !tieneDigitos(datos.tutorCodigoPostal, 5))
            errores.tutorCodigoPostal = "El código postal debe tener 5 dígitos.";
    }
    if (!aceptaPrivacidad) errores.privacidad = "Confirma que la persona leyó y aceptó el aviso de privacidad.";
    return errores;
}

export function armarSolicitud(datos: DatosFormulario, conTutor: boolean, mismoDomicilio: boolean): DatosAltaAsistida {
    const domicilio = {
        calle: datos.calle.trim(), numeroExterior: datos.numeroExterior.trim(),
        ...(datos.numeroInterior.trim() ? { numeroInterior: datos.numeroInterior.trim() } : {}),
        coloniaLocalidad: datos.colonia.trim(), codigoPostal: datos.codigoPostal.trim(),
        municipio: datos.municipio.trim(), estadoProvincia: datos.estado.trim(),
    };
    return {
        nombres: datos.nombre.trim(), primerApellido: datos.primerApellido.trim(),
        ...(datos.segundoApellido.trim() ? { segundoApellido: datos.segundoApellido.trim() } : {}),
        fechaNacimiento: datos.fechaNacimiento, telefono: datos.telefono.trim(), domicilio,
        correo: datos.correo.trim(), aceptaAviso: true, motivo: datos.motivo.trim(),
        ...(conTutor ? { tutor: {
            nombres: datos.tutorNombre.trim(), apellidos: datos.tutorApellidos.trim(),
            telefono: datos.tutorTelefono.trim(), correo: datos.tutorCorreo.trim(),
            relacion: datos.tutorRelacion === "Madre" ? "madre" : datos.tutorRelacion === "Padre" ? "padre" : "tutor",
            domicilio: mismoDomicilio ? { ...domicilio } : {
                calle: datos.tutorCalle.trim(), numeroExterior: datos.tutorNumeroExterior.trim(),
                ...(datos.tutorNumeroInterior.trim() ? { numeroInterior: datos.tutorNumeroInterior.trim() } : {}),
                coloniaLocalidad: datos.tutorColonia.trim(), codigoPostal: datos.tutorCodigoPostal.trim(),
                municipio: datos.tutorMunicipio.trim(), estadoProvincia: datos.tutorEstado.trim(),
            },
        } } : {}),
    } as DatosAltaAsistida;
}

// Dirección de la pantalla, dentro de Atención (la vieja /personal/alta-asistida redirige aquí)
export const RUTA = "/admin/atencion/altas-asistidas";
export type Vista = "nueva" | "solicitudes";
export type FiltroSolicitud = "todas" | "en_revision" | "lista";
// Estado del servicio en el servidor: «apagado» cuando responde 503 (todavía no habilitado)
export type Servicio = { estado: "cargando" | "listo" | "apagado" | "error"; mensaje?: string };

export const POR_PAGINA = 5;
export const lleno = (v: string) => v.trim() !== "";
export const nombreDe = (s: { nombres: string; primerApellido: string; segundoApellido: string | null }) =>
    [s.nombres, s.primerApellido, s.segundoApellido].filter(Boolean).join(" ");

// Lo que dice el servidor al fallar: 503 = el alta asistida todavía no está habilitada (ALTA_ASISTIDA_HABILITADA en Back/.env)
export const servicioConError = (error: unknown): Servicio =>
    ({ estado: error instanceof ErrorServicio && error.estado === 503 ? "apagado" : "error", mensaje: mensajeError(error) });

// Edad cumplida, o null si la fecha todavía no se escribe o no es válida
export function edadDe(fechaNacimiento: string) {
    if (!fechaNacimiento) return null;
    const edad = calcularEdad(fechaNacimiento);
    return Number.isFinite(edad) && edad >= 0 ? edad : null;
}
