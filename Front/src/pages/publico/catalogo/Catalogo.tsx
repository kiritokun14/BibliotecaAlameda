import { Link } from "react-router";
import type { CSSProperties } from "react";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { urlCatalogo } from "../../../servicios/catalogo";
import { PreguntasFrecuentes, TarjetaDatos, type DatoFila, type PreguntaFrecuente } from "../contacto/piezas";
import { TarjetaPerfil } from "../perfil/piezas";
import { RutaCredencial, type PasoRuta } from "../credencial/piezas";
import "../contacto/Contacto.css";
import "../perfil/Perfil.css";
import "../credencial/CredencialSesion.css";
import iconoLibro from "../../../assets/asistente/tema-libro.svg";
import iconoExterno from "../../../assets/catalogo/icono-externo.svg";
import iconoCandado from "../../../assets/comun/iconos/candado.svg";
import iconoCredencial from "../../../assets/comun/iconos/accesos-credencial.svg";
import iconoReloj from "../../../assets/contacto/dato-reloj.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import fotoAcervo from "../../../assets/catalogo/foto-acervo.webp";

// HU-04: el portal solo enlaza a Koha. No busca libros, no maneja préstamos y no comparte la sesión del portal con el
// catálogo. Rehecha el 21 nov 2026 (Aldahir) con la plantilla C, como Credencial: franja compacta con ícono → fila de datos
// → dos columnas: el catálogo (foto, qué se puede buscar y el botón) y «Cómo encontrar un libro» | preguntas + tarjeta verde.
const datosFila: DatoFila[] = [
    { id: "pestana", titulo: "Sitio externo", valor: "Se abre en una pestaña nueva", icono: iconoExterno },
    { id: "cuenta", titulo: "Tu cuenta", valor: "No se comparte con el catálogo", icono: iconoCandado },
    { id: "prestamo", titulo: "Préstamo", valor: "Con tu credencial vigente", icono: iconoCredencial },
    { id: "horario", titulo: "Consulta en sala", valor: "Lunes a viernes, 8:00 a 19:30 h", icono: iconoReloj },
];

const busquedas = ["Título", "Autor", "Tema", "ISBN", "Colección"];

const pasosLibro: PasoRuta[] = [
    { quien: "Tú", titulo: "Búscalo", texto: "Por título, autor o tema en el catálogo." },
    { quien: "Tú", titulo: "Anota su clasificación", texto: "Es el código que dice dónde está en el estante." },
    { quien: "Tú", titulo: "Ve a la sala", texto: "Búscalo en el estante o pide ayuda en Préstamos." },
    { quien: "Biblioteca", titulo: "Léelo o llévatelo", texto: "Consúltalo en sala o pídelo prestado con tu credencial." },
];

// TODO backend: estas respuestas las confirma la biblioteca (préstamo, apartados y donaciones).
const preguntas: PreguntaFrecuente[] = [
    { pregunta: "¿Necesito cuenta para buscar?", respuesta: "No. El catálogo es público; la cuenta del portal solo sirve para tus trámites.", enlace: { texto: "Crear una cuenta", ruta: "/crear-cuenta" } },
    { pregunta: "¿Cómo me llevo un libro a casa?", respuesta: "Con tu credencial vigente, en el área de Préstamos. Si aún no la tienes, la solicitas en línea.", enlace: { texto: "Ver el trámite de credencial", ruta: "/credencial" } },
    { pregunta: "¿Qué significa que esté disponible?", respuesta: "Que el ejemplar está en su estante. Si dice prestado, regresa en la fecha que indica el catálogo.", enlace: { texto: "Preguntar a la biblioteca", ruta: "/contacto" } },
    { pregunta: "¿Puedo proponer un libro para el acervo?", respuesta: "Sí. Escríbenos con el título y el autor; el personal revisa cada sugerencia.", enlace: { texto: "Enviar una sugerencia", ruta: "/contacto" } },
];

function Catalogo() {
    const url = urlCatalogo();
    return (
        <PaginaPublica>
            <EncabezadoPublico
                icono={iconoLibro}
                etiqueta="Catálogo"
                titulo={<>Explora el <span>catálogo</span> de la biblioteca</>}
                texto="Busca libros por título, autor o tema y encuéntralos en la sala."
            />
            <section className="contacto-seccion contacto-seccion--crema cred-pagina cat-pagina">
                <div className="contacto-pila">
                    <TarjetaDatos datos={datosFila} titulo="Datos del catálogo" />
                    <div className="contacto-columnas contacto-columnas--nuevo">
                        <div className="cred-principal">
                            {url ? <CatalogoDisponible url={url} /> : <CatalogoNoDisponible />}
                            <TarjetaPerfil color="blanca" icono={tarjetaLista} titulo="Cómo encontrar un libro"
                                texto="Cuatro pasos: lo buscas en línea y lo encuentras en la biblioteca.">
                                <RutaCredencial pasos={pasosLibro} />
                            </TarjetaPerfil>
                        </div>
                        <div className="contacto-lateral">
                            <PreguntasFrecuentes preguntas={preguntas} />
                            <section className="contacto-seguimiento" aria-labelledby="titulo-ayuda-catalogo">
                                <span className="contacto-seguimiento__insignia" aria-hidden="true" />
                                <h2 id="titulo-ayuda-catalogo">¿No encuentras un libro?</h2>
                                <p>Escríbenos con el título o el tema y el personal te dice si lo tenemos y dónde está.</p>
                                <Link to="/contacto" className="perfil-boton perfil-boton--guardar">Escríbenos</Link>
                            </section>
                        </div>
                    </div>
                </div>
            </section>
        </PaginaPublica>
    );
}

// El catálogo: foto real del acervo | qué se puede buscar y el botón que abre Koha en otra pestaña
function CatalogoDisponible({ url }: { url: string }) {
    return (
        <section className="cat-tarjeta" aria-labelledby="titulo-catalogo">
            <figure className="cat-tarjeta__foto"><img src={fotoAcervo} alt="Estantes del acervo de la biblioteca" decoding="async" /></figure>
            <div className="cat-tarjeta__textos">
                <h2 id="titulo-catalogo">Consulta el catálogo en línea</h2>
                <p>Revisa qué libros tiene la biblioteca, en qué colección están y si hay ejemplares disponibles.</p>
                <p className="cat-tarjeta__subtitulo">Puedes buscar por</p>
                <ul className="cat-tarjeta__chips">{busquedas.map((b) => <li key={b}>{b}</li>)}</ul>
                {/* Pestaña nueva: si Koha falla, el portal sigue abierto en la suya (CA-04.2).
                    noopener/noreferrer: Koha no controla esta pestaña ni recibe de dónde viene la visita. */}
                <a href={url} target="_blank" rel="noopener noreferrer" className="perfil-boton cat-tarjeta__boton">
                    Abrir el catálogo
                    <span className="solo-lectores"> (sitio externo, se abre en una pestaña nueva)</span>
                </a>
            </div>
        </section>
    );
}

// Sin dirección de Koha configurada: el vacío importante en guinda; el resto del portal sigue funcionando.
function CatalogoNoDisponible() {
    return (
        <div className="perfil-vacio perfil-vacio--eventos perfil-vacio--error cat-vacio" role="status"
            style={{ "--icono-seccion": `url("${iconoLibro}")` } as CSSProperties}>
            <span className="perfil-vacio__insignia" aria-hidden="true" />
            <h2>El catálogo no está disponible por ahora</h2>
            <p>Puedes intentarlo en unos minutos, preguntar al personal o consultar los libros directamente en la sala.</p>
            <div className="perfil-acciones perfil-acciones--centro">
                <button type="button" className="perfil-boton" onClick={() => window.location.reload()}>Reintentar</button>
                <Link to="/contacto" className="perfil-boton perfil-boton--contorno">Contactar a la biblioteca</Link>
            </div>
        </div>
    );
}

export default Catalogo;
