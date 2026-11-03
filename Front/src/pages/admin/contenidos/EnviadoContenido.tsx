import { Link, Navigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import { cuandoSeActualizo, NOMBRE_ESTADO, obtenerContenido, useContenidos } from "./datos";
import { ESQUEMAS, tituloDe } from "./esquemas";
import { ChipEstado, Encabezado, Migas, Pagina, Pasos, PieDatos, Resultado, Tarjeta } from "./piezas";
import { clasesBoton } from "./utiles";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoFlecha from "../../../assets/admin/contenidos/tarjeta-flecha.svg";

// HU-12 · Editor: confirmación después de enviar a autorización (Figma 559:17143)
function EnviadoContenido() {
    const { folio } = useParams();
    useContenidos();
    const contenido = obtenerContenido(folio);
    if (!contenido) return <Navigate to="/admin/contenidos/editor" replace />;
    const esquema = ESQUEMAS[contenido.tipo];

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Editor de contenidos", "/admin/contenidos/editor"], ["Enviado a autorización"]]} />

                <Encabezado grande etiqueta={`Contenidos · Editor · ${contenido.folio}`} titulo="Enviado a autorización" texto="Tu contenido ya espera la decisión del Administrador." />

                <Resultado
                    tono="verde"
                    icono={iconoCheck}
                    titulo={`${contenido.folio} · ${tituloDe(contenido.tipo, contenido.valores)}`}
                    linea={`Estado: ${NOMBRE_ESTADO[contenido.estado]} · Enviado ${cuandoSeActualizo(contenido.enviado ?? contenido.actualizado).toLowerCase()} (ejemplo)`}
                    chip={<ChipEstado estado={contenido.estado} />}
                />

                <Tarjeta icono={iconoFlecha} titulo="¿Qué sigue?">
                    <Pasos
                        pasos={[
                            ["Revisión", `El Administrador lee ${esquema.enFrase} y su vista previa.`],
                            ["Decisión", `Puede publicarl${esquema.genero}, pedirte cambios o rechazarl${esquema.genero} con un motivo.`],
                            ["Aviso", "Verás el resultado en este módulo y en tus notificaciones."],
                        ]}
                    />
                </Tarjeta>

                <div className="cn-acciones">
                    <Link to="/admin/contenidos/editor" className={clasesBoton("verde")}>Volver a Mis contenidos</Link>
                    <Link to={`/admin/contenidos/editor/${contenido.folio}/vista-previa`} className={clasesBoton("contorno")}>Ver el contenido enviado</Link>
                    <Link to="/admin/contenidos/editor/nuevo" className={clasesBoton("suave")}>+ Nuevo contenido</Link>
                </div>

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default EnviadoContenido;
