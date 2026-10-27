import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../../PanelLayout";
import { Chip, EncabezadoPagina, Tarjeta } from "../../componentes";
import { MENSAJE_OBLIGATORIO } from "../../../../servicios/validaciones";
import { actualizarSolicitud, useSolicitudes, type Propuesta } from "../datos";
import { fechaPropuesta } from "./fechaPropuesta";
import tarjetaEstrella from "../../../../assets/admin/tarjeta-star.svg";
import tarjetaInfo from "../../../../assets/admin/tarjeta-info.svg";
import portadaEstrella from "../../../../assets/admin/portada-star.svg";
import chipCalendario from "../../../../assets/admin/chip-calendar.svg";
import chipUsuarios from "../../../../assets/admin/chip-users.svg";
import botonCheck from "../../../../assets/admin/boton-check.svg";

const RUTA = "/admin/atencion/propuestas";

// Formulario de "Ajustes antes de publicar"; lo de arriba se actualiza mientras escribes
function FormularioPublicacion({ propuesta }: { propuesta: Propuesta }) {
    const navigate = useNavigate();
    const rutaDetalle = `${RUTA}/${propuesta.folio}`;

    const [titulo, setTitulo] = useState(propuesta.titulo);
    // Para la descripción corta proponemos la primera parte de la descripción
    const [descripcion, setDescripcion] = useState(propuesta.descripcion.split(",")[0]);
    const [fechaHorario, setFechaHorario] = useState("");
    const [portada, setPortada] = useState("");
    const [cupo, setCupo] = useState(String(propuesta.participantes));
    const [espacio, setEspacio] = useState(propuesta.espacio);
    const [errorCupo, setErrorCupo] = useState("");

    function publicar() {
        if (!/^[0-9]+$/.test(cupo.trim()) || Number(cupo) < 1) {
            setErrorCupo(cupo.trim() ? "Escribe el cupo con números, por ejemplo 20." : MENSAJE_OBLIGATORIO);
            return;
        }
        actualizarSolicitud("propuestas", propuesta.folio, {
            titulo: titulo.trim() || propuesta.titulo,
            espacio,
            estado: "aprobada",
            resolucion: { fecha: "Hoy" },
        });
        navigate(rutaDetalle);
        window.scrollTo(0, 0);
    }

    const fechaVisible = fechaHorario.trim() || (propuesta.fecha ? fechaPropuesta(propuesta) : "Fecha por confirmar");

    return (
        <div className="columnas">
            <div className="columna-principal">
                <Tarjeta icono={tarjetaEstrella} titulo="Así se verá en Eventos" subtitulo="Vista de ejemplo, no es la publicación final.">
                    <div className="portada-evento">
                        {portada ? (
                            <img src={portada} alt="" className="portada-evento__imagen" />
                        ) : (
                            <>
                                <img src={portadaEstrella} alt="" />
                                <span>Portada del evento (ejemplo)</span>
                            </>
                        )}
                    </div>
                    <div className="fila-chips">
                        <Chip tono="verde-solido">{propuesta.tipo}</Chip>
                        <Chip tono="dorado" icono={chipCalendario}>
                            {fechaVisible}
                        </Chip>
                        <Chip tono="verde" icono={chipUsuarios}>
                            Cupo: {cupo || "?"} personas
                        </Chip>
                    </div>
                    <h3 className="vista-previa__titulo">{titulo || propuesta.titulo}</h3>
                    <p className="vista-previa__lugar">{espacio}</p>
                    <p className="texto-tarjeta texto-tarjeta--grande">{propuesta.descripcion}</p>
                </Tarjeta>

                <Tarjeta
                    icono={tarjetaInfo}
                    tonoIcono="dorado"
                    titulo="Ajustes antes de publicar"
                    subtitulo="Puedes corregir el texto sin pedirle cambios a la persona."
                >
                    <div className="campo-panel">
                        <label htmlFor="titulo-evento" className="campo-panel__etiqueta">Título en Eventos</label>
                        <input id="titulo-evento" className="entrada-panel" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                    </div>
                    <div className="campo-panel">
                        <label htmlFor="descripcion-corta" className="campo-panel__etiqueta">Descripción corta</label>
                        <input
                            id="descripcion-corta"
                            className="entrada-panel"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                        />
                    </div>
                    <div className="ventana__fila">
                        <div className="campo-panel">
                            <label htmlFor="fecha-horario" className="campo-panel__etiqueta">Fecha y horario</label>
                            <input
                                id="fecha-horario"
                                className="entrada-panel"
                                placeholder="Por definir"
                                value={fechaHorario}
                                onChange={(e) => setFechaHorario(e.target.value)}
                            />
                        </div>
                        <div className="campo-panel">
                            <label htmlFor="portada" className="campo-panel__etiqueta">Portada (opcional)</label>
                            <label className="entrada-panel entrada-panel--archivo">
                                {portada ? "Imagen elegida" : "Subir imagen"}
                                <input
                                    id="portada"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const archivo = e.target.files?.[0];
                                        if (archivo) setPortada(URL.createObjectURL(archivo));
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                    <div className="ventana__fila">
                        <div className="campo-panel">
                            <label htmlFor="cupo" className="campo-panel__etiqueta">
                                Cupo máximo <span>(obligatorio)</span>
                            </label>
                            <input
                                id="cupo"
                                inputMode="numeric"
                                className={`entrada-panel ${errorCupo ? "entrada-panel--error" : ""}`}
                                value={cupo}
                                onChange={(e) => {
                                    setCupo(e.target.value);
                                    setErrorCupo("");
                                }}
                            />
                            {errorCupo ? (
                                <p className="campo-panel__error">{errorCupo}</p>
                            ) : (
                                <p className="campo-panel__ayuda">Por defecto, el estimado de la propuesta.</p>
                            )}
                        </div>
                        <div className="campo-panel">
                            <label htmlFor="espacio" className="campo-panel__etiqueta">Espacio</label>
                            <input id="espacio" className="entrada-panel" value={espacio} onChange={(e) => setEspacio(e.target.value)} />
                        </div>
                    </div>
                </Tarjeta>
            </div>

            <div className="columna-lateral">
                <Tarjeta variante="decision" tonoIcono="dorado" titulo="Publicar" subtitulo="Confirma para aprobar la propuesta.">
                    <button type="button" className="boton-panel boton-panel--verde boton-panel--grande boton-panel--ancho" onClick={publicar}>
                        Aprobar y publicar
                        <img src={botonCheck} alt="" />
                    </button>
                    <Link to={rutaDetalle} className="boton-panel boton-panel--oscuro boton-panel--grande boton-panel--ancho">
                        Volver a la revisión
                    </Link>
                    <p className="decision__nota">
                        La persona recibe el resultado en sus notificaciones y el evento aparece en Eventos.
                    </p>
                </Tarjeta>
            </div>
        </div>
    );
}

function VistaPrevia() {
    const { folio } = useParams();
    const propuestas = useSolicitudes("propuestas");
    const propuesta = propuestas.find((p) => p.folio === folio);

    if (!propuesta) return <Navigate to={RUTA} replace />;
    // Si ya se decidió, no hay nada que publicar
    if (propuesta.estado === "aprobada" || propuesta.estado === "rechazada") {
        return <Navigate to={`${RUTA}/${propuesta.folio}`} replace />;
    }

    return (
        <PanelLayout titulo="Atención">
            <EncabezadoPagina
                volver={{ texto: "Volver a la revisión", ruta: `${RUTA}/${propuesta.folio}` }}
                etiqueta={`PROPUESTA ${propuesta.folio} · POR PUBLICAR`}
                titulo="Vista previa de publicación"
                texto="Así se publicará en Eventos al aprobar. Ajusta el texto antes de publicar. Datos de ejemplo."
            />
            <FormularioPublicacion propuesta={propuesta} />
        </PanelLayout>
    );
}

export default VistaPrevia;
