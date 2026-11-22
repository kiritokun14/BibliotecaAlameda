import { Link, useLocation } from "react-router";
import PanelLayout from "../PanelLayout";
import { Chip, Dato, Datos, Encabezado, Icono, Tarjeta, Vacio } from "../piezasPanel";
import "./Contenidos.css";

// Pantalla que aparece después de confirmar "Enviar a autorización" (con las piezas del panel, 22 nov 2026).
// Recibe lo enviado (con el folio que dio la base) por el estado de la navegación.

export type DatosEnvio = {
    tipo: string; // "Noticia", "Reseña bibliográfica"...
    queSeEnvia: string; // "la noticia", "la reseña", "la sección"
    titulo: string;
    folio?: string;
    enviadoEn: string; // fecha ISO
};

const PASOS = [
    { titulo: "Lo enviaste", texto: () => "Ya no se puede editar mientras espera; si hace falta, cancela el envío desde su consulta.", estado: "hecho" },
    { titulo: "Revisión", texto: (que: string) => `Administración lee ${que} y su vista previa.`, estado: "actual" },
    { titulo: "Decisión", texto: () => "Puede publicarlo, pedirte cambios o rechazarlo con un motivo.", estado: "" },
    { titulo: "Aviso", texto: () => "Verás el resultado en Mis contenidos y en tus notificaciones.", estado: "" },
];

function horaEnvio(iso: string) {
    const fecha = new Date(iso);
    const hora = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(fecha);
    if (fecha.toDateString() === new Date().toDateString()) return `Hoy, ${hora}`;
    return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(fecha);
}

function EnviadoAutorizacion() {
    const envio = useLocation().state as DatosEnvio | null;
    const que = envio?.queSeEnvia ?? "el contenido";

    return (
        <PanelLayout titulo="Contenidos" tema="contenidos paleta">
            <nav className="contenidos-migas" aria-label="Ruta">
                <span>Contenidos</span>
                <span aria-hidden="true">›</span>
                <Link to="/admin/contenidos/editor">Editor de contenidos</Link>
                <span aria-hidden="true">›</span>
                <strong aria-current="page">Enviado a autorización</strong>
            </nav>
            <div className="pz-pagina">
                <Encabezado titulo="Enviado a autorización" texto={envio ? `Tu ${que.replace(/^(la|el) /, "")} ya espera la decisión de Administración.` : "Tu contenido ya espera la decisión de Administración."}>
                    <Link to="/admin/contenidos/editor" className="pz-boton">Volver a Mis contenidos</Link>
                </Encabezado>

                {!envio ? (
                    <Tarjeta icono="contenido" id="enviado-sin-datos" titulo="Envío registrado">
                        <Vacio icono="check" titulo="Ya está en revisión" texto="Consulta su estado en Mis contenidos, en el filtro «Por autorizar»."
                            accion={<Link to="/admin/contenidos/editor" className="pz-boton pz-boton--chico">Ir a Mis contenidos</Link>} />
                    </Tarjeta>
                ) : (
                    <div className="pz-columnas pz-columnas--libre">
                        <Tarjeta icono="check" id="enviado-resumen" titulo={envio.titulo || "Sin título"} texto="Recibido; espera la decisión de Administración" accion={<Chip tono="dorado">Por autorizar</Chip>}>
                            <div className="pz-envio-ok" role="status">
                                <span className="pz-envio-ok__insignia" aria-hidden="true"><Icono nombre="check" /></span>
                                <p><strong>Se envió correctamente.</strong> Te avisaremos cuando haya una decisión.</p>
                            </div>
                            <Datos>
                                <Dato icono="contenido" etiqueta="Tipo">{envio.tipo}</Dato>
                                <Dato icono="lista" etiqueta="Folio">{envio.folio ?? "Se asigna al guardar"}</Dato>
                                <Dato icono="reloj" etiqueta="Enviado">{horaEnvio(envio.enviadoEn)}</Dato>
                            </Datos>
                            <div className="pz-acciones pz-acciones--fila">
                                {envio.folio && <Link to={`/admin/contenidos/editor/${envio.folio}/ver`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver el contenido enviado</Link>}
                                <Link to="/admin/contenidos/editor/nuevo" className="pz-boton pz-boton--contorno pz-boton--chico">Redactar otro contenido</Link>
                            </div>
                        </Tarjeta>
                        <aside className="pz-lateral" aria-label="Qué sigue">
                            <Tarjeta icono="revision" id="enviado-sigue" titulo="¿Qué sigue?" texto="Así avanza tu envío">
                                <ol className="pz-linea">
                                    {PASOS.map((paso) => (
                                        <li key={paso.titulo} className={`pz-linea__paso pz-linea__paso--${paso.estado === "hecho" ? "verde" : paso.estado === "actual" ? "dorado" : "gris"}${paso.estado === "actual" ? " pz-linea__paso--actual" : ""}`}>
                                            <span className="pz-linea__icono" aria-hidden="true"><Icono nombre={paso.estado === "hecho" ? "check" : paso.estado === "actual" ? "reloj" : "info"} /></span>
                                            <div className="pz-linea__textos">
                                                <p className="pz-linea__titulo">{paso.titulo}</p>
                                                <p className="pz-linea__detalle">{paso.texto(que)}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </Tarjeta>
                        </aside>
                    </div>
                )}
            </div>
        </PanelLayout>
    );
}

export default EnviadoAutorizacion;
