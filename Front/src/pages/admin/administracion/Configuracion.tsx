// Administración › Configuración del portal (Figma 580:56315). Diseño del Editor. Datos de ejemplo (./datos.ts, TODO backend).
import { useState, type ReactNode } from "react";
import { AvisoResultado, EncabezadoPagina, Tarjeta } from "../componentes";
import { Ventana } from "../Ventana";
import { simulacion } from "../../../servicios/simulacion";
import {
    CONFIGURACION_INICIAL, guardarConfiguracion, hayCambios, useConfiguracion, validarConfiguracion,
    type Configuracion as Config, type ErroresConfiguracion,
} from "./datos";
import { Pantalla, Pestanas } from "./comun";
import iconoInfo from "../../../assets/admin/tarjeta-info.svg";
import iconoReloj from "../../../assets/admin/tarjeta-clock.svg";
import iconoCalendario from "../../../assets/admin/tarjeta-calendar.svg";
import modalAlerta from "../../../assets/admin/modal-alert.svg";
import modalInfo from "../../../assets/admin/modal-info.svg";

type Pestana = "general" | "horarios" | "actividades" | "mantenimiento";
const PESTANAS: { valor: Pestana; texto: string }[] = [
    { valor: "general", texto: "General" }, { valor: "horarios", texto: "Horarios" }, { valor: "actividades", texto: "Actividades" }, { valor: "mantenimiento", texto: "Mantenimiento" },
];

export default function Configuracion() {
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
        <Pantalla migas={[["Configuración del portal"], [PESTANAS.find((p) => p.valor === pestana)!.texto]]}>
            <EncabezadoPagina etiqueta="Administración · Configuración" titulo="Configuración del portal" texto="Ajustes generales que ven todas las personas. Datos de ejemplo." />
            <div className="ad-barra">
                <Pestanas etiqueta="Sección de la configuración" valor={pestana} alCambiar={setPestana} opciones={PESTANAS} />
                {sinGuardar && <p className="ad-sin-guardar" role="status">Hay cambios sin guardar</p>}
            </div>

            {aviso === "guardado" && <AvisoResultado tono="exito" titulo="Cambios guardados" texto="La configuración se actualizó." chip="Guardado" />}
            {aviso === "restaurado" && <AvisoResultado tono="espera" titulo="Valores restaurados" texto="Se regresó a la configuración original." chip="Restaurado" />}
            {aviso === "error" && <AvisoResultado tono="error" titulo="No se pudieron guardar los cambios" texto="Lo que escribiste se conserva. Inténtalo de nuevo." chip="Sin guardar" />}
            {Object.keys(errores).some((k) => errores[k as keyof ErroresConfiguracion]) && (
                <div className="at-bloque at-bloque--error" role="alert"><strong>Faltan datos</strong><p>Revisa los campos marcados en cada pestaña.</p></div>
            )}

            {pestana === "general" && (
                <Tarjeta icono={iconoInfo} titulo="Datos de la biblioteca">
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
                    <Tarjeta icono={iconoReloj} titulo="Horario de atención" subtitulo="Marca los días que abre la biblioteca.">
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
                    <Tarjeta icono={iconoCalendario} titulo="Días especiales" subtitulo="Días festivos o cierres que no siguen el horario normal.">
                        {c.especiales.length > 0 && (
                            <ul className="at-eventos">
                                {c.especiales.map((d) => (
                                    <li key={d.fecha} className="at-eventos--hecho">
                                        <strong>{d.fecha} · {d.motivo}</strong>
                                        <small><button type="button" className="contenidos-tabla__accion" onClick={() => cambiar("especiales", c.especiales.filter((x) => x.fecha !== d.fecha))}>Quitar<span className="solo-lectores"> {d.fecha}</span></button></small>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="at-fila">
                            <div className="contenidos-campo"><label htmlFor="cfg-esp-fecha">Fecha</label><input id="cfg-esp-fecha" type="date" value={especial.fecha} onChange={(e) => setEspecial((x) => ({ ...x, fecha: e.target.value }))} /></div>
                            <div className="contenidos-campo"><label htmlFor="cfg-esp-motivo">Motivo</label><input id="cfg-esp-motivo" type="text" value={especial.motivo} maxLength={80} placeholder="Ej.: Día de muertos" onChange={(e) => setEspecial((x) => ({ ...x, motivo: e.target.value }))} /></div>
                        </div>
                        <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico at-alinear-inicio" disabled={!especial.fecha || !especial.motivo.trim() || c.especiales.some((d) => d.fecha === especial.fecha)}
                            onClick={() => { cambiar("especiales", [...c.especiales, { fecha: especial.fecha, motivo: especial.motivo.trim() }].sort((a, b) => a.fecha.localeCompare(b.fecha))); setEspecial({ fecha: "", motivo: "" }); }}>
                            Agregar día especial
                        </button>
                    </Tarjeta>
                </>
            )}

            {pestana === "actividades" && (
                <Tarjeta icono={iconoCalendario} titulo="Reglas de actividades" subtitulo="Valores por defecto al crear una actividad.">
                    <div className="at-fila">
                        {campo("cupoMaximo", "Cupo máximo por actividad", <input id="cfg-cupoMaximo" type="number" min={1} max={500} value={c.cupoMaximo} onChange={(e) => cambiar("cupoMaximo", Number(e.target.value))} {...conError("cupoMaximo")} />, true)}
                        {campo("diasAnticipacion", "Días de anticipación para inscribirse", <input id="cfg-diasAnticipacion" type="number" min={0} max={60} value={c.diasAnticipacion} onChange={(e) => cambiar("diasAnticipacion", Number(e.target.value))} {...conError("diasAnticipacion")} />, true)}
                        {campo("recordatorioHoras", "Recordatorio (horas antes)", <input id="cfg-recordatorioHoras" type="number" min={0} max={168} value={c.recordatorioHoras} onChange={(e) => cambiar("recordatorioHoras", Number(e.target.value))} {...conError("recordatorioHoras")} />, true)}
                    </div>
                </Tarjeta>
            )}

            {pestana === "mantenimiento" && (
                <Tarjeta icono={iconoInfo} titulo="Modo mantenimiento" subtitulo="Mientras esté activo, el portal público muestra un aviso y el panel sigue disponible.">
                    {guardada.mantenimiento
                        ? <AvisoResultado tono="espera" titulo="Mantenimiento activo" texto="El portal público muestra el aviso de mantenimiento." chip="Activo" />
                        : <AvisoResultado tono="exito" titulo="Portal disponible" texto="El portal público funciona con normalidad." chip="Disponible" />}
                    {campo("mensajeMantenimiento", "Mensaje para la gente", <textarea id="cfg-mensajeMantenimiento" rows={2} value={c.mensajeMantenimiento} maxLength={200} onChange={(e) => cambiar("mensajeMantenimiento", e.target.value)} {...conError("mensajeMantenimiento")} />, true)}
                    {guardada.mantenimiento
                        ? <button type="button" className="contenidos-boton contenidos-boton--principal at-alinear-inicio" onClick={() => { const nueva = { ...c, mantenimiento: false }; setC(nueva); guardar(nueva); }}>Terminar mantenimiento</button>
                        : <button type="button" className="contenidos-boton at-boton--guinda at-alinear-inicio" onClick={() => setVentana("mantenimiento")}>Activar mantenimiento</button>}
                </Tarjeta>
            )}

            <div className="contenidos-previa__acciones">
                <button type="button" className="contenidos-boton contenidos-boton--principal" disabled={!sinGuardar} onClick={() => guardar()}>Guardar cambios</button>
                <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => setVentana("restaurar")}>Restaurar valores</button>
                <button type="button" className="contenidos-boton contenidos-boton--suave-azul" disabled={!sinGuardar} onClick={() => { setC(guardada); setErrores({}); setAviso(null); }}>Descartar</button>
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
