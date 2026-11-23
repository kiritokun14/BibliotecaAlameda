// Administración › Estadísticas (Figma 580:49970). Datos reales: GET /administracion/estadisticas (Back/estadisticas.py).
// Rediseño (22 nov 2026): barra con sección y periodo, indicadores en tarjetas, gráfica con escala, valores y resumen
// (total, promedio y el punto más alto) | lo más visto con su barra y qué cuenta cada sección.
// Solo en desarrollo, ?simular=ejemplo muestra los datos de ejemplo de ./datos.ts para revisar el diseño sin backend.
import { useEffect, useId, useState } from "react";
import { Ventana } from "../Ventana";
import { simulacion } from "../../../servicios/simulacion";
import { estadisticas as ejemplo, porcentaje, type Estadisticas as DatosEstadisticas, type Periodo, type SeccionEstadistica } from "./datos";
import { consultarEstadisticas } from "../../../servicios/estadisticas";
import { mensajeError } from "../../../servicios/api";
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import { ErrorCarga, Pantalla } from "./comun";
import { descargarCsv } from "./utiles";
import { Aviso, Encabezado, Icono, Plegable, Segmentado, Tarjeta, Vacio, type NombreIcono } from "../piezasPanel";
import modalInfo from "../../../assets/admin/modal-info.svg";

const SECCIONES: { valor: SeccionEstadistica; texto: string }[] = [{ valor: "portal", texto: "Portal" }, { valor: "actividades", texto: "Actividades" }, { valor: "contenidos", texto: "Contenidos" }];
const PERIODOS: { valor: Periodo; texto: string }[] = [{ valor: "30dias", texto: "Últimos 30 días" }, { valor: "mes", texto: "Este mes" }, { valor: "anio", texto: "Este año" }];
const ICONOS: Record<SeccionEstadistica, NombreIcono[]> = {
    portal: ["usuario", "mensajes", "credencial", "espacios"],
    actividades: ["calendario", "inscripciones", "asistencia", "alerta"],
    contenidos: ["portal", "revision", "alerta", "contenido"],
};
const QUE_CUENTA: Record<SeccionEstadistica, string[]> = {
    portal: ["Cuentas creadas en el periodo.", "Mensajes de Contacto y sugerencias.", "Solicitudes de credencial y de espacio.", "Propuestas de actividad de la gente."],
    actividades: ["Sesiones que ya pasaron (sin las canceladas).", "Personas inscritas o por decidir en esas sesiones.", "Asistencia: presentes entre las listas cerradas."],
    contenidos: ["Contenidos publicados en el periodo.", "Los que esperan autorización hoy.", "Los retirados del portal en el periodo."],
};
const VACIO: DatosEstadisticas = { indicadores: [], serie: [], tituloSerie: "", tabla: [], tituloTabla: "" };
const miles = (n: number) => n.toLocaleString("es-MX");

export default function Estadisticas() {
    const id = useId();
    const [seccion, setSeccion] = useState<SeccionEstadistica>("portal");
    const [periodo, setPeriodo] = useState<Periodo>("30dias");
    const [exportando, setExportando] = useState(false);
    const [exportado, setExportado] = useState("");
    const [errorExportar, setErrorExportar] = useState(false);
    const [intento, setIntento] = useState(0);
    const modo = simulacion(); // ?simular=error-exportar | ejemplo (solo desarrollo)
    const deEjemplo = import.meta.env.DEV && modo === "ejemplo";
    const clave = `${seccion}:${periodo}:${intento}`;
    const [resultado, setResultado] = useState<{ clave: string; datos?: DatosEstadisticas; error?: string }>({ clave: "" });
    useEffect(() => {
        if (deEjemplo) return;
        let vigente = true;
        consultarEstadisticas(seccion, periodo)
            .then((datos) => { if (vigente) setResultado({ clave, datos }); })
            .catch((error) => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, seccion, periodo, deEjemplo]);
    const [ultimos, setUltimos] = useState<DatosEstadisticas>();
    if (resultado.datos && resultado.datos !== ultimos) setUltimos(resultado.datos);
    const errorCarga = !deEjemplo && resultado.clave === clave ? resultado.error : undefined;
    const datos = deEjemplo ? ejemplo(seccion, periodo) : (resultado.clave === clave ? resultado.datos : undefined) ?? ultimos ?? VACIO;
    const cargando = !deEjemplo && !ultimos && !errorCarga;
    const sinDatos = !cargando && !errorCarga && datos.serie.every((s) => s.valor === 0) && datos.tabla.every((f) => f.valor === 0)
        && datos.indicadores.every((i) => i.valor === "0" || i.valor === "Sin listas");

    const nombreSeccion = SECCIONES.find((s) => s.valor === seccion)!.texto;
    const nombrePeriodo = PERIODOS.find((p) => p.valor === periodo)!.texto.toLowerCase();
    const unidad = periodo === "anio" ? "mes" : "semana";
    const maximo = Math.max(...datos.serie.map((s) => s.valor), 1);
    const escala = Math.max(4, Math.ceil(maximo / 4) * 4);
    const total = datos.serie.reduce((t, s) => t + s.valor, 0);
    const mayor = datos.serie.reduce<{ etiqueta: string; valor: number } | null>((m, s) => (!m || s.valor > m.valor ? s : m), null);
    const totalTabla = datos.tabla.reduce((t, f) => t + f.valor, 0);

    function exportar() {
        setExportando(false); setExportado(""); setErrorExportar(false);
        if (modo === "error-exportar") { setErrorExportar(true); return; }
        const nombre = `estadisticas-${seccion}-${periodo}.csv`;
        descargarCsv(nombre, [
            ["Indicador", "Valor", "Detalle"], ...datos.indicadores.map((i) => [i.titulo, i.valor, i.detalle]), [],
            [datos.tituloSerie, "Valor"], ...datos.serie.map((s) => [s.etiqueta, s.valor]), [],
            [datos.tituloTabla, "Total"], ...datos.tabla.map((f) => [f.nombre, f.valor]),
        ]);
        setExportado(nombre);
    }

    return (
        <Pantalla migas={[["Estadísticas"], [nombreSeccion]]}>
            <div className="pz-pagina">
                <Encabezado titulo="Estadísticas" texto="Cómo se usan el portal, las actividades y los contenidos. Solo conteos: sin datos personales.">
                    <button type="button" className="pz-boton pz-boton--contorno" disabled={cargando || !!errorCarga} onClick={() => setExportando(true)}>Exportar en CSV</button>
                </Encabezado>

                <section className="pz-tarjeta cal-barra est-barra" aria-label="Sección y periodo">
                    <div className="cal-barra__fila">
                        <div className="est-barra__grupo"><span>Sección</span><Segmentado<SeccionEstadistica> etiqueta="Sección" valor={seccion} alCambiar={setSeccion} opciones={SECCIONES} /></div>
                        <div className="est-barra__grupo"><span>Periodo</span><Segmentado<Periodo> etiqueta="Periodo" valor={periodo} alCambiar={setPeriodo} opciones={PERIODOS} /></div>
                    </div>
                </section>

                {deEjemplo && <Aviso tono="espera" titulo="Datos de ejemplo." texto="Solo en desarrollo, para revisar el diseño mientras se instala el backend." />}
                {exportado && <Aviso titulo="Exportación lista." texto={`Se descargó ${exportado}.`} />}
                {errorExportar && <Aviso tono="error" titulo="No se pudo exportar." texto="Inténtalo de nuevo en unos minutos." />}

                {errorCarga ? (
                    <ErrorCarga titulo="No se pudieron cargar las estadísticas" texto={errorCarga} alReintentar={() => setIntento((x) => x + 1)} />
                ) : cargando ? (
                    <EsqueletoLista texto="Cargando estadísticas…" />
                ) : sinDatos ? (
                    <section className="pz-tarjeta"><Vacio icono="estadisticas" titulo="Sin datos para este periodo" texto="Prueba con otro periodo o con otra sección." /></section>
                ) : (
                    <>
                        <div className="est-indicadores" role="group" aria-label={`${nombreSeccion}, ${nombrePeriodo}`}>
                            {datos.indicadores.map((i, n) => (
                                <article key={i.titulo} className={`est-indicador${n === 0 ? " est-indicador--principal" : ""}`}>
                                    <span className="est-indicador__icono" aria-hidden="true"><Icono nombre={ICONOS[seccion][n] ?? "estadisticas"} /></span>
                                    <p className="est-indicador__valor">{i.valor}</p>
                                    <p className="est-indicador__titulo">{i.titulo}</p>
                                    <p className="est-indicador__detalle">{i.detalle}</p>
                                </article>
                            ))}
                        </div>

                        <div className="pz-columnas pz-columnas--libre">
                            <Tarjeta icono="estadisticas" id={`${id}-serie`} titulo={datos.tituloSerie} texto={`Por ${unidad}, ${nombrePeriodo}. Pasa el cursor por una barra para ver su valor`}>
                                <div className="est-resumen">
                                    <span><small>Total</small><strong>{miles(total)}</strong></span>
                                    <span><small>Promedio por {unidad}</small><strong>{miles(Math.round(total / Math.max(1, datos.serie.length)))}</strong></span>
                                    <span><small>{unidad === "mes" ? "Mes" : "Semana"} más alta</small><strong>{mayor && mayor.valor ? mayor.etiqueta : "Ninguna"}</strong></span>
                                </div>
                                <div className="est-grafica">
                                    <div className="est-grafica__escala" aria-hidden="true">
                                        {[escala, escala * 0.75, escala / 2, escala / 4, 0].map((v) => <span key={v}>{miles(Math.round(v))}</span>)}
                                    </div>
                                    <div className="ad-grafica est-grafica__barras" role="img" aria-label={`${datos.tituloSerie}: ${datos.serie.map((s) => `${s.etiqueta} ${s.valor}`).join(", ")}`}>
                                        {datos.serie.map((s) => (
                                            <div key={s.etiqueta} className={`ad-grafica__columna${mayor && s === mayor && s.valor ? " est-grafica__columna--mayor" : ""}`} tabIndex={0} aria-label={`${s.etiqueta}: ${miles(s.valor)}`}>
                                                <span className="est-grafica__valor">{miles(s.valor)}</span>
                                                <span className="ad-grafica__barra" style={{ height: `${Math.max(2, (s.valor / escala) * 100)}%` }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="ad-grafica__ejes est-grafica__ejes" aria-hidden="true">{datos.serie.map((s) => <span key={s.etiqueta}>{s.etiqueta}</span>)}</div>
                                <table className="solo-lectores">
                                    <caption>{datos.tituloSerie}</caption>
                                    <thead><tr><th>{unidad === "mes" ? "Mes" : "Semana"}</th><th>Valor</th></tr></thead>
                                    <tbody>{datos.serie.map((s) => <tr key={s.etiqueta}><td>{s.etiqueta}</td><td>{s.valor}</td></tr>)}</tbody>
                                </table>
                            </Tarjeta>

                            <aside className="pz-lateral" aria-label={datos.tituloTabla}>
                                <Tarjeta icono="lista" id={`${id}-tabla`} titulo={datos.tituloTabla} texto={`Del total ${nombrePeriodo === "este año" ? "del año" : `de ${nombrePeriodo}`}`}>
                                    {datos.tabla.length ? (
                                        <ol className="pz-ranking">
                                            {datos.tabla.map((f, n) => (
                                                <li key={f.nombre}>
                                                    <span className="pz-ranking__lugar" aria-hidden="true">{n + 1}</span>
                                                    <div className="pz-ranking__textos">
                                                        <p className="pz-ranking__nombre">{f.nombre}</p>
                                                        <span className="pz-ranking__barra" aria-hidden="true"><span style={{ width: porcentaje(f.valor, totalTabla) }} /></span>
                                                    </div>
                                                    <p className="pz-ranking__valor"><strong>{miles(f.valor)}</strong><span>{porcentaje(f.valor, totalTabla)}</span></p>
                                                </li>
                                            ))}
                                        </ol>
                                    ) : <Vacio icono="lista" titulo="Sin datos" texto="No hubo movimientos en este periodo." />}
                                </Tarjeta>
                                <Plegable titulo={`Qué cuenta ${nombreSeccion.toLowerCase()}`}>
                                    <ul>{QUE_CUENTA[seccion].map((t) => <li key={t}>{t}</li>)}</ul>
                                </Plegable>
                            </aside>
                        </div>
                    </>
                )}
            </div>

            {exportando && (
                <Ventana tono="verde" icono={modalInfo} angosta titulo="Exportar estadísticas" texto={`Se descargará un archivo CSV con ${nombreSeccion.toLowerCase()} de ${nombrePeriodo}. No incluye datos personales.`}
                    textoConfirmar="Descargar CSV" alConfirmar={exportar} alCerrar={() => setExportando(false)} />
            )}
        </Pantalla>
    );
}
