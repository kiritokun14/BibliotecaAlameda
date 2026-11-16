import { Link, Navigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { Chip, Encabezado, Migas, Pagina, Pasos, PieDatos, Resultado, Tarjeta } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { cuandoConHora } from "../contenidoDemo/datos";
import { obtenerActividad, useActividades } from "./datos";
import { BASE_PROPUESTAS } from "./utiles";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoFlecha from "../../../assets/admin/contenidos/tarjeta-flecha.svg";

// Actividades · Propuestas: publicada (Figma 565:20694)
function ActividadPublicada() {
    const { folio } = useParams();
    useActividades();
    const a = obtenerActividad(folio);
    if (!a || a.estado !== "publicada") return <Navigate to={a ? `${BASE_PROPUESTAS}/${a.folio}` : BASE_PROPUESTAS} replace />;

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Propuestas de actividades", BASE_PROPUESTAS], ["Publicada"]]} />
                <Encabezado grande etiqueta={`Actividad ${a.folio} · Publicada`} titulo="Actividad publicada" texto={a.inscripcion ? "Ya aparece en Eventos y acepta inscripciones." : "Ya aparece en Eventos del portal."} />
                <Resultado
                    tono="verde"
                    icono={iconoCheck}
                    titulo={a.nombre}
                    linea={`Publicada ${cuandoConHora(a.publicadaEl ?? new Date().toISOString()).toLowerCase()} (ejemplo) · ${a.inscripcion ? "Inscripciones abiertas" : "Entrada libre"}`}
                    chip={<Chip tono="verde">Publicada</Chip>}
                />
                <Tarjeta icono={iconoFlecha} titulo="¿Qué sigue?">
                    <Pasos
                        pasos={[
                            ["Se reciben inscripciones", "Los cupos se llenan en orden de llegada."],
                            ["Revisa cambios", "Si hay ajustes, usa Cambios y cancelaciones."],
                            ["Pasa lista", "El día de la actividad, registra la asistencia."],
                        ]}
                    />
                </Tarjeta>
                <div className="cn-acciones">
                    <a href="/eventos" target="_blank" rel="noopener noreferrer" className={clasesBoton("verde")}>Ver en el portal ↗<span className="cn-solo-lectores"> (se abre en otra pestaña)</span></a>
                    <Link to={BASE_PROPUESTAS} className={`${clasesBoton("contorno")} panel-regresar`}>Volver a Propuestas de actividades</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default ActividadPublicada;
