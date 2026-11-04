import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, Encabezado, EncabezadoTarjeta, Migas, Pagina, PieDatos, Resultado, Tarjeta } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import {
    guardarMeta, guardarRecompensa, obtenerMeta, obtenerRecompensa, PLAZOS, useProgreso, validarMeta, validarRecompensa,
    type DatosMeta, type DatosRecompensa, type Meta, type Recompensa, type TipoRecompensa,
} from "./progreso";
import { BASE_PROGRESO } from "./utiles";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";

const REGLAS = `${BASE_PROGRESO}?vista=reglas`;
const CATALOGO = `${BASE_PROGRESO}?vista=recompensas`;

// Reglas · nueva o editar meta (Figma 572:29502) y meta con campos faltantes (572:29955)
export function FormularioMeta() {
    const { id } = useParams();
    useProgreso();
    const meta = id && id !== "nueva" ? obtenerMeta(id) : undefined;
    if (id && id !== "nueva" && !meta) return <Navigate to={REGLAS} replace />;
    return <FormMeta key={meta?.id ?? "nueva"} meta={meta} />;
}

function FormMeta({ meta }: { meta?: Meta }) {
    const navigate = useNavigate();
    const { recompensas } = useProgreso();
    const [d, setD] = useState<DatosMeta>({
        nombre: meta?.nombre ?? "", estado: meta?.estado ?? "borrador", necesarias: meta ? String(meta.necesarias) : "", plazo: meta?.plazo ?? "2 meses",
        puntos: meta ? String(meta.puntos) : "30", recompensa: meta?.recompensa ?? "", descripcion: meta?.descripcion ?? "",
    });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const cambiar = <K extends keyof DatosMeta>(c: K, v: DatosMeta[K]) => { setD((x) => ({ ...x, [c]: v })); setErrores((e) => ({ ...e, [c]: "" })); };
    const faltan = Object.values(errores).some(Boolean);

    function guardar() {
        const e = validarMeta(d);
        setErrores(e);
        if (Object.keys(e).length) return requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
        const nuevo = guardarMeta(d, meta?.id);
        navigate(`${BASE_PROGRESO}/metas/${nuevo}/guardada`);
    }
    const props = (c: keyof DatosMeta) => ({ id: `mt-${c}`, className: `cn-control ${errores[c] ? "cn-control--error" : ""}`, "aria-invalid": !!errores[c], "aria-describedby": errores[c] ? `mt-${c}-error` : undefined });

    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], [faltan ? "Meta con campos faltantes" : meta ? "Editar meta" : "Nueva meta"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Reglas de progreso", ruta: REGLAS }} etiqueta="Reglas de progreso" titulo={meta ? "Editar meta" : "Nueva meta"} texto="Los cambios aplican a partir de hoy; el avance anterior se respeta." />
                <Tarjeta icono={iconoLapiz} titulo="Datos de la meta">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <CampoTexto id="mt-nombre" etiqueta="Nombre de la meta" obligatorio error={errores.nombre}><input {...props("nombre")} value={d.nombre} onChange={(e) => cambiar("nombre", e.target.value)} /></CampoTexto>
                            <CampoTexto id="mt-estado" etiqueta="Estado"><select id="mt-estado" className="cn-control" value={d.estado} onChange={(e) => cambiar("estado", e.target.value as Meta["estado"])}><option value="activa">Activa</option><option value="borrador">Borrador</option></select></CampoTexto>
                        </div>
                        <div className="cn-campos__fila">
                            <CampoTexto id="mt-necesarias" etiqueta="Actividades necesarias" obligatorio error={errores.necesarias}><input inputMode="numeric" {...props("necesarias")} value={d.necesarias} onChange={(e) => cambiar("necesarias", e.target.value.replace(/\D/g, ""))} /></CampoTexto>
                            <CampoTexto id="mt-plazo" etiqueta="Plazo" obligatorio error={errores.plazo}><select {...props("plazo")} value={d.plazo} onChange={(e) => cambiar("plazo", e.target.value)}>{PLAZOS.map((x) => <option key={x}>{x}</option>)}</select></CampoTexto>
                        </div>
                        <div className="cn-campos__fila">
                            <CampoTexto id="mt-puntos" etiqueta="Puntos por actividad" obligatorio error={errores.puntos}><input inputMode="numeric" {...props("puntos")} value={d.puntos} onChange={(e) => cambiar("puntos", e.target.value.replace(/\D/g, ""))} /></CampoTexto>
                            <CampoTexto id="mt-recompensa" etiqueta="Recompensa" obligatorio error={errores.recompensa}>
                                <select {...props("recompensa")} value={d.recompensa} onChange={(e) => cambiar("recompensa", e.target.value)}>
                                    <option value="">Elige una recompensa</option>
                                    {recompensas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </CampoTexto>
                        </div>
                        <CampoTexto id="mt-descripcion" etiqueta="Descripción para el público">
                            <textarea id="mt-descripcion" className="cn-control cn-control--area" value={d.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} />
                        </CampoTexto>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={guardar}>Guardar meta</button>
                    <Link to={REGLAS} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Recompensas · nueva o editar recompensa (Figma 637:50802)
export function FormularioRecompensa() {
    const { id } = useParams();
    useProgreso();
    const r = id && id !== "nueva" ? obtenerRecompensa(id) : undefined;
    if (id && id !== "nueva" && !r) return <Navigate to={CATALOGO} replace />;
    return <FormRecompensa key={r?.id ?? "nueva"} recompensa={r} />;
}

function FormRecompensa({ recompensa }: { recompensa?: Recompensa }) {
    const navigate = useNavigate();
    const [d, setD] = useState<DatosRecompensa>({ nombre: recompensa?.nombre ?? "", tipo: recompensa?.tipo ?? "Insignia", existencias: recompensa?.existencias == null ? "" : String(recompensa.existencias), sinLimite: recompensa ? recompensa.existencias === null : false });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const cambiar = <K extends keyof DatosRecompensa>(c: K, v: DatosRecompensa[K]) => { setD((x) => ({ ...x, [c]: v })); setErrores((e) => ({ ...e, [c]: "" })); };

    function guardar() {
        const e = validarRecompensa(d);
        setErrores(e);
        if (Object.keys(e).length) return;
        const nuevo = guardarRecompensa(d, recompensa?.id);
        navigate(`${BASE_PROGRESO}/recompensas/${nuevo}/guardada`);
    }

    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], [recompensa ? "Editar recompensa" : "Nueva recompensa"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Recompensas", ruta: CATALOGO }} etiqueta="Recompensas" titulo={recompensa ? "Editar recompensa" : "Nueva recompensa"} texto="Las existencias se descuentan solas en cada entrega." />
                <Tarjeta icono={iconoLapiz} titulo="Datos de la recompensa">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <CampoTexto id="rc-nombre" etiqueta="Nombre" obligatorio error={errores.nombre}><input id="rc-nombre" className={`cn-control ${errores.nombre ? "cn-control--error" : ""}`} value={d.nombre} onChange={(e) => cambiar("nombre", e.target.value)} aria-invalid={!!errores.nombre} /></CampoTexto>
                            <CampoTexto id="rc-tipo" etiqueta="Tipo" obligatorio><select id="rc-tipo" className="cn-control" value={d.tipo} onChange={(e) => cambiar("tipo", e.target.value as TipoRecompensa)}><option>Insignia</option><option>Documento</option></select></CampoTexto>
                        </div>
                        <div className="cn-campos__fila">
                            <CampoTexto id="rc-existencias" etiqueta="Existencias" obligatorio={!d.sinLimite} error={errores.existencias} ayuda={recompensa ? `Entregadas hasta hoy: ${recompensa.entregadas}.` : undefined}>
                                <input id="rc-existencias" inputMode="numeric" disabled={d.sinLimite} className={`cn-control ${errores.existencias ? "cn-control--error" : ""}`} value={d.sinLimite ? "" : d.existencias} onChange={(e) => cambiar("existencias", e.target.value.replace(/\D/g, ""))} aria-invalid={!!errores.existencias} />
                            </CampoTexto>
                            <label className="cn-interruptor-campo">
                                <span className="cn-casilla"><input type="checkbox" checked={d.sinLimite} onChange={(e) => cambiar("sinLimite", e.target.checked)} /><span aria-hidden="true" /></span>
                                <span><strong>Sin límite</strong><small>Para documentos que se imprimen al entregar.</small></span>
                            </label>
                        </div>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={guardar}>Guardar recompensa</button>
                    <Link to={CATALOGO} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Meta guardada (572:30410) y recompensa guardada (637:50990)
export function GuardadoProgreso({ tipo }: { tipo: "meta" | "recompensa" }) {
    const { id } = useParams();
    useProgreso();
    const meta = tipo === "meta" ? obtenerMeta(id) : undefined;
    const r = tipo === "recompensa" ? obtenerRecompensa(id) : undefined;
    if (!meta && !r) return <Navigate to={tipo === "meta" ? REGLAS : CATALOGO} replace />;
    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], [meta ? "Meta guardada" : "Recompensa guardada"]]} />
                <Encabezado grande etiqueta={meta ? "Reglas de progreso" : "Recompensas"} titulo={meta ? "Meta guardada" : "Recompensa guardada"} texto={meta ? "Los cambios aplican a partir de hoy." : "El catálogo ya muestra los datos nuevos."} />
                <Resultado
                    tono="verde"
                    icono={iconoCheck}
                    titulo={meta ? meta.nombre : r!.nombre}
                    linea={meta ? `${meta.necesarias} actividades en ${meta.plazo} · ${meta.puntos} puntos por actividad` : `${r!.tipo} · ${r!.existencias === null ? "sin límite" : `${r!.existencias} en existencia`}`}
                    chip={<Chip tono={meta && meta.estado === "borrador" ? "gris" : "verde"}>{meta ? (meta.estado === "activa" ? "Activa" : "Borrador") : "Guardada"}</Chip>}
                />
                <div className="cn-acciones">
                    <Link to={meta ? REGLAS : CATALOGO} className={clasesBoton("verde")}>{meta ? "Volver a Reglas de progreso" : "Volver a Recompensas"}</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}
