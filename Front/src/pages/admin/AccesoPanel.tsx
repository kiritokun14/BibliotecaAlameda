import { invalidarConsultas } from '../../servicios/consultas';
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
        let generacion = 0;
        async function comprobar() {
            const actual = ++generacion;
            try {
                const acceso = await consultarMiAcceso();
                const capacidad = capacidadPanel(pathname === '/admin' ? (rutaInicialPanel(acceso) ?? '') : pathname);
                if (!capacidad || !permisoGlobal(acceso, capacidad)) throw new ErrorServicio('Tu cuenta no tiene el permiso necesario para esta sección.', 403);
                const { data, error } = await (await obtenerSupabase()).auth.getSession();
                if (error || !data.session || data.session.user.id !== acceso.usuarioId) throw new ErrorServicio('Inicia sesión para continuar.', 401);
                if (activo && actual === generacion) setResultado({ ruta: pathname, identidad: { acceso, correo: data.session.user.email ?? 'Cuenta del personal' } });
            } catch (error) {
                if (activo && actual === generacion) setResultado({ ruta: pathname, error: mensajeError(error), iniciar: error instanceof ErrorServicio && error.estado === 401 });
            }
        }
        const revalidar = () => { invalidarConsultas(); void comprobar(); };
        window.addEventListener('focus', revalidar);
        void comprobar();
        return () => { activo = false; window.removeEventListener('focus', revalidar); };
    }, [pathname]);
    if (resultado.ruta !== pathname) return <main className="confirmacion" role="status">Comprobando acceso al panel…</main>;
    if (resultado.iniciar) return <Navigate to="/iniciar-sesion" replace />;
    if (!resultado.identidad) return <main className="confirmacion"><p role="alert">{resultado.error}</p><Link to="/">Volver al inicio</Link></main>;
    if (pathname === "/admin") return <Navigate to={rutaInicialPanel(resultado.identidad.acceso)!} replace />;
    return <ContextoPanel.Provider value={resultado.identidad}>{children}</ContextoPanel.Provider>;
}
