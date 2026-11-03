import { useState } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import { BloqueResumen, Buscador, Chip, Encabezado, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Tabla, Tarjeta, type Columna } from "../contenidoDemo/piezas";
import { clasesBoton, paginar } from "../contenidoDemo/utiles";
import { fechaCorta, filtrarActividades, NOMBRE_ESTADO_ACTIVIDAD, useActividades, type Actividad, type EstadoActividad, type FiltroActividad } from "./datos";
import { BASE_PROPUESTAS, TONO_ACTIVIDAD } from "./utiles";
import iconoArchivo from "../../../assets/admin/actividades/resumen-archivo.svg";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoCheck from "../../../assets/admin/contenidos/resumen-check.svg";
import iconoX from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import iconoTarjeta from "../../../assets/admin/actividades/tarjeta-archivo.svg";
import vacioArchivo from "../../../assets/admin/actividades/vacio-archivo.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

const POR_PAGINA = 5;

// Actividades · Propuestas: lista (Figma 565:18654, sin actividades 565:21229, sin resultados 565:21477)
function Propuestas() {
    const todas = useActividades();
    const [filtro, setFiltro] = useState<FiltroActividad>("todas");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);

    const vigentes = todas.filter((a) => a.estado !== "archivada");
    const cuenta = (e: EstadoActividad) => vigentes.filter((a) => a.estado === e).length;
    const filtradas = filtrarActividades(todas, filtro, busqueda);
    const { paginas, actual, visibles } = paginar(filtradas, pagina, POR_PAGINA);

    function elegir(nuevo: FiltroActividad) {
        setFiltro(nuevo);
        setPagina(0);
    }

    const columnas: Columna<Actividad>[] = [
        { titulo: "FOLIO", ancho: 90, folio: true, celda: (a) => a.folio },
        { titulo: "ACTIVIDAD", fuerte: true, celda: (a) => a.nombre },
        { titulo: "TIPO", ancho: 110, celda: (a) => a.tipo },
        { titulo: "FECHA", ancho: 120, celda: (a) => fechaCorta(a.fecha) },
        { titulo: "ESPACIO", ancho: 150, celda: (a) => a.espacio || "Por definir" },
        { titulo: "CUPO", ancho: 60, celda: (a) => a.cupo || "—" },
        { titulo: "ESTADO", ancho: 150, celda: (a) => <Chip tono={TONO_ACTIVIDAD[a.estado]} ancho={150}>{NOMBRE_ESTADO_ACTIVIDAD[a.estado]}</Chip> },
        { titulo: "ACCIÓN", ancho: 80, celda: (a) => <Link to={`${BASE_PROPUESTAS}/${a.folio}`} className="cn-enlace">Abrir →<span className="cn-solo-lectores"> {a.folio}</span></Link> },
    ];

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Propuestas de actividades"], ["Lista"]]} />

                <Encabezado etiqueta="Actividades · Propias" titulo="Propuestas de actividades" texto="Las actividades que el personal propone, programa y publica en la biblioteca." />

                <BloqueResumen
                    insignia="Propuestas de actividades"
                    titulo="Resumen de"
                    resalte="actividades"
                    subtitulo="Estado de las actividades propias · cifras de ejemplo"
                    accesos={[
                        { icono: iconoArchivo, numero: vigentes.length, titulo: "Total", texto: "En el año (ejemplo)", enlace: "Ver todas", tono: "verde", activo: filtro === "todas", alPresionar: () => elegir("todas") },
                        { icono: iconoReloj, numero: cuenta("en-revision"), titulo: "En revisión", texto: "Esperan decisión", enlace: "Ver en revisión", tono: "dorado", activo: filtro === "en-revision", alPresionar: () => elegir("en-revision") },
                        { icono: iconoCheck, numero: cuenta("publicada"), titulo: "Publicadas", texto: "Visibles en el portal", enlace: "Ver publicadas", tono: "verde", activo: filtro === "publicada", alPresionar: () => elegir("publicada") },
                        { icono: iconoX, numero: cuenta("cancelada"), titulo: "Canceladas", texto: "Con aviso a inscritos", enlace: "Ver canceladas", tono: "guinda", activo: filtro === "cancelada", alPresionar: () => elegir("cancelada") },
                    ]}
                />

                <div className="cn-acciones">
                    <Link to={`${BASE_PROPUESTAS}/nueva`} className={clasesBoton("verde")}>Nueva actividad</Link>
                </div>

                <Tarjeta icono={iconoTarjeta} titulo="Todas las actividades" subtitulo="Ordenadas por fecha.">
                    <div className="cn-barra">
                        <Filtros
                            valor={filtro}
                            alCambiar={elegir}
                            opciones={[
                                { valor: "todas", texto: `Todas (${vigentes.length})` },
                                { valor: "borrador", texto: `Borrador (${cuenta("borrador")})` },
                                { valor: "en-revision", texto: `En revisión (${cuenta("en-revision")})` },
                                { valor: "aprobada", texto: `Aprobadas (${cuenta("aprobada")})` },
                                { valor: "publicada", texto: `Publicadas (${cuenta("publicada")})` },
                                { valor: "cancelada", texto: `Canceladas (${cuenta("cancelada")})` },
                            ]}
                        />
                        <Buscador texto="Buscar por folio o nombre" valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
                    </div>

                    {vigentes.length === 0 ? (
                        <EstadoVacio icono={vacioArchivo} titulo="Aún no hay actividades" texto="Crea la primera con «Nueva actividad»." />
                    ) : visibles.length === 0 ? (
                        <EstadoVacio
                            icono={vacioBuscar}
                            titulo={busqueda.trim() ? `Sin resultados para «${busqueda.trim()}»` : "No hay actividades con este estado"}
                            texto="Prueba con otra palabra, otro estado o quita los filtros."
                            accion={{ texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("todas"); } }}
                        />
                    ) : (
                        <Tabla columnas={columnas} filas={visibles} clave={(a) => a.folio} />
                    )}

                    {filtradas.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filtradas.length} actividades (ejemplo)</p>
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                </Tarjeta>

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default Propuestas;
