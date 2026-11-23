// Admin · Notificaciones (Figma 632:58443), rehecha con las piezas del panel (22 nov 2026, T3): plantilla «Lista» de
// Administración (cifras que filtran, lista con buscador y «Filtros» | lateral del mismo alto) y solo con lo que la
// cuenta puede atender. Los datos siguen siendo de ejemplo (TODO backend en datos.ts); la campana usa el mismo almacén.
import { useContext, useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import PanelLayout from "../PanelLayout";
import { Ventana } from "../Ventana";
import { Migas } from "../componentes";
import { Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, Tarjeta, Vacio, type NombreIcono } from "../piezasPanel";
import { ContextoPanel, capacidadPanel } from "../../../servicios/accesoPanel";
import { AREAS_NOTIFICACION, filtrarNotificaciones, useNotificaciones, type AreaNotificacion, type Notificacion } from "./datos";
import iconoAlerta from "../../../assets/admin/modal-alert.svg";

const ICONO_AREA: Record<AreaNotificacion, NombreIcono> = { contenidos: "contenido", actividades: "calendario", atencion: "mensajes", participantes: "inscripciones" };
const NOMBRE_AREA = Object.fromEntries(AREAS_NOTIFICACION.map((a) => [a.id, a.nombre])) as Record<AreaNotificacion, string>;

export default function Notificaciones() {
    const id = useId();
    const identidad = useContext(ContextoPanel);
    const { lista, pendientes, leer, leerTodas, eliminarLeidas } = useNotificaciones(identidad?.acceso);
    const [estado, setEstado] = useState<"todas" | "sin-leer">("todas");
    const [area, setArea] = useState<AreaNotificacion | "todas">("todas");
    const [texto, setTexto] = useState("");
    const [confirmando, setConfirmando] = useState(false);
    const navegar = useNavigate();

    // Solo las áreas que la cuenta atiende (las de sus notificaciones)
    const areas = AREAS_NOTIFICACION.filter((a) => lista.some((n) => n.area === a.id));
    const cumpleEstado = (n: Notificacion) => estado === "todas" || !n.leida;
    const cumpleArea = (n: Notificacion) => area === "todas" || n.area === area;
    const visibles = filtrarNotificaciones(lista, "todas", texto).filter((n) => cumpleEstado(n) && cumpleArea(n));
    const leidas = lista.length - pendientes;
    const activos = (estado !== "todas" ? 1 : 0) + (area !== "todas" ? 1 : 0);
    const quitarFiltros = () => { setEstado("todas"); setArea("todas"); };

    // Abrir una notificación la marca como leída y lleva a donde se atiende (si esa pantalla ya existe)
    function abrir(n: Notificacion) {
        leer(n.id);
        if (capacidadPanel(n.ruta)) navegar(n.ruta);
    }

    return (
        <PanelLayout titulo="Notificaciones" tema="contenidos paleta">
            <Migas raiz="Resumen" pasos={[["Notificaciones"]]} />
            <div className="pz-pagina">
                <Encabezado titulo="Notificaciones" texto="Lo que llegó para ti en el panel. Abrir una la marca como leída y te lleva a donde se atiende.">
                    <Cifra icono="aviso" tono="vino" valor={pendientes} texto="sin leer" activa={estado === "sin-leer" && area === "todas"} alPresionar={() => { setEstado("sin-leer"); setArea("todas"); }} />
                    <Cifra icono="lista" valor={lista.length} texto="en total" activa={estado === "todas" && area === "todas"} alPresionar={quitarFiltros} />
                </Encabezado>

                <div className="pz-columnas">
                    <Tarjeta icono="aviso" id={`${id}-lista`} titulo="Avisos del panel" className="pz-pendientes"
                        texto={pendientes ? `${pendientes} sin leer; lo más reciente arriba` : "Todo leído; lo más reciente arriba"}>
                        <Buscador etiqueta="Buscar notificación" placeholder="Buscar notificación" valor={texto} alCambiar={setTexto}>
                            <FiltrosAvanzados activos={activos} alQuitar={quitarFiltros} grupos={[
                                { titulo: "Mostrar", valor: estado, alCambiar: (v) => setEstado(v as "todas" | "sin-leer"), opciones: [
                                    { valor: "todas", texto: "Todas", cantidad: lista.filter(cumpleArea).length },
                                    { valor: "sin-leer", texto: "Sin leer", cantidad: lista.filter((n) => !n.leida && cumpleArea(n)).length },
                                ] },
                                ...(areas.length > 1 ? [{ titulo: "Área", valor: area, alCambiar: (v: string) => setArea(v as AreaNotificacion | "todas"), opciones: [
                                    { valor: "todas", texto: "Todas" },
                                    ...areas.map((a) => ({ valor: a.id, texto: a.nombre, cantidad: lista.filter((n) => n.area === a.id && cumpleEstado(n)).length })),
                                ] }] : []),
                            ]} />
                        </Buscador>

                        {visibles.length === 0 ? (
                            lista.length === 0 ? <Vacio titulo="Estás al día" texto="No tienes notificaciones. Cuando llegue algo que atender, aparecerá aquí." />
                                : texto.trim() || activos ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto="No hay notificaciones con esa búsqueda o esos filtros."
                                    accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { setTexto(""); quitarFiltros(); }}>Quitar filtros</button>} />
                                    : <Vacio titulo="Todo leído" texto="Ya leíste todas tus notificaciones." />
                        ) : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lista de notificaciones">
                                <ul className="pz-filas">
                                    {visibles.map((n) => (
                                        <li key={n.id}>
                                            <article className={`pz-fila${n.leida ? "" : " pz-fila--dorado"}`}>
                                                <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={ICONO_AREA[n.area]} /></span>
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{n.titulo}</h4>
                                                    <p className="pz-fila__detalle"><span>{NOMBRE_AREA[n.area]}</span><span>{n.cuando}</span></p>
                                                </div>
                                                {n.leida ? <Chip tono="gris">Leída</Chip> : <Chip tono="dorado">Sin leer</Chip>}
                                                <button type="button" className={`pz-boton pz-boton--chico${n.leida ? " pz-boton--contorno" : ""}`} onClick={() => abrir(n)}>
                                                    {n.leida ? "Ver" : "Atender"}<span className="solo-lectores"> {n.titulo}</span>
                                                </button>
                                            </article>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </Tarjeta>

                    <aside className="pz-lateral" aria-label="Por área y acciones">
                        <Tarjeta icono="lista" id={`${id}-areas`} titulo="Por área" texto="Sin leer de cada sección que atiendes" className="pz-tarjeta--actividades">
                            {areas.length === 0 ? <p className="pz-acciones__nota">Aquí verás cuántas notificaciones tienes por área.</p> : (
                                <dl className="pz-mini-cifras">
                                    {areas.map((a) => {
                                        const n = lista.filter((x) => x.area === a.id && !x.leida).length;
                                        return (
                                            <div key={a.id} className={`pz-mini-cifra pz-mini-cifra--${n ? "dorado" : "gris"}`}>
                                                <dt>{a.nombre}</dt>
                                                <dd>{n}</dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            )}
                            <div className="pz-acciones pz-acciones--pie">
                                <button type="button" className="pz-boton" disabled={pendientes === 0} onClick={leerTodas}>Marcar todas como leídas</button>
                                <button type="button" className="pz-boton pz-boton--guinda pz-boton--contorno" disabled={leidas === 0} onClick={() => setConfirmando(true)}>Eliminar leídas</button>
                                <Link to="/admin/perfil/avisos" className="pz-boton pz-boton--contorno">Avisos que recibo</Link>
                            </div>
                        </Tarjeta>
                    </aside>
                </div>
            </div>

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
        </PanelLayout>
    );
}
