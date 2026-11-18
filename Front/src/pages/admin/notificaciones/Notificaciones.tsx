import { useState } from "react";
import { useNavigate } from "react-router";
import PanelLayout from "../PanelLayout";
import { Ventana } from "../Ventana";
import "./Notificaciones.css";
import { capacidadPanel } from "../../../servicios/accesoPanel";
import { AREAS_NOTIFICACION, filtrarNotificaciones, useNotificaciones, type FiltroNotificacion, type Notificacion } from "./datos";
import iconoReloj from "../../../assets/comun/iconos/reloj-blanco.svg";
import { EncabezadoPagina, EstadoVacio, Migas } from "../componentes";
import { IconoBuscar } from "../contenidos/piezas";
import vacioCheck from "../../../assets/admin/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";
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
        <PanelLayout titulo="Notificaciones" tema="contenidos">
            <div className="notif">
            <Migas raiz="Resumen" pasos={[["Notificaciones"]]} />
            <EncabezadoPagina
                etiqueta="Panel · Notificaciones"
                titulo="Notificaciones"
                texto="Avisos del panel para el personal."
                accion={
                    <div className="notificaciones-acciones">
                        <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={leerTodas} disabled={pendientes === 0}>
                            Marcar todas como leídas
                        </button>
                        <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => setConfirmando(true)} disabled={leidas === 0}>
                            Eliminar leídas
                        </button>
                    </div>
                }
            />

            <section className="contenidos-lista" aria-labelledby="titulo-lista">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><img src={iconoReloj} alt="" className="at-icono" /></span>
                    <div>
                        <h2 id="titulo-lista">Notificaciones del panel</h2>
                        <p>{pendientes ? `${pendientes} sin leer.` : "Estás al día."}</p>
                    </div>
                </div>

                <div className="contenidos-lista__herramientas">
                    <div className="contenidos-filtros" role="group" aria-label="Filtrar notificaciones">
                        {filtros.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                className={`contenidos-filtro${filtro === f.id ? " contenidos-filtro--activo" : ""}`}
                                aria-pressed={filtro === f.id}
                                onClick={() => setFiltro(f.id)}
                            >
                                {f.texto}
                            </button>
                        ))}
                    </div>
                    <label className="contenidos-buscar">
                        <IconoBuscar />
                        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar notificación" aria-label="Buscar notificación" />
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
                    <EstadoVacio
                        icono={lista.length === 0 ? vacioCheck : vacioBuscar}
                        titulo={lista.length === 0 ? "Sin notificaciones" : "No hay notificaciones con ese filtro"}
                        texto={lista.length === 0 ? "Estás al día." : "Prueba con otro filtro o búsqueda."}
                    />
                )}

                <div className="contenidos-lista__pie"><p aria-live="polite">Mostrando {visibles.length} de {lista.length}</p></div>
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
