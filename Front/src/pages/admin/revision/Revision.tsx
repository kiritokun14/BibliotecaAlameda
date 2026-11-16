// HU-12 · Revisión y publicación, conectada al backend (T-055, servicios/publicacion.ts).
// Diseño: el mismo del Editor de contenidos (clases «contenidos-*» y tema "contenidos").
// El contenido de cada pantalla sigue Figma 560:17409; los colores son los del Editor.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import ImagenContenido from "../../../components/ImagenContenido";
import "../contenidos/Contenidos.css";
import "./Revision.css";
import { Campo, IconoAviso, IconoBuscar, IconoDocumento, IconoLapiz, IconoLista, IconoReloj } from "../contenidos/piezas";
import { mensajeError } from "../../../servicios/api";
import {
    decidirContenido, listarRevision, obtenerRevision, rutaPublica,
    type ContenidoRevision, type DecisionPublicacion, type ListaRevision,
} from "../../../servicios/publicacion";
import {
    BASE_REVISION as BASE, MAXIMO_OBSERVACIONES, MOTIVOS_RECHAZO, cuandoRelativo, dondeSeVe, errorObservaciones, eventosDetalle,
    fechaCorta, fechaHora, filtrarHistorial, nombreCompleto, nombreTipo, notaObservaciones, notaRechazo, numerar, publicadosEnElMes,
    renglones, separarRechazo, textoAntiguedad, textoAutorizar, tituloPublicado, tituloRevision, ultimaPublicacion, versionPublicada,
    type FiltroHistorial,
} from "./datos";

// ---------- Íconos que el Editor no tiene (mismo trazo que los de contenidos/piezas.tsx) ----------

function Icono({ children, tamano = 18 }: { children: ReactNode; tamano?: number }) {
    return (
        <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {children}
        </svg>
    );
}
const IconoCheck = ({ tamano }: { tamano?: number }) => <Icono tamano={tamano}><path d="M20 6 9 17l-5-5" /></Icono>;
const IconoOjo = () => <Icono><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icono>;
const IconoPersona = () => <Icono><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icono>;
const IconoBalanza = () => <Icono><path d="M12 3v18M7 21h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0Zm14 0-3 6a3 3 0 0 0 6 0Z" /></Icono>;
const IconoFlecha = () => <Icono><path d="M5 12h14M12 5l7 7-7 7" /></Icono>;
const IconoX = ({ tamano }: { tamano?: number }) => <Icono tamano={tamano}><path d="M18 6 6 18M6 6l12 12" /></Icono>;
const IconoAyuda = () => <Icono><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 3.7" /><path d="M12 17h.01" /></Icono>;

// ---------- Estados con los nombres y colores del Editor ----------

const ESTADO: Record<string, { clase: string; texto: string }> = {
    borrador: { clase: "borrador", texto: "Borrador" },
    en_revision: { clase: "por_autorizar", texto: "Por autorizar" },
    con_observaciones: { clase: "con_observaciones", texto: "Con observaciones" },
    aprobado: { clase: "publicado", texto: "Aprobado" },
    publicado: { clase: "publicado", texto: "Publicado" },
    rechazado: { clase: "rechazado", texto: "Rechazado" },
    retirado: { clase: "retirado", texto: "Retirado" },
    archivado: { clase: "retirado", texto: "Archivado" },
};
const nombreEstado = (estado: string) => ESTADO[estado]?.texto ?? estado;

function Estado({ estado }: { estado: string }) {
    const e = ESTADO[estado] ?? { clase: "borrador", texto: estado };
    return <span className={`contenidos-estado contenidos-estado--${e.clase}`}>{e.texto}</span>;
}

// ---------- Carga de datos ----------

// Pide datos al backend y los vuelve a pedir cuando cambia `clave` o al llamar `recargar`
function useCarga<T>(clave: string, pedir: () => Promise<T>) {
    const [recarga, setRecarga] = useState(0);
    const [resultado, setResultado] = useState<{ clave: string; datos?: T; error?: string }>({ clave: "" });
    const actual = `${clave}#${recarga}`;
    useEffect(() => {
        let vigente = true;
        pedir()
            .then((datos) => { if (vigente) setResultado({ clave: actual, datos }); })
            .catch((error) => { if (vigente) setResultado({ clave: actual, error: mensajeError(error) }); });
        return () => { vigente = false; };
        // Solo se vuelve a pedir cuando cambia la clave (la función es nueva en cada render)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actual]);
    const vigente = resultado.clave === actual ? resultado : undefined;
    return { datos: vigente?.datos, error: vigente?.error, cargando: !vigente, recargar: useCallback(() => setRecarga((x) => x + 1), []) };
}

function ErrorCarga({ texto, alReintentar }: { texto: string; alReintentar: () => void }) {
    return (
        <div className="contenidos-error rv-error" role="alert">
            <span>{texto}</span>
            <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alReintentar}>Reintentar</button>
        </div>
    );
}

// ---------- Piezas de página ----------

function Migas({ pasos }: { pasos: [string, string?][] }) {
    return (
        <nav className="contenidos-migas" aria-label="Ruta">
            <span>Contenidos</span>
            {pasos.map(([texto, ruta], i) => (
                <span key={texto} className="rv-miga">
                    <span aria-hidden="true">›</span>
                    {i === pasos.length - 1 ? <strong aria-current="page">{texto}</strong> : ruta ? <Link to={ruta}>{texto}</Link> : <span>{texto}</span>}
                </span>
            ))}
        </nav>
    );
}

function Encabezado({ etiqueta, titulo, texto, accion, tarjeta }: { etiqueta: string; titulo: string; texto?: string; accion?: ReactNode; tarjeta?: boolean }) {
    return (
        <div className={`contenidos-encabezado${tarjeta ? " contenidos-encabezado--tarjeta" : ""}`}>
            <div>
                <p className="contenidos-etiqueta">{etiqueta}</p>
                <h1>{titulo}</h1>
                {texto && <p className="contenidos-encabezado__texto">{texto}</p>}
            </div>
            {accion}
        </div>
    );
}

function Panel({ id, icono, titulo, subtitulo, clase = "", children }: { id: string; icono: ReactNode; titulo: string; subtitulo?: string; clase?: string; children: ReactNode }) {
    return (
        <section className={`contenidos-panel ${clase}`} aria-labelledby={id}>
            <div className="contenidos-lista__cabecera">
                <span className="contenidos-lista__icono">{icono}</span>
                <div>
                    <h2 id={id}>{titulo}</h2>
                    {subtitulo && <p>{subtitulo}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

function Datos({ filas }: { filas: [string, ReactNode][] }) {
    return (
        <dl className="contenidos-dialogo__datos rv-datos">
            {filas.map(([dato, valor]) => (
                <div key={dato} className="rv-datos__fila">
                    <dt>{dato}</dt>
                    <dd>{valor}</dd>
                </div>
            ))}
        </dl>
    );
}

// Bloque de resultado (el mismo de «Enviado a autorización»)
function Resultado({ tono, icono, titulo, detalle, estado }: { tono: "verde" | "observaciones" | "rechazo"; icono: ReactNode; titulo: string; detalle: string; estado: string }) {
    return (
        <section className={`contenidos-enviado rv-resultado--${tono}`} role="status">
            <span className="contenidos-enviado__palomita">{icono}</span>
            <div className="contenidos-enviado__textos">
                <p className="contenidos-enviado__titulo">{titulo}</p>
                <p className="contenidos-enviado__detalle">{detalle}</p>
            </div>
            <Estado estado={estado} />
        </section>
    );
}

function Pasos({ id, titulo, pasos }: { id: string; titulo: string; pasos: [string, string][] }) {
    return (
        <section className="contenidos-como contenidos-como--blanco" aria-labelledby={id}>
            <div className="contenidos-como__cabecera">
                <span className="contenidos-como__icono"><IconoFlecha /></span>
                <h2 id={id}>{titulo}</h2>
            </div>
            <ol className="contenidos-como__pasos">
                {pasos.map(([t, texto], i) => (
                    <li key={t}>
                        <span className="contenidos-como__numero">{i + 1}</span>
                        <div><strong>{t}</strong><p>{texto}</p></div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

// Ventana con <dialog>, igual que «¿Enviar a autorización?»: Escape y clic afuera cierran
function Dialogo({ id, titulo, texto, alCerrar, children, acciones }: { id: string; titulo: string; texto: string; alCerrar: () => void; children: ReactNode; acciones: ReactNode }) {
    const ventana = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialogo = ventana.current;
        if (dialogo && !dialogo.open) dialogo.showModal();
        return () => dialogo?.close();
    }, []);
    return (
        <dialog
            ref={ventana}
            className="contenidos-dialogo rv-dialogo"
            aria-labelledby={id}
            onCancel={(e) => { e.preventDefault(); alCerrar(); }}
            onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}
        >
            <div className="contenidos-dialogo__caja">
                <h2 id={id}>{titulo}</h2>
                <p className="contenidos-dialogo__texto">{texto}</p>
                {children}
                <div className="contenidos-dialogo__acciones">{acciones}</div>
            </div>
        </dialog>
    );
}

function Pantalla({ migas, children }: { migas: [string, string?][]; children: ReactNode }) {
    return (
        <PanelLayout titulo="Contenidos" tema="contenidos">
            <Migas pasos={[["Revisión y publicación", BASE], ...migas]} />
            {children}
        </PanelLayout>
    );
}

// Carga un contenido por el folio de la ruta y se lo pasa a la pantalla
function ConContenido({ miga, propio = false, children }: { miga: string | ((c: ContenidoRevision) => string); propio?: boolean; children: (c: ContenidoRevision, recargar: () => void) => ReactNode }) {
    const { folio = "" } = useParams();
    const { datos, error, cargando, recargar } = useCarga(`${folio}:${propio}`, () => obtenerRevision(folio, propio));
    // La miga puede depender del contenido (p. ej. «Contenido por autorizar» o «Publicado»)
    const textoMiga = typeof miga === "string" ? miga : datos ? miga(datos) : folio;
    const cuerpo = (
        <>
            {cargando && <p className="contenidos-cargando" role="status">Cargando contenido…</p>}
            {error && <ErrorCarga texto={error} alReintentar={recargar} />}
            {datos && children(datos, recargar)}
        </>
    );
    if (propio) {
        return (
            <PanelLayout titulo="Contenidos" tema="contenidos">
                <Migas pasos={[["Editor de contenidos", "/admin/contenidos/editor"], [textoMiga]]} />
                {cuerpo}
            </PanelLayout>
        );
    }
    return <Pantalla migas={[[textoMiga]]}>{cuerpo}</Pantalla>;
}

// ---------- Bandeja (Figma 560:17410, vacía 561:19259, sin resultados 561:19476) ----------

type FiltroBandeja = "" | "en_revision" | "con_observaciones" | "publicado" | "rechazado";

const FILTROS: { valor: FiltroBandeja; texto: string; plural: string }[] = [
    { valor: "", texto: "Todos", plural: "contenidos" },
    { valor: "en_revision", texto: "Por autorizar", plural: "por autorizar" },
    { valor: "con_observaciones", texto: "Con observaciones", plural: "con observaciones" },
    { valor: "publicado", texto: "Publicados", plural: "publicados" },
    { valor: "rechazado", texto: "Rechazados", plural: "rechazados" },
];
const POR_PAGINA = 10;

// Cuántos hay de cada estado y lo que necesita el resumen de arriba
async function pedirResumen() {
    const [todos, porAutorizar, observaciones, publicados, rechazados] = await Promise.all([
        listarRevision("", "", 0, 1),
        listarRevision("en_revision", "", 0, 50),
        listarRevision("con_observaciones", "", 0, 1),
        listarRevision("publicado", "", 0, 50),
        listarRevision("rechazado", "", 0, 1),
    ]);
    return {
        cuentas: { "": todos.total, en_revision: porAutorizar.total, con_observaciones: observaciones.total, publicado: publicados.total, rechazado: rechazados.total } as Record<FiltroBandeja, number>,
        antiguedad: textoAntiguedad(porAutorizar.contenidos),
        // Con más de 50 publicados solo se cuentan los 50 primeros; se marca con «+»
        publicadosMes: `${publicadosEnElMes(publicados.contenidos)}${publicados.total > 50 ? "+" : ""}`,
    };
}

function TarjetaResumen({ tono, icono, cifra, titulo, texto, enlace, activa, alPresionar }: { tono: "azul" | "gris" | "guinda"; icono: ReactNode; cifra: ReactNode; titulo: string; texto: string; enlace: string; activa: boolean; alPresionar: () => void }) {
    return (
        <article className={`contenidos-resumen__tarjeta contenidos-resumen__tarjeta--${tono}${activa ? " rv-tarjeta--activa" : ""}`}>
            <div className="contenidos-resumen__fila">
                <span className="contenidos-resumen__icono">{icono}</span>
                <button type="button" className="contenidos-resumen__enlace" aria-pressed={activa} onClick={alPresionar}>{enlace} →</button>
            </div>
            <p className="contenidos-resumen__cifra">{cifra}</p>
            <p className="contenidos-resumen__titulo">{titulo}</p>
            <p className="contenidos-resumen__texto">{texto}</p>
        </article>
    );
}

function Paginas({ pagina, paginas, cargando, alCambiar }: { pagina: number; paginas: number; cargando?: boolean; alCambiar: (p: number) => void }) {
    return (
        <div className="contenidos-paginas" role="group" aria-label="Páginas">
            <button type="button" disabled={cargando || pagina === 0} onClick={() => alCambiar(pagina - 1)}>‹ Anterior</button>
            <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina + 1} de {paginas}</button>
            <button type="button" disabled={cargando || pagina + 1 >= paginas} onClick={() => alCambiar(pagina + 1)}>Siguiente ›</button>
        </div>
    );
}

function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
    return (
        <div className="contenidos-vacio" role="row">
            <span role="cell">
                <span className="contenidos-vacio__icono"><IconoDocumento /></span>
                <strong>{titulo}</strong>
                <span>{texto}</span>
                {accion}
            </span>
        </div>
    );
}

export function BandejaRevision() {
    const [filtro, setFiltro] = useState<FiltroBandeja>("en_revision");
    const [texto, setTexto] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const resumen = useCarga("resumen", pedirResumen);
    const lista = useCarga<ListaRevision>(JSON.stringify([filtro, busqueda, pagina]), () => listarRevision(filtro, busqueda, pagina, POR_PAGINA));

    // Busca al dejar de escribir
    useEffect(() => {
        const espera = setTimeout(() => { setBusqueda(texto.trim()); setPagina(0); }, 300);
        return () => clearTimeout(espera);
    }, [texto]);

    function elegir(nuevo: FiltroBandeja) {
        setFiltro(nuevo);
        setPagina(0);
    }

    const cuentas = resumen.datos?.cuentas;
    const datos = lista.datos;
    const paginas = datos ? Math.max(1, Math.ceil(datos.total / POR_PAGINA)) : 1;
    const plural = FILTROS.find((f) => f.valor === filtro)?.plural ?? "contenidos";

    return (
        <Pantalla migas={[[FILTROS.find((f) => f.valor === filtro)?.texto ?? "Todos"]]}>
            <Encabezado
                etiqueta="Contenidos · Revisión y publicación"
                titulo="Revisión y publicación"
                texto="La publicación en el portal requiere autorización del administrador."
                accion={<Link to={`${BASE}/historial`} className="contenidos-boton contenidos-boton--contorno">Historial de publicaciones</Link>}
            />

            <section className="contenidos-resumen" aria-labelledby="revision-resumen-titulo">
                <h2 id="revision-resumen-titulo">Pendientes de autorización</h2>
                {resumen.error && <ErrorCarga texto={`No se pudieron cargar los contadores: ${resumen.error}`} alReintentar={resumen.recargar} />}
                <div className="contenidos-resumen__tarjetas">
                    <TarjetaResumen tono="gris" icono={<IconoReloj />} cifra={cuentas?.en_revision ?? "…"} titulo="Por autorizar"
                        texto={resumen.datos?.antiguedad ?? "Cargando…"} enlace="Ver por autorizar" activa={filtro === "en_revision"} alPresionar={() => elegir("en_revision")} />
                    <TarjetaResumen tono="guinda" icono={<IconoAviso />} cifra={cuentas?.con_observaciones ?? "…"} titulo="Con observaciones"
                        texto="Esperan correcciones del Editor." enlace="Ver observaciones" activa={filtro === "con_observaciones"} alPresionar={() => elegir("con_observaciones")} />
                    <TarjetaResumen tono="azul" icono={<IconoCheck />} cifra={resumen.datos?.publicadosMes ?? "…"} titulo="Publicados este mes"
                        texto="Registrados en la bitácora." enlace="Ver publicados" activa={filtro === "publicado"} alPresionar={() => elegir("publicado")} />
                </div>
            </section>

            <section className="contenidos-lista" aria-labelledby="revision-lista-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoLista /></span>
                    <div>
                        <h2 id="revision-lista-titulo">Bandeja de contenidos</h2>
                        <p>Del más antiguo al más reciente.</p>
                    </div>
                </div>

                <div className="contenidos-lista__herramientas">
                    <div className="contenidos-filtros" role="group" aria-label="Filtrar por estado">
                        {FILTROS.map((f) => (
                            <button key={f.valor || "todos"} type="button" aria-pressed={filtro === f.valor}
                                className={`contenidos-filtro${filtro === f.valor ? " contenidos-filtro--activo" : ""}`} onClick={() => elegir(f.valor)}>
                                {f.texto}{cuentas ? ` (${cuentas[f.valor]})` : ""}
                            </button>
                        ))}
                    </div>
                    <label className="contenidos-buscar">
                        <IconoBuscar />
                        <input type="search" placeholder="Buscar por folio o título" aria-label="Buscar por folio o título" maxLength={100} value={texto} onChange={(e) => setTexto(e.target.value)} />
                    </label>
                </div>

                <div className="contenidos-tabla" tabIndex={0} role="table" aria-label="Bandeja de contenidos" aria-busy={lista.cargando}>
                    {lista.cargando && <p role="status" className="contenidos-cargando">Cargando contenidos…</p>}
                    <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                        {["Folio", "Título", "Tipo", "Redactó", "Estado", "Enviado", "Acción"].map((t) => <span key={t} role="columnheader">{t}</span>)}
                    </div>
                    {datos?.contenidos.map((c) => (
                        <div key={c.folio} className="contenidos-tabla__fila" role="row">
                            <span role="cell" className="contenidos-tabla__folio">{c.folio}</span>
                            <span role="cell" className="contenidos-tabla__titulo">{c.titulo || "Sin título"}</span>
                            <span role="cell">{nombreTipo(c.tipo)}</span>
                            <span role="cell">{c.autor || "Sin nombre"}</span>
                            <span role="cell"><Estado estado={c.estado} /></span>
                            <span role="cell">{c.enviadoEn ? cuandoRelativo(c.enviadoEn) : "—"}</span>
                            <span role="cell">
                                <Link to={`${BASE}/${c.folio}`} className="contenidos-tabla__accion">
                                    {c.estado === "en_revision" ? "Revisar" : "Ver"} →<span className="solo-lectores"> {c.folio}</span>
                                </Link>
                            </span>
                        </div>
                    ))}
                    {lista.error && <ErrorCarga texto={lista.error} alReintentar={lista.recargar} />}
                    {datos && datos.total === 0 && (busqueda ? (
                        <Vacio titulo={`Sin resultados para «${busqueda}»`} texto="Prueba con otra palabra, otro estado o quita los filtros."
                            accion={<button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => { setTexto(""); setBusqueda(""); elegir(""); }}>Limpiar filtros</button>} />
                    ) : (
                        <Vacio titulo={filtro === "" ? "No hay contenidos en la bandeja" : `No hay contenidos ${plural}`} texto="Cuando el Editor envíe algo, aparecerá aquí con su folio y fecha de envío." />
                    ))}
                </div>

                <div className="contenidos-lista__pie">
                    <p aria-live="polite">Mostrando {datos?.contenidos.length ?? 0} de {datos?.total ?? 0} {plural}</p>
                    <button type="button" className="contenidos-boton contenidos-boton--oscuro" disabled={filtro === "" && !busqueda} onClick={() => { setTexto(""); setBusqueda(""); elegir(""); }}>
                        Ver todos los contenidos
                    </button>
                    <Paginas pagina={pagina} paginas={paginas} cargando={lista.cargando} alCambiar={setPagina} />
                </div>
            </section>
        </Pantalla>
    );
}

// ---------- Detalle (Figma 560:17894; Memoria 604:48256; ventana 561:17817) ----------

const CAMPOS: Record<string, string> = {
    categoria: "Categoría", fecha: "Fecha", destacar: "Destacar en Inicio", verMas: "Mostrar enlace", textoAlternativo: "Texto alternativo",
    autoria: "Autoría", genero: "Género", anio: "Año", clasificacion: "Clasificación", vista: "Presentación", tema: "Tema",
    memoriaPublica: "Incluir en Memoria pública", seccion: "Sección", lineaTiempo: "Línea del tiempo", tipoPieza: "Tipo de pieza",
    periodo: "Periodo", registroArchivo: "Registro en archivo", publicacion: "Destino de publicación", permisoImagen: "Permiso de imagen",
};

const valorDato = (v: unknown) => (typeof v === "boolean" ? (v ? "Sí" : "No") : Array.isArray(v) ? `${v.length} elemento(s)` : typeof v === "object" && v ? "Registrado" : String(v ?? "") || "Por confirmar");

// Puntos del cotejo editorial según el tipo (ayuda para quien revisa; no se guarda)
const COTEJO: Record<string, [string, string?][]> = {
    noticia: [["Ortografía y redacción", "Sin errores evidentes."], ["Fecha y datos correctos", "Fecha, lugar y horario."], ["Tono institucional"], ["Texto alternativo de la imagen", "Describe la imagen para lector de pantalla."], ["Sin datos personales", "No aparecen nombres ni datos de terceros."]],
    resena: [["Ortografía y redacción", "Sin errores evidentes."], ["Datos del libro correctos", "Título, autoría y género."], ["Tono institucional"], ["Derechos de la imagen de portada", "Confirma que se puede publicar."], ["Autoría y área que firma la reseña", "Dato por confirmar con la biblioteca."]],
    acerca: [["Ortografía y redacción", "Sin errores evidentes."], ["Datos históricos confirmados", "Fechas y nombres revisados con la biblioteca."], ["Tono institucional"], ["Reemplaza la versión vigente", "Revisa que no se pierda información."]],
    memoria: [["Ortografía y redacción", "Sin errores evidentes."], ["Datos de la pieza correctos", "Título, fuente, tipo y periodo."], ["Tono institucional"], ["Permiso de uso de la imagen", "Confirma que se puede publicar."], ["Fuente y área que registra la pieza", "Dato por confirmar con la biblioteca."]],
};

// Cómo se vería publicado: con resumen (detalle) o con el texto completo (vista previa)
function Previa({ c, completa, propio }: { c: ContenidoRevision; completa?: boolean; propio?: boolean }) {
    const filas = Object.entries(c.datos)
        .filter(([campo, valor]) => CAMPOS[campo] && valor !== "" && valor !== null && valor !== undefined)
        .map(([campo, valor]) => [CAMPOS[campo], valorDato(valor)] as [string, string]);
    const etiqueta = String(c.datos.categoria || c.datos.vista || c.datos.seccion || nombreTipo(c.tipo));
    return (
        <>
            <article className="contenidos-previa" aria-label={`Vista previa: ${c.titulo}`}>
                <p className="contenidos-previa__franja">Vista previa · {nombreEstado(c.estado)}</p>
                <div className={`contenidos-previa__cuerpo${completa ? "" : " rv-previa--corta"}`}>
                    <span className="contenidos-estado contenidos-estado--por_autorizar">{etiqueta}</span>
                    <h2>{c.titulo || "Sin título"}</h2>
                    <p className="contenidos-previa__meta">{nombreTipo(c.tipo)} · {c.autor || "Equipo de la biblioteca"} · {fechaCorta(c.enviadoEn ?? c.actualizadoEn)}</p>
                    {c.tipo !== "acerca" && (c.tieneImagen ? (
                        <div className="rv-imagen"><ImagenContenido folio={c.folio} version={c.actualizadoEn} revision={!propio} texto={String(c.datos.textoAlternativo ?? c.titulo)} /></div>
                    ) : (
                        <div className="contenidos-previa__imagen contenidos-previa__imagen--vacia">Sin imagen principal</div>
                    ))}
                    {c.resumen && <p><strong>{c.resumen}</strong></p>}
                    {completa
                        ? <p className="rv-texto">{c.cuerpo || "Sin texto."}</p>
                        : c.cuerpo && <p className="rv-texto rv-texto--corto">{c.cuerpo}</p>}
                </div>
            </article>
            {filas.length > 0 && <Datos filas={filas} />}
        </>
    );
}

// Todas las rutas /revision/:folio/… llegan aquí; cada una muestra su pantalla
export default function RutaRevision() {
    const { pathname } = useLocation();
    const { folio = "" } = useParams();
    if (pathname.endsWith("/cambios")) return <PedirCambios />;
    if (pathname.endsWith("/rechazar")) return <RechazarContenido />;
    if (pathname.endsWith("/publicado")) return <ResultadoRevision tipo="publicado" />;
    if (pathname.endsWith("/observaciones-enviadas")) return <ResultadoRevision tipo="observaciones" />;
    if (pathname.endsWith("/rechazado")) return <ResultadoRevision tipo="rechazado" />;
    if (pathname.endsWith("/retirar")) return <HistorialPublicaciones retirar={folio} />;
    if (pathname.endsWith("/vista-previa")) return <VistaPrevia />;
    return <RevisarContenido />;
}

export function RevisarContenido({ propio = false }: { propio?: boolean }) {
    return (
        <ConContenido miga={(c) => (propio ? "Consulta de mi contenido" : c.estado === "en_revision" ? "Contenido por autorizar" : `${c.folio} · ${nombreEstado(c.estado)}`)} propio={propio}>
            {(c, recargar) => <Detalle key={`${c.folio}:${c.actualizadoEn}`} c={c} propio={propio} alRecargar={recargar} />}
        </ConContenido>
    );
}

export function ContenidoPropio() {
    return <RevisarContenido propio />;
}

function Detalle({ c, propio, alRecargar }: { c: ContenidoRevision; propio: boolean; alRecargar: () => void }) {
    const navigate = useNavigate();
    const puntos = COTEJO[c.tipo] ?? COTEJO.noticia;
    const [marcados, setMarcados] = useState<boolean[]>(() => puntos.map(() => false));
    const [nota, setNota] = useState("");
    const [ventana, setVentana] = useState(false);
    const porAutorizar = c.estado === "en_revision" && !propio;
    const ruta = `${BASE}/${c.folio}`;

    return (
        <>
            <Encabezado
                tarjeta
                etiqueta={`Contenido ${c.folio} · ${nombreEstado(c.estado)}`}
                titulo={propio ? "Consulta de mi contenido" : tituloRevision(c.tipo)}
                texto={porAutorizar ? "Lee el contenido, cotéjalo y decide. Ninguna decisión se publica sin tu autorización." : "Consulta la versión enviada y el historial de decisiones."}
            />

            <div className="contenidos-formulario">
                <div className="rv-columna">
                    <Panel id="rv-enviado" icono={<IconoOjo />} titulo="Contenido enviado" subtitulo={`Así se publicaría. ${nombreTipo(c.tipo)} ${c.folio}.`}>
                        <Previa c={c} propio={propio} />
                        {!propio && (
                            <div className="contenidos-previa__acciones">
                                <Link to={`${ruta}/vista-previa`} className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico">Abrir vista previa completa</Link>
                            </div>
                        )}
                    </Panel>

                    {porAutorizar && (
                        <Panel id="rv-cotejo" icono={<IconoCheck />} titulo="Cotejo editorial" subtitulo="Marca cada punto al revisarlo.">
                            <ul className="rv-cotejo">
                                {puntos.map(([t, d], i) => (
                                    <li key={t}>
                                        <label className={marcados[i] ? "rv-cotejo--marcado" : undefined}>
                                            <input type="checkbox" checked={marcados[i]} onChange={() => setMarcados((m) => m.map((x, j) => (j === i ? !x : x)))} />
                                            <span><strong>{t}</strong>{d && <small>{d}</small>}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}

                    {porAutorizar && (
                        <Panel id="rv-nota" icono={<IconoLapiz />} titulo="Nota interna" subtitulo="Solo la ve el personal.">
                            <Campo id="rv-nota-interna" etiqueta="Nota" ayuda="Se guarda en el historial al autorizar.">
                                <textarea id="rv-nota-interna" rows={3} maxLength={1000} placeholder="Escribe una nota para el historial…" value={nota} onChange={(e) => setNota(e.target.value)} />
                            </Campo>
                        </Panel>
                    )}
                </div>

                <aside className="contenidos-formulario__lateral">
                    {porAutorizar ? (
                        <Panel id="rv-decision" icono={<IconoBalanza />} titulo="Decisión" clase="contenidos-panel--estado">
                            <p className="contenidos-estado-linea"><Estado estado={c.estado} /><span>{c.enviadoEn ? `Enviado ${cuandoRelativo(c.enviadoEn).toLowerCase()}` : ""}</span></p>
                            <button type="button" className="contenidos-boton contenidos-boton--principal contenidos-boton--ancho" onClick={() => setVentana(true)}>Autorizar y publicar</button>
                            <p className="rv-subtitulo">Otras opciones</p>
                            <Link to={`${ruta}/cambios`} className="contenidos-boton contenidos-boton--contorno contenidos-boton--ancho">Pedir cambios al Editor</Link>
                            <Link to={`${ruta}/rechazar`} className="contenidos-boton contenidos-boton--ancho rv-boton--guinda">Rechazar contenido</Link>
                            <p className="contenidos-nota">Antes de publicar registras la autorización institucional. Se guarda quién, cuándo y con qué referencia.</p>
                        </Panel>
                    ) : (
                        <EstadoActual c={c} propio={propio} />
                    )}

                    <Panel id="rv-redacto" icono={<IconoPersona />} titulo="Redactó">
                        <div className="rv-persona">
                            <span className="rv-persona__inicial" aria-hidden="true">{(c.autor || "E").charAt(0).toUpperCase()}</span>
                            <div><strong>{c.autor || "Sin nombre registrado"}</strong><small>Editor de contenidos</small></div>
                        </div>
                    </Panel>

                    <Panel id="rv-historial" icono={<IconoReloj />} titulo="Historial">
                        <ol className="rv-eventos">
                            {eventosDetalle(c).map((e, i) => (
                                <li key={`${e.titulo}:${e.fecha}:${i}`}>
                                    <strong>{e.titulo}</strong>
                                    <small>{fechaHora(e.fecha)}{e.responsable ? ` · ${e.responsable}` : ""}</small>
                                </li>
                            ))}
                        </ol>
                    </Panel>
                </aside>
            </div>

            {ventana && (
                <VentanaAutorizar
                    c={c}
                    nota={nota}
                    alCerrar={() => setVentana(false)}
                    alPublicar={() => navigate(`${ruta}/publicado`)}
                    alRecargar={() => { setVentana(false); alRecargar(); }}
                />
            )}
        </>
    );
}

// Lo que ya se decidió (cuando el contenido no está por autorizar)
function EstadoActual({ c, propio }: { c: ContenidoRevision; propio: boolean }) {
    const ruta = `${BASE}/${c.folio}`;
    const ultimas = [...c.historial].reverse();
    const observaciones = ultimas.find((e) => e.accion === "observaciones");
    const rechazo = ultimas.find((e) => e.accion === "rechazo");
    const retiro = ultimas.find((e) => e.accion === "retiro");
    return (
        <Panel id="rv-estado" icono={<IconoReloj />} titulo="Estado" clase="contenidos-panel--estado">
            <p className="contenidos-estado-linea"><Estado estado={c.estado} /><span>Actualizado {fechaHora(c.actualizadoEn).toLowerCase()}</span></p>
            {c.estado === "en_revision" && propio && <p className="contenidos-nota">Está en la bandeja del Administrador.</p>}
            {c.estado === "con_observaciones" && observaciones && (
                <>
                    <p className="contenidos-nota">{propio ? "Corrígelas y vuelve a enviar." : "Espera a que el Editor corrija."}</p>
                    <ol className="contenidos-observaciones__lista">
                        {observaciones.observaciones.map((p, i) => <li key={i}><span className="contenidos-observaciones__numero">{i + 1}</span>{p}</li>)}
                    </ol>
                    {observaciones.nota && <p className="contenidos-nota">{observaciones.nota}</p>}
                </>
            )}
            {c.estado === "publicado" && (
                <a href={rutaPublica(c)} target="_blank" rel="noopener noreferrer" className="contenidos-boton contenidos-boton--principal contenidos-boton--ancho">
                    Ver en el portal ↗<span className="solo-lectores"> (se abre en otra pestaña)</span>
                </a>
            )}
            {c.estado === "publicado" && !propio && (
                <>
                    <Link to={`${ruta}/publicado`} className="contenidos-boton contenidos-boton--contorno contenidos-boton--ancho">Ver registro de publicación</Link>
                    <Link to={`${ruta}/retirar`} className="contenidos-boton contenidos-boton--ancho rv-boton--guinda">Retirar del portal</Link>
                </>
            )}
            {c.estado === "rechazado" && (propio
                ? <p className="contenidos-nota">{rechazo?.nota ?? "Sin motivo registrado."}</p>
                : <Link to={`${ruta}/rechazado`} className="contenidos-boton contenidos-boton--ancho rv-boton--guinda">Ver motivo del rechazo</Link>)}
            {c.estado === "retirado" && retiro?.nota && <p className="contenidos-nota">Retirado: {retiro.nota}</p>}
            {!propio && (c.estado === "publicado" || c.estado === "retirado") && (
                <Link to={`${BASE}/historial`} className="contenidos-boton contenidos-boton--suave contenidos-boton--ancho">Ver historial de publicaciones</Link>
            )}
        </Panel>
    );
}

// Bloquea el doble envío y guarda el error del backend
function useDecision() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const bloqueo = useRef(false);
    async function decidir(c: ContenidoRevision, accion: Parameters<typeof decidirContenido>[1], datos: DecisionPublicacion) {
        if (bloqueo.current) return false;
        bloqueo.current = true;
        setGuardando(true);
        setError("");
        try {
            await decidirContenido(c, accion, datos);
            return true;
        } catch (e) {
            setError(mensajeError(e));
            return false;
        } finally {
            bloqueo.current = false;
            setGuardando(false);
        }
    }
    return { guardando, error, decidir };
}

function ErrorDecision({ texto, alRecargar }: { texto: string; alRecargar?: () => void }) {
    return (
        <div className="contenidos-error rv-error" role="alert">
            <span>No se guardó la decisión. {texto}</span>
            {alRecargar && <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alRecargar}>Recargar</button>}
        </div>
    );
}

// CA-12.2: sin la referencia de la autorización institucional no se publica
function VentanaAutorizar({ c, nota, alCerrar, alPublicar, alRecargar }: { c: ContenidoRevision; nota: string; alCerrar: () => void; alPublicar: () => void; alRecargar: () => void }) {
    const [referencia, setReferencia] = useState("");
    const [falta, setFalta] = useState(false);
    const { guardando, error, decidir } = useDecision();

    async function confirmar() {
        if (!referencia.trim()) return setFalta(true);
        const datos = { referencia: referencia.trim(), ...(nota.trim() ? { nota: nota.trim() } : {}) };
        if (await decidir(c, "publicar", datos)) alPublicar();
    }

    return (
        <Dialogo
            id="rv-autorizar-titulo"
            titulo="Autorizar y publicar"
            texto={textoAutorizar(c.tipo)}
            alCerrar={guardando ? () => {} : alCerrar}
            acciones={
                <>
                    <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={alCerrar} disabled={guardando}>Cancelar</button>
                    <button type="button" className="contenidos-boton contenidos-boton--principal" onClick={() => void confirmar()} disabled={guardando}>{guardando ? "Publicando…" : "Autorizar y publicar"}</button>
                </>
            }
        >
            <dl className="contenidos-dialogo__datos">
                <dt>Folio</dt><dd>{c.folio}</dd>
                <dt>Contenido</dt><dd>{nombreCompleto(c)}</dd>
                <dt>Redactó</dt><dd>{c.autor || "Sin nombre"}</dd>
            </dl>
            <div className="contenidos-campo">
                <label htmlFor="rv-referencia">Referencia de la autorización institucional <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                <input id="rv-referencia" type="text" placeholder="Oficio por confirmar" maxLength={200} value={referencia} disabled={guardando}
                    className={falta ? "contenidos-campo--error" : undefined} aria-invalid={falta} aria-describedby="rv-referencia-ayuda"
                    onChange={(e) => { setReferencia(e.target.value); setFalta(false); }} />
                {falta
                    ? <p id="rv-referencia-ayuda" className="contenidos-campo__error" role="alert">Escribe la referencia de la autorización (oficio, acta o folio).</p>
                    : <p id="rv-referencia-ayuda" className="contenidos-campo__ayuda">Se guarda con la publicación.</p>}
            </div>
            <div className="contenidos-filtros" role="radiogroup" aria-label="Cuándo se publica">
                <button type="button" role="radio" aria-checked="true" className="contenidos-filtro contenidos-filtro--activo">Publicar ahora</button>
                {/* TODO backend: programar la fecha de publicación (hoy el servicio solo publica en el momento) */}
                <button type="button" role="radio" aria-checked="false" className="contenidos-filtro" disabled title="Todavía no disponible">Programar fecha</button>
            </div>
            {error && <ErrorDecision texto={error} alRecargar={alRecargar} />}
        </Dialogo>
    );
}

// Texto completo antes de decidir
function VistaPrevia() {
    return (
        <ConContenido miga="Vista previa">
            {(c) => (
                <>
                    <Encabezado tarjeta etiqueta={`Vista previa · ${c.folio}`} titulo={c.titulo} texto={`Así se verá en ${dondeSeVe(c)} cuando lo autorices.`} />
                    <Previa c={c} completa />
                    <div className="contenidos-previa__acciones">
                        <Link to={`${BASE}/${c.folio}`} className="contenidos-boton contenidos-boton--principal panel-regresar">Volver a la revisión</Link>
                    </div>
                </>
            )}
        </ConContenido>
    );
}

// ---------- Pedir cambios (Figma 560:18418, Memoria 610:48486) ----------

const LIMITES = ["Sin fecha", "En 2 días", "En una semana", "En dos semanas"];

function PedirCambios() {
    return <ConContenido miga="Pedir cambios al Editor">{(c, recargar) => <FormularioCambios c={c} alRecargar={recargar} />}</ConContenido>;
}

function FormularioCambios({ c, alRecargar }: { c: ContenidoRevision; alRecargar: () => void }) {
    const navigate = useNavigate();
    const [texto, setTexto] = useState("");
    const [limite, setLimite] = useState(LIMITES[0]);
    const [falta, setFalta] = useState("");
    const { guardando, error, decidir } = useDecision();
    const ruta = `${BASE}/${c.folio}`;
    if (c.estado !== "en_revision") return <Navigate to={ruta} replace />;

    const esMemoria = c.tipo === "memoria";
    const preparados: [string, string][] = [
        esMemoria ? ["Faltan datos de la pieza", "Completar los datos de la pieza (fuente, tipo y periodo)."] : ["Faltan datos del libro", "Completar los datos del libro (título, autoría y género)."],
        ["Corregir ortografía", "Revisar la ortografía y la redacción."],
        ["Falta texto alternativo", "Agregar texto alternativo a la imagen."],
        [esMemoria ? "Confirmar permiso de uso" : "Confirmar derechos de imagen", "Confirmar que la imagen puede publicarse y anotar la fuente."],
        ["Ajustar el tono", "Ajustar el tono al estilo institucional."],
    ];
    const lineas = renglones(texto);

    function alternar(frase: string) {
        setTexto(numerar(lineas.includes(frase) ? lineas.filter((l) => l !== frase) : [...lineas, frase]));
        setFalta("");
    }

    async function enviar() {
        const problema = errorObservaciones(texto);
        if (problema) return setFalta(problema);
        const nota = notaObservaciones(limite, LIMITES[0]);
        if (await decidir(c, "observaciones", { observaciones: lineas, ...(nota ? { nota } : {}) })) navigate(`${ruta}/observaciones-enviadas`);
    }

    return (
        <>
            <Encabezado tarjeta etiqueta={`Contenido ${c.folio} · Pedir cambios`} titulo="Pedir cambios al Editor"
                texto="El Editor recibirá tus observaciones, corregirá y volverá a enviar. El contenido no se publica." />
            <form className="contenidos-formulario" onSubmit={(e) => { e.preventDefault(); void enviar(); }} noValidate>
                <Panel id="rv-observaciones-titulo" icono={<IconoLapiz />} titulo="Observaciones" subtitulo="Indica qué debe cambiar, de forma concreta.">
                    <p className="rv-subtitulo">Mensajes preparados</p>
                    <div className="contenidos-filtros" role="group" aria-label="Mensajes preparados">
                        {preparados.map(([nombre, frase]) => (
                            <button key={nombre} type="button" aria-pressed={lineas.includes(frase)} disabled={guardando}
                                className={`contenidos-filtro${lineas.includes(frase) ? " contenidos-filtro--activo" : ""}`} onClick={() => alternar(frase)}>
                                {nombre}
                            </button>
                        ))}
                    </div>
                    <div className="contenidos-campo">
                        <label htmlFor="rv-observaciones">Observaciones para el Editor <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                        <textarea id="rv-observaciones" rows={6} placeholder="1. Qué debe cambiar…" value={texto} disabled={guardando}
                            className={falta ? "contenidos-campo--error" : undefined} aria-invalid={!!falta} aria-describedby="rv-observaciones-ayuda"
                            onChange={(e) => { setTexto(e.target.value); setFalta(""); }} />
                        {falta
                            ? <p id="rv-observaciones-ayuda" className="contenidos-campo__error" role="alert">{falta}</p>
                            : <p id="rv-observaciones-ayuda" className="contenidos-campo__ayuda">Una por renglón. Máximo {MAXIMO_OBSERVACIONES} caracteres{texto ? ` (${texto.length}/${MAXIMO_OBSERVACIONES})` : ""}.</p>}
                    </div>
                    <Campo id="rv-limite" etiqueta="Fecha límite sugerida (opcional)">
                        <select id="rv-limite" value={limite} onChange={(e) => setLimite(e.target.value)} disabled={guardando}>
                            {LIMITES.map((l) => <option key={l}>{l}</option>)}
                        </select>
                    </Campo>
                    {error && <ErrorDecision texto={error} alRecargar={alRecargar} />}
                    <div className="contenidos-previa__acciones">
                        <button type="submit" className="contenidos-boton contenidos-boton--principal" disabled={guardando}>{guardando ? "Enviando…" : "Enviar observaciones"}</button>
                        <Link to={ruta} className="contenidos-boton contenidos-boton--contorno">Cancelar</Link>
                    </div>
                </Panel>
                <aside className="contenidos-formulario__lateral">
                    <Panel id="rv-despues" icono={<IconoFlecha />} titulo="¿Qué pasa después?" clase="contenidos-panel--estado">
                        <ul className="rv-lista">
                            <li>El estado cambia a «Con observaciones».</li>
                            <li>El Editor recibe un aviso con tus comentarios.</li>
                            <li>Cuando vuelva a enviar, regresa a tu bandeja como «Por autorizar».</li>
                            <li>Queda registro de quién pidió cambios y cuándo.</li>
                        </ul>
                    </Panel>
                </aside>
            </form>
        </>
    );
}

// ---------- Rechazar (Figma 560:18862, Memoria 610:48563) ----------

function RechazarContenido() {
    return <ConContenido miga="Rechazar contenido">{(c, recargar) => <FormularioRechazo c={c} alRecargar={recargar} />}</ConContenido>;
}

type ErroresRechazo = { motivo?: string; explicacion?: string; entiendo?: string };

function FormularioRechazo({ c, alRecargar }: { c: ContenidoRevision; alRecargar: () => void }) {
    const navigate = useNavigate();
    const [motivo, setMotivo] = useState("");
    const [explicacion, setExplicacion] = useState("");
    const [entiendo, setEntiendo] = useState(false);
    const [errores, setErrores] = useState<ErroresRechazo>({});
    const { guardando, error, decidir } = useDecision();
    const ruta = `${BASE}/${c.folio}`;
    if (c.estado !== "en_revision") return <Navigate to={ruta} replace />;

    async function rechazar() {
        const nuevos: ErroresRechazo = {};
        if (!motivo) nuevos.motivo = "Elige el motivo del rechazo.";
        if (!explicacion.trim()) nuevos.explicacion = "Explica al Editor por qué se rechaza.";
        if (!entiendo) nuevos.entiendo = "Confirma que entiendes que no se publicará.";
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) return;
        if (await decidir(c, "rechazar", { nota: notaRechazo(motivo, explicacion) })) navigate(`${ruta}/rechazado`);
    }

    return (
        <>
            <Encabezado tarjeta etiqueta={`Contenido ${c.folio} · Rechazar`} titulo="Rechazar contenido"
                texto="El contenido no se publicará y el Editor recibirá el motivo. Esta decisión queda registrada." />
            <form className="contenidos-formulario" onSubmit={(e) => { e.preventDefault(); void rechazar(); }} noValidate>
                <Panel id="rv-rechazo-titulo" icono={<IconoAviso />} titulo="Motivo del rechazo" subtitulo="Obligatorio. Se envía al Editor." clase="rv-panel--guinda">
                    <div className="contenidos-campo">
                        <label htmlFor="rv-motivo">Motivo <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                        <select id="rv-motivo" value={motivo} disabled={guardando} aria-invalid={!!errores.motivo} aria-describedby={errores.motivo ? "rv-motivo-error" : undefined}
                            onChange={(e) => { setMotivo(e.target.value); setErrores((x) => ({ ...x, motivo: undefined })); }}>
                            <option value="">Elige un motivo</option>
                            {MOTIVOS_RECHAZO.map((m) => <option key={m}>{m}</option>)}
                        </select>
                        {errores.motivo && <p id="rv-motivo-error" className="contenidos-campo__error" role="alert">{errores.motivo}</p>}
                    </div>
                    <div className="contenidos-campo">
                        <label htmlFor="rv-explicacion">Explicación para el Editor <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                        <textarea id="rv-explicacion" rows={5} maxLength={900} placeholder="Ej.: este tema ya está cubierto por la reseña CN-0022." value={explicacion} disabled={guardando}
                            aria-invalid={!!errores.explicacion} aria-describedby={errores.explicacion ? "rv-explicacion-error" : undefined}
                            onChange={(e) => { setExplicacion(e.target.value); setErrores((x) => ({ ...x, explicacion: undefined })); }} />
                        {errores.explicacion && <p id="rv-explicacion-error" className="contenidos-campo__error" role="alert">{errores.explicacion}</p>}
                    </div>
                    <div>
                        <label className="rv-confirmacion">
                            <input type="checkbox" checked={entiendo} disabled={guardando} aria-describedby={errores.entiendo ? "rv-entiendo-error" : undefined}
                                onChange={(e) => { setEntiendo(e.target.checked); setErrores((x) => ({ ...x, entiendo: undefined })); }} />
                            Entiendo que el contenido no se publicará.
                        </label>
                        {errores.entiendo && <p id="rv-entiendo-error" className="contenidos-campo__error" role="alert">{errores.entiendo}</p>}
                    </div>
                    {error && <ErrorDecision texto={error} alRecargar={alRecargar} />}
                    <div className="contenidos-previa__acciones">
                        <button type="submit" className="contenidos-boton rv-boton--guinda-lleno" disabled={guardando}>{guardando ? "Guardando…" : "Rechazar contenido"}</button>
                        <Link to={ruta} className="contenidos-boton contenidos-boton--contorno">Cancelar</Link>
                    </div>
                </Panel>
                <aside className="contenidos-formulario__lateral">
                    <Panel id="rv-correcciones" icono={<IconoAyuda />} titulo="¿Solo necesita correcciones?" clase="contenidos-panel--estado">
                        <p className="contenidos-nota rv-parrafo">Si el contenido puede salvarse, pide cambios en lugar de rechazarlo: el Editor conserva su trabajo y lo corrige.</p>
                        <Link to={`${ruta}/cambios`} className="contenidos-boton contenidos-boton--contorno contenidos-boton--ancho">Pedir cambios en su lugar</Link>
                    </Panel>
                </aside>
            </form>
        </>
    );
}

// ---------- Resultados (Figma 561:18001 publicado, 561:18426 observaciones, 561:18854 rechazado) ----------

type TipoResultado = "publicado" | "observaciones" | "rechazado";
const MIGA_RESULTADO: Record<TipoResultado, string> = { publicado: "Publicado", observaciones: "Observaciones enviadas", rechazado: "Contenido rechazado" };
const ESPERADO: Record<TipoResultado, string[]> = { publicado: ["publicado", "retirado"], observaciones: ["con_observaciones"], rechazado: ["rechazado"] };

function ResultadoRevision({ tipo }: { tipo: TipoResultado }) {
    return (
        <ConContenido miga={MIGA_RESULTADO[tipo]}>
            {(c) => {
                if (!ESPERADO[tipo].includes(c.estado)) return <Navigate to={`${BASE}/${c.folio}`} replace />;
                if (tipo === "publicado") return <Publicado c={c} />;
                if (tipo === "observaciones") return <ObservacionesEnviadas c={c} />;
                return <Rechazado c={c} />;
            }}
        </ConContenido>
    );
}

function Publicado({ c }: { c: ContenidoRevision }) {
    const p = ultimaPublicacion(c);
    const cuando = p ? fechaHora(p.fecha) : c.publicadoEn ? fechaHora(c.publicadoEn) : "";
    return (
        <>
            <Encabezado etiqueta={`Contenido ${c.folio} · ${nombreEstado(c.estado)}`} titulo={tituloPublicado(c.tipo)}
                texto={c.estado === "publicado" ? "Ya está visible en el portal público y quedó registrado en la bitácora de cambios." : "Se retiró del portal. El registro de su publicación se conserva."} />
            <Resultado tono="verde" icono={<IconoCheck tamano={26} />} titulo={`${c.folio} · ${nombreCompleto(c)}`}
                detalle={`Publicada ${cuando.toLowerCase()} · Autorizó: ${p?.responsable || "Administrador del portal"}`} estado={c.estado} />
            <Panel id="rv-registro" icono={<IconoReloj />} titulo="Registro de la publicación">
                <Datos filas={[
                    ["Dónde se ve", dondeSeVe(c)],
                    ["Autorización institucional", p?.detalles.referencia ?? "Sin referencia registrada"],
                    ["Versión", String(versionPublicada(c))],
                    ["Bitácora", "Registrada con autor, fecha y motivo"],
                ]} />
            </Panel>
            <div className="contenidos-previa__acciones">
                {c.estado === "publicado" && (
                    <a href={rutaPublica(c)} target="_blank" rel="noopener noreferrer" className="contenidos-boton contenidos-boton--principal">
                        Ver en el portal ↗<span className="solo-lectores"> (se abre en otra pestaña)</span>
                    </a>
                )}
                <Link to={BASE} className="contenidos-boton contenidos-boton--contorno panel-regresar">Volver a Revisión y publicación</Link>
                <Link to={`${BASE}/historial`} className="contenidos-boton contenidos-boton--suave-azul">Ver historial de publicaciones</Link>
            </div>
        </>
    );
}

function ObservacionesEnviadas({ c }: { c: ContenidoRevision }) {
    const o = [...c.historial].reverse().find((e) => e.accion === "observaciones");
    return (
        <>
            <Encabezado etiqueta={`Contenido ${c.folio} · Con observaciones`} titulo="Observaciones enviadas" texto="El Editor recibió tus comentarios. El contenido sigue sin publicarse." />
            <Resultado tono="observaciones" icono={<IconoLapiz />} titulo={`${c.folio} · ${nombreCompleto(c)}`}
                detalle={`Estado: Con observaciones · Enviadas ${(o ? fechaHora(o.fecha) : fechaHora(c.actualizadoEn)).toLowerCase()}`} estado={c.estado} />
            <Pasos id="rv-sigue" titulo="¿Qué sigue?" pasos={[
                ["El Editor corrige", "Recibe un aviso con tus observaciones."],
                ["Vuelve a enviar", "El contenido regresa a tu bandeja como «Por autorizar»."],
                ["Decides de nuevo", "Puedes autorizar, pedir más cambios o rechazar."],
            ]} />
            <div className="contenidos-previa__acciones">
                <Link to={BASE} className="contenidos-boton contenidos-boton--principal panel-regresar">Volver a Revisión y publicación</Link>
            </div>
        </>
    );
}

function Rechazado({ c }: { c: ContenidoRevision }) {
    const r = [...c.historial].reverse().find((e) => e.accion === "rechazo");
    const { motivo, explicacion } = separarRechazo(r?.nota, MOTIVOS_RECHAZO);
    return (
        <>
            <Encabezado etiqueta={`Contenido ${c.folio} · Rechazado`} titulo="Contenido rechazado" texto="No se publicará. El Editor recibió el motivo y el registro quedó guardado." />
            <Resultado tono="rechazo" icono={<IconoX tamano={26} />} titulo={`${c.folio} · ${nombreCompleto(c)}`}
                detalle={`Motivo: ${motivo}${r ? ` · ${fechaHora(r.fecha)}` : ""}`} estado={c.estado} />
            {explicacion && (
                <Panel id="rv-registro-rechazo" icono={<IconoReloj />} titulo="Registro del rechazo">
                    <Datos filas={[["Motivo", motivo], ["Explicación para el Editor", explicacion], ["Decidió", r?.responsable || "Administrador del portal"]]} />
                </Panel>
            )}
            <div className="contenidos-previa__acciones">
                <Link to={BASE} className="contenidos-boton contenidos-boton--principal panel-regresar">Volver a Revisión y publicación</Link>
                <Link to={`${BASE}/historial`} className="contenidos-boton contenidos-boton--suave-azul">Ver historial de publicaciones</Link>
            </div>
        </>
    );
}

// ---------- Historial de publicaciones y retirar (Figma 561:19695 y 561:20179) ----------

const POR_PAGINA_HISTORIAL = 10;

// Todo lo que alguna vez se publicó (incluye retirados), en lotes de 50
async function pedirHistorial() {
    const todos: ContenidoRevision[] = [];
    for (let pagina = 0; pagina < 40; pagina++) {
        const lote = await listarRevision("historial", "", pagina, 50);
        todos.push(...lote.contenidos);
        if (todos.length >= lote.total || lote.contenidos.length === 0) break;
    }
    return todos;
}

export function HistorialPublicaciones({ retirar }: { retirar?: string }) {
    const navigate = useNavigate();
    const { datos, error, cargando, recargar } = useCarga("historial", pedirHistorial);
    const [filtro, setFiltro] = useState<FiltroHistorial>("todos");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const [retirando, setRetirando] = useState<string | null>(retirar ?? null);
    const [aviso, setAviso] = useState("");

    const todos = datos ?? [];
    const cuenta = (f: FiltroHistorial) => filtrarHistorial(todos, f, "").length;
    const filtrados = filtrarHistorial(todos, filtro, busqueda);
    const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA_HISTORIAL));
    const actual = Math.min(pagina, paginas - 1);
    const visibles = filtrados.slice(actual * POR_PAGINA_HISTORIAL, (actual + 1) * POR_PAGINA_HISTORIAL);
    const elegido = retirando ? todos.find((c) => c.folio === retirando) : undefined;

    function elegir(nuevo: FiltroHistorial) {
        setFiltro(nuevo);
        setPagina(0);
    }

    function cerrarRetiro() {
        setRetirando(null);
        if (retirar) navigate(`${BASE}/historial`, { replace: true });
    }

    const opciones: { valor: FiltroHistorial; texto: string }[] = [
        { valor: "todos", texto: "Todos" },
        { valor: "noticia", texto: "Noticias" },
        { valor: "resena", texto: "Reseñas" },
        { valor: "acerca", texto: "Acerca de" },
        ...(cuenta("memoria") > 0 ? [{ valor: "memoria" as const, texto: "Memoria pública" }] : []),
        { valor: "retirado", texto: "Retirados" },
    ];

    return (
        <Pantalla migas={[[retirar ? "Retirar contenido publicado" : "Historial de publicaciones"]]}>
            <Encabezado
                etiqueta="Contenidos · Historial"
                titulo="Historial de publicaciones"
                texto="Todo lo publicado, con quién autorizó, cuándo y bajo qué referencia. Desde aquí puedes retirar un contenido."
                accion={<Link to={BASE} className="contenidos-boton contenidos-boton--contorno">Pendientes de revisión</Link>}
            />

            {aviso && <p className="contenidos-enviado rv-aviso" role="status">{aviso}</p>}

            <section className="contenidos-lista" aria-labelledby="historial-lista-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoReloj /></span>
                    <div>
                        <h2 id="historial-lista-titulo">Contenidos publicados</h2>
                        <p>Del más reciente al más antiguo.</p>
                    </div>
                </div>

                <div className="contenidos-lista__herramientas">
                    <div className="contenidos-filtros" role="group" aria-label="Filtrar por tipo">
                        {opciones.map((o) => (
                            <button key={o.valor} type="button" aria-pressed={filtro === o.valor}
                                className={`contenidos-filtro${filtro === o.valor ? " contenidos-filtro--activo" : ""}`} onClick={() => elegir(o.valor)}>
                                {o.texto}{datos ? ` (${cuenta(o.valor)})` : ""}
                            </button>
                        ))}
                    </div>
                    <label className="contenidos-buscar">
                        <IconoBuscar />
                        <input type="search" placeholder="Buscar por folio o título" aria-label="Buscar por folio o título" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }} />
                    </label>
                </div>

                <div className="contenidos-tabla rv-tabla-historial" tabIndex={0} role="table" aria-label="Contenidos publicados" aria-busy={cargando}>
                    {cargando && <p role="status" className="contenidos-cargando">Cargando historial…</p>}
                    <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                        {["Folio", "Contenido", "Tipo", "Autorizó", "Publicado", "Versión", "Estado", "Acción"].map((t) => <span key={t} role="columnheader">{t}</span>)}
                    </div>
                    {visibles.map((c) => (
                        <div key={c.folio} className="contenidos-tabla__fila" role="row">
                            <span role="cell" className="contenidos-tabla__folio">{c.folio}</span>
                            <span role="cell" className="contenidos-tabla__titulo">{c.titulo || "Sin título"}</span>
                            <span role="cell">{nombreTipo(c.tipo)}</span>
                            <span role="cell">{ultimaPublicacion(c)?.responsable || "—"}</span>
                            <span role="cell">{c.publicadoEn ? fechaCorta(c.publicadoEn) : "—"}</span>
                            <span role="cell">{versionPublicada(c)}</span>
                            <span role="cell"><Estado estado={c.estado} /></span>
                            <span role="cell">
                                {c.estado === "publicado" ? (
                                    <button type="button" className="contenidos-tabla__accion" onClick={() => { setAviso(""); setRetirando(c.folio); }}>
                                        Retirar →<span className="solo-lectores"> {c.folio}</span>
                                    </button>
                                ) : (
                                    <Link to={`${BASE}/${c.folio}`} className="contenidos-tabla__accion">Ver →<span className="solo-lectores"> {c.folio}</span></Link>
                                )}
                            </span>
                        </div>
                    ))}
                    {error && <ErrorCarga texto={error} alReintentar={recargar} />}
                    {datos && visibles.length === 0 && (busqueda.trim() ? (
                        <Vacio titulo={`Sin resultados para «${busqueda.trim()}»`} texto="Prueba con otra palabra, otro tipo o quita los filtros."
                            accion={<button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => { setBusqueda(""); elegir("todos"); }}>Limpiar filtros</button>} />
                    ) : (
                        <Vacio titulo={filtro === "retirado" ? "No hay contenidos retirados" : "Todavía no hay publicaciones"} texto="Lo que autorices y publiques aparecerá aquí con su referencia." />
                    ))}
                </div>

                <div className="contenidos-lista__pie">
                    <p aria-live="polite">Mostrando {visibles.length} de {filtrados.length} publicados</p>
                    <Paginas pagina={actual} paginas={paginas} alCambiar={setPagina} />
                </div>
            </section>

            {elegido && (
                <VentanaRetirar
                    c={elegido}
                    alCerrar={cerrarRetiro}
                    alRetirar={() => {
                        setAviso(`${elegido.folio} se retiró del portal. Sigue en el historial.`);
                        cerrarRetiro();
                        recargar();
                    }}
                    alRecargar={() => { cerrarRetiro(); recargar(); }}
                />
            )}
        </Pantalla>
    );
}

function VentanaRetirar({ c, alCerrar, alRetirar, alRecargar }: { c: ContenidoRevision; alCerrar: () => void; alRetirar: () => void; alRecargar: () => void }) {
    const [motivo, setMotivo] = useState("");
    const [falta, setFalta] = useState(false);
    const { guardando, error, decidir } = useDecision();

    async function confirmar() {
        if (!motivo.trim()) return setFalta(true);
        if (await decidir(c, "retirar", { nota: motivo.trim() })) alRetirar();
    }

    return (
        <Dialogo
            id="rv-retirar-titulo"
            titulo="¿Retirar del portal?"
            texto="El contenido dejará de verse en el portal. Se conserva en el historial y puedes volver a publicarlo después."
            alCerrar={guardando ? () => {} : alCerrar}
            acciones={
                <>
                    <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={alCerrar} disabled={guardando}>Cancelar</button>
                    <button type="button" className="contenidos-boton rv-boton--guinda-lleno" onClick={() => void confirmar()} disabled={guardando}>{guardando ? "Retirando…" : "Retirar del portal"}</button>
                </>
            }
        >
            <dl className="contenidos-dialogo__datos">
                <dt>Folio</dt><dd>{c.folio}</dd>
                <dt>Contenido</dt><dd>{c.titulo}</dd>
                <dt>Publicado</dt><dd>{c.publicadoEn ? fechaCorta(c.publicadoEn) : "—"}</dd>
            </dl>
            <div className="contenidos-campo">
                <label htmlFor="rv-motivo-retiro">Motivo del retiro <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                <textarea id="rv-motivo-retiro" rows={3} maxLength={1000} placeholder="Ej.: la información cambió." value={motivo} disabled={guardando}
                    className={falta ? "contenidos-campo--error" : undefined} aria-invalid={falta} aria-describedby={falta ? "rv-motivo-retiro-error" : undefined}
                    onChange={(e) => { setMotivo(e.target.value); setFalta(false); }} />
                {falta && <p id="rv-motivo-retiro-error" className="contenidos-campo__error" role="alert">Escribe el motivo del retiro.</p>}
            </div>
            {error && <ErrorDecision texto={error} alRecargar={alRecargar} />}
        </Dialogo>
    );
}
