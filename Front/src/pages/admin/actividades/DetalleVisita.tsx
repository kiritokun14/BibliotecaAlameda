import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, Migas, Pagina, Pasos, PieDatos, Resultado, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { capacidadDe, espacios, fechaCorta, useActividades } from "./datos";
import { useSalas } from "./salas";
import { ocupacion } from "./calendario";
import { confirmarVisita, DURACIONES, GUIAS, NOMBRE_ESTADO_VISITA, obtenerVisita, proponerFecha, rechazarVisita, useVisitas, type Visita } from "./visitas";
import { BASE_VISITAS, TONO_VISITA } from "./utiles";
import iconoReloj from "../../../assets/admin/actividades/resultado-reloj.svg";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoX from "../../../assets/admin/contenidos/resultado-x.svg";
import iconoArchivo from "../../../assets/admin/actividades/tarjeta-archivo.svg";
import iconoCalendario from "../../../assets/admin/actividades/tarjeta-calendario.svg";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoFlecha from "../../../assets/admin/contenidos/tarjeta-flecha.svg";

function useVisita() {
    const { folio } = useParams();
    useVisitas();
    return obtenerVisita(folio);
}

const pendiente = (v: Visita) => v.estado === "por-confirmar" || v.estado === "propuesta";

function banda(v: Visita) {
    const chip = <Chip tono={TONO_VISITA[v.estado]}>{NOMBRE_ESTADO_VISITA[v.estado]}</Chip>;
    switch (v.estado) {
        case "por-confirmar": return { tono: "dorado" as const, icono: iconoReloj, titulo: "Por confirmar", linea: `Recibida el ${fechaCorta(v.recibida)} · Responder antes del ${fechaCorta(v.responderAntes)}`, chip };
        case "propuesta": return { tono: "dorado" as const, icono: iconoReloj, titulo: "Propuesta enviada", linea: `Opciones: ${v.propuesta?.opcion1}${v.propuesta?.opcion2 ? ` o ${v.propuesta.opcion2}` : ""}. Espera respuesta del grupo.`, chip };
        case "confirmada": return { tono: "verde" as const, icono: iconoCheck, titulo: "Visita confirmada", linea: `${fechaCorta(v.fecha)} · ${v.hora} · ${v.confirmacion?.guia ?? "Guía por asignar"}`, chip };
        case "realizada": return { tono: "verde" as const, icono: iconoCheck, titulo: "Visita realizada", linea: `${fechaCorta(v.fecha)} · ${v.espacio}`, chip };
        default: return { tono: "guinda" as const, icono: iconoX, titulo: v.estado === "rechazada" ? "Solicitud rechazada" : "Visita cancelada", linea: v.rechazo?.motivo ?? v.comentarios, chip };
    }
}

// Visitas · detalle (Figma 567:21274) y rechazar solicitud (567:23039)
export function DetalleVisita() {
    const v = useVisita();
    const navigate = useNavigate();
    const actividades = useActividades();
    const { salas, bloqueos } = useSalas();
    const [rechazando, setRechazando] = useState(false);
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    if (!v) return <Navigate to={BASE_VISITAS} replace />;
    const b = banda(v);
    const ruta = `${BASE_VISITAS}/${v.folio}`;

    // Disponibilidad simulada a partir del calendario
    const sala = salas.find((s) => s.nombre === v.espacio);
    const o = ocupacion(v.espacio, v.fecha, v.hora, actividades, bloqueos);
    const fin = `${String(Number(v.hora.slice(0, 2)) + 2).padStart(2, "0")}:00`;
    const capacidad = capacidadDe(v.espacio);
    const turnos = capacidad ? Math.ceil(v.personas / capacidad) : 1;

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios", BASE_VISITAS], [rechazando ? "Rechazar solicitud" : "Detalle"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Visitas y uso de espacios", ruta: BASE_VISITAS }} etiqueta={`Visita ${v.folio}`} titulo={v.grupo} texto={v.descripcion} />
                <Resultado {...b} />
                <Tarjeta icono={iconoArchivo} titulo="Datos de la solicitud">
                    <Datos filas={[["Fecha solicitada", `${fechaCorta(v.fecha)} · ${v.hora}`], ["Personas", `${v.personas} (${v.detallePersonas})`], ["Espacio pedido", v.espacio], ["Contacto", v.contacto], ["Comentarios", v.comentarios || "Sin comentarios"]]} />
                </Tarjeta>
                {pendiente(v) && (
                    <Tarjeta icono={iconoCalendario} titulo="Disponibilidad en esa fecha">
                        <Datos
                            filas={[
                                [v.espacio, o.tipo === "libre" ? `Libre de ${v.hora} a ${fin}` : o.tipo === "bloqueada" ? "Bloqueada en ese horario" : `Ocupada: ${o.texto}`],
                                ["Guía disponible", "Sí (ejemplo)"],
                                ["Capacidad", capacidad ? `${sala ? `${sala.capacidad} ${sala.equipo.includes("equipos") ? "equipos" : "personas"}` : `${capacidad} personas`}${turnos > 1 ? ` · el grupo cabe dividido en ${turnos} turnos` : " · el grupo cabe completo"}` : "Por confirmar"],
                            ]}
                        />
                    </Tarjeta>
                )}
                <div className="cn-acciones">
                    {pendiente(v) ? (
                        <>
                            <Link to={`${ruta}/confirmar`} className={clasesBoton("verde")}>Confirmar visita</Link>
                            <Link to={`${ruta}/proponer`} className={clasesBoton("contorno")}>Proponer otra fecha</Link>
                            <button type="button" className={clasesBoton("contorno-guinda")} onClick={() => setRechazando(true)}>Rechazar solicitud</button>
                        </>
                    ) : (
                        <Link to={BASE_VISITAS} className={clasesBoton("verde")}>Volver a Visitas y uso de espacios</Link>
                    )}
                </div>
                <PieDatos />
            </Pagina>

            {rechazando && (
                <Ventana
                    titulo="¿Rechazar la solicitud?"
                    texto="Se enviará el motivo al contacto del grupo."
                    alCerrar={() => setRechazando(false)}
                    pie={
                        <>
                            <button type="button" className={clasesBoton("contorno")} onClick={() => setRechazando(false)}>Cancelar</button>
                            <button type="button" className={clasesBoton("guinda")} onClick={() => { if (!motivo.trim()) return setError("Escribe el motivo."); rechazarVisita(v.folio, motivo); navigate(`${ruta}/rechazada`); }}>Rechazar solicitud</button>
                        </>
                    }
                >
                    <Datos variante="caja" filas={[["Folio", v.folio], ["Grupo", v.grupo.replace(/ \(ejemplo\)$/, "")]]} />
                    <CampoTexto id="vs-motivo" etiqueta="Motivo" obligatorio error={error}>
                        <textarea id="vs-motivo" className={`cn-control cn-control--area ${error ? "cn-control--error" : ""}`} placeholder="Ej.: no hay disponibilidad en ese mes." value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "vs-motivo-error" : undefined} />
                    </CampoTexto>
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Visitas · confirmar (Figma 567:21732)
export function ConfirmarVisita() {
    const v = useVisita();
    const navigate = useNavigate();
    const [d, setD] = useState({ fecha: v?.fecha ?? "", hora: v?.hora ?? "", duracion: "2 horas", espacio: v?.espacio ?? "", guia: GUIAS[0], mensaje: "Los esperamos 10 minutos antes. Entrada por recepción." });
    const [errores, setErrores] = useState<Record<string, string>>({});
    if (!v || !pendiente(v)) return <Navigate to={v ? `${BASE_VISITAS}/${v.folio}` : BASE_VISITAS} replace />;
    const ruta = `${BASE_VISITAS}/${v.folio}`;
    const cambiar = (c: keyof typeof d, valor: string) => { setD((x) => ({ ...x, [c]: valor })); setErrores((e) => ({ ...e, [c]: "" })); };

    function guardar() {
        const e: Record<string, string> = {};
        if (!d.fecha) e.fecha = "Elige la fecha.";
        if (!d.hora) e.hora = "Elige la hora.";
        if (!d.espacio) e.espacio = "Elige el espacio.";
        if (!d.guia) e.guia = "Asigna un guía.";
        setErrores(e);
        if (Object.values(e).some(Boolean)) return;
        confirmarVisita(v!.folio, d);
        navigate(`${ruta}/confirmada`);
    }
    const clase = (c: string) => `cn-control ${errores[c] ? "cn-control--error" : ""}`;

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios", BASE_VISITAS], ["Confirmar visita"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Visitas y uso de espacios", ruta }} etiqueta={`Visita ${v.folio}`} titulo="Confirmar visita" texto="Define fecha, guía y espacio. Se avisará al contacto." />
                <Tarjeta icono={iconoLapiz} titulo="Datos de la visita">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <CampoTexto id="vc-fecha" etiqueta="Fecha" obligatorio error={errores.fecha}><input id="vc-fecha" type="date" className={clase("fecha")} value={d.fecha} onChange={(e) => cambiar("fecha", e.target.value)} /></CampoTexto>
                            <CampoTexto id="vc-hora" etiqueta="Hora" obligatorio error={errores.hora}><input id="vc-hora" type="time" className={clase("hora")} value={d.hora} onChange={(e) => cambiar("hora", e.target.value)} /></CampoTexto>
                            <CampoTexto id="vc-duracion" etiqueta="Duración"><select id="vc-duracion" className="cn-control" value={d.duracion} onChange={(e) => cambiar("duracion", e.target.value)}>{DURACIONES.map((x) => <option key={x}>{x}</option>)}</select></CampoTexto>
                        </div>
                        <div className="cn-campos__fila">
                            <CampoTexto id="vc-espacio" etiqueta="Espacio" obligatorio error={errores.espacio}><select id="vc-espacio" className={clase("espacio")} value={d.espacio} onChange={(e) => cambiar("espacio", e.target.value)}><option value="">Elige un espacio</option>{espacios().map((x) => <option key={x.nombre}>{x.nombre}</option>)}</select></CampoTexto>
                            <CampoTexto id="vc-guia" etiqueta="Guía asignado" obligatorio error={errores.guia}><select id="vc-guia" className={clase("guia")} value={d.guia} onChange={(e) => cambiar("guia", e.target.value)}>{GUIAS.map((x) => <option key={x}>{x}</option>)}</select></CampoTexto>
                        </div>
                        <CampoTexto id="vc-mensaje" etiqueta="Mensaje para el grupo" ayuda="Se envía junto con la confirmación.">
                            <textarea id="vc-mensaje" className="cn-control cn-control--area" value={d.mensaje} onChange={(e) => cambiar("mensaje", e.target.value)} aria-describedby="vc-mensaje-ayuda" />
                        </CampoTexto>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={guardar}>Confirmar y avisar</button>
                    <Link to={ruta} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Visitas · proponer otra fecha (Figma 567:22189)
export function ProponerFecha() {
    const v = useVisita();
    const navigate = useNavigate();
    const [o1, setO1] = useState("");
    const [o2, setO2] = useState("");
    const [motivo, setMotivo] = useState("");
    const [errores, setErrores] = useState<Record<string, string>>({});
    if (!v || !pendiente(v)) return <Navigate to={v ? `${BASE_VISITAS}/${v.folio}` : BASE_VISITAS} replace />;
    const ruta = `${BASE_VISITAS}/${v.folio}`;
    // "2026-11-12T10:00" → "12 nov 2026 · 10:00"
    const legible = (x: string) => (x ? `${fechaCorta(x.slice(0, 10))} · ${x.slice(11, 16)}` : "");

    function enviar() {
        const e: Record<string, string> = {};
        if (!o1) e.o1 = "Elige al menos una opción.";
        if (!motivo.trim()) e.motivo = "Explica por qué propones otra fecha.";
        setErrores(e);
        if (Object.keys(e).length) return;
        proponerFecha(v!.folio, { opcion1: legible(o1), opcion2: legible(o2), motivo });
        navigate(`${ruta}/propuesta-enviada`);
    }

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios", BASE_VISITAS], ["Proponer otra fecha"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Visitas y uso de espacios", ruta }} etiqueta={`Visita ${v.folio}`} titulo="Proponer otra fecha" texto="Ofrece hasta dos opciones al grupo." />
                <Tarjeta icono={iconoLapiz} titulo="Opciones">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <CampoTexto id="vp-o1" etiqueta="Opción 1" obligatorio error={errores.o1}><input id="vp-o1" type="datetime-local" className={`cn-control ${errores.o1 ? "cn-control--error" : ""}`} value={o1} onChange={(e) => { setO1(e.target.value); setErrores((x) => ({ ...x, o1: "" })); }} /></CampoTexto>
                            <CampoTexto id="vp-o2" etiqueta="Opción 2"><input id="vp-o2" type="datetime-local" className="cn-control" value={o2} onChange={(e) => setO2(e.target.value)} /></CampoTexto>
                        </div>
                        <CampoTexto id="vp-motivo" etiqueta="Motivo" obligatorio error={errores.motivo}>
                            <textarea id="vp-motivo" className={`cn-control cn-control--area ${errores.motivo ? "cn-control--error" : ""}`} placeholder="Ej.: la sala está ocupada en la fecha pedida." value={motivo} onChange={(e) => { setMotivo(e.target.value); setErrores((x) => ({ ...x, motivo: "" })); }} />
                        </CampoTexto>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={enviar}>Enviar propuesta</button>
                    <Link to={ruta} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Visitas · resultados: confirmada (567:22624), propuesta enviada (621:50026), rechazada (621:49877)
export function ResultadoVisita({ tipo }: { tipo: "confirmada" | "propuesta" | "rechazada" }) {
    const v = useVisita();
    if (!v || v.estado !== tipo) return <Navigate to={v ? `${BASE_VISITAS}/${v.folio}` : BASE_VISITAS} replace />;
    const datos = {
        confirmada: { titulo: "Visita confirmada", texto: "El contacto del grupo recibió la confirmación.", tono: "verde" as const, icono: iconoCheck, linea: `${fechaCorta(v.fecha)} · ${v.hora} · ${v.espacio} · Guía: ${v.confirmacion?.guia}` },
        propuesta: { titulo: "Propuesta enviada", texto: "El grupo elegirá una de las opciones.", tono: "dorado" as const, icono: iconoReloj, linea: `Opciones: ${v.propuesta?.opcion1}${v.propuesta?.opcion2 ? ` o ${v.propuesta.opcion2}` : ""}` },
        rechazada: { titulo: "Solicitud rechazada", texto: "El contacto del grupo recibió el motivo.", tono: "guinda" as const, icono: iconoX, linea: `Motivo: ${v.rechazo?.motivo}` },
    }[tipo];
    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios", BASE_VISITAS], [datos.titulo]]} />
                <Encabezado grande etiqueta={`Visita ${v.folio} · ${NOMBRE_ESTADO_VISITA[v.estado]}`} titulo={datos.titulo} texto={datos.texto} />
                <Resultado tono={datos.tono} icono={datos.icono} titulo={v.grupo} linea={datos.linea} chip={<Chip tono={TONO_VISITA[v.estado]}>{NOMBRE_ESTADO_VISITA[v.estado]}</Chip>} />
                {tipo === "confirmada" && (
                    <Tarjeta icono={iconoFlecha} titulo="¿Qué sigue?">
                        <Pasos pasos={[["Aviso al grupo", "Recibe fecha, hora y mensaje."], ["Prepara la sala", "Se ve en el calendario del día."], ["Registra el uso", "Al terminar, anota cuántas personas vinieron."]]} />
                    </Tarjeta>
                )}
                <div className="cn-acciones">
                    <Link to={BASE_VISITAS} className={clasesBoton("verde")}>Volver a Visitas y uso de espacios</Link>
                    {tipo === "confirmada" && <Link to={`/admin/actividades/calendario?vista=dia&fecha=${v.fecha}`} className={clasesBoton("contorno")}>Ver en el calendario</Link>}
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}
