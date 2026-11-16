import { Link, Navigate } from "react-router";
import PanelLayout from "../PanelLayout";
import CargarContenido from "./CargarContenido";
import RedactarNoticia from "./RedactarNoticia";
import RedactarResena from "./RedactarResena";
import EditarAcerca from "./EditarAcerca";
import RedactarMemoria from "./RedactarMemoria";
import { Migas } from "./piezas";
import type { Contenido } from "../../../servicios/contenidos";
import "./Contenidos.css";

// "Editar →" en Mis contenidos: abre el borrador en el formulario de su tipo.

function Formulario({ contenido }: { contenido: Contenido }) {
    if (contenido.estado === "con_observaciones")
        return <Navigate to={`/admin/contenidos/editor/${contenido.folio}/corregir`} replace />;
    if (contenido.estado === "borrador") {
        if (contenido.tipo === "noticia") return <RedactarNoticia inicial={contenido} />;
        if (contenido.tipo === "resena") return <RedactarResena inicial={contenido} />;
        if (contenido.tipo === "acerca") return <EditarAcerca inicial={contenido} />;
        if (contenido.tipo === "memoria") return <RedactarMemoria inicial={contenido} />;
    }
    return (
        <PanelLayout titulo="Contenidos" tema="contenidos">
            <Migas actual={contenido.folio} />
            <div className="contenidos-panel">
                <p className="contenidos-error" role="alert">
                    {contenido.estado === "borrador"
                        ? "Este tipo de contenido todavía no tiene formulario."
                        : "Este contenido ya se envió a autorización y no se puede editar."}
                </p>
                <Link to="/admin/contenidos/editor" className="contenidos-boton contenidos-boton--principal panel-regresar">Volver a Mis contenidos</Link>
            </div>
        </PanelLayout>
    );
}

function EditarContenido() {
    return <CargarContenido>{(contenido) => <Formulario key={contenido.folio} contenido={contenido} />}</CargarContenido>;
}

export default EditarContenido;
