import { useState } from "react";
import { useNavigate } from "react-router";
import { mensajeError } from "../../../servicios/api";
import { enviarAAutorizacion, guardar, type CambiosContenido, type Contenido, type TipoContenidoApi } from "../../../servicios/contenidos";

// Lógica compartida de los formularios: guardar borrador y enviar a autorización.
// El primer guardado crea el contenido y la base le asigna el folio.

type DatosPantallaEnvio = { tipo: string; queSeEnvia: string; titulo: string };

const formatoHora = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Lee un campo de texto de "datos" (lo que no sea texto se toma como vacío)
export function datoTexto(datos: Record<string, unknown> | undefined, clave: string) {
    const valor = datos?.[clave];
    return typeof valor === "string" ? valor : "";
}
export function datoSiNo(datos: Record<string, unknown> | undefined, clave: string, porDefecto: boolean) {
    const valor = datos?.[clave];
    return typeof valor === "boolean" ? valor : porDefecto;
}

// clave: permite llevar varios contenidos en una pantalla (las secciones de «Acerca de»)
export function useBorrador(tipo: TipoContenidoApi, inicial?: Contenido, clave = "unico") {
    const navegar = useNavigate();
    const [folios, setFolios] = useState<Record<string, string>>(inicial ? { [clave]: inicial.folio } : {});
    const [guardados, setGuardados] = useState<Record<string, string>>(inicial ? { [clave]: inicial.actualizadoEn } : {});
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState("");

    const folio = folios[clave] ?? null;
    const guardadoEn = guardados[clave];

    async function guardarYRecordar(cambios: CambiosContenido) {
        const contenido = await guardar(folio, tipo, cambios);
        setFolios((a) => ({ ...a, [clave]: contenido.folio }));
        setGuardados((a) => ({ ...a, [clave]: contenido.actualizadoEn }));
        return contenido;
    }

    async function guardarBorrador(cambios: CambiosContenido) {
        setOcupado(true);
        setError("");
        try {
            await guardarYRecordar(cambios);
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setOcupado(false);
        }
    }

    // Guarda lo último que se escribió y luego lo envía
    async function enviar(cambios: CambiosContenido, nota: string, pantalla: DatosPantallaEnvio) {
        setOcupado(true);
        setError("");
        try {
            const guardado = await guardarYRecordar(cambios);
            const enviado = await enviarAAutorizacion(guardado.folio, nota);
            navegar("/admin/contenidos/editor/enviado", {
                state: { ...pantalla, folio: enviado.folio, enviadoEn: enviado.enviadoEn ?? new Date().toISOString() },
            });
        } catch (e) {
            setError(mensajeError(e));
            setOcupado(false);
        }
    }

    const detalle = guardadoEn ? `Guardado el ${formatoHora.format(new Date(guardadoEn))}` : "Sin guardar";
    return { folio, ocupado, error, detalle, guardarBorrador, enviar };
}
