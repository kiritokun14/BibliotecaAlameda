import { useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import { EncabezadoTarjeta, Migas, Pagina, PieDatos, Tarjeta } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import {
    actualizarActividad, capacidadDe, crearActividad, datosDe, espacios, obtenerActividad, PUBLICOS, TIPOS_ACTIVIDAD, useActividades, VACIA, validarActividad,
    type Actividad, type DatosActividad,
} from "./datos";
import { BASE_PROPUESTAS } from "./utiles";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";

type Errores = Partial<Record<keyof DatosActividad, string>>;

// Actividades · Propuestas: nueva actividad (Figma 565:19147, faltan datos 565:19645)
export function NuevaActividad() {
    return <Formulario />;
}

// Actividades · Propuestas: editar (Figma 617:48802). Lo publicado o cerrado se cambia en "Cambios y cancelaciones".
export function EditarActividad() {
    const { folio } = useParams();
    useActividades();
    const actividad = obtenerActividad(folio);
    if (!actividad) return <Navigate to={BASE_PROPUESTAS} replace />;
    if (!["borrador", "en-revision", "aprobada"].includes(actividad.estado)) return <Navigate to={`${BASE_PROPUESTAS}/${actividad.folio}`} replace />;
    return <Formulario key={actividad.folio} actividad={actividad} />;
}

function Formulario({ actividad }: { actividad?: Actividad }) {
    const navigate = useNavigate();
    const [datos, setDatos] = useState<DatosActividad>(actividad ? datosDe(actividad) : VACIA);
    const [errores, setErrores] = useState<Errores>({});
    const [guardado, setGuardado] = useState("");
    const editando = !!actividad;
    const faltan = Object.values(errores).some(Boolean);
    const maximo = capacidadDe(datos.espacio);

    function cambiar<K extends keyof DatosActividad>(campo: K, valor: DatosActividad[K]) {
        setDatos((d) => ({ ...d, [campo]: valor }));
        setGuardado("");
        if (errores[campo] || (campo === "inicio" && errores.fin)) setErrores((e) => ({ ...e, [campo]: undefined, ...(campo === "inicio" ? { fin: undefined } : {}) }));
    }

    function comprobar(soloBorrador = false) {
        const nuevos = validarActividad(datos, soloBorrador);
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) {
            // Lleva el foco al primer campo con error (Figma no muestra aviso arriba)
            requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return false;
        }
        return true;
    }

    // TODO backend: POST /actividades (nueva) o PATCH /actividades/:folio
    function guardarBorrador() {
        if (!comprobar(true)) return;
        const folio = crearActividad(datos, "borrador");
        navigate(`${BASE_PROPUESTAS}/${folio}`);
    }

    function enviarARevision() {
        if (!comprobar()) return;
        const folio = crearActividad(datos, "en-revision");
        navigate(`${BASE_PROPUESTAS}/${folio}`);
    }

    function guardarCambios(volver: boolean) {
        if (!actividad || !comprobar(actividad.estado === "borrador")) return;
        actualizarActividad(actividad.folio, datos);
        if (volver) navigate(`${BASE_PROPUESTAS}/${actividad.folio}`);
        else setGuardado("Cambios guardados (ejemplo).");
    }

    const id = (campo: string) => `act-${campo}`;
    const props = (campo: keyof DatosActividad) => ({
        id: id(campo),
        "aria-invalid": !!errores[campo],
        "aria-describedby": errores[campo] ? `${id(campo)}-error` : undefined,
        className: `cn-control ${errores[campo] ? "cn-control--error" : ""}`,
    });

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Propuestas de actividades", BASE_PROPUESTAS], [editando ? "Editar actividad" : faltan ? "Faltan datos" : "Nueva actividad"]]} />

                <EncabezadoTarjeta
                    volver={{ texto: "Volver a Propuestas de actividades", ruta: BASE_PROPUESTAS }}
                    etiqueta={editando ? `Actividades · Editar ${actividad.folio}` : "Actividades · Nueva"}
                    titulo={editando ? "Editar actividad" : "Nueva actividad"}
                    texto={editando ? "Modifica los datos. Los cambios importantes se avisan a las personas inscritas." : "Llena los datos. Puedes guardarla como borrador y terminarla después."}
                />

                {guardado && <p className="cn-aviso cn-aviso--exito" role="status"><span className="cn-aviso__textos"><strong>{guardado}</strong></span></p>}

                <Tarjeta icono={iconoLapiz} titulo="Datos de la actividad">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <Campo campo="nombre" etiqueta="Nombre de la actividad" obligatorio errores={errores}>
                                <input {...props("nombre")} value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} />
                            </Campo>
                            <Campo campo="tipo" etiqueta="Tipo de actividad" obligatorio errores={errores}>
                                <select {...props("tipo")} value={datos.tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
                                    {TIPOS_ACTIVIDAD.map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </Campo>
                        </div>
                        <Campo campo="descripcion" etiqueta="Descripción para el público" obligatorio errores={errores}>
                            <textarea {...props("descripcion")} className={`${props("descripcion").className} cn-control--area`} value={datos.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} />
                        </Campo>
                        <div className="cn-campos__fila">
                            <Campo campo="fecha" etiqueta="Fecha" obligatorio errores={errores}>
                                <input type="date" {...props("fecha")} value={datos.fecha} onChange={(e) => cambiar("fecha", e.target.value)} />
                            </Campo>
                            <Campo campo="inicio" etiqueta="Hora de inicio" obligatorio errores={errores}>
                                <input type="time" {...props("inicio")} value={datos.inicio} onChange={(e) => cambiar("inicio", e.target.value)} />
                            </Campo>
                            <Campo campo="fin" etiqueta="Hora de fin" obligatorio errores={errores}>
                                <input type="time" {...props("fin")} value={datos.fin} onChange={(e) => cambiar("fin", e.target.value)} />
                            </Campo>
                        </div>
                        <div className="cn-campos__fila">
                            <Campo campo="espacio" etiqueta="Espacio" obligatorio errores={errores}>
                                <select {...props("espacio")} value={datos.espacio} onChange={(e) => cambiar("espacio", e.target.value)}>
                                    <option value="">Elige un espacio</option>
                                    {espacios().map((e) => <option key={e.nombre}>{e.nombre}</option>)}
                                </select>
                            </Campo>
                            <Campo campo="cupo" etiqueta="Cupo máximo" obligatorio errores={errores} ayuda={maximo ? `Máximo ${maximo} personas en este espacio (ejemplo).` : undefined}>
                                <input inputMode="numeric" {...props("cupo")} aria-describedby={errores.cupo ? `${id("cupo")}-error` : maximo ? `${id("cupo")}-ayuda` : undefined} value={datos.cupo} onChange={(e) => cambiar("cupo", e.target.value.replace(/\D/g, ""))} />
                            </Campo>
                            <Campo campo="inscripcion" etiqueta="Requiere inscripción" errores={errores}>
                                <select id={id("inscripcion")} className="cn-control" value={datos.inscripcion ? "Sí" : "No"} onChange={(e) => cambiar("inscripcion", e.target.value === "Sí")}>
                                    <option>Sí</option>
                                    <option>No</option>
                                </select>
                            </Campo>
                        </div>
                        <div className="cn-campos__fila">
                            <Campo campo="publico" etiqueta="Público" errores={errores}>
                                <select id={id("publico")} className="cn-control" value={datos.publico} onChange={(e) => cambiar("publico", e.target.value)}>
                                    {PUBLICOS.map((p) => <option key={p}>{p}</option>)}
                                </select>
                            </Campo>
                            <Campo campo="responsable" etiqueta="Responsable" obligatorio errores={errores}>
                                <input {...props("responsable")} placeholder="Área o persona responsable" value={datos.responsable} onChange={(e) => cambiar("responsable", e.target.value)} />
                            </Campo>
                        </div>
                        <Campo campo="materiales" etiqueta="Materiales o requisitos (opcional)" errores={errores}>
                            <input id={id("materiales")} className="cn-control" placeholder="Ej.: traer lápices de colores." value={datos.materiales} onChange={(e) => cambiar("materiales", e.target.value)} />
                        </Campo>
                    </div>
                </Tarjeta>

                <div className="cn-acciones">
                    {editando ? (
                        <>
                            <button type="button" className={clasesBoton("contorno")} onClick={() => guardarCambios(false)}>Guardar cambios</button>
                            <button type="button" className={clasesBoton("verde")} onClick={() => guardarCambios(true)}>Guardar y volver al detalle</button>
                            <Link to={`${BASE_PROPUESTAS}/${actividad.folio}`} className={clasesBoton("suave")}>Cancelar</Link>
                        </>
                    ) : (
                        <>
                            <button type="button" className={clasesBoton("contorno")} onClick={guardarBorrador}>Guardar borrador</button>
                            <button type="button" className={clasesBoton("verde")} onClick={enviarARevision}>Enviar a revisión</button>
                            <Link to={BASE_PROPUESTAS} className={clasesBoton("suave")}>Cancelar</Link>
                        </>
                    )}
                </div>

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

function Campo({ campo, etiqueta, obligatorio, ayuda, errores, children }: { campo: keyof DatosActividad; etiqueta: string; obligatorio?: boolean; ayuda?: string; errores: Errores; children: ReactNode }) {
    const id = `act-${campo}`;
    return (
        <div className="cn-campo">
            <label htmlFor={id} className="cn-campo__etiqueta">
                {etiqueta}
                {obligatorio && <span className="cn-campo__obligatorio" aria-label="obligatorio">*</span>}
            </label>
            {children}
            {errores[campo] ? <p id={`${id}-error`} className="cn-campo__error">{errores[campo]}</p> : ayuda && <p id={`${id}-ayuda`} className="cn-campo__ayuda">{ayuda}</p>}
        </div>
    );
}
