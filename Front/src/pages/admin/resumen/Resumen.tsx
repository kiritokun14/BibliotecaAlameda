import { useContext, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import PanelLayout from "../PanelLayout";
import { AvisoResumenParcial, ResumenCargando, ResumenConError, ResumenSinPendientes } from "../EstadosPanel";
import "./Resumen.css";
import { ContextoPanel, nombresRoles } from "../../../servicios/accesoPanel";
import {
    AREAS,
    NOMBRE_AREA,
    REGLAS,
    accesosDeLaCuenta,
    actividadesHoy,
    contarPorArea,
    filtrarPendientes,
    pendientes,
    prioridades,
    saludo,
    type AreaPendiente,
    type Prioridad,
    type TonoEstado,
    vistaEnlace,
} from "./datos";
import { Icono, type NombreIcono } from "./iconos";

const ICONOS_PRIORIDAD: Record<Prioridad["icono"], NombreIcono> = {
    archivo: "credencial",
    lista: "propuesta",
    usuarios: "inscripciones",
    correo: "mensajes",
};

const FILAS_INICIALES = 5;
const TEMA = "paleta"; // propuesta de paleta institucional (21 nov 2026), por ahora solo en el Resumen

// «sábado 21 de noviembre» → «Sábado 21 de noviembre»
function fechaDeHoy(fecha = new Date()) {
    const texto = fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mazatlan" });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Admin · Resumen (Figma 358:3838), rehecho el 21 nov 2026 para validar el diseño del panel: saludo con la fecha,
// accesos rápidos a las tareas del día, lo más urgente, pendientes de todas las áreas, actividades de hoy y, a un lado,
// contenidos en revisión, roles de la cuenta y reglas. Pensado para personas con poca experiencia: nombres sencillos,
// un ícono por tarea, acciones con texto y la misma jerarquía en todo.
export default function Resumen() {
    const identidad = useContext(ContextoPanel);
    const visibles = prioridades.filter((p) => vistaEnlace(p.ruta, identidad?.acceso) !== "oculto");
    const accesos = accesosDeLaCuenta(identidad?.acceso);
    // Estados del sistema del Resumen (Figma 583:47942, 583:48297, 583:48650, 595:49373).
    // TODO backend: el Resumen todavía usa datos de ejemplo; cuando venga del servidor, estos estados saldrán
    // de la consulta. Mientras, en desarrollo se revisan con ?simular=cargando | error | sin-pendientes | parcial.
    const { search } = useLocation();
    const [simulado, setSimulado] = useState(() => (import.meta.env.DEV ? new URLSearchParams(search).get("simular") : null));
    const reintentar = () => setSimulado(null);
    const vencenHoy = pendientes.filter((p) => p.urgente).length;

    if (simulado === "cargando") return <PanelLayout titulo="Resumen" tema={TEMA}><ResumenCargando /></PanelLayout>;
    if (simulado === "error") return <PanelLayout titulo="Resumen" tema={TEMA}><ResumenConError alReintentar={reintentar} /></PanelLayout>;
    if (simulado === "sin-pendientes") return <PanelLayout titulo="Resumen" tema={TEMA}><ResumenSinPendientes /></PanelLayout>;

    return (
        <PanelLayout titulo="Resumen" tema={TEMA}>
            <div className="rs">
                {simulado === "parcial" && <AvisoResumenParcial alReintentar={reintentar} />}

                {/* 1. Saludo: qué día es y cuánto hay por atender */}
                <header className="rs-saludo">
                    <div className="rs-saludo__textos">
                        <p className="rs-saludo__fecha">{fechaDeHoy()}</p>
                        <h2>{saludo(new Date().getHours())}</h2>
                        <p>Aquí tienes lo que necesita tu atención hoy y los accesos a tus tareas.</p>
                    </div>
                    <ul className="rs-saludo__cifras" aria-label="Resumen del día">
                        <li><strong>{pendientes.length}</strong><span>pendientes</span></li>
                        <li className="rs-saludo__cifra--urgente"><strong>{vencenHoy}</strong><span>vencen hoy</span></li>
                        <li><strong>{actividadesHoy.length}</strong><span>actividades hoy</span></li>
                    </ul>
                </header>

                {/* 2. Accesos rápidos: las tareas de todos los días, solo las que la cuenta puede abrir */}
                {accesos.length > 0 && (
                    <section className="rs-seccion" aria-labelledby="rs-accesos">
                        <div className="rs-seccion__titular">
                            <h2 id="rs-accesos" className="rs-titulo"><span className="rs-titulo__icono"><Icono nombre="lista" /></span>Accesos rápidos</h2>
                            <p className="rs-ayuda">Tus tareas de todos los días. Todo lo demás está en el menú de la izquierda.</p>
                        </div>
                        <ul className="rs-accesos">
                            {accesos.map((a) => (
                                <li key={a.ruta}>
                                    <Link to={a.ruta} className="rs-acceso">
                                        <span className="rs-acceso__icono"><Icono nombre={a.icono} /></span>
                                        <span className="rs-acceso__textos">
                                            <span className="rs-acceso__titulo">{a.titulo}</span>
                                            <span className="rs-acceso__texto">{a.texto}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* 3. Lo más urgente: solo lo que la cuenta puede atender */}
                {visibles.length > 0 && (
                    <section className="rs-seccion" aria-labelledby="rs-urgente">
                        <div className="rs-seccion__titular">
                            <h2 id="rs-urgente" className="rs-titulo"><span className="rs-titulo__icono rs-titulo__icono--vino"><Icono nombre="alerta" /></span>Lo más urgente</h2>
                        </div>
                        <ul className="rs-prioridades">
                            {visibles.map((prioridad) => (
                                <li key={prioridad.titulo}><TarjetaPrioridad prioridad={prioridad} /></li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* 4. Pendientes y actividades | contenidos en revisión, roles y reglas */}
                <div className="rs-columnas">
                    <div className="rs-columna">
                        <TablaPendientes />
                        <Tarjeta icono="hoy" titulo="Actividades de hoy" id="rs-actividades">
                            <ul className="rs-actividades">
                                {actividadesHoy.map((actividad) => (
                                    <li key={actividad.titulo}>
                                        <div>
                                            <p className="rs-actividades__titulo">{actividad.titulo}</p>
                                            <p className="rs-actividades__detalle">{actividad.detalle}</p>
                                        </div>
                                        <ChipEstado tono={actividad.chip.tono}>{actividad.chip.texto}</ChipEstado>
                                        {actividad.pasarLista && (
                                            <Enlace ruta="/admin/actividades/asistencia" className="rs-boton rs-boton--contorno">Pasar lista</Enlace>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </Tarjeta>
                    </div>

                    <aside className="rs-lateral" aria-label="Información de apoyo">
                        <section className="rs-tarjeta rs-indicador" aria-labelledby="rs-revision">
                            <div className="rs-tarjeta__cabecera">
                                <span className="rs-tarjeta__icono"><Icono nombre="contenido" /></span>
                                <h3 id="rs-revision">Contenidos en revisión</h3>
                            </div>
                            <p className="rs-indicador__cifra">3</p>
                            <p className="rs-indicador__texto">Esperan la autorización del administrador.</p>
                            <p className="rs-indicador__tendencia">1 más que la semana pasada</p>
                            <Enlace ruta="/admin/contenidos/revision" className="rs-enlace">Revisar contenidos</Enlace>
                        </section>

                        <Tarjeta icono="usuario" titulo="Roles de tu cuenta" id="rs-roles">
                            <ul className="rs-roles">
                                {rolesDeLaCuenta(identidad ? nombresRoles(identidad.acceso) : "").map((rol) => (
                                    <li key={rol}><span className="rs-roles__marca" aria-hidden="true"><Icono nombre="check" /></span>{rol}</li>
                                ))}
                            </ul>
                        </Tarjeta>

                        <Tarjeta icono="info" titulo="Reglas de operación" id="rs-reglas">
                            <ul className="rs-reglas">
                                {REGLAS.map((regla) => <li key={regla}>{regla}</li>)}
                            </ul>
                        </Tarjeta>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

// Los roles de la cuenta, sin «Usuario / Cliente» (lo tiene todo el personal)
function rolesDeLaCuenta(nombres: string): string[] {
    return nombres.split(", ").filter((r) => r && r !== "Usuario / Cliente");
}

// Enlace a otra pantalla del panel. Si la cuenta no tiene permiso para esa pantalla, no se muestra;
// si esa pantalla aún no existe, el mismo aspecto sin poder presionarse.
function Enlace({ ruta, className, children }: { ruta: string; className: string; children: ReactNode }) {
    const identidad = useContext(ContextoPanel);
    const vista = vistaEnlace(ruta, identidad?.acceso);
    if (vista === "enlace") return <Link to={ruta} className={className}>{children}</Link>;
    if (vista === "oculto") return null;
    return <span className={`${className} rs-sin-enlace`} title="Sección en desarrollo">{children}</span>;
}

function TarjetaPrioridad({ prioridad }: { prioridad: Prioridad }) {
    return (
        <Enlace ruta={prioridad.ruta} className={`rs-prioridad rs-prioridad--${prioridad.chip.tono}`}>
            <span className="rs-prioridad__cabecera">
                <span className="rs-prioridad__icono"><Icono nombre={ICONOS_PRIORIDAD[prioridad.icono]} /></span>
                <ChipEstado tono={prioridad.chip.tono}>{prioridad.chip.texto}</ChipEstado>
            </span>
            <span className="rs-prioridad__titulo">{prioridad.titulo}</span>
            <span className="rs-prioridad__detalle">{prioridad.detalle}</span>
            <span className="rs-prioridad__abrir">Abrir<span className="solo-lectores">: {prioridad.titulo}</span></span>
        </Enlace>
    );
}

function ChipEstado({ tono, children }: { tono: TonoEstado; children: ReactNode }) {
    return (
        <span className={`rs-chip rs-chip--${tono}`}>
            <span className="rs-chip__punto" aria-hidden="true" />
            {children}
        </span>
    );
}

function Tarjeta({ icono, titulo, id, children }: { icono: NombreIcono; titulo: string; id: string; children: ReactNode }) {
    return (
        <section className="rs-tarjeta" aria-labelledby={id}>
            <div className="rs-tarjeta__cabecera">
                <span className="rs-tarjeta__icono"><Icono nombre={icono} /></span>
                <h3 id={id}>{titulo}</h3>
            </div>
            {children}
        </section>
    );
}

// Tabla «Pendientes por atender» con filtro por área y búsqueda por folio o asunto
function TablaPendientes() {
    const [area, setArea] = useState<AreaPendiente | null>(null);
    const [texto, setTexto] = useState("");
    const [todos, setTodos] = useState(false);
    const filtrados = filtrarPendientes(pendientes, area, texto);
    const visibles = todos ? filtrados : filtrados.slice(0, FILAS_INICIALES);
    const conteo = contarPorArea(pendientes);

    return (
        <section className="rs-tarjeta" id="pendientes" aria-labelledby="titulo-pendientes">
            <div className="rs-tarjeta__cabecera">
                <span className="rs-tarjeta__icono"><Icono nombre="lista" /></span>
                <h3 id="titulo-pendientes">Pendientes por atender</h3>
            </div>

            <div className="rs-filtros">
                <div className="rs-pestanas" role="group" aria-label="Filtrar por área">
                    <Pestana activa={area === null} cantidad={pendientes.length} alPresionar={() => setArea(null)}>Todos</Pestana>
                    {AREAS.map((a) => (
                        <Pestana key={a.id} activa={area === a.id} cantidad={conteo[a.id]} alPresionar={() => setArea(a.id)}>{a.nombre}</Pestana>
                    ))}
                </div>
                <label className="rs-buscar">
                    <span className="rs-buscar__etiqueta">Buscar</span>
                    <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Folio o asunto" />
                </label>
            </div>

            <div className="rs-tabla-desplazable" role="region" aria-label="Pendientes por atender" tabIndex={0}>
                <table className="rs-tabla">
                    <thead>
                        <tr>
                            <th scope="col">Folio</th>
                            <th scope="col">Asunto</th>
                            <th scope="col">Área</th>
                            <th scope="col">Responsable</th>
                            <th scope="col">Vence</th>
                            <th scope="col">Estado</th>
                            <th scope="col"><span className="solo-lectores">Acción</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibles.map((p) => (
                            <tr key={p.folio}>
                                <td className="rs-tabla__folio">{p.folio}</td>
                                <td className="rs-tabla__asunto">{p.asunto}</td>
                                <td>{NOMBRE_AREA[p.area]}</td>
                                <td>{p.responsable}</td>
                                <td className={p.urgente ? "rs-tabla__urgente" : undefined}>{p.vence}</td>
                                <td><ChipEstado tono={p.estado.tono}>{p.estado.texto}</ChipEstado></td>
                                <td>
                                    <Enlace ruta={p.ruta} className="rs-boton rs-boton--contorno rs-boton--chico">
                                        Abrir<span className="solo-lectores"> {p.folio}</span>
                                    </Enlace>
                                </td>
                            </tr>
                        ))}
                        {visibles.length === 0 && (
                            <tr><td colSpan={7} className="rs-tabla__vacia">No hay pendientes con esa búsqueda.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="rs-tabla__pie">
                <p aria-live="polite">Mostrando {visibles.length} de {filtrados.length}, los que vencen antes primero</p>
                {filtrados.length > FILAS_INICIALES && (
                    <button type="button" className="rs-boton rs-boton--contorno" onClick={() => setTodos((t) => !t)} aria-expanded={todos}>
                        {todos ? "Ver menos" : "Ver todos los pendientes"}
                    </button>
                )}
            </div>
        </section>
    );
}

function Pestana({ activa, cantidad, alPresionar, children }: { activa: boolean; cantidad: number; alPresionar: () => void; children: string }) {
    return (
        <button type="button" className={`rs-pestana${activa ? " rs-pestana--activa" : ""}`} aria-pressed={activa} onClick={alPresionar}>
            {children}
            <span className="rs-pestana__cantidad">{cantidad}</span>
        </button>
    );
}
