// Piezas de las pantallas de Atención (credenciales, espacios y propuestas).
// Diseño: el del Editor de contenidos (clases «contenidos-*» del tema "contenidos") más atencion/Atencion.css.
// Mismos nombres y propiedades que antes, para no cambiar las pantallas que las usan.
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { IconoFlechaIzq } from "./contenidos/piezas";
import "./contenidos/Contenidos.css";
import "./atencion/Atencion.css";
import iconoLock from "../../assets/admin/icono-lock.svg";
import tarjetaClock from "../../assets/admin/tarjeta-clock.svg";
import tarjetaUser from "../../assets/admin/tarjeta-user.svg";
import avisoCheck from "../../assets/admin/aviso-check.svg";
import avisoClock from "../../assets/admin/aviso-clock.svg";
import avisoX from "../../assets/admin/aviso-x.svg";

// ---------- Encabezado de cada pantalla ----------

type EncabezadoPaginaProps = {
    volver?: { texto: string; ruta: string }; // solo en pantallas internas (detalle, listado completo)
    etiqueta: string;
    titulo: string;
    texto: string;
    accion?: ReactNode;
};

export function EncabezadoPagina({ volver, etiqueta, titulo, texto, accion }: EncabezadoPaginaProps) {
    return (
        <div className={`contenidos-encabezado${volver ? " contenidos-encabezado--tarjeta" : ""}`}>
            <div>
                {volver && (
                    <Link to={volver.ruta} className="contenidos-volver">
                        <span className="contenidos-volver__circulo"><IconoFlechaIzq /></span>
                        {volver.texto}
                    </Link>
                )}
                <p className="contenidos-etiqueta">{etiqueta}</p>
                <h1>{titulo}</h1>
                {texto && <p className="contenidos-encabezado__texto">{texto}</p>}
            </div>
            {accion}
        </div>
    );
}

// Contenidos › Revisión… en Atención: «Atención › Solicitudes de credencial › CT-0051»
export function Migas({ pasos }: { pasos: [string, string?][] }) {
    return (
        <nav className="contenidos-migas" aria-label="Ruta">
            <span>Atención</span>
            {pasos.map(([texto, ruta], i) => (
                <span key={texto} className="at-miga">
                    <span aria-hidden="true">›</span>
                    {i === pasos.length - 1 ? <strong aria-current="page">{texto}</strong> : ruta ? <Link to={ruta}>{texto}</Link> : <span>{texto}</span>}
                </span>
            ))}
        </nav>
    );
}

// ---------- Chip de estado (mismas etiquetas del Editor) ----------

export type TonoChip = "guinda" | "dorado" | "verde" | "gris" | "verde-solido";

const CLASE_CHIP: Record<TonoChip, string> = {
    guinda: "con_observaciones",
    dorado: "por_autorizar",
    verde: "publicado",
    "verde-solido": "publicado",
    gris: "borrador",
};

type ChipProps = {
    tono: TonoChip;
    icono?: string; // se conserva por compatibilidad; el diseño del Editor usa el punto
    children: ReactNode;
};

export function Chip({ tono, children }: ChipProps) {
    return <span className={`contenidos-estado contenidos-estado--${CLASE_CHIP[tono]}`}>{children}</span>;
}

// ---------- Tarjeta con cabecera de ícono ----------

type TarjetaProps = {
    icono?: string;
    tonoIcono?: "verde" | "dorado";
    titulo: string;
    subtitulo?: string;
    extra?: ReactNode; // algo a la derecha de la cabecera (un chip, por ejemplo)
    variante?: "blanca" | "decision";
    className?: string;
    children?: ReactNode;
};

export function Tarjeta({ icono, titulo, subtitulo, extra, variante = "blanca", className = "", children }: TarjetaProps) {
    return (
        <section className={`contenidos-panel${variante === "decision" ? " contenidos-panel--estado" : ""} ${className}`}>
            <div className="contenidos-lista__cabecera">
                <span className="contenidos-lista__icono">{icono ? <img src={icono} alt="" className="at-icono" /> : <IconoBalanza />}</span>
                <div className="at-cabecera__textos">
                    <h2>{titulo}</h2>
                    {subtitulo && <p>{subtitulo}</p>}
                </div>
                {extra}
            </div>
            {children}
        </section>
    );
}

// Ícono por defecto (tarjetas de decisión), con el trazo de los íconos del Editor
const IconoBalanza = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0Zm14 0-3 6a3 3 0 0 0 6 0Z" />
    </svg>
);

// ---------- Datos (etiqueta pequeña + valor) ----------

export function Datos({ children }: { children: ReactNode }) {
    return <div className="at-datos">{children}</div>;
}

export function Dato({ etiqueta, children, alto }: { etiqueta: string; children: ReactNode; alto?: boolean }) {
    return (
        <div className={`at-dato${alto ? " at-dato--alto" : ""}`}>
            <p className="at-dato__etiqueta">{etiqueta}</p>
            <p className="at-dato__valor">{children}</p>
        </div>
    );
}

// ---------- Lista de cotejo (casillas) ----------

export type PuntoCotejo = { titulo: string; detalle?: string; alerta?: boolean };

type ListaCotejoProps = {
    puntos: PuntoCotejo[];
    marcados: boolean[];
    alCambiar?: (indice: number) => void; // sin esto la lista es de solo lectura
};

export function ListaCotejo({ puntos, marcados, alCambiar }: ListaCotejoProps) {
    return (
        <ul className="at-cotejo">
            {puntos.map((punto, indice) => {
                const marcado = marcados[indice];
                const clase = marcado ? "at-cotejo--marcado" : punto.alerta ? "at-cotejo--alerta" : "";
                return (
                    <li key={punto.titulo}>
                        <label className={clase}>
                            <input type="checkbox" checked={marcado} disabled={!alCambiar} onChange={() => alCambiar?.(indice)} />
                            <span>
                                <strong>{punto.titulo}</strong>
                                {punto.detalle && <small>{punto.detalle}</small>}
                            </span>
                        </label>
                    </li>
                );
            })}
        </ul>
    );
}

// ---------- Historial (línea de tiempo) ----------

// hecho = ya pasó, proceso = en curso, pendiente = todavía no
export type EventoHistorial = { titulo: string; detalle: string; tipo: "hecho" | "proceso" | "pendiente" };

export function TarjetaHistorial({ eventos }: { eventos: EventoHistorial[] }) {
    return (
        <Tarjeta icono={tarjetaClock} titulo="Historial">
            <ol className="at-eventos">
                {eventos.map((evento) => (
                    <li key={evento.titulo} className={`at-eventos--${evento.tipo}`}>
                        <strong>{evento.titulo}</strong>
                        <small>{evento.detalle}</small>
                    </li>
                ))}
            </ol>
        </Tarjeta>
    );
}

// ---------- Aviso de resultado (bloque de «Enviado a autorización» del Editor) ----------

type TonoAviso = "exito" | "espera" | "error";

const iconosAviso: Record<TonoAviso, string> = { exito: avisoCheck, espera: avisoClock, error: avisoX };
const chipsAviso: Record<TonoAviso, TonoChip> = { exito: "verde", espera: "dorado", error: "guinda" };

type AvisoResultadoProps = { tono: TonoAviso; titulo: string; texto: string; chip: string };

export function AvisoResultado({ tono, titulo, texto, chip }: AvisoResultadoProps) {
    return (
        <section className={`contenidos-enviado at-aviso--${tono}`} role="status">
            <span className="contenidos-enviado__palomita"><img src={iconosAviso[tono]} alt="" className="at-icono" /></span>
            <div className="contenidos-enviado__textos">
                <p className="contenidos-enviado__titulo">{titulo}</p>
                <p className="contenidos-enviado__detalle">{texto}</p>
            </div>
            <Chip tono={chipsAviso[tono]}>{chip}</Chip>
        </section>
    );
}

// ---------- Botón de «Otras opciones» en la tarjeta de decisión ----------

type BotonOpcionProps = {
    icono?: string; // se conserva por compatibilidad
    peligro?: boolean; // guinda (rechazar / cancelar)
    alPresionar: () => void;
    children: ReactNode;
};

export function BotonOpcion({ peligro, alPresionar, children }: BotonOpcionProps) {
    return (
        <button type="button" className={`contenidos-boton contenidos-boton--ancho ${peligro ? "at-boton--guinda" : "contenidos-boton--contorno"}`} onClick={alPresionar}>
            {children}
        </button>
    );
}

// ---------- Responsable y notas internas ----------

type Nota = { autor: string; cuando: string; texto: string };

type TarjetaResponsableProps = {
    responsable: string;
    notas: Nota[];
    alGuardarNota: (nota: Nota) => void;
};

export function TarjetaResponsable({ responsable, notas, alGuardarNota }: TarjetaResponsableProps) {
    const [nota, setNota] = useState("");

    function guardar() {
        if (!nota.trim()) return;
        alGuardarNota({ autor: "Administrador", cuando: "ahora", texto: nota.trim() });
        setNota("");
    }

    return (
        <Tarjeta
            icono={tarjetaUser}
            titulo="Responsable y notas"
            subtitulo="Solo el personal ve esta parte."
            extra={<span className="at-candado"><img src={iconoLock} alt="" />Solo el personal</span>}
        >
            <div className="at-persona">
                <span className="at-persona__inicial" aria-hidden="true">{responsable.charAt(0).toUpperCase()}</span>
                <div>
                    <small>Responsable</small>
                    <strong>{responsable}</strong>
                </div>
                {/* TODO: elegir a otra persona del personal cuando exista la lista */}
                <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico">Cambiar</button>
            </div>

            <div className="contenidos-campo">
                <label htmlFor="nota-interna">Nota interna</label>
                <textarea id="nota-interna" rows={3} placeholder="Escribe una nota para el personal" value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>
            <button type="button" className="contenidos-boton contenidos-boton--principal contenidos-boton--chico at-alinear-inicio" onClick={guardar}>Guardar nota</button>

            {notas.map((guardada, indice) => (
                <div key={indice} className="at-nota">
                    <p className="at-nota__autor">{guardada.autor} · {guardada.cuando}</p>
                    <p>{guardada.texto}</p>
                </div>
            ))}
        </Tarjeta>
    );
}

// ---------- Estado vacío / sin resultados ----------

type EstadoVacioProps = {
    icono: string;
    titulo: string;
    texto: string;
    accion?: { texto: string; alPresionar: () => void };
};

export function EstadoVacio({ icono, titulo, texto, accion }: EstadoVacioProps) {
    return (
        <div className="contenidos-vacio at-vacio">
            <span>
                <span className="contenidos-vacio__icono"><img src={icono} alt="" className="at-icono-vacio" /></span>
                <strong>{titulo}</strong>
                <span>{texto}</span>
                {accion && (
                    <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={accion.alPresionar}>
                        {accion.texto}
                    </button>
                )}
            </span>
        </div>
    );
}
