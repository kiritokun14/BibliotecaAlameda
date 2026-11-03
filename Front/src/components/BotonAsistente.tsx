import { useState } from "react";
import { Link } from "react-router";
import haloExterior from "../assets/inicio/asistente-halo-exterior.svg";
import haloInterior from "../assets/inicio/asistente-halo-interior.svg";
import robot from "../assets/inicio/asistente-robot.svg";
import enLinea from "../assets/inicio/asistente-en-linea.svg";
import flecha from "../assets/inicio/asistente-flecha.svg";
import destello from "../assets/inicio/asistente-destello.svg";

// Botón fijo abajo a la derecha que abre el asistente
function BotonAsistente() {
    const [mostrarGlobo, setMostrarGlobo] = useState(true);

    return (
        <div className="asistente">
            {mostrarGlobo && (
                <div className="asistente__globo">
                    <img src={destello} alt="" />
                    Hola, ¿te ayudo a encontrar un libro?
                    <button type="button" aria-label="Cerrar mensaje" onClick={() => setMostrarGlobo(false)}>
                        ×
                    </button>
                </div>
            )}

            {/* TODO: la página del asistente todavía no existe */}
            <Link to="/asistente" className="asistente__boton">
                <img className="asistente__halo asistente__halo--exterior" src={haloExterior} alt="" />
                <img className="asistente__halo asistente__halo--interior" src={haloInterior} alt="" />
                <span className="asistente__avatar">
                    <img src={robot} alt="" />
                </span>
                <img className="asistente__en-linea" src={enLinea} alt="" />
                <span className="asistente__texto">
                    <strong>¿Tienes dudas?</strong>
                    Pregunta al asistente
                </span>
                <span className="asistente__flecha">
                    <img src={flecha} alt="" />
                </span>
            </Link>
        </div>
    );
}

export default BotonAsistente;
