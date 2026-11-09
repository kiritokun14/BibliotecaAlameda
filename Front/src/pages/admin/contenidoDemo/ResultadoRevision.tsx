import { Link, Navigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import { cuandoConHora, fechaLarga, obtenerContenido, useContenidos, type Contenido } from "./datos";
import { tituloDe, type TipoContenido } from "./esquemas";
import { ChipEstado, Datos, Encabezado, Migas, Pagina, Pasos, PieDatos, Resultado, Tarjeta } from "./piezas";
import { clasesBoton, dondeSeVe } from "./utiles";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoLapiz from "../../../assets/admin/contenidos/resultado-lapiz.svg";
import iconoX from "../../../assets/admin/contenidos/resultado-x.svg";
import iconoReloj from "../../../assets/admin/contenidos/tarjeta-reloj.svg";
import iconoFlecha from "../../../assets/admin/contenidos/tarjeta-flecha.svg";

const BASE = "/admin/contenidos/revision";

type Tipo = "publicado" | "observaciones" | "rechazado";

const TITULO_PUBLICADO: Record<TipoContenido, string> = {
    noticia: "Noticia publicada",
    resena: "Reseña publicada",
    acerca: "Texto de Acerca de publicado",
    memoria: "Pieza de Memoria pública publicada",
};

// Página pública donde se ve cada tipo
const EN_PORTAL: Record<TipoContenido, string> = {
    noticia: "/noticias",
    resena: "/lecturas",
    acerca: "/acerca",
    memoria: "/lecturas/memoria",
};

// HU-12 · Revisión: resultado de la decisión (Figma 561:18001 y 610:48631 publicado, 561:18426 observaciones, 561:18854 rechazado)
function ResultadoRevision({ tipo }: { tipo: Tipo }) {
    const { folio } = useParams();
    useContenidos();
    const contenido = obtenerContenido(folio);
    const esperado = { publicado: ["publicado", "retirado"], observaciones: ["observaciones"], rechazado: ["rechazado"] }[tipo];
    if (!contenido || !esperado.includes(contenido.estado)) return <Navigate to={contenido ? `${BASE}/${contenido.folio}` : BASE} replace />;

    const migas = { publicado: "Publicado", observaciones: "Observaciones enviadas", rechazado: "Contenido rechazado" }[tipo];

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Revisión y publicación", BASE], [migas]]} />
                {tipo === "publicado" && <Publicado contenido={contenido} />}
                {tipo === "observaciones" && <ObservacionesEnviadas contenido={contenido} />}
                {tipo === "rechazado" && <Rechazado contenido={contenido} />}
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

function Publicado({ contenido }: { contenido: Contenido }) {
    const p = contenido.publicacion!;
    const nombre = `${contenido.folio} · ${tituloDe(contenido.tipo, contenido.valores)}`;
    return (
        <>
            <Encabezado
                grande
                etiqueta={`Contenido ${contenido.folio} · ${p.programada ? "Publicación programada" : "Publicado"}`}
                titulo={TITULO_PUBLICADO[contenido.tipo]}
                texto={p.programada
                    ? `Se publicará el ${fechaLarga(p.fecha.slice(0, 10))} y quedó registrado en la bitácora de cambios.`
                    : "Ya está visible en el portal público y quedó registrado en la bitácora de cambios."}
            />
            <Resultado
                tono="verde"
                icono={iconoCheck}
                titulo={nombre}
                linea={`${p.programada ? `Programada: ${fechaLarga(p.fecha.slice(0, 10))}` : `Publicada ${cuandoConHora(p.fecha).toLowerCase()}`} (ejemplo) · Autorizó: ${p.autorizo}`}
                chip={<ChipEstado estado={contenido.estado} />}
            />
            <Tarjeta icono={iconoReloj} titulo="Registro de la publicación">
                <Datos
                    filas={[
                        ["Dónde se ve", dondeSeVe(contenido)],
                        ["Autorización institucional", p.referencia],
                        ["Versión", String(p.version)],
                        ["Bitácora", "Registrada con autor, fecha y motivo"],
                    ]}
                />
            </Tarjeta>
            <div className="cn-acciones">
                <a href={EN_PORTAL[contenido.tipo]} target="_blank" rel="noopener noreferrer" className={clasesBoton("verde")}>
                    Ver en el portal ↗<span className="cn-solo-lectores"> (se abre en otra pestaña)</span>
                </a>
                <Link to={BASE} className={`${clasesBoton("contorno")} panel-regresar`}>Volver a Revisión y publicación</Link>
                <Link to={`${BASE}/historial`} className={clasesBoton("suave")}>Ver historial de publicaciones</Link>
            </div>
        </>
    );
}

function ObservacionesEnviadas({ contenido }: { contenido: Contenido }) {
    const o = contenido.observaciones!;
    return (
        <>
            <Encabezado grande etiqueta={`Contenido ${contenido.folio} · Con observaciones`} titulo="Observaciones enviadas" texto="El Editor recibió tus comentarios. El contenido sigue sin publicarse." />
            <Resultado
                tono="dorado"
                icono={iconoLapiz}
                titulo={`${contenido.folio} · ${tituloDe(contenido.tipo, contenido.valores)}`}
                linea={`Estado: Con observaciones · Enviadas ${cuandoConHora(contenido.actualizado).toLowerCase()} (ejemplo)${o.limite ? ` · Fecha límite: ${o.limite.toLowerCase()}` : ""}`}
                chip={<ChipEstado estado={contenido.estado} />}
            />
            <Tarjeta icono={iconoFlecha} titulo="¿Qué sigue?">
                <Pasos
                    pasos={[
                        ["El Editor corrige", "Recibe un aviso con tus observaciones."],
                        ["Vuelve a enviar", "El contenido regresa a tu bandeja como «Por autorizar»."],
                        ["Decides de nuevo", "Puedes autorizar, pedir más cambios o rechazar."],
                    ]}
                />
            </Tarjeta>
            <div className="cn-acciones">
                <Link to={BASE} className={`${clasesBoton("verde")} panel-regresar`}>Volver a Revisión y publicación</Link>
            </div>
        </>
    );
}

function Rechazado({ contenido }: { contenido: Contenido }) {
    const r = contenido.rechazo!;
    return (
        <>
            <Encabezado grande etiqueta={`Contenido ${contenido.folio} · Rechazado`} titulo="Contenido rechazado" texto="No se publicará. El Editor recibió el motivo y el registro quedó guardado." />
            <Resultado
                tono="guinda"
                icono={iconoX}
                titulo={`${contenido.folio} · ${tituloDe(contenido.tipo, contenido.valores)}`}
                linea={`Motivo: ${r.motivo} · ${cuandoConHora(r.fecha)} (ejemplo)`}
                chip={<ChipEstado estado={contenido.estado} />}
            />
            {r.explicacion && (
                <Tarjeta icono={iconoReloj} titulo="Registro del rechazo">
                    <Datos filas={[["Motivo", r.motivo], ["Explicación para el Editor", r.explicacion], ["Decidió", r.quien]]} />
                </Tarjeta>
            )}
            <div className="cn-acciones">
                <Link to={BASE} className={`${clasesBoton("verde")} panel-regresar`}>Volver a Revisión y publicación</Link>
                <Link to={`${BASE}/historial`} className={clasesBoton("suave")}>Ver historial de publicaciones</Link>
            </div>
        </>
    );
}

export default ResultadoRevision;
