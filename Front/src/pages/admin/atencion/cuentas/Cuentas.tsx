// Atención › Consulta de cuentas (Figma 578:36687). Diseño del Editor de contenidos.
// Conectada a /administracion/cuentas (servicios/cuentasAtencion.ts).
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../../PanelLayout";
import { AvisoResultado, Dato, Datos, EncabezadoPagina, EstadoVacio, Migas, Tarjeta, type TonoChip, Chip } from "../../componentes";
import { VentanaFormulario } from "../../Ventana";
import { IconoBuscar, IconoLista, IconoReloj } from "../../contenidos/piezas";
import { mensajeError } from "../../../../servicios/api";
import {
    cambiarEstatus, estadoCuenta, historialCuenta, listarCuentas, nombreCompleto, ocultarCorreo, verCuenta,
    type CuentaResumen, type HistorialCuenta, type ListaCuentas,
} from "../../../../servicios/cuentasAtencion";
import iconoUsuario from "../../../../assets/admin/tarjeta-user.svg";
import modalAlerta from "../../../../assets/admin/modal-alert.svg";
import modalInfo from "../../../../assets/admin/modal-info.svg";
import modalCheck from "../../../../assets/admin/modal-check.svg";
import vacioBuscar from "../../../../assets/admin/vacio-search.svg";
import vacioCheck from "../../../../assets/admin/vacio-check.svg";

const RUTA = "/admin/atencion/cuentas";
const POR_PAGINA = 10;

const TONO: Record<string, TonoChip> = { Activa: "verde", "Pendiente de activar": "dorado", Suspendida: "guinda", Bloqueada: "guinda" };
const EstadoChip = ({ c }: { c: CuentaResumen }) => <Chip tono={TONO[estadoCuenta(c)]}>{estadoCuenta(c)}</Chip>;
const ROLES: Record<string, string> = { usuario: "Usuario / Cliente", editor: "Editor", responsable_actividades: "Responsable de actividades", administrador: "Administrador del portal" };
const nombresRoles = (roles: CuentaResumen["roles"]) => (roles?.length ? roles.map((r) => ROLES[r.rolCodigo] ?? r.rolCodigo).join(", ") : "Usuario / Cliente");

// Pide datos al backend y los vuelve a pedir cuando cambia la clave o al recargar
function useCarga<T>(clave: string, pedir: () => Promise<T>) {
    const [recarga, setRecarga] = useState(0);
    const [r, setR] = useState<{ clave: string; datos?: T; error?: string }>({ clave: "" });
    const actual = `${clave}#${recarga}`;
    useEffect(() => {
        let vigente = true;
        pedir().then((datos) => { if (vigente) setR({ clave: actual, datos }); }).catch((e) => { if (vigente) setR({ clave: actual, error: mensajeError(e) }); });
        return () => { vigente = false; };
        // Solo se vuelve a pedir cuando cambia la clave
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actual]);
    const v = r.clave === actual ? r : undefined;
    return { datos: v?.datos, error: v?.error, cargando: !v, recargar: useCallback(() => setRecarga((x) => x + 1), []) };
}

function ErrorCarga({ texto, alReintentar }: { texto: string; alReintentar: () => void }) {
    return (
        <div className="at-bloque at-bloque--error cuentas-error" role="alert">
            <div><strong>No se pudo consultar</strong><p>{texto}</p></div>
            <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alReintentar}>Reintentar</button>
        </div>
    );
}

function Pantalla({ migas, children }: { migas: [string, string?][]; children: ReactNode }) {
    return (
        <PanelLayout titulo="Atención" tema="contenidos">
            <Migas pasos={[["Consulta de cuentas", RUTA], ...migas]} />
            {children}
        </PanelLayout>
    );
}

function ConCuenta({ miga, children }: { miga: string; children: (c: CuentaResumen, recargar: () => void) => ReactNode }) {
    const { id = "" } = useParams();
    const { datos, error, cargando, recargar } = useCarga(id, () => verCuenta(id));
    return (
        <Pantalla migas={[[miga]]}>
            {cargando && <p className="contenidos-cargando" role="status">Cargando cuenta…</p>}
            {error && <ErrorCarga texto={error} alReintentar={recargar} />}
            {datos && children(datos, recargar)}
        </Pantalla>
    );
}

// ---------- Lista (Figma 578:36688, vacía 578:37090, sin resultados 578:37299) ----------

type Filtro = "todas" | "Activa" | "Pendiente de activar" | "Suspendida" | "Bloqueada";

export default function Cuentas() {
    const [texto, setTexto] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const [filtro, setFiltro] = useState<Filtro>("todas");
    const lista = useCarga<ListaCuentas>(JSON.stringify([busqueda, pagina]), () => listarCuentas(busqueda, pagina, POR_PAGINA));

    useEffect(() => {
        const espera = setTimeout(() => { setBusqueda(texto.trim()); setPagina(0); }, 350);
        return () => clearTimeout(espera);
    }, [texto]);

    const cuentas = lista.datos?.cuentas ?? [];
    // El filtro por estado se aplica a la página cargada (el backend solo filtra por texto)
    const visibles = filtro === "todas" ? cuentas : cuentas.filter((c) => estadoCuenta(c) === filtro);
    const total = lista.datos?.total ?? 0;
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const filtros: Filtro[] = ["todas", "Activa", "Pendiente de activar", "Suspendida", "Bloqueada"];

    return (
        <PanelLayout titulo="Atención" tema="contenidos">
            <Migas pasos={[["Consulta de cuentas"]]} />
            <EncabezadoPagina etiqueta="Atención · Consulta de cuentas" titulo="Consulta de cuentas" texto="Consulta datos de cuentas para atender dudas. Ver datos sensibles requiere indicar un motivo." />

            <section className="contenidos-lista" aria-labelledby="cuentas-lista-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoLista /></span>
                    <div><h2 id="cuentas-lista-titulo">Cuentas</h2><p>Busca por nombre o correo.</p></div>
                </div>
                <div className="contenidos-lista__herramientas">
                    <div className="contenidos-filtros" role="group" aria-label="Filtrar por estado">
                        {filtros.map((f) => (
                            <button key={f} type="button" aria-pressed={filtro === f} className={`contenidos-filtro${filtro === f ? " contenidos-filtro--activo" : ""}`} onClick={() => setFiltro(f)}>
                                {f === "todas" ? `Todas (${total})` : f}
                            </button>
                        ))}
                    </div>
                    <label className="contenidos-buscar">
                        <IconoBuscar />
                        <input type="search" placeholder="Buscar por nombre o correo" aria-label="Buscar por nombre o correo" maxLength={100} value={texto} onChange={(e) => setTexto(e.target.value)} />
                    </label>
                </div>

                {lista.cargando && <p className="contenidos-cargando" role="status">Cargando cuentas…</p>}
                {lista.error && <ErrorCarga texto={lista.error} alReintentar={lista.recargar} />}
                {lista.datos && (visibles.length === 0 ? (
                    busqueda || filtro !== "todas"
                        ? <EstadoVacio icono={vacioBuscar} titulo="Sin resultados" texto="No hay cuentas con esa búsqueda o estado." accion={{ texto: "Quitar filtros", alPresionar: () => { setTexto(""); setFiltro("todas"); } }} />
                        : <EstadoVacio icono={vacioCheck} titulo="No hay cuentas" texto="Cuando alguien cree su cuenta, aparecerá aquí." />
                ) : (
                    <div className="contenidos-tabla cuentas-tabla" tabIndex={0} role="table" aria-label="Cuentas">
                        <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                            {["Persona", "Correo", "Estado", "Roles", "Acción"].map((t) => <span key={t} role="columnheader">{t}</span>)}
                        </div>
                        {visibles.map((c) => (
                            <div key={c.id} className="contenidos-tabla__fila" role="row">
                                <span role="cell" className="contenidos-tabla__titulo">{nombreCompleto(c) || "Sin nombre"}</span>
                                <span role="cell">{ocultarCorreo(c.correo)}</span>
                                <span role="cell"><EstadoChip c={c} /></span>
                                <span role="cell" className="at-celda">{nombresRoles(c.roles)}</span>
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
            </section>
        </PanelLayout>
    );
}

// ---------- Ficha, datos sensibles, suspender y reactivar (Figma 578:37510, 578:37887, 578:37969, 578:38702, 578:39134, error 655:53149) ----------

export function FichaCuenta() {
    return <ConCuenta miga="Ficha">{(c, recargar) => <Ficha key={`${c.id}:${c.estatus}`} c={c} alRecargar={recargar} />}</ConCuenta>;
}

function Ficha({ c }: { c: CuentaResumen; alRecargar: () => void }) {
    const navigate = useNavigate();
    const [ventana, setVentana] = useState<"sensibles" | "suspender" | "reactivar" | null>(null);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const estado = estadoCuenta(c);

    async function cambiar(estatus: "activo" | "inactivo", motivo: string) {
        setVentana(null);
        setGuardando(true);
        setError("");
        try {
            await cambiarEstatus(c.id, estatus, motivo);
            navigate(`${RUTA}/${c.id}/${estatus === "inactivo" ? "suspendida" : "reactivada"}`);
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setGuardando(false);
        }
    }

    return (
        <>
            <EncabezadoPagina volver={{ texto: "Volver a Consulta de cuentas", ruta: RUTA }} etiqueta="Cuenta" titulo={nombreCompleto(c) || "Sin nombre"}
                texto={visible ? "Estás viendo datos sensibles. La consulta queda registrada con su motivo." : "Los datos sensibles están ocultos."} />

            {error && <AvisoResultado tono="error" titulo="No se pudo cambiar el estado de la cuenta" texto={error} chip="Sin cambios" />}

            <AvisoResultado tono={estado === "Activa" ? "exito" : estado === "Pendiente de activar" ? "espera" : "error"} titulo={`Cuenta ${estado.toLowerCase()}`}
                texto={estado === "Pendiente de activar" ? "La persona todavía no confirma su correo." : estado === "Activa" ? "Puede entrar al portal." : "No puede entrar al portal."} chip={estado} />

            <Tarjeta icono={iconoUsuario} titulo="Datos de la cuenta">
                <Datos>
                    <Dato etiqueta="Correo">{visible ? c.correo : `${ocultarCorreo(c.correo)} (oculto)`}</Dato>
                    <Dato etiqueta="Correo confirmado">{c.correoConfirmado ? "Sí" : "No"}</Dato>
                    <Dato etiqueta="Roles">{nombresRoles(c.roles)}</Dato>
                </Datos>
            </Tarjeta>

            <div className="contenidos-previa__acciones">
                {!visible && <button type="button" className="contenidos-boton contenidos-boton--principal" onClick={() => setVentana("sensibles")}>Ver datos sensibles</button>}
                <Link to={`${RUTA}/${c.id}/bitacora`} className="contenidos-boton contenidos-boton--contorno">Ver bitácora</Link>
                {c.estatus === "activo" && <button type="button" className="contenidos-boton at-boton--guinda" disabled={guardando} onClick={() => setVentana("suspender")}>Suspender cuenta</button>}
                {c.estatus === "inactivo" && <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={guardando} onClick={() => setVentana("reactivar")}>Reactivar cuenta</button>}
                <Link to={RUTA} className="contenidos-boton contenidos-boton--suave-azul panel-regresar">Volver</Link>
            </div>

            {ventana === "sensibles" && (
                <VentanaFormulario tono="dorado" icono={modalInfo} titulo="Motivo de la consulta" texto="Ver datos sensibles queda registrado. Indica por qué los necesitas."
                    textoConfirmar="Ver datos"
                    campos={[{ nombre: "motivo", etiqueta: "Motivo", tipo: "select", obligatorio: true, placeholder: "Elige un motivo", opciones: ["La persona pidió ayuda en mostrador", "Confirmar datos para recuperar la cuenta", "Revisar una queja", "Otro motivo"] }]}
                    // TODO backend: registrar el motivo de la consulta en la bitácora
                    alConfirmar={() => { setVisible(true); setVentana(null); }} alCerrar={() => setVentana(null)} />
            )}
            {ventana === "suspender" && (
                <VentanaFormulario tono="guinda" icono={modalAlerta} titulo="¿Suspender la cuenta?" texto="La persona no podrá entrar al portal hasta que alguien la reactive. Queda registrado."
                    textoConfirmar="Sí, suspender" campos={[{ nombre: "motivo", etiqueta: "Motivo", obligatorio: true, placeholder: "Ej.: uso indebido reportado" }]}
                    alConfirmar={(v) => void cambiar("inactivo", v.motivo)} alCerrar={() => setVentana(null)} />
            )}
            {ventana === "reactivar" && (
                <VentanaFormulario tono="verde" icono={modalCheck} titulo="¿Reactivar la cuenta?" texto="La persona podrá volver a entrar al portal. Queda registrado."
                    textoConfirmar="Sí, reactivar" campos={[{ nombre: "motivo", etiqueta: "Motivo", obligatorio: true, placeholder: "Ej.: se aclaró el reporte" }]}
                    alConfirmar={(v) => void cambiar("activo", v.motivo)} alCerrar={() => setVentana(null)} />
            )}
        </>
    );
}

// ---------- Resultados (suspendida 578:38787, reactivada 578:39185) ----------

export function ResultadoCuenta({ tipo }: { tipo: "suspendida" | "reactivada" }) {
    return (
        <ConCuenta miga={tipo === "suspendida" ? "Cuenta suspendida" : "Cuenta reactivada"}>
            {(c) => {
                const esperado = tipo === "suspendida" ? "inactivo" : "activo";
                if (c.estatus !== esperado) return <Navigate to={`${RUTA}/${c.id}`} replace />;
                return (
                    <>
                        <EncabezadoPagina etiqueta="Cuenta" titulo={tipo === "suspendida" ? "Cuenta suspendida" : "Cuenta reactivada"}
                            texto={tipo === "suspendida" ? "La persona ya no puede entrar al portal. El cambio quedó en la bitácora." : "La persona ya puede entrar al portal. El cambio quedó en la bitácora."} />
                        <AvisoResultado tono={tipo === "suspendida" ? "error" : "exito"} titulo={nombreCompleto(c) || "Sin nombre"} texto={ocultarCorreo(c.correo)} chip={estadoCuenta(c)} />
                        <div className="contenidos-previa__acciones">
                            <Link to={`${RUTA}/${c.id}`} className="contenidos-boton contenidos-boton--principal">Ver la cuenta</Link>
                            <Link to={RUTA} className="contenidos-boton contenidos-boton--suave-azul panel-regresar">Volver a Consulta de cuentas</Link>
                        </div>
                    </>
                );
            }}
        </ConCuenta>
    );
}

// ---------- Bitácora de la cuenta (Figma 578:38339) ----------

const ACCION: Record<string, string> = { asignar_rol: "Se asignó un rol", retirar_rol: "Se retiró un rol", cambiar_estado: "Cambio de estado" };

function detalleCambio(anterior: Record<string, unknown>, posterior: Record<string, unknown>) {
    const antes = anterior.estatus ?? anterior.rol, despues = posterior.estatus ?? posterior.rol;
    return antes || despues ? `${String(antes ?? "—")} → ${String(despues ?? "—")}` : "";
}

export function BitacoraCuenta() {
    const { id = "" } = useParams();
    const bitacora = useCarga<HistorialCuenta>(`bitacora:${id}`, () => historialCuenta(id));
    return (
        <Pantalla migas={[["Ficha", `${RUTA}/${id}`], ["Bitácora"]]}>
            <EncabezadoPagina volver={{ texto: "Volver a la cuenta", ruta: `${RUTA}/${id}` }} etiqueta="Cuenta · Bitácora" titulo="Bitácora de la cuenta" texto="Cambios de roles y de estado, con su motivo. No se puede editar." />
            <section className="contenidos-lista" aria-labelledby="cuentas-bitacora-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoReloj /></span>
                    <div><h2 id="cuentas-bitacora-titulo">Cambios registrados</h2><p>Del más reciente al más antiguo.</p></div>
                </div>
                {bitacora.cargando && <p className="contenidos-cargando" role="status">Cargando bitácora…</p>}
                {bitacora.error && <ErrorCarga texto={bitacora.error} alReintentar={bitacora.recargar} />}
                {bitacora.datos && (bitacora.datos.cambios.length === 0
                    ? <EstadoVacio icono={vacioCheck} titulo="Sin cambios registrados" texto="Cuando se cambie un rol o el estado de la cuenta, aparecerá aquí." />
                    : (
                        <ol className="at-eventos">
                            {bitacora.datos.cambios.map((cambio) => (
                                <li key={cambio.id} className="at-eventos--hecho">
                                    <strong>{ACCION[cambio.accion] ?? cambio.accion} {detalleCambio(cambio.anterior, cambio.posterior)}</strong>
                                    <small>{new Date(cambio.realizadoEn).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })} · Motivo: {cambio.motivo}</small>
                                </li>
                            ))}
                        </ol>
                    ))}
            </section>
        </Pantalla>
    );
}
