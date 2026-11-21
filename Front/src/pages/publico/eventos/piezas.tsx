import type { CSSProperties } from "react";
import { Link } from "react-router";
import iconoLista from "../../../assets/noticias/vista-lista-verde.svg";
import iconoCalendario from "../../../assets/eventos/vista-calendario.svg";
import { fechaCompleta, filtrosCategoria, nombreCorto, estadoActividad, type ActividadAgenda, type FiltroCategoria } from "./datosAgenda";
import circuloGrande from "../../../assets/comun/iconos/circulo-grande.svg";
import circuloChico from "../../../assets/comun/iconos/circulo-chico.svg";
import estrella from "../../../assets/eventos/proponer-estrella.svg";

// ---------- Barra de la agenda (Aldahir, 20 nov: «mejora la sección de lista y tipos de actividad») ----------
// Una sola tarjeta blanca: a la izquierda los tipos de actividad como pastillas segmentadas, cada una con el punto de
// su color (el mismo del calendario); a la derecha «Lista · Calendario». La elegida pasa a verde con un pulso corto.
export function BarraEventos({ filtro, alElegir, vista }: { filtro: FiltroCategoria; alElegir: (f: FiltroCategoria) => void; vista: "lista" | "calendario" }) {
    return (
        <div className="evento-herramientas">
            <div className="evento-herramientas__grupo">
                <span className="evento-herramientas__etiqueta" id="etiqueta-tipos">Tipo</span>
                <div className="perfil-filtros evento-tipos" role="group" aria-labelledby="etiqueta-tipos">
                    {filtrosCategoria.map((o) => (
                        <button key={o.valor} type="button" aria-pressed={filtro === o.valor} onClick={() => alElegir(o.valor)}
                            className={`perfil-filtro evento-tipo${filtro === o.valor ? " perfil-filtro--activo" : ""}`}>
                            {o.valor !== "todas" && <span className={`evento-tipo__punto evento-tipo__punto--${o.valor}`} aria-hidden="true" />}
                            {o.texto}
                        </button>
                    ))}
                </div>
            </div>
            <div className="evento-herramientas__grupo">
                <span className="evento-herramientas__etiqueta">Ver como</span>
                <SelectorVistaEventos actual={vista} />
            </div>
        </div>
    );
}

// ---------- «Participa»: tarjeta verde junto a la destacada ----------
// Con sesión invita a proponer una actividad (Proponer · Mis propuestas) y lleva a Mis actividades; sin sesión explica
// qué se puede hacer con una cuenta (inscribirse y proponer) con «Iniciar sesión» y «Crear cuenta».
// horizontal: franja a todo lo ancho (insignia y textos a la izquierda, botones a la derecha), para el calendario.
export function TarjetaParticipa({ sesion, horizontal = false }: { sesion: boolean; horizontal?: boolean }) {
    return (
        <section className={`evento-participa${horizontal ? " evento-participa--horizontal" : ""}`} aria-labelledby="titulo-participa">
            <span className="evento-participa__insignia" aria-hidden="true"><img src={estrella} alt="" /></span>
            <div className="evento-participa__textos">
                <h2 id="titulo-participa">{sesion ? "¿Tienes una idea para la biblioteca?" : "Participa con tu cuenta"}</h2>
                <p>{sesion
                    ? "Propón un taller, un club o un evento. El personal revisa tu propuesta y te responde en tu cuenta."
                    : "Con una cuenta te inscribes a las actividades con cupo y puedes proponer las tuyas."}</p>
            </div>
            <div className="evento-participa__acciones">
                {sesion ? <>
                    <Link to="/proponer" className="perfil-boton evento-participa__principal">Proponer una actividad</Link>
                    <Link to="/mi-perfil/propuestas" className="perfil-boton perfil-boton--contorno evento-participa__secundario">Mis propuestas</Link>
                </> : <>
                    <Link to="/iniciar-sesion" className="perfil-boton evento-participa__principal">Iniciar sesión</Link>
                    <Link to="/crear-cuenta" className="perfil-boton perfil-boton--contorno evento-participa__secundario">Crear cuenta</Link>
                </>}
            </div>
        </section>
    );
}

// Piezas de Eventos con las de Noticias (plantilla C «Página de consulta»; Aldahir, 20 nov 2026):
// la destacada (`noticia-principal`), las tarjetas (`tarjeta-noticia`) y la barra con chips, «Lista | Calendario» y la acción.
// Sin contadores visibles, sin mayúsculas sostenidas y botones solo con texto.

// Qué dice cada actividad de su lugar: abierta, cupo completo, finalizada, cancelada o consultar al personal
function estadoTexto(a: ActividadAgenda, hoy: string) {
    if (a.cancelada) return { texto: "Cancelada", tono: "gris" };
    const e = estadoActividad(a, hoy);
    if (e === "finalizada") return { texto: "Finalizada", tono: "gris" };
    if (e === "cupo") return { texto: "Cupo completo", tono: "guinda" };
    if (a.inscripcionAbierta === false) return { texto: "Consulta al personal", tono: "dorado" };
    return { texto: "Inscripción abierta", tono: "verde" };
}

// La próxima actividad, grande: foto a la izquierda y, a la derecha, tipo y fecha, nombre, horario y lugar, y el botón
export function DestacadaEvento({ actividad: a }: { actividad: ActividadAgenda }) {
    return (
        <Link to={`/eventos/${a.id}`} className="noticia-principal evento-destacada">
            <img className="noticia-principal__circulo noticia-principal__circulo--1" src={circuloGrande} alt="" />
            <img className="noticia-principal__circulo noticia-principal__circulo--2" src={circuloChico} alt="" />
            <span className="noticia-principal__imagen">
                <img src={a.imagen} alt="" />
            </span>
            <span className="noticia-principal__textos">
                <span className="noticia-principal__meta">
                    <span className="evento-pastilla evento-pastilla--claro">{nombreCorto[a.categoria]}</span>
                    Próxima actividad · {fechaCompleta(a.fecha)}
                </span>
                <span className="noticia-principal__titulo">{a.titulo}</span>
                <span className="noticia-principal__resumen">{a.horario} h en {a.lugar}.{a.publico ? ` Para ${a.publico.charAt(0).toLowerCase()}${a.publico.slice(1)}.` : ""}</span>
                <span className="boton-noticias boton-noticias--dorado">Ver la actividad</span>
            </span>
        </Link>
    );
}

// Tarjeta de una actividad (cuadrícula o lista): foto con la fecha, tipo y estado, nombre, horario y lugar, «Ver detalle»
export function TarjetaEvento({ actividad: a, hoy, vista = "cuadricula" }: { actividad: ActividadAgenda; hoy: string; vista?: "cuadricula" | "lista" | "chica" }) {
    const estado = estadoTexto(a, hoy);
    const [dia, mes] = diaMes(a.fecha);
    return (
        <Link to={`/eventos/${a.id}`} className={`tarjeta-noticia tarjeta-noticia--${vista === "chica" ? "chica" : vista} tarjeta-evento${a.cancelada ? " tarjeta-evento--cancelada" : ""}`}>
            <span className="tarjeta-noticia__imagen">
                <img loading="lazy" decoding="async" src={a.imagen} alt="" />
                <span className="tarjeta-evento__fecha" aria-hidden="true"><strong>{dia}</strong>{mes}</span>
            </span>
            <span className="tarjeta-noticia__textos">
                <span className="tarjeta-noticia__meta">
                    <span className="evento-pastilla">{nombreCorto[a.categoria]}</span>
                    <span className={`evento-estado evento-estado--${estado.tono}`}>{estado.texto}</span>
                </span>
                <span className="tarjeta-noticia__titulo">{a.titulo}</span>
                <span className="tarjeta-noticia__resumen">{fechaCompleta(a.fecha)}, {a.horario} h. {a.lugar}.</span>
                <span className="tarjeta-noticia__leer">{estadoActividad(a, hoy) === "finalizada" ? "Ver resumen" : "Ver detalle"}</span>
            </span>
        </Link>
    );
}

// «Lista | Calendario»: las dos formas de ver la agenda, como pastillas segmentadas
// Dos opciones del mismo ancho, cada una con su ícono pintado con `mask` (verde sin elegir, blanco la elegida)
export function SelectorVistaEventos({ actual }: { actual: "lista" | "calendario" }) {
    const opciones = [
        { valor: "lista", texto: "Lista", ruta: "/eventos", icono: iconoLista },
        { valor: "calendario", texto: "Calendario", ruta: "/eventos/calendario", icono: iconoCalendario },
    ] as const;
    return (
        <nav className="evento-vista" aria-label="Forma de ver la agenda">
            {opciones.map((o) => (
                <Link key={o.valor} to={o.ruta} aria-current={actual === o.valor ? "page" : undefined}
                    className={`evento-vista__opcion${actual === o.valor ? " evento-vista__opcion--activa" : ""}`}>
                    <span className="evento-vista__icono" style={{ "--icono": `url("${o.icono}")` } as CSSProperties} aria-hidden="true" />
                    {o.texto}
                </Link>
            ))}
        </nav>
    );
}

// Con sesión: invitación a proponer una actividad, en una sola línea (nota verde del catálogo)
export function ProponerEvento() {
    return (
        <section className="perfil-protegidos evento-proponer" aria-label="Proponer una actividad">
            <p><strong>¿Tienes una idea para la biblioteca?</strong> Propón un evento o un club; el personal la revisa y te responde.</p>
            <div className="perfil-acciones">
                <Link to="/mi-perfil/propuestas" className="perfil-boton perfil-boton--chico perfil-boton--contorno">Mis propuestas</Link>
                <Link to="/proponer" className="perfil-boton perfil-boton--chico">Proponer</Link>
            </div>
        </section>
    );
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function diaMes(fecha: string): [string, string] {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    return m ? [String(Number(m[3])), MESES[Number(m[2]) - 1]] : ["", ""];
}
