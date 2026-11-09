// Atención › Avisos (Figma 578:39911). Diseño del Editor de contenidos. Datos de ejemplo (./datos.ts, TODO backend).
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../../PanelLayout";
import { AvisoResultado, Chip, Dato, Datos, EncabezadoPagina, EstadoVacio, Migas, Tarjeta, type TonoChip } from "../../componentes";
import { Ventana, VentanaFormulario } from "../../Ventana";
import { IconoBuscar, IconoLista, IconoReloj } from "../../contenidos/piezas";
import { simulacion } from "../../../../servicios/simulacion";
import {
    LUGARES_AVISO, MAXIMO_MENSAJE, NOMBRE_ESTADO, TIPOS_AVISO, contarAvisos, filtrarAvisos, guardarBorrador, obtenerAviso, publicarAviso,
    retirarAviso, useAvisos, validarAviso, vigencia, fechaCorta, type Aviso, type ErroresAviso, type EstadoAviso, type FiltroAviso, type ValoresAviso,
} from "./datos";
import iconoInfo from "../../../../assets/admin/tarjeta-info.svg";
import iconoCalendario from "../../../../assets/admin/tarjeta-calendar.svg";
import modalCheck from "../../../../assets/admin/modal-check.svg";
import modalAlerta from "../../../../assets/admin/modal-alert.svg";
import vacioCheck from "../../../../assets/admin/vacio-check.svg";
import vacioBuscar from "../../../../assets/admin/vacio-search.svg";

const RUTA = "/admin/atencion/avisos";
const POR_PAGINA = 8;

const TONO: Record<EstadoAviso, TonoChip> = { publicado: "verde", programado: "dorado", borrador: "gris", archivado: "gris" };
const EstadoChip = ({ estado }: { estado: EstadoAviso }) => <Chip tono={TONO[estado]}>{NOMBRE_ESTADO[estado]}</Chip>;

function Pantalla({ migas, children }: { migas: [string, string?][]; children: React.ReactNode }) {
    return (
        <PanelLayout titulo="Atención" tema="contenidos">
            <Migas pasos={[["Avisos", RUTA], ...migas]} />
            {children}
        </PanelLayout>
    );
}

// ---------- Lista (Figma 578:39912, vacía 578:40338, sin resultados 578:40569) ----------

export default function Avisos() {
    const lista = useAvisos();
    const [filtro, setFiltro] = useState<FiltroAviso>("todos");
    const [texto, setTexto] = useState("");
    const [pagina, setPagina] = useState(0);
    const filtrados = filtrarAvisos(lista, filtro, texto);
    const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const actual = Math.min(pagina, paginas - 1);
    const visibles = filtrados.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA);

    function elegir(f: FiltroAviso) { setFiltro(f); setPagina(0); }

    const filtros: { valor: FiltroAviso; texto: string }[] = [
        { valor: "todos", texto: `Todos (${lista.length})` },
        { valor: "publicado", texto: `Publicados (${contarAvisos(lista, "publicado")})` },
        { valor: "programado", texto: `Programados (${contarAvisos(lista, "programado")})` },
        { valor: "borrador", texto: `Borradores (${contarAvisos(lista, "borrador")})` },
        { valor: "archivado", texto: `Archivados (${contarAvisos(lista, "archivado")})` },
    ];
    const tarjetas: { tono: "azul" | "gris" | "guinda"; filtro: FiltroAviso; titulo: string; texto: string }[] = [
        { tono: "azul", filtro: "publicado", titulo: "Publicados ahora", texto: "Visibles en el portal." },
        { tono: "gris", filtro: "programado", titulo: "Programados", texto: "Todavía no empiezan." },
        { tono: "guinda", filtro: "borrador", titulo: "Borradores", texto: "Sin publicar." },
    ];

    return (
        <PanelLayout titulo="Atención" tema="contenidos">
            <Migas pasos={[["Avisos"]]} />
            <EncabezadoPagina
                etiqueta="Atención · Avisos"
                titulo="Avisos"
                texto="Mensajes breves que se muestran en el portal: cierres, cambios de horario o mantenimiento. Datos de ejemplo."
                accion={<Link to={`${RUTA}/nuevo`} className="contenidos-boton contenidos-boton--principal">Nuevo aviso</Link>}
            />

            <section className="contenidos-resumen" aria-labelledby="avisos-resumen-titulo">
                <h2 id="avisos-resumen-titulo">Accesos rápidos</h2>
                <div className="contenidos-resumen__tarjetas">
                    {tarjetas.map((t) => (
                        <article key={t.filtro} className={`contenidos-resumen__tarjeta contenidos-resumen__tarjeta--${t.tono}${filtro === t.filtro ? " at-tarjeta--activa" : ""}`}>
                            <div className="contenidos-resumen__fila">
                                <span className="contenidos-resumen__icono"><IconoReloj /></span>
                                <button type="button" className="contenidos-resumen__enlace" aria-pressed={filtro === t.filtro} onClick={() => elegir(t.filtro)}>Ver →</button>
                            </div>
                            <p className="contenidos-resumen__cifra">{contarAvisos(lista, t.filtro as EstadoAviso)}</p>
                            <p className="contenidos-resumen__titulo">{t.titulo}</p>
                            <p className="contenidos-resumen__texto">{t.texto}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="contenidos-lista" aria-labelledby="avisos-lista-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoLista /></span>
                    <div><h2 id="avisos-lista-titulo">Todos los avisos</h2><p>Del más reciente al más antiguo.</p></div>
                </div>
                <div className="contenidos-lista__herramientas">
                    <div className="contenidos-filtros" role="group" aria-label="Filtrar por estado">
                        {filtros.map((f) => (
                            <button key={f.valor} type="button" aria-pressed={filtro === f.valor} className={`contenidos-filtro${filtro === f.valor ? " contenidos-filtro--activo" : ""}`} onClick={() => elegir(f.valor)}>{f.texto}</button>
                        ))}
                    </div>
                    <label className="contenidos-buscar">
                        <IconoBuscar />
                        <input type="search" placeholder="Buscar aviso" aria-label="Buscar aviso" value={texto} onChange={(e) => { setTexto(e.target.value); setPagina(0); }} />
                    </label>
                </div>

                {visibles.length === 0 ? (
                    texto.trim() ? (
                        <EstadoVacio icono={vacioBuscar} titulo="Sin resultados" texto="No encontramos avisos con esa búsqueda." accion={{ texto: "Quitar filtros", alPresionar: () => { setTexto(""); elegir("todos"); } }} />
                    ) : (
                        <EstadoVacio icono={vacioCheck} titulo="No hay avisos" texto="Cuando publiques un aviso, aparecerá aquí con su vigencia." />
                    )
                ) : (
                    <div className="contenidos-tabla avisos-tabla" tabIndex={0} role="table" aria-label="Avisos">
                        <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                            {["Folio", "Aviso", "Tipo", "Vigencia", "Dónde se ve", "Estado", "Acción"].map((t) => <span key={t} role="columnheader">{t}</span>)}
                        </div>
                        {visibles.map((a) => (
                            <div key={a.folio} className="contenidos-tabla__fila" role="row">
                                <span role="cell" className="contenidos-tabla__folio">{a.folio}</span>
                                <span role="cell" className="contenidos-tabla__titulo">{a.titulo}</span>
                                <span role="cell">{a.tipo}</span>
                                <span role="cell">{vigencia(a)}</span>
                                <span role="cell">{a.donde}</span>
                                <span role="cell"><EstadoChip estado={a.estado} /></span>
                                <span role="cell">
                                    <Link to={a.estado === "borrador" ? `${RUTA}/${a.folio}/editar` : `${RUTA}/${a.folio}`} className="contenidos-tabla__accion">
                                        {a.estado === "borrador" ? "Editar" : a.estado === "archivado" ? "Ver" : "Abrir"} →<span className="solo-lectores"> {a.folio}</span>
                                    </Link>
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {filtrados.length > 0 && (
                    <div className="contenidos-lista__pie">
                        <p>Mostrando {visibles.length} de {filtrados.length} avisos (ejemplo)</p>
                        <span />
                        <div className="contenidos-paginas" role="group" aria-label="Páginas">
                            <button type="button" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>‹ Anterior</button>
                            <button type="button" className="contenidos-paginas__actual" aria-current="page">{actual + 1} de {paginas}</button>
                            <button type="button" disabled={actual + 1 >= paginas} onClick={() => setPagina(actual + 1)}>Siguiente ›</button>
                        </div>
                    </div>
                )}
            </section>
        </PanelLayout>
    );
}

// ---------- Nuevo / editar (Figma 578:40802, faltan datos 578:41193) ----------

export function FormularioAviso() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useAvisos();
    const existente = obtenerAviso(folio);
    const [valores, setValores] = useState<ValoresAviso>(() => existente
        ? { titulo: existente.titulo, tipo: existente.tipo, mensaje: existente.mensaje, desde: existente.desde, hasta: existente.hasta, donde: existente.donde }
        : { titulo: "", tipo: "Cierre", mensaje: "", desde: "", hasta: "", donde: LUGARES_AVISO[0] });
    const [errores, setErrores] = useState<ErroresAviso>({});

    if (folio && !existente) return <Navigate to={RUTA} replace />;

    function cambiar<K extends keyof ValoresAviso>(campo: K, valor: ValoresAviso[K]) {
        setValores((v) => ({ ...v, [campo]: valor }));
        setErrores((e) => ({ ...e, [campo]: undefined }));
    }

    function continuar(destino: "vista-previa" | "borrador") {
        const nuevos = validarAviso(valores);
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) return;
        const guardado = guardarBorrador(valores, folio);
        navigate(`${RUTA}/${guardado}/${destino}`);
    }

    const campo = (id: keyof ValoresAviso, etiqueta: string, control: React.ReactNode, ayuda?: string) => (
        <div className="contenidos-campo">
            <label htmlFor={`aviso-${id}`}>{etiqueta}<span className="contenidos-campo__obligatorio" aria-label="obligatorio"> *</span></label>
            {control}
            {errores[id] ? <p id={`aviso-${id}-nota`} className="contenidos-campo__error" role="alert">{errores[id]}</p>
                : ayuda && <p id={`aviso-${id}-nota`} className="contenidos-campo__ayuda">{ayuda}</p>}
        </div>
    );
    const conError = (id: keyof ValoresAviso) => ({ "aria-invalid": !!errores[id], "aria-describedby": `aviso-${id}-nota`, className: errores[id] ? "contenidos-campo--error" : undefined });

    return (
        <Pantalla migas={[[existente ? "Editar aviso" : "Nuevo aviso"]]}>
            <EncabezadoPagina volver={{ texto: "Volver a Avisos", ruta: RUTA }} etiqueta={existente ? `Aviso ${existente.folio} · Borrador` : "Atención · Avisos"} titulo={existente ? "Editar aviso" : "Nuevo aviso"} texto="El aviso no se ve en el portal hasta que lo publiques." />

            {Object.keys(errores).length > 0 && (
                <div className="at-bloque at-bloque--error" role="alert"><strong>Faltan datos</strong><p>Revisa los campos marcados. Lo escrito se conserva.</p></div>
            )}

            <Tarjeta icono={iconoInfo} titulo="Contenido del aviso">
                <div className="at-fila">
                    {campo("titulo", "Título", <input id="aviso-titulo" type="text" maxLength={90} value={valores.titulo} onChange={(e) => cambiar("titulo", e.target.value)} {...conError("titulo")} />)}
                    {campo("tipo", "Tipo", <select id="aviso-tipo" value={valores.tipo} onChange={(e) => cambiar("tipo", e.target.value as ValoresAviso["tipo"])} {...conError("tipo")}>{TIPOS_AVISO.map((t) => <option key={t}>{t}</option>)}</select>)}
                </div>
                {campo("mensaje", "Mensaje", <textarea id="aviso-mensaje" rows={3} value={valores.mensaje} onChange={(e) => cambiar("mensaje", e.target.value)} {...conError("mensaje")} />, `Máximo ${MAXIMO_MENSAJE} caracteres.${valores.mensaje ? ` (${valores.mensaje.length}/${MAXIMO_MENSAJE})` : ""}`)}
                <div className="at-fila">
                    {campo("desde", "Visible desde", <input id="aviso-desde" type="date" value={valores.desde} onChange={(e) => cambiar("desde", e.target.value)} {...conError("desde")} />)}
                    {campo("hasta", "Visible hasta", <input id="aviso-hasta" type="date" value={valores.hasta} min={valores.desde || undefined} onChange={(e) => cambiar("hasta", e.target.value)} {...conError("hasta")} />)}
                    <div className="contenidos-campo">
                        <label htmlFor="aviso-donde">Dónde se muestra</label>
                        <select id="aviso-donde" value={valores.donde} onChange={(e) => cambiar("donde", e.target.value)}>{LUGARES_AVISO.map((l) => <option key={l}>{l}</option>)}</select>
                    </div>
                </div>
            </Tarjeta>

            <div className="contenidos-previa__acciones">
                <button type="button" className="contenidos-boton contenidos-boton--principal" onClick={() => continuar("vista-previa")}>Vista previa</button>
                <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => continuar("borrador")}>Guardar borrador</button>
                <Link to={RUTA} className="contenidos-boton contenidos-boton--suave-azul">Cancelar</Link>
            </div>
        </Pantalla>
    );
}

// ---------- Vista previa y confirmar publicación (Figma 578:41586, 578:41947, error 655:53465) ----------

export function VistaPreviaAviso() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useAvisos();
    const aviso = obtenerAviso(folio);
    const [confirmando, setConfirmando] = useState(false);
    const [error, setError] = useState(false);
    if (!aviso) return <Navigate to={RUTA} replace />;

    function publicar() {
        setConfirmando(false);
        // Para revisar el estado de error sin backend: ?simular=error-publicar
        if (simulacion() === "error-publicar") { setError(true); return; }
        publicarAviso(aviso!.folio);
        navigate(`${RUTA}/${aviso!.folio}/publicado`);
    }

    return (
        <Pantalla migas={[[aviso.folio, `${RUTA}/${aviso.folio}`], ["Vista previa"]]}>
            <EncabezadoPagina volver={{ texto: "Volver a editar", ruta: `${RUTA}/${aviso.folio}/editar` }} etiqueta={`Aviso ${aviso.folio} · Vista previa`} titulo="Vista previa del aviso" texto={`Así se verá en: ${aviso.donde}.`} />

            {error && <AvisoResultado tono="error" titulo="No se pudo publicar el aviso" texto="Se conservó como borrador. Inténtalo de nuevo en unos minutos." chip="Sin publicar" />}

            <article className="contenidos-previa" aria-label="Vista previa del aviso">
                <p className="contenidos-previa__franja">Vista previa · {aviso.tipo}</p>
                <div className="contenidos-previa__cuerpo avisos-previa">
                    <h2>{aviso.titulo}</h2>
                    <p>{aviso.mensaje}</p>
                    <p className="contenidos-previa__meta">Visible del {fechaCorta(aviso.desde)} al {fechaCorta(aviso.hasta)} · {aviso.donde}</p>
                </div>
            </article>

            <div className="contenidos-previa__acciones">
                <button type="button" className="contenidos-boton contenidos-boton--principal" onClick={() => setConfirmando(true)}>Publicar aviso</button>
                <Link to={`${RUTA}/${aviso.folio}/editar`} className="contenidos-boton contenidos-boton--contorno panel-regresar">Volver a editar</Link>
            </div>

            {confirmando && (
                <Ventana tono="verde" icono={modalCheck} angosta titulo="¿Publicar el aviso?"
                    texto={`«${aviso.titulo}» se verá en ${aviso.donde.toLowerCase()} del ${fechaCorta(aviso.desde)} al ${fechaCorta(aviso.hasta)}.`}
                    textoConfirmar="Sí, publicar" alConfirmar={publicar} alCerrar={() => setConfirmando(false)} />
            )}
        </Pantalla>
    );
}

// ---------- Detalle y retirar (Figma 578:42361, 578:42733) ----------

export function DetalleAviso() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useAvisos();
    const aviso = obtenerAviso(folio);
    const [retirando, setRetirando] = useState(false);
    if (!aviso) return <Navigate to={RUTA} replace />;
    if (aviso.estado === "borrador") return <Navigate to={`${RUTA}/${aviso.folio}/editar`} replace />;

    const activo = aviso.estado === "publicado" || aviso.estado === "programado";

    return (
        <Pantalla migas={[[aviso.folio]]}>
            <EncabezadoPagina volver={{ texto: "Volver a Avisos", ruta: RUTA }} etiqueta={`Aviso ${aviso.folio}`} titulo={aviso.titulo}
                texto={aviso.estado === "programado" ? `Se publicará el ${fechaCorta(aviso.desde)}.` : aviso.estado === "publicado" ? `Publicado desde el ${fechaCorta(aviso.desde)}.` : "Ya no se ve en el portal."} />

            <ResumenEstado aviso={aviso} />

            <Tarjeta icono={iconoCalendario} titulo="Datos del aviso">
                <Datos>
                    <Dato etiqueta="Tipo">{aviso.tipo}</Dato>
                    <Dato etiqueta="Vigencia">{fechaCorta(aviso.desde)} al {fechaCorta(aviso.hasta)}</Dato>
                    <Dato etiqueta="Dónde se ve">{aviso.donde}</Dato>
                    <Dato etiqueta="Publicó">{aviso.publico ?? "—"}</Dato>
                </Datos>
                <div className="at-nota"><p className="at-nota__autor">Mensaje</p><p>{aviso.mensaje}</p></div>
                {aviso.motivoRetiro && <div className="at-nota"><p className="at-nota__autor">Motivo del retiro</p><p>{aviso.motivoRetiro}</p></div>}
            </Tarjeta>

            <div className="contenidos-previa__acciones">
                {activo && <button type="button" className="contenidos-boton at-boton--guinda" onClick={() => setRetirando(true)}>Retirar aviso</button>}
                <Link to={RUTA} className="contenidos-boton contenidos-boton--suave-azul panel-regresar">Volver</Link>
            </div>

            {retirando && (
                <VentanaFormulario tono="guinda" icono={modalAlerta} titulo="¿Retirar el aviso?" texto="Dejará de verse en el portal y quedará archivado."
                    textoConfirmar="Sí, retirar aviso"
                    campos={[{ nombre: "motivo", etiqueta: "Motivo del retiro", obligatorio: true, placeholder: "Ej.: el horario ya volvió a la normalidad" }]}
                    alConfirmar={(v) => { retirarAviso(aviso.folio, v.motivo); navigate(`${RUTA}/${aviso.folio}/retirado`); }}
                    alCerrar={() => setRetirando(false)} />
            )}
        </Pantalla>
    );
}

function ResumenEstado({ aviso }: { aviso: Aviso }) {
    if (aviso.estado === "publicado") return <AvisoResultado tono="exito" titulo="Publicado" texto={`Visible hasta el ${fechaCorta(aviso.hasta)} · ${aviso.donde}`} chip="Publicado" />;
    if (aviso.estado === "programado") return <AvisoResultado tono="espera" titulo="Programado" texto={`Empieza el ${fechaCorta(aviso.desde)} · ${aviso.donde}`} chip="Programado" />;
    return <AvisoResultado tono="error" titulo="Archivado" texto="Ya no se ve en el portal." chip="Archivado" />;
}

// ---------- Resultados (publicado 578:42014, retirado 578:42808, borrador 655:53308) ----------

export function ResultadoAviso({ tipo }: { tipo: "publicado" | "retirado" | "borrador" }) {
    const { folio } = useParams();
    useAvisos();
    const aviso = obtenerAviso(folio);
    if (!aviso) return <Navigate to={RUTA} replace />;

    const textos = {
        publicado: { miga: "Aviso publicado", titulo: aviso.estado === "programado" ? "Aviso programado" : "Aviso publicado", texto: aviso.estado === "programado" ? `Se verá en el portal a partir del ${fechaCorta(aviso.desde)}.` : "Ya se ve en el portal." },
        retirado: { miga: "Aviso retirado", titulo: "Aviso retirado", texto: "Ya no se ve en el portal. Queda en Archivados." },
        borrador: { miga: "Borrador guardado", titulo: "Borrador guardado", texto: "El aviso no se ve en el portal hasta que lo publiques." },
    }[tipo];

    return (
        <Pantalla migas={[[textos.miga]]}>
            <EncabezadoPagina etiqueta={`Aviso ${aviso.folio}`} titulo={textos.titulo} texto={textos.texto} />
            <AvisoResultado tono={tipo === "retirado" ? "error" : tipo === "borrador" ? "espera" : "exito"} titulo={`${aviso.folio} · ${aviso.titulo}`}
                texto={`${vigencia(aviso)} · ${aviso.donde}`} chip={NOMBRE_ESTADO[aviso.estado]} />
            <div className="contenidos-previa__acciones">
                <Link to={RUTA} className="contenidos-boton contenidos-boton--principal panel-regresar">Volver a Avisos</Link>
                {tipo === "borrador" && <Link to={`${RUTA}/${aviso.folio}/editar`} className="contenidos-boton contenidos-boton--contorno">Seguir editando</Link>}
                {tipo === "publicado" && <Link to={`${RUTA}/${aviso.folio}`} className="contenidos-boton contenidos-boton--contorno">Ver aviso</Link>}
            </div>
        </Pantalla>
    );
}
