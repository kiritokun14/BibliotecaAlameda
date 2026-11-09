import { lazy, Suspense } from "react";
import RetornoAuth from "./pages/acceso/RetornoAuth";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Inicio from "./pages/publico/inicio/Inicio.tsx";
import Login from "./pages/acceso/Login.tsx";
import CuentaDeshabilitada from "./pages/acceso/CuentaDeshabilitada.tsx";
import SesionIniciada from "./pages/acceso/SesionIniciada.tsx";
import CrearCuenta from "./pages/acceso/CrearCuenta.tsx";
import CorreoRegistrado from "./pages/acceso/CorreoRegistrado.tsx";
import ConfirmarCorreo from "./pages/acceso/ConfirmarCorreo.tsx";
import ConfirmarEnlaceVencido from "./pages/acceso/ConfirmarEnlaceVencido.tsx";
import SolicitarEnlace from "./pages/acceso/recuperar/SolicitarEnlace.tsx";
import RevisaTuCorreo from "./pages/acceso/recuperar/RevisaTuCorreo.tsx";
import NuevaContrasena from "./pages/acceso/recuperar/NuevaContrasena.tsx";
import ContrasenaActualizada from "./pages/acceso/recuperar/ContrasenaActualizada.tsx";
import EnlaceVencido from "./pages/acceso/recuperar/EnlaceVencido.tsx";
import RecuperacionAsistida from "./pages/acceso/recuperar/RecuperacionAsistida.tsx";

const AltaAsistida = lazy(() => import("./pages/personal/AltaAsistida"));

const ModeracionForo = lazy(() => import("./pages/admin/participantes/ModeracionForo.tsx"));
const AvisosManuales = lazy(() => import("./pages/admin/atencion/AvisosManuales.tsx"));
const Tramites = lazy(() => import("./pages/publico/tramites/Tramites.tsx"));
const Credenciales = lazy(() => import("./pages/admin/atencion/AtencionTramites.tsx"));
const DetalleCredencial = lazy(() => import("./pages/admin/atencion/AtencionTramites.tsx"));
const Espacios = lazy(() => import("./pages/admin/atencion/espacios/Espacios.tsx"));
const DetalleEspacio = lazy(() => import("./pages/admin/atencion/espacios/DetalleEspacio.tsx"));
const Propuestas = lazy(() => import("./pages/admin/atencion/AtencionTramites.tsx"));
const DetallePropuesta = lazy(() => import("./pages/admin/atencion/AtencionTramites.tsx"));
const VistaPrevia = lazy(() => import("./pages/admin/atencion/AtencionTramites.tsx"));
const Recuperacion = lazy(() => import("./pages/admin/atencion/recuperacion/Recuperacion.tsx"));
const CuentaEncontrada = lazy(() => import("./pages/admin/atencion/recuperacion/Recuperacion.tsx").then(m => ({ default: m.CuentaEncontrada })));
const VerificarIdentidad = lazy(() => import("./pages/admin/atencion/recuperacion/Recuperacion.tsx").then(m => ({ default: m.VerificarIdentidad })));
const ResultadoRecuperacion = lazy(() => import("./pages/admin/atencion/recuperacion/Recuperacion.tsx").then(m => ({ default: m.ResultadoRecuperacion })));
const HistorialRecuperacion = lazy(() => import("./pages/admin/atencion/recuperacion/Recuperacion.tsx").then(m => ({ default: m.HistorialRecuperacion })));
const CuentasAtencion = lazy(() => import("./pages/admin/atencion/cuentas/Cuentas.tsx"));
const FichaCuenta = lazy(() => import("./pages/admin/atencion/cuentas/Cuentas.tsx").then(m => ({ default: m.FichaCuenta })));
const BitacoraCuenta = lazy(() => import("./pages/admin/atencion/cuentas/Cuentas.tsx").then(m => ({ default: m.BitacoraCuenta })));
const ResultadoCuenta = lazy(() => import("./pages/admin/atencion/cuentas/Cuentas.tsx").then(m => ({ default: m.ResultadoCuenta })));
const AvisosAtencion = lazy(() => import("./pages/admin/atencion/avisos/Avisos.tsx"));
const FormularioAviso = lazy(() => import("./pages/admin/atencion/avisos/Avisos.tsx").then(m => ({ default: m.FormularioAviso })));
const VistaPreviaAviso = lazy(() => import("./pages/admin/atencion/avisos/Avisos.tsx").then(m => ({ default: m.VistaPreviaAviso })));
const DetalleAviso = lazy(() => import("./pages/admin/atencion/avisos/Avisos.tsx").then(m => ({ default: m.DetalleAviso })));
const ResultadoAviso = lazy(() => import("./pages/admin/atencion/avisos/Avisos.tsx").then(m => ({ default: m.ResultadoAviso })));
import AccesoPanel from "./pages/admin/AccesoPanel";
const EditorContenidos = lazy(() => import("./pages/admin/contenidos/EditorContenidos.tsx"));
const NuevoContenido = lazy(() => import("./pages/admin/contenidos/NuevoContenido.tsx"));
const RedactarNoticia = lazy(() => import("./pages/admin/contenidos/RedactarNoticia.tsx"));
const RedactarResena = lazy(() => import("./pages/admin/contenidos/RedactarResena.tsx"));
const EditarAcerca = lazy(() => import("./pages/admin/contenidos/EditarAcerca.tsx"));
const EnviadoAutorizacion = lazy(() => import("./pages/admin/contenidos/EnviadoAutorizacion.tsx"));
const CorregirNoticia = lazy(() => import("./pages/admin/contenidos/CorregirNoticia.tsx"));
const EditarContenido = lazy(() => import("./pages/admin/contenidos/EditarContenido.tsx"));
const RedactarMemoria = lazy(() => import("./pages/admin/contenidos/RedactarMemoria.tsx"));

const Catalogo = lazy(() => import("./pages/publico/catalogo/Catalogo.tsx"));
const Acerca = lazy(() => import("./pages/publico/acerca/Acerca.tsx"));
const Servicios = lazy(() => import("./pages/publico/servicios/Servicios.tsx"));
const DetalleServicio = lazy(() => import("./pages/publico/servicios/DetalleServicio.tsx"));
const Contacto = lazy(() => import("./pages/publico/contacto/Contacto.tsx"));
const Noticias = lazy(() => import("./pages/publico/noticias/Noticias.tsx"));
const TodasNoticias = lazy(() => import("./pages/publico/noticias/TodasNoticias.tsx"));
const DetalleNoticia = lazy(() => import("./pages/publico/noticias/DetalleNoticia.tsx"));
const AbrirAsistente = lazy(() => import("./pages/publico/asistente/AbrirAsistente.tsx"));
const Eventos = lazy(() => import("./pages/publico/eventos/Eventos.tsx"));
const CuentaSuspendida = lazy(() => import("./pages/publico/sesion/EstadosSesion.tsx").then(m => ({ default: m.CuentaSuspendida })));
const SesionCaducada = lazy(() => import("./pages/publico/sesion/EstadosSesion.tsx").then(m => ({ default: m.SesionCaducada })));
const MiInscripcion = lazy(() => import("./pages/publico/eventos/MiInscripcion.tsx"));
const Credencial = lazy(() => import("./pages/publico/credencial/Credencial.tsx"));
const TramiteCredencial = lazy(() => import("./pages/publico/credencial/Tramite.tsx"));
const NotificacionesUsuario = lazy(() => import("./pages/publico/notificaciones/Notificaciones.tsx"));
const EspaciosPublico = lazy(() => import("./pages/publico/espacios/Espacios.tsx"));
const ProponerActividad = lazy(() => import("./pages/publico/proponer/Proponer.tsx"));
const PropuestaEnviada = lazy(() => import("./pages/publico/proponer/Proponer.tsx").then(m => ({ default: m.PropuestaEnviada })));
const DetallePropuestaUsuario = lazy(() => import("./pages/publico/proponer/Proponer.tsx").then(m => ({ default: m.DetallePropuesta })));
const ClubAlameda = lazy(() => import("./pages/publico/club/ClubAlameda.tsx"));
const HiloClub = lazy(() => import("./pages/publico/club/ClubAlameda.tsx").then(m => ({ default: m.HiloClub })));
const SolicitudEspacioEnviada = lazy(() => import("./pages/publico/espacios/SolicitudEspacio.tsx").then(m => ({ default: m.SolicitudEnviada })));
const GestionarSolicitudEspacio = lazy(() => import("./pages/publico/espacios/SolicitudEspacio.tsx").then(m => ({ default: m.GestionarSolicitud })));
const Lecturas = lazy(() => import("./pages/publico/lecturas/Lecturas.tsx"));
const LecturasTema = lazy(() => import("./pages/publico/lecturas/LecturasTema.tsx"));
const MemoriaPublica = lazy(() => import("./pages/publico/lecturas/MemoriaPublica.tsx"));
const DetalleResena = lazy(() => import("./pages/publico/lecturas/DetalleResena.tsx"));
const DetalleMemoria = lazy(() => import("./pages/publico/lecturas/DetalleMemoria.tsx"));
const Resumen = lazy(() => import("./pages/admin/resumen/Resumen.tsx"));
const Notificaciones = lazy(() => import("./pages/admin/notificaciones/Notificaciones.tsx"));
const BandejaRevision = lazy(() => import("./pages/admin/revision/Revision.tsx").then(m => ({ default: m.BandejaRevision })));
const RevisarContenido = lazy(() => import("./pages/admin/revision/Revision.tsx"));
const PedirCambios = lazy(() => import("./pages/admin/revision/Revision.tsx"));
const RechazarContenido = lazy(() => import("./pages/admin/revision/Revision.tsx"));
const ResultadoRevision = lazy(() => import("./pages/admin/revision/Revision.tsx"));
const HistorialPublicaciones = lazy(() => import("./pages/admin/revision/Revision.tsx").then(m => ({ default: m.HistorialPublicaciones })));
const PropuestasActividades = lazy(() => import("./pages/admin/actividades/GestionActividades.tsx"));
const DetalleActividad = lazy(() => import("./pages/admin/actividades/GestionActividades.tsx"));
const ActividadPublicada = lazy(() => import("./pages/admin/actividades/GestionActividades.tsx"));
const Calendario = lazy(() => import("./pages/admin/actividades/Calendario.tsx"));
const Visitas = lazy(() => import("./pages/admin/actividades/Visitas.tsx"));
const Cambios = lazy(() => import("./pages/admin/actividades/Cambios.tsx"));
const ErrorServidor = lazy(() => import("./pages/publico/estados/Estados.tsx").then(m => ({ default: m.ErrorServidor })));
const Mantenimiento = lazy(() => import("./pages/publico/estados/Estados.tsx").then(m => ({ default: m.Mantenimiento })));
const SinConexion = lazy(() => import("./pages/publico/estados/Estados.tsx").then(m => ({ default: m.SinConexion })));
const EditarActividad = lazy(() => import("./pages/admin/actividades/GestionActividades.tsx"));
const NuevaActividad = lazy(() => import("./pages/admin/actividades/GestionActividades.tsx"));
const EditarSala = lazy(() => import("./pages/admin/actividades/FichaSala.tsx").then(m => ({ default: m.EditarSala })));
const FichaSala = lazy(() => import("./pages/admin/actividades/FichaSala.tsx").then(m => ({ default: m.FichaSala })));
const BloqueoGuardado = lazy(() => import("./pages/admin/actividades/FormularioBloqueo.tsx").then(m => ({ default: m.BloqueoGuardado })));
const EditarBloqueo = lazy(() => import("./pages/admin/actividades/FormularioBloqueo.tsx").then(m => ({ default: m.EditarBloqueo })));
const NuevoBloqueo = lazy(() => import("./pages/admin/actividades/FormularioBloqueo.tsx").then(m => ({ default: m.NuevoBloqueo })));
const ConfirmarVisita = lazy(() => import("./pages/admin/actividades/DetalleVisita.tsx").then(m => ({ default: m.ConfirmarVisita })));
const DetalleVisita = lazy(() => import("./pages/admin/actividades/DetalleVisita.tsx").then(m => ({ default: m.DetalleVisita })));
const ProponerFecha = lazy(() => import("./pages/admin/actividades/DetalleVisita.tsx").then(m => ({ default: m.ProponerFecha })));
const ResultadoVisita = lazy(() => import("./pages/admin/actividades/DetalleVisita.tsx").then(m => ({ default: m.ResultadoVisita })));
const FichaUso = lazy(() => import("./pages/admin/actividades/UsoEspacio.tsx").then(m => ({ default: m.FichaUso })));
const RegistrarUso = lazy(() => import("./pages/admin/actividades/UsoEspacio.tsx").then(m => ({ default: m.RegistrarUso })));
const UsoGuardado = lazy(() => import("./pages/admin/actividades/UsoEspacio.tsx").then(m => ({ default: m.UsoGuardado })));
const CancelarActividad = lazy(() => import("./pages/admin/actividades/DetalleCambio.tsx").then(m => ({ default: m.CancelarActividad })));
const DetalleCambio = lazy(() => import("./pages/admin/actividades/DetalleCambio.tsx").then(m => ({ default: m.DetalleCambio })));
const Reprogramar = lazy(() => import("./pages/admin/actividades/DetalleCambio.tsx").then(m => ({ default: m.Reprogramar })));
const ResultadoCambio = lazy(() => import("./pages/admin/actividades/DetalleCambio.tsx").then(m => ({ default: m.ResultadoCambio })));
const FichaInscripcion = lazy(() => import("./pages/admin/actividades/GestionInscripcion.tsx").then(m => ({ default: m.FichaInscripcion })));
const InscribirPersona = lazy(() => import("./pages/admin/actividades/GestionInscripcion.tsx").then(m => ({ default: m.InscribirPersona })));
const ResultadoInscripcion = lazy(() => import("./pages/admin/actividades/GestionInscripcion.tsx").then(m => ({ default: m.ResultadoInscripcion })));

const NoEncontrada = lazy(() => import("./pages/publico/estados/Estados.tsx").then(m => ({ default: m.NoEncontrada })));

const Inscripciones = lazy(() => import("./pages/admin/actividades/Inscripciones.tsx"));
const InscritosActividad = lazy(() => import("./pages/admin/actividades/Inscripciones.tsx").then(m => ({ default: m.InscritosActividad })));
const Asistencia = lazy(() => import("./pages/admin/actividades/Asistencia.tsx"));
const ListaCerrada = lazy(() => import("./pages/admin/actividades/Asistencia.tsx").then(m => ({ default: m.ListaCerrada })));
const PasarLista = lazy(() => import("./pages/admin/actividades/Asistencia.tsx").then(m => ({ default: m.PasarLista })));
const ResumenAsistencia = lazy(() => import("./pages/admin/actividades/Asistencia.tsx").then(m => ({ default: m.ResumenAsistencia })));
const Evidencias = lazy(() => import("./pages/admin/actividades/Evidencias.tsx"));
const DetalleEvidencia = lazy(() => import("./pages/admin/actividades/Evidencias.tsx").then(m => ({ default: m.DetalleEvidencia })));
const ResultadoEvidencia = lazy(() => import("./pages/admin/actividades/Evidencias.tsx").then(m => ({ default: m.ResultadoEvidencia })));
const SubirEvidencia = lazy(() => import("./pages/admin/actividades/Evidencias.tsx").then(m => ({ default: m.SubirEvidencia })));
const Progreso = lazy(() => import("./pages/admin/participantes/Progreso.tsx"));
const FichaParticipante = lazy(() => import("./pages/admin/participantes/FichaParticipante.tsx").then(m => ({ default: m.FichaParticipante })));
const ResultadoParticipante = lazy(() => import("./pages/admin/participantes/FichaParticipante.tsx").then(m => ({ default: m.ResultadoParticipante })));
const FormularioMeta = lazy(() => import("./pages/admin/participantes/FormulariosProgreso.tsx").then(m => ({ default: m.FormularioMeta })));
const FormularioRecompensa = lazy(() => import("./pages/admin/participantes/FormulariosProgreso.tsx").then(m => ({ default: m.FormularioRecompensa })));
const GuardadoProgreso = lazy(() => import("./pages/admin/participantes/FormulariosProgreso.tsx").then(m => ({ default: m.GuardadoProgreso })));
const Cotejo = lazy(() => import("./pages/admin/participantes/Cotejo.tsx"));
const DetalleCotejo = lazy(() => import("./pages/admin/participantes/DetalleCotejo.tsx").then(m => ({ default: m.DetalleCotejo })));
const PedirCorreccion = lazy(() => import("./pages/admin/participantes/DetalleCotejo.tsx").then(m => ({ default: m.PedirCorreccion })));
const ResultadoCotejo = lazy(() => import("./pages/admin/participantes/DetalleCotejo.tsx").then(m => ({ default: m.ResultadoCotejo })));
const Foro = lazy(() => import("./pages/admin/participantes/Foro.tsx"));
const DetallePublicacion = lazy(() => import("./pages/admin/participantes/DetalleForo.tsx").then(m => ({ default: m.DetallePublicacion })));
const AdvertirPersona = lazy(() => import("./pages/admin/participantes/DetalleForo.tsx").then(m => ({ default: m.AdvertirPersona })));
const HiloCompleto = lazy(() => import("./pages/admin/participantes/DetalleForo.tsx").then(m => ({ default: m.HiloCompleto })));
const ResultadoForo = lazy(() => import("./pages/admin/participantes/DetalleForo.tsx").then(m => ({ default: m.ResultadoForo })));
const ParticipacionRestaurada = lazy(() => import("./pages/admin/participantes/DetalleForo.tsx").then(m => ({ default: m.ParticipacionRestaurada })));

const ContenidoPropio = lazy(() => import("./pages/admin/revision/Revision.tsx").then(m => ({ default: m.ContenidoPropio })));

const AtencionComunidad = lazy(() => import("./pages/admin/comunidad/AtencionComunidad"));
const FuentesAsistente = lazy(() => import("./pages/admin/comunidad/Fuentes"));
const CuentasPermisos = lazy(() => import("./pages/admin/administracion/CuentasPermisos.tsx"));
const FichaPersonal = lazy(() => import("./pages/admin/administracion/CuentasPermisos.tsx").then(m => ({ default: m.FichaPersonal })));
const PermisosCuenta = lazy(() => import("./pages/admin/administracion/CuentasPermisos.tsx").then(m => ({ default: m.PermisosCuenta })));
const ResultadoPersonal = lazy(() => import("./pages/admin/administracion/CuentasPermisos.tsx").then(m => ({ default: m.ResultadoPersonal })));
const EstadisticasAdmin = lazy(() => import("./pages/admin/administracion/Estadisticas.tsx"));
const BitacoraAdmin = lazy(() => import("./pages/admin/administracion/Bitacora.tsx"));
const DetalleMovimiento = lazy(() => import("./pages/admin/administracion/Bitacora.tsx").then(m => ({ default: m.DetalleMovimiento })));
const ConfiguracionAdmin = lazy(() => import("./pages/admin/administracion/Configuracion.tsx"));
const PerfilPropio = lazy(() => import("./pages/publico/perfil/Perfil"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<main className="confirmacion" role="status">Cargando pantalla...</main>}>
      <Routes>
        <Route path="/" element={<Inicio />} />

        <Route path="/personal/alta-asistida" element={<AltaAsistida />} />
        <Route path="/auth/retorno" element={<RetornoAuth />} />
        <Route path="/iniciar-sesion" element={<Login />} />
        <Route path="/cuenta-deshabilitada" element={<CuentaDeshabilitada />} />
        <Route path="/cuenta-suspendida" element={<CuentaSuspendida />} />
        <Route path="/sesion-caducada" element={<SesionCaducada />} />
        <Route path="/sesion-iniciada" element={<SesionIniciada />} />

        <Route path="/crear-cuenta" element={<CrearCuenta />} />
        <Route path="/crear-cuenta/correo-registrado" element={<CorreoRegistrado />} />
        <Route path="/confirma-tu-correo" element={<ConfirmarCorreo />} />
        <Route path="/confirma-tu-correo/enlace-vencido" element={<ConfirmarEnlaceVencido />} />

        <Route path="/recuperar" element={<SolicitarEnlace />} />
        <Route path="/recuperar/revisa-tu-correo" element={<RevisaTuCorreo />} />
        <Route path="/recuperar/nueva-contrasena" element={<NuevaContrasena />} />
        <Route path="/recuperar/listo" element={<ContrasenaActualizada />} />
        <Route path="/recuperar/enlace-vencido" element={<EnlaceVencido />} />
        <Route path="/recuperar/asistida" element={<RecuperacionAsistida />} />

        <Route path="/admin/participantes/foro" element={<AccesoPanel><ModeracionForo /></AccesoPanel>} />
        <Route path="/admin/atencion/avisos" element={<AccesoPanel><AvisosManuales /></AccesoPanel>} />
        {/* Panel del personal: bandejas de atención. */}
        <Route path="/admin" element={<AccesoPanel><Navigate to="/admin/atencion/credenciales" replace /></AccesoPanel>} />
        {/* key distinta para que al cambiar entre bandeja y "todas" se reinicien los filtros */}
        <Route path="/admin/atencion/credenciales" element={<AccesoPanel><Credenciales key="bandeja" /></AccesoPanel>} />
        <Route path="/admin/atencion/credenciales/todas" element={<AccesoPanel><Credenciales key="todas" /></AccesoPanel>} />
        <Route path="/admin/atencion/credenciales/:folio" element={<AccesoPanel><DetalleCredencial /></AccesoPanel>} />
        <Route path="/admin/atencion/espacios" element={<AccesoPanel><Espacios key="bandeja" vista="bandeja" /></AccesoPanel>} />
        <Route path="/admin/atencion/espacios/todas" element={<AccesoPanel><Espacios key="todas" vista="todas" /></AccesoPanel>} />
        <Route path="/admin/atencion/espacios/:folio" element={<AccesoPanel><DetalleEspacio /></AccesoPanel>} />
        <Route path="/admin/atencion/propuestas" element={<AccesoPanel><Propuestas key="bandeja" /></AccesoPanel>} />
        <Route path="/admin/atencion/propuestas/todas" element={<AccesoPanel><Propuestas key="todas" /></AccesoPanel>} />
        <Route path="/admin/atencion/propuestas/:folio" element={<AccesoPanel><DetallePropuesta /></AccesoPanel>} />
        <Route path="/admin/atencion/propuestas/:folio/publicar" element={<AccesoPanel><VistaPrevia /></AccesoPanel>} />
        {/* Atención: Recuperación asistida, Consulta de cuentas y Avisos */}
        <Route path="/admin/atencion/recuperacion" element={<AccesoPanel><Recuperacion /></AccesoPanel>} />
        <Route path="/admin/atencion/recuperacion/historial" element={<AccesoPanel><HistorialRecuperacion /></AccesoPanel>} />
        <Route path="/admin/atencion/recuperacion/:id" element={<AccesoPanel><CuentaEncontrada /></AccesoPanel>} />
        <Route path="/admin/atencion/recuperacion/:id/verificar" element={<AccesoPanel><VerificarIdentidad /></AccesoPanel>} />
        <Route path="/admin/atencion/recuperacion/:id/enviado" element={<AccesoPanel><ResultadoRecuperacion tipo="enviado" /></AccesoPanel>} />
        <Route path="/admin/atencion/recuperacion/:id/fallida" element={<AccesoPanel><ResultadoRecuperacion tipo="fallida" /></AccesoPanel>} />
        <Route path="/admin/atencion/cuentas" element={<AccesoPanel><CuentasAtencion /></AccesoPanel>} />
        <Route path="/admin/atencion/cuentas/:id" element={<AccesoPanel><FichaCuenta /></AccesoPanel>} />
        <Route path="/admin/atencion/cuentas/:id/bitacora" element={<AccesoPanel><BitacoraCuenta /></AccesoPanel>} />
        <Route path="/admin/atencion/cuentas/:id/suspendida" element={<AccesoPanel><ResultadoCuenta tipo="suspendida" /></AccesoPanel>} />
        <Route path="/admin/atencion/cuentas/:id/reactivada" element={<AccesoPanel><ResultadoCuenta tipo="reactivada" /></AccesoPanel>} />
        <Route path="/admin/atencion/avisos/demostracion" element={<AccesoPanel><AvisosAtencion /></AccesoPanel>} />
        <Route path="/admin/atencion/avisos/demostracion/nuevo" element={<AccesoPanel><FormularioAviso /></AccesoPanel>} />
        <Route path="/admin/atencion/avisos/demostracion/:folio" element={<AccesoPanel><DetalleAviso /></AccesoPanel>} />
        <Route path="/admin/atencion/avisos/demostracion/:folio/editar" element={<AccesoPanel><FormularioAviso /></AccesoPanel>} />
        <Route path="/admin/atencion/avisos/demostracion/:folio/vista-previa" element={<AccesoPanel><VistaPreviaAviso /></AccesoPanel>} />
        <Route path="/admin/atencion/avisos/demostracion/:folio/publicado" element={<AccesoPanel><ResultadoAviso tipo="publicado" /></AccesoPanel>} />
        <Route path="/admin/atencion/avisos/demostracion/:folio/retirado" element={<AccesoPanel><ResultadoAviso tipo="retirado" /></AccesoPanel>} />
        <Route path="/admin/atencion/avisos/demostracion/:folio/borrador" element={<AccesoPanel><ResultadoAviso tipo="borrador" /></AccesoPanel>} />

        <Route path="/admin/atencion/bibliocomunidad" element={<AccesoPanel><AtencionComunidad key="bibliocomunidad" bibliocomunidad /></AccesoPanel>} />
        <Route path="/admin/atencion/contactos" element={<AccesoPanel><AtencionComunidad key="contactos" /></AccesoPanel>} />
        <Route path="/admin/administracion/fuentes" element={<AccesoPanel><FuentesAsistente /></AccesoPanel>} />
        {/* Administración: Cuentas y permisos, Estadísticas, Bitácora y Configuración */}
        <Route path="/admin/administracion/cuentas" element={<AccesoPanel><CuentasPermisos /></AccesoPanel>} />
        <Route path="/admin/administracion/cuentas/:id" element={<AccesoPanel><FichaPersonal /></AccesoPanel>} />
        <Route path="/admin/administracion/cuentas/:id/permisos" element={<AccesoPanel><PermisosCuenta /></AccesoPanel>} />
        <Route path="/admin/administracion/cuentas/:id/permisos-guardados" element={<AccesoPanel><ResultadoPersonal tipo="permisos" /></AccesoPanel>} />
        <Route path="/admin/administracion/cuentas/:id/suspendida" element={<AccesoPanel><ResultadoPersonal tipo="suspendida" /></AccesoPanel>} />
        <Route path="/admin/administracion/cuentas/:id/reactivada" element={<AccesoPanel><ResultadoPersonal tipo="reactivada" /></AccesoPanel>} />
        <Route path="/admin/administracion/estadisticas" element={<AccesoPanel><EstadisticasAdmin /></AccesoPanel>} />
        <Route path="/admin/administracion/bitacora" element={<AccesoPanel><BitacoraAdmin /></AccesoPanel>} />
        <Route path="/admin/administracion/bitacora/:folio" element={<AccesoPanel><DetalleMovimiento /></AccesoPanel>} />
        <Route path="/admin/administracion/configuracion" element={<AccesoPanel><ConfiguracionAdmin /></AccesoPanel>} />
        {/* Editor conectado a los borradores de T-054. */}
        <Route path="/admin/contenidos" element={<Navigate to="/admin/contenidos/editor" replace />} />
        <Route path="/admin/contenidos/editor" element={<AccesoPanel><EditorContenidos /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/nuevo" element={<AccesoPanel><NuevoContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/nuevo/noticia" element={<AccesoPanel><RedactarNoticia /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/nuevo/resena" element={<AccesoPanel><RedactarResena /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/nuevo/memoria" element={<AccesoPanel><RedactarMemoria /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/acerca" element={<AccesoPanel><EditarAcerca /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/enviado" element={<AccesoPanel><EnviadoAutorizacion /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/:folio/corregir" element={<AccesoPanel><CorregirNoticia /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/:folio/editar" element={<AccesoPanel><EditarContenido /></AccesoPanel>} />

        {/* Rutas nuevas del portal y del panel. */}
                <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/acerca" element={<Acerca />} />
        <Route path="/acerca/:seccion" element={<Acerca />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/servicios/:id" element={<DetalleServicio />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/mi-perfil" element={<PerfilPropio />} />
        <Route path="/mi-perfil/datos/editar" element={<PerfilPropio vista="editar" />} />
        <Route path="/mi-perfil/datos/correo-pendiente" element={<PerfilPropio vista="correo-pendiente" />} />
        <Route path="/mi-perfil/:seccion" element={<PerfilPropio />} />
        <Route path="/mis-tramites/credencial" element={<Tramites />} />
        <Route path="/mis-tramites/credencial/:id" element={<Tramites />} />
        <Route path="/mis-tramites/propuestas" element={<Tramites />} />
        <Route path="/mis-tramites/propuestas/:id" element={<Tramites />} />
        <Route path="/proponer-evento" element={<Tramites />} />
        <Route path="/noticias" element={<Noticias />} />
        <Route path="/noticias/todas" element={<TodasNoticias />} />
        <Route path="/noticias/:id" element={<DetalleNoticia />} />
        <Route path="/asistente" element={<AbrirAsistente />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/eventos/:id" element={<Eventos />} />
        <Route path="/eventos/:id/mi-inscripcion" element={<MiInscripcion />} />
        <Route path="/credencial" element={<Credencial />} />
        <Route path="/credencial/solicitud" element={<TramiteCredencial vista="solicitud" />} />
        <Route path="/credencial/enviada" element={<TramiteCredencial vista="enviada" />} />
        <Route path="/credencial/seguimiento" element={<TramiteCredencial vista="seguimiento" />} />
        <Route path="/notificaciones" element={<NotificacionesUsuario />} />
        <Route path="/espacios" element={<EspaciosPublico />} />
        <Route path="/espacios/enviada" element={<SolicitudEspacioEnviada />} />
        <Route path="/espacios/solicitud/:id" element={<GestionarSolicitudEspacio />} />
        <Route path="/proponer" element={<ProponerActividad />} />
        <Route path="/proponer/enviada" element={<PropuestaEnviada />} />
        <Route path="/proponer/:id" element={<DetallePropuestaUsuario />} />
        <Route path="/club-alameda" element={<ClubAlameda />} />
        <Route path="/club-alameda/:tema" element={<HiloClub />} />
        <Route path="/lecturas" element={<Lecturas />} />
        <Route path="/lecturas/temas" element={<LecturasTema />} />
        <Route path="/lecturas/memoria" element={<MemoriaPublica />} />
        <Route path="/lecturas/memoria/:id" element={<DetalleMemoria />} />
        <Route path="/lecturas/:id" element={<DetalleResena />} />
        <Route path="/admin/resumen" element={<AccesoPanel><Resumen /></AccesoPanel>} />
        <Route path="/admin/notificaciones" element={<AccesoPanel><Notificaciones /></AccesoPanel>} />
        <Route path="/admin/contenidos/demostracion" element={<Navigate to="/admin/contenidos/editor" replace />} />
        <Route path="/admin/contenidos/demostracion/nuevo" element={<Navigate to="/admin/contenidos/editor" replace />} />
        <Route path="/admin/contenidos/demostracion/:folio" element={<Navigate to="/admin/contenidos/editor" replace />} />
        <Route path="/admin/contenidos/demostracion/:folio/vista-previa" element={<Navigate to="/admin/contenidos/editor" replace />} />
        <Route path="/admin/contenidos/demostracion/:folio/enviado" element={<Navigate to="/admin/contenidos/editor" replace />} />
        <Route path="/admin/contenidos/revision" element={<AccesoPanel><BandejaRevision /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/historial" element={<AccesoPanel><HistorialPublicaciones /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio" element={<AccesoPanel><RevisarContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/vista-previa" element={<AccesoPanel><RevisarContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/cambios" element={<AccesoPanel><PedirCambios /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/retirar" element={<AccesoPanel><RevisarContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/:folio/ver" element={<AccesoPanel><ContenidoPropio /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/rechazar" element={<AccesoPanel><RechazarContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/publicado" element={<AccesoPanel><ResultadoRevision /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/observaciones-enviadas" element={<AccesoPanel><ResultadoRevision /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/rechazado" element={<AccesoPanel><ResultadoRevision /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas" element={<AccesoPanel><PropuestasActividades /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/nueva" element={<AccesoPanel><NuevaActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/:folio" element={<AccesoPanel><DetalleActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/:folio/editar" element={<AccesoPanel><EditarActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/:folio/vista-previa" element={<AccesoPanel><DetalleActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/:folio/publicada" element={<AccesoPanel><ActividadPublicada /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario" element={<AccesoPanel><Calendario /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/bloquear" element={<AccesoPanel><NuevoBloqueo /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/bloqueos/:id/editar" element={<AccesoPanel><EditarBloqueo /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/bloqueos/:id/guardado" element={<AccesoPanel><BloqueoGuardado /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/salas/:sala" element={<AccesoPanel><FichaSala /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/salas/:sala/editar" element={<AccesoPanel><EditarSala /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas" element={<AccesoPanel><Visitas /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/uso/registrar" element={<AccesoPanel><RegistrarUso /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/uso/:id" element={<AccesoPanel><FichaUso /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/uso/:id/editar" element={<AccesoPanel><RegistrarUso /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/uso/:id/guardado" element={<AccesoPanel><UsoGuardado /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/:folio" element={<AccesoPanel><DetalleVisita /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/:folio/confirmar" element={<AccesoPanel><ConfirmarVisita /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/:folio/proponer" element={<AccesoPanel><ProponerFecha /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/:folio/confirmada" element={<AccesoPanel><ResultadoVisita tipo="confirmada" /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/:folio/propuesta-enviada" element={<AccesoPanel><ResultadoVisita tipo="propuesta" /></AccesoPanel>} />
        <Route path="/admin/actividades/visitas/:folio/rechazada" element={<AccesoPanel><ResultadoVisita tipo="rechazada" /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios" element={<AccesoPanel><Cambios /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/cancelar" element={<AccesoPanel><CancelarActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/reprogramar" element={<AccesoPanel><Reprogramar /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio" element={<AccesoPanel><DetalleCambio /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio/aplicado" element={<AccesoPanel><ResultadoCambio tipo="aplicado" /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio/rechazado" element={<AccesoPanel><ResultadoCambio tipo="rechazado" /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio/cancelada" element={<AccesoPanel><ResultadoCambio tipo="cancelada" /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio/enviada" element={<AccesoPanel><ResultadoCambio tipo="enviada" /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones" element={<AccesoPanel><Inscripciones /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/inscribir" element={<AccesoPanel><InscribirPersona /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio" element={<AccesoPanel><InscritosActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/cupo-ajustado" element={<AccesoPanel><ResultadoInscripcion tipo="cupo" /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/:id" element={<AccesoPanel><FichaInscripcion /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/:id/inscrita" element={<AccesoPanel><ResultadoInscripcion tipo="inscrita" /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/:id/ofrecido" element={<AccesoPanel><ResultadoInscripcion tipo="ofrecido" /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/:id/cancelada" element={<AccesoPanel><ResultadoInscripcion tipo="cancelada" /></AccesoPanel>} />
        <Route path="/admin/actividades/asistencia" element={<AccesoPanel><Asistencia /></AccesoPanel>} />
        <Route path="/admin/actividades/asistencia/resumen" element={<AccesoPanel><ResumenAsistencia /></AccesoPanel>} />
        <Route path="/admin/actividades/asistencia/:folio" element={<AccesoPanel><PasarLista /></AccesoPanel>} />
        <Route path="/admin/actividades/asistencia/:folio/cerrada" element={<AccesoPanel><ListaCerrada /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias" element={<AccesoPanel><Evidencias /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/subir" element={<AccesoPanel><SubirEvidencia /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/:folio" element={<AccesoPanel><DetalleEvidencia /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/:folio/guardada" element={<AccesoPanel><ResultadoEvidencia tipo="guardada" /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/:folio/solicitado" element={<AccesoPanel><ResultadoEvidencia tipo="solicitado" /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/:folio/retirada" element={<AccesoPanel><ResultadoEvidencia tipo="retirada" /></AccesoPanel>} />
        {/* Panel · Participantes: Progreso y recompensas */}
        <Route path="/admin/participantes" element={<Navigate to="/admin/participantes/progreso" replace />} />
        <Route path="/admin/participantes/progreso" element={<AccesoPanel><Progreso /></AccesoPanel>} />
        <Route path="/admin/participantes/progreso/metas/:id" element={<AccesoPanel><FormularioMeta /></AccesoPanel>} />
        <Route path="/admin/participantes/progreso/metas/:id/guardada" element={<AccesoPanel><GuardadoProgreso tipo="meta" /></AccesoPanel>} />
        <Route path="/admin/participantes/progreso/recompensas/:id" element={<AccesoPanel><FormularioRecompensa /></AccesoPanel>} />
        <Route path="/admin/participantes/progreso/recompensas/:id/guardada" element={<AccesoPanel><GuardadoProgreso tipo="recompensa" /></AccesoPanel>} />
        <Route path="/admin/participantes/progreso/:folio" element={<AccesoPanel><FichaParticipante /></AccesoPanel>} />
        <Route path="/admin/participantes/progreso/:folio/entregada" element={<AccesoPanel><ResultadoParticipante tipo="entregada" /></AccesoPanel>} />
        <Route path="/admin/participantes/progreso/:folio/ajustado" element={<AccesoPanel><ResultadoParticipante tipo="ajustado" /></AccesoPanel>} />
        {/* Panel · Participantes: Cotejo de credenciales */}
        <Route path="/admin/participantes/cotejo" element={<AccesoPanel><Cotejo /></AccesoPanel>} />
        <Route path="/admin/participantes/cotejo/:folio" element={<AccesoPanel><DetalleCotejo /></AccesoPanel>} />
        <Route path="/admin/participantes/cotejo/:folio/correccion" element={<AccesoPanel><PedirCorreccion /></AccesoPanel>} />
        <Route path="/admin/participantes/cotejo/:folio/vinculada" element={<AccesoPanel><ResultadoCotejo tipo="vinculada" /></AccesoPanel>} />
        <Route path="/admin/participantes/cotejo/:folio/correccion-solicitada" element={<AccesoPanel><ResultadoCotejo tipo="correccion" /></AccesoPanel>} />
        <Route path="/admin/participantes/cotejo/:folio/aviso" element={<AccesoPanel><ResultadoCotejo tipo="aviso" /></AccesoPanel>} />
        <Route path="/admin/participantes/cotejo/:folio/rechazada" element={<AccesoPanel><ResultadoCotejo tipo="rechazada" /></AccesoPanel>} />
        {/* Panel · Participantes: Moderación del foro */}
        <Route path="/admin/participantes/foro/demostracion" element={<AccesoPanel><Foro /></AccesoPanel>} />
        <Route path="/admin/participantes/foro/demostracion/silenciadas/restaurada" element={<AccesoPanel><ParticipacionRestaurada /></AccesoPanel>} />
        <Route path="/admin/participantes/foro/demostracion/:folio" element={<AccesoPanel><DetallePublicacion /></AccesoPanel>} />
        <Route path="/admin/participantes/foro/demostracion/:folio/advertir" element={<AccesoPanel><AdvertirPersona /></AccesoPanel>} />
        <Route path="/admin/participantes/foro/demostracion/:folio/hilo" element={<AccesoPanel><HiloCompleto /></AccesoPanel>} />
        <Route path="/admin/participantes/foro/demostracion/:folio/retirada" element={<AccesoPanel><ResultadoForo tipo="retirada" /></AccesoPanel>} />
        <Route path="/admin/participantes/foro/demostracion/:folio/aprobada" element={<AccesoPanel><ResultadoForo tipo="aprobada" /></AccesoPanel>} />
        <Route path="/admin/participantes/foro/demostracion/:folio/advertencia" element={<AccesoPanel><ResultadoForo tipo="advertencia" /></AccesoPanel>} />
        <Route path="/admin/participantes/foro/demostracion/:folio/silenciada" element={<AccesoPanel><ResultadoForo tipo="silenciada" /></AccesoPanel>} />
        <Route path="/error" element={<ErrorServidor />} />
        <Route path="/sin-conexion" element={<SinConexion />} />
        <Route path="/mantenimiento" element={<Mantenimiento />} />
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
