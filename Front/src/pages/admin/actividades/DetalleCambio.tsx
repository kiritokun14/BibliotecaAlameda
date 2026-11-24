// Rutas de Cambios y cancelaciones del panel (App.tsx): detalle, formularios y la vuelta tras aplicar o rechazar.
// Todo usa los datos reales con el diseño del panel (CambiosPanel.tsx); los resultados abren el mismo detalle.
import { CambioDetalle, CambioFormulario } from "./CambiosPanel";

export const DetalleCambio = CambioDetalle;
export const CancelarActividad = CambioFormulario;
export const Reprogramar = CambioFormulario;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ResultadoCambio(_: { tipo: "aplicado" | "rechazado" | "cancelada" | "enviada" }) {
    return <CambioDetalle />;
}
