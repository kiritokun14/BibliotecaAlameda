import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Bloque } from "../../../components/portal/Esqueleto";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { consultarPerfil, consultarPreferenciasAvisos, type PerfilPropio } from "../../../servicios/perfil";
import { cerrarSesion } from "../../../servicios/auth";
import { salirConAnimacion } from "../../../components/sesion/transicion";
import { ErrorServicio, mensajeError, obtenerSupabase } from "../../../servicios/api";
import { simulacion } from "../../../servicios/simulacion";
import { EncabezadoPerfil, MenuPerfil, ModalCerrarSesion } from "./piezas";
import { iconosSeccion } from "./iconos";
import { EditarDatos, MisDatos, Resumen } from "./secciones";
import { MisMensajes } from "./MisMensajes";
import MisEventos from "./MisEventos";
import { Avisos, MiCredencialPerfil, MisEspacios, MisPropuestas, Progreso, Seguridad } from "./seccionesCuenta";
import { useTramite } from "../credencial/datos";
import { chipCredencial, esPerfilMenor, nombreCompleto, perfilSimulado, seccionDeRuta, tipoDeCuenta } from "./datos";
import "./Perfil.css";
import PedirSesion from "../sesion/PedirSesion";

// Mi perfil · persona con sesión iniciada (Figma 476:22959 adulta y 476:26155 menor de edad).
// vista: subpantallas de «Mis datos» que no son una sección del menú.
type Vista = "editar" | "correo-pendiente";
type Carga = ({ perfil: PerfilPropio } | { error: string; ingresar: boolean }) & { usuarioId: string };

// En desarrollo, ?simular=sesion (o sesion-menor) muestra el perfil con datos de ejemplo, sin backend.
const modoSimulado = simulacion();
const simulado = modoSimulado === "sesion" || modoSimulado === "sesion-menor" ? perfilSimulado(modoSimulado === "sesion-menor") : null;

export default function Perfil({ vista }: { vista?: Vista }) {
    const { seccion: parametro } = useParams();
    const seccion = vista ? "datos" : seccionDeRuta(parametro);
    const navegar = useNavigate();
    const tramite = useTramite();
    const [usuario, setUsuario] = useState<string | null | undefined>(simulado ? simulado.id : undefined);
    const [carga, setCarga] = useState<Carga | null>(simulado ? { perfil: simulado, usuarioId: simulado.id } : null);
    const [intento, setIntento] = useState(0);
    const [modal, setModal] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const [errorCierre, setErrorCierre] = useState("");

    // Sesión: se escucha a Supabase para saber quién entró (o si salió).
    useEffect(() => {
        if (simulado) return;
        let vigente = true;
        let cancelar: (() => void) | undefined;
        obtenerSupabase().then((cliente) => {
            if (!vigente) return;
            const { data } = cliente.auth.onAuthStateChange((_evento, sesion) => setUsuario(sesion?.user.id ?? null));
            cancelar = () => data.subscription.unsubscribe();
        }).catch(() => { if (vigente) setUsuario(null); });
        return () => { vigente = false; cancelar?.(); };
    }, []);

    useEffect(() => {
        if (!usuario || simulado) return;
        let vigente = true;
        // Avisos no depende de los datos del perfil: sus preferencias se piden al mismo tiempo
        if (seccion === "avisos") consultarPreferenciasAvisos().catch(() => undefined);
        consultarPerfil(usuario)
            .then((perfil) => { if (vigente && perfil.id === usuario) setCarga({ perfil, usuarioId: usuario }); })
            .catch((e) => { if (vigente) setCarga({ error: mensajeError(e), ingresar: e instanceof ErrorServicio && e.estado === 401, usuarioId: usuario }); });
        return () => { vigente = false; };
    }, [usuario, intento]); // eslint-disable-line react-hooks/exhaustive-deps -- la sección solo decide qué precargar

    const recargar = useCallback(() => { setCarga(null); setIntento((x) => x + 1); }, []);
    const cancelarModal = useCallback(() => { setModal(false); setErrorCierre(""); }, []);

    async function salir() {
        setCerrando(true); setErrorCierre("");
        try { await salirConAnimacion({ tema: "portal", cerrar: cerrarSesion, ir: () => navegar("/") }); } // con la animación de salida
        catch (e) { setErrorCierre(mensajeError(e)); setCerrando(false); }
    }

    if (seccion === null) return <Navigate to="/mi-perfil" replace />;

    // Sin sesión: se pide iniciarla.
    if (usuario === null) {
        return (
            <PaginaPublica>
                <PedirSesion titulo="Inicia sesión para ver tu perfil" texto="Tu perfil reúne tus datos, tu credencial, tus eventos y tus avisos." />
            </PaginaPublica>
        );
    }
    const actual = carga?.usuarioId === usuario ? carga : null;
    const perfil = actual && "perfil" in actual ? actual.perfil : null;
    if (!perfil && !(actual && "error" in actual)) return <PaginaPublica><EsqueletoPerfil /></PaginaPublica>;
    if (!perfil) {
        return (
            <PaginaPublica>
                <div className="perfil-pantalla">
                    {actual && "error" in actual ? <>
                        <h1>No se pudo cargar tu perfil</h1>
                        <p role="alert">{actual.error}</p>
                        {actual.ingresar
                            ? <Link className="perfil-boton" to="/iniciar-sesion">Iniciar sesión</Link>
                            : <button type="button" className="perfil-boton" onClick={recargar}>Reintentar</button>}
                    </> : <EsqueletoPerfil />}
                </div>
            </PaginaPublica>
        );
    }

    // Persona menor de edad: sin «Mis propuestas» ni «Mis espacios».
    const menor = esPerfilMenor(perfil);
    if (vista === "correo-pendiente") return <Navigate to="/mi-perfil/datos" replace />;
    if (!vista && seccionDeRuta(parametro, menor) === null) return <Navigate to="/mi-perfil" replace />;
    const abrirCierre = () => setModal(true);
    let contenido;
    if (vista === "editar") contenido = <EditarDatos key={perfil.id} perfil={perfil} menor={menor}
        alGuardar={(p) => setCarga((previa) => previa?.usuarioId === p.id ? { perfil: p, usuarioId: p.id } : previa)} alRecargar={recargar} />;
    else contenido = {
        resumen: <Resumen menor={menor} perfil={perfil} />, datos: <MisDatos perfil={perfil} menor={menor} />,
        credencial: <MiCredencialPerfil perfil={perfil} menor={menor} />, eventos: <MisEventos key={perfil.id} />,
        propuestas: <MisPropuestas />, espacios: <MisEspacios />, progreso: <Progreso menor={menor} usuario={perfil.id} />,
        mensajes: <MisMensajes />, avisos: <Avisos key={perfil.id} />, seguridad: <Seguridad perfil={perfil} menor={menor} alCerrarSesion={abrirCierre} />,
    }[seccion];

    return (
        <PaginaPublica>
            <EncabezadoPerfil nombre={nombreCompleto(perfil)} correo={perfil.correo}
                tipoCuenta={tipoDeCuenta(perfil)}
                credencial={chipCredencial(tramite.estado)} />
            <div className="perfil-cuerpo">
                <MenuPerfil activa={seccion} menor={menor} alCerrarSesion={abrirCierre} />
                <div className="perfil-seccion" key={`${perfil.id}:${vista ?? seccion}`}
                    style={{ "--icono-seccion": `url("${iconosSeccion[seccion]}")` } as CSSProperties}>{contenido}</div>
            </div>
            {modal && <ModalCerrarSesion cerrando={cerrando} error={errorCierre} alConfirmar={salir} alCancelar={cancelarModal} />}
        </PaginaPublica>
    );
}

// Mientras llega el perfil: la misma forma de la página (encabezado verde, menú y contenido)
function EsqueletoPerfil() {
    return (
        <div className="perfil-esqueleto" role="status">
            <span className="solo-lectores">Cargando tu perfil…</span>
            <div className="perfil-esqueleto__encabezado" aria-hidden="true">
                <Bloque clase="perfil-esqueleto__avatar esqueleto__bloque--claro" />
                <div className="perfil-esqueleto__textos">
                    <Bloque clase="esqueleto__chip esqueleto__bloque--claro" />
                    <Bloque clase="esqueleto__titulo esqueleto__titulo--grande esqueleto__bloque--claro" ancho="380px" />
                    <Bloque clase="esqueleto__linea esqueleto__bloque--claro" ancho="240px" />
                </div>
            </div>
            <div className="perfil-esqueleto__cuerpo" aria-hidden="true">
                <div className="perfil-esqueleto__menu">{[0, 1, 2, 3, 4, 5, 6].map((i) => <Bloque key={i} clase="esqueleto__linea perfil-esqueleto__item" />)}</div>
                <div className="perfil-esqueleto__contenido">
                    <Bloque clase="esqueleto__chip" />
                    <Bloque clase="esqueleto__titulo esqueleto__titulo--grande" ancho="320px" />
                    <Bloque clase="perfil-esqueleto__tarjeta" />
                    <Bloque clase="perfil-esqueleto__tarjeta" />
                </div>
            </div>
        </div>
    );
}
