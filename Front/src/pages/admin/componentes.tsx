import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import puntoEtiqueta from "../../assets/admin/punto-etiqueta.svg";
import volverFlecha from "../../assets/admin/volver-flecha.svg";
import puntoGuinda from "../../assets/admin/punto-guinda.svg";
import puntoDorado from "../../assets/admin/punto-dorado.svg";
import puntoVerde from "../../assets/admin/punto-verde-chip.svg";
import puntoGris from "../../assets/admin/punto-gris.svg";
import puntoBlanco from "../../assets/admin/punto-blanco.svg";
import casillaCheck from "../../assets/admin/casilla-check.svg";
import historialClock from "../../assets/admin/historial-clock.svg";
import tarjetaClock from "../../assets/admin/tarjeta-clock.svg";
import tarjetaUser from "../../assets/admin/tarjeta-user.svg";
import iconoLock from "../../assets/admin/icono-lock.svg";
import avatarVerde from "../../assets/admin/avatar-user-verde.svg";
import avatarChico from "../../assets/admin/avatar-user-chico.svg";
import avisoCheck from "../../assets/admin/aviso-check.svg";
import avisoClock from "../../assets/admin/aviso-clock.svg";
import avisoX from "../../assets/admin/aviso-x.svg";
import flechaDorada from "../../assets/admin/opcion-flecha-dorada.svg";
import flechaGuinda from "../../assets/admin/opcion-flecha-guinda.svg";

// ---------- Encabezado de cada pantalla ----------

type EncabezadoPaginaProps = {
    volver?: { texto: string; ruta: string };
    etiqueta: string;
    titulo: string;
    texto: string;
};

export function EncabezadoPagina({ volver, etiqueta, titulo, texto }: EncabezadoPaginaProps) {
    return (
        <div className="encabezado-panel">
            {volver && (
                <Link to={volver.ruta} className="boton-volver">
                    <span className="boton-volver__circulo">
                        <img src={volverFlecha} alt="" />
                    </span>
                    {volver.texto}
                </Link>
            )}
            <p className="encabezado-panel__etiqueta">
                <img src={puntoEtiqueta} alt="" />
                {etiqueta}
            </p>
            <h1>{titulo}</h1>
            <p className="encabezado-panel__texto">{texto}</p>
        </div>
    );
}

// ---------- Chip de estado ----------

export type TonoChip = "guinda" | "dorado" | "verde" | "gris" | "verde-solido";

const puntos: Record<TonoChip, string> = {
    guinda: puntoGuinda,
    dorado: puntoDorado,
    verde: puntoVerde,
    gris: puntoGris,
    "verde-solido": puntoBlanco,
};

type ChipProps = {
    tono: TonoChip;
    icono?: string; // si no se pasa, se dibuja el puntito del color del chip
    children: ReactNode;
};

export function Chip({ tono, icono, children }: ChipProps) {
    return (
        <span className={`chip chip--${tono}`}>
            <img src={icono ?? puntos[tono]} alt="" className={icono ? "chip__icono" : "chip__punto"} />
            {children}
        </span>
    );
}

// ---------- Tarjeta blanca con cabecera de ícono ----------

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

export function Tarjeta({
    icono,
    tonoIcono = "verde",
    titulo,
    subtitulo,
    extra,
    variante = "blanca",
    className = "",
    children,
}: TarjetaProps) {
    return (
        <section className={`tarjeta-panel tarjeta-panel--${variante} ${className}`}>
            <div className="tarjeta-panel__cabecera">
                <span className={`icono-tarjeta icono-tarjeta--${tonoIcono}`}>
                    {icono && <img src={icono} alt="" />}
                </span>
                <div className="tarjeta-panel__textos">
                    <h2>{titulo}</h2>
                    {subtitulo && <p>{subtitulo}</p>}
                </div>
                {extra}
            </div>
            {children}
        </section>
    );
}

// ---------- Datos (etiqueta pequeña + valor) ----------

export function Datos({ children }: { children: ReactNode }) {
    return <div className="datos">{children}</div>;
}

export function Dato({ etiqueta, children, alto }: { etiqueta: string; children: ReactNode; alto?: boolean }) {
    return (
        <div className={`dato ${alto ? "dato--alto" : ""}`}>
            <p className="dato__etiqueta">{etiqueta}</p>
            <p className="dato__valor">{children}</p>
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
        <ul className="lista-cotejo">
            {puntos.map((punto, indice) => {
                const marcado = marcados[indice];
                const clase = marcado ? "punto-cotejo--marcado" : punto.alerta ? "punto-cotejo--alerta" : "";
                return (
                    <li key={punto.titulo}>
                        <label className={`punto-cotejo ${clase}`}>
                            <input
                                type="checkbox"
                                checked={marcado}
                                disabled={!alCambiar}
                                onChange={() => alCambiar?.(indice)}
                            />
                            <span className="punto-cotejo__casilla">{marcado && <img src={casillaCheck} alt="" />}</span>
                            <span className="punto-cotejo__textos">
                                <strong>{punto.titulo}</strong>
                                {punto.detalle && <span>{punto.detalle}</span>}
                            </span>
                        </label>
                    </li>
                );
            })}
        </ul>
    );
}

// ---------- Historial (línea de tiempo) ----------

// hecho = check verde, proceso = reloj dorado, pendiente = círculo vacío
export type EventoHistorial = { titulo: string; detalle: string; tipo: "hecho" | "proceso" | "pendiente" };

export function TarjetaHistorial({ eventos }: { eventos: EventoHistorial[] }) {
    return (
        <Tarjeta icono={tarjetaClock} titulo="Historial">
            <ol className="historial">
                {eventos.map((evento) => (
                    <li key={evento.titulo} className={`historial__evento historial__evento--${evento.tipo}`}>
                        <span className="historial__punto">
                            {evento.tipo === "hecho" && <img src={casillaCheck} alt="" />}
                            {evento.tipo === "proceso" && <img src={historialClock} alt="" />}
                        </span>
                        <div className="historial__textos">
                            <strong>{evento.titulo}</strong>
                            <span>{evento.detalle}</span>
                        </div>
                    </li>
                ))}
            </ol>
        </Tarjeta>
    );
}

// ---------- Aviso de resultado (franja arriba de las columnas) ----------

type TonoAviso = "exito" | "espera" | "error";

const iconosAviso: Record<TonoAviso, string> = { exito: avisoCheck, espera: avisoClock, error: avisoX };
const chipsAviso: Record<TonoAviso, TonoChip> = { exito: "verde", espera: "dorado", error: "guinda" };

type AvisoResultadoProps = { tono: TonoAviso; titulo: string; texto: string; chip: string };

export function AvisoResultado({ tono, titulo, texto, chip }: AvisoResultadoProps) {
    return (
        <div className={`aviso-resultado aviso-resultado--${tono}`} role="status">
            <span className="aviso-resultado__icono">
                <img src={iconosAviso[tono]} alt="" />
            </span>
            <div className="aviso-resultado__textos">
                <strong>{titulo}</strong>
                <span>{texto}</span>
            </div>
            <Chip tono={chipsAviso[tono]}>{chip}</Chip>
        </div>
    );
}

// ---------- Botón de "Otras opciones" en la tarjeta de decisión ----------

type BotonOpcionProps = {
    icono: string;
    peligro?: boolean; // rojo (rechazar / cancelar)
    alPresionar: () => void;
    children: ReactNode;
};

export function BotonOpcion({ icono, peligro, alPresionar, children }: BotonOpcionProps) {
    return (
        <button type="button" className={`boton-opcion ${peligro ? "boton-opcion--peligro" : ""}`} onClick={alPresionar}>
            <span className="boton-opcion__icono">
                <img src={icono} alt="" />
            </span>
            <span className="boton-opcion__texto">{children}</span>
            <img src={peligro ? flechaGuinda : flechaDorada} alt="" />
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
            extra={
                <Chip tono="gris" icono={iconoLock}>
                    Solo el personal
                </Chip>
            }
        >
            <div className="responsable">
                <span className="responsable__avatar">
                    <img src={avatarVerde} alt="" />
                </span>
                <div className="responsable__textos">
                    <span>RESPONSABLE</span>
                    <strong>{responsable}</strong>
                </div>
                {/* TODO: elegir a otra persona del personal cuando exista la lista */}
                <button type="button" className="boton-panel boton-panel--contorno boton-panel--chico">
                    Cambiar
                </button>
            </div>

            <div className="nota-interna">
                <label htmlFor="nota-interna">Nota interna</label>
                <textarea
                    id="nota-interna"
                    className="entrada-panel entrada-panel--area"
                    placeholder="Escribe una nota para el personal"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                />
                <button type="button" className="boton-panel boton-panel--verde boton-panel--mediano" onClick={guardar}>
                    Guardar nota
                </button>
            </div>

            {notas.map((guardada, indice) => (
                <div key={indice} className="nota-guardada">
                    <p className="nota-guardada__autor">
                        <span>
                            <img src={avatarChico} alt="" />
                        </span>
                        {guardada.autor} · {guardada.cuando}
                    </p>
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
        <div className="estado-vacio">
            <span className="estado-vacio__icono">
                <img src={icono} alt="" />
            </span>
            <h3>{titulo}</h3>
            <p>{texto}</p>
            {accion && (
                <button type="button" className="boton-panel boton-panel--contorno" onClick={accion.alPresionar}>
                    {accion.texto}
                </button>
            )}
        </div>
    );
}
