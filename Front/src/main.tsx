// Punto de entrada: monta <App /> (todas las rutas) dentro de #root de index.html.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './Movimiento.css' // animaciones de todo el sistema (portal, acceso y panel)
import './Responsivo.css' // teléfono y tableta: ajustes de todo el sistema (después de las demás hojas por especificidad)
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
