import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "../actividades/EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { Chip, Encabezado, Migas, Pagina, PieDatos, Resultado } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { BASE_FORO } from "./utiles";
import iconoAlerta from "../../../assets/admin/actividades/resultado-alerta.svg";

// Bibliocomunidad (moderación) · error al decidir (Figma 574:35176). No cambia nada: la publicación sigue como estaba.
export function ErrorDecision({ ocupado, alReintentar, alVolver }: { ocupado: boolean; alReintentar: () => void; alVolver: () => void }) {
    return (
        <PanelLayout titulo="Participantes" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Bibliocomunidad", BASE_FORO], ["Error al decidir"]]} />
                <Encabezado etiqueta="Moderación" titulo="Moderación de Bibliocomunidad" texto="No se pudo aplicar la decisión." />
                <div role="alert">
                    <Resultado tono="guinda" icono={iconoAlerta} titulo="No se pudo guardar la decisión" linea="La publicación sigue como estaba. Inténtalo de nuevo." chip={<Chip tono="guinda">Sin guardar</Chip>} />
                </div>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={alReintentar}>{ocupado ? "Reintentando…" : "Reintentar"}</button>
                    <button type="button" className={clasesBoton("contorno")} onClick={alVolver}>Volver a Bibliocomunidad</button>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}
