import { useNavigate } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import EstadoPagina from "../../../components/portal/EstadoPagina";

// Estados del sistema (Figma «A-01 · Estados del sistema», sección 584:46760).
// - NoEncontrada: cualquier dirección que no existe (ruta "*" de App.tsx).
// - ErrorServidor (/error), SinConexion (/sin-conexion) y Mantenimiento (/mantenimiento):
//   páginas a las que se puede mandar a la persona cuando el backend falla, no hay internet
//   o el portal está en mantenimiento. TODO backend: decidir cuándo redirigir a cada una.

// "Intentar de nuevo" regresa a la página donde ocurrió el problema; si se llegó directo, va al inicio
function useVolverAIntentar() {
    const navegar = useNavigate();
    return () => {
        const hayPaginaAnterior = (window.history.state as { idx?: number } | null)?.idx;
        if (hayPaginaAnterior) navegar(-1);
        else navegar("/", { replace: true });
    };
}

export function NoEncontrada() {
    return (
        <PaginaPublica>
            <EstadoPagina
                etiqueta="ERROR 404"
                titulo="No encontramos esa página"
                texto="El enlace puede estar mal escrito o la página ya no existe. Puedes volver al inicio o ver las noticias."
                principal={{ texto: "Ir al inicio", ruta: "/" }}
                secundario={{ texto: "Ver noticias", ruta: "/noticias" }}
            />
        </PaginaPublica>
    );
}

export function ErrorServidor() {
    const volver = useVolverAIntentar();
    return (
        <PaginaPublica>
            <EstadoPagina
                etiqueta="ERROR DEL SERVIDOR"
                titulo="Algo salió mal de nuestro lado"
                texto="No pudimos mostrar esta página. Inténtalo de nuevo en unos minutos."
                principal={{ texto: "Intentar de nuevo", alPresionar: volver }}
                secundario={{ texto: "Ir al inicio", ruta: "/" }}
            />
        </PaginaPublica>
    );
}

export function SinConexion() {
    const volver = useVolverAIntentar();
    // Solo regresa si de verdad ya hay internet; si no, se queda en este aviso
    const reintentar = () => { if (navigator.onLine) volver(); };
    return (
        <PaginaPublica>
            <EstadoPagina
                etiqueta="SIN CONEXIÓN"
                titulo="Parece que no tienes internet"
                texto="Revisa tu conexión. Cuando vuelva, podrás seguir donde te quedaste."
                principal={{ texto: "Intentar de nuevo", alPresionar: reintentar }}
                secundario={{ texto: "Ir al inicio", ruta: "/" }}
            />
        </PaginaPublica>
    );
}

export function Mantenimiento() {
    const volver = useVolverAIntentar();
    return (
        <PaginaPublica>
            <EstadoPagina
                etiqueta="EN MANTENIMIENTO"
                titulo="Estamos mejorando el portal"
                texto="Volvemos en unas horas. Mientras tanto, puedes visitarnos en la biblioteca en su horario regular (por confirmar)."
                principal={{ texto: "Volver a intentar", alPresionar: volver }}
                secundario={{ texto: "Escribir a la biblioteca", ruta: "/contacto" }}
            />
        </PaginaPublica>
    );
}
