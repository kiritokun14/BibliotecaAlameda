import { Link, Navigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Chip, EncabezadoPagina } from "../componentes";
import "./Contenidos.css";
import { NOMBRE_ESTADO, cuandoSeActualizo, obtenerContenido, useContenidos } from "./datos";
import { ESQUEMAS, tituloDe } from "./esquemas";
import { TONO_ESTADO } from "./tonos";
import { PasosContenido } from "./NuevoContenido";
import iconoFlecha from "../../../assets/admin/contenidos/tarjeta-flecha.svg";
import iconoCheck from "../../../assets/admin/tarjeta-check.svg";

// HU-12 · Editor: confirmación después de enviar a autorización
function EnviadoContenido() {
    const { folio } = useParams();
    useContenidos();
    const contenido = obtenerContenido(folio);
    if (!contenido) return <Navigate to="/admin/contenidos/editor" replace />;
    const esquema = ESQUEMAS[contenido.tipo];

    return (
        <PanelLayout titulo="Contenidos">
            <nav className="migas-panel" aria-label="Ruta">
                <span>Contenidos</span> › <span>Editor de contenidos</span> › <strong>Enviado a autorización</strong>
            </nav>

            <EncabezadoPagina
                etiqueta={`CONTENIDOS · EDITOR · ${contenido.folio}`}
                titulo="Enviado a autorización"
                texto={`Tu contenido ya espera la decisión del Administrador.`}
            />

            <section className="enviado-contenido" role="status">
                <span className="enviado-contenido__check"><img src={iconoCheck} alt="" /></span>
                <div>
                    <h2>{contenido.folio} · {tituloDe(contenido.tipo, contenido.valores)}</h2>
                    <p>Estado: {NOMBRE_ESTADO[contenido.estado]} · Enviado: {cuandoSeActualizo(contenido.actualizado).toLowerCase()} (ejemplo)</p>
                </div>
                <Chip tono={TONO_ESTADO[contenido.estado]}>{NOMBRE_ESTADO[contenido.estado]}</Chip>
            </section>

            <section className="tarjeta-panel tarjeta-panel--blanca">
                <div className="tarjeta-panel__cabecera">
                    <span className="icono-tarjeta icono-tarjeta--verde"><img src={iconoFlecha} alt="" /></span>
                    <div className="tarjeta-panel__textos"><h2>¿Qué sigue?</h2></div>
                </div>
                <PasosContenido
                    pasos={[
                        ["Revisión", `El Administrador lee ${esquema.enFrase} y su vista previa.`],
                        ["Decisión", `Puede publicarl${esquema.genero}, pedirte cambios o rechazarl${esquema.genero} con un motivo.`],
                        ["Aviso", "Verás el resultado en este módulo y en tus notificaciones."],
                    ]}
                />
            </section>

            <div className="acciones-contenido">
                <Link to="/admin/contenidos/editor" className="boton-panel boton-panel--verde boton-panel--grande">Volver a Mis contenidos</Link>
                <Link to={`/admin/contenidos/editor/${contenido.folio}/vista-previa`} className="boton-panel boton-panel--contorno boton-panel--grande">Ver el contenido enviado</Link>
                <Link to="/admin/contenidos/editor/nuevo" className="boton-panel boton-panel--suave boton-panel--grande">+ Nuevo contenido</Link>
            </div>
        </PanelLayout>
    );
}

export default EnviadoContenido;
