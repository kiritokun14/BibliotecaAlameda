// Mi cuenta: el perfil del personal dentro del panel (22 nov 2026, T3). Antes, «Mi cuenta» llevaba al perfil del portal
// (el del usuario: credencial, eventos, progreso); ahora el personal tiene el suyo con las piezas y la paleta del panel.
// Plantilla «Formulario» de Administración (como Configuración): la sección a la izquierda | apartados y guardar al lado.
// Mismos servicios que el perfil del portal: /perfil, /perfil/preferencias-avisos y la contraseña con Supabase Auth.
import { useContext, useEffect, useId, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import { Aviso, Chip, Cifra, Dato, Datos, Encabezado, Icono, Tarjeta } from "../piezasPanel";
import { useNotificaciones } from "../notificaciones/datos";
import { EsqueletoDetalle } from "../../../components/portal/Esqueleto";
import { ContextoPanel, nombresRoles } from "../../../servicios/accesoPanel";
import { mensajeError } from "../../../servicios/api";
import { cerrarSesion } from "../../../servicios/auth";
import { consultarPerfil, consultarPreferenciasAvisos, guardarPerfil, guardarPreferenciasAvisos, type PerfilPropio, type PreferenciasAvisos } from "../../../servicios/perfil";
import { cambiarContrasena } from "../../publico/perfil/seguridad";
import { APARTADOS, CANALES, RUTA_PERFIL, accesosPorSeccion, actualizadoEl, fechaLarga, tonoRol, validarContrasena, validarDatos, type SeccionPerfil } from "./utiles";

// Como en la cabecera: los roles del personal; si solo tiene el básico, «Personal de la biblioteca»
const rolesDelPersonal = (texto: string) => texto.split(", ").filter((r) => r && r !== "Usuario / Cliente").join(", ") || "Personal de la biblioteca";
const nombreCompleto = (p: PerfilPropio) => [p.nombres, p.primerApellido, p.segundoApellido].filter(Boolean).join(" ");

export default function PerfilPanel({ seccion }: { seccion: SeccionPerfil }) {
    const identidad = useContext(ContextoPanel);
    const [intento, setIntento] = useState(0);
    const [estado, setEstado] = useState<{ intento: number; perfil?: PerfilPropio; error?: string }>();
    useEffect(() => {
        let vigente = true;
        consultarPerfil()
            .then((perfil) => { if (vigente) setEstado({ intento, perfil }); })
            .catch((e) => { if (vigente) setEstado({ intento, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [intento]);
    const actual = estado?.intento === intento ? estado : undefined;
    const navigate = useNavigate();
    const { pendientes } = useNotificaciones(identidad?.acceso);
    const conAcceso = accesosPorSeccion(identidad?.acceso).filter((s) => s.puede.length).length;
    const apartado = APARTADOS.find((a) => a.valor === seccion)!;
    const perfil = actual?.perfil;

    return (
        <PanelLayout titulo="Mi cuenta" tema="contenidos paleta">
            <Migas raiz="Mi cuenta" pasos={seccion === "resumen" ? [["Resumen"]] : [[apartado.texto]]} />
            <div className="pz-pagina">
                <Encabezado titulo={perfil ? nombreCompleto(perfil) : "Mi cuenta"} texto="Tu cuenta del personal: tus datos, lo que puedes hacer en el panel, los avisos que recibes y tu seguridad.">
                    <Cifra icono="check" valor={conAcceso + 1} texto="secciones del panel" />
                    <Cifra icono="aviso" tono="vino" valor={pendientes} texto="avisos sin leer" alPresionar={() => navigate("/admin/notificaciones")} />
                </Encabezado>

                {!actual ? <EsqueletoDetalle texto="Cargando tu cuenta…" />
                    : actual.error || !perfil ? (
                        <Aviso tono="error" titulo="No se pudo cargar tu cuenta." texto={actual.error}>
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setIntento((x) => x + 1)}>Reintentar</button>
                        </Aviso>
                    ) : seccion === "datos" ? <MisDatos perfil={perfil} alGuardar={(p) => setEstado({ intento, perfil: p })} />
                        : seccion === "avisos" ? <Avisos />
                            : seccion === "seguridad" ? <Seguridad correo={perfil.correo || identidad?.correo || ""} />
                                : <Resumen perfil={perfil} />}
            </div>
        </PanelLayout>
    );
}

// Columnas de cada apartado: la sección a la izquierda; al lado, los apartados y lo que se le pase (guardar)
function Columnas({ actual, children, lateral }: { actual: SeccionPerfil; children: ReactNode; lateral?: ReactNode }) {
    return (
        <div className="pz-columnas pz-columnas--libre">
            <div className="pz-pila">{children}</div>
            <aside className="pz-lateral" aria-label="Apartados de mi cuenta">
                <nav className="pz-tarjeta pz-apartados" aria-label="Apartados de mi cuenta">
                    {APARTADOS.map((a) => (
                        <Link key={a.valor} to={a.ruta} className={`pz-apartado${actual === a.valor ? " pz-apartado--activa" : ""}`} aria-current={actual === a.valor ? "page" : undefined}>
                            <span className="pz-apartado__icono" aria-hidden="true"><Icono nombre={a.icono} /></span>
                            <span className="pz-apartado__textos"><span className="pz-apartado__nombre">{a.texto}</span><span className="pz-apartado__detalle">{a.detalle}</span></span>
                        </Link>
                    ))}
                </nav>
                {lateral}
            </aside>
        </div>
    );
}

// Tarjeta de guardar (como en Configuración): dice si hay cambios, con «Guardar» primero
function Guardar({ cambios, guardando, alGuardar, alDeshacer, aviso, error }: { cambios: boolean; guardando: boolean; alGuardar: () => void; alDeshacer: () => void; aviso: string; error: string }) {
    return (
        <section className={`pz-tarjeta pz-guardar${cambios ? " pz-guardar--cambios" : ""}`} aria-label="Guardar cambios">
            <p className="pz-guardar__estado" role="status"><span className="pz-guardar__punto" aria-hidden="true" />{cambios ? "Tienes cambios sin guardar" : "Sin cambios por ahora"}</p>
            <div className="pz-acciones">
                <button type="button" className="pz-boton" disabled={!cambios || guardando} onClick={alGuardar}>{guardando ? "Guardando…" : "Guardar"}</button>
                <button type="button" className="pz-boton pz-boton--contorno" disabled={!cambios || guardando} onClick={alDeshacer}>Deshacer cambios</button>
            </div>
            {aviso && <Aviso titulo={aviso} />}
            {error && <Aviso tono="error" titulo="No se guardó." texto={error} />}
        </section>
    );
}

// ---------- Mi cuenta (resumen) ----------
function Resumen({ perfil }: { perfil: PerfilPropio }) {
    const id = useId();
    const identidad = useContext(ContextoPanel);
    const acceso = identidad?.acceso;
    const secciones = accesosPorSeccion(acceso);
    const conAcceso = secciones.filter((s) => s.puede.length);
    const sinAcceso = secciones.filter((s) => !s.puede.length).map((s) => s.texto);
    const tono = tonoRol(acceso);
    const actualizado = actualizadoEl(perfil.actualizadoA);
    const { pendientes } = useNotificaciones(acceso);
    const correo = perfil.correo || identidad?.correo;

    const lateral = (
        <Tarjeta icono="cuentas" id={`${id}-estado`} titulo="Tu cuenta" texto="Estado y atajos" className="pz-tarjeta--acciones">
            <div className="pz-estado-cuenta">
                <p className="pz-estado-cuenta__titulo">Cuenta activa</p>
                <p>Entras al portal y al panel con {correo}.</p>
            </div>
            <div className="pz-acciones">
                <Link to={`${RUTA_PERFIL}/datos`} className="pz-boton">Editar mis datos</Link>
                <Link to={`${RUTA_PERFIL}/seguridad`} className="pz-boton pz-boton--contorno">Cambiar contraseña</Link>
                <Link to="/admin/notificaciones" className="pz-boton pz-boton--contorno">{pendientes ? (pendientes === 1 ? "Ver 1 aviso sin leer" : `Ver ${pendientes} avisos sin leer`) : "Ver notificaciones"}</Link>
            </div>
        </Tarjeta>
    );

    return (
        <Columnas actual="resumen" lateral={lateral}>
            <Tarjeta icono="usuario" id={`${id}-cuenta`} titulo="Datos de la cuenta" texto={actualizado ? `Actualizados el ${actualizado}` : "Lo que tiene registrado la biblioteca"}>
                <div className={`pz-identidad pz-tono-rol--${tono}`}>
                    <span className="pz-rol-avatar pz-identidad__avatar" aria-hidden="true">{(perfil.nombres || perfil.correo || "?").trim().charAt(0).toUpperCase()}</span>
                    <div className="pz-identidad__textos">
                        <p className="pz-identidad__nombre">{nombreCompleto(perfil)}</p>
                        <p className="pz-identidad__correo">{correo}</p>
                        <span className="pz-roles"><span className={`pz-rol pz-tono-rol--${tono}`}>{rolesDelPersonal(acceso ? nombresRoles(acceso) : "")}</span></span>
                    </div>
                </div>
                <Datos>
                    <Dato icono="usuario" etiqueta="Teléfono">{perfil.telefono || "Sin teléfono"}</Dato>
                    <Dato icono="calendario" etiqueta="Fecha de nacimiento">{fechaLarga(perfil.fechaNacimiento)}</Dato>
                    <Dato icono="check" etiqueta="Estado"><Chip tono="verde">Activa</Chip></Dato>
                    <Dato icono="reloj" etiqueta="Últimos cambios">{actualizado || "Sin cambios registrados"}</Dato>
                </Datos>
            </Tarjeta>

            <Tarjeta icono="check" id={`${id}-puede`} titulo="Lo que puedes hacer en el panel" texto="Toca un permiso para ir directo a su pantalla">
                {conAcceso.length === 0 ? <p className="pz-acciones__nota">Por ahora tienes Resumen y Notificaciones, que son de todo el personal.</p> : (
                    <ul className="pz-permisos">
                        {conAcceso.map((s) => (
                            <li key={s.id}>
                                <span className="pz-permisos__icono" aria-hidden="true"><Icono nombre={s.icono} /></span>
                                <div className="pz-permisos__textos">
                                    <p className="pz-permisos__modulo">{s.texto}<span>{s.puede.length} de {s.total}</span></p>
                                    <span className="pz-ranking__barra" aria-hidden="true"><span style={{ width: `${(s.puede.length / s.total) * 100}%` }} /></span>
                                    <div className="pz-etiquetas">
                                        {s.enlaces.map((e) => <Link key={e.ruta} to={e.ruta} className="pz-etiqueta pz-etiqueta--enlace">{e.texto}</Link>)}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {sinAcceso.length > 0 && <p className="pz-acciones__nota">Sin acceso a {listaConY(sinAcceso)}. Si lo necesitas, pídelo a Administración: los cambios de rol quedan en la bitácora de tu cuenta.</p>}
            </Tarjeta>
        </Columnas>
    );
}

// «Contenidos, Actividades y Administración»
const listaConY = (l: string[]) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} y ${l[l.length - 1]}`);

// ---------- Mis datos ----------
function MisDatos({ perfil, alGuardar }: { perfil: PerfilPropio; alGuardar: (p: PerfilPropio) => void }) {
    const id = useId();
    const [nombres, setNombres] = useState(perfil.nombres);
    const [telefono, setTelefono] = useState(perfil.telefono ?? "");
    const [errores, setErrores] = useState<{ nombres?: string; telefono?: string }>({});
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState("");
    const [error, setError] = useState("");
    const cambios = nombres.trim() !== perfil.nombres || telefono.trim() !== (perfil.telefono ?? "");

    async function guardar() {
        const e = validarDatos(nombres, telefono);
        setErrores(e); setAviso(""); setError("");
        if (e.nombres || e.telefono) return;
        setGuardando(true);
        try {
            const actualizado = await guardarPerfil(perfil, { nombres: nombres.trim(), telefono: telefono.trim() });
            alGuardar(actualizado);
            setNombres(actualizado.nombres); setTelefono(actualizado.telefono ?? "");
            setAviso("Tus datos se guardaron.");
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Columnas actual="datos" lateral={<Guardar cambios={cambios} guardando={guardando} alGuardar={() => void guardar()} alDeshacer={() => { setNombres(perfil.nombres); setTelefono(perfil.telefono ?? ""); setErrores({}); }} aviso={aviso} error={error} />}>
            <Tarjeta icono="contenido" id={`${id}-editar`} titulo="Lo que puedes cambiar" texto="Se guarda en tu cuenta y lo ve el personal que te atiende">
                <div className="pz-campos-fila">
                    <label className={`pz-campo pz-campo--lleno${errores.nombres ? " pz-campo--error" : ""}`}>
                        <span>Nombre(s) <span className="contenidos-campo__obligatorio">*</span></span>
                        <input type="text" maxLength={150} autoComplete="given-name" value={nombres} aria-invalid={!!errores.nombres} onChange={(e) => { setNombres(e.target.value); setAviso(""); }} />
                        {errores.nombres && <small className="pz-campo__error" role="alert">{errores.nombres}</small>}
                    </label>
                    <label className={`pz-campo pz-campo--lleno${errores.telefono ? " pz-campo--error" : ""}`}>
                        <span>Teléfono <span className="contenidos-campo__obligatorio">*</span></span>
                        <input type="tel" inputMode="numeric" maxLength={10} autoComplete="tel" value={telefono} aria-invalid={!!errores.telefono} onChange={(e) => { setTelefono(e.target.value.replace(/\D/g, "")); setAviso(""); }} />
                        {errores.telefono ? <small className="pz-campo__error" role="alert">{errores.telefono}</small> : <small className="pz-campo__ayuda">10 dígitos, sin espacios</small>}
                    </label>
                </div>
            </Tarjeta>
            <Tarjeta icono="cuentas" id={`${id}-fijos`} titulo="Lo que cambia Administración" texto="Para corregirlos, pide apoyo a quien administra las cuentas">
                <Datos>
                    <Dato icono="usuario" etiqueta="Primer apellido">{perfil.primerApellido}</Dato>
                    <Dato icono="usuario" etiqueta="Segundo apellido">{perfil.segundoApellido || "Sin registrar"}</Dato>
                    <Dato icono="calendario" etiqueta="Fecha de nacimiento">{fechaLarga(perfil.fechaNacimiento)}</Dato>
                    <Dato ancho icono="mensajes" etiqueta="Correo">{perfil.correo}</Dato>
                </Datos>
            </Tarjeta>
        </Columnas>
    );
}

// ---------- Avisos que recibo ----------
function Avisos() {
    const id = useId();
    const [intento, setIntento] = useState(0);
    const [carga, setCarga] = useState<{ intento: number; datos?: PreferenciasAvisos; error?: string }>();
    const [elegidas, setElegidas] = useState<PreferenciasAvisos>();
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState("");
    const [error, setError] = useState("");
    useEffect(() => {
        let vigente = true;
        consultarPreferenciasAvisos()
            .then((datos) => { if (vigente) { setCarga({ intento, datos }); setElegidas(datos); } })
            .catch((e) => { if (vigente) setCarga({ intento, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [intento]);
    const guardadas = carga?.intento === intento ? carga.datos : undefined;
    const cambios = !!guardadas && !!elegidas && (guardadas.canalPreferido !== elegidas.canalPreferido || guardadas.recibirAvisosActividades !== elegidas.recibirAvisosActividades || guardadas.recibirAvisosComunidad !== elegidas.recibirAvisosComunidad);
    const cambiar = (c: Partial<PreferenciasAvisos>) => { setElegidas((x) => (x ? { ...x, ...c } : x)); setAviso(""); };

    async function guardar() {
        if (!elegidas) return;
        setGuardando(true); setAviso(""); setError("");
        try {
            const nuevas = await guardarPreferenciasAvisos(elegidas);
            setCarga({ intento, datos: nuevas }); setElegidas(nuevas);
            setAviso("Tus preferencias se guardaron.");
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setGuardando(false);
        }
    }

    if (carga?.error && carga.intento === intento) {
        return (
            <Columnas actual="avisos">
                <Aviso tono="error" titulo="No se pudieron cargar tus preferencias." texto={carga.error}>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setIntento((x) => x + 1)}>Reintentar</button>
                </Aviso>
            </Columnas>
        );
    }
    return (
        <Columnas actual="avisos" lateral={elegidas && <Guardar cambios={cambios} guardando={guardando} alGuardar={() => void guardar()} alDeshacer={() => guardadas && setElegidas(guardadas)} aviso={aviso} error={error} />}>
            {!elegidas ? <EsqueletoDetalle texto="Cargando tus preferencias…" /> : (
                <>
                    <Tarjeta icono="aviso" id={`${id}-canal`} titulo="Cómo prefieres que te avisemos" texto="Los avisos del panel siempre aparecen en la campana de Notificaciones">
                        <div className="pz-pastillas" role="group" aria-label="Canal preferido">
                            {CANALES.map((c) => (
                                <button key={c.valor} type="button" aria-pressed={elegidas.canalPreferido === c.valor} className={`pz-pastilla${elegidas.canalPreferido === c.valor ? " pz-pastilla--elegida" : ""}`} onClick={() => cambiar({ canalPreferido: c.valor })}>{c.texto}</button>
                            ))}
                        </div>
                    </Tarjeta>
                    <Tarjeta icono="lista" id={`${id}-tipos`} titulo="Qué avisos recibes" texto="Puedes cambiarlo cuando quieras">
                        <label className={`pz-casilla${elegidas.recibirAvisosActividades ? " pz-casilla--elegida" : ""}`}>
                            <input type="checkbox" checked={elegidas.recibirAvisosActividades} onChange={(e) => cambiar({ recibirAvisosActividades: e.target.checked })} />
                            <span><strong>Actividades</strong><small>Inscripciones, cambios de horario y recordatorios de las actividades.</small></span>
                        </label>
                        <label className={`pz-casilla${elegidas.recibirAvisosComunidad ? " pz-casilla--elegida" : ""}`}>
                            <input type="checkbox" checked={elegidas.recibirAvisosComunidad} onChange={(e) => cambiar({ recibirAvisosComunidad: e.target.checked })} />
                            <span><strong>Comunidad</strong><small>Noticias, novedades y avisos generales de la biblioteca.</small></span>
                        </label>
                    </Tarjeta>
                </>
            )}
        </Columnas>
    );
}

// ---------- Seguridad ----------
function Seguridad({ correo }: { correo: string }) {
    const id = useId();
    const navigate = useNavigate();
    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [saliendo, setSaliendo] = useState(false);
    const requisitos = [
        { texto: "Entre 8 y 128 caracteres", cumple: nueva.length >= 8 && nueva.length <= 128 },
        { texto: "Distinta de la actual", cumple: !!nueva && nueva !== actual },
        { texto: "La confirmación coincide", cumple: !!confirmacion && nueva === confirmacion },
    ];

    async function cambiar() {
        const problema = validarContrasena(actual, nueva, confirmacion);
        setError(problema); setAviso("");
        if (problema) return;
        setGuardando(true);
        try {
            await cambiarContrasena(correo, actual, nueva);
            setActual(""); setNueva(""); setConfirmacion("");
            setAviso("Tu contraseña cambió. Cerramos tus sesiones en otros equipos.");
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setGuardando(false);
        }
    }
    async function salir() {
        setSaliendo(true);
        try { await cerrarSesion(); navigate("/iniciar-sesion"); } catch (e) { setError(mensajeError(e)); setSaliendo(false); }
    }

    return (
        <Columnas actual="seguridad">
            <Tarjeta icono="cuentas" id={`${id}-contrasena`} titulo="Cambiar contraseña" texto="Al cambiarla se cierran tus sesiones en otros equipos">
                <div className="pz-campos-fila pz-campos-fila--tres">
                    <label className="pz-campo pz-campo--lleno"><span>Contraseña actual</span><input type="password" autoComplete="current-password" maxLength={128} value={actual} onChange={(e) => setActual(e.target.value)} /></label>
                    <label className="pz-campo pz-campo--lleno"><span>Nueva contraseña</span><input type="password" autoComplete="new-password" maxLength={128} value={nueva} onChange={(e) => setNueva(e.target.value)} /></label>
                    <label className="pz-campo pz-campo--lleno"><span>Confirma la nueva</span><input type="password" autoComplete="new-password" maxLength={128} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} /></label>
                </div>
                <div className="pz-etiquetas" aria-label="Requisitos de la contraseña">
                    {requisitos.map((r) => <span key={r.texto} className={`pz-etiqueta${r.cumple ? "" : " pz-etiqueta--vacia"}`}>{r.texto}</span>)}
                </div>
                {error && <Aviso tono="error" titulo="No se cambió la contraseña." texto={error} />}
                {aviso && <Aviso titulo={aviso} />}
                <div className="pz-acciones pz-acciones--fila">
                    <button type="button" className="pz-boton" disabled={guardando} onClick={() => void cambiar()}>{guardando ? "Cambiando…" : "Cambiar contraseña"}</button>
                </div>
            </Tarjeta>
            <Tarjeta icono="salir" id={`${id}-sesion`} titulo="Sesión" texto={`Entraste con ${correo}`}>
                <p className="pz-acciones__nota">Cierra tu sesión al terminar, sobre todo si usas un equipo compartido de la biblioteca.</p>
                <div className="pz-acciones pz-acciones--fila">
                    <button type="button" className="pz-boton pz-boton--guinda pz-boton--contorno" disabled={saliendo} onClick={() => void salir()}>{saliendo ? "Cerrando sesión…" : "Cerrar sesión"}</button>
                </div>
            </Tarjeta>
        </Columnas>
    );
}
