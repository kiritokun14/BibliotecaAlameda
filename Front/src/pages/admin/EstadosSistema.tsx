// Administración › Estados del sistema (Figma 583:45547): los mensajes que ve el personal cuando algo no sale como se espera.
// 21 nov 2026 (rediseño con las piezas del panel): lista de mensajes con filtro por grupo | vista previa en vivo del elegido,
// dentro de un marco (sin interacción) y con «Ver a pantalla completa». Los estados reales salen solos donde corresponde.
import { useId, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PanelLayout from "./PanelLayout";
import SinPermiso from "./SinPermiso";
import { Migas } from "./componentes";
import { Chip, Cifra, Encabezado, Icono, Segmentado, Tarjeta, Vacio, type NombreIcono, type TonoEstado } from "./piezasPanel";
import {
    AvisoMantenimiento, AvisoResumenParcial, AvisoSinConexion, ContenidoErrorServidor, ContenidoNoEncontrada,
    ResumenCargando, ResumenConError, ResumenSinPendientes, VentanaSesionCaducada,
} from "./EstadosPanel";
import "./EstadosPanel.css";

const BASE = "/admin/administracion/estados";

type Grupo = "Acceso" | "Sistema" | "Resumen";
type Estado = { id: string; nombre: string; cuando: string; tono: "verde" | "guinda" | "dorado"; grupo: Grupo };

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
const GRUPOS: Grupo[] = ["Acceso", "Sistema", "Resumen"];
const TONO: Record<Estado["tono"], { icono: NombreIcono; chip: TonoEstado; texto: string }> = {
    verde: { icono: "check", chip: "verde", texto: "Informativo" },
    dorado: { icono: "reloj", chip: "dorado", texto: "Aviso" },
    guinda: { icono: "alerta", chip: "guinda", texto: "Error" },
};

// Lo que se ve de cada estado (lo usan la vista previa en la página y la de pantalla completa)
function contenidoDe(estado: string, volver: () => void): ReactNode {
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
    return contenido[estado] ?? null;
}

export default function EstadosSistema() {
    const id = useId();
    const [grupo, setGrupo] = useState<Grupo | "todos">("todos");
    const [elegido, setElegido] = useState(ESTADOS[0].id);
    const lista = ESTADOS.filter((e) => grupo === "todos" || e.grupo === grupo);
    const actual = ESTADOS.find((e) => e.id === elegido) ?? ESTADOS[0];
    const previa = contenidoDe(actual.id, () => undefined);
    const cuantos = (t: Estado["tono"]) => ESTADOS.filter((e) => e.tono === t).length;

    return (
        <PanelLayout titulo="Administración" tema="contenidos paleta" sinDemo>
            <Migas raiz="Administración" pasos={[["Estados del sistema"]]} />
            <div className="pz-pagina">
                <Encabezado titulo="Estados del sistema" texto="Los mensajes que ve el personal cuando algo no sale como se espera. Aparecen solos; aquí puedes ver cómo se ve cada uno.">
                    <Cifra icono="estados" valor={ESTADOS.length} texto="mensajes" />
                    <Cifra icono="alerta" tono="vino" valor={cuantos("guinda")} texto="de error" />
                    <Cifra icono="reloj" valor={cuantos("dorado")} texto="avisos" />
                </Encabezado>

                <div className="pz-columnas pz-columnas--previa">
                    <Tarjeta icono="estados" id={`${id}-lista`} titulo="Mensajes del panel" texto="Elige uno para ver cómo se ve" className="pz-pendientes">
                        <Segmentado<Grupo | "todos"> etiqueta="Filtrar por grupo" valor={grupo} alCambiar={setGrupo}
                            opciones={[{ valor: "todos", texto: "Todos", cantidad: ESTADOS.length }, ...GRUPOS.map((g) => ({ valor: g, texto: g, cantidad: ESTADOS.filter((e) => e.grupo === g).length }))]} />
                        <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lista de mensajes">
                            <ul className="pz-filas">
                                {lista.map((e) => (
                                    <li key={e.id}>
                                        <button type="button" className={`pz-fila pz-fila--boton pz-fila--${e.tono}${e.id === actual.id ? " pz-fila--elegida" : ""}`}
                                            aria-pressed={e.id === actual.id} onClick={() => setElegido(e.id)}>
                                            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={TONO[e.tono].icono} /></span>
                                            <span className="pz-fila__textos">
                                                <span className="pz-fila__titulo">{e.nombre}</span>
                                                <span className="pz-fila__detalle"><span>{e.grupo}</span><span>{e.cuando}</span></span>
                                            </span>
                                            <Chip tono={TONO[e.tono].chip}>{TONO[e.tono].texto}</Chip>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Tarjeta>

                    <section className="pz-tarjeta pz-previa" aria-labelledby={`${id}-previa`}>
                        <div className="pz-tarjeta__cabecera">
                            <span className="pz-tarjeta__icono"><Icono nombre={TONO[actual.tono].icono} /></span>
                            <div className="pz-tarjeta__titulos">
                                <h3 id={`${id}-previa`}>{actual.nombre}</h3>
                                <p className="pz-tarjeta__texto">{actual.cuando}</p>
                            </div>
                            <div className="pz-tarjeta__accion"><Link to={`${BASE}/${actual.id}`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver a pantalla completa</Link></div>
                        </div>
                        <div className="pz-previa__marco" aria-label={`Vista previa: ${actual.nombre}`}>
                            <div className="pz-previa__barra" aria-hidden="true"><span /><span /><span /><p>Panel del personal</p></div>
                            {previa ? (
                                <div className="pz-previa__contenido" inert key={actual.id}><div className="pz-previa__escala">{previa}</div></div>
                            ) : (
                                <div className="pz-previa__vacio">
                                    <Vacio icono="cuentas" titulo="Se muestra como página completa" texto="Esta pantalla reemplaza todo el panel; ábrela a pantalla completa para verla." />
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </PanelLayout>
    );
}

// Vista previa de un estado a pantalla completa, con una nota para no confundirla con un error real
export function VistaPreviaEstado() {
    const { estado = "" } = useParams();
    const navegar = useNavigate();
    const volver = () => navegar(BASE);
    const info = ESTADOS.find((e) => e.id === estado);
    if (estado === "sin-permiso") return <SinPermiso />;

    return (
        <PanelLayout titulo="Administración" tema="contenidos paleta" sinDemo>
            <div className="pz-aviso pz-aviso--espera" role="status">
                <p><strong>Vista previa.</strong> {info ? info.nombre : "Estado"}: así lo verá el personal.</p>
                <Link to={BASE} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a los estados</Link>
            </div>
            {contenidoDe(estado, volver) ?? <ContenidoNoEncontrada />}
        </PanelLayout>
    );
}
