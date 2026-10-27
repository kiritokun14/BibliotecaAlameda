import { Fragment } from "react";
import { Link } from "react-router";
import { Bloque } from "./Bloque";
import foto from "../../assets/inicio/cuenta-foto.jpg";
import circulo1 from "../../assets/inicio/cuenta-circulo-1.svg";
import circulo2 from "../../assets/inicio/cuenta-circulo-2.svg";
import textura from "../../assets/inicio/cuenta-textura.svg";
import iconoCredencial from "../../assets/inicio/cuenta-credencial.svg";

const pasos = ["Crea tu cuenta", "Completa tus datos", "Recoge tu credencial"];

// Dibujo del código QR de muestra: cada fila dice qué cuadritos (0 a 8) van rellenos
const filasQr = [
    [0, 1, 2, 4, 6, 7, 8],
    [0, 2, 5, 6, 8],
    [0, 1, 2, 4, 5, 6, 7, 8],
    [2, 3, 7],
    [0, 4, 5, 8],
    [2, 3, 6],
    [0, 1, 2, 3, 6],
    [0, 2, 4, 6],
    [0, 1, 2, 3, 5, 6],
];

function CodigoQr() {
    return (
        <div className="codigo-qr">
            {filasQr.flatMap((fila, y) =>
                Array.from({ length: 9 }, (_, x) => (
                    <span key={`${x}-${y}`} className={fila.includes(x) ? "codigo-qr__lleno" : undefined} />
                )),
            )}
        </div>
    );
}

function LlamadoCuenta() {
    return (
        <section className="seccion-inicio seccion-inicio--crema">
            <Bloque tema="guinda" className="llamado" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 380, alto: 260 }}>
                <div className="llamado__texto">
                    <span className="llamado__icono">
                        <img src={iconoCredencial} alt="" />
                    </span>
                    <h2 className="titulo-seccion titulo-seccion--grande">
                        Crea tu cuenta y <span>tramita tu credencial</span>
                    </h2>
                    <p className="texto-seccion">
                        Con tu cuenta puedes solicitar tu credencial, reservar espacios e inscribirte a actividades.
                    </p>
                    <ol className="pasos">
                        {pasos.map((paso, i) => (
                            <Fragment key={paso}>
                                {i > 0 && <li className="pasos__linea" aria-hidden="true" />}
                                <li className="pasos__paso">
                                    <span>{i + 1}</span>
                                    {paso}
                                </li>
                            </Fragment>
                        ))}
                    </ol>
                    <div className="llamado__botones">
                        <Link to="/crear-cuenta" className="boton-dorado">
                            Crear cuenta
                        </Link>
                        <Link to="/iniciar-sesion" className="boton-contorno boton-contorno--alto">
                            Ya tengo cuenta
                        </Link>
                    </div>
                </div>

                <div className="llamado__imagen" aria-hidden="true">
                    <img src={foto} alt="" />
                    <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
                    <div className="credencial-muestra">
                        <div className="credencial-muestra__encabezado">
                            <strong>CREDENCIAL DE LECTOR</strong>
                            <span>Biblioteca Solón Argüello</span>
                        </div>
                        <div className="credencial-muestra__cuerpo">
                            <div>
                                <strong>Nombre Apellido</strong>
                                <p>Tepic, Nayarit</p>
                                <p className="credencial-muestra__numero">N.º 000000</p>
                            </div>
                            <CodigoQr />
                        </div>
                        <div className="credencial-muestra__banda" />
                    </div>
                </div>
            </Bloque>
        </section>
    );
}

export default LlamadoCuenta;
