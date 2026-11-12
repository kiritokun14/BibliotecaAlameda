import { Navigate } from 'react-router';
export { InscritosActividad as FichaInscripcion } from './Inscripciones.tsx';
export function InscribirPersona() {
    return <Navigate to="/admin/actividades/inscripciones" replace />;
}
export function ResultadoInscripcion(propiedades: { tipo: 'inscrita' | 'ofrecido' | 'cancelada' | 'cupo' }) {
    void propiedades;
    return <Navigate to="/admin/actividades/inscripciones" replace />;
}
