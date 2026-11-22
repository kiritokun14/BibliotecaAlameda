import { useContext, useEffect, useState, useSyncExternalStore } from "react";
import { ContextoPanel, nombresRoles } from "../../servicios/accesoPanel";

// Piezas del marco del panel (21 nov 2026, Aldahir: «que se vea más como una pestaña de administración»):
// fecha y hora en la franja y la barra de estado del pie.

// ---------- Fecha y hora (franja superior), se actualiza cada 30 s ----------
function textoFechaHora(d = new Date()) {
    const fecha = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mazatlan" });
    const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Mazatlan" });
    return { fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1), hora };
}
export function FechaHora() {
    const [ahora, setAhora] = useState(textoFechaHora);
    useEffect(() => { const t = setInterval(() => setAhora(textoFechaHora()), 30000); return () => clearInterval(t); }, []);
    return <p className="marco-fecha"><span>{ahora.fecha}</span><strong>{ahora.hora} h</strong></p>;
}

// ---------- Conexión (barra de estado del pie) ----------
const suscribirConexion = (avisar: () => void) => {
    window.addEventListener("online", avisar); window.addEventListener("offline", avisar);
    return () => { window.removeEventListener("online", avisar); window.removeEventListener("offline", avisar); };
};
export function EstadoConexion() {
    const enLinea = useSyncExternalStore(suscribirConexion, () => navigator.onLine, () => true);
    return (
        <p className={`marco-estado${enLinea ? "" : " marco-estado--sin"}`} role="status">
            <span className="marco-estado__punto" aria-hidden="true" />
            {enLinea ? "Conectado" : "Sin conexión: los cambios no se guardarán"}
        </p>
    );
}

export function RolSesion() {
    const identidad = useContext(ContextoPanel);
    const rol = identidad ? nombresRoles(identidad.acceso).split(", ").filter((r) => r && r !== "Usuario / Cliente")[0] : null;
    return <p className="marco-sesion">Sesión: <strong>{rol ?? "Personal de la biblioteca"}</strong></p>;
}
