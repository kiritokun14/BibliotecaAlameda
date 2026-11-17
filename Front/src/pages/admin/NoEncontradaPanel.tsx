// Página no encontrada dentro del panel (Figma 583:45979): cualquier /admin/… que no existe.
import { useLocation } from "react-router";
import PanelLayout from "./PanelLayout";
import { seccionDeRuta } from "./menu";
import { ContenidoNoEncontrada } from "./EstadosPanel";

export default function NoEncontradaPanel() {
    const { pathname } = useLocation();
    return (
        <PanelLayout titulo={seccionDeRuta(pathname)} tema="contenidos" sinDemo>
            <ContenidoNoEncontrada />
        </PanelLayout>
    );
}
