import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import { CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, Migas, Pagina, PieDatos, Resultado, Tarjeta, Ventana } from "../contenidos/piezas";
import { clasesBoton } from "../contenidos/utiles";
import { fechaCorta, obtenerActividad, useActividades } from "./datos";
import { cancelarInscripcion, inscribir, lugaresLibres, NOMBRE_ESTADO_INSCRIPCION, obtenerInscripcion, useInscripciones, validarInscripcion, type DatosInscripcion } from "./inscripciones";
import { BASE_INSCRIPCIONES, TONO_INSCRIPCION } from "./utiles";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoX from "../../../assets/admin/contenidos/resultado-x.svg";
import iconoReloj from "../../../assets/admin/actividades/resultado-reloj.svg";
import iconoAlerta from "../../../assets/admin/actividades/resultado-alerta.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";

// Inscripciones · ficha (Figma 569:27860) y cancelar inscripción (569:28939)
export function FichaInscripcion() {
    const { folio, id } = useParams();
    const navigate = useNavigate();
    useInscripciones();
    useActividades();
    const [cancelando, setCancelando] = useState(false);
    const i = obtenerInscripcion(id);
    const a = obtenerActividad(folio);
    if (!i || !a || i.actividad !== a.folio) return <Navigate to={a ? `${BASE_INSCRIPCIONES}/${a.folio}` : BASE_INSCRIPCIONES} replace />;
    const ruta = `${BASE_INSCRIPCIONES}/${a.folio}`;
    const banda = {
        confirmada: { tono: "verde" as const, icono: iconoCheck, titulo: "Inscripción confirmada" },
        asistida: { tono: "verde" as const, icono: iconoCheck, titulo: "Asistió a la actividad" },
        espera: { tono: "dorado" as const, icono: iconoReloj, titulo: "En lista de espera" },
        ofrecido: { tono: "dorado" as const, icono: iconoReloj, titulo: "Lugar ofrecido · espera confirmación" },
        cancelada: { tono: "guinda" as const, icono: iconoX, titulo: "Inscripción cancelada" },
    }[i.estado];

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Inscripciones y cupos", BASE_INSCRIPCIONES], [cancelando ? "Cancelar inscripción" : "Ficha de inscripción"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Inscripciones y cupos", ruta }} etiqueta="Inscripción" titulo={i.persona} texto={`${a.nombre} · ${a.folio}`} />
                <Resultado tono={banda.tono} icono={banda.icono} titulo={banda.titulo} linea={`Se ${i.estado === "espera" ? "anotó" : "inscribió"} el ${fechaCorta(i.fecha)} ${i.via.startsWith("Portal") ? "desde el portal" : "con el personal"}`} chip={<Chip tono={TONO_INSCRIPCION[i.estado]}>{NOMBRE_ESTADO_INSCRIPCION[i.estado]}</Chip>} />
                <Tarjeta icono={iconoLista} titulo="Datos de la inscripción">
                    <Datos filas={[["Persona", i.persona], ["Contacto", i.contacto], ["Acompañantes", i.acompanantes ? `${i.acompanantes} (ejemplo)` : "Sin acompañantes"], ["Cómo se inscribió", i.via], ["Notas", i.notas || "Sin notas"]]} />
                </Tarjeta>
                <div className="cn-acciones">
                    {i.estado !== "cancelada" && <button type="button" className={clasesBoton("contorno-guinda")} onClick={() => setCancelando(true)}>Cancelar inscripción</button>}
                    <Link to={ruta} className={clasesBoton("suave")}>Volver</Link>
                </div>
                <PieDatos />
            </Pagina>
            {cancelando && (
                <Ventana
                    titulo="¿Cancelar la inscripción?"
                    texto="Se avisará a la persona y su lugar quedará libre para la lista de espera."
                    alCerrar={() => setCancelando(false)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setCancelando(false)}>Volver</button><button type="button" className={clasesBoton("guinda")} onClick={() => { cancelarInscripcion(i.id); navigate(`${ruta}/${i.id}/cancelada`); }}>Cancelar inscripción</button></>}
                >
                    <Datos variante="caja" filas={[["Persona", i.persona], ["Actividad", a.nombre], ["Fecha", fechaCorta(a.fecha)]]} />
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Inscripciones · inscribir a una persona (Figma 569:29020) y cupo completo (569:29468)
export function InscribirPersona() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const actividades = useActividades().filter((a) => a.inscripcion && a.estado === "publicada");
    const inscripciones = useInscripciones();
    const inicial = params.get("actividad") ?? "";
    const [folio, setFolio] = useState(actividades.some((a) => a.folio === inicial) ? inicial : actividades[0]?.folio ?? "");
    const [d, setD] = useState<DatosInscripcion>({ persona: "", contacto: "", acompanantes: "0", notas: "" });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const a = actividades.find((x) => x.folio === folio);
    const completo = a ? lugaresLibres(a, inscripciones) <= 0 : false;
    const cambiar = (c: keyof DatosInscripcion, v: string) => { setD((x) => ({ ...x, [c]: v })); setErrores((e) => ({ ...e, [c]: "" })); };

    function guardar() {
        const e = validarInscripcion(d);
        if (!a) e.actividad = "Elige la actividad.";
        setErrores(e);
        if (Object.keys(e).length) return;
        const nueva = inscribir(a!.folio, d, completo);
        navigate(`${BASE_INSCRIPCIONES}/${a!.folio}/${nueva.id}/inscrita`);
    }
    const clase = (c: string) => `cn-control ${errores[c] ? "cn-control--error" : ""}`;

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Inscripciones y cupos", BASE_INSCRIPCIONES], [completo ? "Cupo completo" : "Inscribir persona"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Inscripciones y cupos", ruta: a ? `${BASE_INSCRIPCIONES}/${a.folio}` : BASE_INSCRIPCIONES }} etiqueta="Inscripciones" titulo="Inscribir a una persona" texto="Para quien no puede inscribirse desde el portal." />
                {completo && a && (
                    <Resultado tono="guinda" icono={iconoAlerta} titulo="No hay lugares disponibles" linea={`${a.nombre} está completa. Puedes anotarla en la lista de espera o ajustar el cupo.`} chip={<Chip tono="guinda">Cupo completo</Chip>} />
                )}
                <Tarjeta icono={iconoLapiz} titulo="Datos de la persona">
                    <div className="cn-campos">
                        <CampoTexto id="ip-actividad" etiqueta="Actividad" obligatorio error={errores.actividad}>
                            <select id="ip-actividad" className={clase("actividad")} value={folio} onChange={(e) => { setFolio(e.target.value); setErrores({}); }}>
                                {actividades.length === 0 && <option value="">No hay actividades con inscripción</option>}
                                {actividades.map((x) => <option key={x.folio} value={x.folio}>{x.nombre} · {fechaCorta(x.fecha)}</option>)}
                            </select>
                        </CampoTexto>
                        <div className="cn-campos__fila">
                            <CampoTexto id="ip-persona" etiqueta="Nombre completo" obligatorio error={errores.persona}><input id="ip-persona" className={clase("persona")} value={d.persona} onChange={(e) => cambiar("persona", e.target.value)} aria-invalid={!!errores.persona} /></CampoTexto>
                            <CampoTexto id="ip-contacto" etiqueta="Contacto" obligatorio error={errores.contacto}><input id="ip-contacto" className={clase("contacto")} placeholder="Teléfono o correo" value={d.contacto} onChange={(e) => cambiar("contacto", e.target.value)} aria-invalid={!!errores.contacto} /></CampoTexto>
                        </div>
                        <div className="cn-campos__fila">
                            <CampoTexto id="ip-acomp" etiqueta="Acompañantes" error={errores.acompanantes}><input id="ip-acomp" inputMode="numeric" className={clase("acompanantes")} value={d.acompanantes} onChange={(e) => cambiar("acompanantes", e.target.value.replace(/\D/g, ""))} /></CampoTexto>
                            <CampoTexto id="ip-notas" etiqueta="Notas (opcional)"><input id="ip-notas" className="cn-control" value={d.notas} onChange={(e) => cambiar("notas", e.target.value)} /></CampoTexto>
                        </div>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={guardar} disabled={!a}>{completo ? "Anotar en lista de espera" : "Inscribir"}</button>
                    {a && <Link to={`${BASE_INSCRIPCIONES}/${a.folio}`} className={clasesBoton("contorno")}>Ajustar cupo</Link>}
                    <Link to={BASE_INSCRIPCIONES} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Resultados: persona inscrita (569:29927), lugar ofrecido (569:28524), inscripción cancelada (624:51437), cupo ajustado (625:50258)
export function ResultadoInscripcion({ tipo }: { tipo: "inscrita" | "ofrecido" | "cancelada" | "cupo" }) {
    const { folio, id } = useParams();
    useInscripciones();
    useActividades();
    const a = obtenerActividad(folio);
    const i = obtenerInscripcion(id);
    if (!a || (tipo !== "cupo" && !i)) return <Navigate to={BASE_INSCRIPCIONES} replace />;
    const ruta = `${BASE_INSCRIPCIONES}/${a.folio}`;
    const enEspera = i?.estado === "espera";
    const datos = {
        inscrita: { titulo: enEspera ? "Persona en lista de espera" : "Persona inscrita", texto: enEspera ? "Se le avisará si se libera un lugar." : "Ya ocupa un lugar en la actividad.", tono: enEspera ? ("dorado" as const) : ("verde" as const), icono: enEspera ? iconoReloj : iconoCheck, nombre: i?.persona ?? "", linea: `${a.nombre} · ${fechaCorta(a.fecha)}` },
        ofrecido: { titulo: "Lugar ofrecido", texto: "La persona tiene 24 horas para confirmar.", tono: "dorado" as const, icono: iconoReloj, nombre: i?.persona ?? "", linea: `${a.nombre} · se le avisó por correo (ejemplo)` },
        cancelada: { titulo: "Inscripción cancelada", texto: "El lugar quedó libre para la lista de espera.", tono: "guinda" as const, icono: iconoX, nombre: i?.persona ?? "", linea: `${a.nombre} · ${fechaCorta(a.fecha)}` },
        cupo: { titulo: "Cupo ajustado", texto: "El portal ya muestra los lugares disponibles.", tono: "verde" as const, icono: iconoCheck, nombre: a.nombre, linea: `Nuevo cupo: ${a.cupo} · ${lugaresLibres(a)} lugares libres` },
    }[tipo];
    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Inscripciones y cupos", BASE_INSCRIPCIONES], [datos.titulo]]} />
                <Encabezado grande etiqueta={`Actividad ${a.folio}`} titulo={datos.titulo} texto={datos.texto} />
                <Resultado tono={datos.tono} icono={datos.icono} titulo={datos.nombre} linea={datos.linea} chip={i ? <Chip tono={TONO_INSCRIPCION[i.estado]}>{NOMBRE_ESTADO_INSCRIPCION[i.estado]}</Chip> : <Chip tono="verde">Cupo {a.cupo}</Chip>} />
                <div className="cn-acciones">
                    <Link to={ruta} className={clasesBoton("verde")}>Ver inscritos</Link>
                    {tipo === "inscrita" && <Link to={`${BASE_INSCRIPCIONES}/inscribir?actividad=${a.folio}`} className={clasesBoton("contorno")}>Inscribir a otra persona</Link>}
                    {tipo === "cupo" && a.espera > 0 && <Link to={`${ruta}?ver=espera`} className={clasesBoton("contorno")}>Ofrecer a la lista de espera</Link>}
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}
