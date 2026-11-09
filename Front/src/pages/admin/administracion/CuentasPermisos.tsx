// Administración › Cuentas y permisos (Figma 580:39283). Conectada a /administracion/cuentas (servicios/cuentasAtencion.ts).
// Los permisos se guardan como roles + capacidades (así los guarda el backend), no como la matriz ver/crear/editar de Figma.
import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { AvisoResultado, Chip, Dato, Datos, EncabezadoPagina, EstadoVacio, Tarjeta, type TonoChip } from "../componentes";
import { Ventana, VentanaFormulario } from "../Ventana";
import { IconoAviso, IconoBuscar, IconoLista, IconoReloj } from "../contenidos/piezas";
import { enviarEnlaceRecuperacion } from "../../../servicios/auth";
import { mensajeError } from "../../../servicios/api";
import {
    cambiarEstatus, capacidadAdmiteRoles, capacidadesDe, estadoCuenta, guardarAcceso, listarCuentas, nombreCompleto, ocultarCorreo,
    rolesDe, verCuenta, type CuentaResumen, type ListaCuentas, type RolPersonal,
} from "../../../servicios/cuentasAtencion";
import { ErrorCarga, Pantalla, Pestanas, Resumen } from "./comun";
import { useCarga } from "./utiles";
import iconoUsuario from "../../../assets/admin/tarjeta-user.svg";
import iconoCheck from "../../../assets/admin/tarjeta-check.svg";
import modalAlerta from "../../../assets/admin/modal-alert.svg";
import modalCheck from "../../../assets/admin/modal-check.svg";
import modalInfo from "../../../assets/admin/modal-info.svg";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";
import vacioCheck from "../../../assets/admin/vacio-check.svg";

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

const TONO: Record<string, TonoChip> = { Activa: "verde", "Pendiente de activar": "dorado", Suspendida: "guinda", Bloqueada: "guinda" };
const EstadoChip = ({ c }: { c: CuentaResumen }) => <Chip tono={TONO[estadoCuenta(c)]}>{estadoCuenta(c)}</Chip>;
const rolesTexto = (c: CuentaResumen) => {
    const personal = rolesDe(c).filter((r) => r !== "usuario");
    return personal.length ? personal.map((r) => NOMBRE_ROL[r] ?? r).join(", ") : "Usuario / Cliente";
};
const esPersonal = (c: CuentaResumen) => rolesDe(c).some((r) => r !== "usuario") || capacidadesDe(c).length > 0;

function ConCuenta({ miga, children }: { miga: string; children: (c: CuentaResumen, recargar: () => void) => ReactNode }) {
    const { id = "" } = useParams();
    const { datos, error, cargando, recargar } = useCarga(id, () => verCuenta(id));
    return (
        <Pantalla migas={[["Cuentas y permisos", RUTA], [miga]]}>
            {cargando && <p className="contenidos-cargando" role="status">Cargando cuenta…</p>}
            {error && <ErrorCarga texto={error} alReintentar={recargar} />}
            {datos && children(datos, recargar)}
        </Pantalla>
    );
}

// ---------- Lista y roles (Figma 580:39284, vacía 580:39765, sin resultados 580:39977, roles 580:41946) ----------

type Vista = "cuentas" | "roles";
type Filtro = "personal" | "todas" | "suspendidas";

export default function CuentasPermisos() {
    const [vista, setVista] = useState<Vista>("cuentas");
    const [filtro, setFiltro] = useState<Filtro>("personal");
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
    const visibles = cuentas.filter((c) => filtro === "todas" || (filtro === "personal" ? esPersonal(c) : c.estatus !== "activo"));
    const total = lista.datos?.total ?? 0;
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const enPagina = (fn: (c: CuentaResumen) => boolean) => (lista.datos ? cuentas.filter(fn).length : "…");

    return (
        <Pantalla migas={[["Cuentas y permisos"]]}>
            <EncabezadoPagina etiqueta="Administración · Cuentas y permisos" titulo="Cuentas y permisos" texto="Quién tiene acceso al panel y qué puede hacer. Cada cambio queda en la bitácora de la cuenta." />

            <Resumen tarjetas={[
                { tono: "azul", icono: <IconoLista />, cifra: enPagina(esPersonal), titulo: "Personal en esta página", texto: "Con algún rol o permiso.", activa: filtro === "personal" && vista === "cuentas", alPresionar: () => { setVista("cuentas"); setFiltro("personal"); } },
                { tono: "gris", icono: <IconoReloj />, cifra: enPagina((c) => rolesDe(c).includes("administrador")), titulo: "Administradores", texto: "Acceso total." },
                { tono: "guinda", icono: <IconoAviso />, cifra: enPagina((c) => c.estatus !== "activo"), titulo: "Suspendidas o bloqueadas", texto: "Sin acceso.", activa: filtro === "suspendidas" && vista === "cuentas", alPresionar: () => { setVista("cuentas"); setFiltro("suspendidas"); } },
                { tono: "azul", icono: <IconoLista />, cifra: ROLES.length + 1, titulo: "Roles", texto: "Usuario, Editor, Coordinación y Administración.", activa: vista === "roles", alPresionar: () => setVista("roles") },
            ]} />

            <section className="contenidos-lista" aria-labelledby="ad-cuentas-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoLista /></span>
                    <div><h2 id="ad-cuentas-titulo">{vista === "cuentas" ? "Cuentas" : "Roles y permisos"}</h2><p>{vista === "cuentas" ? "Busca por nombre o correo." : "Qué incluye cada rol. Las capacidades se dan cuenta por cuenta."}</p></div>
                </div>
                <div className="contenidos-lista__herramientas">
                    <Pestanas etiqueta="Vista" valor={vista} alCambiar={setVista} opciones={[{ valor: "cuentas", texto: "Cuentas" }, { valor: "roles", texto: "Roles y permisos" }]} />
                    {vista === "cuentas" && (
                        <label className="contenidos-buscar">
                            <IconoBuscar />
                            <input type="search" placeholder="Buscar por nombre o correo" aria-label="Buscar por nombre o correo" maxLength={100} value={texto} onChange={(e) => setTexto(e.target.value)} />
                        </label>
                    )}
                </div>

                {vista === "roles" ? (
                    <div className="contenidos-tabla ad-tabla-roles" role="table" aria-label="Roles">
                        <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row"><span role="columnheader">Rol</span><span role="columnheader">Qué permite</span></div>
                        <div className="contenidos-tabla__fila" role="row"><span role="cell" className="contenidos-tabla__titulo">Usuario / Cliente</span><span role="cell">Rol básico de toda cuenta: perfil propio, solicitudes, inscripciones y foro.</span></div>
                        {ROLES.map((r) => (
                            <div key={r.codigo} className="contenidos-tabla__fila" role="row"><span role="cell" className="contenidos-tabla__titulo">{r.nombre}</span><span role="cell">{r.texto}</span></div>
                        ))}
                    </div>
                ) : (
                    <>
                        <Pestanas etiqueta="Filtrar cuentas" valor={filtro} alCambiar={setFiltro} opciones={[{ valor: "personal", texto: "Personal" }, { valor: "todas", texto: `Todas (${total})` }, { valor: "suspendidas", texto: "Suspendidas o bloqueadas" }]} />
                        {lista.cargando && <p className="contenidos-cargando" role="status">Cargando cuentas…</p>}
                        {lista.error && <ErrorCarga texto={lista.error} alReintentar={lista.recargar} />}
                        {lista.datos && (visibles.length === 0 ? (
                            busqueda
                                ? <EstadoVacio icono={vacioBuscar} titulo="Sin resultados" texto="No hay cuentas con esa búsqueda en esta página." accion={{ texto: "Quitar búsqueda", alPresionar: () => setTexto("") }} />
                                : <EstadoVacio icono={vacioCheck} titulo="No hay cuentas con este filtro" texto="Prueba con «Todas» o pasa a la siguiente página." />
                        ) : (
                            <div className="contenidos-tabla ad-tabla-cuentas" tabIndex={0} role="table" aria-label="Cuentas">
                                <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                                    {["Persona", "Correo", "Rol", "Estado", "Acción"].map((t) => <span key={t} role="columnheader">{t}</span>)}
                                </div>
                                {visibles.map((c) => (
                                    <div key={c.id} className="contenidos-tabla__fila" role="row">
                                        <span role="cell" className="contenidos-tabla__titulo">{nombreCompleto(c) || "Sin nombre"}</span>
                                        <span role="cell" className="at-celda">{ocultarCorreo(c.correo)}</span>
                                        <span role="cell" className="at-celda">{rolesTexto(c)}</span>
                                        <span role="cell"><EstadoChip c={c} /></span>
                                        <span role="cell"><Link to={`${RUTA}/${c.id}`} className="contenidos-tabla__accion">Abrir →<span className="solo-lectores"> {nombreCompleto(c)}</span></Link></span>
                                    </div>
                                ))}
                            </div>
                        ))}
                        {lista.datos && total > 0 && (
                            <div className="contenidos-lista__pie">
                                <p aria-live="polite">Mostrando {visibles.length} de {total} cuentas</p>
                                <span />
                                <div className="contenidos-paginas" role="group" aria-label="Páginas">
                                    <button type="button" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>‹ Anterior</button>
                                    <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina + 1} de {paginas}</button>
                                    <button type="button" disabled={pagina + 1 >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente ›</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </Pantalla>
    );
}

// ---------- Ficha (Figma 580:40191), restablecer acceso (580:44392), suspender (580:43883) y reactivar ----------

export function FichaPersonal() {
    return <ConCuenta miga="Ficha">{(c) => <Ficha key={`${c.id}:${c.estatus}`} c={c} />}</ConCuenta>;
}

function Ficha({ c }: { c: CuentaResumen }) {
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
            <EncabezadoPagina volver={{ texto: "Volver a Cuentas y permisos", ruta: RUTA }} etiqueta="Cuenta" titulo={nombreCompleto(c) || "Sin nombre"} texto={rolesTexto(c)} />
            {error && <AvisoResultado tono="error" titulo="No se guardó el cambio" texto={error} chip="Sin cambios" />}
            {aviso && <AvisoResultado tono="exito" titulo="Enlace enviado" texto={aviso} chip="Enviado" />}
            <AvisoResultado tono={estado === "Activa" ? "exito" : estado === "Pendiente de activar" ? "espera" : "error"} titulo={`Cuenta ${estado.toLowerCase()}`}
                texto={estado === "Activa" ? "Puede entrar al portal y al panel." : estado === "Pendiente de activar" ? "Todavía no confirma su correo." : "No puede entrar."} chip={estado} />

            <Tarjeta icono={iconoUsuario} titulo="Datos">
                <Datos>
                    <Dato etiqueta="Correo">{c.correo}</Dato>
                    <Dato etiqueta="Rol">{rolesTexto(c)}</Dato>
                    <Dato etiqueta="Correo confirmado">{c.correoConfirmado ? "Sí" : "No"}</Dato>
                </Datos>
            </Tarjeta>

            <Tarjeta icono={iconoCheck} titulo="Lo que puede hacer" subtitulo="Capacidades con ámbito global.">
                <Datos>
                    {CAPACIDADES.map((g) => {
                        const tiene = g.lista.filter(([codigo]) => capacidades.includes(codigo)).map(([, nombre]) => nombre);
                        const total = g.modulo === "Administración" && roles.includes("administrador") ? ["Cuentas y permisos", ...tiene] : tiene;
                        return <Dato key={g.modulo} etiqueta={g.modulo}>{total.length ? total.join(" · ") : "Sin acceso"}</Dato>;
                    })}
                </Datos>
            </Tarjeta>

            <div className="contenidos-previa__acciones">
                <Link to={`${RUTA}/${c.id}/permisos`} className="contenidos-boton contenidos-boton--principal">Cambiar rol y permisos</Link>
                <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={guardando} onClick={() => setVentana("restablecer")}>Restablecer acceso</button>
                {c.estatus === "activo" && <button type="button" className="contenidos-boton at-boton--guinda" disabled={guardando} onClick={() => setVentana("suspender")}>Suspender cuenta</button>}
                {c.estatus === "inactivo" && <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={guardando} onClick={() => setVentana("reactivar")}>Reactivar cuenta</button>}
                <Link to={RUTA} className="contenidos-boton contenidos-boton--suave-azul">Volver</Link>
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

// ---------- Rol y permisos (Figma 580:42404, confirmar 580:42910, error 657:52685) ----------

export function PermisosCuenta() {
    return <ConCuenta miga="Rol y permisos">{(c) => <Permisos key={c.id} c={c} />}</ConCuenta>;
}

function Permisos({ c }: { c: CuentaResumen }) {
    const navigate = useNavigate();
    const inicialesRoles = rolesDe(c).filter((r): r is RolPersonal => ROLES.some((x) => x.codigo === r));
    const [roles, setRoles] = useState<RolPersonal[]>(inicialesRoles);
    const [capacidades, setCapacidades] = useState<string[]>(capacidadesDe(c));
    const [confirmando, setConfirmando] = useState(false);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    // Una capacidad que ya no corresponde a los roles elegidos no se manda
    const validas = capacidades.filter((cap) => capacidadAdmiteRoles(cap, roles));

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
            <EncabezadoPagina volver={{ texto: "Volver a la cuenta", ruta: `${RUTA}/${c.id}` }} etiqueta="Rol y permisos" titulo={nombreCompleto(c) || "Sin nombre"}
                texto="Elige los roles y lo que puede hacer en cada módulo. Algunas capacidades requieren un rol." />
            {error && <AvisoResultado tono="error" titulo="No se pudieron guardar los permisos" texto={error} chip="Sin cambios" />}

            <Tarjeta icono={iconoUsuario} titulo="Roles del personal" subtitulo="Usuario / Cliente es automático en toda cuenta.">
                <div className="ad-opciones">
                    {ROLES.map((r) => (
                        <label key={r.codigo} className={`ad-opcion${roles.includes(r.codigo) ? " ad-opcion--elegida" : ""}`}>
                            <input type="checkbox" checked={roles.includes(r.codigo)} onChange={() => alternarRol(r.codigo)} disabled={guardando} />
                            <span><strong>{r.nombre}</strong><small>{r.texto}</small></span>
                        </label>
                    ))}
                </div>
            </Tarjeta>

            <Tarjeta icono={iconoCheck} titulo="Lo que puede hacer" subtitulo="Capacidades con ámbito global.">
                {CAPACIDADES.map((g) => (
                    <div key={g.modulo} className="ad-grupo">
                        <p className="ad-grupo__titulo">{g.modulo}</p>
                        <div className="ad-opciones">
                            {g.lista.map(([codigo, nombre]) => {
                                const admite = capacidadAdmiteRoles(codigo, roles);
                                const elegida = capacidades.includes(codigo) && admite;
                                return (
                                    <label key={codigo} className={`ad-opcion${elegida ? " ad-opcion--elegida" : ""}${admite ? "" : " ad-opcion--bloqueada"}`}>
                                        <input type="checkbox" checked={elegida} disabled={!admite || guardando} onChange={() => alternarCapacidad(codigo)} />
                                        <span>{nombre}{!admite && <small>{codigo === "preparar_contenidos" || codigo === "gestionar_fuentes_asistente" ? "Requiere Editor de contenidos" : "Requiere Coordinación de actividades"}</small>}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </Tarjeta>

            <div className="contenidos-previa__acciones">
                <button type="button" className="contenidos-boton contenidos-boton--principal" disabled={guardando} onClick={() => setConfirmando(true)}>{guardando ? "Guardando…" : "Guardar permisos"}</button>
                <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={guardando} onClick={() => { setRoles(inicialesRoles); setCapacidades(capacidadesDe(c)); }}>Restablecer valores</button>
                <Link to={`${RUTA}/${c.id}`} className="contenidos-boton contenidos-boton--suave-azul">Cancelar</Link>
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
                    <>
                        <EncabezadoPagina etiqueta="Cuenta" titulo={titulos[tipo]} texto="El cambio quedó en la bitácora de la cuenta." />
                        <AvisoResultado tono={tipo === "suspendida" ? "error" : "exito"} titulo={nombreCompleto(c) || "Sin nombre"} texto={rolesTexto(c)} chip={estadoCuenta(c)} />
                        <div className="contenidos-previa__acciones">
                            <Link to={`${RUTA}/${c.id}`} className="contenidos-boton contenidos-boton--principal">Ver la cuenta</Link>
                            <Link to={RUTA} className="contenidos-boton contenidos-boton--suave-azul">Volver a Cuentas y permisos</Link>
                        </div>
                    </>
                );
            }}
        </ConCuenta>
    );
}
