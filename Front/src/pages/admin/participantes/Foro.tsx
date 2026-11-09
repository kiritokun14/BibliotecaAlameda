import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "../actividades/EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { BloqueResumen, Buscador, Chip, Datos, Encabezado, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Tabla, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton, paginar } from "../contenidoDemo/utiles";
import { fechaCorta } from "../actividades/datos";
import { buscarPublicacion, enFiltroForo, hoy, NOMBRE_ESTADO_PUBLICACION, NORMAS, restaurarParticipacion, useForo, type FiltroForo, type Norma, type Publicacion, type Silencio } from "./moderacion";
import { BASE_FORO, TONO_PUBLICACION } from "./utiles";
import { ErrorDecision } from "./ErrorDecision";
import iconoXGuinda from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import iconoCheckDorado from "../../../assets/admin/participantes/resumen-check-dorado.svg";
import iconoXVerde from "../../../assets/admin/participantes/resumen-x-verde.svg";
import iconoXDorado from "../../../assets/admin/participantes/resumen-x-dorado.svg";
import iconoBandera from "../../../assets/admin/participantes/tarjeta-bandera.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import iconoSilencio from "../../../assets/admin/actividades/tarjeta-x.svg";
import vacioCheck from "../../../assets/admin/contenidos/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

type Vista = "publicaciones" | "normas" | "silenciadas";

const recortar = (t: string, n = 42) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);

function Pestanas({ vista }: { vista: Vista }) {
    const navigate = useNavigate();
    return (
        <Filtros
            etiqueta="Sección de moderación"
            valor={vista}
            alCambiar={(v) => navigate(v === "publicaciones" ? BASE_FORO : `${BASE_FORO}?vista=${v}`)}
            opciones={[
                { valor: "publicaciones", texto: "Publicaciones" },
                { valor: "normas", texto: "Normas del foro" },
                { valor: "silenciadas", texto: "Personas silenciadas" },
            ]}
        />
    );
}

// Moderación de Bibliocomunidad: cola (Figma 574:30186), cola vacía (574:30679), sin resultados (574:30900),
// normas (574:34237) y personas silenciadas (574:34674)
function Foro() {
    const [params] = useSearchParams();
    const vista = params.get("vista");
    if (vista === "normas") return <Normas />;
    if (vista === "silenciadas") return <Silenciadas />;
    return <Cola />;
}

function Cola() {
    const { publicaciones, silencios } = useForo();
    const [filtro, setFiltro] = useState<FiltroForo>("reportadas");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const navigate = useNavigate();

    const cuenta = (f: FiltroForo) => publicaciones.filter((p) => enFiltroForo(p, f)).length;
    const retiradasHoy = publicaciones.filter((p) => p.estado === "retirada" && p.decisiones.some((d) => d.tipo === "retirada" && d.fecha === hoy())).length;
    const filas = publicaciones.filter((p) => enFiltroForo(p, filtro) && buscarPublicacion(p, busqueda)).sort((a, b) => b.folio.localeCompare(a.folio));
    const { paginas, actual, visibles } = paginar(filas, pagina, 6);
    const elegir = (f: FiltroForo) => { setFiltro(f); setPagina(0); };
    const accion = (p: Publicacion) => (p.estado === "reportada" || p.estado === "pendiente" ? "Revisar" : "Ver");

    return (
        <PanelLayout titulo="Participantes" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Bibliocomunidad"], ["Cola de moderación"]]} />
                <Encabezado etiqueta="Participantes · Foro" titulo="Moderación de Bibliocomunidad" texto="Revisa las primeras respuestas y los reportes de Bibliocomunidad." />
                <BloqueResumen
                    insignia="Moderación de Bibliocomunidad"
                    titulo="Moderación de"
                    resalte="hoy"
                    subtitulo="Publicaciones reportadas y decisiones del día · cifras de ejemplo"
                    accesos={[
                        { icono: iconoXGuinda, numero: cuenta("reportadas"), titulo: "Reportadas", texto: "Esperan decisión", enlace: "Ver reportada", tono: "guinda", activo: filtro === "reportadas", alPresionar: () => elegir("reportadas") },
                        { icono: iconoCheckDorado, numero: cuenta("pendientes"), titulo: "Pendientes de aprobar", texto: "Primera publicación", enlace: "Revisar", tono: "dorado", activo: filtro === "pendientes", alPresionar: () => elegir("pendientes") },
                        { icono: iconoXVerde, numero: retiradasHoy, titulo: "Retiradas hoy", texto: "Con motivo", enlace: "Ver retirada", tono: "verde", activo: filtro === "retiradas", alPresionar: () => elegir("retiradas") },
                        { icono: iconoXDorado, numero: silencios.length, titulo: "Personas silenciadas", texto: "Activas", enlace: "Ver personas", tono: "dorado", alPresionar: () => navigate(`${BASE_FORO}?vista=silenciadas`) },
                    ]}
                />
                <Tarjeta icono={iconoBandera} titulo="Cola de moderación">
                    <div className="cn-barra">
                        <Pestanas vista="publicaciones" />
                        <Buscador texto="Buscar por texto o autor" valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
                    </div>
                    <Filtros
                        valor={filtro}
                        alCambiar={elegir}
                        opciones={[
                            { valor: "reportadas", texto: `Reportadas (${cuenta("reportadas")})` },
                            { valor: "pendientes", texto: `Pendientes (${cuenta("pendientes")})` },
                            { valor: "aprobadas", texto: `Aprobadas (${cuenta("aprobadas")})` },
                            { valor: "retiradas", texto: `Retiradas (${cuenta("retiradas")})` },
                        ]}
                    />
                    {filas.length === 0 ? (
                        busqueda.trim() ? (
                            <EstadoVacio icono={vacioBuscar} titulo={`Sin resultados para «${busqueda.trim()}»`} texto="Prueba con otra palabra o el nombre de la persona." accion={{ texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("reportadas"); } }} />
                        ) : (
                            <EstadoVacio icono={vacioCheck} titulo={filtro === "reportadas" ? "No hay publicaciones reportadas" : "No hay publicaciones en este filtro"} texto="Cuando alguien reporte una publicación, aparecerá aquí." />
                        )
                    ) : (
                        <Tabla
                            columnas={[
                                { titulo: "FOLIO", ancho: 80, folio: true, celda: (p: Publicacion) => p.folio },
                                { titulo: "PUBLICACIÓN", fuerte: true, celda: (p: Publicacion) => `«${recortar(p.texto)}»` },
                                { titulo: "AUTOR", celda: (p: Publicacion) => p.autor },
                                { titulo: "REPORTES", ancho: 80, celda: (p: Publicacion) => p.reportes },
                                { titulo: "MOTIVO", ancho: 140, celda: (p: Publicacion) => p.motivo },
                                { titulo: "ESTADO", ancho: 120, celda: (p: Publicacion) => <Chip tono={TONO_PUBLICACION[p.estado]} ancho={110}>{NOMBRE_ESTADO_PUBLICACION[p.estado]}</Chip> },
                                { titulo: "ACCIÓN", ancho: 80, celda: (p: Publicacion) => <Link to={`${BASE_FORO}/${p.folio}`} className="cn-enlace">{accion(p)} →<span className="cn-solo-lectores"> {p.folio}</span></Link> },
                            ]}
                            filas={visibles}
                            clave={(p) => p.folio}
                        />
                    )}
                    {filas.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filas.length} (ejemplo)</p>
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

function Normas() {
    const [busqueda, setBusqueda] = useState("");
    const t = busqueda.trim().toLowerCase();
    const filas = NORMAS.filter((n) => !t || n.nombre.toLowerCase().includes(t) || n.descripcion.toLowerCase().includes(t));
    return (
        <PanelLayout titulo="Participantes" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Bibliocomunidad", BASE_FORO], ["Normas del foro"]]} />
                <Encabezado etiqueta="Participantes · Foro" titulo="Normas del foro" texto="Las reglas que usa el personal para decidir." />
                <Tarjeta icono={iconoLista} titulo="Normas vigentes">
                    <div className="cn-barra">
                        <Pestanas vista="normas" />
                        <Buscador texto="Buscar norma" valor={busqueda} alCambiar={setBusqueda} />
                    </div>
                    {filas.length === 0 ? (
                        <EstadoVacio icono={vacioBuscar} titulo={`Sin resultados para «${busqueda.trim()}»`} texto="Prueba con otra palabra." accion={{ texto: "Limpiar búsqueda", alPresionar: () => setBusqueda("") }} />
                    ) : (
                        <>
                            <Tabla
                                columnas={[
                                    { titulo: "N.º", ancho: 70, folio: true, celda: (n: Norma) => n.numero },
                                    { titulo: "NORMA", ancho: 230, fuerte: true, celda: (n: Norma) => n.nombre },
                                    { titulo: "DESCRIPCIÓN", celda: (n: Norma) => n.descripcion },
                                    { titulo: "SANCIÓN SUGERIDA", ancho: 200, celda: (n: Norma) => n.sancion },
                                ]}
                                filas={filas}
                                clave={(n) => String(n.numero)}
                            />
                            <p className="cn-nota">{filas.length} normas (ejemplo)</p>
                        </>
                    )}
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Restaurar participación (574:35104) y su error (574:35176)
function Silenciadas() {
    const { silencios } = useForo();
    const navigate = useNavigate();
    const [busqueda, setBusqueda] = useState("");
    const [elegido, setElegido] = useState<Silencio | null>(null);
    const [ocupado, setOcupado] = useState(false);
    const [fallo, setFallo] = useState(false);
    const t = busqueda.trim().toLowerCase();
    const filas = silencios.filter((s) => !t || s.persona.toLowerCase().includes(t));

    async function restaurar() {
        if (!elegido) return;
        setOcupado(true);
        try {
            await restaurarParticipacion(elegido.id);
            navigate(`${BASE_FORO}/silenciadas/restaurada`, { state: { persona: elegido.persona } });
        } catch {
            setFallo(true);
        } finally {
            setOcupado(false);
        }
    }

    if (fallo) return <ErrorDecision ocupado={ocupado} alReintentar={() => void restaurar()} alVolver={() => { setFallo(false); setElegido(null); }} />;

    return (
        <PanelLayout titulo="Participantes" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Bibliocomunidad", BASE_FORO], [elegido ? "Restaurar participación" : "Personas silenciadas"]]} />
                <Encabezado etiqueta="Participantes · Foro" titulo="Personas silenciadas" texto="Quién no puede publicar y hasta cuándo." />
                <Tarjeta icono={iconoSilencio} titulo="Silencios activos">
                    <div className="cn-barra">
                        <Pestanas vista="silenciadas" />
                        <Buscador texto="Buscar persona" valor={busqueda} alCambiar={setBusqueda} />
                    </div>
                    {filas.length === 0 ? (
                        t ? (
                            <EstadoVacio icono={vacioBuscar} titulo={`Sin resultados para «${busqueda.trim()}»`} texto="Prueba con otro nombre." accion={{ texto: "Limpiar búsqueda", alPresionar: () => setBusqueda("") }} />
                        ) : (
                            <EstadoVacio icono={vacioCheck} titulo="No hay personas silenciadas" texto="Cuando silencies a alguien, aparecerá aquí con la fecha en que termina." />
                        )
                    ) : (
                        <>
                            <Tabla
                                columnas={[
                                    { titulo: "PERSONA", folio: true, celda: (s: Silencio) => s.persona },
                                    { titulo: "MOTIVO", ancho: 260, fuerte: true, celda: (s: Silencio) => s.motivo },
                                    { titulo: "HASTA", ancho: 130, celda: (s: Silencio) => fechaCorta(s.hasta) },
                                    { titulo: "POR", ancho: 170, celda: (s: Silencio) => s.por },
                                    { titulo: "ACCIÓN", ancho: 110, celda: (s: Silencio) => <button type="button" className="cn-enlace" onClick={() => setElegido(s)}>Restaurar →<span className="cn-solo-lectores"> {s.persona}</span></button> },
                                ]}
                                filas={filas}
                                clave={(s) => s.id}
                            />
                            <p className="cn-nota">{filas.length === 1 ? "1 persona" : `${filas.length} personas`} (ejemplo)</p>
                        </>
                    )}
                </Tarjeta>
                <PieDatos />
            </Pagina>

            {elegido && (
                <Ventana
                    titulo="¿Restaurar participación?"
                    texto="La persona podrá volver a publicar de inmediato."
                    alCerrar={() => setElegido(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setElegido(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={() => void restaurar()}>{ocupado ? "Restaurando…" : "Restaurar"}</button></>}
                >
                    <Datos variante="caja" filas={[["Persona", elegido.persona], ["Silencio hasta", fechaCorta(elegido.hasta)]]} />
                </Ventana>
            )}
        </PanelLayout>
    );
}

export default Foro;
