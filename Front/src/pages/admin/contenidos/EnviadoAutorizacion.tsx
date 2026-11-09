import { Link, useLocation } from "react-router";
import PanelLayout from "../PanelLayout";
import { IconoMas } from "./piezas";
import "./Contenidos.css";

// Pantalla que aparece después de confirmar "Enviar a autorización".
// Recibe lo enviado (con el folio que dio la base) por el estado de la navegación.

export type DatosEnvio = {
    tipo: string; // "Noticia", "Reseña bibliográfica"...
    queSeEnvia: string; // "la noticia", "la reseña", "la sección"
    titulo: string;
    folio?: string;
    enviadoEn: string; // fecha ISO
};

const PASOS = [
    { titulo: "Revisión", texto: (que: string) => `El Administrador lee ${que} y su vista previa.` },
    { titulo: "Decisión", texto: () => "Puede publicarla, pedirte cambios o rechazarla con un motivo." },
    { titulo: "Aviso", texto: () => "Verás el resultado en este módulo y en tus notificaciones." },
];

const IconoPalomita = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);
const IconoFlecha = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
);

function horaEnvio(iso: string) {
    const fecha = new Date(iso);
    const hoy = new Date();
    const hora = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(fecha);
    if (fecha.toDateString() === hoy.toDateString()) return `hoy, ${hora}`;
    return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(fecha);
}

function EnviadoAutorizacion() {
    const envio = useLocation().state as DatosEnvio | null;
    const que = envio?.queSeEnvia ?? "el contenido";
    const nombre = envio?.titulo || "Sin título";

    return (
        <PanelLayout titulo="Contenidos" tema="contenidos">
            <nav className="contenidos-migas" aria-label="Ruta">
                <span>Contenidos</span>
                <span aria-hidden="true">›</span>
                <Link to="/admin/contenidos/editor">Editor de contenidos</Link>
                <span aria-hidden="true">›</span>
                <strong aria-current="page">Enviado a autorización</strong>
            </nav>

            <div className="contenidos-encabezado">
                <div>
                    <p className="contenidos-etiqueta">Contenidos · Editor{envio?.folio ? ` · ${envio.folio}` : ""}</p>
                    <h1>Enviado a autorización</h1>
                    <p className="contenidos-encabezado__texto">
                        {envio ? `Tu ${que.replace(/^la /, "")} ya espera la decisión del Administrador.` : "Tu contenido ya espera la decisión del Administrador."}
                    </p>
                </div>
            </div>

            <section className="contenidos-enviado" role="status">
                <span className="contenidos-enviado__palomita"><IconoPalomita /></span>
                <div className="contenidos-enviado__textos">
                    <p className="contenidos-enviado__titulo">{envio?.folio ? `${envio.folio} · ${nombre}` : nombre}</p>
                    <p className="contenidos-enviado__detalle">
                        {envio ? `${envio.tipo} · Estado: Por autorizar · Enviado ${horaEnvio(envio.enviadoEn)}` : "Estado: Por autorizar"}
                    </p>
                </div>
                <span className="contenidos-estado contenidos-estado--por_autorizar">Por autorizar</span>
            </section>

            <section className="contenidos-como contenidos-como--blanco" aria-labelledby="enviado-sigue">
                <div className="contenidos-como__cabecera">
                    <span className="contenidos-como__icono"><IconoFlecha /></span>
                    <h2 id="enviado-sigue">¿Qué sigue?</h2>
                </div>
                <ol className="contenidos-como__pasos">
                    {PASOS.map((paso, i) => (
                        <li key={paso.titulo}>
                            <span className="contenidos-como__numero">{i + 1}</span>
                            <div>
                                <strong>{paso.titulo}</strong>
                                <p>{paso.texto(que)}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            <div className="contenidos-previa__acciones">
                <Link to="/admin/contenidos/editor" className="contenidos-boton contenidos-boton--principal panel-regresar">Volver a Mis contenidos</Link>
                {/* TODO: pantalla de solo lectura para un contenido enviado */}
                <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled title="Disponible pronto">
                    Ver el contenido enviado
                </button>
                <Link to="/admin/contenidos/editor/nuevo" className="contenidos-boton contenidos-boton--suave-azul">
                    <IconoMas />
                    Nuevo contenido
                </Link>
            </div>
        </PanelLayout>
    );
}

export default EnviadoAutorizacion;
