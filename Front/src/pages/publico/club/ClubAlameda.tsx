import { useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EncabezadoNoticias } from "../noticias/piezas";
import "../noticias/Noticias.css";
import { ModalAgenda } from "../eventos/DetalleActividad";
import "../eventos/Agenda.css";
import { useSesion, usePerfil } from "../perfil/usarSesion";
import {
    MAXIMO_COMENTARIO, MAXIMO_RESPUESTA, NORMAS_CLUB, TEMAS, actividadRelativa, aprobarMisRespuestas, fechaPublicacion, inicialDe,
    publicarRespuesta, reportarRespuesta, respuestasDe, resumenTema, temaPorSlug, textoRespuestas, useClub, validarReporte,
    validarRespuesta, verSilenciada, type ColorTema, type Respuesta, type Tema,
} from "./datos";
import "./ClubAlameda.css";
import libroVerde from "../../../assets/club/lecturas.svg";
import libroDorado from "../../../assets/club/intercambio.svg";
import libroRosa from "../../../assets/club/recomendaciones.svg";
import libroGris from "../../../assets/club/escritura.svg";
import alertaGuinda from "../../../assets/credencial/alerta-guinda.svg";
import checkEnviada from "../../../assets/credencial/enviada-check.svg";
import infoVerde from "../../../assets/credencial/info-verde.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";

// Bibliocomunidad · foro de lectura (HU-26, alcance reducido 762:95841). Figma A-02: 759:93132 inicio, 759:93772 detalle de un hilo;
// A-01: 280:1065 vista de visitante (sin sesión se invita a iniciar sesión; no se pide credencial). La URL /club-alameda se conserva.
// Sin diseño en Figma (se armó con las piezas del portal): el reporte de una respuesta, la respuesta «En revisión»,
// la invitación a iniciar sesión y el aviso de cuenta silenciada.
const ICONOS: Record<ColorTema, string> = { verde: libroVerde, dorado: libroDorado, rosa: libroRosa, gris: libroGris };

function useParticipante(): { sesion: string | null | undefined; nombre: string | null } {
    const sesion = useSesion();
    const carga = usePerfil(sesion);
    const nombre = carga && "perfil" in carga ? carga.perfil.nombres.trim().split(/\s+/)[0] || carga.perfil.nombres : null;
    return { sesion, nombre };
}

// ---------- Inicio del foro ----------
export default function ClubAlameda() {
    const { respuestas } = useClub();
    const sesion = useSesion();
    if (sesion === undefined) return <PaginaPublica><p className="club-cuerpo" role="status">Cargando Bibliocomunidad…</p></PaginaPublica>;
    if (sesion === null) return <BibliocomunidadVisitante />;
    return (
        <PaginaPublica>
            <EncabezadoNoticias
                etiqueta="BIBLIOCOMUNIDAD"
                titulo="Bibliocomunidad"
                texto="Un foro para conversar sobre libros, lecturas y actividades."
            />
            <div className="club-cuerpo">
                <h2 className="club-titulo">Temas del foro</h2>
                <p className="club-subtitulo">Elige un tema para leer las respuestas o escribir la tuya.</p>
                <div className="club-temas">
                    {TEMAS.map((t) => <TarjetaTema key={t.slug} tema={t} {...resumenTema(t, respuestas)} />)}
                </div>
                <section className="club-respeto">
                    <h2>Un espacio para compartir con respeto</h2>
                    <p>Libros, lectura y actividades · Respeto entre participantes</p>
                    <p>Sin ventas ni publicidad no autorizada · Sin datos personales de otras personas</p>
                </section>
            </div>
        </PaginaPublica>
    );
}

// Sin sesión (Figma A-01 280:1065): cómo funciona, temas y acceso con cuenta
function BibliocomunidadVisitante() {
    return (
        <PaginaPublica>
            <EncabezadoNoticias
                regreso={{ texto: "Volver a Servicios y programas", ruta: "/servicios" }}
                etiqueta="FORO DE LECTURA"
                titulo="Bibliocomunidad"
                texto="Un espacio para compartir lecturas y conversar con otras personas."
            />
            <div className="club-cuerpo">
                <div className="club-visitante">
                    <section aria-labelledby="club-como-titulo">
                        <p className="club-inicial__sobretitulo">PARA PARTICIPAR</p>
                        <h2 id="club-como-titulo" className="club-titulo">Cómo funciona</h2>
                        <ol className="club-pasos">
                            <li>Inicia sesión con tu cuenta del portal</li>
                            <li>Elige un tema y escribe una respuesta</li>
                            <li>Respeta las normas del foro</li>
                        </ol>
                    </section>
                    <section className="club-visitante__temas" aria-labelledby="club-temas-titulo">
                        <p id="club-temas-titulo" className="club-inicial__sobretitulo">TEMAS PARA CONVERSAR</p>
                        <ul>{TEMAS.map((t) => <li key={t.slug}>{t.titulo.replace(" (ejemplo)", "")}</li>)}</ul>
                    </section>
                </div>
                <section className="club-respeto club-unete" aria-labelledby="club-unete-titulo">
                    <p className="club-inicial__sobretitulo">ACCESO CON CUENTA</p>
                    <h2 id="club-unete-titulo">Únete a la conversación</h2>
                    <p>Inicia sesión para consultar los temas y responder. El personal revisará tu primera respuesta.</p>
                    <Link className="club-boton" to="/iniciar-sesion">Iniciar sesión para participar <img src={flechaBlanca} alt="" /></Link>
                </section>
            </div>
        </PaginaPublica>
    );
}

function TarjetaTema({ tema, respuestas, ultimaActividad }: { tema: Tema; respuestas: number; ultimaActividad: string }) {
    return (
        <Link to={`/club-alameda/${tema.slug}`} className={`club-tema club-tema--${tema.color}`}>
            <span className="club-tema__motivo">
                <img src={ICONOS[tema.color]} alt="" width={64} height={64} />
                <span>{tema.numero} / {tema.etiqueta}</span>
            </span>
            <h3>{tema.titulo}</h3>
            <p className="club-tema__descripcion">{tema.descripcion}</p>
            <p className="club-tema__meta">{textoRespuestas(respuestas)} · Última actividad: {actividadRelativa(ultimaActividad)}</p>
            <span className="club-tema__entrar">Entrar a la conversación →</span>
        </Link>
    );
}

// ---------- Detalle de un hilo ----------
export function HiloClub() {
    const { tema: slug } = useParams();
    const tema = temaPorSlug(slug);
    const club = useClub();
    const { sesion, nombre } = useParticipante();
    const [reportando, setReportando] = useState<Respuesta | null>(null);
    const [reportado, setReportado] = useState(false);
    if (!tema) return <Navigate to="/club-alameda" replace />;
    // El foro requiere sesión (alcance reducido): sin sesión se va a iniciar sesión
    if (sesion === null) return <Navigate to="/iniciar-sesion" replace />;
    const lista = respuestasDe(tema.slug, club.respuestas);
    const publicadas = lista.filter((x) => x.estado === "publicada").length;

    return (
        <PaginaPublica>
            <EncabezadoNoticias
                regreso={{ texto: "Volver al foro", ruta: "/club-alameda" }}
                etiqueta="BIBLIOCOMUNIDAD"
                titulo={tema.titulo.replace(/^Reseña: /, "")}
                texto="Una de las cuatro conversaciones de Bibliocomunidad"
            />
            <div className="club-cuerpo club-hilo">
                <div className="club-hilo__principal">
                    <article className="club-inicial">
                        <p className="club-inicial__sobretitulo">PARA ABRIR LA CONVERSACIÓN</p>
                        <p className="club-inicial__fecha">Publicación inicial · {fechaPublicacion(tema.inicial.fecha)} (ejemplo)</p>
                        <p className="club-inicial__texto">{tema.inicial.titulo}<br />{tema.inicial.texto}</p>
                    </article>
                    <h2 className="club-titulo club-titulo--respuestas">{textoRespuestas(publicadas)}</h2>
                    {lista.length === 0 && <p className="club-vacio">Todavía no hay respuestas. ¡Sé la primera persona en participar!</p>}
                    {lista.map((x, i) => (
                        <TarjetaRespuesta
                            key={x.id} respuesta={x} indice={i} conSesion={!!sesion}
                            reportada={club.reportadas.includes(x.id)} alReportar={() => setReportando(x)}
                        />
                    ))}
                    {sesion === null ? (
                        <section className="club-responder club-responder--sin-sesion">
                            <h2>Tu lectura también cuenta</h2>
                            <p>Inicia sesión para responder y reportar publicaciones. Puedes leer las conversaciones sin cuenta.</p>
                            <Link className="club-boton" to="/iniciar-sesion">Iniciar sesión <img src={flechaBlanca} alt="" /></Link>
                        </section>
                    ) : club.silenciadaHasta ? (
                        <section className="club-responder club-responder--silenciada" role="status">
                            <h2>Por ahora no puedes publicar</h2>
                            <p>
                                El personal pausó tu participación en el foro hasta el {fechaPublicacion(`${club.silenciadaHasta}T00:00`).split(",")[0]} por no seguir las
                                normas. Puedes seguir leyendo las conversaciones.
                            </p>
                        </section>
                    ) : (
                        <FormularioRespuesta key={tema.slug} tema={tema.slug} autor={nombre} />
                    )}
                    {import.meta.env.DEV && sesion && (
                        <p className="club-ejemplo">
                            Vista de ejemplo:{" "}
                            <button type="button" onClick={aprobarMisRespuestas}>el personal aprueba mis respuestas</button>{" · "}
                            <button type="button" onClick={() => verSilenciada(club.silenciadaHasta ? null : "2026-11-30")}>
                                {club.silenciadaHasta ? "quitar el silencio" : "cuenta silenciada"}
                            </button>
                        </p>
                    )}
                </div>
                <aside className="club-normas">
                    <h2>Normas para participar</h2>
                    <ol>{NORMAS_CLUB.map((n) => <li key={n}>{n}</li>)}</ol>
                </aside>
            </div>
            {reportando && (
                <ModalReporte
                    respuesta={reportando}
                    alCerrar={() => setReportando(null)}
                    alEnviar={() => { reportarRespuesta(reportando.id); setReportando(null); setReportado(true); }}
                />
            )}
            {reportado && (
                <ModalAgenda titulo="Gracias por avisarnos" sobretitulo="Reporte enviado" icono={checkEnviada} alCerrar={() => setReportado(false)}>
                    <p className="modal-agenda__texto">El personal revisará la respuesta según las normas de Bibliocomunidad. No le diremos a nadie quién la reportó.</p>
                    <div className="modal-agenda__acciones">
                        <button type="button" className="agenda-boton agenda-boton--verde" onClick={() => setReportado(false)}>Entendido</button>
                    </div>
                </ModalAgenda>
            )}
        </PaginaPublica>
    );
}

const AVATARES = ["verde", "rosa", "dorado", "gris"];

function TarjetaRespuesta({ respuesta: x, indice, conSesion, reportada, alReportar }: {
    respuesta: Respuesta; indice: number; conSesion: boolean; reportada: boolean; alReportar: () => void;
}) {
    return (
        <article className={`club-respuesta${x.estado === "en-revision" ? " club-respuesta--revision" : ""}`}>
            <div className="club-respuesta__participante">
                <span className={`club-avatar club-avatar--${AVATARES[indice % AVATARES.length]}`} aria-hidden="true">{inicialDe(x.autor)}</span>
                <div>
                    <p className="club-respuesta__nombre">
                        {x.autor}{x.propia && " (tú)"}
                        {x.estado === "en-revision" && <span className="club-chip">En revisión</span>}
                    </p>
                    <p className="club-respuesta__fecha">{fechaPublicacion(x.fecha)}{x.propia ? "" : " (ejemplo)"}</p>
                </div>
            </div>
            <p className="club-respuesta__texto">{x.texto}</p>
            {x.estado === "en-revision" && (
                <p className="club-nota"><img src={infoVerde} alt="" />Solo tú la ves. Se mostrará a todos cuando el personal la apruebe.</p>
            )}
            {conSesion && !x.propia && (
                <div className="club-respuesta__acciones">
                    {reportada
                        ? <span className="club-reportada" role="status">Reportada · el personal la revisará</span>
                        : <button type="button" className="club-boton club-boton--contorno" onClick={alReportar}>Reportar</button>}
                </div>
            )}
        </article>
    );
}

function FormularioRespuesta({ tema, autor }: { tema: string; autor: string | null }) {
    const [texto, setTexto] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const enviar = (e: FormEvent) => {
        e.preventDefault();
        const problema = validarRespuesta(texto);
        setError(problema);
        if (problema || !autor) return;
        const nueva = publicarRespuesta(tema, autor, texto);
        setTexto("");
        setAviso(nueva.estado === "en-revision"
            ? "Recibimos tu respuesta. Como es la primera, el personal la revisa antes de mostrarla."
            : "Tu respuesta ya está publicada.");
    };
    return (
        <form className="club-responder" onSubmit={enviar} noValidate>
            <h2>Tu lectura también cuenta</h2>
            <div className="club-campo">
                <label htmlFor="club-respuesta">Tu respuesta</label>
                <textarea
                    id="club-respuesta" value={texto} placeholder="Escribe tu respuesta…" maxLength={MAXIMO_RESPUESTA + 200}
                    aria-invalid={!!error} aria-describedby="club-respuesta-ayuda"
                    onChange={(e) => { setTexto(e.target.value); setAviso(null); }}
                />
            </div>
            {error && <p className="club-error" role="alert">{error}</p>}
            <p id="club-respuesta-ayuda" className="club-ayuda">
                Máximo 1,000 caracteres. Tu primera respuesta se revisa antes de mostrarse.
                {texto.length > 0 && <span> · {texto.trim().length.toLocaleString("es-MX")} / 1,000</span>}
            </p>
            {aviso && <p className="club-nota" role="status"><img src={infoVerde} alt="" />{aviso}</p>}
            <button type="submit" className="club-boton" disabled={!autor}>Publicar respuesta</button>
        </form>
    );
}

function ModalReporte({ respuesta, alCerrar, alEnviar }: { respuesta: Respuesta; alCerrar: () => void; alEnviar: () => void }) {
    const [norma, setNorma] = useState<number | "">("");
    const [comentario, setComentario] = useState("");
    const [errores, setErrores] = useState<{ norma?: string; comentario?: string }>({});
    const enviar = () => {
        const e = validarReporte(norma, comentario);
        setErrores(e);
        if (!e.norma && !e.comentario) alEnviar(); // TODO backend: POST /api/foro/respuestas/{id}/reportes
    };
    return (
        <ModalAgenda titulo="Reportar una respuesta" icono={alertaGuinda} iconoGuinda alCerrar={alCerrar}>
            <p className="modal-agenda__texto">Respuesta de {respuesta.autor}: «{respuesta.texto.length > 90 ? `${respuesta.texto.slice(0, 90)}…` : respuesta.texto}»</p>
            <div className="club-campo">
                <label htmlFor="club-norma">¿Qué norma no se cumple?</label>
                <select id="club-norma" value={norma} aria-invalid={!!errores.norma} onChange={(e) => setNorma(e.target.value === "" ? "" : Number(e.target.value))}>
                    <option value="">Elige una norma</option>
                    {NORMAS_CLUB.map((n, i) => <option key={n} value={i + 1}>{i + 1}. {n}</option>)}
                </select>
                {errores.norma && <p className="club-error" role="alert">{errores.norma}</p>}
            </div>
            <div className="club-campo">
                <label htmlFor="club-comentario">Comentario <span>(opcional)</span></label>
                <textarea id="club-comentario" className="club-campo__corto" value={comentario} aria-invalid={!!errores.comentario}
                    placeholder="Cuéntanos qué viste" onChange={(e) => setComentario(e.target.value)} />
                <p className="club-ayuda">Máximo {MAXIMO_COMENTARIO} caracteres.</p>
                {errores.comentario && <p className="club-error" role="alert">{errores.comentario}</p>}
            </div>
            <div className="modal-agenda__acciones">
                <button type="button" className="agenda-boton agenda-boton--contorno-verde" onClick={alCerrar}>Cancelar</button>
                <button type="button" className="agenda-boton agenda-boton--verde" onClick={enviar}>Enviar reporte</button>
            </div>
        </ModalAgenda>
    );
}
