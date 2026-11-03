import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import { CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, Migas, Pagina, PieDatos, Resultado, Tarjeta } from "../contenidos/piezas";
import { clasesBoton } from "../contenidos/utiles";
import { capacidadDe, espacios, fechaCorta, useActividades } from "./datos";
import { hoyISO } from "./salas";
import { guardarUso, obtenerUso, useVisitas, validarUso, type UsoEspacio } from "./visitas";
import { BASE_VISITAS } from "./utiles";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoCalendario from "../../../assets/admin/actividades/tarjeta-calendario.svg";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";

const REGISTRO = `${BASE_VISITAS}?vista=uso`;
const QUIEN_REGISTRA = "Personal de Servicios (ejemplo)";

// Uso de espacios · registrar (Figma 567:23607). ?id= completa un uso "por registrar"; /uso/:id/editar lo corrige.
export function RegistrarUso() {
    const [params] = useSearchParams();
    const { id: idRuta } = useParams();
    useVisitas();
    const existente = obtenerUso(idRuta ?? params.get("id") ?? undefined);
    return <Formulario key={existente?.id ?? "nuevo"} existente={existente} />;
}

function Formulario({ existente }: { existente?: UsoEspacio }) {
    const navigate = useNavigate();
    const actividades = useActividades();
    const [d, setD] = useState({
        sala: existente?.sala ?? "", fecha: existente?.fecha ?? hoyISO(), actividad: existente?.actividad ?? "",
        personas: existente?.personas ?? "", horas: existente?.horas ?? "", incidencias: existente?.incidencias ?? "",
    });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const cambiar = (c: keyof typeof d, v: string) => { setD((x) => ({ ...x, [c]: v })); setErrores((e) => ({ ...e, [c]: "" })); };
    const opciones = actividades.filter((a) => a.espacio === d.sala && a.fecha === d.fecha && a.estado !== "archivada").map((a) => a.nombre);

    function guardar() {
        const e = validarUso(d, capacidadDe(d.sala));
        setErrores(e);
        if (Object.keys(e).length) return;
        const id = guardarUso({ ...d, registro: QUIEN_REGISTRA }, existente?.id);
        navigate(`${BASE_VISITAS}/uso/${id}/guardado`);
    }
    const clase = (c: string) => `cn-control ${errores[c] ? "cn-control--error" : ""}`;

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios", REGISTRO], [existente?.estado === "registrado" ? "Editar registro" : "Registrar uso"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Visitas y uso de espacios", ruta: REGISTRO }} etiqueta="Uso de espacios" titulo={existente?.estado === "registrado" ? "Editar registro de uso" : "Registrar uso de un espacio"} texto="Anota cuántas personas usaron la sala y qué pasó." />
                <Tarjeta icono={iconoLapiz} titulo="Datos del uso">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <CampoTexto id="us-sala" etiqueta="Sala" obligatorio error={errores.sala}><select id="us-sala" className={clase("sala")} value={d.sala} onChange={(e) => cambiar("sala", e.target.value)}><option value="">Elige una sala</option>{espacios().map((x) => <option key={x.nombre}>{x.nombre}</option>)}</select></CampoTexto>
                            <CampoTexto id="us-fecha" etiqueta="Fecha" obligatorio error={errores.fecha}><input id="us-fecha" type="date" max={hoyISO()} className={clase("fecha")} value={d.fecha} onChange={(e) => cambiar("fecha", e.target.value)} /></CampoTexto>
                            <CampoTexto id="us-actividad" etiqueta="Actividad">
                                <input id="us-actividad" list="us-actividades" className="cn-control" placeholder="Uso libre" value={d.actividad} onChange={(e) => cambiar("actividad", e.target.value)} />
                                <datalist id="us-actividades">{opciones.map((x) => <option key={x} value={x} />)}</datalist>
                            </CampoTexto>
                        </div>
                        <div className="cn-campos__fila">
                            <CampoTexto id="us-personas" etiqueta="Personas que asistieron" obligatorio error={errores.personas}><input id="us-personas" inputMode="numeric" className={clase("personas")} value={d.personas} onChange={(e) => cambiar("personas", e.target.value.replace(/\D/g, ""))} /></CampoTexto>
                            <CampoTexto id="us-horas" etiqueta="Horas de uso" obligatorio error={errores.horas}><input id="us-horas" inputMode="decimal" className={clase("horas")} value={d.horas} onChange={(e) => cambiar("horas", e.target.value.replace(/[^\d.]/g, ""))} /></CampoTexto>
                        </div>
                        <CampoTexto id="us-incidencias" etiqueta="Incidencias (opcional)">
                            <textarea id="us-incidencias" className="cn-control cn-control--area" placeholder="Ej.: falla del proyector 10 minutos." value={d.incidencias} onChange={(e) => cambiar("incidencias", e.target.value)} />
                        </CampoTexto>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={guardar}>Guardar registro</button>
                    <Link to={REGISTRO} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Uso de espacios · ficha (Figma 567:24476)
export function FichaUso() {
    const { id } = useParams();
    useVisitas();
    const u = obtenerUso(id);
    if (!u) return <Navigate to={REGISTRO} replace />;
    const capacidad = capacidadDe(u.sala);
    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios", REGISTRO], ["Ficha de uso"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Visitas y uso de espacios", ruta: REGISTRO }} etiqueta="Uso de espacios" titulo={`${u.sala} · ${fechaCorta(u.fecha)}`} texto={`${u.actividad || "Uso libre"}.`} />
                <Tarjeta icono={iconoCalendario} titulo="Datos del uso">
                    <Datos filas={[["Personas", capacidad ? `${u.personas} de ${capacidad}` : u.personas], ["Horas", u.horas], ["Registró", u.registro ?? "Sin registrar"], ["Incidencias", u.incidencias || "Sin incidencias"]]} />
                </Tarjeta>
                <div className="cn-acciones">
                    <Link to={`${BASE_VISITAS}/uso/${u.id}/editar`} className={clasesBoton("contorno")}>Editar registro</Link>
                    <Link to={REGISTRO} className={clasesBoton("verde")}>Volver a Visitas y uso de espacios</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Uso de espacios · registro guardado (Figma 567:24061)
export function UsoGuardado() {
    const { id } = useParams();
    useVisitas();
    const u = obtenerUso(id);
    if (!u) return <Navigate to={REGISTRO} replace />;
    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios", REGISTRO], ["Registro guardado"]]} />
                <Encabezado grande etiqueta="Uso de espacios" titulo="Registro guardado" texto="El uso de la sala quedó registrado." />
                <Resultado tono="verde" icono={iconoCheck} titulo={`${u.sala} · ${fechaCorta(u.fecha)}`} linea={`${u.actividad || "Uso libre"} · ${u.personas} personas · ${u.horas} h`} chip={<Chip tono="verde">Registrado</Chip>} />
                <div className="cn-acciones">
                    <Link to={REGISTRO} className={clasesBoton("verde")}>Ver registro de uso</Link>
                    <Link to={`${BASE_VISITAS}/uso/registrar`} className={clasesBoton("contorno")}>Registrar otro uso</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}
