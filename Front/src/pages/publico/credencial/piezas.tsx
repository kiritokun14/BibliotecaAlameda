import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { estadosDeEjemplo, fechaLarga, type Etapa, type EstadoCredencial } from "./datos";
import puntoDorado from "../../../assets/comun/iconos/punto-dorado.svg";
import puntoVerde from "../../../assets/credencial/punto-verde.svg";
import puntoGris from "../../../assets/credencial/punto-gris.svg";
import puntoGuinda from "../../../assets/credencial/punto-guinda.svg";
import pasoCheck from "../../../assets/credencial/paso-check.svg";
import iconoTramite from "../../../assets/credencial/tramite-archivo.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import flechaVerde from "../../../assets/inicio/lecturas-flecha-verde.svg";
import checkEtapa from "../../../assets/credencial/etapa-check.svg";
import libro from "../../../assets/credencial/libro.svg";
import circulo1 from "../../../assets/acerca/circulo-grande.svg";
import circulo2 from "../../../assets/credencial/tarjeta-circulo-2.svg";

// ---------- Indicador «1 Información · 2 Solicitud · 3 Seguimiento» ----------
// actual: paso en curso (1 a 3); 4 = los tres completos.
const nombresPasos = ["Información", "Solicitud", "Seguimiento"];
export function PasosTramite({ actual }: { actual: number }) {
    return (
        <section className="cred-pasos-franja" aria-label="Pasos del trámite">
            <ol className="cred-pasos">
                {nombresPasos.map((nombre, i) => {
                    const numero = i + 1;
                    const estado = numero < actual ? "hecho" : numero === actual ? "actual" : "pendiente";
                    return (
                        <li key={nombre} className={`cred-paso cred-paso--${estado}`} aria-current={estado === "actual" ? "step" : undefined}>
                            <span className="cred-paso__numero">
                                {estado === "hecho" ? <img src={pasoCheck} alt="Completado:" /> : numero}
                            </span>
                            {nombre}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

// ---------- Chip con punto de color: «En revisión», «Vigente», «Pendiente»… ----------
export type ColorChip = "dorado" | "verde" | "gris" | "guinda";
const puntos: Record<ColorChip, string> = { dorado: puntoDorado, verde: puntoVerde, gris: puntoGris, guinda: puntoGuinda };
export function Chip({ color, children }: { color: ColorChip; children: ReactNode }) {
    return <span className={`cred-chip cred-chip--${color}`}><img src={puntos[color]} alt="" />{children}</span>;
}

// ---------- Nota con ícono (verde, dorada o guinda) ----------
export function Nota({ color, icono, children, rol }: { color: "verde" | "dorada" | "guinda"; icono: string; children: ReactNode; rol?: "alert" | "status" }) {
    return <p className={`cred-nota cred-nota--${color}`} role={rol}><img src={icono} alt="" /><span>{children}</span></p>;
}

// Dato «ETIQUETA / valor»
export function DatoCred({ etiqueta, valor }: { etiqueta: string; valor: string }) {
    return <div className="cred-dato"><dt>{etiqueta}</dt><dd>{valor}</dd></div>;
}

// ---------- Tarjeta «Mi trámite» en la página de información (sin solicitud) ----------
export function TarjetaMiTramite() {
    const navegar = useNavigate();
    const [leido, setLeido] = useState(false);
    const [error, setError] = useState(false);
    function solicitar() {
        if (!leido) { setError(true); document.getElementById("cred-leido")?.focus(); return; }
        navegar("/credencial/solicitud");
    }
    return (
        <div className="cred-tarjeta cred-tramite">
            <div className="cred-tramite__encabezado">
                <span className="cred-tramite__icono"><img src={iconoTramite} alt="" /></span>
                <div className="cred-tramite__textos">
                    <Chip color="dorado">Sin solicitud</Chip>
                    <h2>Aún no tienes una solicitud</h2>
                    <p>Si decides continuar, te pediremos confirmar tus datos y enviarás la solicitud. Podrás seguir su avance en la sección Seguimiento.</p>
                </div>
            </div>
            <label className="cred-casilla">
                <input id="cred-leido" type="checkbox" checked={leido} aria-invalid={error && !leido ? true : undefined}
                    aria-describedby={error && !leido ? "cred-leido-error" : undefined}
                    onChange={(e) => { setLeido(e.target.checked); setError(false); }} />
                Leí en qué consiste y cuáles son los requisitos.
            </label>
            {error && !leido && <p id="cred-leido-error" className="cred-error-campo">Marca la casilla para continuar.</p>}
            <div className="cred-acciones">
                <button type="button" className="boton-visitante" onClick={solicitar}>Solicitar credencial <img src={flechaBlanca} alt="" /></button>
                <Link to="/" className="boton-visitante cred-boton-contorno">Ahora no</Link>
            </div>
            <hr className="cred-linea" />
            <div className="cred-tramite__ya">
                <strong>¿Ya iniciaste el trámite?</strong>
                <Link to="/credencial/seguimiento" className="boton-visitante cred-boton-contorno">
                    Ver seguimiento de mi solicitud <img src={flechaVerde} alt="" />
                </Link>
                <Link to="/credencial/solicitud?tipo=renovacion" className="boton-visitante cred-boton-contorno">Renovar mi credencial</Link>
            </div>
        </div>
    );
}

// ---------- Selector «Vista de ejemplo de estados» (solo en desarrollo, como en Figma) ----------
export function SelectorEstados({ actual, alElegir }: { actual: EstadoCredencial; alElegir: (e: EstadoCredencial) => void }) {
    if (!import.meta.env.DEV) return null;
    return (
        <section className="cred-ejemplos" aria-label="Vista de ejemplo de estados">
            <p>VISTA DE EJEMPLO DE ESTADOS</p>
            <div>
                {estadosDeEjemplo.map((e) => (
                    <button key={e.estado} type="button" className={`cred-ejemplo${e.estado === actual ? " cred-ejemplo--activo" : ""}`}
                        aria-pressed={e.estado === actual} onClick={() => alElegir(e.estado)}>
                        {e.texto}
                    </button>
                ))}
            </div>
        </section>
    );
}

// ---------- Etapas del trámite (seguimiento y «Mi credencial» del perfil) ----------
export function EtapasTramite({ etapas }: { etapas: Etapa[] }) {
    const chip = { hecho: <Chip color="verde">Completado</Chip>, actual: <Chip color="dorado">En curso</Chip>, pendiente: <Chip color="gris">Pendiente</Chip> };
    return (
        <ol className="cred-etapas">
            {etapas.map((e, i) => (
                <li key={e.titulo} className={`cred-etapa cred-etapa--${e.estado}`} aria-current={e.estado === "actual" ? "step" : undefined}>
                    <span className="cred-etapa__numero">{e.estado === "hecho" ? <img src={checkEtapa} alt="" /> : i + 1}</span>
                    <div className="cred-etapa__textos"><strong>{e.titulo}</strong>{e.texto}</div>
                    {chip[e.estado]}
                </li>
            ))}
        </ol>
    );
}

// ---------- Tarjeta verde (guinda si venció) de la credencial ----------
export function TarjetaCredencial({ titular, vencida = false, emision }: { titular: string; vencida?: boolean; emision: string | null }) {
    return (
        <div className={`cred-credencial${vencida ? " cred-credencial--vencida" : ""}`}>
            <img className="cred-credencial__circulo cred-credencial__circulo--1" src={circulo1} alt="" />
            <img className="cred-credencial__circulo cred-credencial__circulo--2" src={circulo2} alt="" />
            <div className="cred-credencial__cabecera">
                <span className="cred-credencial__sello"><img src={libro} alt="" /></span>
                <div><p>BIBLIOTECA SOLÓN ARGÜELLO</p><strong>Credencial de persona usuaria</strong></div>
            </div>
            <p className="cred-credencial__etiqueta">TITULAR</p>
            <p className="cred-credencial__titular">{titular}</p>
            <dl className="cred-credencial__datos">
                <div><dt>ESTADO</dt><dd>{vencida ? "Vencida" : "Vigente"}</dd></div>
                <div><dt>VIGENCIA</dt><dd>2 años desde la emisión</dd></div>
                <div><dt>EMISIÓN</dt><dd>{emision ? fechaLarga(emision) : "Fecha por confirmar"}</dd></div>
            </dl>
        </div>
    );
}
