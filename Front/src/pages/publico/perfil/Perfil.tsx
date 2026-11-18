import { useCallback, useEffect, useState } from "react";
import { Bloque } from "../../../components/portal/Esqueleto";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { consultarPerfil, consultarPreferenciasAvisos, type PerfilPropio } from "../../../servicios/perfil";
import { cerrarSesion } from "../../../servicios/auth";
import { ErrorServicio, mensajeError, obtenerSupabase } from "../../../servicios/api";
import { simulacion } from "../../../servicios/simulacion";
import { EncabezadoPerfil, MenuPerfil, ModalCerrarSesion } from "./piezas";
import { CorreoPendiente, EditarDatos, MisDatos, Resumen } from "./secciones";
import { MisMensajes } from "./MisMensajes";
import MisEventos from "./MisEventos";
import { Avisos, MiCredencialPerfil, MisEspacios, MisPropuestas, Progreso, Seguridad } from "./seccionesCuenta";
import { useTramite } from "../credencial/datos";
import { chipCredencial, esMenorDeEdad, nombreCompleto, perfilSimulado, seccionDeRuta, tipoDeCuenta } from "./datos";
import "./Perfil.css";
import PedirSesion from "../sesion/PedirSesion";

// Mi perfil · persona con sesión iniciada (Figma 476:22959 adulta y 476:26155 menor de edad).
// vista: subpantallas de «Mis datos» que no son una sección del menú.
type Vista = "editar" | "correo-pendiente";
type Carga = { perfil: PerfilPropio } | { error: string; ingresar: boolean };

// En desarrollo, ?simular=sesion (o sesion-menor) muestra el perfil con datos de ejemplo, sin backend.
const modoSimulado = simulacion();
const simulado = modoSimulado === "sesion" || modoSimulado === "sesion-menor" ? perfilSimulado(modoSimulado === "sesion-menor") : null;

export default function Perfil({ vista }: { vista?: Vista }) {
    const { seccion: parametro } = useParams();
    const seccion = vista ? "datos" : seccionDeRuta(parametro);
    const navegar = useNavigate();
    const tramite = useTramite();
    const [usuario, setUsuario] = useState<string | null | undefined>(simulado ? simulado.id : undefined);
    const [carga, setCarga] = useState<Carga | null>(simulado ? { perfil: simulado } : null);
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
        consultarPerfil()
            .then((perfil) => { if (vigente) setCarga({ perfil }); })
            .catch((e) => { if (vigente) setCarga({ error: mensajeError(e), ingresar: e instanceof ErrorServicio && e.estado === 401 }); });
        return () => { vigente = false; };
    }, [usuario, intento]); // eslint-disable-line react-hooks/exhaustive-deps -- la sección solo decide qué precargar

    const recargar = useCallback(() => { setCarga(null); setIntento((x) => x + 1); }, []);
    const cancelarModal = useCallback(() => { setModal(false); setErrorCierre(""); }, []);

    async function salir() {
        setCerrando(true); setErrorCierre("");
        try { await cerrarSesion(); navegar("/"); }
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
    const perfil = carga && "perfil" in carga && carga.perfil.id === usuario ? carga.perfil : null;
    if (!perfil && !(carga && "error" in carga)) return <PaginaPublica><EsqueletoPerfil /></PaginaPublica>;
    if (!perfil) {
        return (
            <PaginaPublica>
                <div className="perfil-pantalla">
                    {carga && "error" in carga ? <>
                        <h1>No se pudo cargar tu perfil</h1>
                        <p role="alert">{carga.error}</p>
                        {carga.ingresar
                            ? <Link className="perfil-boton" to="/iniciar-sesion">Iniciar sesión</Link>
                            : <button type="button" className="perfil-boton" onClick={recargar}>Reintentar</button>}
                    </> : <EsqueletoPerfil />}
                </div>
            </PaginaPublica>
        );
    }

    // Persona menor de edad: sin «Mis propuestas» ni «Mis espacios».
    const menor = esMenorDeEdad(perfil.fechaNacimiento);
    if (!vista && seccionDeRuta(parametro, menor) === null) return <Navigate to="/mi-perfil" replace />;
    const abrirCierre = () => setModal(true);
    let contenido;
    if (vista === "editar") contenido = <EditarDatos perfil={perfil} menor={menor} alGuardar={(p) => setCarga({ perfil: p })} alRecargar={recargar} />;
    else if (vista === "correo-pendiente") contenido = <CorreoPendiente />;
    else contenido = {
        resumen: <Resumen menor={menor} nombre={perfil.nombres} />, datos: <MisDatos perfil={perfil} menor={menor} />,
        credencial: <MiCredencialPerfil perfil={perfil} menor={menor} />, eventos: <MisEventos key={perfil.id} />,
        propuestas: <MisPropuestas />, espacios: <MisEspacios />, progreso: <Progreso menor={menor} />,
        mensajes: <MisMensajes />, avisos: <Avisos key={perfil.id} />, seguridad: <Seguridad perfil={perfil} menor={menor} alCerrarSesion={abrirCierre} />,
    }[seccion];

    return (
        <PaginaPublica>
            <EncabezadoPerfil nombre={nombreCompleto(perfil)} correo={perfil.correo}
                tipoCuenta={tipoDeCuenta(perfil.fechaNacimiento)}
                credencial={chipCredencial(tramite.estado)} />
            <div className="perfil-cuerpo">
                <MenuPerfil activa={seccion} menor={menor} alCerrarSesion={abrirCierre} />
                {/* key: al cambiar de sección el contenido entra con su animación */}
                <div className="perfil-seccion" key={vista ?? seccion}>{contenido}</div>
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
