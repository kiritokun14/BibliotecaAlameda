// Iniciar y cerrar sesión con animación (22 nov 2026). Todo inicio o cierre de sesión nuevo usa estas funciones.
// Pasos: 1) aparece el velo mientras se trabaja (al menos 0.7–0.9 s, para que se lea); 2) palomita y mensaje final
// (0.75–0.9 s); 3) se va a la página de destino y el velo se desvanece encima (0.45 s).
// Si algo falla, el velo se quita al instante y el error sigue a quien llamó. Con «reducir movimiento», tiempos cortos.
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import TransicionSesion, { type FaseTransicion, type TipoTransicion } from "./TransicionSesion";

type Tema = "portal" | "panel";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reducido = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let activo = false; // una sola transición a la vez

function velo(tipo: TipoTransicion, temaInicial: Tema) {
    const caja = document.createElement("div");
    document.body.appendChild(caja);
    const raiz: Root = createRoot(caja);
    let tema = temaInicial;
    let detalle: string | undefined;
    const pintar = (fase: FaseTransicion) => raiz.render(createElement(TransicionSesion, { tipo, tema, fase, detalle }));
    return {
        pintar,
        cambiar: (nuevo: { tema?: Tema; detalle?: string }) => { tema = nuevo.tema ?? tema; detalle = nuevo.detalle ?? detalle; },
        quitar: () => { raiz.unmount(); caja.remove(); activo = false; },
    };
}

async function terminar(v: ReturnType<typeof velo>, ir: () => void, corto: boolean, pausa: number) {
    v.pintar("listo");
    await espera(corto ? 300 : pausa);
    ir();
    window.scrollTo(0, 0);
    v.pintar("saliendo");
    await espera(corto ? 150 : 450);
    v.quitar();
}

// Cerrar sesión: «Cerrando tu sesión…» → «Hasta pronto» → destino (Inicio o Iniciar sesión)
export async function salirConAnimacion({ tema, cerrar, ir }: { tema: Tema; cerrar: () => Promise<unknown>; ir: () => void }) {
    if (activo) return;
    activo = true;
    const corto = reducido();
    const v = velo("salida", tema);
    v.pintar("trabajando");
    try { await Promise.all([cerrar(), espera(corto ? 300 : 900)]); }
    catch (error) { v.quitar(); throw error; }
    await terminar(v, ir, corto, 750);
}

// Iniciar sesión (ya aceptada): «Iniciando tu sesión…» mientras se decide a dónde va → «Te damos la bienvenida» →
// panel (el fondo pasa a guinda) o inicio del portal. `preparar` devuelve el destino y si es el panel.
export async function entrarConAnimacion({ preparar, ir }: {
    preparar: () => Promise<{ ruta: string; panel: boolean }>; ir: (ruta: string) => void;
}) {
    if (activo) return;
    activo = true;
    const corto = reducido();
    const v = velo("entrada", "portal");
    v.pintar("trabajando");
    let destino: { ruta: string; panel: boolean };
    try { [destino] = await Promise.all([preparar(), espera(corto ? 300 : 800)]); }
    catch (error) { v.quitar(); throw error; }
    v.cambiar({ tema: destino.panel ? "panel" : "portal", detalle: destino.panel ? "Te llevamos al panel de administración." : "Te llevamos al inicio de la biblioteca." });
    await terminar(v, () => ir(destino.ruta), corto, 900);
}
