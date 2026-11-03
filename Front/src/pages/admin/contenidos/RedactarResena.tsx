import { useState } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import { Campo, IconoBandera, IconoDocumento, IconoFlechaIzq, IconoLapiz, Interruptor, Migas, PanelEstado, SubirImagen } from "./piezas";
import ConfirmarEnvio from "./ConfirmarEnvio";
import { datoSiNo, datoTexto, useBorrador } from "./usarBorrador";
import type { Contenido } from "../../../servicios/contenidos";
import "./Contenidos.css";

// Formulario para redactar una reseña bibliográfica nueva o seguir un borrador (inicial).
// El título del libro es el título del contenido.
// La portada se guarda de forma privada junto al borrador.

const MAX_RESUMEN = 160;
// TODO: confirmar con la biblioteca los géneros, las vistas y los temas de Lecturas y reseñas
const GENEROS = ["Cuento", "Novela", "Poesía", "Ensayo", "Historia", "Otro"];
const VISTAS = ["Por autor", "Por tema"];
const TEMAS: string[] = [];
// TODO: el área que firma la reseña la confirma la biblioteca
const FIRMA = "Equipo de la biblioteca · Área por confirmar";

function RedactarResena({ inicial }: { inicial?: Contenido }) {
    const [confirmando, setConfirmando] = useState(false);
    const borrador = useBorrador("resena", inicial);
    const dato = (clave: string) => datoTexto(inicial?.datos, clave);
    const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
    const [autoria, setAutoria] = useState(dato("autoria"));
    const [genero, setGenero] = useState(dato("genero"));
    const [anio, setAnio] = useState(dato("anio"));
    const [clasificacion, setClasificacion] = useState(dato("clasificacion"));
    const [resumen, setResumen] = useState(inicial?.resumen ?? "");
    const [texto, setTexto] = useState(inicial?.cuerpo ?? "");
    const [portada, setPortada] = useState<File | null | undefined>(undefined);
    const [vista, setVista] = useState(dato("vista"));
    const [tema, setTema] = useState(dato("tema"));
    const [memoria, setMemoria] = useState(datoSiNo(inicial?.datos, "memoriaPublica", false));

    const cambios = () => ({
        titulo,
        resumen,
        cuerpo: texto,
        datos: { autoria, genero, anio, clasificacion, vista, tema, memoriaPublica: memoria },
    });
    const enviar = (nota: string) => {
        setConfirmando(false);
        borrador.enviar(cambios(), nota, { tipo: "Reseña bibliográfica", queSeEnvia: "la reseña", titulo }, portada);
    };

    return (
        <PanelLayout titulo="Contenidos" tema="solon">
            <Migas actual="Borrador" />

            <div className="contenidos-encabezado contenidos-encabezado--tarjeta">
                <div>
                    <Link to="/admin/contenidos/editor" className="contenidos-volver">
                        <span className="contenidos-volver__circulo"><IconoFlechaIzq /></span>
                        Volver a Mis contenidos
                    </Link>
                    {/* El folio (CN-0000) lo asigna la base al guardar el primer borrador */}
                    <p className="contenidos-etiqueta">Contenidos · Editor · {borrador.folio ? `Reseña ${borrador.folio}` : "Reseña nueva"}</p>
                    <h1>Redactar reseña bibliográfica</h1>
                    <p className="contenidos-encabezado__texto">La reseña la firma el equipo de la biblioteca. Los campos con * son obligatorios.</p>
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
                    <section className="contenidos-panel" aria-labelledby="resena-libro">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoDocumento /></span>
                            <h2 id="resena-libro">Datos del libro</h2>
                        </div>

                        <div className="contenidos-rejilla contenidos-rejilla--2">
                            <Campo id="resena-titulo" etiqueta="Título del libro" obligatorio>
                                <input id="resena-titulo" type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                            </Campo>
                            <Campo id="resena-autoria" etiqueta="Autoría" obligatorio>
                                <input id="resena-autoria" type="text" required placeholder="Autora o autor" value={autoria} onChange={(e) => setAutoria(e.target.value)} />
                            </Campo>
                        </div>

                        <div className="contenidos-rejilla contenidos-rejilla--3">
                            <Campo id="resena-genero" etiqueta="Género">
                                <select id="resena-genero" value={genero} onChange={(e) => setGenero(e.target.value)}>
                                    <option value="">Elige un género</option>
                                    {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </Campo>
                            <Campo id="resena-anio" etiqueta="Año de edición">
                                <input id="resena-anio" type="text" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" value={anio} onChange={(e) => setAnio(e.target.value.replace(/\D/g, ""))} />
                            </Campo>
                            <Campo id="resena-clasificacion" etiqueta="Clasificación en acervo">
                                <input id="resena-clasificacion" type="text" placeholder="Por confirmar" value={clasificacion} onChange={(e) => setClasificacion(e.target.value)} />
                            </Campo>
                        </div>
                    </section>

                    <section className="contenidos-panel" aria-labelledby="resena-texto-titulo">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoLapiz /></span>
                            <div>
                                <h2 id="resena-texto-titulo">Texto de la reseña</h2>
                                <p>Lo escribe el equipo; no es una opinión de personas usuarias.</p>
                            </div>
                        </div>

                        <Campo id="resena-resumen" etiqueta="Resumen para el listado" obligatorio ayuda={`Máximo ${MAX_RESUMEN} caracteres · ${resumen.length}/${MAX_RESUMEN}`}>
                            <textarea id="resena-resumen" rows={2} required maxLength={MAX_RESUMEN} value={resumen} onChange={(e) => setResumen(e.target.value)} aria-describedby="resena-resumen-ayuda" />
                        </Campo>

                        <Campo id="resena-texto" etiqueta="Reseña completa" obligatorio>
                            <textarea id="resena-texto" rows={8} required placeholder="Escribe aquí la reseña…" value={texto} onChange={(e) => setTexto(e.target.value)} />
                        </Campo>

                        <Campo id="resena-portada" etiqueta="Portada del libro">
                            <SubirImagen id="resena-portada" archivo={portada} folio={borrador.folio} tieneImagen={borrador.tieneImagen} version={borrador.guardadoEn} detalle="JPG o PNG · proporción vertical recomendada" alCambiar={setPortada} />
                        </Campo>
                    </section>
                </div>

                <aside className="contenidos-formulario__lateral">
                    <section className="contenidos-panel" aria-labelledby="resena-publicacion">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoBandera /></span>
                            <h2 id="resena-publicacion">Datos de publicación</h2>
                        </div>

                        <Campo id="resena-vista" etiqueta="Vista donde aparece" obligatorio>
                            <select id="resena-vista" required value={vista} onChange={(e) => setVista(e.target.value)}>
                                <option value="" disabled>Elige una vista</option>
                                {VISTAS.map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </Campo>

                        <Campo id="resena-tema" etiqueta="Tema">
                            <select id="resena-tema" value={tema} onChange={(e) => setTema(e.target.value)}>
                                <option value="">{TEMAS.length ? "Elige un tema" : "Temas por confirmar"}</option>
                                {TEMAS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Campo>

                        <Interruptor id="resena-memoria" titulo="Incluir en Memoria pública" texto="Solo si el libro es de memoria regional." activo={memoria} alCambiar={setMemoria} />

                        <div className="contenidos-campo">
                            <p className="contenidos-campo__etiqueta">Reseña firmada por</p>
                            <p className="contenidos-campo__fijo">{FIRMA}</p>
                        </div>
                    </section>

                    <PanelEstado
                        id="resena-estado"
                        detalle={borrador.detalle}
                        ocupado={borrador.ocupado}
                        error={borrador.error}
                        alGuardar={() => borrador.guardarBorrador(cambios(), portada)}
                    />
                </aside>
            </form>
            <ConfirmarEnvio
                abierto={confirmando}
                tipo="Reseña bibliográfica"
                queSeEnvia="la reseña"
                titulo={titulo}
                alCerrar={() => setConfirmando(false)}
                folio={borrador.folio ?? undefined}
                alConfirmar={enviar}
            />
        </PanelLayout>
    );
}

export default RedactarResena;
