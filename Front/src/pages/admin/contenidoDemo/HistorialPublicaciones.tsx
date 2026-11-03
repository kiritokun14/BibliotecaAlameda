import { useState } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import { fechaCorta, filtrarHistorial, nombreTipo, retirarContenido, useContenidos, type Contenido, type FiltroHistorial } from "./datos";
import { tituloDe } from "./esquemas";
import { Buscador, CampoTexto, ChipEstado, Datos, EncabezadoTarjeta, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Tabla, Tarjeta, Ventana, type Columna } from "./piezas";
import { clasesBoton, paginar } from "./utiles";
import iconoReloj from "../../../assets/admin/contenidos/tarjeta-reloj.svg";
import vacioCheck from "../../../assets/admin/contenidos/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

const BASE = "/admin/contenidos/revision";
const POR_PAGINA = 5;

// HU-12 · Historial de publicaciones y retirar del portal (Figma 561:19695 y 561:20179)
function HistorialPublicaciones() {
    const todos = useContenidos();
    const [filtro, setFiltro] = useState<FiltroHistorial>("todos");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const [retirando, setRetirando] = useState<Contenido | null>(null);
    const [aviso, setAviso] = useState("");

    const cuenta = (f: FiltroHistorial) => filtrarHistorial(todos, f, "").length;
    const filtrados = filtrarHistorial(todos, filtro, busqueda);
    const { paginas, actual, visibles } = paginar(filtrados, pagina, POR_PAGINA);

    function elegir(nuevo: FiltroHistorial) {
        setFiltro(nuevo);
        setPagina(0);
    }

    const opciones: { valor: FiltroHistorial; texto: string }[] = [
        { valor: "todos", texto: `Todos (${cuenta("todos")})` },
        { valor: "noticia", texto: `Noticias (${cuenta("noticia")})` },
        { valor: "resena", texto: `Reseñas (${cuenta("resena")})` },
        { valor: "acerca", texto: `Acerca de (${cuenta("acerca")})` },
        ...(cuenta("memoria") > 0 ? [{ valor: "memoria" as const, texto: `Memoria pública (${cuenta("memoria")})` }] : []),
        { valor: "retirado", texto: `Retirados (${cuenta("retirado")})` },
    ];

    const columnas: Columna<Contenido>[] = [
        { titulo: "FOLIO", ancho: 110, folio: true, celda: (c) => c.folio },
        { titulo: "CONTENIDO", fuerte: true, celda: (c) => tituloDe(c.tipo, c.valores) },
        { titulo: "TIPO", ancho: 120, celda: (c) => nombreTipo(c.tipo) },
        { titulo: "AUTORIZÓ", ancho: 190, celda: (c) => c.publicacion!.autorizo },
        { titulo: "PUBLICADO", ancho: 130, celda: (c) => fechaCorta(c.publicacion!.fecha) },
        { titulo: "VERSIÓN", ancho: 80, celda: (c) => c.publicacion!.version },
        { titulo: "ESTADO", ancho: 150, celda: (c) => <ChipEstado estado={c.estado} ancho /> },
        {
            titulo: "ACCIÓN",
            ancho: 100,
            celda: (c) => c.estado === "publicado" ? (
                <button type="button" className="cn-enlace" onClick={() => { setAviso(""); setRetirando(c); }}>
                    Retirar →<span className="cn-solo-lectores"> {c.folio}</span>
                </button>
            ) : (
                <Link to={`${BASE}/${c.folio}`} className="cn-enlace">Ver →<span className="cn-solo-lectores"> {c.folio}</span></Link>
            ),
        },
    ];

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Revisión y publicación", BASE], ["Historial de publicaciones"]]} />

                <EncabezadoTarjeta
                    volver={{ texto: "Volver a Revisión y publicación", ruta: BASE }}
                    etiqueta="Contenidos · Historial"
                    titulo="Historial de publicaciones"
                    texto="Todo lo publicado, con quién autorizó, cuándo y bajo qué referencia. Desde aquí puedes retirar un contenido."
                />

                {aviso && <p className="cn-aviso cn-aviso--exito" role="status"><span className="cn-aviso__textos"><strong>{aviso}</strong></span></p>}

                <Tarjeta icono={iconoReloj} titulo="Contenidos publicados" subtitulo="Del más reciente al más antiguo.">
                    <div className="cn-barra">
                        <Filtros valor={filtro} alCambiar={elegir} opciones={opciones} etiqueta="Filtrar por tipo" />
                        <Buscador valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
                    </div>

                    {visibles.length === 0 ? (
                        busqueda.trim() ? (
                            <EstadoVacio
                                icono={vacioBuscar}
                                titulo={`Sin resultados para «${busqueda.trim()}»`}
                                texto="Prueba con otra palabra, otro tipo o quita los filtros."
                                accion={{ texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("todos"); } }}
                            />
                        ) : (
                            <EstadoVacio icono={vacioCheck} titulo={filtro === "retirado" ? "No hay contenidos retirados" : "Todavía no hay publicaciones"} texto="Lo que autorices y publiques aparecerá aquí con su referencia." />
                        )
                    ) : (
                        <Tabla columnas={columnas} filas={visibles} clave={(c) => c.folio} />
                    )}

                    {filtrados.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filtrados.length} publicados (ejemplo)</p>
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                </Tarjeta>

                <PieDatos />
            </Pagina>

            {retirando && (
                <VentanaRetirar
                    contenido={retirando}
                    alCerrar={() => setRetirando(null)}
                    alRetirar={(motivo) => {
                        retirarContenido(retirando.folio, motivo);
                        setAviso(`${retirando.folio} se retiró del portal. Sigue en el historial y puedes volver a publicarlo después.`);
                        setRetirando(null);
                    }}
                />
            )}
        </PanelLayout>
    );
}

function VentanaRetirar({ contenido, alCerrar, alRetirar }: { contenido: Contenido; alCerrar: () => void; alRetirar: (motivo: string) => void }) {
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");

    function confirmar() {
        if (!motivo.trim()) return setError("Escribe el motivo del retiro.");
        alRetirar(motivo);
    }

    return (
        <Ventana
            titulo="¿Retirar del portal?"
            texto="El contenido dejará de verse en el portal. Se conserva en el historial y puedes volver a publicarlo después."
            alCerrar={alCerrar}
            pie={
                <>
                    <button type="button" className={clasesBoton("contorno")} onClick={alCerrar}>Cancelar</button>
                    <button type="button" className={clasesBoton("guinda")} onClick={confirmar}>Retirar del portal</button>
                </>
            }
        >
            <Datos variante="caja" filas={[["Folio", contenido.folio], ["Contenido", tituloDe(contenido.tipo, contenido.valores)], ["Publicado", fechaCorta(contenido.publicacion!.fecha)]]} />
            <CampoTexto id="cn-motivo-retiro" etiqueta="Motivo del retiro" obligatorio error={error}>
                <textarea
                    id="cn-motivo-retiro"
                    className={`cn-control cn-control--area ${error ? "cn-control--error" : ""}`}
                    placeholder="Ej.: la información cambió."
                    value={motivo}
                    onChange={(e) => { setMotivo(e.target.value); setError(""); }}
                    aria-invalid={!!error}
                    aria-describedby={error ? "cn-motivo-retiro-error" : undefined}
                />
            </CampoTexto>
        </Ventana>
    );
}

export default HistorialPublicaciones;
