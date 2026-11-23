// Piezas comunes de Administración. Desde el 21 nov 2026 las pantallas usan las piezas del panel (piezasPanel.tsx);
// aquí solo queda el armazón de cada pantalla y el error de carga.
import { type ReactNode } from "react";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import { Aviso } from "../piezasPanel";
import "./Administracion.css";

// Armazón de cada pantalla: «Administración › <módulo> › …»
export function Pantalla({ migas, children }: { migas: [string, string?][]; children: ReactNode }) {
    return (
        <PanelLayout titulo="Administración" tema="contenidos paleta">
            <Migas raiz="Administración" pasos={migas} />
            {children}
        </PanelLayout>
    );
}

export function ErrorCarga({ titulo = "No se pudo cargar.", texto, alReintentar }: { titulo?: string; texto: string; alReintentar?: () => void }) {
    return (
        <Aviso tono="error" titulo={titulo} texto={texto}>
            {alReintentar && <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={alReintentar}>Reintentar</button>}
        </Aviso>
    );
}
