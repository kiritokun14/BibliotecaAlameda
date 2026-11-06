import { useState } from "react";
import "./AvisoPortal.css";
import { avisoPortal } from "./datos";

const CLAVE = "biblioteca-aviso-cerrado"; // id del último aviso que la persona cerró

function leerCerrado() {
    try { return localStorage.getItem(CLAVE); } catch { return null; }
}

// Franja dorada con un aviso del portal arriba de la portada (Figma «Inicio · con aviso del portal»).
// Al cerrarlo ya no vuelve a salir ese mismo aviso; uno nuevo (otro id) sí se muestra.
export default function AvisoPortal() {
    const [aviso] = useState(avisoPortal);
    const [cerrado, setCerrado] = useState(leerCerrado);

    if (!aviso || cerrado === aviso.id) return null;

    function cerrar() {
        if (!aviso) return;
        try { localStorage.setItem(CLAVE, aviso.id); } catch { /* sin almacenamiento: solo se oculta ahora */ }
        setCerrado(aviso.id);
    }

    return (
        <div className="aviso-portal" role="region" aria-label="Aviso del portal">
            <div className="aviso-portal__contenido">
                <span className="aviso-portal__icono" aria-hidden="true">!</span>
                <p className="aviso-portal__texto">{aviso.texto}</p>
                <button type="button" className="aviso-portal__cerrar" onClick={cerrar} aria-label="Cerrar aviso">
                    Cerrar <span aria-hidden="true">×</span>
                </button>
            </div>
        </div>
    );
}
