import { Fragment } from "react";
import { Bloque } from "./Bloque";
import circulo1 from "../../assets/inicio/cifras-circulo-1.svg";
import circulo2 from "../../assets/inicio/cifras-circulo-2.svg";
import rama from "../../assets/inicio/cifras-rama.svg";
import iconoLibro from "../../assets/inicio/cifras-libro.svg";
import iconoReloj from "../../assets/inicio/cifras-reloj.svg";
import iconoPeriodico from "../../assets/inicio/cifras-periodico.svg";
import iconoUsuarios from "../../assets/inicio/cifras-usuarios.svg";

const cifras = [
    { valor: "45,000+", texto: "Volúmenes en el acervo", icono: iconoLibro },
    { valor: "8 a 19:30 h", texto: "Atención entre semana", icono: iconoReloj },
    { valor: "Hemeroteca", texto: "Prensa y revistas de Nayarit", icono: iconoPeriodico },
    { valor: "Abierto", texto: "Para todo el público", icono: iconoUsuarios },
];

// Banda dorada con 4 datos separados por líneas
function Cifras() {
    return (
        <section className="seccion-inicio seccion-inicio--crema">
            <Bloque tema="dorado" className="cifras" circulos={[circulo1, circulo2]}>
                <img className="cifras__rama" src={rama} alt="" />
                {cifras.map((cifra, i) => (
                    <Fragment key={cifra.texto}>
                        {i > 0 && <span className="cifras__filete" />}
                        <div className="cifra">
                            <span className="cifra__icono">
                                <img src={cifra.icono} alt="" />
                            </span>
                            <div>
                                <strong>{cifra.valor}</strong>
                                <p>{cifra.texto}</p>
                            </div>
                        </div>
                    </Fragment>
                ))}
            </Bloque>
        </section>
    );
}

export default Cifras;
