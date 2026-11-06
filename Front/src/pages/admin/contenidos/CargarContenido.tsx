import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { mensajeError } from "../../../servicios/api";
import { obtenerContenido, type Contenido } from "../../../servicios/contenidos";
import { Migas } from "./piezas";
import "./Contenidos.css";

// Trae de la base el contenido del folio de la ruta y, cuando llega, muestra la pantalla.

type Carga = { folio: string; contenido?: Contenido; error?: string };

function CargarContenido({ children }: { children: (contenido: Contenido) => ReactNode }) {
    const { folio = "" } = useParams();
    const [carga, setCarga] = useState<Carga | null>(null);

    useEffect(() => {
        let activo = true;
        obtenerContenido(folio)
            .then((contenido) => { if (activo) setCarga({ folio, contenido }); })
            .catch((e) => { if (activo) setCarga({ folio, error: mensajeError(e) }); });
        return () => { activo = false; };
    }, [folio]);

    // Mientras llega el folio nuevo no se muestra el anterior
    const actual = carga?.folio === folio ? carga : null;
    if (actual?.contenido) return <>{children(actual.contenido)}</>;

    return (
        <PanelLayout titulo="Contenidos" tema="solon">
            <Migas actual={folio} />
            {actual?.error ? (
                <div className="contenidos-panel">
                    <p className="contenidos-error" role="alert">{actual.error}</p>
                    <Link to="/admin/contenidos/editor" className="contenidos-boton contenidos-boton--principal">Volver a Mis contenidos</Link>
                </div>
            ) : (
                <p className="contenidos-cargando" role="status">Cargando {folio}…</p>
            )}
        </PanelLayout>
    );
}

export default CargarContenido;
