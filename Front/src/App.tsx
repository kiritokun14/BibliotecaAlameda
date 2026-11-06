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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />

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

        {/* Cualquier dirección que no exista todavía (/contacto, /credencial...) regresa a Inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
