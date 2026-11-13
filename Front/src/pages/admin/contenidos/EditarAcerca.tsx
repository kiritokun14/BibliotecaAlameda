import { useState } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import { Campo, IconoBandera, IconoBuscar, IconoFlechaIzq, IconoLapiz, IconoLista, Interruptor, Migas, PanelEstado } from "./piezas";
import { SECCIONES_ACERCA, type SeccionAcerca } from "./tipos";
import ConfirmarEnvio from "./ConfirmarEnvio";
import { datoTexto, useBorrador } from "./usarBorrador";
import type { Contenido } from "../../../servicios/contenidos";
import "./Contenidos.css";

// Edición de «Acerca de la biblioteca». Cada sección es un contenido aparte y se
// autoriza por separado. Con "inicial" se abre el borrador de una sola sección.
// TODO: cargar el texto publicado de cada sección y guardar el enlace en Inicio.

type DatosSeccion = { titulo: string; texto: string; lineaTiempo: string };

const VACIA: DatosSeccion = { titulo: "", texto: "", lineaTiempo: "" };

function seccionDe(contenido?: Contenido): SeccionAcerca {
    const valor = datoTexto(contenido?.datos, "seccion");
    return SECCIONES_ACERCA.find((s) => s.valor === valor)?.valor ?? "historia";
}

function EditarAcerca({ inicial }: { inicial?: Contenido }) {
    const [confirmando, setConfirmando] = useState(false);
    const [seccion, setSeccion] = useState<SeccionAcerca>(seccionDe(inicial));
    const [datos, setDatos] = useState<Record<SeccionAcerca, DatosSeccion>>(() => {
        const vacias = { historia: VACIA, mision: VACIA, solon: VACIA, rol: VACIA };
        if (!inicial) return vacias;
        return {
            ...vacias,
            [seccionDe(inicial)]: { titulo: inicial.titulo, texto: inicial.cuerpo, lineaTiempo: datoTexto(inicial.datos, "lineaTiempo") },
        };
    });
    // Cada sección lleva su propio folio
    const borrador = useBorrador("acerca", inicial, seccion);
    const [busqueda, setBusqueda] = useState("");
    const [enlaceInicio, setEnlaceInicio] = useState(true);

    const actual = SECCIONES_ACERCA.find((s) => s.valor === seccion)!;
    const valores = datos[seccion];
    const cambiar = (campo: keyof DatosSeccion, valor: string) =>
        setDatos((anterior) => ({ ...anterior, [seccion]: { ...anterior[seccion], [campo]: valor } }));

    const cambios = () => ({
        titulo: valores.titulo,
        cuerpo: valores.texto,
        datos: actual.lineaTiempo ? { seccion, lineaTiempo: valores.lineaTiempo } : { seccion },
    });
    const enviar = (nota: string) => {
        setConfirmando(false);
        borrador.enviar(cambios(), nota, { tipo: `Acerca de · ${actual.nombre}`, queSeEnvia: "la sección", titulo: valores.titulo || actual.titulo });
    };

    const termino = busqueda.trim().toLowerCase();
    const coincidencias = termino ? valores.texto.toLowerCase().split(termino).length - 1 : 0;

    return (
        <PanelLayout titulo="Contenidos" tema="contenidos">
            <Migas actual="Borrador" />

            <div className="contenidos-encabezado contenidos-encabezado--tarjeta">
                <div>
                    <Link to="/admin/contenidos/editor" className="contenidos-volver">
                        <span className="contenidos-volver__circulo"><IconoFlechaIzq /></span>
                        Volver a Mis contenidos
                    </Link>
                    <p className="contenidos-etiqueta">Contenidos · Editor · Acerca de{borrador.folio ? ` · ${borrador.folio}` : ""}</p>
                    <h1>Editar «Acerca de la biblioteca»</h1>
                    <p className="contenidos-encabezado__texto">Elige la sección que vas a modificar. Cada sección se autoriza por separado.</p>
                </div>
            </div>

            <form
                className="contenidos-formulario"
                onSubmit={(e) => {
                    // El navegador revisa primero los campos obligatorios
                    e.preventDefault();
                    setConfirmando(true);
                }}
            >
                <div className="contenidos-formulario__lateral">
                    <section className="contenidos-panel" aria-labelledby="acerca-secciones">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoLista /></span>
                            <h2 id="acerca-secciones">Sección</h2>
                        </div>
                        <div className="contenidos-lista__herramientas">
                            <div className="contenidos-filtros" role="tablist" aria-label="Secciones de Acerca de">
                                {SECCIONES_ACERCA.map((s) => (
                                    <button
                                        key={s.valor}
                                        type="button"
                                        role="tab"
                                        aria-selected={seccion === s.valor}
                                        className={`contenidos-filtro${seccion === s.valor ? " contenidos-filtro--activo" : ""}`}
                                        // Al abrir un borrador solo se edita su sección
                                        disabled={Boolean(inicial) && s.valor !== seccion}
                                        onClick={() => setSeccion(s.valor)}
                                    >
                                        {s.nombre}
                                    </button>
                                ))}
                            </div>
                            <label className="contenidos-buscar">
                                <IconoBuscar />
                                <input type="search" placeholder="Buscar en el texto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar en el texto de la sección" />
                                {termino && <span className="contenidos-buscar__conteo">{coincidencias}</span>}
                            </label>
                        </div>
                    </section>

                    <section className="contenidos-panel" aria-labelledby="acerca-seccion-titulo" role="tabpanel">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoLapiz /></span>
                            <h2 id="acerca-seccion-titulo">{actual.titulo}</h2>
                        </div>

                        <Campo id="acerca-titulo" etiqueta="Título de la sección" obligatorio>
                            <input id="acerca-titulo" type="text" required placeholder={actual.titulo} value={valores.titulo} onChange={(e) => cambiar("titulo", e.target.value)} />
                        </Campo>

                        <Campo id="acerca-texto" etiqueta="Texto" obligatorio>
                            <textarea id="acerca-texto" rows={9} required placeholder="Escribe aquí el texto de la sección…" value={valores.texto} onChange={(e) => cambiar("texto", e.target.value)} />
                        </Campo>

                        {actual.lineaTiempo && (
                            <Campo id="acerca-linea" etiqueta="Datos que se muestran en la línea del tiempo" ayuda="Si no están confirmados, se muestran como «por confirmar».">
                                <input id="acerca-linea" type="text" placeholder="Año de fundación · por confirmar" value={valores.lineaTiempo} onChange={(e) => cambiar("lineaTiempo", e.target.value)} aria-describedby="acerca-linea-ayuda" />
                            </Campo>
                        )}
                    </section>
                </div>

                <aside className="contenidos-formulario__lateral">
                    <section className="contenidos-panel" aria-labelledby="acerca-publicacion">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoBandera /></span>
                            <h2 id="acerca-publicacion">Publicación</h2>
                        </div>
                        <Interruptor id="acerca-enlace" titulo="Mostrar enlace «Acerca de» en Inicio" activo={enlaceInicio} alCambiar={setEnlaceInicio} />
                        <div className="contenidos-campo">
                            <p className="contenidos-campo__etiqueta">Última versión publicada</p>
                            {/* TODO: fecha real de la última versión autorizada */}
                            <p className="contenidos-campo__fijo">Sin publicar</p>
                        </div>
                    </section>

                    <PanelEstado
                        id="acerca-estado"
                        detalle={borrador.folio ? borrador.detalle : "Cambios sin enviar"}
                        ocupado={borrador.ocupado}
                        error={borrador.error}
                        alGuardar={() => borrador.guardarBorrador(cambios())}
                    />
                </aside>
            </form>
            <ConfirmarEnvio
                abierto={confirmando}
                tipo={`Acerca de · ${actual.nombre}`}
                queSeEnvia="la sección"
                titulo={valores.titulo || actual.titulo}
                alCerrar={() => setConfirmando(false)}
                folio={borrador.folio ?? undefined}
                alConfirmar={enviar}
            />
        </PanelLayout>
    );
}

export default EditarAcerca;
