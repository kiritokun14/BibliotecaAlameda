import { Link, useSearchParams } from "react-router";
import PaginaPublica from "../../components/PaginaPublica";
import "./Lecturas.css";
import { GENEROS, porTema, type Genero, type ItemTema } from "./datos";
import { EncabezadoLecturas, PestanasLecturas, Portada, Subpestanas } from "./piezas";

// Lecturas por tema: mezcla reseñas y registros de memoria. ?tema=novela
function LecturasTema() {
    const [parametros, setParametros] = useSearchParams();
    const temaUrl = parametros.get("tema") ?? "";
    const tema = (temaUrl in GENEROS ? temaUrl : "") as Genero | "";
    const items = porTema(tema);

    return (
        <PaginaPublica>
            <EncabezadoLecturas
                etiqueta="Lecturas y reseñas"
                titulo={<>Explora por <span>tema</span></>}
                texto="Elige un tema y descubre lecturas, reseñas y memoria."
            />

            <section className="lecturas-seccion">
                <div className="lecturas-contenedor">
                    <PestanasLecturas />
                    <Subpestanas
                        etiqueta="Temas"
                        opciones={[{ valor: "" as Genero | "", texto: "Todas" }, ...(Object.entries(GENEROS) as [Genero, string][]).map(([valor, texto]) => ({ valor, texto }))]}
                        activa={tema}
                        alElegir={(valor) => setParametros(valor ? { tema: valor } : {}, { replace: true })}
                    />

                    {items.length === 0 ? (
                        <p className="lecturas-vacio" role="status">
                            Aún no hay lecturas de este tema. <button type="button" onClick={() => setParametros({}, { replace: true })}>Ver todas</button>
                        </p>
                    ) : (
                        <ul className="rejilla-temas">
                            {items.map((x) => <TarjetaTema key={`${x.tipo}-${x.item.id}`} elemento={x} />)}
                        </ul>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

// Tarjeta ancha: portada ilustrada (reseña) o foto (memoria) + tipo + título
function TarjetaTema({ elemento }: { elemento: ItemTema }) {
    if (elemento.tipo === "resena") {
        const r = elemento.item;
        return (
            <li className="tarjeta-tema">
                <Portada resena={r} tamano="ancha" />
                <div className="tarjeta-tema__contenido">
                    <p className={r.recomendada ? "tipo-lectura tipo-lectura--recomendada" : "tipo-lectura tipo-lectura--resena"}>
                        <span />{r.recomendada ? "RECOMENDADA" : "RESEÑA"}
                    </p>
                    <h3><Link to={`/lecturas/${r.id}?desde=tema`} className="enlace-lectura">{r.libro}</Link></h3>
                </div>
            </li>
        );
    }
    const m = elemento.item;
    return (
        <li className="tarjeta-tema">
            <div className="tarjeta-tema__foto">
                <img src={m.imagen} alt="" />
                <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
            </div>
            <div className="tarjeta-tema__contenido">
                <p className="tipo-lectura tipo-lectura--memoria"><span />MEMORIA</p>
                <h3><Link to={`/lecturas/memoria/${m.id}?desde=tema`} className="enlace-lectura">{m.titulo}</Link></h3>
            </div>
        </li>
    );
}

export default LecturasTema;
