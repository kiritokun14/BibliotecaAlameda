import RetornoAuth from "./pages/acceso/RetornoAuth";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Inicio from "./pages/publico/inicio/Inicio.tsx";
import Catalogo from "./pages/publico/catalogo/Catalogo.tsx";
import Acerca from "./pages/publico/acerca/Acerca.tsx";
import Servicios from "./pages/publico/servicios/Servicios.tsx";
import DetalleServicio from "./pages/publico/servicios/DetalleServicio.tsx";
import Contacto from "./pages/publico/contacto/Contacto.tsx";
import Noticias from "./pages/publico/noticias/Noticias.tsx";
import TodasNoticias from "./pages/publico/noticias/TodasNoticias.tsx";
import DetalleNoticia from "./pages/publico/noticias/DetalleNoticia.tsx";
import AbrirAsistente from "./pages/publico/asistente/AbrirAsistente.tsx";
import { ErrorServidor, Mantenimiento, NoEncontrada, SinConexion } from "./pages/publico/estados/Estados.tsx";
import Eventos from "./pages/publico/eventos/Eventos.tsx";
import Credencial from "./pages/publico/credencial/Credencial.tsx";
import EspaciosPublico from "./pages/publico/espacios/Espacios.tsx";
import Lecturas from "./pages/publico/lecturas/Lecturas.tsx";
import LecturasTema from "./pages/publico/lecturas/LecturasTema.tsx";
import MemoriaPublica from "./pages/publico/lecturas/MemoriaPublica.tsx";
import DetalleResena from "./pages/publico/lecturas/DetalleResena.tsx";
import DetalleMemoria from "./pages/publico/lecturas/DetalleMemoria.tsx";
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

import AltaAsistida from "./pages/personal/AltaAsistida";

import Credenciales from "./pages/admin/atencion/credenciales/Credenciales.tsx";
import DetalleCredencial from "./pages/admin/atencion/credenciales/DetalleCredencial.tsx";
import Espacios from "./pages/admin/atencion/espacios/Espacios.tsx";
import DetalleEspacio from "./pages/admin/atencion/espacios/DetalleEspacio.tsx";
import Propuestas from "./pages/admin/atencion/propuestas/Propuestas.tsx";
import DetallePropuesta from "./pages/admin/atencion/propuestas/DetallePropuesta.tsx";
import VistaPrevia from "./pages/admin/atencion/propuestas/VistaPrevia.tsx";
import AccesoPanel from "./pages/admin/AccesoPanel";
import Resumen from "./pages/admin/resumen/Resumen.tsx";
import Notificaciones from "./pages/admin/notificaciones/Notificaciones.tsx";
import MisContenidos from "./pages/admin/contenidos/MisContenidos.tsx";
import NuevoContenido from "./pages/admin/contenidos/NuevoContenido.tsx";
import EditarContenido from "./pages/admin/contenidos/EditarContenido.tsx";
import VistaPreviaContenido from "./pages/admin/contenidos/VistaPreviaContenido.tsx";
import EnviadoContenido from "./pages/admin/contenidos/EnviadoContenido.tsx";
import BandejaRevision from "./pages/admin/contenidos/BandejaRevision.tsx";
import RevisarContenido from "./pages/admin/contenidos/RevisarContenido.tsx";
import PedirCambios from "./pages/admin/contenidos/PedirCambios.tsx";
import RechazarContenido from "./pages/admin/contenidos/RechazarContenido.tsx";
import ResultadoRevision from "./pages/admin/contenidos/ResultadoRevision.tsx";
import HistorialPublicaciones from "./pages/admin/contenidos/HistorialPublicaciones.tsx";
import PropuestasActividades from "./pages/admin/actividades/Propuestas.tsx";
import { EditarActividad, NuevaActividad } from "./pages/admin/actividades/FormularioActividad.tsx";
import DetalleActividad from "./pages/admin/actividades/DetalleActividad.tsx";
import ActividadPublicada from "./pages/admin/actividades/ActividadPublicada.tsx";
import Calendario from "./pages/admin/actividades/Calendario.tsx";
import { EditarSala, FichaSala } from "./pages/admin/actividades/FichaSala.tsx";
import { BloqueoGuardado, EditarBloqueo, NuevoBloqueo } from "./pages/admin/actividades/FormularioBloqueo.tsx";
import Visitas from "./pages/admin/actividades/Visitas.tsx";
import { ConfirmarVisita, DetalleVisita, ProponerFecha, ResultadoVisita } from "./pages/admin/actividades/DetalleVisita.tsx";
import { FichaUso, RegistrarUso, UsoGuardado } from "./pages/admin/actividades/UsoEspacio.tsx";
import Cambios from "./pages/admin/actividades/Cambios.tsx";
import { CancelarActividad, DetalleCambio, Reprogramar, ResultadoCambio } from "./pages/admin/actividades/DetalleCambio.tsx";
import Inscripciones, { InscritosActividad } from "./pages/admin/actividades/Inscripciones.tsx";
import { FichaInscripcion, InscribirPersona, ResultadoInscripcion } from "./pages/admin/actividades/GestionInscripcion.tsx";
import Asistencia, { ListaCerrada, PasarLista, ResumenAsistencia } from "./pages/admin/actividades/Asistencia.tsx";
import Evidencias, { DetalleEvidencia, ResultadoEvidencia, SubirEvidencia } from "./pages/admin/actividades/Evidencias.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        {/* Páginas públicas: sin AccesoPanel, cualquiera las ve sin cuenta */}
        <Route path="/catalogo" element={<Catalogo />} />
        {/* /acerca abre Historia; cada pestaña tiene su dirección */}
        <Route path="/acerca" element={<Acerca />} />
        <Route path="/acerca/:seccion" element={<Acerca />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/servicios/:id" element={<DetalleServicio />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/noticias" element={<Noticias />} />
        <Route path="/noticias/todas" element={<TodasNoticias />} />
        <Route path="/noticias/:id" element={<DetalleNoticia />} />
        {/* El asistente es una ventana del botón flotante; /asistente la abre sobre Inicio */}
        <Route path="/asistente" element={<AbrirAsistente />} />
        {/* Eventos (visitante): /eventos/:id viene del carrusel de Inicio; /eventos sin elegir no muestra ninguna */}
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/eventos/:id" element={<Eventos />} />
        <Route path="/credencial" element={<Credencial />} />
        <Route path="/espacios" element={<EspaciosPublico />} />
        {/* Lecturas y reseñas (visitante): las rutas fijas ganan a /lecturas/:id */}
        <Route path="/lecturas" element={<Lecturas />} />
        <Route path="/lecturas/temas" element={<LecturasTema />} />
        <Route path="/lecturas/memoria" element={<MemoriaPublica />} />
        <Route path="/lecturas/memoria/:id" element={<DetalleMemoria />} />
        <Route path="/lecturas/:id" element={<DetalleResena />} />

        <Route path="/personal/alta-asistida" element={<AltaAsistida />} />
        <Route path="/auth/retorno" element={<RetornoAuth />} />
        <Route path="/iniciar-sesion" element={<Login />} />
        <Route path="/cuenta-deshabilitada" element={<CuentaDeshabilitada />} />
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

        {/* Panel de administración · Atención (por ahora solo estas tres secciones) */}
        <Route path="/admin" element={<AccesoPanel><Navigate to="/admin/atencion/credenciales" replace /></AccesoPanel>} />
        <Route path="/admin/resumen" element={<AccesoPanel><Resumen /></AccesoPanel>} />
        <Route path="/admin/notificaciones" element={<AccesoPanel><Notificaciones /></AccesoPanel>} />
        {/* key distinta para que al cambiar entre bandeja y "todas" se reinicien los filtros */}
        <Route path="/admin/atencion/credenciales" element={<AccesoPanel><Credenciales key="bandeja" vista="bandeja" /></AccesoPanel>} />
        <Route path="/admin/atencion/credenciales/todas" element={<AccesoPanel><Credenciales key="todas" vista="todas" /></AccesoPanel>} />
        <Route path="/admin/atencion/credenciales/:folio" element={<AccesoPanel><DetalleCredencial /></AccesoPanel>} />
        <Route path="/admin/atencion/espacios" element={<AccesoPanel><Espacios key="bandeja" vista="bandeja" /></AccesoPanel>} />
        <Route path="/admin/atencion/espacios/todas" element={<AccesoPanel><Espacios key="todas" vista="todas" /></AccesoPanel>} />
        <Route path="/admin/atencion/espacios/:folio" element={<AccesoPanel><DetalleEspacio /></AccesoPanel>} />
        <Route path="/admin/atencion/propuestas" element={<AccesoPanel><Propuestas key="bandeja" vista="bandeja" /></AccesoPanel>} />
        <Route path="/admin/atencion/propuestas/todas" element={<AccesoPanel><Propuestas key="todas" vista="todas" /></AccesoPanel>} />
        <Route path="/admin/atencion/propuestas/:folio" element={<AccesoPanel><DetallePropuesta /></AccesoPanel>} />
        <Route path="/admin/atencion/propuestas/:folio/publicar" element={<AccesoPanel><VistaPrevia /></AccesoPanel>} />

        {/* Panel · Contenidos (HU-12): Editor de contenidos */}
        <Route path="/admin/contenidos/editor" element={<AccesoPanel><MisContenidos /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/nuevo" element={<AccesoPanel><NuevoContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/:folio" element={<AccesoPanel><EditarContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/:folio/vista-previa" element={<AccesoPanel><VistaPreviaContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/editor/:folio/enviado" element={<AccesoPanel><EnviadoContenido /></AccesoPanel>} />
        {/* Panel · Contenidos (HU-12): Revisión y publicación */}
        <Route path="/admin/contenidos/revision" element={<AccesoPanel><BandejaRevision /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/historial" element={<AccesoPanel><HistorialPublicaciones /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio" element={<AccesoPanel><RevisarContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/vista-previa" element={<AccesoPanel><VistaPreviaContenido desde="revision" /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/cambios" element={<AccesoPanel><PedirCambios /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/rechazar" element={<AccesoPanel><RechazarContenido /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/publicado" element={<AccesoPanel><ResultadoRevision tipo="publicado" /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/observaciones-enviadas" element={<AccesoPanel><ResultadoRevision tipo="observaciones" /></AccesoPanel>} />
        <Route path="/admin/contenidos/revision/:folio/rechazado" element={<AccesoPanel><ResultadoRevision tipo="rechazado" /></AccesoPanel>} />
        {/* Panel · Actividades: Propuestas de actividades */}
        <Route path="/admin/actividades/propuestas" element={<AccesoPanel><PropuestasActividades /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/nueva" element={<AccesoPanel><NuevaActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/:folio" element={<AccesoPanel><DetalleActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/:folio/editar" element={<AccesoPanel><EditarActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/:folio/vista-previa" element={<AccesoPanel><DetalleActividad previa /></AccesoPanel>} />
        <Route path="/admin/actividades/propuestas/:folio/publicada" element={<AccesoPanel><ActividadPublicada /></AccesoPanel>} />
        {/* Panel · Actividades: Calendario y salas */}
        <Route path="/admin/actividades/calendario" element={<AccesoPanel><Calendario /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/bloquear" element={<AccesoPanel><NuevoBloqueo /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/bloqueos/:id/editar" element={<AccesoPanel><EditarBloqueo /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/bloqueos/:id/guardado" element={<AccesoPanel><BloqueoGuardado /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/salas/:sala" element={<AccesoPanel><FichaSala /></AccesoPanel>} />
        <Route path="/admin/actividades/calendario/salas/:sala/editar" element={<AccesoPanel><EditarSala /></AccesoPanel>} />
        {/* Panel · Actividades: Visitas y uso de espacios */}
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
        {/* Panel · Actividades: Cambios y cancelaciones */}
        <Route path="/admin/actividades/cambios" element={<AccesoPanel><Cambios /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/cancelar" element={<AccesoPanel><CancelarActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/reprogramar" element={<AccesoPanel><Reprogramar /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio" element={<AccesoPanel><DetalleCambio /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio/aplicado" element={<AccesoPanel><ResultadoCambio tipo="aplicado" /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio/rechazado" element={<AccesoPanel><ResultadoCambio tipo="rechazado" /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio/cancelada" element={<AccesoPanel><ResultadoCambio tipo="cancelada" /></AccesoPanel>} />
        <Route path="/admin/actividades/cambios/:folio/enviada" element={<AccesoPanel><ResultadoCambio tipo="enviada" /></AccesoPanel>} />
        {/* Panel · Actividades: Inscripciones y cupos */}
        <Route path="/admin/actividades/inscripciones" element={<AccesoPanel><Inscripciones /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/inscribir" element={<AccesoPanel><InscribirPersona /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio" element={<AccesoPanel><InscritosActividad /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/cupo-ajustado" element={<AccesoPanel><ResultadoInscripcion tipo="cupo" /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/:id" element={<AccesoPanel><FichaInscripcion /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/:id/inscrita" element={<AccesoPanel><ResultadoInscripcion tipo="inscrita" /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/:id/ofrecido" element={<AccesoPanel><ResultadoInscripcion tipo="ofrecido" /></AccesoPanel>} />
        <Route path="/admin/actividades/inscripciones/:folio/:id/cancelada" element={<AccesoPanel><ResultadoInscripcion tipo="cancelada" /></AccesoPanel>} />
        {/* Panel · Actividades: Asistencia */}
        <Route path="/admin/actividades/asistencia" element={<AccesoPanel><Asistencia /></AccesoPanel>} />
        <Route path="/admin/actividades/asistencia/resumen" element={<AccesoPanel><ResumenAsistencia /></AccesoPanel>} />
        <Route path="/admin/actividades/asistencia/:folio" element={<AccesoPanel><PasarLista /></AccesoPanel>} />
        <Route path="/admin/actividades/asistencia/:folio/cerrada" element={<AccesoPanel><ListaCerrada /></AccesoPanel>} />
        {/* Panel · Actividades: Evidencias privadas */}
        <Route path="/admin/actividades/evidencias" element={<AccesoPanel><Evidencias /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/subir" element={<AccesoPanel><SubirEvidencia /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/:folio" element={<AccesoPanel><DetalleEvidencia /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/:folio/guardada" element={<AccesoPanel><ResultadoEvidencia tipo="guardada" /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/:folio/solicitado" element={<AccesoPanel><ResultadoEvidencia tipo="solicitado" /></AccesoPanel>} />
        <Route path="/admin/actividades/evidencias/:folio/retirada" element={<AccesoPanel><ResultadoEvidencia tipo="retirada" /></AccesoPanel>} />

        {/* Estados del sistema: a donde se manda a la persona cuando algo falla */}
        <Route path="/error" element={<ErrorServidor />} />
        <Route path="/sin-conexion" element={<SinConexion />} />
        <Route path="/mantenimiento" element={<Mantenimiento />} />
        {/* Cualquier dirección que no existe muestra «No encontramos esa página» (404) */}
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
