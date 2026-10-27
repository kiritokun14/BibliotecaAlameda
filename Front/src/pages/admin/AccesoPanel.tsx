import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, Navigate } from 'react-router';
import { consultarMiAcceso } from '../../servicios/auth';
import { obtenerSupabase, ErrorServicio, mensajeError } from '../../servicios/api';
import { capacidadPanel, permisoGlobal, rutaInicialPanel, ContextoPanel, type IdentidadPanel } from '../../servicios/accesoPanel';

export default function AccesoPanel({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const [resultado, setResultado] = useState<{ ruta: string; identidad?: IdentidadPanel; error?: string; iniciar?: boolean }>({ ruta: '' });
    useEffect(() => {
        let activo = true;
        async function comprobar() {
            try {
                const acceso = await consultarMiAcceso();
                const capacidad = capacidadPanel(pathname === '/admin' ? (rutaInicialPanel(acceso) ?? '') : pathname);
                if (!capacidad || !permisoGlobal(acceso, capacidad)) throw new ErrorServicio('Tu cuenta no tiene el permiso necesario para esta sección.', 403);
                const { data, error } = await (await obtenerSupabase()).auth.getUser();
                if (error || !data.user) throw new ErrorServicio('Inicia sesión para continuar.', 401);
                if (activo) setResultado({ ruta: pathname, identidad: { acceso, correo: data.user.email ?? 'Cuenta del personal' } });
            } catch (error) {
                if (activo) setResultado({ ruta: pathname, error: mensajeError(error), iniciar: error instanceof ErrorServicio && error.estado === 401 });
            }
        }
        void comprobar();
        return () => { activo = false; };
    }, [pathname]);
    if (resultado.ruta !== pathname) return <main className="confirmacion" role="status">Comprobando acceso al panel…</main>;
    if (resultado.iniciar) return <Navigate to="/iniciar-sesion" replace />;
    if (!resultado.identidad) return <main className="confirmacion"><p role="alert">{resultado.error}</p><Link to="/">Volver al inicio</Link></main>;
    if (pathname === "/admin") return <Navigate to={rutaInicialPanel(resultado.identidad.acceso)!} replace />;
    return <ContextoPanel.Provider value={resultado.identidad}>{children}</ContextoPanel.Provider>;
}
