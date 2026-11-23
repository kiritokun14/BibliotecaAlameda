// Administración › Cuentas y permisos (Figma 580:39283). Conectada a /administracion/cuentas (servicios/cuentasAtencion.ts).
// Los permisos se guardan como roles + capacidades (así los guarda el backend), no como la matriz ver/crear/editar de Figma.
// 21 nov 2026: con las piezas del panel (como el Resumen): cifras que filtran, lista con scroll interno y lateral del mismo
// alto con los roles; la ficha y los permisos en dos columnas con las acciones al lado.
import { useEffect, useId, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { Ventana, VentanaFormulario } from "../Ventana";
import { enviarEnlaceRecuperacion } from "../../../servicios/auth";
import { mensajeError } from "../../../servicios/api";
import {
    cambiarEstatus, capacidadAdmiteRoles, capacidadesDe, estadoCuenta, guardarAcceso, listarCuentas, nombreCompleto, ocultarCorreo,
    historialCuenta, rolesDe, verCuenta, type CuentaResumen, type HistorialCuenta, type ListaCuentas, type RolPersonal,
} from "../../../servicios/cuentasAtencion";
import { ErrorCarga, Pantalla } from "./comun";
import { useCarga } from "./utiles";
import { Aviso, Buscador, Cifra, Chip, Dato, Datos, Encabezado, FiltrosAvanzados, Icono, LineaHistorial, Paginas, Plegable, Tarjeta, Vacio, type NombreIcono, type TonoEstado } from "../piezasPanel";
import { fechaHora } from "../atencion/comun/fechas";
import modalAlerta from "../../../assets/admin/modal-alert.svg";
import modalCheck from "../../../assets/admin/modal-check.svg";
import modalInfo from "../../../assets/admin/modal-info.svg";

import { EsqueletoDetalle, EsqueletoLista } from "../../../components/portal/Esqueleto";
const RUTA = "/admin/administracion/cuentas";
const POR_PAGINA = 10;

const ROLES: { codigo: RolPersonal; nombre: string; texto: string }[] = [
    { codigo: "editor", nombre: "Editor de contenidos", texto: "Redacta noticias, reseñas y textos del portal." },
    { codigo: "responsable_actividades", nombre: "Coordinación de actividades", texto: "Programa actividades, inscripciones y asistencia." },
    { codigo: "administrador", nombre: "Administración total", texto: "Administra cuentas y permisos del personal." },
];
const NOMBRE_ROL: Record<string, string> = { usuario: "Usuario / Cliente", ...Object.fromEntries(ROLES.map((r) => [r.codigo, r.nombre])) };

// Capacidades agrupadas por módulo del panel (códigos de Back/administracion.py)
const CAPACIDADES: { modulo: string; lista: [string, string][] }[] = [
    { modulo: "Contenidos", lista: [["preparar_contenidos", "Redactar contenidos"], ["publicar_contenidos", "Revisar y publicar contenidos"]] },
    { modulo: "Actividades", lista: [["gestionar_actividades", "Gestionar actividades"], ["registrar_resoluciones_actividades", "Resolver propuestas y espacios"], ["confirmar_inscripciones", "Confirmar inscripciones"], ["registrar_asistencia", "Pasar lista"], ["gestionar_evidencias", "Evidencias privadas"]] },
    { modulo: "Participantes", lista: [["registrar_recompensas", "Progreso y recompensas"], ["validar_credenciales", "Cotejar credenciales"], ["moderar_foro", "Moderar Bibliocomunidad"], ["atender_bibliocomunidad", "Atender solicitudes de Bibliocomunidad"]] },
    { modulo: "Atención", lista: [["atender_contactos", "Contactos y sugerencias"], ["alta_asistida", "Altas asistidas"], ["orientar_recuperacion", "Recuperación asistida"], ["consultar_cuentas_atencion", "Consulta de cuentas"], ["enviar_avisos", "Avisos del portal"]] },
    { modulo: "Administración", lista: [["gestionar_fuentes_asistente", "Fuentes del asistente"], ["consultar_estadisticas", "Estadísticas"]] },
];

const TONO: Record<string, TonoEstado> = { Activa: "verde", "Pendiente de activar": "dorado", Suspendida: "guinda", Bloqueada: "guinda" };
const EstadoChip = ({ c }: { c: CuentaResumen }) => <Chip tono={TONO[estadoCuenta(c)] ?? "gris"}>{estadoCuenta(c)}</Chip>;
const rolesTexto = (c: CuentaResumen) => {
    const personal = rolesDe(c).filter((r) => r !== "usuario");
    return personal.length ? personal.map((r) => NOMBRE_ROL[r] ?? r).join(", ") : "Usuario / Cliente";
};
const esPersonal = (c: CuentaResumen) => rolesDe(c).some((r) => r !== "usuario") || capacidadesDe(c).length > 0;
const inicial = (c: CuentaResumen) => (nombreCompleto(c) || c.correo || "?").trim().charAt(0).toUpperCase();

// Un color por rol (y uno más para quien tiene varios), para reconocerlos de un vistazo (PanelPiezas.css, «Colores de los roles»)
type TonoRol = "usuario" | RolPersonal | "varios";
const rolesPersonal = (c: CuentaResumen) => rolesDe(c).filter((r): r is RolPersonal => ROLES.some((x) => x.codigo === r));
const tonoRol = (c: CuentaResumen): TonoRol => {
    const p = rolesPersonal(c);
    return p.length > 1 ? "varios" : p[0] ?? "usuario";
};
function Roles({ c }: { c: CuentaResumen }) {
    const p = rolesPersonal(c);
    return (
        <span className="pz-roles">
            {(p.length ? p : ["usuario" as const]).map((r) => <span key={r} className={`pz-rol pz-tono-rol--${r}`}>{NOMBRE_ROL[r] ?? r}</span>)}
        </span>
    );
}
const ICONO_MODULO: Record<string, NombreIcono> = { Contenidos: "contenido", Actividades: "calendario", Participantes: "inscripciones", "Atención": "mensajes", "Administración": "cuentas" };
const ACCION_HISTORIAL: Record<string, string> = { asignar_rol: "Se asignó un rol", retirar_rol: "Se retiró un rol", cambiar_estado: "Cambio de estado" };

function ConCuenta({ miga, children }: { miga: string; children: (c: CuentaResumen, recargar: () => void) => ReactNode }) {
    const { id = "" } = useParams();
    const { datos, error, cargando, recargar } = useCarga(id, () => verCuenta(id));
    return (
        <Pantalla migas={[["Cuentas y permisos", RUTA], [miga]]}>
            {cargando && <EsqueletoDetalle texto="Cargando cuenta…" />}
            {error && <ErrorCarga texto={error} alReintentar={recargar} />}
            {datos && <div className="pz-pagina">{children(datos, recargar)}</div>}
        </Pantalla>
    );
}

// Los roles del personal, en el lateral de la lista y del formulario de permisos
function TarjetaRoles({ id }: { id: string }) {
    return (
        <Tarjeta icono="cuentas" id={id} titulo="Roles del personal" texto="Cada rol tiene su color" className="pz-tarjeta--actividades">
            <ul className="pz-actividades">
                {[{ codigo: "usuario", nombre: "Usuario / Cliente", texto: "Rol básico de toda cuenta: perfil, solicitudes, inscripciones y foro." }, ...ROLES,
                    { codigo: "varios", nombre: "Varios roles", texto: "Tiene dos o más roles del personal; ve todo lo de cada uno." }].map((r) => (
                    <li key={r.codigo} className={`pz-leyenda-rol pz-tono-rol--${r.codigo}`}>
                        <span className="pz-leyenda-rol__muestra" aria-hidden="true" />
                        <div className="pz-actividades__textos">
                            <p className="pz-actividades__titulo">{r.nombre}</p>
                            <p className="pz-actividades__detalle">{r.texto}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </Tarjeta>
    );
}

function Reglas({ items }: { items: string[] }) {
    return <Plegable titulo="Cómo funcionan los cambios"><ul>{items.map((t) => <li key={t}>{t}</li>)}</ul></Plegable>;
}
const REGLAS_CUENTAS = [
    "Cada cambio de rol, permiso o estado pide un motivo y queda en la bitácora de la cuenta.",
    "No se puede suspender la última cuenta con Administración total.",
    "Restablecer el acceso envía un enlace a la persona; nadie del personal ve su contraseña.",
];

// ---------- Lista (Figma 580:39284, vacía 580:39765, sin resultados 580:39977, roles 580:41946) ----------

// Filtros avanzados (sobre la página cargada: el backend solo busca por texto)
type Tipo = "todas" | "personal" | "usuarios";
type FiltroRol = "todos" | RolPersonal;
type FiltroEstado = "todos" | "activa" | "pendiente" | "suspendida";
const ESTADOS_FILTRO: { valor: FiltroEstado; texto: string; cumple: (c: CuentaResumen) => boolean }[] = [
    { valor: "activa", texto: "Activas", cumple: (c) => estadoCuenta(c) === "Activa" },
    { valor: "pendiente", texto: "Pendientes de activar", cumple: (c) => estadoCuenta(c) === "Pendiente de activar" },
    { valor: "suspendida", texto: "Suspendidas o bloqueadas", cumple: (c) => c.estatus !== "activo" },
];

export default function CuentasPermisos() {
    const id = useId();
    const [tipo, setTipo] = useState<Tipo>("personal");
    const [rol, setRol] = useState<FiltroRol>("todos");
    const [estado, setEstado] = useState<FiltroEstado>("todos");
    const [texto, setTexto] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const lista = useCarga<ListaCuentas>(JSON.stringify([busqueda, pagina]), () => listarCuentas(busqueda, pagina, POR_PAGINA));

    useEffect(() => {
        const espera = setTimeout(() => { setBusqueda(texto.trim()); setPagina(0); }, 350);
        return () => clearTimeout(espera);
    }, [texto]);

    const cuentas = lista.datos?.cuentas ?? [];
    // Los filtros se aplican a la página cargada (el backend solo filtra por texto)
    const cumpleTipo = (c: CuentaResumen, t: Tipo) => t === "todas" || (t === "personal" ? esPersonal(c) : !esPersonal(c));
    const cumpleRol = (c: CuentaResumen, r: FiltroRol) => r === "todos" || rolesDe(c).includes(r);
    const cumpleEstado = (c: CuentaResumen, e: FiltroEstado) => e === "todos" || !!ESTADOS_FILTRO.find((x) => x.valor === e)?.cumple(c);
    const visibles = cuentas.filter((c) => cumpleTipo(c, tipo) && cumpleRol(c, rol) && cumpleEstado(c, estado));
    // Cuántas hay en cada opción con lo demás ya elegido
    const conteo = (fn: (c: CuentaResumen) => boolean) => cuentas.filter(fn).length;
    const activos = (tipo !== "todas" ? 1 : 0) + (rol !== "todos" ? 1 : 0) + (estado !== "todos" ? 1 : 0);
    const quitarFiltros = () => { setTipo("todas"); setRol("todos"); setEstado("todos"); };
    const total = lista.datos?.total ?? 0;
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const cuenta = (fn: (c: CuentaResumen) => boolean) => (lista.datos ? cuentas.filter(fn).length : "…");
    const suspendidas = (c: CuentaResumen) => c.estatus !== "activo";

    return (
        <Pantalla migas={[["Cuentas y permisos"]]}>
            <div className="pz-pagina">
                <Encabezado titulo="Cuentas y permisos" texto="Quién tiene acceso al panel y qué puede hacer. Cada cambio queda en la bitácora de la cuenta.">
                    <Cifra icono="cuentas" valor={cuenta(esPersonal)} texto="del personal" activa={tipo === "personal" && estado === "todos"} alPresionar={() => { setTipo("personal"); setEstado("todos"); setRol("todos"); }} />
                    <Cifra icono="usuario" valor={cuenta((c) => rolesDe(c).includes("administrador"))} texto="administradores" />
                    <Cifra icono="alerta" tono="vino" valor={cuenta(suspendidas)} texto="suspendidas" activa={estado === "suspendida"} alPresionar={() => { setTipo("todas"); setRol("todos"); setEstado("suspendida"); }} />
                </Encabezado>

                <div className="pz-columnas">
                    <Tarjeta icono="cuentas" id={`${id}-lista`} titulo="Cuentas" texto="Busca por nombre o correo y usa Filtros para personal o usuarios" className="pz-pendientes">
                        <Buscador etiqueta="Buscar por nombre o correo" placeholder="Buscar por nombre o correo" valor={texto} alCambiar={setTexto}>
                            <FiltrosAvanzados activos={activos} alQuitar={quitarFiltros} grupos={[
                                { titulo: "Tipo de cuenta", valor: tipo, alCambiar: (v) => setTipo(v as Tipo), opciones: [
                                    { valor: "todas", texto: "Todas", cantidad: conteo((c) => cumpleRol(c, rol) && cumpleEstado(c, estado)) },
                                    { valor: "personal", texto: "Personal de la biblioteca", cantidad: conteo((c) => esPersonal(c) && cumpleRol(c, rol) && cumpleEstado(c, estado)) },
                                    { valor: "usuarios", texto: "Usuarios", cantidad: conteo((c) => !esPersonal(c) && cumpleRol(c, rol) && cumpleEstado(c, estado)) },
                                ] },
                                { titulo: "Rol", valor: rol, alCambiar: (v) => setRol(v as FiltroRol), opciones: [
                                    { valor: "todos", texto: "Todos" },
                                    ...ROLES.map((r) => ({ valor: r.codigo, texto: r.nombre, cantidad: conteo((c) => rolesDe(c).includes(r.codigo) && cumpleTipo(c, tipo) && cumpleEstado(c, estado)) })),
                                ] },
                                { titulo: "Estado", valor: estado, alCambiar: (v) => setEstado(v as FiltroEstado), opciones: [
                                    { valor: "todos", texto: "Todos" },
                                    ...ESTADOS_FILTRO.map((e) => ({ valor: e.valor, texto: e.texto, cantidad: conteo((c) => e.cumple(c) && cumpleTipo(c, tipo) && cumpleRol(c, rol)) })),
                                ] },
                            ]} />
                        </Buscador>

                        {lista.cargando && <EsqueletoLista texto="Cargando cuentas…" />}
                        {lista.error && <ErrorCarga texto={lista.error} alReintentar={lista.recargar} />}
                        {lista.datos && (visibles.length === 0 ? (
                            busqueda
                                ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto="No hay cuentas con esa búsqueda en esta página."
                                    accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setTexto("")}>Quitar búsqueda</button>} />
                                : <Vacio titulo="No hay cuentas con estos filtros" texto="Prueba con otros filtros o pasa a la siguiente página."
                                    accion={activos ? <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={quitarFiltros}>Quitar filtros</button> : undefined} />
                        ) : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lista de cuentas">
                                <ul className="pz-filas">
                                    {visibles.map((c) => (
                                        <li key={c.id}>
                                            <article className="pz-fila">
                                                <span className={`pz-fila__icono pz-rol-avatar pz-tono-rol--${tonoRol(c)}`} aria-hidden="true">{inicial(c)}</span>
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{nombreCompleto(c) || "Sin nombre"}</h4>
                                                    <p className="pz-fila__detalle"><span>{ocultarCorreo(c.correo)}</span><Roles c={c} /></p>
                                                </div>
                                                <EstadoChip c={c} />
                                                <Link to={`${RUTA}/${c.id}`} className="pz-boton pz-boton--chico">Ver ficha<span className="solo-lectores"> de {nombreCompleto(c)}</span></Link>
                                            </article>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {lista.datos && total > 0 && (
                            <div className="pz-tarjeta__pie">
                                <p aria-live="polite">{visibles.length} de {total} cuentas en esta página</p>
                                <Paginas pagina={pagina + 1} paginas={paginas} alCambiar={(p) => setPagina(p - 1)} />
                            </div>
                        )}
                    </Tarjeta>

                    <aside className="pz-lateral" aria-label="Roles y reglas">
                        <TarjetaRoles id={`${id}-roles`} />
                        <Reglas items={REGLAS_CUENTAS} />
                    </aside>
                </div>
            </div>
        </Pantalla>
    );
}

// ---------- Ficha (Figma 580:40191), restablecer acceso (580:44392), suspender (580:43883) y reactivar ----------

export function FichaPersonal() {
    return <ConCuenta miga="Ficha">{(c) => <Ficha key={`${c.id}:${c.estatus}`} c={c} />}</ConCuenta>;
}

function Ficha({ c }: { c: CuentaResumen }) {
    const id = useId();
    const navigate = useNavigate();
    const [ventana, setVentana] = useState<"restablecer" | "suspender" | "reactivar" | null>(null);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);
    const roles = rolesDe(c);
    const capacidades = capacidadesDe(c);
    const estado = estadoCuenta(c);

    async function ejecutar(accion: () => Promise<unknown>, alTerminar: () => void) {
        setVentana(null);
        setGuardando(true);
        setError("");
        setAviso("");
        try { await accion(); alTerminar(); } catch (e) { setError(mensajeError(e)); } finally { setGuardando(false); }
    }

    return (
        <>
            <Encabezado titulo={nombreCompleto(c) || "Sin nombre"} texto="Ficha de la cuenta: sus datos, lo que puede hacer y su historial.">
                <EstadoChip c={c} />
            </Encabezado>
            {error && <Aviso tono="error" titulo="No se guardó el cambio." texto={error} />}
            {aviso && <Aviso titulo="Enlace enviado." texto={aviso} />}

            <div className="pz-columnas pz-columnas--libre">
                <div className="pz-principal">
                    <Tarjeta icono="usuario" id={`${id}-datos`} titulo="Datos de la cuenta">
                        <div className={`pz-identidad pz-tono-rol--${tonoRol(c)}`}>
                            <span className="pz-rol-avatar pz-identidad__avatar" aria-hidden="true">{inicial(c)}</span>
                            <div className="pz-identidad__textos">
                                <p className="pz-identidad__nombre">{nombreCompleto(c) || "Sin nombre"}</p>
                                <p className="pz-identidad__correo">{c.correo}</p>
                                <Roles c={c} />
                            </div>
                        </div>
                        <Datos>
                            <Dato icono="mensajes" etiqueta="Correo">{c.correoConfirmado ? <Chip tono="verde">Confirmado</Chip> : <Chip tono="dorado">Sin confirmar</Chip>}</Dato>
                            <Dato icono="check" etiqueta="Estado"><EstadoChip c={c} /></Dato>
                            <Dato icono="cuentas" etiqueta="Roles del personal">{rolesPersonal(c).length || "Ninguno"}</Dato>
                            <Dato icono="lista" etiqueta="Capacidades">{capacidades.length}</Dato>
                        </Datos>
                    </Tarjeta>

                    <Tarjeta icono="check" id={`${id}-puede`} titulo="Lo que puede hacer" texto="Capacidades con ámbito global, por módulo">
                        <ul className="pz-permisos">
                            {CAPACIDADES.map((g) => {
                                const tiene = g.lista.filter(([codigo]) => capacidades.includes(codigo)).map(([, nombre]) => nombre);
                                const todas = g.modulo === "Administración" && roles.includes("administrador") ? ["Cuentas y permisos", ...tiene] : tiene;
                                const total = g.lista.length + (g.modulo === "Administración" ? 1 : 0);
                                return (
                                    <li key={g.modulo} className={todas.length ? undefined : "pz-permisos--sin"}>
                                        <span className="pz-permisos__icono" aria-hidden="true"><Icono nombre={ICONO_MODULO[g.modulo] ?? "lista"} /></span>
                                        <div className="pz-permisos__textos">
                                            <p className="pz-permisos__modulo">{g.modulo}<span>{todas.length} de {total}</span></p>
                                            <span className="pz-ranking__barra" aria-hidden="true"><span style={{ width: `${(todas.length / total) * 100}%` }} /></span>
                                            <div className="pz-etiquetas">
                                                {todas.length ? todas.map((t) => <span key={t} className="pz-etiqueta">{t}</span>) : <span className="pz-etiqueta pz-etiqueta--vacia">Sin acceso</span>}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Tarjeta>

                    <HistorialFicha id={c.id} />
                </div>

                <aside className="pz-lateral" aria-label="Acciones de la cuenta">
                    <Tarjeta icono="configuracion" id={`${id}-acciones`} titulo="Acciones" texto="Cada una pide confirmación y queda en la bitácora" className="pz-tarjeta--acciones">
                        <div className={`pz-estado-cuenta pz-estado-cuenta--${TONO[estado] ?? "gris"}`}>
                            <p className="pz-estado-cuenta__titulo">Cuenta {estado.toLowerCase()}</p>
                            <p>{estado === "Activa" ? "Puede entrar al portal y al panel." : estado === "Pendiente de activar" ? "Todavía no confirma su correo." : "No puede entrar al portal ni al panel."}</p>
                        </div>
                        <div className="pz-acciones">
                            <Link to={`${RUTA}/${c.id}/permisos`} className="pz-boton">Cambiar rol y permisos</Link>
                            <button type="button" className="pz-boton pz-boton--contorno" disabled={guardando} onClick={() => setVentana("restablecer")}>Restablecer acceso</button>
                            <p className="pz-acciones__nota">Envía un enlace a {ocultarCorreo(c.correo)} para que elija una nueva contraseña.</p>
                        </div>
                        <div className="pz-acciones pz-acciones--pie">
                            {c.estatus === "activo" && <button type="button" className="pz-boton pz-boton--guinda pz-boton--contorno" disabled={guardando} onClick={() => setVentana("suspender")}>Suspender cuenta</button>}
                            {c.estatus === "inactivo" && <button type="button" className="pz-boton pz-boton--contorno" disabled={guardando} onClick={() => setVentana("reactivar")}>Reactivar cuenta</button>}
                            <Link to={RUTA} className="pz-boton pz-boton--contorno">Volver a Cuentas y permisos</Link>
                        </div>
                    </Tarjeta>
                </aside>
            </div>

            {ventana === "restablecer" && (
                <Ventana tono="dorado" icono={modalInfo} angosta titulo="¿Restablecer el acceso?" texto={`Se enviará un enlace a ${ocultarCorreo(c.correo)} para que la persona elija una nueva contraseña. Tú nunca la ves.`}
                    textoConfirmar="Sí, enviar enlace" alCerrar={() => setVentana(null)}
                    alConfirmar={() => void ejecutar(() => enviarEnlaceRecuperacion(c.correo), () => setAviso(`Se envió el enlace a ${ocultarCorreo(c.correo)}.`))} />
            )}
            {ventana === "suspender" && (
                <VentanaFormulario tono="guinda" icono={modalAlerta} titulo="¿Suspender la cuenta?" texto="La persona no podrá entrar al portal ni al panel. Si es la última cuenta de administración, el sistema no lo permite."
                    textoConfirmar="Sí, suspender" campos={[{ nombre: "motivo", etiqueta: "Motivo", obligatorio: true, placeholder: "Ej.: terminó su servicio en la biblioteca" }]}
                    alConfirmar={(v) => void ejecutar(() => cambiarEstatus(c.id, "inactivo", v.motivo), () => navigate(`${RUTA}/${c.id}/suspendida`))} alCerrar={() => setVentana(null)} />
            )}
            {ventana === "reactivar" && (
                <VentanaFormulario tono="verde" icono={modalCheck} titulo="¿Reactivar la cuenta?" texto="La persona podrá volver a entrar con los roles y permisos que ya tenía."
                    textoConfirmar="Sí, reactivar" campos={[{ nombre: "motivo", etiqueta: "Motivo", obligatorio: true, placeholder: "Ej.: regresó a su puesto" }]}
                    alConfirmar={(v) => void ejecutar(() => cambiarEstatus(c.id, "activo", v.motivo), () => navigate(`${RUTA}/${c.id}/reactivada`))} alCerrar={() => setVentana(null)} />
            )}
        </>
    );
}

// Historial real de la cuenta (/administracion/cuentas/{id}/historial)
function HistorialFicha({ id }: { id: string }) {
    const idTarjeta = useId();
    const historial = useCarga<HistorialCuenta>(`historial:${id}`, () => historialCuenta(id, 6));
    const cambios = historial.datos?.cambios ?? [];
    return (
        <Tarjeta icono="bitacora" id={idTarjeta} titulo="Historial" texto={cambios.length ? `${cambios.length} ${cambios.length === 1 ? "movimiento" : "movimientos"}, lo más reciente arriba` : "Cambios de roles y estado de la cuenta"} className="pz-historial-tarjeta">
            {historial.cargando && <p className="pz-acciones__nota">Cargando el historial…</p>}
            {historial.error && <ErrorCarga titulo="No se pudo cargar el historial." texto={historial.error} alReintentar={historial.recargar} />}
            {historial.datos && (cambios.length === 0
                ? <Vacio icono="bitacora" titulo="Sin cambios todavía" texto="Cuando se cambie un rol o el estado, aparecerá aquí con su motivo." />
                : (
                    <LineaHistorial etiqueta="Historial de la cuenta" movimientos={cambios.map((cambio) => {
                        const tono = cambio.accion === "retirar_rol" ? "guinda" as const : cambio.accion === "cambiar_estado" ? "dorado" as const : "verde" as const;
                        return { titulo: ACCION_HISTORIAL[cambio.accion] ?? cambio.accion, tono, icono: /rol/.test(cambio.accion) ? "usuario" as const : undefined, detalle: fechaHora(cambio.realizadoEn), nota: cambio.motivo ? `Motivo: ${cambio.motivo}` : undefined };
                    })} />
                ))}
        </Tarjeta>
    );
}

// ---------- Rol y permisos (Figma 580:42404, confirmar 580:42910, error 657:52685) ----------

export function PermisosCuenta() {
    return <ConCuenta miga="Rol y permisos">{(c) => <Permisos key={c.id} c={c} />}</ConCuenta>;
}

function Permisos({ c }: { c: CuentaResumen }) {
    const id = useId();
    const navigate = useNavigate();
    const inicialesRoles = rolesDe(c).filter((r): r is RolPersonal => ROLES.some((x) => x.codigo === r));
    const [roles, setRoles] = useState<RolPersonal[]>(inicialesRoles);
    const [capacidades, setCapacidades] = useState<string[]>(capacidadesDe(c));
    const [confirmando, setConfirmando] = useState(false);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    // Una capacidad que ya no corresponde a los roles elegidos no se manda
    const validas = capacidades.filter((cap) => capacidadAdmiteRoles(cap, roles));
    const cambio = JSON.stringify([...roles].sort()) !== JSON.stringify([...inicialesRoles].sort())
        || JSON.stringify([...validas].sort()) !== JSON.stringify(capacidadesDe(c).filter((cap) => capacidadAdmiteRoles(cap, inicialesRoles)).sort());

    function alternarRol(rol: RolPersonal) {
        setRoles((r) => (r.includes(rol) ? r.filter((x) => x !== rol) : [...r, rol]));
    }
    function alternarCapacidad(cap: string) {
        setCapacidades((l) => (l.includes(cap) ? l.filter((x) => x !== cap) : [...l, cap]));
    }

    async function guardar(motivo: string) {
        setConfirmando(false);
        setGuardando(true);
        setError("");
        try {
            await guardarAcceso(c.id, roles, validas, motivo);
            navigate(`${RUTA}/${c.id}/permisos-guardados`);
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setGuardando(false);
        }
    }

    return (
        <>
            <Encabezado titulo={`Rol y permisos de ${nombreCompleto(c) || "la cuenta"}`} texto="Elige los roles y lo que puede hacer en cada módulo. Algunas capacidades requieren un rol." />
            {error && <Aviso tono="error" titulo="No se pudieron guardar los permisos." texto={error} />}

            <div className="pz-columnas pz-columnas--libre">
                <div className="pz-principal">
                    <Tarjeta icono="cuentas" id={`${id}-roles`} titulo="Roles del personal" texto="Usuario / Cliente es automático en toda cuenta">
                        <div className="pz-opciones">
                            {ROLES.map((r) => (
                                <label key={r.codigo} className={`pz-casilla pz-casilla--rol pz-tono-rol--${r.codigo}${roles.includes(r.codigo) ? " pz-casilla--elegida" : ""}`}>
                                    <input type="checkbox" checked={roles.includes(r.codigo)} onChange={() => alternarRol(r.codigo)} disabled={guardando} />
                                    <span><strong><span className="pz-rol-punto" aria-hidden="true" />{r.nombre}</strong><small>{r.texto}</small></span>
                                </label>
                            ))}
                        </div>
                    </Tarjeta>

                    <Tarjeta icono="check" id={`${id}-capacidades`} titulo="Lo que puede hacer" texto="Capacidades con ámbito global, por módulo">
                        {CAPACIDADES.map((g) => (
                            <div key={g.modulo} className="pz-grupo-opciones">
                                <p className="pz-grupo-opciones__titulo">{g.modulo}</p>
                                <div className="pz-opciones">
                                    {g.lista.map(([codigo, nombre]) => {
                                        const admite = capacidadAdmiteRoles(codigo, roles);
                                        const elegida = capacidades.includes(codigo) && admite;
                                        return (
                                            <label key={codigo} className={`pz-casilla${elegida ? " pz-casilla--elegida" : ""}${admite ? "" : " pz-casilla--bloqueada"}`}>
                                                <input type="checkbox" checked={elegida} disabled={!admite || guardando} onChange={() => alternarCapacidad(codigo)} />
                                                <span><strong>{nombre}</strong>{!admite && <small>{codigo === "preparar_contenidos" || codigo === "gestionar_fuentes_asistente" ? "Requiere Editor de contenidos" : "Requiere Coordinación de actividades"}</small>}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </Tarjeta>
                </div>

                <aside className="pz-lateral" aria-label="Guardar los permisos">
                    <Tarjeta icono="configuracion" id={`${id}-guardar`} titulo="Resumen del cambio" texto={cambio ? "Tienes cambios sin guardar" : "Sin cambios por ahora"}>
                        <Datos>
                            <Dato etiqueta="Roles" ancho>{roles.length ? roles.map((r) => NOMBRE_ROL[r]).join(", ") : "Solo Usuario / Cliente"}</Dato>
                            <Dato etiqueta="Capacidades" ancho>{validas.length}</Dato>
                        </Datos>
                        <div className="pz-acciones">
                            <button type="button" className="pz-boton" disabled={guardando || !cambio} onClick={() => setConfirmando(true)}>{guardando ? "Guardando…" : "Guardar permisos"}</button>
                            <button type="button" className="pz-boton pz-boton--contorno" disabled={guardando || !cambio} onClick={() => { setRoles(inicialesRoles); setCapacidades(capacidadesDe(c)); }}>Deshacer cambios</button>
                            <Link to={`${RUTA}/${c.id}`} className="pz-boton pz-boton--contorno">Cancelar</Link>
                            <p className="pz-acciones__nota">Al guardar se pide un motivo; el cambio queda en la bitácora de la cuenta.</p>
                        </div>
                    </Tarjeta>
                </aside>
            </div>

            {confirmando && (
                <VentanaFormulario tono="verde" icono={modalCheck} titulo="¿Guardar el cambio de permisos?"
                    texto={`Roles: ${roles.length ? roles.map((r) => NOMBRE_ROL[r]).join(", ") : "solo Usuario / Cliente"}. Capacidades: ${validas.length}. Queda en la bitácora de la cuenta.`}
                    textoConfirmar="Sí, guardar" campos={[{ nombre: "motivo", etiqueta: "Motivo del cambio", obligatorio: true, placeholder: "Ej.: se integra al equipo de actividades" }]}
                    alConfirmar={(v) => void guardar(v.motivo)} alCerrar={() => setConfirmando(false)} />
            )}
        </>
    );
}

// ---------- Resultados (suspendida 580:43983, reactivada 657:52536, permisos guardados 580:43058) ----------

export function ResultadoPersonal({ tipo }: { tipo: "suspendida" | "reactivada" | "permisos" }) {
    const titulos = { suspendida: "Cuenta suspendida", reactivada: "Cuenta reactivada", permisos: "Permisos guardados" };
    return (
        <ConCuenta miga={titulos[tipo]}>
            {(c) => {
                if (tipo === "suspendida" && c.estatus !== "inactivo") return <Navigate to={`${RUTA}/${c.id}`} replace />;
                if (tipo === "reactivada" && c.estatus !== "activo") return <Navigate to={`${RUTA}/${c.id}`} replace />;
                return (
                    <section className="pz-tarjeta pz-resultado" aria-label={titulos[tipo]}>
                        <Vacio icono={tipo === "suspendida" ? "alerta" : "check"} titulo={titulos[tipo]}
                            texto={`${nombreCompleto(c) || "La cuenta"} (${rolesTexto(c)}). El cambio quedó en la bitácora de la cuenta.`}
                            accion={<div className="pz-resultado__acciones">
                                <Link to={`${RUTA}/${c.id}`} className="pz-boton">Ver la cuenta</Link>
                                <Link to={RUTA} className="pz-boton pz-boton--contorno panel-regresar">Volver a Cuentas y permisos</Link>
                            </div>} />
                    </section>
                );
            }}
        </ConCuenta>
    );
}
