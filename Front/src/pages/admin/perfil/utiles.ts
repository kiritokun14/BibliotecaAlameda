// Mi cuenta (perfil del personal dentro del panel, 22 nov 2026, T3): ayudas que no son componentes.
// Usa los mismos servicios que el perfil del portal (servicios/perfil.ts y la seguridad de Supabase): no hay backend nuevo.
import type { AccesoCuenta } from "../../../servicios/auth";
import { capacidadPanel, permisoPanel } from "../../../servicios/accesoPanel";
import { SECCIONES_MENU } from "../menu";
import type { NombreIcono } from "../piezasPanel";

export const RUTA_PERFIL = "/admin/perfil";

export type SeccionPerfil = "resumen" | "datos" | "avisos" | "seguridad";
export const APARTADOS: { valor: SeccionPerfil; ruta: string; texto: string; detalle: string; icono: NombreIcono }[] = [
    { valor: "resumen", ruta: RUTA_PERFIL, texto: "Mi cuenta", detalle: "Datos y lo que puedes hacer", icono: "usuario" },
    { valor: "datos", ruta: `${RUTA_PERFIL}/datos`, texto: "Mis datos", detalle: "Nombre y teléfono", icono: "contenido" },
    { valor: "avisos", ruta: `${RUTA_PERFIL}/avisos`, texto: "Avisos que recibo", detalle: "Cómo y cuándo te avisamos", icono: "aviso" },
    { valor: "seguridad", ruta: `${RUTA_PERFIL}/seguridad`, texto: "Seguridad", detalle: "Contraseña y sesión", icono: "cuentas" },
];

// Rol con su color de la leyenda (PanelPiezas.css, «Colores de los roles»)
const ROLES_PERSONAL = ["editor", "responsable_actividades", "administrador"];
export function tonoRol(acceso: AccesoCuenta | undefined) {
    const propios = (acceso?.roles ?? []).map((r) => r.rolCodigo).filter((r) => ROLES_PERSONAL.includes(r));
    return propios.length > 1 ? "varios" : propios[0] ?? "usuario";
}

// Lo que la cuenta puede abrir en el panel, por sección del menú (con los mismos permisos que el menú lateral)
const ICONO_SECCION: Record<string, NombreIcono> = { contenidos: "contenido", actividades: "calendario", participantes: "inscripciones", atencion: "mensajes", administracion: "cuentas" };
export function accesosPorSeccion(acceso: AccesoCuenta | undefined) {
    return SECCIONES_MENU.map((s) => {
        const puede = s.subitems.filter((sub) => {
            const capacidad = sub.capacidad ?? capacidadPanel(sub.ruta);
            return !!acceso && !!capacidad && permisoPanel(acceso, capacidad);
        });
        return { id: s.id, texto: s.texto, icono: ICONO_SECCION[s.id] ?? "lista", total: s.subitems.length, puede: puede.map((p) => p.texto), enlaces: puede.map((p) => ({ texto: p.texto, ruta: p.ruta })) };
    });
}

// Mismas reglas que el perfil del portal (perfil/datos.ts)
export function validarDatos(nombres: string, telefono: string) {
    const errores: { nombres?: string; telefono?: string } = {};
    const n = nombres.trim();
    if (!n) errores.nombres = "Escribe tu nombre.";
    else if (n.length > 150) errores.nombres = "Usa 150 caracteres o menos.";
    if (!/^\d{10}$/.test(telefono.trim())) errores.telefono = "Escribe un teléfono de 10 dígitos.";
    return errores;
}

export function validarContrasena(actual: string, nueva: string, confirmacion: string) {
    if (!actual) return "Escribe tu contraseña actual.";
    if (nueva.length < 8 || nueva.length > 128) return "La nueva contraseña debe tener entre 8 y 128 caracteres.";
    if (nueva === actual) return "La nueva contraseña debe ser distinta de la actual.";
    if (nueva !== confirmacion) return "La confirmación no coincide con la nueva contraseña.";
    return "";
}

export const CANALES = [
    { valor: "portal", texto: "En el portal" },
    { valor: "correo", texto: "Por correo" },
    { valor: "telefono", texto: "Por teléfono" },
    { valor: "whatsapp_manual", texto: "Por WhatsApp" },
] as const;

export function fechaLarga(iso: string) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "Sin registrar";
    const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(a, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

// «19 de noviembre de 2026» si el backend manda una fecha válida en actualizadoA
export function actualizadoEl(valor: string | null | undefined) {
    const f = valor ? new Date(valor) : null;
    return f && Number.isFinite(f.getTime()) ? f.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "";
}
