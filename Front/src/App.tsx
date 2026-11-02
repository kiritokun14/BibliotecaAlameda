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
import MisContenidos from "./pages/admin/contenidos/MisContenidos.tsx";
import NuevoContenido from "./pages/admin/contenidos/NuevoContenido.tsx";
import EditarContenido from "./pages/admin/contenidos/EditarContenido.tsx";
import VistaPreviaContenido from "./pages/admin/contenidos/VistaPreviaContenido.tsx";
import EnviadoContenido from "./pages/admin/contenidos/EnviadoContenido.tsx";

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
