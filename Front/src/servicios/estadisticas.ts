// Administración › Estadísticas: GET /administracion/estadisticas (Back/estadisticas.py → Supabase/estadisticas_panel.sql).
// Solo conteos, sin datos personales. Permiso: 'consultar_estadisticas'.
import { pedirAdministracion } from './auth';
import type { Estadisticas, Periodo, SeccionEstadistica } from '../pages/admin/administracion/datos';

export function consultarEstadisticas(seccion: SeccionEstadistica, periodo: Periodo) {
    return pedirAdministracion<Estadisticas>(`/estadisticas?seccion=${seccion}&periodo=${periodo}`);
}
