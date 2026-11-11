// Contacto y sugerencias (T-053).
// Aquí están los datos de la tarjeta "Cómo encontrarnos", las reglas del formulario
// y la función que envía el mensaje. Backend solo tiene que sustituir enviarMensaje().
import { esCorreoValido } from "../../../servicios/validaciones";

// ---------- Datos de la biblioteca ----------

// TODO backend: estos datos vendrán de la información institucional.
// null = la biblioteca todavía no lo confirma; se muestra la pastilla «Por confirmar».
export type DatosBiblioteca = {
    direccion: string;
    horario: string;
    telefono: string | null;
    correo: string | null;
};

export const datosBiblioteca: DatosBiblioteca = {
    direccion: "Av. Allende s/n esq. Oaxaca, Parque Alameda, Tepic, Nayarit",
    horario: "Lunes a viernes de 8:00 a 19:30 h · Sábados de 9:00 a 14:00 h",
    telefono: "311 212 8989",
    correo: "bp0165@dgb.gob.mx",
};

// ---------- Formulario ----------

export type TipoMensaje = "contacto" | "sugerencia";

export type MensajeContacto = {
    tipo: TipoMensaje;
    nombre: string;
    correo: string;
    telefono: string; // opcional: cadena vacía si no lo escriben
    mensaje: string;
};

export type CampoMensaje = "nombre" | "correo" | "telefono" | "mensaje";
export type ErroresMensaje = Partial<Record<CampoMensaje, string>>;

export const LIMITES = { nombre: 120, correo: 254, telefono: 20, mensaje: 2000 } as const;

// Textos que cambian según la opción elegida en el selector
export const textosPorTipo: Record<TipoMensaje, {
    descripcion: string;
    marcador: string;
    ayudaMensaje: string;
    boton: string;
    enviado: { etiqueta: string; titulo: string };
}> = {
    contacto: {
        descripcion: "Para preguntas o gestiones con la biblioteca.",
        marcador: "Escribe tu pregunta o comentario",
        ayudaMensaje: "Cuéntanos con el mayor detalle posible.",
        boton: "Enviar mensaje",
        enviado: { etiqueta: "MENSAJE ENVIADO", titulo: "Gracias, recibimos tu mensaje" },
    },
    sugerencia: {
        descripcion: "Comparte una idea para mejorar nuestros servicios.",
        marcador: "Cuéntanos tu idea para mejorar la biblioteca",
        ayudaMensaje: "Describe tu idea y cómo ayudaría a otras personas.",
        boton: "Enviar sugerencia",
        enviado: { etiqueta: "SUGERENCIA ENVIADA", titulo: "Gracias, recibimos tu sugerencia" },
    },
};

// El teléfono es opcional; si lo escriben, deben ser 10 dígitos (se permiten espacios y guiones)
export function limpiarTelefono(telefono: string) {
    return telefono.replace(/[\s-]/g, "");
}

// Devuelve solo los campos con error; un objeto vacío significa que se puede enviar
export function validarMensaje(datos: MensajeContacto): ErroresMensaje {
    const errores: ErroresMensaje = {};
    if (!datos.nombre.trim()) errores.nombre = "Escribe tu nombre para saber cómo llamarte.";
    if (!datos.correo.trim()) errores.correo = "Escribe tu correo para que podamos responderte.";
    else if (!esCorreoValido(datos.correo)) errores.correo = "Escribe un correo válido, por ejemplo nombre@correo.mx";
    if (datos.telefono.trim() && !/^[0-9]{10}$/.test(limpiarTelefono(datos.telefono))) {
        errores.telefono = "Escribe 10 dígitos, por ejemplo 311 123 4567.";
    }
    if (!datos.mensaje.trim()) {
        errores.mensaje = datos.tipo === "contacto"
            ? "Escribe tu mensaje para poder enviarlo."
            : "Escribe tu sugerencia para poder enviarla.";
    }
    return errores;
}

// Lo que se manda a backend: sin espacios sobrantes y el teléfono solo con dígitos
export function prepararEnvio(datos: MensajeContacto): MensajeContacto {
    return {
        tipo: datos.tipo,
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim(),
        telefono: limpiarTelefono(datos.telefono.trim()),
        mensaje: datos.mensaje.trim(),
    };
}

// ---------- Servicio (lo que backend debe sustituir) ----------

export type RespuestaEnvio = {
    folio: string; // identificador que backend asigna al mensaje
};

export async function enviarMensaje(datos: MensajeContacto): Promise<RespuestaEnvio> {
    const { registrarContacto } = await import('../../../servicios/atencionComunidad');
    const acuse = await registrarContacto(datos);
    if (!acuse?.id) throw new Error('No se pudo confirmar el registro.');
    return {folio:acuse.id};
}
