import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import { obtenerContenido, rechazarContenido, useContenidos } from "./datos";
import { CampoTexto, Columnas, EncabezadoTarjeta, Migas, Pagina, PieDatos, Tarjeta } from "./piezas";
import { clasesBoton } from "./utiles";
import iconoAlerta from "../../../assets/admin/contenidos/tarjeta-alerta.svg";
import iconoAyuda from "../../../assets/admin/contenidos/tarjeta-ayuda.svg";

const BASE = "/admin/contenidos/revision";

const MOTIVOS_RECHAZO = [
    "Contenido duplicado",
    "No corresponde al portal",
    "Información incorrecta o sin confirmar",
    "Sin permiso de uso de la imagen",
    "Otro motivo",
];

type Errores = { motivo?: string; explicacion?: string; entiendo?: string };

// HU-12 · Revisión: rechazar un contenido (Figma 560:18862, Memoria 610:48563)
function RechazarContenido() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useContenidos();
    const contenido = obtenerContenido(folio);
    const [motivo, setMotivo] = useState("");
    const [explicacion, setExplicacion] = useState("");
    const [entiendo, setEntiendo] = useState(false);
    const [errores, setErrores] = useState<Errores>({});

    if (!contenido || contenido.estado !== "por-autorizar") return <Navigate to={contenido ? `${BASE}/${contenido.folio}` : BASE} replace />;
    const ruta = `${BASE}/${contenido.folio}`;

    function rechazar() {
        const nuevos: Errores = {};
        if (!motivo) nuevos.motivo = "Elige el motivo del rechazo.";
        if (!explicacion.trim()) nuevos.explicacion = "Explica al Editor por qué se rechaza.";
        if (!entiendo) nuevos.entiendo = "Confirma que entiendes que no se publicará.";
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) return;
        rechazarContenido(contenido!.folio, motivo, explicacion);
        navigate(`${ruta}/rechazado`);
    }

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Revisión y publicación", BASE], ["Rechazar contenido"]]} />

                <EncabezadoTarjeta
                    volver={{ texto: "Volver a la revisión", ruta }}
                    etiqueta={`Contenido ${contenido.folio} · Rechazar`}
                    titulo="Rechazar contenido"
                    texto="El contenido no se publicará y el Editor recibirá el motivo. Esta decisión queda registrada."
                />

                <Columnas
                    principal={
                        <Tarjeta icono={iconoAlerta} titulo="Motivo del rechazo" subtitulo="Obligatorio. Se envía al Editor." tono="alerta">
                            <CampoTexto id="cn-motivo" etiqueta="Motivo" obligatorio error={errores.motivo}>
                                <select
                                    id="cn-motivo"
                                    className={`cn-control ${errores.motivo ? "cn-control--error" : ""}`}
                                    value={motivo}
                                    onChange={(e) => { setMotivo(e.target.value); setErrores((x) => ({ ...x, motivo: undefined })); }}
                                    aria-invalid={!!errores.motivo}
                                >
                                    <option value="">Elige un motivo</option>
                                    {MOTIVOS_RECHAZO.map((m) => <option key={m}>{m}</option>)}
                                </select>
                            </CampoTexto>
                            <CampoTexto id="cn-explicacion" etiqueta="Explicación para el Editor" obligatorio error={errores.explicacion}>
                                <textarea
                                    id="cn-explicacion"
                                    className={`cn-control cn-control--area cn-control--alta ${errores.explicacion ? "cn-control--error" : ""}`}
                                    placeholder="Ej.: este tema ya está cubierto por la reseña CN-0022."
                                    value={explicacion}
                                    onChange={(e) => { setExplicacion(e.target.value); setErrores((x) => ({ ...x, explicacion: undefined })); }}
                                    aria-invalid={!!errores.explicacion}
                                />
                            </CampoTexto>
                            <div>
                                <label className="cn-confirmacion">
                                    <span className="cn-casilla cn-casilla--guinda">
                                        <input type="checkbox" checked={entiendo} onChange={(e) => { setEntiendo(e.target.checked); setErrores((x) => ({ ...x, entiendo: undefined })); }} aria-describedby={errores.entiendo ? "cn-entiendo-error" : undefined} />
                                        <span aria-hidden="true" />
                                    </span>
                                    Entiendo que el contenido no se publicará.
                                </label>
                                {errores.entiendo && <p id="cn-entiendo-error" className="cn-campo__error" role="alert">{errores.entiendo}</p>}
                            </div>
                            <div className="cn-acciones">
                                <button type="button" className={clasesBoton("guinda")} onClick={rechazar}>Rechazar contenido</button>
                                <Link to={ruta} className={clasesBoton("contorno")}>Cancelar</Link>
                            </div>
                        </Tarjeta>
                    }
                    lateral={
                        <Tarjeta icono={iconoAyuda} titulo="¿Solo necesita correcciones?" tono="crema" lateral>
                            <p className="cn-parrafo">Si el contenido puede salvarse, pide cambios en lugar de rechazarlo: el Editor conserva su trabajo y lo corrige.</p>
                            <Link to={`${ruta}/cambios`} className={clasesBoton("contorno", "cn-boton--ancho")}>Pedir cambios en su lugar</Link>
                        </Tarjeta>
                    }
                />

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default RechazarContenido;
