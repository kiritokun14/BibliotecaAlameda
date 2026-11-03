import { Link } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { urlCatalogo } from "../../../servicios/catalogo";
import "./Catalogo.css";
import flecha from "../../../assets/comun/iconos/portada-flecha.svg";
import circulo1 from "../../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/encabezado-circulo-2.svg";
import iconoExterno from "../../../assets/catalogo/icono-externo.svg";
import iconoCandado from "../../../assets/comun/iconos/candado.svg";
import iconoNube from "../../../assets/catalogo/icono-nube.svg";
import iconoReintentar from "../../../assets/catalogo/icono-reintentar.svg";
import iconoCheck from "../../../assets/comun/iconos/check-circulo-verde.svg";

const AVISOS = [
    { icono: iconoExterno, titulo: "Se abre en una pestaña nueva", texto: "El catálogo es un sitio externo al portal." },
    { icono: iconoCandado, titulo: "No comparte tu cuenta", texto: "Tus datos del portal no se envían al catálogo." },
];

const ALTERNATIVAS = ["Reintentar en unos minutos", "Consultar con el personal", "Preguntar al asistente"];

// HU-04: el portal solo enlaza a Koha. No busca libros, no maneja préstamos
// y no comparte la sesión del portal con el catálogo.
function Catalogo() {
    const url = urlCatalogo();
    return url ? <CatalogoDisponible url={url} /> : <CatalogoNoDisponible />;
}

function CatalogoDisponible({ url }: { url: string }) {
    return (
        <PaginaPublica>
            <EncabezadoPublico
                etiqueta="Catálogo"
                titulo={<>Explora el <span>catálogo Koha</span></>}
                texto="Busca libros por título, autor o tema en el catálogo de la biblioteca."
            />

            <section className="catalogo-busqueda">
                <div className="catalogo-tarjeta">
                    <img className="catalogo-tarjeta__circulo catalogo-tarjeta__circulo--1" src={circulo1} alt="" />
                    <img className="catalogo-tarjeta__circulo catalogo-tarjeta__circulo--2" src={circulo2} alt="" />
                    <p className="catalogo-tarjeta__etiqueta">
                        <span className="punto-dorado" />
                        CATÁLOGO EXTERNO
                    </p>
                    <h2>Consulta el catálogo de la biblioteca</h2>
                    <p className="catalogo-tarjeta__texto">El catálogo se abre en un sitio externo, en una pestaña nueva.</p>
                    {/* Pestaña nueva: si Koha falla, el portal sigue abierto en la suya (CA-04.2).
                        noopener/noreferrer: Koha no controla esta pestaña ni recibe de dónde viene la visita. */}
                    <a href={url} target="_blank" rel="noopener noreferrer" className="boton-dorado boton-dorado--grande">
                        Abrir catálogo (Koha)
                        <img src={flecha} alt="" />
                        <span className="solo-lectores">(sitio externo, se abre en una pestaña nueva)</span>
                    </a>
                </div>
            </section>

            <section className="catalogo-avisos" aria-label="Sobre el catálogo externo">
                {AVISOS.map((aviso) => (
                    <div key={aviso.titulo} className="catalogo-aviso">
                        <span className="catalogo-aviso__icono">
                            <img src={aviso.icono} alt="" />
                        </span>
                        <div className="catalogo-aviso__textos">
                            <strong>{aviso.titulo}</strong>
                            <span>{aviso.texto}</span>
                        </div>
                    </div>
                ))}
            </section>
        </PaginaPublica>
    );
}

// Se muestra cuando no hay una dirección de Koha configurada.
// No es una pérdida de datos: el resto del portal sigue funcionando.
function CatalogoNoDisponible() {
    return (
        <PaginaPublica>
            <EncabezadoPublico
                etiqueta="Catálogo no disponible"
                titulo={<>El <span>catálogo</span> no responde por ahora</>}
                texto="Puedes reintentar o consultar con el personal."
            />

            <section className="catalogo-busqueda">
                <div className="catalogo-falla" role="status">
                    <div className="catalogo-falla__anillo">
                        <span className="catalogo-falla__icono">
                            <img src={iconoNube} alt="" />
                        </span>
                    </div>
                    <p className="catalogo-falla__etiqueta">CATÁLOGO NO DISPONIBLE</p>
                    <h2>No pudimos abrir el catálogo</h2>
                    <p className="catalogo-falla__texto">Mientras tanto, esto es lo que puedes hacer:</p>
                    <ul className="catalogo-falla__lista">
                        {ALTERNATIVAS.map((alternativa) => (
                            <li key={alternativa}>
                                <img src={iconoCheck} alt="" />
                                {alternativa}
                            </li>
                        ))}
                    </ul>
                    <div className="catalogo-falla__botones">
                        <button type="button" className="boton-verde" onClick={() => window.location.reload()}>
                            <img src={iconoReintentar} alt="" />
                            Reintentar
                        </button>
                        <Link to="/contacto" className="boton-contorno-oscuro">Contactar a la biblioteca</Link>
                    </div>
                </div>
            </section>
        </PaginaPublica>
    );
}

export default Catalogo;
