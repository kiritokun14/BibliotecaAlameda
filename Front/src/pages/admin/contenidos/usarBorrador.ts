import { guardarImagen } from "../../../servicios/imagenes";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { mensajeError } from "../../../servicios/api";
import { enviarAAutorizacion, guardar, type CambiosContenido, type Contenido, type TipoEditable } from "../../../servicios/contenidos";

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
export function useBorrador(tipo: TipoEditable, inicial?: Contenido, clave = "unico") {
    const navegar = useNavigate();
    const [tieneImagen, setTieneImagen] = useState(inicial?.tieneImagen ?? false);
    const imagenSubida = useRef<File | null | undefined>(undefined);
    const [folios, setFolios] = useState<Record<string, string>>(inicial ? { [clave]: inicial.folio } : {});
    const [guardados, setGuardados] = useState<Record<string, string>>(inicial ? { [clave]: inicial.actualizadoEn } : {});
    const bloqueo = useRef(false);
    const foliosActuales = useRef(folios);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState("");

    const folio = folios[clave] ?? null;
    const guardadoEn = guardados[clave];

    async function guardarYRecordar(cambios: CambiosContenido, imagen?: File | null) {
        let contenido = await guardar(foliosActuales.current[clave] ?? null, tipo, cambios);
        foliosActuales.current[clave] = contenido.folio;
        setFolios((a) => ({ ...a, [clave]: contenido.folio }));
        if (imagen !== undefined && imagen !== imagenSubida.current) {
            contenido = await guardarImagen(contenido.folio, imagen);
            imagenSubida.current = imagen;
        }
        setTieneImagen(contenido.tieneImagen ?? false);
        setGuardados((a) => ({ ...a, [clave]: contenido.actualizadoEn }));
        return contenido;
    }

    async function guardarBorrador(cambios: CambiosContenido, imagen?: File | null) {
        if (bloqueo.current) return;
        bloqueo.current = true;
        setOcupado(true);
        setError("");
        try {
            await guardarYRecordar(cambios, imagen);
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            bloqueo.current = false;
            setOcupado(false);
        }
    }

    // Guarda lo último que se escribió y luego lo envía
    async function enviar(cambios: CambiosContenido, nota: string, pantalla: DatosPantallaEnvio, imagen?: File | null) {
        if (bloqueo.current) return;
        bloqueo.current = true;
        setOcupado(true);
        setError("");
        try {
            const guardado = await guardarYRecordar(cambios, imagen);
            const enviado = await enviarAAutorizacion(guardado.folio, nota);
            navegar("/admin/contenidos/editor/enviado", {
                state: { ...pantalla, folio: enviado.folio, enviadoEn: enviado.enviadoEn ?? new Date().toISOString() },
            });
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            bloqueo.current = false;
            setOcupado(false);
        }
    }

    const detalle = guardadoEn ? `Guardado el ${formatoHora.format(new Date(guardadoEn))}` : "Sin guardar";
    return { folio, tieneImagen, guardadoEn, ocupado, error, detalle, guardarBorrador, enviar };
}
