import type { ReactNode } from "react";
import iconoAlerta from "../assets/login/icono-alerta.svg";
import iconoReloj from "../assets/login/icono-reloj.svg";
import iconoInfo from "../assets/login/icono-info.svg";
import iconoCheckVerde from "../assets/login/icono-check-verde.svg";

// Recuadro de color con ícono, título y texto.
// error = rosa, advertencia = amarillo, info y exito = verde.
type TipoAviso = "error" | "advertencia" | "info" | "exito";

const iconos: Record<TipoAviso, string> = {
    error: iconoAlerta,
    advertencia: iconoReloj,
    info: iconoInfo,
    exito: iconoCheckVerde,
};

type AvisoProps = {
    tipo: TipoAviso;
    titulo: string;
    children: ReactNode;
};

function Aviso({ tipo, titulo, children }: AvisoProps) {
    return (
        <div className={`aviso aviso--${tipo}`} role={tipo === "error" ? "alert" : "status"}>
            <span className="aviso__icono">
                <img src={iconos[tipo]} alt="" />
            </span>
            <div className="aviso__textos">
                <p className="aviso__titulo">{titulo}</p>
                <p className="aviso__texto">{children}</p>
            </div>
        </div>
    );
}

export default Aviso;
