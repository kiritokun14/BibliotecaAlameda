// Precarga del menú del panel: al pasar el mouse (o llegar con el teclado) a un enlace se descarga el código
// de esa pantalla y, en las de Atención, se piden sus datos. Al hacer clic casi todo ya está listo.
// Los datos quedan en la memoria de servicios/consultas.ts (las peticiones repetidas se juntan).
import { listarTramites } from "../../servicios/tramites";
import { bandejaEspacios } from "../../servicios/espacios";
import { listarAvisos } from "../../servicios/avisos";
import { listarActividades } from "../../servicios/actividades";
import { listarActividadesInscripciones } from "../../servicios/inscripciones";
import { consultarPendientesForo } from "../../servicios/foro";
import { listarReportesForo } from "../../servicios/moderacion";
import { listarEvidencias } from "../../servicios/evidencias";
import { consultarConMemoria } from "../../servicios/consultas";
import { CLAVE_LISTA } from "./actividades/evidencias";

const sinError = (promesa: Promise<unknown>) => { promesa.catch(() => undefined); };

const PRECARGAS: Record<string, () => void> = {
    "/admin/resumen": () => sinError(import("./resumen/Resumen.tsx")),
    "/admin/contenidos/editor": () => sinError(import("./contenidos/EditorContenidos.tsx")),
    "/admin/contenidos/revision": () => sinError(import("./revision/Revision.tsx")),
    "/admin/actividades/propuestas": () => { sinError(import("./actividades/GestionActividades.tsx")); sinError(listarActividades()); },
    "/admin/actividades/calendario": () => sinError(import("./actividades/Calendario.tsx")),
    "/admin/actividades/visitas": () => sinError(import("./actividades/Visitas.tsx")),
    "/admin/actividades/cambios": () => sinError(import("./actividades/Cambios.tsx")),
    "/admin/actividades/inscripciones": () => { sinError(import("./actividades/Inscripciones.tsx")); sinError(listarActividadesInscripciones(0)); },
    "/admin/actividades/asistencia": () => sinError(import("./actividades/Asistencia.tsx")),
    "/admin/actividades/evidencias": () => { sinError(import("./actividades/Evidencias.tsx")); sinError(consultarConMemoria(CLAVE_LISTA, listarEvidencias)); },
    "/admin/participantes/progreso": () => sinError(import("./participantes/Progreso.tsx")),
    "/admin/participantes/cotejo": () => sinError(import("./participantes/Cotejo.tsx")),
    "/admin/participantes/foro": () => { sinError(import("./participantes/ModeracionForo.tsx")); sinError(consultarPendientesForo(0)); sinError(listarReportesForo(0, "pendiente")); },
    "/admin/atencion/credenciales": () => { sinError(import("./atencion/AtencionTramites.tsx")); sinError(listarTramites("credencial", false)); },
    "/admin/atencion/propuestas": () => { sinError(import("./atencion/AtencionTramites.tsx")); sinError(listarTramites("propuesta", false)); },
    "/admin/atencion/espacios": () => { sinError(import("./atencion/espacios/Espacios.tsx")); sinError(bandejaEspacios()); },
    "/admin/atencion/avisos": () => { sinError(import("./atencion/AvisosManuales.tsx")); sinError(listarAvisos()); },
    "/admin/atencion/contactos": () => sinError(import("./comunidad/AtencionComunidad")),
    "/admin/atencion/recuperacion": () => sinError(import("./atencion/recuperacion/Recuperacion.tsx")),
    "/admin/atencion/cuentas": () => sinError(import("./atencion/cuentas/Cuentas.tsx")),
    "/admin/administracion/cuentas": () => sinError(import("./administracion/CuentasPermisos.tsx")),
    "/admin/administracion/fuentes": () => sinError(import("./comunidad/Fuentes")),
    "/admin/administracion/estadisticas": () => sinError(import("./administracion/Estadisticas.tsx")),
    "/admin/administracion/bitacora": () => sinError(import("./administracion/Bitacora.tsx")),
    "/admin/administracion/configuracion": () => sinError(import("./administracion/Configuracion.tsx")),
};

// Como mucho una precarga cada 20 s por ruta, aunque se pase el mouse muchas veces
const ultima = new Map<string, number>();
export function precargarPanel(ruta: string) {
    const precarga = PRECARGAS[ruta];
    if (!precarga) return;
    const ahora = Date.now();
    if (ahora - (ultima.get(ruta) ?? 0) < 20000) return;
    ultima.set(ruta, ahora);
    precarga();
}
