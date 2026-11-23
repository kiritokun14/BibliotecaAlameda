// Tarjeta «Dónde es» del panel: el mapa de la biblioteca en solo lectura con el espacio resaltado (el mismo del portal).
// La usan el detalle de una solicitud de espacio y el de una propuesta de evento. Si el nombre no corresponde a una zona
// del plano, no se muestra nada (no se inventa un lugar).
import MapaBiblioteca from "../../publico/espacios/MapaBiblioteca";
import { espaciosEvento, plantaDe, zonaPorNombreEspacio } from "../../publico/espacios/datos";
import { Tarjeta } from "../piezasPanel";

export default function MapaDonde({ espacio, texto }: { espacio?: string | null; texto?: string }) {
    const zona = zonaPorNombreEspacio(espacio);
    if (!zona) return null;
    const evento = espaciosEvento[zona.id];
    return (
        <Tarjeta icono="espacios" id="mapa-donde" titulo="Dónde es" texto={texto ?? `${zona.nombre}. ${plantaDe(zona)}`}>
            <div className="pz-mapa">
                <MapaBiblioteca planta={zona.planta} alCambiarPlanta={() => undefined} elegido={zona.id} alElegir={() => undefined} soloLectura />
            </div>
            {evento && <p className="pz-acciones__nota">Hasta {evento.capacidad} personas. {evento.uso}</p>}
        </Tarjeta>
    );
}
