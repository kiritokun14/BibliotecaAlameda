import CambiosActividadReal from './CambiosActividadReal';
export const DetalleCambio = CambiosActividadReal;
export const CancelarActividad = CambiosActividadReal;
export const Reprogramar = CambiosActividadReal;
export function ResultadoCambio({ tipo }: { tipo: 'aplicado' | 'rechazado' | 'cancelada' | 'enviada' }) {
    return <CambiosActividadReal key={tipo} />;
}
