import { useContext, useState, type ReactNode } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Resumen.css";
import { ContextoPanel, PANEL_COMPLETO_DEV, capacidadPanel, nombresRoles } from "../../../servicios/accesoPanel";
import {
    AREAS,
    NOMBRE_AREA,
    REGLAS,
    actividadesHoy,
    contarPorArea,
    filtrarPendientes,
    pendientes,
    prioridades,
    saludo,
    type AreaPendiente,
    type Prioridad,
    type TonoEstado,
} from "./datos";
import circuloGrande from "../../../assets/comun/iconos/bloque-circulo-1.svg";
import circuloChico from "../../../assets/comun/iconos/bloque-circulo-2.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import flechaChica from "../../../assets/admin/resumen-flecha.svg";
import iconoArchivo from "../../../assets/admin/resumen/file-guinda.svg";
import iconoLista from "../../../assets/admin/resumen/list-dorado.svg";
import iconoUsuarios from "../../../assets/admin/resumen/users-verde.svg";
import iconoCorreo from "../../../assets/admin/resumen/mail-verde.svg";
import iconoListaBlanca from "../../../assets/admin/bandeja-list.svg";
import iconoCalendarioBlanco from "../../../assets/admin/tarjeta-calendar.svg";
import iconoArchivoVerde from "../../../assets/admin/resumen/file-verde.svg";
import iconoUsuarioBlanco from "../../../assets/admin/tarjeta-user.svg";
import iconoCheck from "../../../assets/admin/resumen/check-verde.svg";
import iconoInfoBlanco from "../../../assets/admin/tarjeta-info.svg";

const ICONOS_PRIORIDAD: Record<Prioridad["icono"], string> = {
    archivo: iconoArchivo,
    lista: iconoLista,
    usuarios: iconoUsuarios,
    correo: iconoCorreo,
};

const FILAS_INICIALES = 5;

// Una pantalla puede no existir todavía (su sección está «Pronto»): entonces no se enlaza
const existe = (ruta: string) => capacidadPanel(ruta) !== null;

// Admin · Resumen (Figma 358:3838): prioridades del día, pendientes de todas las áreas,
// actividades de hoy, indicador de contenidos, capacidades de la cuenta y reglas.
export default function Resumen() {
    const identidad = useContext(ContextoPanel);
    const urgentes = pendientes.filter((p) => p.urgente).length;

    return (
        <PanelLayout titulo="Resumen">
            <div className="resumen">
                <header className="resumen-encabezado">
                    <p className="resumen-encabezado__etiqueta">RESUMEN · DATOS DE EJEMPLO</p>
                    <h2>{saludo(new Date().getHours())}, equipo de administración</h2>
                    <p className="resumen-encabezado__texto">
                        Hoy hay {urgentes} pendientes que vencen y 5 credenciales por cotejar. Cifras de ejemplo.
                    </p>
                </header>

                <section className="resumen-prioridades" aria-labelledby="titulo-prioridades">
                    <img className="resumen-prioridades__circulo resumen-prioridades__circulo--1" src={circuloGrande} alt="" />
                    <img className="resumen-prioridades__circulo resumen-prioridades__circulo--2" src={circuloChico} alt="" />
                    <div className="resumen-prioridades__titular">
                        <span className="resumen-etiqueta">Prioridades</span>
                        <h2 id="titulo-prioridades">¿Qué necesita tu atención hoy?</h2>
                    </div>
                    <ul className="resumen-prioridades__lista">
                        {prioridades.map((prioridad) => (
                            <li key={prioridad.titulo}>
                                <TarjetaPrioridad prioridad={prioridad} />
                            </li>
                        ))}
                    </ul>
                    <a href="#pendientes" className="boton-resumen boton-resumen--claro">
                        Ver todos los pendientes
                        <img src={flechaBlanca} alt="" />
                    </a>
                </section>

                <p className="resumen-grupo"><span aria-hidden="true" />EN SEGUIMIENTO</p>

                <div className="resumen-columnas">
                    <div className="resumen-columna">
                        <TablaPendientes />
                        <Tarjeta icono={iconoCalendarioBlanco} titulo="Actividades de hoy" texto="Programadas para hoy.">
                            <ul className="resumen-actividades">
                                {actividadesHoy.map((actividad) => (
                                    <li key={actividad.titulo}>
                                        <div>
                                            <p className="resumen-actividades__titulo">{actividad.titulo}</p>
                                            <p className="resumen-actividades__detalle">{actividad.detalle}</p>
                                        </div>
                                        <ChipEstado tono={actividad.chip.tono}>{actividad.chip.texto}</ChipEstado>
                                        {actividad.pasarLista && (
                                            <Enlace ruta="/admin/actividades/asistencia" className="boton-resumen boton-resumen--contorno">
                                                Pasar lista
                                            </Enlace>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </Tarjeta>
                    </div>

                    <aside className="resumen-lateral">
                        <div className="resumen-indicador">
                            <div className="resumen-indicador__cabecera">
                                <span className="resumen-indicador__icono"><img src={iconoArchivoVerde} alt="" /></span>
                                <p>CONTENIDOS EN REVISIÓN</p>
                            </div>
                            <p className="resumen-indicador__cifra">3</p>
                            <p className="resumen-indicador__texto">Esperan autorización del administrador</p>
                            <p className="resumen-indicador__texto">▲ 1 más que la semana pasada (ejemplo)</p>
                        </div>

                        <div className="resumen-capacidades">
                            <div className="resumen-tarjeta__cabecera">
                                <span className="resumen-tarjeta__icono"><img src={iconoUsuarioBlanco} alt="" /></span>
                                <h3>Mis capacidades</h3>
                            </div>
                            <p className="resumen-capacidades__texto">
                                Esta cuenta reúne estos roles del personal; el menú muestra la suma de sus secciones.
                            </p>
                            <ul>
                                {rolesDeLaCuenta(identidad ? nombresRoles(identidad.acceso) : "").map((rol) => (
                                    <li key={rol}><img src={iconoCheck} alt="" />{rol}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="resumen-reglas">
                            <div className="resumen-tarjeta__cabecera">
                                <span className="resumen-tarjeta__icono resumen-tarjeta__icono--dorado"><img src={iconoInfoBlanco} alt="" /></span>
                                <h3>Reglas que aplican a tu trabajo</h3>
                            </div>
                            <ul>
                                {REGLAS.map((regla) => <li key={regla}>{regla}</li>)}
                            </ul>
                        </div>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

// En el modo de desarrollo con todos los permisos se muestran los roles de la cuenta de acceso total (Figma)
function rolesDeLaCuenta(nombres: string): string[] {
    if (PANEL_COMPLETO_DEV) return ["Administrador del portal", "Editor (A-03)", "Responsable de actividades (A-04)", "Servicios Digitales", "Préstamos"];
    return nombres.split(", ").filter((r) => r && r !== "Usuario / Cliente");
}

// Enlace a otra pantalla del panel; si esa pantalla aún no existe, el mismo aspecto sin poder presionarse
function Enlace({ ruta, className, children }: { ruta: string; className: string; children: ReactNode }) {
    if (existe(ruta)) return <Link to={ruta} className={className}>{children}</Link>;
    return <span className={`${className} resumen-sin-enlace`} title="Sección en desarrollo">{children}</span>;
}

function TarjetaPrioridad({ prioridad }: { prioridad: Prioridad }) {
    return (
        <Enlace ruta={prioridad.ruta} className={`resumen-prioridad resumen-prioridad--${prioridad.fondo}`}>
            <span className="resumen-prioridad__textos">
                <span className="resumen-prioridad__icono"><img src={ICONOS_PRIORIDAD[prioridad.icono]} alt="" /></span>
                <span className="resumen-prioridad__titulo">{prioridad.titulo}</span>
                <span className="resumen-prioridad__detalle">{prioridad.detalle}</span>
            </span>
            <span className="resumen-prioridad__accion">
                <span className={`resumen-prioridad__flecha resumen-prioridad__flecha--${prioridad.fondo}`}><img src={flechaChica} alt="" /></span>
                <ChipEstado tono={prioridad.chip.tono}>{prioridad.chip.texto}</ChipEstado>
            </span>
        </Enlace>
    );
}

function ChipEstado({ tono, children }: { tono: TonoEstado; children: ReactNode }) {
    return (
        <span className={`chip-resumen chip-resumen--${tono}`}>
            <span className="chip-resumen__punto" aria-hidden="true" />
            {children}
        </span>
    );
}

function Tarjeta({ icono, titulo, texto, children }: { icono: string; titulo: string; texto: string; children: ReactNode }) {
    return (
        <section className="resumen-tarjeta">
            <div className="resumen-tarjeta__cabecera">
                <span className="resumen-tarjeta__icono"><img src={icono} alt="" /></span>
                <div>
                    <h3>{titulo}</h3>
                    <p>{texto}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

// Tabla «Pendientes por atender» con pestañas por área y búsqueda por folio o asunto
function TablaPendientes() {
    const [area, setArea] = useState<AreaPendiente | null>(null);
    const [texto, setTexto] = useState("");
    const [todos, setTodos] = useState(false);
    const filtrados = filtrarPendientes(pendientes, area, texto);
    const visibles = todos ? filtrados : filtrados.slice(0, FILAS_INICIALES);
    const conteo = contarPorArea(pendientes);

    return (
        <section className="resumen-tarjeta" id="pendientes" aria-labelledby="titulo-pendientes">
            <div className="resumen-tarjeta__cabecera">
                <span className="resumen-tarjeta__icono"><img src={iconoListaBlanca} alt="" /></span>
                <div>
                    <h3 id="titulo-pendientes">Pendientes por atender</h3>
                    <p>Todo lo que espera una decisión del personal, de todas las áreas.</p>
                </div>
            </div>

            <div className="resumen-filtros">
                <div className="resumen-pestanas" role="group" aria-label="Filtrar por área">
                    <Pestana activa={area === null} cantidad={pendientes.length} alPresionar={() => setArea(null)}>Todos</Pestana>
                    {AREAS.map((a) => (
                        <Pestana key={a.id} activa={area === a.id} cantidad={conteo[a.id]} alPresionar={() => setArea(a.id)}>{a.nombre}</Pestana>
                    ))}
                </div>
                <label className="resumen-buscar">
                    <span className="solo-lectores">Buscar pendiente</span>
                    <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar folio o asunto" />
                </label>
            </div>

            <table className="resumen-tabla">
                <thead>
                    <tr>
                        <th scope="col">FOLIO</th>
                        <th scope="col">ASUNTO</th>
                        <th scope="col">ÁREA</th>
                        <th scope="col">RESPONSABLE</th>
                        <th scope="col">VENCE</th>
                        <th scope="col">ESTADO</th>
                        <th scope="col">ACCIÓN</th>
                    </tr>
                </thead>
                <tbody>
                    {visibles.map((p) => (
                        <tr key={p.folio}>
                            <td className="resumen-tabla__folio">{p.folio}</td>
                            <td>{p.asunto}</td>
                            <td>{NOMBRE_AREA[p.area]}</td>
                            <td>{p.responsable}</td>
                            <td className={p.urgente ? "resumen-tabla__urgente" : undefined}>{p.vence}</td>
                            <td><ChipEstado tono={p.estado.tono}>{p.estado.texto}</ChipEstado></td>
                            <td>
                                <Enlace ruta={p.ruta} className="boton-resumen boton-resumen--contorno boton-resumen--fila">
                                    Abrir<span className="solo-lectores"> {p.folio}</span>
                                </Enlace>
                            </td>
                        </tr>
                    ))}
                    {visibles.length === 0 && (
                        <tr><td colSpan={7} className="resumen-tabla__vacia">No hay pendientes con esa búsqueda.</td></tr>
                    )}
                </tbody>
            </table>

            <div className="resumen-tabla__pie">
                <p aria-live="polite">Mostrando {visibles.length} de {filtrados.length} pendientes (ejemplo) · ordenados por vencimiento</p>
                {filtrados.length > FILAS_INICIALES && (
                    <button type="button" className="resumen-enlace" onClick={() => setTodos((t) => !t)} aria-expanded={todos}>
                        {todos ? "Ver menos" : "Ver todos los pendientes →"}
                    </button>
                )}
            </div>
        </section>
    );
}

function Pestana({ activa, cantidad, alPresionar, children }: { activa: boolean; cantidad: number; alPresionar: () => void; children: string }) {
    return (
        <button type="button" className={`resumen-pestana${activa ? " resumen-pestana--activa" : ""}`} aria-pressed={activa} onClick={alPresionar}>
            {children}
            <span className="resumen-pestana__cantidad">{cantidad}</span>
        </button>
    );
}
