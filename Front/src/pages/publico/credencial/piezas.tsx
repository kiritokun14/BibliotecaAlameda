import type { ReactNode } from "react";
import { Link } from "react-router";
import { estadosDeEjemplo, fechaLarga, pasosCredencial, type DatosEstado, type Etapa, type EstadoCredencial, type TramiteCredencial } from "./datos";
import { Dato } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";
import puntoDorado from "../../../assets/comun/iconos/punto-dorado.svg";
import puntoVerde from "../../../assets/credencial/punto-verde.svg";
import puntoGris from "../../../assets/credencial/punto-gris.svg";
import puntoGuinda from "../../../assets/credencial/punto-guinda.svg";
import pasoCheck from "../../../assets/credencial/paso-check.svg";
import checkEtapa from "../../../assets/credencial/etapa-check.svg";
import libro from "../../../assets/credencial/libro.svg";
import circulo1 from "../../../assets/acerca/circulo-grande.svg";
import circulo2 from "../../../assets/credencial/tarjeta-circulo-2.svg";

// ---------- Indicador «1 Información · 2 Solicitud · 3 Seguimiento» ----------
// actual: paso del trámite (1 a 3; 4 = los tres completos), según su estado (pasoDelEstado en datos.ts).
// pagina: la pantalla abierta (1 a 3). Los pasos que se pueden visitar y no son la pantalla abierta son enlaces:
// Información solo antes de solicitar (con una solicitud en proceso, /credencial lleva al seguimiento); Solicitud solo si
// se puede solicitar; Seguimiento si ya hay una solicitud.
const nombresPasos = ["Información", "Solicitud", "Seguimiento"];
const rutasPasos = ["/credencial", "/credencial/solicitud", "/credencial/seguimiento"];
// Otro trámite (Espacios) pasa sus propios `nombres` y `rutas`.
export function PasosTramite({ actual, pagina, solicitar = false, nombres = nombresPasos, rutas = rutasPasos }: {
    actual: number; pagina: number; solicitar?: boolean; nombres?: string[]; rutas?: string[];
}) {
    return (
        <nav className="cred-pasos-franja" aria-label="Pasos del trámite">
            <ol className="cred-pasos">
                {nombres.map((nombre, i) => {
                    const numero = i + 1;
                    const estado = numero < actual ? "hecho" : numero === actual ? "actual" : "pendiente";
                    const visitable = (numero === 1 && actual < 3) || (numero === 2 && solicitar) || (numero === 3 && actual >= 3);
                    const contenido = <>
                        <span className="cred-paso__numero">
                            {estado === "hecho" ? <img src={pasoCheck} alt="Completado:" /> : numero}
                        </span>
                        {nombre}
                    </>;
                    return (
                        <li key={nombre} className={`cred-paso cred-paso--${estado}${numero === pagina ? " cred-paso--aqui" : ""}`}
                            aria-current={numero === pagina ? "page" : undefined}>
                            {visitable && numero !== pagina ? <Link to={rutas[i]} className="cred-paso__enlace">{contenido}</Link> : contenido}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

// ---------- «¿Necesitas ayuda?»: tarjeta verde con los canales (Credencial, Espacios y lo que siga con un trámite) ----------
// compacta: sin insignia ni texto, cuando la columna no tiene alto de sobra.
export function AyudaTramite({ compacta = false, texto = "El personal te orienta con tu trámite." }: { compacta?: boolean; texto?: string }) {
    return (
        <section className={`contacto-seguimiento cred-ayuda${compacta ? " cred-ayuda--compacta" : ""}`} aria-labelledby="titulo-ayuda-tramite">
            <span className="contacto-seguimiento__insignia" aria-hidden="true" />
            <h2 id="titulo-ayuda-tramite">¿Necesitas ayuda?</h2>
            <p>{texto}</p>
            <ul className="cred-ayuda__canales">
                <li><span>Horario</span><strong>Lunes a viernes, de 8:00 a 19:30 h</strong></li>
                <li><span>En la biblioteca</span><strong>Pide apoyo en Préstamos</strong></li>
                <li><span>Correo</span><a href="mailto:bp0165@dgb.gob.mx">bp0165@dgb.gob.mx</a></li>
            </ul>
            <a href="tel:+523112128989" className="perfil-boton perfil-boton--guardar">Llamar al 311 212 8989</a>
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

// ---------- Trámite por estados (Mi perfil › Mi credencial, Credencial y su seguimiento) ----------
// A la izquierda la credencial (o su lugar punteado mientras no existe); a la derecha el chip, qué pasa, la observación
// del personal si la hay, las fechas si ya se emitió y las acciones (children). nivel: h2 en páginas, h3 dentro del perfil.
export function EstadoCredencial({ datos, titular, tramite, nivel = 3, children }: {
    datos: DatosEstado; titular: string; tramite?: TramiteCredencial; nivel?: 2 | 3; children?: ReactNode;
}) {
    const emitida = tramite?.estado === "vigente" || tramite?.estado === "vencida" || tramite?.credencialVigente;
    const Titulo = nivel === 2 ? "h2" : "h3";
    return (
        <section className={`perfil-credencial-estado perfil-credencial-estado--${datos.color}`} aria-labelledby="titulo-estado-credencial">
            <div className="perfil-credencial-estado__visual">
                {emitida && tramite
                    ? <TarjetaCredencial titular={titular} vencida={tramite.estado === "vencida"} emision={tramite.emision} />
                    : (
                        <div className="perfil-credencial-vacia">
                            <span className="perfil-credencial-vacia__icono"><img src={iconosSeccion.credencial} alt="" /></span>
                            <strong>{titular}</strong>
                            <span>Tu credencial aparecerá aquí cuando el personal la valide.</span>
                        </div>
                    )}
            </div>
            <div className="perfil-credencial-estado__textos">
                <Chip color={datos.color}>{datos.chip}</Chip>
                <Titulo id="titulo-estado-credencial">{datos.titulo}</Titulo>
                <p>{datos.texto}</p>
                {tramite?.credencialVigente && tramite.estado !== "vigente" && <p><strong>Tu credencial actual sigue vigente.</strong></p>}
                {tramite?.estado === "correccion" && tramite.motivoCorreccion && (
                    <div className="perfil-nota perfil-nota--guinda"><p><strong>Observación del personal</strong>{tramite.motivoCorreccion}</p></div>
                )}
                {emitida && tramite && (
                    <dl className="perfil-datos perfil-datos--dos">
                        <Dato etiqueta="Emisión" valor={tramite.emision ? fechaLarga(tramite.emision) : "Por confirmar"} />
                        <Dato etiqueta={tramite.estado === "vencida" ? "Venció" : "Vigencia"}
                            valor={tramite.vencimiento ? fechaLarga(tramite.vencimiento) : "2 años desde la emisión"} />
                    </dl>
                )}
                {children}
            </div>
        </section>
    );
}

// ---------- Los cuatro pasos en fila, unidos por una línea (Credencial y su seguimiento) ----------
// Sin etapas (sin sesión) solo dicen quién hace cada paso; con etapas, el chip de cada uno (completado, en curso, pendiente).
// Otro trámite (Espacios) pasa sus propios `pasos` (cuatro, con quién, título y texto).
const colorEtapa = { hecho: "verde", actual: "dorado", pendiente: "gris" } as const;
const textoEtapa = { hecho: "Completado", actual: "En curso", pendiente: "Pendiente" } as const;
export type PasoRuta = { titulo: string; texto: string; quien: string };
export function RutaCredencial({ etapas, pasos = pasosCredencial }: { etapas?: Etapa[] | null; pasos?: PasoRuta[] }) {
    return (
        <ol className="perfil-niveles perfil-niveles--ruta cred-ruta">
            {pasos.map((p, i) => {
                const estado = etapas?.[i]?.estado;
                return (
                    <li key={p.titulo} className={`perfil-nivel perfil-nivel--${estado ? colorEtapa[estado] : "verde"}`}
                        aria-current={estado === "actual" ? "step" : undefined}>
                        <span className="perfil-nivel__numero" aria-hidden="true">{i + 1}</span>
                        <p>{p.quien}</p>
                        <strong>{p.titulo}</strong>
                        <span className="cred-ruta__texto">{p.texto}</span>
                        {estado && <Chip color={colorEtapa[estado]}>{textoEtapa[estado]}</Chip>}
                    </li>
                );
            })}
        </ol>
    );
}

// ---------- Selector «Vista de ejemplo de estados» (solo en desarrollo, como en Figma) ----------
export function SelectorEstados({ actual, alElegir }: { actual: EstadoCredencial; alElegir: (e: EstadoCredencial) => void }) {
    if (!import.meta.env.DEV) return null;
    return (
        <section className="cred-ejemplos" aria-label="Vista de ejemplo de estados">
            <p>Vista de ejemplo de estados</p>
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
                <div><p>Biblioteca Solón Argüello</p><strong>Credencial de persona usuaria</strong></div>
            </div>
            <p className="cred-credencial__etiqueta">Titular</p>
            <p className="cred-credencial__titular">{titular}</p>
            <dl className="cred-credencial__datos">
                <div><dt>Estado</dt><dd>{vencida ? "Vencida" : "Vigente"}</dd></div>
                <div><dt>Vigencia</dt><dd>2 años desde la emisión</dd></div>
                <div><dt>Emisión</dt><dd>{emision ? fechaLarga(emision) : "Fecha por confirmar"}</dd></div>
            </dl>
        </div>
    );
}
