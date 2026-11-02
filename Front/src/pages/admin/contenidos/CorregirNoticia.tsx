import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Campo, IconoAviso, IconoFlechaIzq, IconoLapiz, IconoReloj } from "./piezas";
import ConfirmarEnvio from "./ConfirmarEnvio";
import "./Contenidos.css";

// Corregir una noticia que el Administrador regresó con observaciones.
// Se llega desde "Corregir →" en Mis contenidos. Por ahora solo es el diseño:
// el texto y las observaciones se cargarán del backend con el folio.

type Observacion = { id: string; texto: string };

function CorregirNoticia() {
    const { folio } = useParams();
    const navegar = useNavigate();

    // TODO: traer del backend la noticia y las observaciones de este folio
    const observaciones: Observacion[] = [];
    const fechaObservaciones: string | null = null;

    const [titulo, setTitulo] = useState("");
    const [resumen, setResumen] = useState("");
    const [texto, setTexto] = useState("");
    const [textoAlternativo, setTextoAlternativo] = useState("");
    const [faltaAlternativo, setFaltaAlternativo] = useState(false);
    const [confirmando, setConfirmando] = useState(false);

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
                        <p>{fechaObservaciones ? `Dejadas el ${fechaObservaciones}` : "Fecha por cargar"}</p>
                    </div>
                </div>
                {observaciones.length ? (
                    <ol className="contenidos-observaciones__lista">
                        {observaciones.map((o, i) => (
                            <li key={o.id}>
                                <span className="contenidos-observaciones__numero">{i + 1}</span>
                                {o.texto}
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="contenidos-observaciones__vacio">Aquí aparecerán las observaciones cuando se carguen de la base.</p>
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
                        </p>
                        <button type="submit" className="contenidos-boton contenidos-boton--principal contenidos-boton--ancho">Enviar de nuevo a autorización</button>
                        {/* TODO: guardar los cambios como borrador */}
                        <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--ancho">Guardar borrador</button>
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
                // TODO: guardar en el backend como por_autorizar (con la nota) antes de navegar
                alConfirmar={() => navegar("/admin/contenidos/editor/enviado", { state: { tipo: "Noticia", queSeEnvia: "la noticia", titulo, folio, enviadoEn: new Date().toISOString() } })}
            />
        </PanelLayout>
    );
}

export default CorregirNoticia;
