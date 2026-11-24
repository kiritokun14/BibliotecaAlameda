import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "../actividades/EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, Encabezado, EncabezadoTarjeta, Migas, Pagina, PieDatos, Resultado, Tarjeta } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { Aviso, Vacio } from "../piezasPanel";
import { fechaCorta } from "../actividades/datos";
import { mensajeError } from "../../../servicios/api";
import { crearRecompensa, editarRecompensa, listarRecompensas, NIVELES, nombreNivel, type Recompensa } from "../../../servicios/progreso";
import { aDatos, diaDe, validarRecompensa, type FormularioRecompensa as Formulario } from "./progreso";
import { BASE_PROGRESO } from "./utiles";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";

const REGLAS = `${BASE_PROGRESO}?vista=reglas`;
const CATALOGO = `${BASE_PROGRESO}?vista=recompensas`;

// Las metas ahora son los niveles fijos del documento (D-11): ya no se editan.
export function FormularioMeta() {
    return <Navigate to={REGLAS} replace />;
}

// Recompensas · nueva o editar recompensa (Figma 637:50802)
export function FormularioRecompensa() {
    const { id } = useParams();
    const nueva = !id || id === "nueva";
    const [resultado, setResultado] = useState<{ id?: string; recompensa?: Recompensa | null; error?: string }>();
    useEffect(() => {
        if (nueva) return;
        let vigente = true;
        listarRecompensas().then((lista) => { if (vigente) setResultado({ id, recompensa: lista.find((r) => r.id === id) ?? null }); })
            .catch((error) => { if (vigente) setResultado({ id, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [id, nueva]);
    if (nueva) return <FormRecompensa key="nueva" />;
    const actual = resultado?.id === id ? resultado : undefined;
    if (actual?.recompensa === null) return <Navigate to={CATALOGO} replace />;
    if (!actual?.recompensa) {
        return (
            <PanelLayout titulo="Participantes" tema="contenidos paleta">
                <Pagina>
                    <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], ["Editar recompensa"]]} />
                    {actual?.error ? <Vacio icono="alerta" titulo="No pudimos cargar la recompensa" texto={actual.error} accion={<Link to={CATALOGO} className="pz-boton pz-boton--chico">Volver</Link>} />
                        : <Vacio icono="reloj" titulo="Cargando recompensa…" texto="Esto tarda unos segundos." />}
                </Pagina>
            </PanelLayout>
        );
    }
    return <FormRecompensa key={actual.recompensa.id} recompensa={actual.recompensa} />;
}

function FormRecompensa({ recompensa }: { recompensa?: Recompensa }) {
    const navigate = useNavigate();
    const hoy = diaDe(new Date().toISOString());
    const [d, setD] = useState<Formulario>({
        nombre: recompensa?.nombre ?? "", descripcion: recompensa?.descripcion ?? "", nivelRequerido: String(recompensa?.nivelRequerido ?? 1),
        existencias: recompensa ? String(recompensa.existencias) : "", inicio: recompensa ? diaDe(recompensa.vigenciaInicio) : hoy,
        fin: recompensa ? diaDe(recompensa.vigenciaFin) : "", estado: recompensa ? (recompensa.estado === "agotada" ? "activa" : recompensa.estado) : "activa",
    });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [fallo, setFallo] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const cambiar = <K extends keyof Formulario>(c: K, v: Formulario[K]) => { setD((x) => ({ ...x, [c]: v })); setErrores((e) => ({ ...e, [c]: "" })); };
    const props = (c: keyof Formulario) => ({ id: `rc-${c}`, className: `cn-control ${errores[c] ? "cn-control--error" : ""}`, "aria-invalid": !!errores[c], "aria-describedby": errores[c] ? `rc-${c}-error` : undefined });

    async function guardar() {
        const e = validarRecompensa(d);
        setErrores(e);
        if (Object.keys(e).length) return requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
        setOcupado(true); setFallo("");
        try {
            const r = recompensa ? await editarRecompensa(recompensa.id, aDatos(d), recompensa.actualizadoEn) : await crearRecompensa(aDatos(d));
            navigate(`${BASE_PROGRESO}/recompensas/${r.id}/guardada`, { state: r });
        } catch (error) {
            setFallo(mensajeError(error));
        } finally { setOcupado(false); }
    }

    return (
        <PanelLayout titulo="Participantes" tema="contenidos paleta">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], [recompensa ? "Editar recompensa" : "Nueva recompensa"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Recompensas", ruta: CATALOGO }} etiqueta="Recompensas" titulo={recompensa ? "Editar recompensa" : "Nueva recompensa"}
                    texto="Cada asignación aparta una pieza de las existencias; cancelarla la devuelve. No se canjea sola al llegar al nivel." />
                <Tarjeta icono={iconoLapiz} titulo="Datos de la recompensa">
                    <fieldset disabled={ocupado} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
                        <div className="cn-campos">
                            <div className="cn-campos__fila">
                                <CampoTexto id="rc-nombre" etiqueta="Nombre" obligatorio error={errores.nombre}><input {...props("nombre")} maxLength={150} value={d.nombre} onChange={(e) => cambiar("nombre", e.target.value)} /></CampoTexto>
                                <CampoTexto id="rc-estado" etiqueta="Estado">
                                    <select id="rc-estado" className="cn-control" value={d.estado} onChange={(e) => cambiar("estado", e.target.value as Formulario["estado"])}>
                                        <option value="activa">Activa</option><option value="inactiva">Inactiva</option><option value="archivada">Archivada</option>
                                    </select>
                                </CampoTexto>
                            </div>
                            <div className="cn-campos__fila">
                                <CampoTexto id="rc-nivelRequerido" etiqueta="Nivel que pide" obligatorio>
                                    <select {...props("nivelRequerido")} value={d.nivelRequerido} onChange={(e) => cambiar("nivelRequerido", e.target.value)}>
                                        {NIVELES.map((n) => <option key={n.nivel} value={n.nivel}>{n.nombre} ({n.desde}{n.hasta === null ? " o más" : ` a ${n.hasta}`})</option>)}
                                    </select>
                                </CampoTexto>
                                <CampoTexto id="rc-existencias" etiqueta="Existencias" obligatorio error={errores.existencias}
                                    ayuda={recompensa ? `Entregadas: ${recompensa.entregadas}. Apartadas por entregar: ${recompensa.asignadas}.` : undefined}>
                                    <input inputMode="numeric" {...props("existencias")} value={d.existencias} onChange={(e) => cambiar("existencias", e.target.value.replace(/\D/g, ""))} />
                                </CampoTexto>
                            </div>
                            <div className="cn-campos__fila">
                                <CampoTexto id="rc-inicio" etiqueta="Se entrega desde" obligatorio error={errores.inicio}><input type="date" {...props("inicio")} value={d.inicio} onChange={(e) => cambiar("inicio", e.target.value)} /></CampoTexto>
                                <CampoTexto id="rc-fin" etiqueta="Hasta" obligatorio error={errores.fin}><input type="date" {...props("fin")} min={d.inicio || undefined} value={d.fin} onChange={(e) => cambiar("fin", e.target.value)} /></CampoTexto>
                            </div>
                            <CampoTexto id="rc-descripcion" etiqueta="Descripción">
                                <textarea id="rc-descripcion" maxLength={1000} className="cn-control cn-control--area" value={d.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} />
                            </CampoTexto>
                        </div>
                    </fieldset>
                </Tarjeta>
                {fallo && <Aviso tono="error" titulo="No se guardó la recompensa." texto={fallo} />}
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={() => void guardar()}>{ocupado ? "Guardando…" : "Guardar recompensa"}</button>
                    <Link to={CATALOGO} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Recompensa guardada (637:50990). La meta guardada (572:30410) ya no aplica: los niveles son fijos.
export function GuardadoProgreso({ tipo }: { tipo: "meta" | "recompensa" }) {
    const { id } = useParams();
    const r = useLocation().state as Recompensa | null;
    if (tipo === "meta" || !r || r.id !== id) return <Navigate to={tipo === "meta" ? REGLAS : CATALOGO} replace />;
    return (
        <PanelLayout titulo="Participantes" tema="contenidos paleta">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], ["Recompensa guardada"]]} />
                <Encabezado grande etiqueta="Recompensas" titulo="Recompensa guardada" texto="El catálogo ya muestra los datos nuevos." />
                <Resultado tono="verde" icono={iconoCheck} titulo={r.nombre}
                    linea={`Desde ${nombreNivel(r.nivelRequerido)} · ${r.existencias} en existencia · hasta el ${fechaCorta(diaDe(r.vigenciaFin))}`}
                    chip={<Chip tono={r.estado === "activa" ? "verde" : "gris"}>{{ activa: "Activa", inactiva: "Inactiva", agotada: "Agotada", archivada: "Archivada" }[r.estado]}</Chip>} />
                <div className="cn-acciones">
                    <Link to={CATALOGO} className={clasesBoton("verde")}>Volver a Recompensas</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}
