import { useState } from "react";
import { Link, Navigate } from "react-router";
import PanelLayout from "../PanelLayout";
import { Campo, IconoAviso, IconoFlechaIzq, IconoLapiz, IconoReloj, SubirImagen } from "./piezas";
import ConfirmarEnvio from "./ConfirmarEnvio";
import CargarContenido from "./CargarContenido";
import { datoTexto, useBorrador } from "./usarBorrador";
import type { Contenido } from "../../../servicios/contenidos";
import RedactarResena from "./RedactarResena";
import RedactarMemoria from "./RedactarMemoria";
import EditarAcerca from "./EditarAcerca";
import "./Contenidos.css";

// Corregir una noticia que el Administrador regresó con observaciones.
// Se llega desde "Corregir →" en Mis contenidos; la noticia y las observaciones
// se cargan de la base con el folio de la ruta.

const formatoFecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" });

function Correccion({ contenido }: { contenido: Contenido }) {
    const folio = contenido.folio;
    const borrador = useBorrador("noticia", contenido);
    const observaciones = contenido.observaciones?.lista ?? [];
    const fechaObservaciones = contenido.observaciones ? formatoFecha.format(new Date(contenido.observaciones.realizadoEn)) : null;

    const [imagen, setImagen] = useState<File | null | undefined>(undefined);
    const [titulo, setTitulo] = useState(contenido.titulo);
    const [resumen, setResumen] = useState(contenido.resumen);
    const [texto, setTexto] = useState(contenido.cuerpo);
    const [textoAlternativo, setTextoAlternativo] = useState(datoTexto(contenido.datos, "textoAlternativo"));
    const [faltaAlternativo, setFaltaAlternativo] = useState(false);
    const [confirmando, setConfirmando] = useState(false);

    // Conserva los demás datos de la noticia (categoría, fecha…)
    const cambios = () => ({ titulo, resumen, cuerpo: texto, datos: { ...contenido.datos, textoAlternativo } });
    const enviar = (nota: string) => {
        setConfirmando(false);
        borrador.enviar(cambios(), nota, { tipo: "Noticia", queSeEnvia: "la noticia", titulo }, imagen);
    };

    return (
        <PanelLayout titulo="Contenidos" tema="solon">
            <nav className="contenidos-migas" aria-label="Ruta">
                <span>Contenidos</span>
                <span aria-hidden="true">›</span>
                <Link to="/admin/contenidos/editor">Editor de contenidos</Link>
                <span aria-hidden="true">›</span>
                <strong aria-current="page">Con observaciones</strong>
            </nav>

            <div className="contenidos-encabezado contenidos-encabezado--tarjeta">
                <div>
                    <Link to="/admin/contenidos/editor" className="contenidos-volver">
                        <span className="contenidos-volver__circulo"><IconoFlechaIzq /></span>
                        Volver a Mis contenidos
                    </Link>
                    <p className="contenidos-etiqueta">Contenidos · Editor · Noticia {folio}</p>
                    <h1>Corregir noticia</h1>
                    <p className="contenidos-encabezado__texto">El Administrador dejó observaciones. Corrige y vuelve a enviar.</p>
                </div>
            </div>

            <section className="contenidos-observaciones" aria-labelledby="observaciones-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-observaciones__icono"><IconoAviso /></span>
                    <div>
                        <h2 id="observaciones-titulo">Observaciones del Administrador</h2>
                        <p>{fechaObservaciones ? `Dejadas el ${fechaObservaciones}` : "Sin fecha registrada"}</p>
                    </div>
                </div>
                {observaciones.length ? (
                    <ol className="contenidos-observaciones__lista">
                        {observaciones.map((texto, i) => (
                            <li key={i}>
                                <span className="contenidos-observaciones__numero">{i + 1}</span>
                                {texto}
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="contenidos-observaciones__vacio">
                        {contenido.observaciones?.nota ?? "El Administrador no dejó observaciones por escrito."}
                    </p>
                )}
            </section>

            <form
                className="contenidos-formulario"
                onSubmit={(e) => {
                    e.preventDefault();
                    setConfirmando(true);
                }}
            >
                <section className="contenidos-panel" aria-labelledby="corregir-contenido">
                    <div className="contenidos-lista__cabecera">
                        <span className="contenidos-lista__icono"><IconoLapiz /></span>
                        <h2 id="corregir-contenido">Contenido de la noticia</h2>
                    </div>

                    <Campo id="corregir-titulo" etiqueta="Título" obligatorio>
                        <input id="corregir-titulo" type="text" required maxLength={90} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                    </Campo>

                    <Campo id="corregir-resumen" etiqueta="Resumen" obligatorio>
                        <textarea id="corregir-resumen" rows={2} required maxLength={160} value={resumen} onChange={(e) => setResumen(e.target.value)} />
                    </Campo>

                    <Campo id="corregir-texto" etiqueta="Texto completo" obligatorio>
                        <textarea id="corregir-texto" rows={7} required value={texto} onChange={(e) => setTexto(e.target.value)} />
                    </Campo>

                    <div className="contenidos-campo">
                        <SubirImagen id="corregir-imagen" archivo={imagen} alCambiar={setImagen} detalle="Imagen principal" folio={borrador.folio} tieneImagen={borrador.tieneImagen} version={borrador.guardadoEn} />
                        <label htmlFor="corregir-alt">Texto alternativo de la imagen</label>
                        <input
                            id="corregir-alt"
                            type="text"
                            required
                            placeholder="Describe la imagen"
                            className={faltaAlternativo ? "contenidos-campo--error" : undefined}
                            aria-invalid={faltaAlternativo}
                            aria-describedby={faltaAlternativo ? "corregir-alt-error" : undefined}
                            value={textoAlternativo}
                            onInvalid={() => setFaltaAlternativo(true)}
                            onChange={(e) => {
                                setTextoAlternativo(e.target.value);
                                if (e.target.value.trim()) setFaltaAlternativo(false);
                            }}
                        />
                        {faltaAlternativo && <p id="corregir-alt-error" className="contenidos-campo__error">Falta el texto alternativo.</p>}
                    </div>
                </section>

                <aside className="contenidos-formulario__lateral">
                    <section className="contenidos-panel contenidos-panel--observaciones" aria-labelledby="corregir-estado">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoReloj /></span>
                            <h2 id="corregir-estado">Estado</h2>
                        </div>
                        <p className="contenidos-estado-linea">
                            <span className="contenidos-estado contenidos-estado--con_observaciones">Con observaciones</span>
                            <span>{borrador.ocupado ? "Guardando…" : borrador.detalle}</span>
                        </p>
                        {borrador.error && <p className="contenidos-error" role="alert">{borrador.error}</p>}
                        <button type="submit" className="contenidos-boton contenidos-boton--principal contenidos-boton--ancho" disabled={borrador.ocupado}>Enviar de nuevo a autorización</button>
                        <button
                            type="button"
                            className="contenidos-boton contenidos-boton--contorno contenidos-boton--ancho"
                            disabled={borrador.ocupado}
                            onClick={() => borrador.guardarBorrador(cambios(), imagen)}
                        >
                            Guardar borrador
                        </button>
                    </section>
                </aside>
            </form>

            <ConfirmarEnvio
                abierto={confirmando}
                tipo="Noticia"
                queSeEnvia="la noticia"
                titulo={titulo}
                folio={folio}
                alCerrar={() => setConfirmando(false)}
                alConfirmar={enviar}
            />
        </PanelLayout>
    );
}

function CorregirNoticia() {
    return <CargarContenido>{(contenido) => {
        if (contenido.estado !== "con_observaciones") return <Navigate to={`/admin/contenidos/editor/${contenido.folio}/editar`} replace />;
        if (contenido.tipo === "noticia") return <Correccion key={contenido.folio} contenido={contenido} />;
        const formulario = contenido.tipo === "resena" ? <RedactarResena key={contenido.folio} inicial={contenido} />
            : contenido.tipo === "memoria" ? <RedactarMemoria key={contenido.folio} inicial={contenido} />
            : contenido.tipo === "acerca" ? <EditarAcerca key={contenido.folio} inicial={contenido} /> : null;
        return <>{contenido.observaciones && <section role="status" aria-label="Observaciones del contenido">
            <h2>Observaciones para corregir</h2>
            <ul>{contenido.observaciones.lista.map((texto, i) => <li key={i}>{texto}</li>)}</ul>
            {contenido.observaciones.nota && <p>{contenido.observaciones.nota}</p>}
        </section>}{formulario ?? <p role="alert">Este tipo de contenido todavía no tiene formulario.</p>}</>;
    }}</CargarContenido>;
}

export default CorregirNoticia;
