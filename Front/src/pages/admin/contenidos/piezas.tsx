import { useEffect, useState, type ReactNode } from "react";
import ImagenContenido from "../../../components/ImagenContenido";
import { validarArchivoImagen } from "../../../servicios/imagenes";
import { Link } from "react-router";

// Piezas compartidas por las pantallas de Contenidos

// Íconos de línea; toman el color del texto que los rodea
function Icono({ children }: { children: ReactNode }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {children}
        </svg>
    );
}
export const IconoLapiz = () => <Icono><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icono>;
export const IconoReloj = () => <Icono><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icono>;
export const IconoAviso = () => <Icono><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" /></Icono>;
export const IconoInfo = () => <Icono><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></Icono>;
export const IconoLista = () => <Icono><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Icono>;
export const IconoBuscar = () => <Icono><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icono>;
export const IconoMas = () => <Icono><path d="M12 5v14M5 12h14" /></Icono>;
export const IconoFlechaIzq = () => <Icono><path d="M19 12H5M12 19l-7-7 7-7" /></Icono>;
export const IconoBandera = () => <Icono><path d="M4 22V4" /><path d="M4 4h12l-2 4 2 4H4" /></Icono>;
export const IconoImagen = () => <Icono><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></Icono>;
export const IconoDocumento = () => <Icono><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M9 13h6M9 17h4" /></Icono>;

// Ruta de migas: Contenidos › Editor de contenidos › (pantalla actual)
export function Migas({ actual }: { actual: string }) {
    return (
        <nav className="contenidos-migas" aria-label="Ruta">
            <span>Contenidos</span>
            <span aria-hidden="true">›</span>
            <Link to="/admin/contenidos/editor">Editor de contenidos</Link>
            <span aria-hidden="true">›</span>
            <strong aria-current="page">{actual}</strong>
        </nav>
    );
}

// ---------- Piezas de los formularios de redacción ----------

export function Campo({ id, etiqueta, obligatorio, ayuda, children }: { id: string; etiqueta: string; obligatorio?: boolean; ayuda?: string; children: ReactNode }) {
    return (
        <div className="contenidos-campo">
            <label htmlFor={id}>
                {etiqueta}
                {obligatorio && <span className="contenidos-campo__obligatorio"> *</span>}
            </label>
            {children}
            {ayuda && <p id={`${id}-ayuda`} className="contenidos-campo__ayuda">{ayuda}</p>}
        </div>
    );
}

export function Interruptor({ id, titulo, texto, activo, alCambiar }: { id: string; titulo: string; texto?: string; activo: boolean; alCambiar: (v: boolean) => void }) {
    return (
        <label htmlFor={id} className="contenidos-interruptor">
            <input id={id} type="checkbox" role="switch" checked={activo} onChange={(e) => alCambiar(e.target.checked)} />
            <span className="contenidos-interruptor__pista" aria-hidden="true" />
            <span>
                <strong>{titulo}</strong>
                {texto && <small>{texto}</small>}
            </span>
        </label>
    );
}

// Zona para elegir una imagen (JPG o PNG)
export function SubirImagen({ id, archivo, detalle, alCambiar, folio, tieneImagen, version }: {
    id: string; archivo: File | null | undefined; detalle: string; alCambiar: (f: File | null) => void;
    folio?: string | null; tieneImagen?: boolean; version?: string;
}) {
    const [error, setError] = useState("");
    const [previa, setPrevia] = useState<{ archivo: File; url: string } | null>(null);
    useEffect(() => {
        if (!archivo) return;
        const lector = new FileReader(); let vigente = true;
        lector.onload = () => { if (vigente) setPrevia({ archivo, url: String(lector.result) }); };
        lector.readAsDataURL(archivo);
        return () => { vigente = false; if (lector.readyState === FileReader.LOADING) lector.abort(); };
    }, [archivo]);
    function elegir(nuevo: File | undefined) {
        if (!nuevo) return;
        const fallo = validarArchivoImagen(nuevo);
        if (fallo) { setError(fallo); return; }
        setError(""); alCambiar(nuevo);
    }
    return <div>
        <label htmlFor={id} className="contenidos-subir" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); elegir(e.dataTransfer.files[0]); }}>
            <span className="contenidos-subir__icono"><IconoImagen /></span>
            <strong>{archivo ? archivo.name : "Arrastra una imagen o elige un archivo"}</strong>
            <span>{detalle} · JPG/PNG hasta 5 MB</span>
            <span>La imagen se conserva al guardar y solo se hace pública al publicar el contenido.</span>
            <input id={id} type="file" accept="image/jpeg,image/png" onChange={e => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {error && <p role="alert">{error}</p>}
        {archivo && previa?.archivo === archivo && <img src={previa.url} alt="Vista previa de la imagen seleccionada" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }} />}
        {archivo === undefined && tieneImagen && folio && <ImagenContenido folio={folio} version={version} />}
        {(archivo || (archivo === undefined && tieneImagen)) && <button type="button" className="contenidos-boton" onClick={() => { setError(""); alCambiar(null); }}>Quitar imagen al guardar</button>}
        {archivo === null && tieneImagen && <p role="status">La imagen se quitará al guardar el borrador.</p>}
    </div>;
}

// Tarjeta "Estado" con los botones del borrador
type PanelEstadoProps = {
    id: string;
    detalle?: string;
    ocupado?: boolean;
    error?: string;
    alVistaPrevia?: () => void;
    alGuardar?: () => void;
};
export function PanelEstado({ id, detalle = "Sin guardar", ocupado, error, alVistaPrevia, alGuardar }: PanelEstadoProps) {
    return (
        <section className="contenidos-panel contenidos-panel--estado" aria-labelledby={id}>
            <div className="contenidos-lista__cabecera">
                <span className="contenidos-lista__icono"><IconoReloj /></span>
                <h2 id={id}>Estado</h2>
            </div>
            <p className="contenidos-estado-linea">
                <span className="contenidos-estado contenidos-estado--borrador">Borrador</span>
                <span>{ocupado ? "Guardando…" : detalle}</span>
            </p>
            {error && <p className="contenidos-error" role="alert">{error}</p>}
            <button type="submit" className="contenidos-boton contenidos-boton--principal contenidos-boton--ancho" disabled={ocupado}>Enviar a autorización</button>
            {alVistaPrevia && (
                <button type="button" className="contenidos-boton contenidos-boton--suave contenidos-boton--ancho" onClick={alVistaPrevia}>Vista previa</button>
            )}
            <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--ancho" onClick={alGuardar} disabled={ocupado}>Guardar borrador</button>
            <p className="contenidos-nota">Solo el Administrador autoriza y publica. Tu contenido no se verá en el portal hasta entonces.</p>
        </section>
    );
}
