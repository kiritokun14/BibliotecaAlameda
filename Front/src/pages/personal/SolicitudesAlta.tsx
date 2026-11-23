// Altas asistidas › Solicitudes abiertas: lista | detalle con la decisión (resolver un duplicado, reenviar o cancelar).
import { useId, useState, type ReactNode } from "react";
import { Aviso, Buscador, Chip, Dato, Datos, FiltrosAvanzados, Icono, Paginas, Tarjeta, Vacio } from "../admin/piezasPanel";
import { Paso } from "../admin/atencion/comun/Paso";
import { fechaCorta, fechaHora } from "../admin/atencion/comun/fechas";
import { mensajeError } from "../../servicios/api";
import { cancelarSolicitud, reintentarInvitacion, resolverDuplicado, type ResultadoAlta, type SolicitudAbierta } from "../../servicios/altaAsistida";
import { POR_PAGINA, nombreDe, type FiltroSolicitud, type Servicio } from "./datosAlta";

export default function SolicitudesAlta({ solicitudes, servicio, filtro, alFiltrar, alCambiar, alRegistrar }: {
    solicitudes: SolicitudAbierta[]; servicio: Servicio; filtro: FiltroSolicitud; alFiltrar: (f: FiltroSolicitud) => void;
    alCambiar: () => Promise<void>; alRegistrar: () => void;
}) {
    const id = useId();
    const [texto, setTexto] = useState("");
    const [pagina, setPagina] = useState(1);
    const [elegidaId, setElegidaId] = useState<string | null>(null);
    const buscado = texto.trim().toLowerCase();
    const filtradas = solicitudes
        .filter((s) => filtro === "todas" || s.estado === filtro)
        .filter((s) => !buscado || [nombreDe(s), s.correo, s.telefono].some((v) => v.toLowerCase().includes(buscado)))
        .sort((a, b) => (a.estado === b.estado ? b.solicitadoEn.localeCompare(a.solicitadoEn) : a.estado === "en_revision" ? -1 : 1));
    const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
    const actual = Math.min(pagina, paginas);
    const visibles = filtradas.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);
    const elegida = solicitudes.find((s) => s.id === elegidaId) ?? null;
    const enRevision = solicitudes.filter((s) => s.estado === "en_revision").length;

    return (
        <div className="pz-columnas pz-columnas--libre">
            <Tarjeta icono="cuentas" id={`${id}-lista`} titulo="Solicitudes abiertas" texto="Primero las que esperan una decisión; después las que esperan a la persona"
                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => void alCambiar()}>Actualizar</button>}>
                <Buscador etiqueta="Buscar una solicitud" placeholder="Nombre, correo o teléfono" valor={texto} alCambiar={(v) => { setTexto(v); setPagina(1); }}>
                    <FiltrosAvanzados activos={filtro === "todas" ? 0 : 1} alQuitar={() => { alFiltrar("todas"); setPagina(1); }} grupos={[{
                        titulo: "Estado", valor: filtro, alCambiar: (v) => { alFiltrar(v as FiltroSolicitud); setPagina(1); },
                        opciones: [
                            { valor: "todas", texto: "Todas", cantidad: solicitudes.length },
                            { valor: "en_revision", texto: "Posible duplicado", cantidad: enRevision },
                            { valor: "lista", texto: "Esperan a la persona", cantidad: solicitudes.length - enRevision },
                        ],
                    }]} />
                </Buscador>

                {servicio.estado === "cargando" ? <p className="pz-ayuda" role="status">Cargando solicitudes…</p>
                    : servicio.estado === "apagado" ? <Vacio icono="alerta" titulo="Servicio sin habilitar" texto="Cuando el servidor active el alta asistida, aquí verás las solicitudes abiertas." />
                    : servicio.estado === "error" ? <Vacio icono="alerta" titulo="No se pudieron cargar" texto={servicio.mensaje ?? "Inténtalo de nuevo."} accion={<button type="button" className="pz-boton pz-boton--chico" onClick={() => void alCambiar()}>Reintentar</button>} />
                    : visibles.length === 0 ? (
                        <Vacio icono="check" titulo={solicitudes.length ? "Sin resultados" : "No hay solicitudes abiertas"}
                            texto={solicitudes.length ? "Prueba con otro filtro u otra búsqueda." : "Cuando registres un alta, aparecerá aquí hasta que la persona active su cuenta."}
                            accion={!solicitudes.length && <button type="button" className="pz-boton pz-boton--chico" onClick={alRegistrar}>Registrar a una persona</button>} />
                    ) : (
                        <ul className="pz-filas">
                            {visibles.map((s) => {
                                const abierta = s.id === elegidaId;
                                const revision = s.estado === "en_revision";
                                return (
                                    <li key={s.id}>
                                        <article className={`pz-fila${revision ? " pz-fila--guinda" : ""}${abierta ? " pz-fila--elegida" : ""}`}>
                                            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={revision ? "alerta" : "usuario"} /></span>
                                            <div className="pz-fila__textos">
                                                <h4 className="pz-fila__titulo">{nombreDe(s)}</h4>
                                                <p className="pz-fila__detalle"><span>{s.correo}</span><span>Tel. {s.telefono}</span><span className="pz-fila__folio">{fechaHora(s.solicitadoEn)}</span></p>
                                            </div>
                                            <Chip tono={revision ? "guinda" : "dorado"}>{revision ? "Posible duplicado" : "Invitación pendiente"}</Chip>
                                            <button type="button" className={`pz-boton pz-boton--chico${abierta ? "" : " pz-boton--contorno"}`} aria-pressed={abierta} onClick={() => setElegidaId(abierta ? null : s.id)}>
                                                {abierta ? "Abierta" : revision ? "Decidir" : "Atender"}<span className="solo-lectores"> la solicitud de {nombreDe(s)}</span>
                                            </button>
                                        </article>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                <div className="pz-tarjeta__pie">
                    <p aria-live="polite">{visibles.length} de {filtradas.length} solicitudes</p>
                    <Paginas pagina={actual} paginas={paginas} alCambiar={setPagina} />
                </div>
            </Tarjeta>

            <aside className="pz-lateral" aria-label={elegida ? "Detalle de la solicitud" : "Cómo se decide"}>
                {elegida ? <Detalle key={elegida.id} solicitud={elegida} alCambiar={alCambiar} alCerrar={() => setElegidaId(null)} /> : (
                    <Tarjeta icono="info" id={`${id}-como`} titulo="Cómo se decide un duplicado" texto="Elige una solicitud para atenderla">
                        <ol className="pz-linea">
                            <Paso tono="dorado" icono="buscarCuenta" titulo="Compara las cuentas" texto="Revisa nombre, fecha de nacimiento, teléfono y correo con la identificación." />
                            <Paso tono="verde" icono="check" titulo="Es otra persona" texto="Se envía la invitación a su correo." />
                            <Paso tono="guinda" icono="alerta" titulo="Es la misma persona" texto="No se crea otra cuenta: oriéntala con Recuperación asistida." />
                        </ol>
                    </Tarjeta>
                )}
            </aside>
        </div>
    );
}

function Detalle({ solicitud, alCambiar, alCerrar }: { solicitud: SolicitudAbierta; alCambiar: () => Promise<void>; alCerrar: () => void }) {
    const id = useId();
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const revision = solicitud.estado === "en_revision";

    async function ejecutar(accion: () => Promise<ResultadoAlta>, pideMotivo = true) {
        if (pideMotivo && !motivo.trim()) { setError("Escribe el motivo de la decisión."); return; }
        setOcupado(true); setError(""); setAviso("");
        try {
            const resultado = await accion();
            if (resultado.estado === "lista" && !resultado.invitacionEnviada) setAviso("Se aprobó, pero el correo no salió. Reenvíala en unos minutos.");
            else if (resultado.estado === "lista" || resultado.estado === "invitada") setAviso("Invitación enviada.");
            await alCambiar();
        } catch (e) { setError(mensajeError(e)); }
        finally { setOcupado(false); }
    }

    const acciones: ReactNode = revision ? (
        <>
            <button type="button" className="pz-boton" disabled={ocupado} onClick={() => ejecutar(() => resolverDuplicado(solicitud.id, "persona_distinta", motivo.trim()))}>Es otra persona: invitar</button>
            <button type="button" className="pz-boton pz-boton--contorno" disabled={ocupado} onClick={() => ejecutar(() => resolverDuplicado(solicitud.id, "misma_persona", motivo.trim()))}>Es la misma persona: no crear</button>
        </>
    ) : (
        <button type="button" className="pz-boton" disabled={ocupado} onClick={() => ejecutar(() => reintentarInvitacion(solicitud.id), false)}>Reenviar invitación</button>
    );

    return (
        <Tarjeta icono={revision ? "alerta" : "usuario"} id={`${id}-detalle`} titulo={nombreDe(solicitud)} texto={`Solicitada el ${fechaHora(solicitud.solicitadoEn)}`}
            accion={<Chip tono={revision ? "guinda" : "dorado"}>{revision ? "En revisión" : "Invitación pendiente"}</Chip>}>
            <Datos>
                <Dato icono="mensajes" etiqueta="Correo" ancho>{solicitud.correo}</Dato>
                <Dato icono="reloj" etiqueta="Nacimiento">{fechaCorta(solicitud.fechaNacimiento)}</Dato>
                <Dato icono="usuario" etiqueta="Teléfono">{solicitud.telefono}</Dato>
            </Datos>

            {solicitud.candidatos.length > 0 && (
                <>
                    <p className="pz-subtitulo">Cuentas parecidas</p>
                    <ul className="pz-filas alta-parecidas">
                        {solicitud.candidatos.map((c) => (
                            <li key={c.id} className="alta-parecida">
                                <p className="alta-parecida__nombre">{nombreDe(c)}</p>
                                <p className="pz-fila__detalle"><span>{c.correo}</span><span>Tel. {c.telefono}</span><span>Nac. {fechaCorta(c.fechaNacimiento)}</span></p>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {aviso && <Aviso titulo={aviso} />}
            {error && <Aviso tono="error" titulo="No se pudo completar." texto={error} />}

            <div className="pz-decision">
                <label className="pz-campo pz-campo--lleno">
                    <span>Motivo de la decisión{revision ? " *" : " (para cancelar)"}</span>
                    <input type="text" value={motivo} maxLength={500} onChange={(e) => { setMotivo(e.target.value); setError(""); }} placeholder="Ej. Se verificó con identificación" />
                </label>
                <div className="pz-acciones">{acciones}</div>
            </div>
            <div className="pz-acciones pz-acciones--pie">
                <button type="button" className="pz-boton pz-boton--guinda pz-boton--contorno pz-boton--chico" disabled={ocupado} onClick={() => ejecutar(() => cancelarSolicitud(solicitud.id, motivo.trim()))}>Cancelar solicitud</button>
                <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={alCerrar}>Cerrar</button>
            </div>
        </Tarjeta>
    );
}
