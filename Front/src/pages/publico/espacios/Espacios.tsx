import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { TarjetaPerfil } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";
import { sesionSimulada, useSesion } from "../perfil/usarSesion";
import { PasosTramite } from "../credencial/piezas";
import { listarAreas, listarMisSolicitudes } from "../../../servicios/espacios";
import MapaBiblioteca from "./MapaBiblioteca";
import { DetalleEspacio } from "./piezas";
import { iconoDe } from "./fotos";
import { estaEnProceso, solicitudSimulada } from "./datosSesion";
import {
    colorDisponibilidad, espaciosEvento, nombresDisponibilidad, pasosEspacio, rutasEspacio, zonaPorId, zonaPorSlug, zonas,
    type Disponibilidad, type Planta,
} from "./datos";
import "../contacto/Contacto.css";
import "../perfil/Perfil.css";
import "../credencial/CredencialSesion.css";
import tarjetaPin from "../../../assets/perfil/tarjeta-pin.svg";
import notaInfo from "../../../assets/perfil/nota-info.svg";

// Espacios · paso 1: elegir en el mapa (plantilla C «Página de trámite», como Credencial; Aldahir, 20 nov 2026).
// Franja compacta → pasos «Elige el espacio · Fecha y datos · Seguimiento» → dos columnas del mismo alto:
//   izquierda: el mapa 2D de la biblioteca (planta baja y Mesanim) para elegir un espacio;
//   derecha: sin elegir, la lista de los espacios para eventos; elegido, su detalle (capacidad, uso, condiciones y la acción).
// La leyenda de disponibilidad va al pie del mapa y resalta en él.
// Sin sesión se puede explorar todo; para solicitar se pide iniciar sesión. Una solicitud es por un espacio.
// Con una solicitud en proceso (en revisión o con un cambio propuesto), entrar a Espacios lleva directo a su seguimiento,
// como en Credencial (Aldahir, 20 nov); desde el seguimiento, «Pedir otro espacio» abre el mapa con ?nueva=1.
const estadoCorto = { disponible: "Disponible", ludico: "Solo lúdicas", condiciones: "Con condiciones" } as const;

export default function Espacios() {
    const sesion = useSesion();
    const navegar = useNavigate();
    const [parametros, setParametros] = useSearchParams();
    const [nueva] = useState(() => parametros.get("nueva") === "1");
    const inicial = zonaPorSlug(parametros.get("espacio") ?? "");
    const [elegido, setElegido] = useState<string | null>(inicial?.id ?? null);
    const [planta, setPlanta] = useState<Planta>(inicial?.planta ?? "baja");
    const [resaltar, setResaltar] = useState<Disponibilidad | null>(null);
    // Con una cuenta real, qué espacios ya están registrados para pedirse en línea (GET /espacios/areas)
    const [enLinea, setEnLinea] = useState<Set<string> | null>(null);

    useEffect(() => {
        if (!sesion || sesionSimulada) return;
        let vigente = true;
        listarAreas().then((a) => { if (vigente) setEnLinea(new Set(a.map((x) => x.slug))); }).catch(() => { if (vigente) setEnLinea(new Set()); });
        return () => { vigente = false; };
    }, [sesion]);

    // ¿Hay una solicitud en proceso? Entonces se va a su seguimiento (salvo que se pida otra a propósito)
    useEffect(() => {
        if (!sesion || nueva) return;
        let vigente = true;
        const buscar = sesionSimulada
            ? Promise.resolve(solicitudSimulada())
            : listarMisSolicitudes().then((r) => r.solicitudes.find(estaEnProceso) ?? null).catch(() => null);
        buscar.then((s) => {
            if (vigente && s && estaEnProceso(s)) navegar(`/espacios/solicitud/${encodeURIComponent(s.folio)}`, { replace: true });
        });
        return () => { vigente = false; };
    }, [sesion, nueva, navegar]);

    function elegir(id: string) {
        const nuevo = elegido === id ? null : id;
        setElegido(nuevo);
        const slug = nuevo ? espaciosEvento[nuevo]?.slug : undefined;
        setParametros({ ...(slug ? { espacio: slug } : {}), ...(nueva ? { nueva: "1" } : {}) }, { replace: true });
    }
    function verDisponibilidad(d: Disponibilidad) {
        const nueva = resaltar === d ? null : d;
        setResaltar(nueva);
        if (nueva === "condiciones") setPlanta("alta"); else if (nueva) setPlanta("baja");
    }

    const zona = elegido ? zonaPorId(elegido) : undefined;
    const evento = elegido ? espaciosEvento[elegido] : undefined;
    const slug = evento?.slug;

    return (
        <PaginaPublica>
            <EncabezadoPublico icono={iconosSeccion.espacios} etiqueta="Espacios" titulo={<>Espacios para tu <span>evento</span></>}
                texto="Elige en el mapa el espacio de la biblioteca que necesitas y solicítalo en línea." />
            <section className="contacto-seccion contacto-seccion--crema cred-pagina esp-pagina">
                <div className="contacto-pila">
                    <PasosTramite nombres={pasosEspacio} rutas={rutasEspacio(slug)} actual={1} pagina={1} solicitar={!!sesion && !!slug} />
                    <div className="contacto-columnas contacto-columnas--nuevo">
                        <section className="esp-mapa" aria-labelledby="titulo-mapa">
                            <div className="esp-mapa__barra">
                                <div>
                                    <h2 id="titulo-mapa">Mapa de la biblioteca</h2>
                                    <p>{planta === "alta" ? "Planta alta: la planta baja queda en gris como referencia." : "El Mesanim está justo encima del Área infantil."}</p>
                                </div>
                                <div className="perfil-filtros" role="group" aria-label="Planta del mapa">
                                    {(["baja", "alta"] as const).map((p) => (
                                        <button key={p} type="button" aria-pressed={planta === p} onClick={() => setPlanta(p)}
                                            className={`perfil-filtro${planta === p ? " perfil-filtro--activo" : ""}`}>
                                            {p === "baja" ? "Planta baja" : "Planta alta (Mesanim)"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <MapaBiblioteca planta={planta} alCambiarPlanta={setPlanta} elegido={elegido} alElegir={elegir} resaltar={resaltar} />
                            <div className="esp-leyenda" role="group" aria-label="Resaltar en el mapa por disponibilidad">
                                {(Object.keys(nombresDisponibilidad) as Disponibilidad[]).map((d) => (
                                    <button key={d} type="button" aria-pressed={resaltar === d} onClick={() => verDisponibilidad(d)}
                                        className={`esp-leyenda__opcion${resaltar === d ? " esp-leyenda__opcion--activa" : ""}`}>
                                        <span style={{ background: colorDisponibilidad[d] }} aria-hidden="true" />{nombresDisponibilidad[d]}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="contacto-lateral">
                            {zona && evento ? (
                                <section className="esp-tarjeta" aria-label={`Detalle de ${zona.nombre}`}>
                                    <DetalleEspacio key={zona.id} zona={zona}>
                                        <AccionEspacio sesion={sesion} slug={evento.slug} enLinea={enLinea} alVolver={() => elegir(zona.id)} />
                                    </DetalleEspacio>
                                </section>
                            ) : (
                                <TarjetaPerfil color="blanca" icono={tarjetaPin} titulo="Espacios para eventos" texto="Elige uno aquí o en el mapa.">
                                    <ul className="esp-lista">
                                        {zonas.filter((z) => espaciosEvento[z.id]).map((z) => {
                                            const e = espaciosEvento[z.id];
                                            return (
                                                <li key={z.id}>
                                                    <button type="button" className="esp-lista__opcion" onClick={() => { setPlanta(z.planta); elegir(z.id); }}>
                                                        <span className="esp-lista__icono"><img src={iconoDe(e.slug)} alt="" /></span>
                                                        <span className="esp-lista__textos"><strong>{z.nombre}</strong>{e.capacidad} personas</span>
                                                        <span className={`esp-lista__estado esp-lista__estado--${e.disponibilidad}`}>{estadoCorto[e.disponibilidad]}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </TarjetaPerfil>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </PaginaPublica>
    );
}

// La acción del espacio elegido: solicitarlo (con sesión), iniciar sesión (sin ella) o, si aún no se registra en línea, a quién llamar
function AccionEspacio({ sesion, slug, enLinea, alVolver }: { sesion: string | null | undefined; slug: string; enLinea: Set<string> | null; alVolver: () => void }) {
    const volver = <button type="button" className="perfil-boton perfil-boton--contorno" onClick={alVolver}>Ver los demás</button>;
    if (sesion === undefined) return null;
    if (sesion !== null && enLinea && !enLinea.has(slug)) {
        return <>
            <p className="perfil-nota cred-aviso" role="status">
                <img src={notaInfo} alt="" />
                <span>Este espacio todavía no se puede pedir en línea. Llama al 311 212 8989 y te ayudamos.</span>
            </p>
            <div className="perfil-acciones">{volver}</div>
        </>;
    }
    return (
        <div className="perfil-acciones">
            {sesion === null
                ? <Link to="/iniciar-sesion" className="perfil-boton">Iniciar sesión</Link>
                : <Link to={`/espacios/solicitar?espacio=${slug}`} className="perfil-boton">Solicitarlo</Link>}
            {volver}
        </div>
    );
}
