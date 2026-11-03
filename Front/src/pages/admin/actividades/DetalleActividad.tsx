import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, Datos, EncabezadoTarjeta, Migas, Pagina, PieDatos, Resultado, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import {
    archivarActividad, actualizarActividad, fechaCorta, horario, NOMBRE_ESTADO_ACTIVIDAD, obtenerActividad, publicarActividad, useActividades, validarActividad, datosDe,
    type Actividad,
} from "./datos";
import { BASE_PROPUESTAS, TONO_ACTIVIDAD } from "./utiles";
import iconoReloj from "../../../assets/admin/actividades/resultado-reloj.svg";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoLapiz from "../../../assets/admin/contenidos/resultado-lapiz.svg";
import iconoX from "../../../assets/admin/contenidos/resultado-x.svg";
import iconoArchivo from "../../../assets/admin/actividades/tarjeta-archivo.svg";
import iconoDiana from "../../../assets/admin/actividades/tarjeta-diana.svg";

type Ventanas = null | "publicar" | "error" | "archivar";

// Banda de estado de arriba según en qué va la actividad
function banda(a: Actividad) {
    const autorizo = a.autorizo ? `Autorizó: ${a.autorizo.quien} · ${fechaCorta(a.autorizo.fecha)}` : "";
    switch (a.estado) {
        case "aprobada": return { tono: "dorado" as const, icono: iconoReloj, titulo: "Aprobada · lista para publicar", linea: autorizo };
        case "en-revision": return { tono: "dorado" as const, icono: iconoReloj, titulo: "En revisión · espera decisión", linea: "Coordinación revisa la propuesta (ejemplo)." };
        case "borrador": return { tono: "dorado" as const, icono: iconoLapiz, titulo: "Borrador · sin enviar", linea: "Complétala y envíala a revisión cuando esté lista." };
        case "publicada": return { tono: "verde" as const, icono: iconoCheck, titulo: "Publicada · visible en el portal", linea: `${a.publicadaEl ? `Publicada el ${fechaCorta(a.publicadaEl)}` : "Publicada"} · ${a.inscripcion ? "inscripciones abiertas" : "entrada libre"}` };
        case "cancelada": return { tono: "guinda" as const, icono: iconoX, titulo: "Cancelada", linea: "Se avisó a las personas inscritas (ejemplo)." };
        default: return { tono: "guinda" as const, icono: iconoX, titulo: "Archivada", linea: a.archivo ? `Motivo: ${a.archivo.motivo}` : "Ya no se muestra." };
    }
}

// Actividades · Propuestas: detalle (Figma 565:20146) y vista previa pública (617:49040)
function DetalleActividad({ previa = false }: { previa?: boolean }) {
    const { folio } = useParams();
    useActividades();
    const actividad = obtenerActividad(folio);
    if (!actividad) return <Navigate to={BASE_PROPUESTAS} replace />;
    return <Contenido key={actividad.folio} actividad={actividad} previa={previa} />;
}

function Contenido({ actividad: a, previa }: { actividad: Actividad; previa: boolean }) {
    const navigate = useNavigate();
    const [ventana, setVentana] = useState<Ventanas>(null);
    const [ocupado, setOcupado] = useState(false);
    const ruta = `${BASE_PROPUESTAS}/${a.folio}`;
    const b = banda(a);
    const editable = ["borrador", "en-revision", "aprobada"].includes(a.estado);

    async function publicar() {
        setOcupado(true);
        try {
            await publicarActividad(a.folio);
            navigate(`${ruta}/publicada`);
        } catch {
            setVentana("error");
        } finally {
            setOcupado(false);
        }
    }

    function enviarARevision() {
        // Un borrador incompleto se termina en el formulario
        if (Object.keys(validarActividad(datosDe(a))).length > 0) return navigate(`${ruta}/editar`);
        actualizarActividad(a.folio, { estado: "en-revision" });
    }

    const texto = previa
        ? "Así se vería en el portal público. Aún no está publicada."
        : {
              borrador: "Borrador. Aún no se envía a revisión.",
              "en-revision": "En revisión. Coordinación decide si se aprueba.",
              aprobada: "Aprobada. Falta publicarla en el portal.",
              publicada: "Publicada. Se ve en Eventos del portal.",
              cancelada: "Cancelada. Ya no se realizará.",
              archivada: "Archivada. Se conserva en el historial.",
          }[a.estado];

    const resumen: [string, string][] = [["Folio", a.folio], ["Fecha", `${fechaCorta(a.fecha)} · ${a.inicio || "--:--"}`], ["Cupo", a.cupo || "—"]];

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Propuestas de actividades", BASE_PROPUESTAS], [ventana === "publicar" || ventana === "error" ? "Confirmar publicación" : ventana === "archivar" ? "Archivar actividad" : "Detalle"]]} />

                <EncabezadoTarjeta
                    volver={previa ? { texto: "Volver al detalle", ruta } : { texto: "Volver a Propuestas de actividades", ruta: BASE_PROPUESTAS }}
                    etiqueta={`${previa ? "Vista previa · " : ""}Actividad ${a.folio}`}
                    titulo={a.nombre || "Actividad sin nombre"}
                    texto={texto}
                />

                <Resultado tono={b.tono} icono={b.icono} titulo={b.titulo} linea={b.linea} chip={<Chip tono={TONO_ACTIVIDAD[a.estado]}>{NOMBRE_ESTADO_ACTIVIDAD[a.estado]}</Chip>} />

                <Tarjeta icono={iconoArchivo} titulo="Datos de la actividad">
                    {previa && a.descripcion && <p className="cn-parrafo">{a.descripcion}</p>}
                    <Datos
                        filas={[
                            ["Fecha y hora", horario(a)],
                            ["Espacio", a.espacio || "Por definir"],
                            ["Cupo", `${a.cupo || "—"} personas · ${a.inscripcion ? "inscripción abierta" : "entrada libre"}`],
                            ["Público", a.publico],
                            ["Responsable", a.responsable || "Por definir"],
                            ...(a.materiales ? [["Materiales o requisitos", a.materiales] as [string, string]] : []),
                        ]}
                    />
                </Tarjeta>

                <Tarjeta icono={iconoDiana} titulo="Inscripciones y cupo">
                    <Datos
                        filas={[
                            ["Inscritos", a.estado === "publicada" || a.estado === "cancelada" ? `${a.inscritos} de ${a.cupo}` : `0 de ${a.cupo || "—"} (aún sin publicar)`],
                            ["Lista de espera", a.espera > 0 ? `${a.espera} personas` : "Sin lista"],
                        ]}
                    />
                </Tarjeta>

                <div className="cn-acciones">
                    {a.estado === "aprobada" && <button type="button" className={clasesBoton("verde")} onClick={() => setVentana("publicar")}>Publicar actividad</button>}
                    {previa ? (
                        editable && <Link to={`${ruta}/editar`} className={clasesBoton("contorno")}>Seguir editando</Link>
                    ) : (
                        <>
                            {a.estado === "borrador" && <button type="button" className={clasesBoton("verde")} onClick={enviarARevision}>Enviar a revisión</button>}
                            {editable && <Link to={`${ruta}/editar`} className={clasesBoton("contorno")}>Editar</Link>}
                            {editable && <Link to={`${ruta}/vista-previa`} className={clasesBoton("contorno")}>Vista previa</Link>}
                            {editable && <button type="button" className={clasesBoton("contorno-guinda")} onClick={() => setVentana("archivar")}>Archivar</button>}
                            {a.estado === "publicada" && (
                                <>
                                    <a href="/eventos" target="_blank" rel="noopener noreferrer" className={clasesBoton("verde")}>Ver en el portal ↗<span className="cn-solo-lectores"> (se abre en otra pestaña)</span></a>
                                    <Link to="/admin/actividades/inscripciones" className={clasesBoton("contorno")}>Inscripciones y cupos</Link>
                                    <Link to="/admin/actividades/cambios" className={clasesBoton("contorno")}>Cambios y cancelaciones</Link>
                                </>
                            )}
                        </>
                    )}
                </div>

                <PieDatos />
            </Pagina>

            {(ventana === "publicar" || ventana === "error") && (
                <Ventana
                    titulo={ventana === "error" ? "No se pudo publicar" : "¿Publicar la actividad?"}
                    texto={ventana === "error" ? "La actividad sigue como aprobada y no se perdió nada." : "Se verá en Eventos del portal y los visitantes podrán inscribirse."}
                    alCerrar={() => setVentana(null)}
                    pie={
                        <>
                            <button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button>
                            <button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={() => void publicar()}>
                                {ocupado ? "Publicando…" : ventana === "error" ? "Reintentar" : "Publicar ahora"}
                            </button>
                        </>
                    }
                >
                    <Datos variante="caja" filas={resumen} />
                    {ventana === "error" && (
                        <div className="cn-aviso cn-aviso--chico" role="alert">
                            <span className="cn-aviso__x" aria-hidden="true">✕</span>
                            <div className="cn-aviso__textos">
                                <strong>Hubo un problema al guardar</strong>
                                <p>Intenta de nuevo en unos minutos.</p>
                            </div>
                        </div>
                    )}
                </Ventana>
            )}

            {ventana === "archivar" && (
                <VentanaArchivar
                    actividad={a}
                    alCerrar={() => setVentana(null)}
                    alArchivar={(motivo) => {
                        archivarActividad(a.folio, motivo);
                        navigate(BASE_PROPUESTAS);
                    }}
                />
            )}
        </PanelLayout>
    );
}

function VentanaArchivar({ actividad, alCerrar, alArchivar }: { actividad: Actividad; alCerrar: () => void; alArchivar: (motivo: string) => void }) {
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    return (
        <Ventana
            titulo="¿Archivar la actividad?"
            texto="Dejará de mostrarse. Se conserva el historial y puedes restaurarla."
            alCerrar={alCerrar}
            pie={
                <>
                    <button type="button" className={clasesBoton("contorno")} onClick={alCerrar}>Cancelar</button>
                    <button type="button" className={clasesBoton("guinda")} onClick={() => (motivo.trim() ? alArchivar(motivo) : setError("Escribe el motivo."))}>Archivar</button>
                </>
            }
        >
            <Datos variante="caja" filas={[["Folio", actividad.folio], ["Estado actual", NOMBRE_ESTADO_ACTIVIDAD[actividad.estado]]]} />
            <CampoTexto id="act-motivo-archivo" etiqueta="Motivo" obligatorio error={error}>
                <textarea
                    id="act-motivo-archivo"
                    className={`cn-control cn-control--area ${error ? "cn-control--error" : ""}`}
                    placeholder="Ej.: ya no se realizará."
                    value={motivo}
                    onChange={(e) => { setMotivo(e.target.value); setError(""); }}
                    aria-invalid={!!error}
                    aria-describedby={error ? "act-motivo-archivo-error" : undefined}
                />
            </CampoTexto>
        </Ventana>
    );
}

export default DetalleActividad;
