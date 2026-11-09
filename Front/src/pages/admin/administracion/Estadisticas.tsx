// Administración › Estadísticas (Figma 580:49970). Diseño del Editor. Datos de ejemplo (./datos.ts, TODO backend).
import { useState } from "react";
import { EncabezadoPagina, AvisoResultado } from "../componentes";
import { Ventana } from "../Ventana";
import { IconoLista, IconoReloj } from "../contenidos/piezas";
import { simulacion } from "../../../servicios/simulacion";
import { estadisticas, porcentaje, type Periodo, type SeccionEstadistica } from "./datos";
import { ErrorCarga, Pantalla, Pestanas, Resumen } from "./comun";
import { descargarCsv } from "./utiles";
import modalInfo from "../../../assets/admin/modal-info.svg";

const SECCIONES: { valor: SeccionEstadistica; texto: string }[] = [{ valor: "portal", texto: "Portal" }, { valor: "actividades", texto: "Actividades" }, { valor: "contenidos", texto: "Contenidos" }];
const PERIODOS: { valor: Periodo; texto: string }[] = [{ valor: "30dias", texto: "Últimos 30 días" }, { valor: "mes", texto: "Este mes" }, { valor: "anio", texto: "Este año" }];

export default function Estadisticas() {
    const [seccion, setSeccion] = useState<SeccionEstadistica>("portal");
    const [periodo, setPeriodo] = useState<Periodo>("30dias");
    const [exportando, setExportando] = useState(false);
    const [exportado, setExportado] = useState("");
    const [errorExportar, setErrorExportar] = useState(false);
    const modo = simulacion(); // ?simular=error | sin-datos | error-exportar
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
            <EncabezadoPagina etiqueta="Administración · Estadísticas" titulo="Estadísticas" texto="Cómo se usa el portal y las actividades. Sin datos personales. Datos de ejemplo."
                accion={<button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => setExportando(true)}>Exportar</button>} />

            <div className="ad-barra">
                <Pestanas etiqueta="Sección" valor={seccion} alCambiar={setSeccion} opciones={SECCIONES} />
                <Pestanas etiqueta="Periodo" valor={periodo} alCambiar={setPeriodo} opciones={PERIODOS} />
            </div>

            {exportado && <AvisoResultado tono="exito" titulo="Exportación lista" texto={`Se descargó ${exportado}.`} chip="Listo" />}
            {errorExportar && <AvisoResultado tono="error" titulo="No se pudo exportar" texto="Inténtalo de nuevo en unos minutos." chip="Error" />}

            {modo === "error" ? (
                <ErrorCarga titulo="No se pudieron cargar las estadísticas" texto="Revisa tu conexión e inténtalo de nuevo." />
            ) : modo === "sin-datos" ? (
                <div className="contenidos-vacio"><span><span className="contenidos-vacio__icono"><IconoLista /></span><strong>Sin datos para este periodo</strong><span>Prueba con otro periodo.</span></span></div>
            ) : (
                <>
                    <Resumen titulo={`${nombreSeccion} · ${nombrePeriodo}`} tarjetas={datos.indicadores.map((i, n) => ({
                        tono: (["azul", "gris", "azul", "guinda"] as const)[n], icono: n % 2 ? <IconoReloj /> : <IconoLista />, cifra: i.valor, titulo: i.titulo, texto: i.detalle,
                    }))} />

                    <section className="contenidos-panel" aria-labelledby="ad-serie-titulo">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoLista /></span>
                            <div className="at-cabecera__textos"><h2 id="ad-serie-titulo">{datos.tituloSerie}</h2><p>Últimas 5 semanas (ejemplo). Pasa el cursor o el foco por una barra para ver su valor.</p></div>
                        </div>
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
                    </section>

                    <section className="contenidos-lista" aria-labelledby="ad-tabla-titulo">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoLista /></span>
                            <div><h2 id="ad-tabla-titulo">{datos.tituloTabla}</h2></div>
                        </div>
                        <div className="contenidos-tabla ad-tabla-paginas" role="table" aria-label={datos.tituloTabla}>
                            <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                                <span role="columnheader">Nombre</span><span role="columnheader">Total</span><span role="columnheader">% del total</span>
                            </div>
                            {datos.tabla.map((f) => (
                                <div key={f.nombre} className="contenidos-tabla__fila" role="row">
                                    <span role="cell" className="contenidos-tabla__folio">{f.nombre}</span>
                                    <span role="cell" className="contenidos-tabla__titulo">{f.valor.toLocaleString("es-MX")}</span>
                                    <span role="cell">{porcentaje(f.valor, totalTabla)}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}

            {exportando && (
                <Ventana tono="verde" icono={modalInfo} angosta titulo="Exportar estadísticas" texto={`Se descargará un archivo CSV con ${nombreSeccion.toLowerCase()} de ${nombrePeriodo}. No incluye datos personales.`}
                    textoConfirmar="Descargar CSV" alConfirmar={exportar} alCerrar={() => setExportando(false)} />
            )}
        </Pantalla>
    );
}
