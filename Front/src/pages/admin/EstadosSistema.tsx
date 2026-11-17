// Administración › Estados del sistema (Figma 583:45547): catálogo de los estados del panel,
// cuándo aparece cada uno y una vista previa. Los estados reales salen solos donde corresponde.
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PanelLayout from "./PanelLayout";
import SinPermiso from "./SinPermiso";
import { EncabezadoPagina, Migas } from "./componentes";
import {
    AvisoMantenimiento, AvisoResumenParcial, AvisoSinConexion, ContenidoErrorServidor, ContenidoNoEncontrada,
    ResumenCargando, ResumenConError, ResumenSinPendientes, VentanaSesionCaducada,
} from "./EstadosPanel";
import "./EstadosPanel.css";

const BASE = "/admin/administracion/estados";

type Estado = { id: string; nombre: string; cuando: string; tono: "verde" | "guinda" | "dorado"; grupo: string };

const ESTADOS: Estado[] = [
    { id: "sin-permiso", grupo: "Acceso", nombre: "Sin permiso para esta sección", tono: "guinda", cuando: "La cuenta abre una sección para la que no tiene permiso. Muestra lo que sí puede hacer." },
    { id: "no-encontrada", grupo: "Acceso", nombre: "Página no encontrada", tono: "verde", cuando: "Se abre una dirección del panel que no existe o fue movida." },
    { id: "sesion-caducada", grupo: "Acceso", nombre: "Sesión caducada", tono: "dorado", cuando: "La sesión se cierra por inactividad mientras se trabaja. Aparece una ventana sobre el panel." },
    { id: "error-servidor", grupo: "Sistema", nombre: "Error del servidor", tono: "guinda", cuando: "Una pantalla falla al cargar. El menú sigue disponible para moverse a otra sección." },
    { id: "sin-conexion", grupo: "Sistema", nombre: "Sin conexión", tono: "guinda", cuando: "El equipo pierde internet. Avisa arriba del contenido que no se guardarán cambios." },
    { id: "mantenimiento", grupo: "Sistema", nombre: "Portal en mantenimiento", tono: "dorado", cuando: "El modo mantenimiento está activo en Configuración. Solo el personal entra al portal." },
    { id: "resumen-cargando", grupo: "Resumen", nombre: "Resumen cargando", tono: "verde", cuando: "Mientras llegan los datos del Resumen." },
    { id: "resumen-error", grupo: "Resumen", nombre: "Resumen con error", tono: "guinda", cuando: "No se pudo cargar el Resumen. Permite reintentar." },
    { id: "resumen-sin-pendientes", grupo: "Resumen", nombre: "Resumen sin pendientes", tono: "verde", cuando: "No hay nada que atender en ninguna área." },
    { id: "resumen-parcial", grupo: "Resumen", nombre: "Resumen con datos parciales", tono: "dorado", cuando: "Algunas áreas no se actualizaron; el resto del Resumen sí." },
];

const GRUPOS = ["Acceso", "Sistema", "Resumen"];

export default function EstadosSistema() {
    return (
        <PanelLayout titulo="Administración" tema="contenidos" sinDemo>
            <Migas raiz="Administración" pasos={[["Estados del sistema"]]} />
            <EncabezadoPagina etiqueta="Administración · Estados del sistema" titulo="Estados del sistema"
                texto="Los avisos que ve el personal cuando algo no sale como se espera. Aparecen solos; aquí puedes revisar cómo se ve cada uno." />
            {GRUPOS.map((grupo) => (
                <section key={grupo} className="contenidos-lista" aria-labelledby={`grupo-${grupo}`}>
                    <div className="contenidos-lista__cabecera">
                        <div><h2 id={`grupo-${grupo}`}>{grupo}</h2></div>
                    </div>
                    <ul className="estados-catalogo">
                        {ESTADOS.filter((e) => e.grupo === grupo).map((e) => (
                            <li key={e.id} className={`estados-catalogo__tarjeta estados-catalogo__tarjeta--${e.tono}`}>
                                <strong>{e.nombre}</strong>
                                <p>{e.cuando}</p>
                                <Link to={`${BASE}/${e.id}`} className="contenidos-tabla__accion">Ver vista previa →</Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </PanelLayout>
    );
}

// Vista previa de un estado dentro del panel, con una nota para no confundirla con un error real
export function VistaPreviaEstado() {
    const { estado = "" } = useParams();
    const navegar = useNavigate();
    const volver = () => navegar(BASE);
    const info = ESTADOS.find((e) => e.id === estado);
    if (estado === "sin-permiso") return <SinPermiso />;

    const contenido: Record<string, ReactNode> = {
        "no-encontrada": <ContenidoNoEncontrada />,
        "error-servidor": <ContenidoErrorServidor alReintentar={volver} />,
        "sesion-caducada": <><ResumenCargando /><VentanaSesionCaducada alContinuar={volver} /></>,
        "sin-conexion": <><AvisoSinConexion /><ResumenCargando /></>,
        mantenimiento: <><AvisoMantenimiento /><ResumenCargando /></>,
        "resumen-cargando": <ResumenCargando />,
        "resumen-error": <ResumenConError alReintentar={volver} />,
        "resumen-sin-pendientes": <ResumenSinPendientes />,
        "resumen-parcial": <><AvisoResumenParcial alReintentar={volver} /><ResumenCargando /></>,
    };

    return (
        <PanelLayout titulo="Administración" tema="contenidos" sinDemo>
            <div className="estados-previa">
                <span><strong>Vista previa</strong> {info ? info.nombre : "Estado"} · así lo verá el personal.</span>
                <Link to={BASE} className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico">Volver al catálogo</Link>
            </div>
            {contenido[estado] ?? <ContenidoNoEncontrada />}
        </PanelLayout>
    );
}
