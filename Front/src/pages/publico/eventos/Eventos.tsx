import { Link, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import EstadoPagina from "../../../components/portal/EstadoPagina";
import { simulacion } from "../../../servicios/simulacion";
import {
    AvisoCuenta,
    EncabezadoVisitante,
    LlamadoVisitante,
    PasosVisitante,
    SeccionVisitante,
} from "../../../components/portal/Visitante";
import Agenda from "./Agenda";
import TodasActividades from "./TodasActividades";
import CalendarioActividades from "./CalendarioActividades";
import DetalleActividad from "./DetalleActividad";
import { obtenerActividad } from "./datosAgenda";
import "./Eventos.css";
import { actividadElegida, partirFecha } from "./datos";
import type { Actividad } from "../inicio/datos";
import iconoReloj from "../../../assets/comun/iconos/dato-reloj.svg";
import iconoUsuarios from "../../../assets/comun/iconos/dato-usuarios.svg";
import iconoInfo from "../../../assets/comun/iconos/nota-info.svg";
import circuloDorado from "../../../assets/comun/iconos/circulo-grande.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";

// T-052 · Eventos para visitante SIN cuenta.
// /eventos/:id llega desde el carrusel de Inicio y muestra esa actividad.
// /eventos (sin elegir) no muestra ninguna: invita a elegir una en Inicio.
function Eventos() {
    const { id } = useParams();
    // Sin actividad elegida se muestra la agenda completa (T-052, Figma A-02 476:11136).
    if (!id) return <Agenda />;
    if (id === "todas") return <TodasActividades />;
    if (id === "calendario") return <CalendarioActividades />;
    const deAgenda = obtenerActividad(id);
    if (deAgenda) return <DetalleActividad actividad={deAgenda} />;
    const actividad = actividadElegida(id);
    // TODO backend: si la consulta de eventos falla se muestra «No pudimos cargar los eventos».
    // Mientras tanto se puede ver con ?simular=error (solo en desarrollo).
    const fallo = simulacion() === "error";

    return (
        <PaginaPublica>
            <EncabezadoVisitante
                regreso={{ texto: "Volver a Inicio", ruta: "/" }}
                etiqueta="EVENTOS Y ACTIVIDADES"
                titulo={<><span>Inscríbete</span> a la actividad</>}
                texto={
                    actividad
                        ? "Estás a un paso de apuntarte. Para confirmar tu lugar necesitamos saber quién eres."
                        : "Elige una actividad en Inicio y aquí verás cómo apartar tu lugar."
                }
            />

            {fallo ? (
                <EstadoPagina
                    nivel="h2"
                    etiqueta="ERROR AL CARGAR"
                    titulo="No pudimos cargar los eventos"
                    texto="Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, escríbenos desde el Buzón de sugerencias."
                    principal={{ texto: "Intentar de nuevo", ruta: id ? `/eventos/${id}` : "/eventos" }}
                    secundario={{ texto: "Ir al Buzón de sugerencias", ruta: "/contacto?tipo=sugerencia" }}
                />
            ) : (<>
                <SeccionVisitante
                    fondo="blanco"
                    sobretitulo="TU ACTIVIDAD"
                    titulo={actividad ? "Esta es la actividad que elegiste" : "Aún no eliges una actividad"}
                >
                    {actividad ? <TarjetaElegida actividad={actividad} /> : <SinActividad idDesconocido={Boolean(id)} />}
                    <p className="nota-actividad">
                        <img src={iconoInfo} alt="" />
                        Para inscribirte solo necesitas una cuenta: participar en actividades no exige la credencial.
                    </p>
                </SeccionVisitante>

                <SeccionVisitante fondo="crema">
                    <AvisoCuenta
                        titulo={actividad ? "Inicia sesión o crea una cuenta para inscribirte a esta actividad" : "Inicia sesión o crea una cuenta para inscribirte a una actividad"}
                        texto="Sin cuenta puedes consultar todo. La inscripción se hace con tu cuenta de la biblioteca."
                        sinCuenta={["Consultar noticias, listados y calendario", "Ver el detalle de cada actividad"]}
                        conCuenta={["Inscribirte a una actividad"]}
                    />
                </SeccionVisitante>

                <SeccionVisitante
                    fondo="verde"
                    sobretitulo="EL PROCESO"
                    titulo="Cómo te inscribes a una actividad"
                >
                    <PasosVisitante
                        pasos={[
                            { titulo: "Elige una actividad", texto: "Búscala en el carrusel de actividades de Inicio." },
                            { titulo: "Entra con tu cuenta", texto: "Inicia sesión o crea tu cuenta; no necesitas credencial." },
                            { titulo: "Confirma tu lugar", texto: "Revisa fecha y horario y confirma tu inscripción." },
                            { titulo: "Asiste", texto: "Llega unos minutos antes. Si hay cambios, te avisamos." },
                        ]}
                    />
                </SeccionVisitante>

                <LlamadoVisitante
                    titulo="Aparta tu lugar en la actividad"
                    texto="Solo necesitas una cuenta. Participar en actividades no exige tener credencial."
                />
            </>)}
        </PaginaPublica>
    );
}

function TarjetaElegida({ actividad }: { actividad: Actividad }) {
    const { dia, mes } = partirFecha(actividad.fecha);
    return (
        <article className="actividad-elegida">
            <img className="actividad-elegida__circulo" src={circuloDorado} alt="" />
            <span className="actividad-elegida__fecha" aria-hidden="true">
                <strong>{dia}</strong>
                <small>{mes}</small>
            </span>
            <div className="actividad-elegida__textos">
                <p className="actividad-elegida__tipo">{actividad.tipo.toUpperCase()}</p>
                <h3>{actividad.titulo}</h3>
                <ul>
                    <li className="solo-lectores">Fecha: {actividad.fecha}</li>
                    <li><img src={iconoReloj} alt="" />{actividad.horario}</li>
                    <li><img src={iconoUsuarios} alt="" />{actividad.publico}</li>
                </ul>
                <p className="actividad-elegida__nota">Datos de ejemplo</p>
            </div>
        </article>
    );
}

// Sin actividad elegida (o con un enlace que ya no existe) no se muestra ningún evento
function SinActividad({ idDesconocido }: { idDesconocido: boolean }) {
    return (
        <div className="actividad-vacia">
            <div>
                <h3>{idDesconocido ? "No encontramos esa actividad" : "Todavía no hay una actividad seleccionada"}</h3>
                <p>Elige una en el carrusel de actividades de Inicio para ver aquí sus datos.</p>
            </div>
            <Link to="/" className="boton-visitante">
                Ver actividades <img src={flechaBlanca} alt="" />
            </Link>
        </div>
    );
}

export default Eventos;
