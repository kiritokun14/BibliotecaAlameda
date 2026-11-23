import { useEffect, useId, useState } from "react";
import { Link } from "react-router";
import { Migas } from "./piezas";
import PanelLayout from "../PanelLayout";
import { mensajeError } from "../../../servicios/api";
import {
    consultarResumen, listarContenidos, type EstadoFiltroEditor, type EstadoContenidoApi, type ListaContenidos, type ResumenContenidos, type TipoContenidoApi,
} from "../../../servicios/contenidos";
import "./Contenidos.css";
import { Aviso, Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, Paginas, Plegable, Tarjeta, Vacio, type NombreIcono, type TonoEstado } from "../piezasPanel";

import { EsqueletoLista } from "../../../components/portal/Esqueleto";
// Pantalla de inicio del Editor de contenidos (HU-11 / T-054).
// Las cifras y la lista vienen del backend (/contenidos/editor) y solo incluyen lo propio.
// 21 nov 2026: con las piezas del panel (como Administración): cifras que filtran, lista con scroll interno | lateral con
// lo que se puede redactar y cómo se publica.

export type EstadoContenido = "borrador" | "por_autorizar" | "con_observaciones" | "publicado";

// La base llama "en_revision" a lo que aquí se muestra como "Por autorizar"
const ESTADO_API: Record<EstadoContenido, EstadoFiltroEditor> = {
    borrador: "borrador",
    por_autorizar: "en_revision",
    con_observaciones: "con_observaciones",
    publicado: "publicado",
};
type EstadoVisible = EstadoContenido | "aprobado" | "retirado" | "archivado" | "rechazado";
const ESTADO_PANTALLA: Record<EstadoContenidoApi, EstadoVisible> = {
    rechazado: "rechazado", aprobado: "aprobado", retirado: "retirado", archivado: "archivado",
    borrador: "borrador",
    en_revision: "por_autorizar",
    con_observaciones: "con_observaciones",
    publicado: "publicado",
};
const NOMBRE_TIPO: Record<TipoContenidoApi, string> = {
    noticia: "Noticia",
    resena: "Reseña",
    acerca: "Acerca de",
    memoria: "Memoria pública",
    servicio: "Servicio",
    programa: "Programa",
    recurso: "Recurso",
};
const POR_PAGINA = 10;

const formatoFecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

const ESTADOS: Record<EstadoVisible, { texto: string; accion: string; tono: TonoEstado }> = {
    rechazado: { texto: "Rechazado", accion: "Ver", tono: "guinda" },
    aprobado: { texto: "Aprobado", accion: "Ver", tono: "verde" },
    retirado: { texto: "Retirado", accion: "Ver", tono: "gris" },
    archivado: { texto: "Archivado", accion: "Ver", tono: "gris" },
    borrador: { texto: "Borrador", accion: "Editar", tono: "gris" },
    por_autorizar: { texto: "Por autorizar", accion: "Ver", tono: "dorado" },
    con_observaciones: { texto: "Con observaciones", accion: "Corregir", tono: "guinda" },
    publicado: { texto: "Publicado", accion: "Ver", tono: "verde" },
};
// Ícono de cada tipo de contenido (el mismo en la bandeja, al elegir el tipo y en la revisión)
const ICONO_TIPO: Record<TipoContenidoApi, NombreIcono> = {
    noticia: "contenido", resena: "fuentes", acerca: "info", memoria: "evidencias", servicio: "lista", programa: "calendario", recurso: "revision",
};
const QUE_REDACTAR: { tipo: TipoContenidoApi; texto: string; ruta: string }[] = [
    { tipo: "noticia", texto: "Avisos, convocatorias y novedades", ruta: "/admin/contenidos/editor/nuevo/noticia" },
    { tipo: "resena", texto: "Un libro recomendado por el equipo", ruta: "/admin/contenidos/editor/nuevo/resena" },
    { tipo: "acerca", texto: "Historia, misión y Solón Argüello", ruta: "/admin/contenidos/editor/acerca" },
    { tipo: "memoria", texto: "Fotografías y piezas del archivo", ruta: "/admin/contenidos/editor/nuevo/memoria" },
];

type Filtro = "todos" | EstadoContenido;

const FILTROS: { valor: Filtro; texto: string }[] = [
    { valor: "todos", texto: "Todos" },
    { valor: "borrador", texto: "Borradores" },
    { valor: "por_autorizar", texto: "Por autorizar" },
    { valor: "con_observaciones", texto: "Con observaciones" },
    { valor: "publicado", texto: "Publicados" },
];

function EditorContenidos() {
    const id = useId();
    const [filtro, setFiltro] = useState<Filtro>("todos");
    const [busqueda, setBusqueda] = useState("");
    const [busquedaAplicada, setBusquedaAplicada] = useState("");
    const [pagina, setPagina] = useState(0);
    const [resumen, setResumen] = useState<ResumenContenidos | null>(null);
    const [errorResumen, setErrorResumen] = useState("");
    const [cargaLista, setCargaLista] = useState<{ clave: string; datos?: ListaContenidos; error?: string } | null>(null);
    const claveLista = JSON.stringify([filtro, busquedaAplicada, pagina]);
    const actual = cargaLista?.clave === claveLista ? cargaLista : null;
    const lista = actual?.datos ?? null;
    const error = actual?.error ?? "";
    const cargando = !actual;

    useEffect(() => {
        let activo = true;
        consultarResumen()
            .then((r) => { if (activo) setResumen(r); })
            .catch((e) => { if (activo) setErrorResumen(mensajeError(e)); });
        return () => { activo = false; };
    }, []);

    // Espera a que dejes de escribir antes de buscar
    useEffect(() => {
        const espera = setTimeout(() => {
            setBusquedaAplicada(busqueda.trim());
            setPagina(0);
        }, 300);
        return () => clearTimeout(espera);
    }, [busqueda]);

    useEffect(() => {
        let activo = true;
        listarContenidos({
            estado: filtro === "todos" ? undefined : ESTADO_API[filtro],
            busqueda: busquedaAplicada,
            limite: POR_PAGINA,
            desplazamiento: pagina * POR_PAGINA,
        })
            .then((l) => { if (activo) setCargaLista({ clave: claveLista, datos: l }); })
            .catch((e) => { if (activo) setCargaLista({ clave: claveLista, error: mensajeError(e) }); });
        return () => { activo = false; };
    }, [filtro, busquedaAplicada, pagina, claveLista]);

    const elegirFiltro = (f: Filtro) => {
        setFiltro((actual) => (actual === f && f !== "todos" ? "todos" : f));
        setPagina(0);
    };
    const cuenta = (estado: EstadoContenido) => resumen?.[ESTADO_API[estado] as keyof ResumenContenidos] ?? 0;
    const total = resumen?.total ?? 0;
    const visibles = (lista?.contenidos ?? []).map((c) => ({
        ...c,
        estadoPantalla: ESTADO_PANTALLA[c.estado],
    }));
    const totalFiltrado = lista?.total ?? 0;
    const paginas = Math.max(1, Math.ceil(totalFiltrado / POR_PAGINA));

    const ruta = (c: { folio: string; estadoPantalla: EstadoVisible }) =>
        c.estadoPantalla === "con_observaciones" ? `/admin/contenidos/editor/${c.folio}/corregir`
            : c.estadoPantalla === "borrador" ? `/admin/contenidos/editor/${c.folio}/editar`
                : `/admin/contenidos/editor/${c.folio}/ver`;

    return (
        <PanelLayout titulo="Contenidos" tema="contenidos paleta">
            <Migas actual="Bandeja" />
            <div className="pz-pagina">
                <Encabezado titulo="Editor de contenidos" texto="Redacta noticias, reseñas y textos del portal. Lo que envías lo autoriza el Administrador antes de publicarse.">
                    <Cifra icono="contenido" valor={resumen ? cuenta("borrador") : "…"} texto="borradores" activa={filtro === "borrador"} alPresionar={() => elegirFiltro("borrador")} />
                    <Cifra icono="reloj" valor={resumen ? cuenta("por_autorizar") : "…"} texto="por autorizar" activa={filtro === "por_autorizar"} alPresionar={() => elegirFiltro("por_autorizar")} />
                    <Cifra icono="alerta" tono="vino" valor={resumen ? cuenta("con_observaciones") : "…"} texto="con observaciones" activa={filtro === "con_observaciones"} alPresionar={() => elegirFiltro("con_observaciones")} />
                </Encabezado>
                {errorResumen && <Aviso tono="error" titulo="No se pudieron cargar los contadores." texto={errorResumen} />}

                <div className="pz-columnas">
                    <Tarjeta icono="lista" id={`${id}-lista`} titulo="Mis contenidos" texto="Lo que has redactado, del más reciente al más antiguo" className="pz-pendientes"
                        accion={<Link to="/admin/contenidos/editor/nuevo" className="pz-boton pz-boton--chico">Nuevo contenido</Link>}>
                        <Buscador etiqueta="Buscar por folio o título" placeholder="Buscar por folio o título" valor={busqueda} alCambiar={setBusqueda}>
                            <FiltrosAvanzados activos={filtro === "todos" ? 0 : 1} alQuitar={() => { setFiltro("todos"); setPagina(0); }} grupos={[
                                { titulo: "Estado", valor: filtro, alCambiar: (v) => { setFiltro(v as Filtro); setPagina(0); },
                                    opciones: FILTROS.map((f) => ({ valor: f.valor, texto: f.texto, cantidad: resumen ? (f.valor === "todos" ? total : cuenta(f.valor)) : undefined })) },
                            ]} />
                        </Buscador>

                        {cargando && <EsqueletoLista texto="Cargando contenidos…" />}
                        {error && <Aviso tono="error" titulo="No se pudo cargar la lista." texto={error} />}
                        {!error && lista && (visibles.length === 0 ? (
                            <Vacio icono="contenido" titulo={total === 0 ? "Todavía no tienes contenidos" : "No hay contenidos con este filtro"}
                                texto={total === 0 ? "Cuando crees un borrador aparecerá aquí. Empieza con Nuevo contenido." : "Prueba con otro estado o cambia la búsqueda."}
                                accion={total === 0
                                    ? <Link to="/admin/contenidos/editor/nuevo" className="pz-boton pz-boton--chico">Nuevo contenido</Link>
                                    : <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { setFiltro("todos"); setBusqueda(""); setPagina(0); }}>Ver todos</button>} />
                        ) : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label="Mis contenidos">
                                <ul className="pz-filas">
                                    {visibles.map((c) => (
                                        <li key={c.folio}>
                                            <article className={`pz-fila${c.estadoPantalla === "con_observaciones" ? " pz-fila--sensible" : ""}`}>
                                                <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={ICONO_TIPO[c.tipo] ?? "contenido"} /></span>
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{c.titulo || "Sin título"}</h4>
                                                    <p className="pz-fila__detalle"><span className="pz-fila__folio">{c.folio}</span><span>{NOMBRE_TIPO[c.tipo] ?? c.tipo}</span><span>Actualizado el {formatoFecha.format(new Date(c.actualizadoEn))}</span></p>
                                                </div>
                                                <Chip tono={ESTADOS[c.estadoPantalla].tono}>{ESTADOS[c.estadoPantalla].texto}</Chip>
                                                <Link to={ruta(c)} className={`pz-boton pz-boton--chico${c.estadoPantalla === "borrador" || c.estadoPantalla === "con_observaciones" ? "" : " pz-boton--contorno"}`}>
                                                    {ESTADOS[c.estadoPantalla].accion}<span className="solo-lectores"> {c.titulo}</span>
                                                </Link>
                                            </article>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {lista && totalFiltrado > 0 && (
                            <div className="pz-tarjeta__pie">
                                <p aria-live="polite">{visibles.length} de {totalFiltrado} contenidos</p>
                                <Paginas pagina={pagina + 1} paginas={paginas} bloqueada={cargando} alCambiar={(n) => setPagina(n - 1)} />
                            </div>
                        )}
                    </Tarjeta>

                    <aside className="pz-lateral" aria-label="Redactar">
                        <Tarjeta icono="contenido" id={`${id}-redactar`} titulo="¿Qué quieres redactar?" texto="Elige el tipo y empieza un borrador" className="pz-tarjeta--actividades">
                            <ul className="pz-actividades pz-redactar">
                                {QUE_REDACTAR.map((q) => (
                                    <li key={q.tipo}>
                                        <Link to={q.ruta} className="pz-redactar__enlace">
                                            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={ICONO_TIPO[q.tipo]} /></span>
                                            <span className="pz-actividades__textos">
                                                <span className="pz-actividades__titulo">{NOMBRE_TIPO[q.tipo]}</span>
                                                <span className="pz-actividades__detalle">{q.texto}</span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Tarjeta>
                        <Plegable titulo="Cómo se publica">
                            <ul>
                                <li>Guardas un borrador; nadie más lo ve.</li>
                                <li>Lo envías a autorización y queda Por autorizar.</li>
                                <li>El Administrador lo publica o te deja observaciones para corregir.</li>
                                <li>Ya publicado, aparece en el portal con su folio.</li>
                            </ul>
                        </Plegable>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

export default EditorContenidos;
