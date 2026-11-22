// Administración › Configuración del portal (Figma 580:56315). Datos de ejemplo (./datos.ts, TODO backend).
// 21 nov 2026: con las piezas del panel: la sección elegida a la izquierda y, al lado (acompaña al bajar), las secciones y
// la tarjeta de guardar con el estado de los cambios (antes los botones quedaban al final y no se veía si había cambios).
import { useId, useState, type ReactNode } from "react";
import { Ventana } from "../Ventana";
import { simulacion } from "../../../servicios/simulacion";
import {
    CONFIGURACION_INICIAL, guardarConfiguracion, hayCambios, useConfiguracion, validarConfiguracion,
    type Configuracion as Config, type ErroresConfiguracion,
} from "./datos";
import { Pantalla } from "./comun";
import { Aviso, Chip, Encabezado, Icono, Tarjeta, Vacio, type NombreIcono } from "../piezasPanel";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
import modalAlerta from "../../../assets/admin/modal-alert.svg";
import modalInfo from "../../../assets/admin/modal-info.svg";

type Pestana = "general" | "horarios" | "actividades" | "mantenimiento";
const PESTANAS: { valor: Pestana; texto: string; detalle: string; icono: NombreIcono }[] = [
    { valor: "general", texto: "General", detalle: "Nombre, contacto y bienvenida", icono: "info" },
    { valor: "horarios", texto: "Horarios", detalle: "Días de atención y cierres", icono: "reloj" },
    { valor: "actividades", texto: "Actividades", detalle: "Cupo, anticipación y recordatorios", icono: "calendario" },
    { valor: "mantenimiento", texto: "Mantenimiento", detalle: "Aviso en el portal público", icono: "configuracion" },
];

export default function Configuracion() {
    const id = useId();
    const guardada = useConfiguracion();
    const [pestana, setPestana] = useState<Pestana>("general");
    const [c, setC] = useState<Config>(guardada);
    const [errores, setErrores] = useState<ErroresConfiguracion>({});
    const [aviso, setAviso] = useState<"guardado" | "restaurado" | "error" | null>(null);
    const [ventana, setVentana] = useState<"mantenimiento" | "restaurar" | null>(null);
    const [especial, setEspecial] = useState({ fecha: "", motivo: "" });
    const sinGuardar = hayCambios(c, guardada);

    function cambiar<K extends keyof Config>(campo: K, valor: Config[K]) {
        setC((x) => ({ ...x, [campo]: valor }));
        setErrores((e) => ({ ...e, [campo]: undefined }));
        setAviso(null);
    }

    function guardar(nueva = c) {
        const nuevos = validarConfiguracion(nueva);
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) { setAviso(null); return false; }
        // Para revisar el estado de error sin backend: ?simular=error-guardar
        if (simulacion() === "error-guardar") { setAviso("error"); return false; }
        guardarConfiguracion(nueva);
        setAviso("guardado");
        return true;
    }

    const campo = (id: keyof ErroresConfiguracion | "telefono" | "direccion" | "bienvenida", etiqueta: string, control: ReactNode, obligatorio = false, ayuda?: string) => (
        <div className="contenidos-campo">
            <label htmlFor={`cfg-${id}`}>{etiqueta}{obligatorio && <span className="contenidos-campo__obligatorio" aria-label="obligatorio"> *</span>}</label>
            {control}
            {errores[id as keyof ErroresConfiguracion] ? <p className="contenidos-campo__error" role="alert">{errores[id as keyof ErroresConfiguracion]}</p> : ayuda && <p className="contenidos-campo__ayuda">{ayuda}</p>}
        </div>
    );
    const conError = (id: keyof ErroresConfiguracion) => ({ "aria-invalid": !!errores[id], className: errores[id] ? "contenidos-campo--error" : undefined });

    return (
        <Pantalla migas={[["Configuración del portal"]]}>
            <div className="pz-pagina">
            <Encabezado titulo="Configuración del portal" texto="Ajustes generales que ven todas las personas en el portal.">
                <Chip tono={guardada.mantenimiento ? "dorado" : "verde"}>{guardada.mantenimiento ? "Portal en mantenimiento" : "Portal disponible"}</Chip>
            </Encabezado>

            {aviso === "guardado" && <Aviso titulo="Cambios guardados." texto="La configuración se actualizó." />}
            {aviso === "restaurado" && <Aviso tono="espera" titulo="Valores restaurados." texto="Se regresó a la configuración original." />}
            {aviso === "error" && <Aviso tono="error" titulo="No se pudieron guardar los cambios." texto="Lo que escribiste se conserva. Inténtalo de nuevo." />}
            {Object.keys(errores).some((k) => errores[k as keyof ErroresConfiguracion]) && (
                <Aviso tono="error" titulo="Faltan datos." texto="Revisa los campos marcados en cada sección." />
            )}

            <div className="pz-columnas pz-columnas--libre">
            <div className="pz-principal">
            {pestana === "general" && (
                <Tarjeta icono="info" id={`${id}-general`} titulo="Datos de la biblioteca" texto="Se muestran en el pie y en Contacto">
                    <div className="at-fila">
                        {campo("nombre", "Nombre", <input id="cfg-nombre" type="text" value={c.nombre} maxLength={120} onChange={(e) => cambiar("nombre", e.target.value)} {...conError("nombre")} />, true)}
                        {campo("ciudad", "Ciudad", <input id="cfg-ciudad" type="text" value={c.ciudad} maxLength={80} onChange={(e) => cambiar("ciudad", e.target.value)} {...conError("ciudad")} />, true)}
                    </div>
                    <div className="at-fila">
                        {campo("correo", "Correo de contacto", <input id="cfg-correo" type="text" inputMode="email" value={c.correo} maxLength={120} placeholder="correo por confirmar" onChange={(e) => cambiar("correo", e.target.value)} {...conError("correo")} />, true)}
                        {campo("telefono", "Teléfono", <input id="cfg-telefono" type="text" value={c.telefono} maxLength={20} placeholder="Por confirmar" onChange={(e) => cambiar("telefono", e.target.value)} />)}
                    </div>
                    {campo("direccion", "Dirección", <textarea id="cfg-direccion" rows={2} value={c.direccion} maxLength={250} placeholder="Por confirmar" onChange={(e) => cambiar("direccion", e.target.value)} />)}
                    {campo("bienvenida", "Mensaje de bienvenida", <textarea id="cfg-bienvenida" rows={2} value={c.bienvenida} maxLength={200} onChange={(e) => cambiar("bienvenida", e.target.value)} />, false, "Se muestra en la página de inicio.")}
                </Tarjeta>
            )}

            {pestana === "horarios" && (
                <>
                    <Tarjeta icono="reloj" id={`${id}-horario`} titulo="Horario de atención" texto="Marca los días que abre la biblioteca">
                        {errores.horarios && <p className="contenidos-campo__error" role="alert">{errores.horarios}</p>}
                        <div className="ad-dias">
                            {c.horarios.map((h, i) => (
                                <div key={h.dia} className="ad-dia">
                                    <label className="at-casilla"><input type="checkbox" checked={h.abierto} onChange={(e) => cambiar("horarios", c.horarios.map((x, j) => (j === i ? { ...x, abierto: e.target.checked, abre: x.abre || "09:00", cierra: x.cierra || "14:00" } : x)))} />{h.dia}</label>
                                    <input type="time" aria-label={`${h.dia}: abre`} value={h.abre} disabled={!h.abierto} onChange={(e) => cambiar("horarios", c.horarios.map((x, j) => (j === i ? { ...x, abre: e.target.value } : x)))} />
                                    <input type="time" aria-label={`${h.dia}: cierra`} value={h.cierra} disabled={!h.abierto} onChange={(e) => cambiar("horarios", c.horarios.map((x, j) => (j === i ? { ...x, cierra: e.target.value } : x)))} />
                                    <span className="contenidos-nota">{h.abierto ? "Abierto" : "Cerrado"}</span>
                                </div>
                            ))}
                        </div>
                    </Tarjeta>
                    <Tarjeta icono="calendario" id={`${id}-especiales`} titulo="Días especiales" texto="Festivos o cierres que no siguen el horario normal">
                        {c.especiales.length > 0 ? (
                            <ul className="pz-filas pz-especiales">
                                {c.especiales.map((d) => {
                                    const [a, m, dia] = d.fecha.split("-").map(Number);
                                    const fecha = new Date(a, m - 1, dia);
                                    return (
                                        <li key={d.fecha}>
                                            <article className="pz-fila">
                                                <span className="pz-fecha" aria-hidden="true"><strong>{dia}</strong><span>{MESES[m - 1]} {String(a).slice(2)}</span></span>
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{d.motivo}</h4>
                                                    <p className="pz-fila__detalle"><span>{fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><span>Cerrado todo el día</span></p>
                                                </div>
                                                <span />
                                                <button type="button" className="pz-boton pz-boton--guinda pz-boton--contorno pz-boton--chico" onClick={() => cambiar("especiales", c.especiales.filter((x) => x.fecha !== d.fecha))}>
                                                    Quitar<span className="solo-lectores"> {d.motivo}</span>
                                                </button>
                                            </article>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <Vacio icono="calendario" titulo="Sin días especiales" texto="Agrega los festivos o cierres para que el portal no muestre a la biblioteca abierta ese día." />
                        )}
                        <div className="pz-agregar">
                            <p className="pz-agregar__titulo">Agregar un día</p>
                            <div className="pz-agregar__campos">
                                <label className="pz-campo pz-campo--lleno"><span>Fecha</span><input type="date" value={especial.fecha} onChange={(e) => setEspecial((x) => ({ ...x, fecha: e.target.value }))} /></label>
                                <label className="pz-campo pz-campo--lleno"><span>Motivo</span><input type="text" value={especial.motivo} maxLength={80} placeholder="Ej.: Día de muertos" onChange={(e) => setEspecial((x) => ({ ...x, motivo: e.target.value }))} /></label>
                                <button type="button" className="pz-boton" disabled={!especial.fecha || !especial.motivo.trim() || c.especiales.some((d) => d.fecha === especial.fecha)}
                                    onClick={() => { cambiar("especiales", [...c.especiales, { fecha: especial.fecha, motivo: especial.motivo.trim() }].sort((a, b) => a.fecha.localeCompare(b.fecha))); setEspecial({ fecha: "", motivo: "" }); }}>
                                    Agregar
                                </button>
                            </div>
                            {especial.fecha && c.especiales.some((d) => d.fecha === especial.fecha) && <p className="pz-acciones__nota">Ese día ya está en la lista.</p>}
                        </div>
                    </Tarjeta>
                </>
            )}

            {pestana === "actividades" && (
                <Tarjeta icono="calendario" id={`${id}-actividades`} titulo="Reglas de actividades" texto="Valores por defecto al crear una actividad; cada una se puede cambiar después">
                    <div className="pz-reglas-act">
                        <Regla id="cfg-cupoMaximo" icono="inscripciones" titulo="Cupo máximo" texto="Cuántas personas pueden inscribirse a una actividad." unidad="personas"
                            min={1} max={500} valor={c.cupoMaximo} sugeridos={[20, 30, 40, 60]} error={errores.cupoMaximo} alCambiar={(v) => cambiar("cupoMaximo", v)} />
                        <Regla id="cfg-diasAnticipacion" icono="calendario" titulo="Inscripciones abren" texto="Con cuántos días de anticipación se abre el registro." unidad="días antes"
                            min={0} max={60} valor={c.diasAnticipacion} sugeridos={[3, 7, 14, 30]} error={errores.diasAnticipacion} alCambiar={(v) => cambiar("diasAnticipacion", v)} />
                        <Regla id="cfg-recordatorioHoras" icono="aviso" titulo="Recordatorio" texto="Cuándo se avisa a las personas inscritas." unidad="horas antes"
                            min={0} max={168} valor={c.recordatorioHoras} sugeridos={[2, 24, 48, 72]} error={errores.recordatorioHoras} alCambiar={(v) => cambiar("recordatorioHoras", v)} />
                    </div>
                    <div className="pz-nota">
                        <p className="pz-nota__titulo">Así lo verá la gente</p>
                        <p className="pz-nota__texto">
                            Las inscripciones abren <strong>{c.diasAnticipacion === 0 ? "el mismo día" : `${c.diasAnticipacion} ${c.diasAnticipacion === 1 ? "día" : "días"} antes`}</strong>,
                            {" "}con lugar para <strong>{c.cupoMaximo} {c.cupoMaximo === 1 ? "persona" : "personas"}</strong>,
                            {" "}{c.recordatorioHoras === 0 ? <>y <strong>no se envía recordatorio</strong>.</> : <>y se envía un recordatorio <strong>{c.recordatorioHoras} {c.recordatorioHoras === 1 ? "hora" : "horas"} antes</strong>.</>}
                        </p>
                    </div>
                </Tarjeta>
            )}

            {pestana === "mantenimiento" && (
                <Tarjeta icono="configuracion" id={`${id}-mantenimiento`} titulo="Modo mantenimiento" texto="Mientras esté activo, el portal muestra un aviso y el panel sigue disponible">
                    {guardada.mantenimiento
                        ? <Aviso tono="espera" titulo="Mantenimiento activo." texto="El portal público muestra el aviso de mantenimiento." />
                        : <Aviso titulo="Portal disponible." texto="El portal público funciona con normalidad." />}
                    {campo("mensajeMantenimiento", "Mensaje para la gente", <textarea id="cfg-mensajeMantenimiento" rows={2} value={c.mensajeMantenimiento} maxLength={200} onChange={(e) => cambiar("mensajeMantenimiento", e.target.value)} {...conError("mensajeMantenimiento")} />, true)}
                    {guardada.mantenimiento
                        ? <button type="button" className="pz-boton pz-alinear-inicio" onClick={() => { const nueva = { ...c, mantenimiento: false }; setC(nueva); guardar(nueva); }}>Terminar mantenimiento</button>
                        : <button type="button" className="pz-boton pz-boton--guinda pz-alinear-inicio" onClick={() => setVentana("mantenimiento")}>Activar mantenimiento</button>}
                </Tarjeta>
            )}

            </div>

            <aside className="pz-lateral" aria-label="Secciones y guardar">
                <nav className="pz-tarjeta pz-apartados" aria-label="Secciones de la configuración">
                    {PESTANAS.map((p) => (
                        <button key={p.valor} type="button" className={`pz-apartado${pestana === p.valor ? " pz-apartado--activa" : ""}`} aria-current={pestana === p.valor ? "true" : undefined} onClick={() => setPestana(p.valor)}>
                            <span className="pz-apartado__icono" aria-hidden="true"><Icono nombre={p.icono} /></span>
                            <span className="pz-apartado__textos"><span className="pz-apartado__nombre">{p.texto}</span><span className="pz-apartado__detalle">{p.detalle}</span></span>
                        </button>
                    ))}
                </nav>
                <section className={`pz-tarjeta pz-guardar${sinGuardar ? " pz-guardar--cambios" : ""}`} aria-label="Guardar la configuración">
                    <p className="pz-guardar__estado" role="status"><span className="pz-guardar__punto" aria-hidden="true" />{sinGuardar ? "Tienes cambios sin guardar" : "Sin cambios por ahora"}</p>
                    <div className="pz-acciones">
                        <button type="button" className="pz-boton" disabled={!sinGuardar} onClick={() => guardar()}>Guardar cambios</button>
                        <button type="button" className="pz-boton pz-boton--contorno" disabled={!sinGuardar} onClick={() => { setC(guardada); setErrores({}); setAviso(null); }}>Descartar</button>
                        <button type="button" className="pz-boton pz-boton--contorno" onClick={() => setVentana("restaurar")}>Restaurar valores originales</button>
                    </div>
                </section>
            </aside>
            </div>
            </div>

            {ventana === "mantenimiento" && (
                <Ventana tono="guinda" icono={modalAlerta} angosta titulo="¿Activar el modo mantenimiento?" texto="El portal público dejará de mostrar su contenido y verá el mensaje de mantenimiento. El panel sigue disponible."
                    textoConfirmar="Sí, activar" alCerrar={() => setVentana(null)}
                    alConfirmar={() => { const nueva = { ...c, mantenimiento: true }; setVentana(null); if (guardar(nueva)) setC(nueva); }} />
            )}
            {ventana === "restaurar" && (
                <Ventana tono="dorado" icono={modalInfo} angosta titulo="¿Restaurar los valores originales?" texto="Se perderán los cambios guardados en la configuración."
                    textoConfirmar="Sí, restaurar" alCerrar={() => setVentana(null)}
                    alConfirmar={() => { guardarConfiguracion(CONFIGURACION_INICIAL); setC(CONFIGURACION_INICIAL); setErrores({}); setVentana(null); setAviso("restaurado"); }} />
            )}
        </Pantalla>
    );
}

// Una regla de actividades: ícono, qué es, campo con su unidad, rango permitido y valores comunes en pastillas
function Regla({ id, icono, titulo, texto, unidad, min, max, valor, sugeridos, error, alCambiar }: {
    id: string; icono: NombreIcono; titulo: string; texto: string; unidad: string; min: number; max: number; valor: number;
    sugeridos: number[]; error?: string; alCambiar: (v: number) => void;
}) {
    return (
        <section className={`pz-regla${error ? " pz-regla--error" : ""}`} aria-labelledby={`${id}-titulo`}>
            <span className="pz-regla__icono" aria-hidden="true"><Icono nombre={icono} /></span>
            <div className="pz-regla__textos">
                <h4 id={`${id}-titulo`} className="pz-regla__titulo">{titulo}</h4>
                <p className="pz-regla__texto">{texto}</p>
                <div className="pz-regla__sugeridos" role="group" aria-label={`Valores comunes de ${titulo.toLowerCase()}`}>
                    {sugeridos.map((n) => (
                        <button key={n} type="button" className={`pz-pastilla${valor === n ? " pz-pastilla--activa" : ""}`} aria-pressed={valor === n} onClick={() => alCambiar(n)}>{n}</button>
                    ))}
                </div>
            </div>
            <div className="pz-regla__campo">
                <label htmlFor={id} className="solo-lectores">{titulo} ({unidad})</label>
                <div className="pz-regla__control">
                    <input id={id} type="number" min={min} max={max} value={valor} aria-invalid={!!error} aria-describedby={`${id}-ayuda`} onChange={(e) => alCambiar(Number(e.target.value))} />
                    <span>{unidad}</span>
                </div>
                <p id={`${id}-ayuda`} className={error ? "pz-regla__error" : "pz-regla__rango"} role={error ? "alert" : undefined}>{error ?? `Entre ${min} y ${max}`}</p>
            </div>
        </section>
    );
}

