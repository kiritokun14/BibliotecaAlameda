import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import { autorDe, autorizarYPublicar, cuandoConHora, eventosDe, fechaLarga, NOMBRE_ESTADO, obtenerContenido, useContenidos, YO, type Contenido } from "./datos";
import { ESQUEMAS, tituloDe, type TipoContenido } from "./esquemas";
import { CampoTexto, ChipEstado, Columnas, Datos, EncabezadoTarjeta, Migas, Pagina, PieDatos, Tarjeta, Ventana } from "./piezas";
import { clasesBoton, redactoCorto } from "./utiles";
import { NoEncontrado } from "./EditarContenido";
import { PreviaContenido } from "./VistaPreviaContenido";
import iconoOjo from "../../../assets/admin/contenidos/tarjeta-ojo.svg";
import iconoCheck from "../../../assets/admin/contenidos/tarjeta-check.svg";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoBalanza from "../../../assets/admin/contenidos/tarjeta-balanza.svg";
import iconoPersona from "../../../assets/admin/contenidos/tarjeta-persona.svg";
import iconoReloj from "../../../assets/admin/contenidos/tarjeta-reloj.svg";

const BASE = "/admin/contenidos/revision";

// Puntos del cotejo editorial según el tipo (ayuda para quien revisa; no bloquea la decisión)
const COTEJO: Record<TipoContenido, [string, string?][]> = {
    noticia: [
        ["Ortografía y redacción", "Sin errores evidentes."],
        ["Fecha y datos correctos", "Fecha, lugar y horario."],
        ["Tono institucional"],
        ["Texto alternativo de la imagen", "Describe la imagen para lector de pantalla."],
        ["Sin datos personales", "No aparecen nombres ni datos de terceros."],
    ],
    resena: [
        ["Ortografía y redacción", "Sin errores evidentes."],
        ["Datos del libro correctos", "Título, autoría y género."],
        ["Tono institucional"],
        ["Derechos de la imagen de portada", "Confirma que se puede publicar."],
        ["Autoría y área que firma la reseña", "Dato por confirmar con la biblioteca."],
    ],
    acerca: [
        ["Ortografía y redacción", "Sin errores evidentes."],
        ["Datos históricos confirmados", "Fechas y nombres revisados con la biblioteca."],
        ["Tono institucional"],
        ["Reemplaza la versión vigente", "Revisa que no se pierda información."],
    ],
    memoria: [
        ["Ortografía y redacción", "Sin errores evidentes."],
        ["Datos de la pieza correctos", "Título, fuente, tipo y periodo."],
        ["Tono institucional"],
        ["Permiso de uso de la imagen", "Confirma que se puede publicar."],
        ["Fuente y área que registra la pieza", "Dato por confirmar con la biblioteca."],
    ],
};

// HU-12 · Revisión de un contenido (Figma 560:17894, Memoria 604:48256; ventana 561:17817 y 610:48295)
function RevisarContenido() {
    const { folio } = useParams();
    useContenidos();
    const contenido = obtenerContenido(folio);
    if (!contenido || contenido.estado === "borrador") return <NoEncontrado ruta={BASE} texto="Volver a Revisión y publicación" />;
    return <Detalle key={contenido.folio} contenido={contenido} />;
}

function Detalle({ contenido }: { contenido: Contenido }) {
    const navigate = useNavigate();
    const esquema = ESQUEMAS[contenido.tipo];
    const puntos = COTEJO[contenido.tipo];
    const [marcados, setMarcados] = useState<boolean[]>(() => puntos.map((_, i) => i < 3));
    const [nota, setNota] = useState(contenido.notaInterna ?? "");
    const [ventana, setVentana] = useState(false);
    const porAutorizar = contenido.estado === "por-autorizar";
    const ruta = `${BASE}/${contenido.folio}`;
    const titulo = contenido.tipo === "memoria" ? "Revisión de la pieza de Memoria pública" : `Revisión de ${esquema.enFrase}`;

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Revisión y publicación", BASE], [porAutorizar ? "Contenido por autorizar" : NOMBRE_ESTADO[contenido.estado]]]} />

                <EncabezadoTarjeta
                    volver={{ texto: "Volver a Revisión y publicación", ruta: BASE }}
                    etiqueta={`Contenido ${contenido.folio} · ${NOMBRE_ESTADO[contenido.estado]}`}
                    titulo={titulo}
                    texto={porAutorizar ? "Lee el contenido, cotéjalo y decide. Ninguna decisión se publica sin tu autorización." : "Este contenido ya no espera tu decisión. Aquí puedes consultarlo."}
                />

                <Columnas
                    principal={
                        <>
                            <Tarjeta icono={iconoOjo} titulo="Contenido enviado" subtitulo={`Así se publicaría. ${esquema.nombre} ${contenido.folio}.`}>
                                <PreviaContenido contenido={contenido} />
                                <div className="cn-acciones">
                                    <Link to={`${ruta}/vista-previa`} className={clasesBoton("contorno", "cn-boton--chico")}>Abrir vista previa completa</Link>
                                </div>
                            </Tarjeta>

                            {contenido.notaEnvio && (
                                <Tarjeta icono={iconoLapiz} titulo="Nota del Editor" subtitulo="La dejó al enviar a autorización.">
                                    <p className="cn-parrafo">{contenido.notaEnvio}</p>
                                </Tarjeta>
                            )}

                            {porAutorizar && (
                                <Tarjeta icono={iconoCheck} titulo="Cotejo editorial" subtitulo="Marca cada punto al revisarlo.">
                                    <ul className="cn-cotejo">
                                        {puntos.map(([t, d], i) => (
                                            <li key={t}>
                                                <label>
                                                    <span className="cn-casilla">
                                                        <input type="checkbox" checked={marcados[i]} onChange={() => setMarcados((m) => m.map((x, j) => (j === i ? !x : x)))} />
                                                        <span aria-hidden="true" />
                                                    </span>
                                                    <span>
                                                        <strong>{t}</strong>
                                                        {d && <small>{d}</small>}
                                                    </span>
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                </Tarjeta>
                            )}

                            {porAutorizar && (
                                <Tarjeta icono={iconoLapiz} titulo="Nota interna" subtitulo="Solo la ve el personal.">
                                    <CampoTexto id="cn-nota-interna" etiqueta="Nota">
                                        <textarea id="cn-nota-interna" className="cn-control cn-control--area" placeholder="Escribe una nota para el historial…" value={nota} onChange={(e) => setNota(e.target.value)} />
                                    </CampoTexto>
                                </Tarjeta>
                            )}
                        </>
                    }
                    lateral={
                        <>
                            {porAutorizar ? (
                                <Tarjeta icono={iconoBalanza} titulo="Decisión" tono="crema" lateral>
                                    <button type="button" className={clasesBoton("verde", "cn-boton--ancho")} onClick={() => setVentana(true)}>Autorizar y publicar</button>
                                    <p className="cn-subtitulo">Otras opciones</p>
                                    <Link to={`${ruta}/cambios`} className={clasesBoton("contorno", "cn-boton--ancho")}>Pedir cambios al Editor</Link>
                                    <span className="cn-divisor" aria-hidden="true" />
                                    <Link to={`${ruta}/rechazar`} className={clasesBoton("contorno-guinda", "cn-boton--ancho")}>Rechazar contenido</Link>
                                    <p className="cn-nota">Antes de publicar registras la autorización institucional. Se guarda quién, cuándo y con qué referencia.</p>
                                </Tarjeta>
                            ) : (
                                <EstadoActual contenido={contenido} />
                            )}

                            <Tarjeta icono={iconoPersona} titulo="Redactó" lateral>
                                <div className="cn-persona">
                                    <span className="cn-persona__avatar" aria-hidden="true">E</span>
                                    <div>
                                        <strong>{autorDe(contenido) === YO ? "Tú" : autorDe(contenido)}</strong>
                                        <small>Editor de contenidos (A-03)</small>
                                    </div>
                                </div>
                            </Tarjeta>

                            <Tarjeta icono={iconoReloj} titulo="Historial" lateral>
                                <ol className="cn-eventos">
                                    {eventosDe(contenido).map((e) => (
                                        <li key={e.titulo}>
                                            <span className="cn-eventos__punto" aria-hidden="true" />
                                            <span>
                                                <strong>{e.titulo}</strong>
                                                <small>{cuandoConHora(e.fecha)} (ejemplo)</small>
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </Tarjeta>
                        </>
                    }
                />

                <PieDatos />
            </Pagina>

            {ventana && (
                <VentanaAutorizar
                    contenido={contenido}
                    alCerrar={() => setVentana(false)}
                    alPublicar={(referencia, programada) => {
                        autorizarYPublicar(contenido.folio, referencia, nota, programada);
                        navigate(`${ruta}/publicado`);
                    }}
                />
            )}
        </PanelLayout>
    );
}

// Lo que ya se decidió (cuando el contenido no está por autorizar)
function EstadoActual({ contenido }: { contenido: Contenido }) {
    const ruta = `${BASE}/${contenido.folio}`;
    return (
        <Tarjeta icono={iconoBalanza} titulo="Estado" tono="crema" lateral>
            <p className="cn-estado-linea"><ChipEstado estado={contenido.estado} /></p>
            {contenido.estado === "observaciones" && contenido.observaciones && (
                <>
                    <p className="cn-nota">Observaciones enviadas el {fechaLarga(contenido.observaciones.fecha)}. Espera a que el Editor corrija.</p>
                    <ol className="cn-observaciones">{contenido.observaciones.puntos.map((p) => <li key={p}>{p}</li>)}</ol>
                </>
            )}
            {contenido.estado === "publicado" && <Link to={`${ruta}/publicado`} className={clasesBoton("verde", "cn-boton--ancho")}>Ver registro de publicación</Link>}
            {(contenido.estado === "publicado" || contenido.estado === "retirado") && (
                <Link to={`${BASE}/historial`} className={clasesBoton("suave", "cn-boton--ancho")}>Ver historial de publicaciones</Link>
            )}
            {contenido.estado === "rechazado" && <Link to={`${ruta}/rechazado`} className={clasesBoton("contorno-guinda", "cn-boton--ancho")}>Ver motivo del rechazo</Link>}
            {contenido.estado === "retirado" && contenido.retiro && <p className="cn-nota">Retirado: {contenido.retiro.motivo}</p>}
        </Tarjeta>
    );
}

const LUGAR: Record<TipoContenido, string> = {
    noticia: "en Noticias",
    resena: "en Lecturas y reseñas",
    acerca: "en Acerca de la biblioteca",
    memoria: "en Memoria pública",
};

// CA-12.2: sin la referencia de la autorización institucional no se puede publicar
function VentanaAutorizar({ contenido, alCerrar, alPublicar }: { contenido: Contenido; alCerrar: () => void; alPublicar: (referencia: string, programada?: string) => void }) {
    const esquema = ESQUEMAS[contenido.tipo];
    const [referencia, setReferencia] = useState("");
    const [cuando, setCuando] = useState<"ahora" | "programar">("ahora");
    const [fecha, setFecha] = useState("");
    const [errores, setErrores] = useState<{ referencia?: string; fecha?: string }>({});
    const [manana] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));

    function confirmar() {
        const nuevos: typeof errores = {};
        if (!referencia.trim()) nuevos.referencia = "Escribe la referencia de la autorización (oficio, acta o folio).";
        if (cuando === "programar" && !fecha) nuevos.fecha = "Elige la fecha de publicación.";
        setErrores(nuevos);
        if (Object.keys(nuevos).length === 0) alPublicar(referencia, cuando === "programar" ? fecha : undefined);
    }

    return (
        <Ventana
            titulo="Autorizar y publicar"
            texto={`${esquema.enFrase.charAt(0).toUpperCase()}${esquema.enFrase.slice(1)} se publicará ${LUGAR[contenido.tipo]} y quedará registrad${esquema.genero} en la bitácora.`}
            alCerrar={alCerrar}
            pie={
                <>
                    <button type="button" className={clasesBoton("contorno")} onClick={alCerrar}>Cancelar</button>
                    <button type="button" className={clasesBoton("verde")} onClick={confirmar}>Autorizar y publicar</button>
                </>
            }
        >
            <Datos variante="caja" filas={[["Folio", contenido.folio], ["Contenido", tituloDe(contenido.tipo, contenido.valores)], ["Redactó", redactoCorto(contenido)]]} />
            <CampoTexto id="cn-referencia" etiqueta="Referencia de la autorización institucional" obligatorio ayuda="Se guarda con la publicación." error={errores.referencia}>
                <input
                    id="cn-referencia"
                    className={`cn-control ${errores.referencia ? "cn-control--error" : ""}`}
                    placeholder="Oficio por confirmar"
                    value={referencia}
                    onChange={(e) => { setReferencia(e.target.value); setErrores((x) => ({ ...x, referencia: undefined })); }}
                    aria-invalid={!!errores.referencia}
                    aria-describedby={errores.referencia ? "cn-referencia-error" : "cn-referencia-ayuda"}
                />
            </CampoTexto>
            <div className="cn-opciones" role="radiogroup" aria-label="Cuándo se publica">
                <button type="button" role="radio" aria-checked={cuando === "ahora"} className="cn-opcion" onClick={() => setCuando("ahora")}>Publicar ahora</button>
                <button type="button" role="radio" aria-checked={cuando === "programar"} className="cn-opcion" onClick={() => setCuando("programar")}>Programar fecha</button>
            </div>
            {cuando === "programar" && (
                <CampoTexto id="cn-fecha-publicacion" etiqueta="Fecha de publicación" obligatorio error={errores.fecha}>
                    <input id="cn-fecha-publicacion" type="date" min={manana} className={`cn-control ${errores.fecha ? "cn-control--error" : ""}`} value={fecha} onChange={(e) => setFecha(e.target.value)} aria-invalid={!!errores.fecha} />
                </CampoTexto>
            )}
        </Ventana>
    );
}

export default RevisarContenido;
