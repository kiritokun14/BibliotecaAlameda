import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./Actividades.css";
import { BloqueResumen, Buscador, CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Tabla, Tarjeta, Ventana } from "../contenidos/piezas";
import { clasesBoton, paginar } from "../contenidos/utiles";
import { capacidadDe, fechaCorta, obtenerActividad, useActividades, type Actividad } from "./datos";
import { hoyISO } from "./salas";
import { ajustarCupo, deActividad, estadoCupo, lugaresLibres, NOMBRE_ESTADO_INSCRIPCION, ofrecerLugar, useInscripciones, validarCupo, type Inscripcion } from "./inscripciones";
import { BASE_INSCRIPCIONES, TONO_INSCRIPCION } from "./utiles";
import iconoArchivo from "../../../assets/admin/actividades/resumen-archivo.svg";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoX from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import iconoCheck from "../../../assets/admin/contenidos/resumen-check.svg";
import iconoTarjeta from "../../../assets/admin/actividades/tarjeta-archivo.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import iconoRelojTarjeta from "../../../assets/admin/contenidos/tarjeta-reloj.svg";
import vacioArchivo from "../../../assets/admin/actividades/vacio-archivo.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

type FiltroCupo = "todas" | "casi" | "completo" | "pasada";

// Barra de cupo: verde, dorada (casi llena) o guinda (completa)
function BarraCupo({ ocupados, cupo, tono }: { ocupados: number; cupo: number; tono: string }) {
    return (
        <span className="ac-cupo">
            <span className="ac-cupo__barra" role="img" aria-label={`${ocupados} de ${cupo} lugares ocupados`}>
                <span className={`ac-cupo__relleno ac-cupo__relleno--${tono}`} style={{ width: `${Math.min(100, (ocupados / Math.max(1, cupo)) * 100)}%` }} />
            </span>
            <strong>{ocupados} / {cupo}</strong>
        </span>
    );
}

// Inscripciones y cupos: lista de actividades (Figma 569:26406, sin actividades 569:30342, sin resultados 569:30589)
function Inscripciones() {
    const actividades = useActividades();
    const inscripciones = useInscripciones();
    const navigate = useNavigate();
    const [filtro, setFiltro] = useState<FiltroCupo>("todas");
    const [busqueda, setBusqueda] = useState("");
    const hoy = hoyISO();
    const texto = busqueda.trim().toLowerCase();

    const conInscripcion = actividades.filter((a) => a.inscripcion && a.estado === "publicada");
    const estado = (a: Actividad) => estadoCupo(a, hoy, inscripciones);
    const cuenta = (c: string) => conInscripcion.filter((a) => estado(a).clave === c).length;
    const filtradas = conInscripcion
        .filter((a) => filtro === "todas" || estado(a).clave === filtro)
        .filter((a) => !texto || a.nombre.toLowerCase().includes(texto) || a.folio.toLowerCase().includes(texto))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ocupados = (a: Actividad) => Number(a.cupo) - lugaresLibres(a, inscripciones);
    const elegir = (f: FiltroCupo) => setFiltro(f);

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Inscripciones y cupos"], ["Lista de actividades"]]} />
                <Encabezado etiqueta="Actividades · Inscripciones" titulo="Inscripciones y cupos" texto="Quién se inscribió, cuántos lugares quedan y quién espera." />
                <BloqueResumen
                    insignia="Inscripciones y cupos"
                    titulo="Cupos de"
                    resalte="hoy"
                    subtitulo="Actividades con inscripción y lugares disponibles · cifras de ejemplo"
                    accesos={[
                        { icono: iconoArchivo, numero: cuenta("abierta") + cuenta("casi"), titulo: "Con inscripción abierta", texto: "Actividades", enlace: "Ver inscritos", tono: "verde", activo: filtro === "todas", alPresionar: () => elegir("todas") },
                        { icono: iconoReloj, numero: cuenta("casi"), titulo: "Casi llenas", texto: "Más del 85%", enlace: "Ver inscritos", tono: "dorado", activo: filtro === "casi", alPresionar: () => elegir("casi") },
                        { icono: iconoX, numero: cuenta("completo"), titulo: "Cupo completo", texto: "Con lista de espera", enlace: "Ver cupo completo", tono: "guinda", activo: filtro === "completo", alPresionar: () => elegir("completo") },
                        { icono: iconoCheck, numero: inscripciones.filter((i) => i.estado === "confirmada" || i.estado === "asistida").length, titulo: "Personas inscritas", texto: "Total (ejemplo)", enlace: "Inscribir", tono: "verde", alPresionar: () => navigate(`${BASE_INSCRIPCIONES}/inscribir`) },
                    ]}
                />
                <Tarjeta icono={iconoTarjeta} titulo="Actividades con inscripción">
                    <div className="cn-barra">
                        <Filtros
                            valor={filtro}
                            alCambiar={elegir}
                            opciones={[
                                { valor: "todas", texto: `Todas (${conInscripcion.length})` },
                                { valor: "casi", texto: `Casi llenas (${cuenta("casi")})` },
                                { valor: "completo", texto: `Cupo completo (${cuenta("completo")})` },
                                { valor: "pasada", texto: `Pasadas (${cuenta("pasada")})` },
                            ]}
                        />
                        <Buscador texto="Buscar actividad" valor={busqueda} alCambiar={setBusqueda} />
                    </div>
                    {conInscripcion.length === 0 ? (
                        <EstadoVacio icono={vacioArchivo} titulo="No hay actividades con inscripción" texto="Cuando publiques una actividad que pida inscripción, aparecerá aquí." />
                    ) : filtradas.length === 0 ? (
                        <EstadoVacio icono={vacioBuscar} titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : "No hay actividades en este filtro"} texto="Prueba con otra palabra o quita los filtros." accion={{ texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("todas"); } }} />
                    ) : (
                        <>
                            <Tabla
                                columnas={[
                                    { titulo: "FOLIO", ancho: 90, folio: true, celda: (a: Actividad) => a.folio },
                                    { titulo: "ACTIVIDAD", fuerte: true, celda: (a: Actividad) => a.nombre },
                                    { titulo: "FECHA", ancho: 110, celda: (a: Actividad) => fechaCorta(a.fecha) },
                                    { titulo: "CUPO", ancho: 160, celda: (a: Actividad) => <BarraCupo ocupados={ocupados(a)} cupo={Number(a.cupo)} tono={estado(a).tono} /> },
                                    { titulo: "ESPERA", ancho: 70, celda: (a: Actividad) => deActividad(a.folio, inscripciones).filter((i) => i.estado === "espera").length },
                                    { titulo: "ESTADO", ancho: 140, celda: (a: Actividad) => <Chip tono={estado(a).tono} ancho={130}>{estado(a).texto}</Chip> },
                                    { titulo: "ACCIÓN", ancho: 120, celda: (a: Actividad) => <Link to={`${BASE_INSCRIPCIONES}/${a.folio}`} className="cn-enlace">Ver inscritos →<span className="cn-solo-lectores"> {a.nombre}</span></Link> },
                                ]}
                                filas={filtradas}
                                clave={(a) => a.folio}
                            />
                            <p className="cn-nota">{filtradas.length} actividades (ejemplo)</p>
                        </>
                    )}
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

type Pestana = "inscritos" | "espera" | "canceladas";
const POR_PAGINA = 6;

// Inscritos de una actividad (569:26920), lista de espera (569:27395), ajustar cupo (569:28301, error 625:50410)
// y ofrecer lugar (569:28421)
export function InscritosActividad() {
    const { folio } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    useActividades();
    const inscripciones = useInscripciones();
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const [ventana, setVentana] = useState<null | "cupo" | Inscripcion>(null);
    const [cupo, setCupo] = useState("");
    const [error, setError] = useState("");
    const [fallo, setFallo] = useState(false);
    const a = obtenerActividad(folio);
    if (!a) return <Navigate to={BASE_INSCRIPCIONES} replace />;

    const pestana = (["inscritos", "espera", "canceladas"].includes(params.get("ver") ?? "") ? params.get("ver") : "inscritos") as Pestana;
    const propias = deActividad(a.folio, inscripciones);
    const grupo = (p: Pestana) => propias.filter((i) => (p === "inscritos" ? i.estado === "confirmada" || i.estado === "asistida" : p === "espera" ? i.estado === "espera" || i.estado === "ofrecido" : i.estado === "cancelada"));
    const texto = busqueda.trim().toLowerCase();
    const filas = grupo(pestana).filter((i) => !texto || i.persona.toLowerCase().includes(texto));
    const { paginas, actual, visibles } = paginar(filas, pagina, POR_PAGINA);
    const libres = lugaresLibres(a, inscripciones);
    const ocupados = Number(a.cupo) - libres;
    const maximo = capacidadDe(a.espacio);
    const ruta = `${BASE_INSCRIPCIONES}/${a.folio}`;
    const completo = libres <= 0;

    function guardarCupo() {
        const problema = validarCupo(a!, cupo);
        if (problema) return setError(problema);
        try {
            ajustarCupo(a!.folio, cupo);
            navigate(`${ruta}/cupo-ajustado`);
        } catch {
            setFallo(true);
        }
    }

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Inscripciones y cupos", BASE_INSCRIPCIONES], [ventana === "cupo" ? "Ajustar cupo" : ventana ? "Ofrecer lugar" : pestana === "espera" ? "Lista de espera" : "Inscritos"]]} />
                <EncabezadoTarjeta
                    volver={{ texto: "Volver a Inscripciones y cupos", ruta: BASE_INSCRIPCIONES }}
                    etiqueta={`Actividad ${a.folio}`}
                    titulo={a.nombre}
                    texto={pestana === "espera" ? `${fechaCorta(a.fecha)} · ${completo ? "Cupo completo" : `${libres} lugares libres`} · ${grupo("espera").length} personas esperan.` : `${fechaCorta(a.fecha)} · ${a.inicio} · ${a.espacio} · ${ocupados} de ${a.cupo} lugares.`}
                />
                <Tarjeta icono={pestana === "espera" ? iconoRelojTarjeta : iconoLista} titulo={pestana === "espera" ? "Lista de espera" : pestana === "canceladas" ? "Inscripciones canceladas" : "Personas inscritas"} subtitulo={pestana === "espera" ? "Por orden de llegada." : undefined}>
                    <div className="cn-barra">
                        <Filtros
                            etiqueta="Qué lista ver"
                            valor={pestana}
                            alCambiar={(p) => { setParams(p === "inscritos" ? {} : { ver: p }); setPagina(0); }}
                            opciones={[
                                { valor: "inscritos", texto: `Inscritos (${grupo("inscritos").length})` },
                                { valor: "espera", texto: `Lista de espera (${grupo("espera").length})` },
                                { valor: "canceladas", texto: `Canceladas (${grupo("canceladas").length})` },
                            ]}
                        />
                        <Buscador texto="Buscar por nombre" valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
                    </div>
                    {filas.length === 0 ? (
                        <EstadoVacio icono={texto ? vacioBuscar : vacioArchivo} titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : pestana === "espera" ? "Nadie en lista de espera" : pestana === "canceladas" ? "Sin inscripciones canceladas" : "Aún no hay personas inscritas"} texto={texto ? "Prueba con otro nombre." : "Cuando haya movimientos, aparecerán aquí."} />
                    ) : (
                        <Tabla
                            columnas={pestana === "espera" ? [
                                { titulo: "LUGAR", ancho: 70, folio: true, celda: (i: Inscripcion) => grupo("espera").indexOf(i) + 1 },
                                { titulo: "PERSONA", fuerte: true, celda: (i: Inscripcion) => i.persona },
                                { titulo: "SE ANOTÓ", ancho: 120, celda: (i: Inscripcion) => fechaCorta(i.fecha) },
                                { titulo: "ESTADO", ancho: 150, celda: (i: Inscripcion) => <Chip tono={TONO_INSCRIPCION[i.estado]} ancho={140}>{NOMBRE_ESTADO_INSCRIPCION[i.estado]}</Chip> },
                                { titulo: "ACCIÓN", ancho: 140, celda: (i: Inscripcion) => i.estado === "espera" ? <button type="button" className="cn-enlace" onClick={() => setVentana(i)}>Ofrecer lugar →<span className="cn-solo-lectores"> a {i.persona}</span></button> : <Link to={`${ruta}/${i.id}`} className="cn-enlace">Ver →</Link> },
                            ] : [
                                { titulo: "N.º", ancho: 50, folio: true, celda: (i: Inscripcion) => String(grupo(pestana).indexOf(i) + 1).padStart(2, "0") },
                                { titulo: "PERSONA", fuerte: true, celda: (i: Inscripcion) => i.persona },
                                { titulo: "CONTACTO", ancho: 180, celda: (i: Inscripcion) => i.contacto.toLowerCase() },
                                { titulo: "SE INSCRIBIÓ", ancho: 120, celda: (i: Inscripcion) => fechaCorta(i.fecha) },
                                { titulo: "ESTADO", ancho: 130, celda: (i: Inscripcion) => <Chip tono={TONO_INSCRIPCION[i.estado]} ancho={120}>{NOMBRE_ESTADO_INSCRIPCION[i.estado]}</Chip> },
                                { titulo: "ACCIÓN", ancho: 70, celda: (i: Inscripcion) => <Link to={`${ruta}/${i.id}`} className="cn-enlace">Ver →<span className="cn-solo-lectores"> {i.persona}</span></Link> },
                            ]}
                            filas={visibles}
                            clave={(i) => i.id}
                        />
                    )}
                    {filas.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filas.length} (ejemplo)</p>
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                </Tarjeta>
                <div className="cn-acciones">
                    {pestana !== "espera" && <Link to={`${BASE_INSCRIPCIONES}/inscribir?actividad=${a.folio}`} className={clasesBoton("verde")}>Inscribir a una persona</Link>}
                    <button type="button" className={clasesBoton("contorno")} onClick={() => { setCupo(a.cupo); setError(""); setFallo(false); setVentana("cupo"); }}>Ajustar cupo</button>
                    {pestana !== "espera" && <Link to={`${ruta}?ver=espera`} className={clasesBoton("suave")}>Ver lista de espera</Link>}
                </div>
                <PieDatos />
            </Pagina>

            {ventana === "cupo" && (
                <Ventana
                    titulo="Ajustar cupo"
                    texto="Cambia el número de lugares. Si lo subes, se ofrece a la lista de espera."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} onClick={guardarCupo}>{fallo ? "Reintentar" : "Guardar cupo"}</button></>}
                >
                    <Datos variante="caja" filas={[["Actividad", a.nombre], ["Cupo actual", a.cupo], ["Inscritos", String(ocupados)]]} />
                    <CampoTexto id="ic-cupo" etiqueta="Nuevo cupo" obligatorio ayuda={maximo ? `Máximo ${maximo} por la capacidad de la sala (ejemplo).` : undefined} error={error}>
                        <input id="ic-cupo" inputMode="numeric" className={`cn-control ${error ? "cn-control--error" : ""}`} value={cupo} onChange={(e) => { setCupo(e.target.value.replace(/\D/g, "")); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "ic-cupo-error" : "ic-cupo-ayuda"} />
                    </CampoTexto>
                    {fallo && (
                        <div className="cn-aviso cn-aviso--chico" role="alert">
                            <span className="cn-aviso__x" aria-hidden="true">✕</span>
                            <div className="cn-aviso__textos"><strong>No se pudo guardar el cupo</strong><p>El cupo sigue en {a.cupo}. Intenta de nuevo en unos minutos.</p></div>
                        </div>
                    )}
                </Ventana>
            )}
            {ventana && ventana !== "cupo" && (
                <Ventana
                    titulo="¿Ofrecer un lugar?"
                    texto={completo ? "No hay lugares libres. Primero ajusta el cupo o espera una cancelación." : "Se avisará a la persona. Tendrá 24 horas para confirmar."}
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} disabled={completo} onClick={() => { ofrecerLugar(ventana.id); navigate(`${ruta}/${ventana.id}/ofrecido`); }}>Ofrecer lugar</button></>}
                >
                    <Datos variante="caja" filas={[["Persona", ventana.persona], ["Actividad", a.nombre], ["Lugar en la lista", String(grupo("espera").indexOf(ventana) + 1)]]} />
                </Ventana>
            )}
        </PanelLayout>
    );
}

export default Inscripciones;
