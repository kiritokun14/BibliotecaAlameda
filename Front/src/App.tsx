import RetornoAuth from "./pages/RetornoAuth";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Inicio from "./pages/inicio/Inicio.tsx";
import Login from "./pages/Login.tsx";
import CuentaDeshabilitada from "./pages/CuentaDeshabilitada.tsx";
import SesionIniciada from "./pages/SesionIniciada.tsx";
import CrearCuenta from "./pages/CrearCuenta.tsx";
import CorreoRegistrado from "./pages/CorreoRegistrado.tsx";
import ConfirmarCorreo from "./pages/ConfirmarCorreo.tsx";
import ConfirmarEnlaceVencido from "./pages/ConfirmarEnlaceVencido.tsx";
import SolicitarEnlace from "./pages/recuperar/SolicitarEnlace.tsx";
import RevisaTuCorreo from "./pages/recuperar/RevisaTuCorreo.tsx";
import NuevaContrasena from "./pages/recuperar/NuevaContrasena.tsx";
import ContrasenaActualizada from "./pages/recuperar/ContrasenaActualizada.tsx";
import EnlaceVencido from "./pages/recuperar/EnlaceVencido.tsx";
import RecuperacionAsistida from "./pages/recuperar/RecuperacionAsistida.tsx";

import AltaAsistida from "./pages/personal/AltaAsistida";

import Credenciales from "./pages/admin/atencion/credenciales/Credenciales.tsx";
import DetalleCredencial from "./pages/admin/atencion/credenciales/DetalleCredencial.tsx";
import Espacios from "./pages/admin/atencion/espacios/Espacios.tsx";
import DetalleEspacio from "./pages/admin/atencion/espacios/DetalleEspacio.tsx";
import Propuestas from "./pages/admin/atencion/propuestas/Propuestas.tsx";
import DetallePropuesta from "./pages/admin/atencion/propuestas/DetallePropuesta.tsx";
import VistaPrevia from "./pages/admin/atencion/propuestas/VistaPrevia.tsx";
import AccesoPanel from "./pages/admin/AccesoPanel";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />

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

        {/* Cualquier dirección que no exista todavía (/contacto, /credencial...) regresa a Inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
