import { useLecturasPublicadas } from "./publicados";
import { EstadoPublicados } from "../../../servicios/EstadoPublicados";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Lecturas.css";
import {
    FILTROS_VACIOS,
    GENEROS,
    ORDENES,
    filtrarResenas,
    filtrosDesdeParametros,
    parametrosDesdeFiltros,
    type FiltrosResenas,
    type Genero,
    type Orden,
} from "./datos";
import { EncabezadoLecturas, EstadoLecturas, PestanasLecturas, TarjetaResena } from "./piezas";
import iconoBuscar from "../../../assets/comun/iconos/accesos-buscar.svg";
import iconoBuscarBlanco from "../../../assets/lecturas/buscar-blanco.svg";
import iconoFiltros from "../../../assets/comun/iconos/filtro-todas.svg";
import chevron from "../../../assets/comun/iconos/chevron-abajo.svg";

// Lecturas y reseñas · Por autor (vista de visitante: solo consulta).
// La búsqueda y los filtros viven en la URL: /lecturas?q=rulfo&genero=novela&orden=titulo
function Lecturas() {
    const { datos, error, resenas } = useLecturasPublicadas();
    const [parametros, setParametros] = useSearchParams();
    const filtros = filtrosDesdeParametros(parametros);
    const resultado = filtrarResenas(resenas, filtros);

    function aplicar(nuevos: FiltrosResenas) {
        setParametros(parametrosDesdeFiltros(nuevos), { replace: true });
    }

    if (!datos || error) return <PaginaPublica><EstadoPublicados datos={datos} error={error} /></PaginaPublica>;

    return (
        <PaginaPublica>
            <EncabezadoLecturas
                etiqueta="Lecturas y reseñas"
                titulo={<>Un libro para <span>cada tarde</span></>}
                texto="Reseñas bibliográficas escritas por el equipo de la biblioteca para que encuentres tu próxima lectura."
            />

            <section className="lecturas-seccion">
                <div className="lecturas-contenedor">
                    <Buscador filtros={filtros} alAplicar={aplicar} />

                    <p className="lecturas-resumen" role="status">
                        Mostrando {resultado.length} {resultado.length === 1 ? "reseña" : "reseñas"} de la biblioteca
                    </p>

                    <h2 className="lecturas-titulo">Reseñas de la biblioteca</h2>
                    {resultado.length === 0 ? (
                        <EstadoLecturas tipo="sin-resultados" alLimpiar={() => aplicar(FILTROS_VACIOS)} />
                    ) : (
                        <ul className="rejilla-resenas">
                            {resultado.map((r) => <TarjetaResena key={r.id} resena={r} />)}
                        </ul>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

// Tarjeta blanca: pestañas, "Buscar reseñas", Filtros y Buscar
function Buscador({ filtros, alAplicar }: { filtros: FiltrosResenas; alAplicar: (f: FiltrosResenas) => void }) {
    const [texto, setTexto] = useState(filtros.q);
    const [abierto, setAbierto] = useState(false);
    const [borrador, setBorrador] = useState(filtros);
    const cantidad = (filtros.genero ? 1 : 0) + (filtros.orden !== "recientes" ? 1 : 0);

    // Si la URL cambia por fuera (Quitar filtros, botón atrás), el cuadro de texto la sigue
    const [qPrevio, setQPrevio] = useState(filtros.q);
    if (filtros.q !== qPrevio) {
        setQPrevio(filtros.q);
        setTexto(filtros.q);
    }

    function buscar(e: FormEvent) {
        e.preventDefault();
        alAplicar({ ...filtros, q: texto });
    }

    function alternarFiltros() {
        setBorrador(filtros);
        setAbierto(!abierto);
    }

    return (
        <div className="buscador-lecturas">
            <PestanasLecturas />
            <form className="buscador-lecturas__barra" role="search" onSubmit={buscar}>
                <label className="buscador-lecturas__campo">
                    <span className="buscador-lecturas__etiqueta">Buscar reseñas</span>
                    <span className="buscador-lecturas__entrada">
                        <img src={iconoBuscar} alt="" />
                        <input
                            type="search"
                            value={texto}
                            placeholder="Escribe un autor, título o tema…"
                            onChange={(e) => setTexto(e.target.value)}
                        />
                    </span>
                </label>
                <button
                    type="button"
                    className={abierto ? "boton-filtros-lecturas boton-filtros-lecturas--abierto" : "boton-filtros-lecturas"}
                    aria-expanded={abierto}
                    aria-controls="filtros-lecturas"
                    onClick={alternarFiltros}
                >
                    <img src={iconoFiltros} alt="" />
                    Filtros
                    {cantidad > 0 && <span className="boton-filtros-lecturas__cantidad">{cantidad}<span className="solo-lectores"> activos</span></span>}
                    <img src={chevron} alt="" className="boton-filtros-lecturas__chevron" />
                </button>
                <button type="submit" className="boton-lectura">
                    Buscar <img src={iconoBuscarBlanco} alt="" />
                </button>
            </form>

            {abierto && (
                <div className="filtros-lecturas" id="filtros-lecturas">
                    <fieldset>
                        <legend>Género</legend>
                        <div className="filtros-lecturas__opciones">
                            {([["", "Todos los géneros"], ...Object.entries(GENEROS)] as [Genero | "", string][]).map(([valor, nombre]) => (
                                <label key={valor || "todos"} className="opcion-lectura">
                                    <input
                                        type="radio"
                                        name="genero"
                                        checked={borrador.genero === valor}
                                        onChange={() => setBorrador({ ...borrador, genero: valor })}
                                    />
                                    <span>{nombre}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>Ordenar por</legend>
                        <div className="filtros-lecturas__opciones">
                            {(Object.entries(ORDENES) as [Orden, string][]).map(([valor, nombre]) => (
                                <label key={valor} className="opcion-lectura">
                                    <input
                                        type="radio"
                                        name="orden"
                                        checked={borrador.orden === valor}
                                        onChange={() => setBorrador({ ...borrador, orden: valor })}
                                    />
                                    <span>{nombre}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div className="filtros-lecturas__botones">
                        <button
                            type="button"
                            className="filtros-lecturas__limpiar"
                            onClick={() => setBorrador({ ...borrador, genero: "", orden: "recientes" })}
                        >
                            Limpiar filtros
                        </button>
                        <button
                            type="button"
                            className="boton-lectura"
                            onClick={() => {
                                setAbierto(false);
                                alAplicar({ ...borrador, q: texto });
                            }}
                        >
                            Aplicar filtros
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Lecturas;
