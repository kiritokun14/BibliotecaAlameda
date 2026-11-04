import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, Migas, Pagina, PieDatos, Resultado, Tabla, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { fechaCorta } from "../actividades/datos";
import {
    avisarRenovacion, comparar, DATOS_A_CORREGIR, NOMBRE_ESTADO_COTEJO, obtenerCotejo, pedirCorreccion, rechazarVinculo, resultadoDe, sistemaDisponible, textoResultado, useCotejos, vincular,
    type Cotejo, type Fila,
} from "./cotejos";
import { SinSistema } from "./Cotejo";
import { BASE_COTEJO, TONO_COTEJO } from "./utiles";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoAlerta from "../../../assets/admin/actividades/resultado-alerta.svg";
import iconoReloj from "../../../assets/admin/actividades/resultado-reloj.svg";
import iconoX from "../../../assets/admin/contenidos/resultado-x.svg";
import iconoIntercambio from "../../../assets/admin/participantes/tarjeta-intercambio.svg";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";

function useCotejo() {
    const { folio } = useParams();
    useCotejos();
    return obtenerCotejo(folio);
}

function banda(c: Cotejo) {
    const r = resultadoDe(c);
    const t = textoResultado(c);
    const chip = <Chip tono={t.tono}>{t.texto}</Chip>;
    switch (r.tipo) {
        case "coincide": return { tono: "verde" as const, icono: iconoCheck, titulo: "Todos los datos coinciden", linea: "Puedes vincular la cuenta con la credencial.", chip, miga: "Detalle (coincide)" };
        case "diferencias": return { tono: "guinda" as const, icono: iconoAlerta, titulo: r.diferencias === 1 ? "Hay 1 diferencia" : `Hay ${r.diferencias} diferencias`, linea: "Pide a la persona que corrija su captura.", chip, miga: "Detalle (con diferencias)" };
        case "vencida": return { tono: "dorado" as const, icono: iconoReloj, titulo: "La credencial está vencida", linea: "Los datos coinciden, pero debe renovarla antes de vincular.", chip, miga: "Detalle (credencial vencida)" };
        case "sin-coincidencia": return { tono: "guinda" as const, icono: iconoX, titulo: "No encontramos esa credencial", linea: `El número «${c.portal.credencial}» no existe en el sistema de la biblioteca.`, chip, miga: "Detalle (sin coincidencia)" };
        default: return { tono: "dorado" as const, icono: iconoAlerta, titulo: "La credencial ya está vinculada", linea: `Pertenece a ${c.sistema?.vinculadaA}. Revisa antes de decidir.`, chip, miga: "Detalle (credencial ya vinculada)" };
    }
}

// Cotejo · detalle (Figma 573:29674 coincide, 573:30135 diferencias, 573:30596 vencida, 638:51218 sin coincidencia,
// 638:51423 ya vinculada), confirmar vínculo (573:31057) y rechazar vínculo (573:32396)
export function DetalleCotejo() {
    const c = useCotejo();
    const navigate = useNavigate();
    const [ventana, setVentana] = useState<null | "vincular" | "rechazar">(null);
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    if (!sistemaDisponible()) return <SinSistema />;
    if (!c) return <Navigate to={BASE_COTEJO} replace />;
    const ruta = `${BASE_COTEJO}/${c.folio}`;
    const b = banda(c);
    const tipo = resultadoDe(c).tipo;
    const pendiente = c.estado === "pendiente";

    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Cotejo de credenciales", BASE_COTEJO], [ventana === "vincular" ? "Confirmar vínculo" : ventana === "rechazar" ? "Rechazar vínculo" : b.miga]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Cotejo de credenciales", ruta: BASE_COTEJO }} etiqueta={`Cotejo ${c.folio}`} titulo={c.persona} texto="Captura del portal contra el registro de la biblioteca." />
                {pendiente ? (
                    <Resultado tono={b.tono} icono={b.icono} titulo={b.titulo} linea={b.linea} chip={b.chip} />
                ) : (
                    <Resultado tono={c.estado === "vinculada" ? "verde" : c.estado === "rechazada" ? "guinda" : "dorado"} icono={c.estado === "vinculada" ? iconoCheck : c.estado === "rechazada" ? iconoX : iconoReloj} titulo={NOMBRE_ESTADO_COTEJO[c.estado]} linea={`${c.resolucion?.detalle} · ${c.resolucion?.quien} · ${fechaCorta(c.resolucion?.fecha ?? "")}`} chip={<Chip tono={TONO_COTEJO[c.estado]}>{NOMBRE_ESTADO_COTEJO[c.estado]}</Chip>} />
                )}
                <Tarjeta icono={iconoIntercambio} titulo="Comparación de datos">
                    {c.sistema ? (
                        <Tabla
                            columnas={[
                                { titulo: "DATO", ancho: 200, folio: true, celda: (f: Fila) => f.dato },
                                { titulo: "EN EL PORTAL", fuerte: true, celda: (f: Fila) => f.portal },
                                { titulo: "EN EL SISTEMA DE LA BIBLIOTECA", celda: (f: Fila) => f.sistema },
                                { titulo: "RESULTADO", ancho: 150, celda: (f: Fila) => <Chip tono={f.coincide ? "verde" : "guinda"} ancho={140}>{f.coincide ? "Coincide" : "No coincide"}</Chip> },
                            ]}
                            filas={comparar(c)}
                            clave={(f) => f.dato}
                        />
                    ) : (
                        <Datos filas={[["Nombre capturado", c.portal.nombre], ["Credencial capturada", c.portal.credencial], ["Fecha de nacimiento", c.portal.nacimiento], ["En el sistema", "Sin registro con ese número"]]} />
                    )}
                </Tarjeta>
                <div className="cn-acciones">
                    {pendiente && tipo === "coincide" && <button type="button" className={clasesBoton("verde")} onClick={() => setVentana("vincular")}>Vincular cuenta</button>}
                    {pendiente && (tipo === "diferencias" || tipo === "sin-coincidencia") && <Link to={`${ruta}/correccion`} className={clasesBoton("verde")}>Pedir corrección</Link>}
                    {pendiente && tipo === "vencida" && <button type="button" className={clasesBoton("verde")} onClick={() => { avisarRenovacion(c.folio); navigate(`${ruta}/aviso`); }}>Enviar aviso de renovación</button>}
                    {pendiente && <button type="button" className={clasesBoton("contorno-guinda")} onClick={() => { setMotivo(""); setError(""); setVentana("rechazar"); }}>Rechazar vínculo</button>}
                    <Link to={BASE_COTEJO} className={clasesBoton("suave")}>Volver</Link>
                </div>
                <PieDatos />
            </Pagina>

            {ventana === "vincular" && (
                <Ventana
                    titulo="¿Vincular la cuenta?"
                    texto="La persona podrá usar su credencial en el portal: inscripciones, progreso y recompensas."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} onClick={() => { vincular(c.folio); navigate(`${ruta}/vinculada`); }}>Vincular cuenta</button></>}
                >
                    <Datos variante="caja" filas={[["Persona", c.persona], ["Credencial", c.portal.credencial], ["Vigencia", c.sistema?.vigencia ?? "—"]]} />
                </Ventana>
            )}
            {ventana === "rechazar" && (
                <Ventana
                    titulo="¿Rechazar el vínculo?"
                    texto="La cuenta seguirá sin credencial. Se enviará el motivo a la persona."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("guinda")} onClick={() => { if (!motivo.trim()) return setError("Escribe el motivo."); rechazarVinculo(c.folio, motivo); navigate(`${ruta}/rechazada`); }}>Rechazar vínculo</button></>}
                >
                    <Datos variante="caja" filas={[["Folio", c.folio], ["Persona", c.persona]]} />
                    <CampoTexto id="ct-motivo" etiqueta="Motivo" obligatorio error={error}>
                        <textarea id="ct-motivo" className={`cn-control cn-control--area ${error ? "cn-control--error" : ""}`} placeholder="Ej.: la credencial pertenece a otra persona." value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "ct-motivo-error" : undefined} />
                    </CampoTexto>
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Cotejo · pedir corrección (Figma 573:31571)
export function PedirCorreccion() {
    const c = useCotejo();
    const navigate = useNavigate();
    const [datos, setDatos] = useState(DATOS_A_CORREGIR[3]);
    const [mensaje, setMensaje] = useState("Revisa que tu nombre y fecha de nacimiento coincidan con tu credencial de la biblioteca.");
    const [error, setError] = useState("");
    if (!c || c.estado !== "pendiente") return <Navigate to={c ? `${BASE_COTEJO}/${c.folio}` : BASE_COTEJO} replace />;
    const ruta = `${BASE_COTEJO}/${c.folio}`;
    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Cotejo de credenciales", BASE_COTEJO], ["Pedir corrección"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Cotejo de credenciales", ruta }} etiqueta={`Cotejo ${c.folio}`} titulo="Pedir corrección" texto="Indica qué debe corregir la persona." />
                <Tarjeta icono={iconoLapiz} titulo="Mensaje para la persona">
                    <div className="cn-campos">
                        <CampoTexto id="ct-datos" etiqueta="Datos a corregir" obligatorio>
                            <select id="ct-datos" className="cn-control" value={datos} onChange={(e) => setDatos(e.target.value)}>{DATOS_A_CORREGIR.map((d) => <option key={d}>{d}</option>)}</select>
                        </CampoTexto>
                        <CampoTexto id="ct-mensaje" etiqueta="Mensaje" obligatorio error={error}>
                            <textarea id="ct-mensaje" className={`cn-control cn-control--area ${error ? "cn-control--error" : ""}`} value={mensaje} onChange={(e) => { setMensaje(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "ct-mensaje-error" : undefined} />
                        </CampoTexto>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={() => { if (!mensaje.trim()) return setError("Escribe el mensaje."); pedirCorreccion(c.folio, datos, mensaje); navigate(`${ruta}/correccion-solicitada`); }}>Enviar solicitud</button>
                    <Link to={ruta} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Resultados: cuenta vinculada (573:31164), corrección solicitada (573:31991), aviso de renovación (573:32505),
// vínculo rechazado (631:50735)
export function ResultadoCotejo({ tipo }: { tipo: "vinculada" | "correccion" | "aviso" | "rechazada" }) {
    const c = useCotejo();
    if (!c || c.estado !== tipo) return <Navigate to={c ? `${BASE_COTEJO}/${c.folio}` : BASE_COTEJO} replace />;
    const datos = {
        vinculada: { titulo: "Cuenta vinculada", texto: "La persona ya puede usar su credencial en el portal.", tono: "verde" as const, icono: iconoCheck },
        correccion: { titulo: "Corrección solicitada", texto: "La persona recibió el mensaje. El cotejo vuelve a la bandeja cuando corrija.", tono: "dorado" as const, icono: iconoReloj },
        aviso: { titulo: "Aviso de renovación enviado", texto: "Cuando renueve su credencial, podrás vincular la cuenta.", tono: "dorado" as const, icono: iconoReloj },
        rechazada: { titulo: "Vínculo rechazado", texto: "La cuenta sigue sin credencial y la persona recibió el motivo.", tono: "guinda" as const, icono: iconoX },
    }[tipo];
    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Cotejo de credenciales", BASE_COTEJO], [datos.titulo]]} />
                <Encabezado grande etiqueta={`Cotejo ${c.folio}`} titulo={datos.titulo} texto={datos.texto} />
                <Resultado tono={datos.tono} icono={datos.icono} titulo={c.persona} linea={`${c.resolucion?.detalle} · ${c.resolucion?.quien}`} chip={<Chip tono={TONO_COTEJO[c.estado]}>{NOMBRE_ESTADO_COTEJO[c.estado]}</Chip>} />
                <div className="cn-acciones">
                    <Link to={BASE_COTEJO} className={clasesBoton("verde")}>Volver a Cotejo de credenciales</Link>
                    <Link to={`${BASE_COTEJO}?vista=historial`} className={clasesBoton("suave")}>Ver historial de cotejos</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}
