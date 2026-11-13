import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Datos, EncabezadoTarjeta, EstadoVacio, Migas, Pagina, PieDatos, Tabla, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { fechaCorta } from "./datos";
import { actualizarSala, hoyISO, horarioBloqueo, obtenerSala, quitarBloqueo, useSalas, type Bloqueo, type Sala } from "./salas";
import { BASE_CALENDARIO } from "./utiles";
import iconoCasa from "../../../assets/admin/actividades/tarjeta-casa.svg";
import iconoX from "../../../assets/admin/actividades/tarjeta-x.svg";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import vacioCheck from "../../../assets/admin/contenidos/vacio-check.svg";

const horarioUso = (s: Sala) => `${s.dias} · ${s.abre.replace(/^0/, "")} a ${s.cierra.replace(/^0/, "")}`;

// Actividades · Calendario: ficha de sala (Figma 566:23573) y quitar bloqueo (566:25350)
export function FichaSala() {
    const { sala: id } = useParams();
    const { bloqueos } = useSalas();
    const sala = obtenerSala(id);
    const [quitando, setQuitando] = useState<Bloqueo | null>(null);
    if (!sala) return <Navigate to={`${BASE_CALENDARIO}?vista=salas`} replace />;

    const proximos = bloqueos.filter((b) => b.sala === sala.nombre && b.fecha >= hoyISO()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Calendario y salas", `${BASE_CALENDARIO}?vista=salas`], [quitando ? "Quitar bloqueo" : "Ficha de sala"]]} />
                <EncabezadoTarjeta
                    volver={{ texto: "Volver a Calendario y salas", ruta: `${BASE_CALENDARIO}?vista=salas` }}
                    etiqueta="Sala"
                    titulo={sala.nombre}
                    texto={`Capacidad ${sala.capacidad} personas · ${sala.ubicacion} (ejemplo).${sala.habilitada ? "" : " Sala deshabilitada."}`}
                />
                <Tarjeta icono={iconoCasa} titulo="Datos de la sala">
                    <Datos filas={[["Capacidad", `${sala.capacidad} personas`], ["Equipo", sala.equipo], ["Horario de uso", horarioUso(sala)], ["Accesibilidad", sala.accesibilidad]]} />
                </Tarjeta>
                <Tarjeta icono={iconoX} titulo="Bloqueos próximos">
                    {proximos.length === 0 ? (
                        <EstadoVacio icono={vacioCheck} titulo="Sin bloqueos próximos" texto="La sala está disponible para programar actividades." />
                    ) : (
                        <Tabla
                            columnas={[
                                { titulo: "FECHA", ancho: 130, folio: true, celda: (b: Bloqueo) => fechaCorta(b.fecha) },
                                { titulo: "HORARIO", ancho: 160, celda: (b: Bloqueo) => <strong>{horarioBloqueo(b)}</strong> },
                                { titulo: "MOTIVO", celda: (b: Bloqueo) => b.motivo },
                                {
                                    titulo: "ACCIÓN",
                                    ancho: 160,
                                    celda: (b: Bloqueo) => (
                                        <span className="cn-acciones">
                                            <Link to={`${BASE_CALENDARIO}/bloqueos/${b.id}/editar`} className="cn-enlace">Editar<span className="cn-solo-lectores"> bloqueo del {fechaCorta(b.fecha)}</span></Link>
                                            <button type="button" className="cn-enlace" onClick={() => setQuitando(b)}>Quitar →<span className="cn-solo-lectores"> bloqueo del {fechaCorta(b.fecha)}</span></button>
                                        </span>
                                    ),
                                },
                            ]}
                            filas={proximos}
                            clave={(b) => b.id}
                        />
                    )}
                </Tarjeta>
                <div className="cn-acciones">
                    <Link to={`${BASE_CALENDARIO}/bloquear?sala=${encodeURIComponent(sala.nombre)}`} className={clasesBoton("verde")}>Bloquear esta sala</Link>
                    <Link to={`${BASE_CALENDARIO}?vista=semana`} className={clasesBoton("contorno")}>Ver agenda de la sala</Link>
                    <Link to={`${BASE_CALENDARIO}/salas/${sala.id}/editar`} className={clasesBoton("verde")}>Editar sala</Link>
                </div>
                <PieDatos />
            </Pagina>

            {quitando && (
                <Ventana
                    titulo="¿Quitar el bloqueo?"
                    texto="El horario volverá a estar disponible para programar actividades."
                    alCerrar={() => setQuitando(null)}
                    pie={
                        <>
                            <button type="button" className={clasesBoton("contorno")} onClick={() => setQuitando(null)}>Cancelar</button>
                            <button type="button" className={clasesBoton("guinda")} onClick={() => { quitarBloqueo(quitando.id); setQuitando(null); }}>Quitar bloqueo</button>
                        </>
                    }
                >
                    <Datos variante="caja" filas={[["Sala", quitando.sala], ["Fecha", fechaCorta(quitando.fecha)], ["Horario", horarioBloqueo(quitando)]]} />
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Actividades · Calendario: editar sala (Figma 619:50730)
export function EditarSala() {
    const { sala: id } = useParams();
    useSalas();
    const sala = obtenerSala(id);
    if (!sala) return <Navigate to={`${BASE_CALENDARIO}?vista=salas`} replace />;
    return <FormularioSala key={sala.id} sala={sala} />;
}

function FormularioSala({ sala }: { sala: Sala }) {
    const navigate = useNavigate();
    const [capacidad, setCapacidad] = useState(String(sala.capacidad));
    const [habilitada, setHabilitada] = useState(sala.habilitada);
    const [abre, setAbre] = useState(sala.abre);
    const [cierra, setCierra] = useState(sala.cierra);
    const [equipo, setEquipo] = useState(`${sala.equipo} · ${sala.accesibilidad}`);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const ficha = `${BASE_CALENDARIO}/salas/${sala.id}`;

    function guardar() {
        const e: Record<string, string> = {};
        const n = Number(capacidad);
        if (!Number.isInteger(n) || n < 1) e.capacidad = "Escribe una capacidad mayor que 0.";
        if (!abre) e.abre = "Elige la hora de apertura.";
        if (!cierra) e.cierra = "Elige la hora de cierre.";
        else if (abre && cierra <= abre) e.cierra = "Debe cerrar después de abrir.";
        if (!equipo.trim()) e.equipo = "Describe el equipo y la accesibilidad.";
        setErrores(e);
        if (Object.keys(e).length) return;
        const [eq, ...acc] = equipo.split(" · ");
        // TODO backend: PATCH /espacios/:id
        actualizarSala(sala.id, { capacidad: n, habilitada, abre, cierra, equipo: eq.trim(), accesibilidad: acc.join(" · ").trim() || sala.accesibilidad });
        navigate(ficha);
    }

    const clase = (c: string) => `cn-control ${errores[c] ? "cn-control--error" : ""}`;
    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Calendario y salas", `${BASE_CALENDARIO}?vista=salas`], ["Editar sala"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a la ficha de sala", ruta: ficha }} etiqueta="Calendario y salas · Editar sala" titulo={`Editar sala: ${sala.nombre}`} texto="Actualiza capacidad, horario de uso y equipo. Los cambios se reflejan en el calendario." />
                <Tarjeta icono={iconoLapiz} titulo="Datos de la sala">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <CampoTexto id="sala-capacidad" etiqueta="Capacidad (personas)" obligatorio error={errores.capacidad}>
                                <input id="sala-capacidad" inputMode="numeric" className={clase("capacidad")} value={capacidad} onChange={(e) => setCapacidad(e.target.value.replace(/\D/g, ""))} aria-invalid={!!errores.capacidad} />
                            </CampoTexto>
                            <CampoTexto id="sala-estado" etiqueta="Estado de la sala" obligatorio>
                                <select id="sala-estado" className="cn-control" value={habilitada ? "Habilitada" : "Deshabilitada"} onChange={(e) => setHabilitada(e.target.value === "Habilitada")}>
                                    <option>Habilitada</option>
                                    <option>Deshabilitada</option>
                                </select>
                            </CampoTexto>
                        </div>
                        <div className="cn-campos__fila">
                            <CampoTexto id="sala-abre" etiqueta="Abre a las" obligatorio error={errores.abre}>
                                <input id="sala-abre" type="time" className={clase("abre")} value={abre} onChange={(e) => setAbre(e.target.value)} aria-invalid={!!errores.abre} />
                            </CampoTexto>
                            <CampoTexto id="sala-cierra" etiqueta="Cierra a las" obligatorio error={errores.cierra}>
                                <input id="sala-cierra" type="time" className={clase("cierra")} value={cierra} onChange={(e) => setCierra(e.target.value)} aria-invalid={!!errores.cierra} />
                            </CampoTexto>
                        </div>
                        <CampoTexto id="sala-equipo" etiqueta="Equipo y accesibilidad" obligatorio error={errores.equipo}>
                            <textarea id="sala-equipo" className={`${clase("equipo")} cn-control--area`} value={equipo} onChange={(e) => setEquipo(e.target.value)} aria-invalid={!!errores.equipo} />
                        </CampoTexto>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={guardar}>Guardar cambios</button>
                    <Link to={ficha} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}
