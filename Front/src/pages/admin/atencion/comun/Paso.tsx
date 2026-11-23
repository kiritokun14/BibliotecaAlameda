// Paso de una línea del tiempo (`pz-linea`) en Servicios Digitales: «Cómo funciona», «¿Qué sigue?», «Cómo se atiende».
import { Icono, type NombreIcono } from "../../piezasPanel";

export type TonoPaso = "verde" | "dorado" | "guinda" | "gris";

export function Paso({ tono, icono, titulo, texto, actual }: { tono: TonoPaso; icono: NombreIcono; titulo: string; texto: string; actual?: boolean }) {
    return (
        <li className={`pz-linea__paso pz-linea__paso--${tono}${actual ? " pz-linea__paso--actual" : ""}`}>
            <span className="pz-linea__icono" aria-hidden="true"><Icono nombre={icono} /></span>
            <div className="pz-linea__textos">
                <p className="pz-linea__titulo">{titulo}</p>
                <p className="pz-linea__detalle">{texto}</p>
            </div>
        </li>
    );
}
