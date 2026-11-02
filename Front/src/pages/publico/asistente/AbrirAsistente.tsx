import { Navigate } from "react-router";

// /asistente no es una página aparte: lleva a Inicio y abre la ventana grande del asistente.
// (El asistente vive en el botón flotante de todas las páginas públicas.)
export default function AbrirAsistente() {
    return <Navigate to="/" replace state={{ abrirAsistente: true }} />;
}
