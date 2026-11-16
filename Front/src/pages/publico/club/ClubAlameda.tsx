import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EncabezadoNoticias } from "../noticias/piezas";
import "../noticias/Noticias.css";
import { ModalAgenda } from "../eventos/DetalleActividad";
import "../eventos/Agenda.css";
import { mensajeError, obtenerSupabase } from '../../../servicios/api';
import { consultarTemasForo, consultarTemaForo, consultarRespuestasForo, publicarRespuestaForo, editarRespuestaForo, retirarRespuestaForo, type RespuestaReal, type TemaReal } from '../../../servicios/foro';
import { reportarContenidoForo } from '../../../servicios/moderacion';
import {
    MAXIMO_COMENTARIO, MAXIMO_RESPUESTA, NORMAS_CLUB, actividadRelativa, fechaPublicacion, inicialDe,
    textoRespuestas, validarReporte,
    validarRespuesta, type ColorTema, type Tema,
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

// Club Alameda · foro de la Bibliocomunidad (HU-26). Figma A-02: 759:93132 inicio, 759:93772 detalle de un hilo.
// Sin diseño en Figma (se armó con las piezas del portal): el reporte de una respuesta, la respuesta «En revisión»,
// la invitación a iniciar sesión y el aviso de cuenta silenciada.
const ICONOS: Record<ColorTema, string> = { verde: libroVerde, dorado: libroDorado, rosa: libroRosa, gris: libroGris };

function useSesionForo() {
    const [sesion, setSesion] = useState<string | null | undefined>();
    useEffect(() => {
        let vigente = true; let cancelar: (() => void) | undefined;
        obtenerSupabase().then(cliente => {
            if (!vigente) return;
            const { data } = cliente.auth.onAuthStateChange((_evento, actual) => { if (vigente) setSesion(actual?.user.id ?? null); });
            cancelar = () => data.subscription.unsubscribe();
        }).catch(() => { if (vigente) setSesion(null); });
        return () => { vigente = false; cancelar?.(); };
    }, []);
    return sesion;
}
function useConsulta<T>(clave: string, consulta: () => Promise<T>, identidad = clave) {
    const [resultado, setResultado] = useState<{ clave: string; identidad: string; datos?: T; error?: string }>({ clave: '', identidad: '' });
    useEffect(() => {
        let vigente = true;
        consulta().then(datos => { if (vigente) setResultado({ clave, identidad, datos }); }).catch(error => { if (vigente) setResultado({ clave, identidad, error: mensajeError(error) }); });
        return () => { vigente = false; };
        // La clave contiene identidad, recurso, página y recarga.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave]);
    return resultado.clave === clave || (resultado.identidad === identidad && resultado.datos) ? resultado : undefined;
}

// ---------- Inicio del foro ----------
export default function ClubAlameda() {
    const sesion = useSesionForo(); const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0);
    const carga = useConsulta(`${sesion}:${pagina}:${intento}`, () => consultarTemasForo(pagina));
    return (
        <PaginaPublica>
            <EncabezadoNoticias
                etiqueta="CLUB ALAMEDA"
                titulo={<>Club <span>Alameda</span></>}
                texto="Las buenas historias se disfrutan más cuando se comparten."
            />
            <div className="club-cuerpo">
                <h2 className="club-titulo">Elige un tema</h2>
                <p className="club-subtitulo">Lee las respuestas y comparte tu opinión.</p>
                <div className="club-temas">
                    {!carga && <p role="status">Cargando conversaciones…</p>}
                    {carga?.error && <p role="alert">{carga.error} <button className="club-boton" onClick={() => recargar(x => x + 1)}>Reintentar</button></p>}
                    {carga?.datos?.temas.length === 0 && <p className="club-vacio">Todavía no hay conversaciones publicadas.</p>}
                    {carga?.datos?.temas.map(t => <TarjetaTema key={t.slug} tema={t} respuestas={t.respuestas} ultimaActividad={t.ultimaActividad} />)}
                </div>
                {carga?.datos && <div className="club-respuesta__acciones"><button className="club-boton club-boton--contorno" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</button><span>Página {pagina + 1}</span><button className="club-boton club-boton--contorno" disabled={(pagina + 1) * 20 >= carga.datos.total} onClick={() => setPagina(p => p + 1)}>Siguiente</button></div>}
                <section className="club-respeto">
                    <h2>Un espacio para compartir con respeto</h2>
                    <p>Libros, lectura y actividades · Respeto entre participantes</p>
                    <p>Sin ventas ni publicidad no autorizada · Sin datos personales de otras personas</p>
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
    const { tema: slug = '' } = useParams(); const sesion = useSesionForo();
    return <HiloPersistente key={`${slug}:${sesion}`} slug={slug} sesion={sesion} />;
}
function HiloPersistente({ slug, sesion }: { slug: string; sesion: string | null | undefined }) {
    const [reportando, setReportando] = useState<RespuestaReal | null>(null);
    const [reportado, setReportado] = useState(false); const [pagina, setPagina] = useState(0); const [intento, recargar] = useState(0);
    const carga = useConsulta(`${slug}:${sesion}:${pagina}:${intento}`, async () => {
        const [tema, respuestas] = await Promise.all([consultarTemaForo(slug), consultarRespuestasForo(slug, pagina)]);
        return { tema, ...respuestas };
    }, `${slug}:${sesion}:${pagina}`);
    useEffect(() => { const refrescar = () => recargar(x => x + 1); window.addEventListener('focus', refrescar); return () => window.removeEventListener('focus', refrescar); }, []);
    const tema: TemaReal | undefined = carga?.datos?.tema; const lista = carga?.datos?.respuestas ?? [];
    const publicadas = tema?.respuestas ?? 0;
    const actualizar = () => recargar(x => x + 1);
    if (!tema) return <PaginaPublica><div className="club-cuerpo"><Link to="/club-alameda">Volver al foro</Link>{carga?.error ? <p role="alert">{carga.error} <button className="club-boton" onClick={actualizar}>Reintentar</button></p> : <p role="status">Cargando conversación…</p>}</div></PaginaPublica>;
    return (
        <PaginaPublica>
            <EncabezadoNoticias
                regreso={{ texto: "Volver al foro", ruta: "/club-alameda" }}
                etiqueta="CLUB ALAMEDA"
                titulo={tema.titulo.replace(/^Reseña: /, "")}
                texto="Conversación del Club Alameda"
            />
            <div className="club-cuerpo club-hilo">
                <div className="club-hilo__principal">
                    <article className="club-inicial">
                        <p className="club-inicial__sobretitulo">PARA ABRIR LA CONVERSACIÓN</p>
                        <p className="club-inicial__fecha">Publicación inicial · {fechaPublicacion(tema.inicial.fecha)}</p>
                        <p className="club-inicial__texto">{tema.inicial.titulo}<br />{tema.inicial.texto}</p>
                    </article>
                    <h2 className="club-titulo club-titulo--respuestas">{textoRespuestas(publicadas)}</h2>
                    {lista.length === 0 && <p className="club-vacio">Todavía no hay respuestas. ¡Sé la primera persona en participar!</p>}
                    {lista.map((x, i) => (
                        <TarjetaRespuesta
                            key={x.id} respuesta={x} indice={i} conSesion={!!sesion}
                            reportada={x.reportada} alReportar={() => setReportando(x)} alGuardar={actualizar}
                        />
                    ))}
                    {sesion === null ? (
                        <section className="club-responder club-responder--sin-sesion">
                            <h2>Tu lectura también cuenta</h2>
                            <p>Inicia sesión para responder y reportar publicaciones. Puedes leer las conversaciones sin cuenta.</p>
                            <Link className="club-boton" to="/iniciar-sesion">Iniciar sesión <img src={flechaBlanca} alt="" /></Link>
                        </section>
                    ) : sesion === undefined ? <p role="status">Comprobando sesión…</p> : (
                        <FormularioRespuesta key={tema.slug} tema={tema.slug} alGuardar={actualizar} />
                    )}
                    <div className="club-respuesta__acciones"><button className="club-boton club-boton--contorno" onClick={actualizar}>Actualizar conversación</button><button className="club-boton club-boton--contorno" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</button><span>Página {pagina + 1}</span><button className="club-boton club-boton--contorno" disabled={(pagina + 1) * 20 >= (carga?.datos?.total ?? 0)} onClick={() => setPagina(p => p + 1)}>Siguiente</button></div>
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
                    alEnviar={async (norma, comentario) => {
                        await reportarContenidoForo('comentario', reportando.id, `${NORMAS_CLUB[norma - 1]}${comentario.trim() ? ' · ' + comentario.trim() : ''}`);
                        setReportando(null); setReportado(true); actualizar();
                    }}
                />
            )}
            {reportado && (
                <ModalAgenda titulo="Gracias por avisarnos" sobretitulo="Reporte enviado" icono={checkEnviada} alCerrar={() => setReportado(false)}>
                    <p className="modal-agenda__texto">El personal revisará la respuesta según las normas del Club Alameda. No le diremos a nadie quién la reportó.</p>
                    <div className="modal-agenda__acciones">
                        <button type="button" className="agenda-boton agenda-boton--verde" onClick={() => setReportado(false)}>Entendido</button>
                    </div>
                </ModalAgenda>
            )}
        </PaginaPublica>
    );
}

const AVATARES = ["verde", "rosa", "dorado", "gris"];

function TarjetaRespuesta({ respuesta: x, indice, conSesion, reportada, alReportar, alGuardar }: {
    respuesta: RespuestaReal; indice: number; conSesion: boolean; reportada: boolean; alReportar: () => void; alGuardar: () => void;
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
                    <p className="club-respuesta__fecha">{fechaPublicacion(x.fecha)}</p>
                </div>
            </div>
            <p className="club-respuesta__texto">{x.texto}</p>
            {x.estado === "en-revision" && (
                <p className="club-nota"><img src={infoVerde} alt="" />Solo tú la ves. Se mostrará a todos cuando el personal la apruebe.</p>
            )}
            {conSesion && x.propia && <AccionesPropias respuesta={x} alGuardar={alGuardar} />}
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

function FormularioRespuesta({ tema, alGuardar }: { tema: string; alGuardar: () => void }) {
    const [texto, setTexto] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false); const bloqueo = useRef(false); const identificador = useRef(crypto.randomUUID());
    const enviar = async (e: FormEvent) => {
        e.preventDefault();
        const problema = validarRespuesta(texto);
        setError(problema);
        if (problema || bloqueo.current) return;
        bloqueo.current = true; setOcupado(true); setAviso(null);
        try {
            const nueva = await publicarRespuestaForo(tema, identificador.current, texto);
            identificador.current = crypto.randomUUID(); setTexto('');
            setAviso(nueva.estado === 'pendiente' ? 'Recibimos tu respuesta. El personal la revisará antes de mostrarla.' : 'Tu respuesta ya está publicada.'); alGuardar();
        } catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setOcupado(false); }
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
            <button type="submit" className="club-boton" disabled={ocupado}>{ocupado ? "Guardando…" : "Publicar respuesta"}</button>
        </form>
    );
}

function ModalReporte({ respuesta, alCerrar, alEnviar }: { respuesta: RespuestaReal; alCerrar: () => void; alEnviar: (norma: number, comentario: string) => Promise<void> }) {
    const [norma, setNorma] = useState<number | "">("");
    const [comentario, setComentario] = useState("");
    const [errores, setErrores] = useState<{ norma?: string; comentario?: string }>({});
    const [error, setError] = useState(''); const [ocupado, setOcupado] = useState(false); const bloqueo = useRef(false);
    const enviar = async () => {
        const e = validarReporte(norma, comentario);
        setErrores(e);
        if (e.norma || e.comentario || norma === '' || bloqueo.current) return;
        bloqueo.current = true; setOcupado(true); setError('');
        try { await alEnviar(norma, comentario); } catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setOcupado(false); }
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
                {error && <p className="club-error" role="alert">{error}</p>}
                <button type="button" disabled={ocupado} className="agenda-boton agenda-boton--contorno-verde" onClick={alCerrar}>Cancelar</button>
                <button type="button" className="agenda-boton agenda-boton--verde" disabled={ocupado} onClick={() => void enviar()}>{ocupado ? "Enviando…" : "Enviar reporte"}</button>
            </div>
        </ModalAgenda>
    );
}

function AccionesPropias({ respuesta, alGuardar }: { respuesta: RespuestaReal; alGuardar: () => void }) {
    const [modo, setModo] = useState<'editar' | 'retirar' | null>(null); const [texto, setTexto] = useState(respuesta.texto);
    const [error, setError] = useState(''); const [ocupado, setOcupado] = useState(false); const bloqueo = useRef(false);
    async function guardar() {
        if (bloqueo.current) return;
        if (modo === 'editar') { const problema = validarRespuesta(texto); if (problema) return setError(problema); }
        bloqueo.current = true; setOcupado(true); setError('');
        try { if (modo === 'editar') await editarRespuestaForo(respuesta, texto); else await retirarRespuestaForo(respuesta); setModo(null); alGuardar(); }
        catch (error) { setError(mensajeError(error)); } finally { bloqueo.current = false; setOcupado(false); }
    }
    return <><div className="club-respuesta__acciones"><button className="club-boton club-boton--contorno" onClick={() => setModo('editar')}>Editar mi respuesta</button><button className="club-boton club-boton--contorno" onClick={() => setModo('retirar')}>Retirar mi respuesta</button></div>
        {modo && <ModalAgenda titulo={modo === 'editar' ? 'Editar mi respuesta' : 'Retirar mi respuesta'} icono={infoVerde} alCerrar={() => { if (!ocupado) setModo(null); }}>
            {modo === 'editar' ? <div className="club-campo"><label htmlFor="club-editar">Respuesta</label><textarea id="club-editar" value={texto} maxLength={MAXIMO_RESPUESTA} onChange={e => setTexto(e.target.value)} /><p className="club-ayuda">La edición volverá a revisión antes de mostrarse públicamente.</p></div> : <p className="modal-agenda__texto">Tu respuesta dejará de mostrarse. Se conservará el registro del retiro.</p>}
            {error && <p role="alert" className="club-error">{error}</p>}<div className="modal-agenda__acciones"><button className="agenda-boton agenda-boton--contorno-verde" disabled={ocupado} onClick={() => setModo(null)}>Cancelar</button><button className="agenda-boton agenda-boton--verde" disabled={ocupado} onClick={() => void guardar()}>{ocupado ? 'Guardando…' : 'Confirmar'}</button></div>
        </ModalAgenda>}
    </>;
}
