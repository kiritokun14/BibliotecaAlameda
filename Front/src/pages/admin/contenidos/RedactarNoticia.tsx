import { useState } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import { Campo, IconoBandera, IconoFlechaIzq, IconoLapiz, Interruptor, Migas, PanelEstado, SubirImagen } from "./piezas";
import VistaPreviaNoticia from "./VistaPreviaNoticia";
import ConfirmarEnvio from "./ConfirmarEnvio";
import { datoSiNo, datoTexto, useBorrador } from "./usarBorrador";
import type { Contenido } from "../../../servicios/contenidos";
import "./Contenidos.css";

// Formulario para redactar una noticia nueva o seguir un borrador (inicial).
// La imagen se guarda de forma privada junto al borrador.

const MAX_TITULO = 90;
const MAX_RESUMEN = 160;
// TODO: confirmar con la biblioteca las categorías de noticias
const CATEGORIAS = ["Avisos", "Convocatorias", "Novedades"];

function RedactarNoticia({ inicial }: { inicial?: Contenido }) {
    const [confirmando, setConfirmando] = useState(false);
    const borrador = useBorrador("noticia", inicial);
    const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
    const [resumen, setResumen] = useState(inicial?.resumen ?? "");
    const [texto, setTexto] = useState(inicial?.cuerpo ?? "");
    const [imagen, setImagen] = useState<File | null | undefined>(undefined);
    const [textoAlternativo, setTextoAlternativo] = useState(datoTexto(inicial?.datos, "textoAlternativo"));
    const [categoria, setCategoria] = useState(datoTexto(inicial?.datos, "categoria"));
    const [fecha, setFecha] = useState(datoTexto(inicial?.datos, "fecha"));
    const [destacar, setDestacar] = useState(datoSiNo(inicial?.datos, "destacar", false));
    const [verMas, setVerMas] = useState(datoSiNo(inicial?.datos, "verMas", true));

    const cambios = () => ({
        titulo,
        resumen,
        cuerpo: texto,
        datos: { categoria, fecha, destacar, verMas, textoAlternativo },
    });
    const enviar = (nota: string) => {
        setConfirmando(false);
        borrador.enviar(cambios(), nota, { tipo: "Noticia", queSeEnvia: "la noticia", titulo }, imagen);
    };
    // La vista previa se muestra en esta misma pantalla para no perder lo escrito
    const [vistaPrevia, setVistaPrevia] = useState(false);

    const cambiarVista = (mostrar: boolean) => {
        setVistaPrevia(mostrar);
        window.scrollTo({ top: 0 });
    };

    if (vistaPrevia) {
        return (
            <PanelLayout titulo="Contenidos" tema="solon">
                <VistaPreviaNoticia
                    noticia={{ titulo, texto, imagen: imagen ?? null, textoAlternativo, categoria, fecha }} folio={borrador.folio} tieneImagen={imagen === undefined && borrador.tieneImagen} version={borrador.guardadoEn}
                    alVolver={() => cambiarVista(false)}
                    alEnviar={() => setConfirmando(true)}
                />
                {borrador.error && <p className="contenidos-error" role="alert">{borrador.error}</p>}
                <ConfirmarEnvio
                    abierto={confirmando}
                    tipo="Noticia"
                    queSeEnvia="la noticia"
                    titulo={titulo}
                    alCerrar={() => setConfirmando(false)}
                    folio={borrador.folio ?? undefined}
                    alConfirmar={enviar}
                />
            </PanelLayout>
        );
    }

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
                    <p className="contenidos-etiqueta">Contenidos · Editor · {borrador.folio ? `Noticia ${borrador.folio}` : "Noticia nueva"}</p>
                    <h1>Redactar noticia</h1>
                    <p className="contenidos-encabezado__texto">Los campos con * son obligatorios. Se guarda como borrador.</p>
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
                <section className="contenidos-panel contenidos-formulario__principal" aria-labelledby="noticia-contenido">
                    <div className="contenidos-lista__cabecera">
                        <span className="contenidos-lista__icono"><IconoLapiz /></span>
                        <div>
                            <h2 id="noticia-contenido">Contenido de la noticia</h2>
                            <p>Lo que leerá la persona en el portal.</p>
                        </div>
                    </div>

                    <Campo id="noticia-titulo" etiqueta="Título" obligatorio ayuda={`Máximo ${MAX_TITULO} caracteres · ${titulo.length}/${MAX_TITULO}`}>
                        <input id="noticia-titulo" type="text" required maxLength={MAX_TITULO} value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-describedby="noticia-titulo-ayuda" />
                    </Campo>

                    <Campo id="noticia-resumen" etiqueta="Resumen" obligatorio ayuda={`Se muestra en el listado y en Inicio. Máximo ${MAX_RESUMEN} caracteres · ${resumen.length}/${MAX_RESUMEN}`}>
                        <textarea id="noticia-resumen" rows={2} required maxLength={MAX_RESUMEN} value={resumen} onChange={(e) => setResumen(e.target.value)} aria-describedby="noticia-resumen-ayuda" />
                    </Campo>

                    <Campo id="noticia-texto" etiqueta="Texto completo" obligatorio>
                        <textarea id="noticia-texto" rows={8} required placeholder="Escribe aquí la noticia…" value={texto} onChange={(e) => setTexto(e.target.value)} />
                    </Campo>

                    <Campo id="noticia-imagen" etiqueta="Imagen principal">
                        <SubirImagen id="noticia-imagen" archivo={imagen} folio={borrador.folio} tieneImagen={borrador.tieneImagen} version={borrador.guardadoEn} detalle="JPG o PNG · máximo 5 MB" alCambiar={setImagen} />
                    </Campo>

                    <Campo id="noticia-alt" etiqueta="Texto alternativo de la imagen" ayuda="Describe la imagen para personas que usan lector de pantalla.">
                        <input id="noticia-alt" type="text" value={textoAlternativo} onChange={(e) => setTextoAlternativo(e.target.value)} aria-describedby="noticia-alt-ayuda" />
                    </Campo>
                </section>

                <aside className="contenidos-formulario__lateral">
                    <section className="contenidos-panel" aria-labelledby="noticia-publicacion">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoBandera /></span>
                            <h2 id="noticia-publicacion">Datos de publicación</h2>
                        </div>

                        <Campo id="noticia-categoria" etiqueta="Categoría" obligatorio>
                            <select id="noticia-categoria" required value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                                <option value="" disabled>Elige una categoría</option>
                                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Campo>

                        <Campo id="noticia-fecha" etiqueta="Fecha de la noticia" obligatorio>
                            <input id="noticia-fecha" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
                        </Campo>

                        <Interruptor id="noticia-destacar" titulo="Destacar en Inicio" texto="Aparece en el bloque de Noticias." activo={destacar} alCambiar={setDestacar} />
                        <Interruptor id="noticia-ver-mas" titulo="Mostrar en «Ver más noticias»" activo={verMas} alCambiar={setVerMas} />
                    </section>

                    <PanelEstado
                        id="noticia-estado"
                        detalle={borrador.detalle}
                        ocupado={borrador.ocupado}
                        error={borrador.error}
                        alVistaPrevia={() => cambiarVista(true)}
                        alGuardar={() => borrador.guardarBorrador(cambios(), imagen)}
                    />
                </aside>
            </form>
            <ConfirmarEnvio
                abierto={confirmando}
                tipo="Noticia"
                queSeEnvia="la noticia"
                titulo={titulo}
                alCerrar={() => setConfirmando(false)}
                folio={borrador.folio ?? undefined}
                alConfirmar={enviar}
            />
        </PanelLayout>
    );
}

export default RedactarNoticia;
