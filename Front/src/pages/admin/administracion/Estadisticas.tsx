// Administración › Estadísticas (Figma 580:49970). Datos de ejemplo (./datos.ts, TODO backend).
// 21 nov 2026: con las piezas del panel: sección y periodo en filtros segmentados, indicadores como cifras, la gráfica en
// su tarjeta y, al lado, la lista de lo más visto con su porcentaje en barra.
import { useId, useState } from "react";
import { Ventana } from "../Ventana";
import { simulacion } from "../../../servicios/simulacion";
import { estadisticas, porcentaje, type Periodo, type SeccionEstadistica } from "./datos";
import { ErrorCarga, Pantalla } from "./comun";
import { descargarCsv } from "./utiles";
import { Aviso, Cifra, Encabezado, Segmentado, Tarjeta, Vacio, type NombreIcono } from "../piezasPanel";
import modalInfo from "../../../assets/admin/modal-info.svg";

const SECCIONES: { valor: SeccionEstadistica; texto: string }[] = [{ valor: "portal", texto: "Portal" }, { valor: "actividades", texto: "Actividades" }, { valor: "contenidos", texto: "Contenidos" }];
const PERIODOS: { valor: Periodo; texto: string }[] = [{ valor: "30dias", texto: "Últimos 30 días" }, { valor: "mes", texto: "Este mes" }, { valor: "anio", texto: "Este año" }];
const ICONOS: NombreIcono[] = ["estadisticas", "usuario", "check", "reloj"];

export default function Estadisticas() {
    const id = useId();
    const [seccion, setSeccion] = useState<SeccionEstadistica>("portal");
    const [periodo, setPeriodo] = useState<Periodo>("30dias");
    const [exportando, setExportando] = useState(false);
    const [exportado, setExportado] = useState("");
    const [errorExportar, setErrorExportar] = useState(false);
    const [cargaRecuperada, setCargaRecuperada] = useState(false);
    const modo = simulacion(); // ?simular=error | sin-datos | error-exportar
    const errorCarga = modo === "error" && !cargaRecuperada;
    const datos = estadisticas(seccion, periodo);
    const nombreSeccion = SECCIONES.find((s) => s.valor === seccion)!.texto;
    const nombrePeriodo = PERIODOS.find((p) => p.valor === periodo)!.texto.toLowerCase();
    const maximo = Math.max(...datos.serie.map((s) => s.valor), 1);
    const totalTabla = datos.tabla.reduce((t, f) => t + f.valor, 0);

    function exportar() {
        setExportando(false);
        setExportado("");
        setErrorExportar(false);
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
                <Encabezado titulo="Estadísticas" texto="Cómo se usan el portal, las actividades y los contenidos. Sin datos personales.">
                    <button type="button" className="pz-boton pz-boton--contorno" onClick={() => setExportando(true)}>Exportar en CSV</button>
                </Encabezado>

                <div className="pz-herramientas pz-herramientas--barra">
                    <Segmentado<SeccionEstadistica> etiqueta="Sección" valor={seccion} alCambiar={setSeccion} opciones={SECCIONES} />
                    <Segmentado<Periodo> etiqueta="Periodo" valor={periodo} alCambiar={setPeriodo} opciones={PERIODOS} />
                </div>

                {exportado && <Aviso titulo="Exportación lista." texto={`Se descargó ${exportado}.`} />}
                {errorExportar && <Aviso tono="error" titulo="No se pudo exportar." texto="Inténtalo de nuevo en unos minutos." />}

                {errorCarga ? (
                    <ErrorCarga titulo="No se pudieron cargar las estadísticas" texto="Revisa tu conexión e inténtalo de nuevo." alReintentar={() => setCargaRecuperada(true)} />
                ) : modo === "sin-datos" ? (
                    <section className="pz-tarjeta"><Vacio icono="estadisticas" titulo="Sin datos para este periodo" texto="Prueba con otro periodo." /></section>
                ) : (
                    <>
                        <div className="pz-indicadores" role="group" aria-label={`${nombreSeccion}, ${nombrePeriodo}`}>
                            {datos.indicadores.map((i, n) => <Cifra key={i.titulo} icono={ICONOS[n] ?? "estadisticas"} valor={i.valor} texto={`${i.titulo}. ${i.detalle}`} />)}
                        </div>

                        <div className="pz-columnas pz-columnas--libre">
                            <Tarjeta icono="estadisticas" id={`${id}-serie`} titulo={datos.tituloSerie} texto="Últimas 5 semanas. Pasa el cursor o el foco por una barra para ver su valor">
                                <div className="ad-grafica" role="img" aria-label={`${datos.tituloSerie}: ${datos.serie.map((s) => `${s.etiqueta} ${s.valor}`).join(", ")}`}>
                                    {datos.serie.map((s) => (
                                        <div key={s.etiqueta} className="ad-grafica__columna" tabIndex={0} aria-label={`${s.etiqueta}: ${s.valor.toLocaleString("es-MX")}`}>
                                            <span className="ad-grafica__aviso">{s.etiqueta}: {s.valor.toLocaleString("es-MX")}</span>
                                            <span className="ad-grafica__barra" style={{ height: `${Math.max(2, (s.valor / maximo) * 100)}%` }} />
                                        </div>
                                    ))}
                                </div>
                                <div className="ad-grafica__ejes" aria-hidden="true">{datos.serie.map((s) => <span key={s.etiqueta}>{s.etiqueta}</span>)}</div>
                                <table className="solo-lectores">
                                    <caption>{datos.tituloSerie}</caption>
                                    <thead><tr><th>Semana</th><th>Valor</th></tr></thead>
                                    <tbody>{datos.serie.map((s) => <tr key={s.etiqueta}><td>{s.etiqueta}</td><td>{s.valor}</td></tr>)}</tbody>
                                </table>
                            </Tarjeta>

                            <aside className="pz-lateral" aria-label={datos.tituloTabla}>
                                <Tarjeta icono="lista" id={`${id}-tabla`} titulo={datos.tituloTabla} texto={`Del total de ${nombrePeriodo}`}>
                                    <ol className="pz-ranking">
                                        {datos.tabla.map((f, n) => (
                                            <li key={f.nombre}>
                                                <span className="pz-ranking__lugar" aria-hidden="true">{n + 1}</span>
                                                <div className="pz-ranking__textos">
                                                    <p className="pz-ranking__nombre">{f.nombre}</p>
                                                    <span className="pz-ranking__barra" aria-hidden="true"><span style={{ width: porcentaje(f.valor, totalTabla) }} /></span>
                                                </div>
                                                <p className="pz-ranking__valor"><strong>{f.valor.toLocaleString("es-MX")}</strong><span>{porcentaje(f.valor, totalTabla)}</span></p>
                                            </li>
                                        ))}
                                    </ol>
                                </Tarjeta>
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
