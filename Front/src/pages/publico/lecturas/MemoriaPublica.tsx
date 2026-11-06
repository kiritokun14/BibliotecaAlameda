import { useLecturasPublicadas } from "./publicados";
import { EstadoPublicados } from "../../../servicios/EstadoPublicados";
import { useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Lecturas.css";
import { aniosDeMemoria, memoriaPorAnio } from "./datos";
import { EncabezadoLecturas, PestanasLecturas, Subpestanas, TarjetaMemoria } from "./piezas";

// Memoria pública: fotos y registros autorizados. ?anio=2024
function MemoriaPublica() {
    const { datos, error, memorias } = useLecturasPublicadas();
    const [parametros, setParametros] = useSearchParams();
    const anios = aniosDeMemoria(memorias);
    const anioUrl = Number(parametros.get("anio"));
    const anio = anios.includes(anioUrl) ? anioUrl : null;
    const registros = memoriaPorAnio(anio, memorias);

    if (!datos || error) return <PaginaPublica><EstadoPublicados datos={datos} error={error} /></PaginaPublica>;

    return (
        <PaginaPublica>
            <EncabezadoLecturas
                etiqueta="Memoria pública"
                titulo={<>La historia que <span>guardamos</span></>}
                texto="Fotografías y registros autorizados de la vida de la biblioteca."
            />

            <section className="lecturas-seccion">
                <div className="lecturas-contenedor">
                    <PestanasLecturas />
                    <Subpestanas
                        etiqueta="Años"
                        opciones={[{ valor: 0, texto: "Todos los años" }, ...anios.map((a) => ({ valor: a, texto: String(a) }))]}
                        activa={anio ?? 0}
                        alElegir={(valor) => setParametros(valor ? { anio: String(valor) } : {}, { replace: true })}
                    />
                    {registros.length === 0 && <p>No hay registros de memoria publicados para este año.</p>}
                    <ul className="rejilla-memoria">
                        {registros.map((m) => <TarjetaMemoria key={m.id} memoria={m} />)}
                    </ul>
                </div>
            </section>
        </PaginaPublica>
    );
}

export default MemoriaPublica;
