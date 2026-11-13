import { useState } from "react";
import { Link, useNavigate } from "react-router";
import PanelLayout from "../PanelLayout";
import { Ventana } from "../Ventana";
import "./Notificaciones.css";
import { capacidadPanel } from "../../../servicios/accesoPanel";
import { AREAS_NOTIFICACION, filtrarNotificaciones, useNotificaciones, type FiltroNotificacion, type Notificacion } from "./datos";
import iconoReloj from "../../../assets/comun/iconos/reloj-blanco.svg";
import iconoBuscar from "../../../assets/comun/iconos/buscar-gris.svg";
import iconoAlerta from "../../../assets/admin/modal-alert.svg";

// Admin · Notificaciones (Figma 632:58443): lista, todas leídas, confirmar eliminar leídas y vacío.
export default function Notificaciones() {
    const { lista, pendientes, leer, leerTodas, eliminarLeidas } = useNotificaciones();
    const [filtro, setFiltro] = useState<FiltroNotificacion>("todas");
    const [texto, setTexto] = useState("");
    const [confirmando, setConfirmando] = useState(false);
    const navegar = useNavigate();
    const visibles = filtrarNotificaciones(lista, filtro, texto);
    const leidas = lista.length - pendientes;

    // Abrir una notificación la marca como leída y lleva a donde se atiende (si esa pantalla ya existe)
    function abrir(notificacion: Notificacion) {
        leer(notificacion.id);
        if (capacidadPanel(notificacion.ruta)) navegar(notificacion.ruta);
    }

    const filtros: { id: FiltroNotificacion; texto: string }[] = [
        { id: "todas", texto: `Todas (${lista.length})` },
        { id: "sin-leer", texto: `Sin leer (${pendientes})` },
        ...AREAS_NOTIFICACION.map((a) => ({ id: a.id as FiltroNotificacion, texto: a.nombre })),
    ];

    return (
        <PanelLayout titulo="Notificaciones">
            <div className="notif">
            <nav className="notif-migas" aria-label="Ruta">
                <Link to="/admin/resumen">Resumen</Link>
                <span aria-hidden="true">›</span>
                <span aria-current="page">Notificaciones</span>
            </nav>

            <header className="notif-encabezado">
                <p className="notif-encabezado__etiqueta">PANEL · NOTIFICACIONES</p>
                <h2>Notificaciones</h2>
                <p className="notif-encabezado__texto">Avisos del panel para el personal. Datos de ejemplo.</p>
            </header>

            <div className="notificaciones-acciones">
                <button type="button" className="boton-panel boton-panel--contorno-verde boton-panel--mediano-alto" onClick={leerTodas} disabled={pendientes === 0}>
                    Marcar todas como leídas
                </button>
                <button type="button" className="boton-panel boton-panel--contorno-verde boton-panel--mediano-alto" onClick={() => setConfirmando(true)} disabled={leidas === 0}>
                    Eliminar leídas
                </button>
            </div>

            <section className="tarjeta-notificaciones" aria-labelledby="titulo-lista">
                <div className="tarjeta-notificaciones__cabecera">
                    <span className="tarjeta-notificaciones__icono"><img src={iconoReloj} alt="" /></span>
                    <h3 id="titulo-lista">Notificaciones del panel</h3>
                </div>

                <div className="tarjeta-notificaciones__filtros">
                    <div className="filtros-notificaciones" role="group" aria-label="Filtrar notificaciones">
                        {filtros.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                className={`filtro-notificacion${filtro === f.id ? " filtro-notificacion--activo" : ""}`}
                                aria-pressed={filtro === f.id}
                                onClick={() => setFiltro(f.id)}
                            >
                                {f.texto}
                            </button>
                        ))}
                    </div>
                    <label className="buscador-notificaciones">
                        <img src={iconoBuscar} alt="" />
                        <span className="solo-lectores">Buscar notificación</span>
                        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar notificación" />
                    </label>
                </div>

                {visibles.length > 0 ? (
                    <ul className="lista-notificaciones">
                        {visibles.map((n) => (
                            <li key={n.id}>
                                <button type="button" className={`notificacion${n.leida ? "" : " notificacion--sin-leer"}`} onClick={() => abrir(n)}>
                                    <span className="notificacion__punto" aria-hidden="true" />
                                    <span className="notificacion__textos">
                                        <span className="notificacion__titulo">
                                            {n.titulo}
                                            {!n.leida && <span className="solo-lectores"> (sin leer)</span>}
                                        </span>
                                        <span className="notificacion__cuando">{n.cuando}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="notificaciones-vacio" role="status">
                        <p className="notificaciones-vacio__titulo">{lista.length === 0 ? "Sin notificaciones" : "No hay notificaciones con ese filtro"}</p>
                        <p>{lista.length === 0 ? "Estás al día." : "Prueba con otro filtro o búsqueda."}</p>
                    </div>
                )}

                <p className="tarjeta-notificaciones__pie" aria-live="polite">Mostrando {visibles.length} de {lista.length} (ejemplo)</p>
            </section>

            {confirmando && (
                <Ventana
                    tono="guinda"
                    icono={iconoAlerta}
                    angosta
                    titulo="¿Eliminar las notificaciones leídas?"
                    texto="Se quitarán de la lista las notificaciones que ya leíste. Las pendientes se conservan y ninguna solicitud ni inscripción cambia."
                    textoConfirmar="Sí, eliminar"
                    alConfirmar={() => { eliminarLeidas(); setConfirmando(false); }}
                    alCerrar={() => setConfirmando(false)}
                />
            )}
            </div>
        </PanelLayout>
    );
}
