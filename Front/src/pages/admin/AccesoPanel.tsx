import { invalidarConsultas, memoriaDeCuenta, registrarAlSalir } from '../../servicios/consultas';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, Navigate } from 'react-router';
import { consultarMiAcceso } from '../../servicios/auth';
import { obtenerSupabase, ErrorServicio, mensajeError } from '../../servicios/api';
import { EsqueletoPanel } from '../../components/portal/Esqueleto';
import PantallaEstado, { IconoCandado } from '../../components/portal/PantallaEstado';
import { VentanaSesionCaducada } from './EstadosPanel';
import { capacidadPanel, permisoGlobal, rutaInicialPanel, tienePanel, ContextoPanel, type IdentidadPanel } from '../../servicios/accesoPanel';

// Solo se descarga si hace falta: el aviso «Sin permiso» dentro del panel (Figma 583:45548)
const SinPermiso = lazy(() => import('./SinPermiso'));

type Comprobacion = { identidad?: IdentidadPanel; error?: string; iniciar?: boolean; caducada?: boolean };

// Última comprobación, compartida entre pantallas: cada ruta monta su propio AccesoPanel y,
// sin esto, el panel entero desaparecía mientras se volvía a preguntar por los permisos.
// Los permisos se siguen revalidando en segundo plano en cada cambio de ruta (y el backend
// comprueba cada petición), así que solo se ahorra la espera, no la comprobación.
let ultima: Comprobacion | null = null;
let ultimaFoco = 0;
registrarAlSalir(() => { ultima = null; });

async function comprobar(): Promise<Comprobacion> {
    try {
        const acceso = await consultarMiAcceso();
        const { data, error } = await (await obtenerSupabase()).auth.getSession();
        if (error || !data.session || data.session.user.id !== acceso.usuarioId) throw new ErrorServicio('Inicia sesión para continuar.', 401);
        memoriaDeCuenta(acceso.usuarioId);
        return { identidad: { acceso, correo: data.session.user.email ?? 'Cuenta del personal' } };
    } catch (error) {
        return { error: mensajeError(error), iniciar: error instanceof ErrorServicio && error.estado === 401 };
    }
}

// libre: solo pide que la cuenta tenga panel (páginas sin capacidad propia, como «Página no encontrada»)
export default function AccesoPanel({ children, libre = false }: { children: ReactNode; libre?: boolean }) {
    const { pathname, search } = useLocation();
    const [resultado, setResultado] = useState<Comprobacion | null>(ultima);
    useEffect(() => {
        let activo = true;
        const revisar = () => comprobar().then((nueva) => {
            ultima = nueva.iniciar ? null : nueva;
            if (!activo) return;
            setResultado((previa) => {
                // La sesión caducó mientras se trabajaba: se queda el panel detrás y se avisa con una ventana
                if (nueva.iniciar && previa?.identidad) return { ...previa, caducada: true };
                // Si no cambió la cuenta ni sus permisos, se conserva el mismo objeto para no volver a pintar todo
                return previa?.identidad && nueva.identidad && !previa.caducada
                    && JSON.stringify(previa.identidad) === JSON.stringify(nueva.identidad) ? previa : nueva;
            });
        });
        // Al volver a la pestaña se revalida, como mucho una vez por minuto
        const alEnfocar = () => {
            if (Date.now() - ultimaFoco < 60_000) return;
            ultimaFoco = Date.now(); invalidarConsultas(); void revisar();
        };
        window.addEventListener('focus', alEnfocar);
        void revisar();
        return () => { activo = false; window.removeEventListener('focus', alEnfocar); };
    }, [pathname]);

    if (!resultado) return <EsqueletoPanel />;
    if (resultado.iniciar) return <Navigate to="/iniciar-sesion" replace />;
    const identidad = resultado.identidad;
    // Sin ningún permiso del panel no hay a dónde llevarla: pantalla completa
    if (!identidad || !tienePanel(identidad.acceso)) return (
        <PantallaEstado tono="guinda" icono={<IconoCandado />} etiqueta="Sin acceso" titulo="Tu cuenta no entra al panel"
            texto={resultado.error ?? 'Tu cuenta no tiene permisos del panel del personal.'}>
            <Link to="/">Volver al portal</Link>
            <Link to="/contacto" className="pantalla-estado__secundario">Pedir ayuda</Link>
        </PantallaEstado>
    );
    const inicial = rutaInicialPanel(identidad.acceso);
    if (pathname === "/admin" && inicial) return <Navigate to={inicial} replace />;
    // La capacidad de la ruta se calcula con los permisos ya conocidos: no hay que esperar al servidor
    const capacidad = capacidadPanel(pathname);
    // Solo en desarrollo: ?simular=sesion-caducada muestra la ventana para revisarla
    const caducada = resultado.caducada || (import.meta.env.DEV && new URLSearchParams(search).get('simular') === 'sesion-caducada');
    if (!libre && (!capacidad || !permisoGlobal(identidad.acceso, capacidad))) return (
        <ContextoPanel.Provider value={identidad}>
            <Suspense fallback={<EsqueletoPanel />}><SinPermiso /></Suspense>
        </ContextoPanel.Provider>
    );
    return <ContextoPanel.Provider value={identidad}>{children}{caducada && <VentanaSesionCaducada />}</ContextoPanel.Provider>;
}
