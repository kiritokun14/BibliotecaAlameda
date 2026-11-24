import { useState, type CSSProperties } from "react";
import { Link } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EsqueletoDestacada, EsqueletoTarjetas } from "../../../components/portal/Esqueleto";
import { useAgendaPublica } from "../../../servicios/usarAgendaPublica";
import { fechaHoyTepic } from "../../../servicios/propuestasUsuario";
import { EncabezadoNoticias } from "../noticias/piezas";
import { EtiquetaPerfil } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";
import { useSesion } from "../perfil/usarSesion";
import { proximas, type FiltroCategoria } from "./datosAgenda";
import { BarraEventos, DestacadaEvento, TarjetaEvento, TarjetaParticipa } from "./piezas";
import "../noticias/Noticias.css";
import "../perfil/Perfil.css";
import "./Agenda.css";

// Eventos · agenda (/eventos), con la plantilla C «Página de consulta» de Noticias (Aldahir, 20 nov 2026).
// Franja compacta con ícono → barra blanca: tipos de actividad (pastillas con su punto de color) | «Ver como: Lista ·
// Calendario» → la próxima actividad destacada | tarjeta verde «Participa» (proponer con sesión; cuenta sin ella) →
// «Más actividades» con «Ver todas» a la derecha, en tres tarjetas. Sin contadores visibles.
export default function Agenda() {
    const sesion = useSesion();
    const [filtro, setFiltro] = useState<FiltroCategoria>("todas");
    const hoy = fechaHoyTepic();
    const { actividades, cargando, error, reintentar } = useAgendaPublica(hoy);
    const lista = proximas(actividades.filter((a) => !a.cancelada), hoy, filtro);
    const [destacada, ...resto] = lista;

    return (
        <PaginaPublica>
            <EncabezadoNoticias etiqueta="Eventos" icono={iconosSeccion.eventos} compacto
                titulo={<>Participa en lo que <span>viene</span></>}
                texto="Talleres, clubes y visitas guiadas de la biblioteca. Elige una actividad y consulta sus detalles." />

            <section className="noticias-seccion noticias-pagina eventos-pagina">
                <div className="noticias-contenedor">
                    <BarraEventos filtro={filtro} alElegir={setFiltro} vista="lista" />

                    <div className="evento-principal">
                        {cargando ? <EsqueletoDestacada texto="Consultando la agenda…" />
                            : error ? <Vacio titulo="No pudimos cargar la agenda" texto={error} accion="Reintentar" alAccionar={reintentar} error />
                            : destacada ? <DestacadaEvento actividad={destacada} />
                            : <Vacio titulo="No hay actividades de este tipo por ahora" texto="Prueba con otro tipo o vuelve pronto: la agenda se actualiza cada mes." accion="Ver todos los tipos" alAccionar={() => setFiltro("todas")} />}
                        <TarjetaParticipa sesion={!!sesion} />
                    </div>

                    {cargando ? <EsqueletoTarjetas cantidad={3} texto="" /> : resto.length > 0 && (
                        <div className="noticias-mas">
                            <div className="evento-mas__encabezado">
                                <EtiquetaPerfil icono={iconosSeccion.eventos}>Más actividades</EtiquetaPerfil>
                                <Link to="/eventos/todas" className="perfil-boton perfil-boton--chico perfil-boton--contorno">Ver todas las actividades</Link>
                            </div>
                            <ul className="noticias-fila">
                                {resto.slice(0, 3).map((a) => <li key={a.sesionId ?? a.id}><TarjetaEvento actividad={a} hoy={hoy} vista="chica" /></li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

// Vacío importante del catálogo (insignia, título, texto y su botón); guinda si es error
export function Vacio({ titulo, texto, accion, alAccionar, error = false }: { titulo: string; texto: string; accion: string; alAccionar: () => void; error?: boolean }) {
    return (
        <div className={`perfil-vacio perfil-vacio--eventos${error ? " perfil-vacio--error" : ""}`} role={error ? "alert" : "status"}
            style={{ "--icono-seccion": `url("${iconosSeccion.eventos}")` } as CSSProperties}>
            <span className="perfil-vacio__insignia" aria-hidden="true" />
            <h2>{titulo}</h2>
            <p>{texto}</p>
            <div className="perfil-acciones perfil-acciones--centro">
                <button type="button" className="perfil-boton" onClick={alAccionar}>{accion}</button>
            </div>
        </div>
    );
}
