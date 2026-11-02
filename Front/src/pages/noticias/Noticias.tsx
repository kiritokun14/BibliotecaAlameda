import { useState } from "react";
import { Link } from "react-router";
import PaginaPublica from "../../components/PaginaPublica";
import "./Noticias.css";
import { CATEGORIAS, fechaLarga, filtrarNoticias, nombreCategoria, type Categoria } from "./datos";
import { CargandoNoticias, ChipCategoria, EncabezadoNoticias, EstadoNoticias, PuntoCategoria, TarjetaChica } from "./piezas";
import { useNoticias } from "./useNoticias";
import flechaBlanca from "../../assets/servicios/boton-flecha-blanca.svg";
import flechaOscura from "../../assets/acerca/invitacion-flecha.svg";
import circuloGrande from "../../assets/noticias/destacada-circulo-1.svg";
import circuloChico from "../../assets/noticias/destacada-circulo-2.svg";

// /noticias: la noticia destacada y las más recientes, con filtro por categoría
function Noticias() {
    const { carga, reintentar } = useNoticias();
    const [categoria, setCategoria] = useState<Categoria | null>(null);

    return (
        <PaginaPublica>
            <EncabezadoNoticias
                etiqueta="Noticias"
                titulo={<>Lo que pasa en la <span>biblioteca</span></>}
                texto="Avisos, actividades y novedades de la comunidad, en un solo lugar."
            />

            <section className="noticias-seccion">
                <div className="noticias-contenedor">
                    <div className="noticias-titulo">
                        <div className="noticias-titulo__textos">
                            <span className="etiqueta-noticias">Noticias recientes</span>
                            <h2>Últimas <span>noticias</span></h2>
                            <p>Lo más reciente que pasa en la biblioteca, para que no te pierdas nada.</p>
                        </div>
                        <Link to="/noticias/todas" className="boton-noticias boton-noticias--verde">
                            Ver todas las noticias
                            <img src={flechaBlanca} alt="" />
                        </Link>
                    </div>

                    {carga.estado === "cargando" && <CargandoNoticias />}
                    {carga.estado === "error" && <EstadoNoticias tipo="error" alAccionar={reintentar} />}
                    {carga.estado === "listo" && (
                        <ContenidoListado
                            categoria={categoria}
                            alCambiarCategoria={setCategoria}
                            filtradas={filtrarNoticias(carga.noticias, { categoria })}
                        />
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

function ContenidoListado({
    categoria,
    alCambiarCategoria,
    filtradas,
}: {
    categoria: Categoria | null;
    alCambiarCategoria: (categoria: Categoria | null) => void;
    filtradas: ReturnType<typeof filtrarNoticias>;
}) {
    // La destacada es la marcada como tal; si el filtro la oculta, la más reciente que quede
    const destacada = filtradas.find((n) => n.destacada) ?? filtradas[0];
    const mas = filtradas.filter((n) => n !== destacada).slice(0, 3);

    return (
        <>
            <div className="filtro-categorias" role="group" aria-label="Filtrar por categoría">
                <ChipCategoria activa={categoria === null} alPresionar={() => alCambiarCategoria(null)}>Todas</ChipCategoria>
                {CATEGORIAS.map((c) => (
                    <ChipCategoria key={c.id} activa={categoria === c.id} alPresionar={() => alCambiarCategoria(c.id)}>
                        {c.nombre}
                    </ChipCategoria>
                ))}
            </div>

            {!destacada ? (
                <EstadoNoticias
                    tipo="vacio"
                    texto={`No hay noticias en la categoría ${categoria ? nombreCategoria(categoria) : ""}. Prueba con otra categoría o quita el filtro.`}
                    alAccionar={() => alCambiarCategoria(null)}
                />
            ) : (
                <>
                    <Link to={`/noticias/${destacada.id}`} state={{ desde: "noticias" }} className="noticia-principal">
                        <img className="noticia-principal__circulo noticia-principal__circulo--1" src={circuloGrande} alt="" />
                        <img className="noticia-principal__circulo noticia-principal__circulo--2" src={circuloChico} alt="" />
                        <span className="noticia-principal__imagen">
                            <img src={destacada.imagen} alt="" />
                        </span>
                        <span className="noticia-principal__textos">
                            <span className="noticia-principal__meta">
                                <PuntoCategoria categoria={destacada.categoria} claro />
                                {fechaLarga(destacada.fecha)}
                            </span>
                            <span className="noticia-principal__titulo">{destacada.titulo}</span>
                            <span className="noticia-principal__resumen">{destacada.resumen}</span>
                            <span className="boton-noticias boton-noticias--dorado">
                                Leer la noticia
                                <img src={flechaOscura} alt="" />
                            </span>
                        </span>
                    </Link>

                    {mas.length > 0 && (
                        <div className="noticias-mas">
                            <div className="noticias-mas__titulo">
                                <h2>Más noticias</h2>
                                <p>Avisos, actividades y novedades de la comunidad.</p>
                            </div>
                            <ul className="noticias-fila">
                                {mas.map((noticia) => (
                                    <li key={noticia.id}>
                                        <TarjetaChica noticia={noticia} origen={{ desde: "noticias" }} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </>
    );
}

export default Noticias;
