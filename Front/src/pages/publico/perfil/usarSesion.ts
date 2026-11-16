import { useEffect, useState } from "react";
import { ErrorServicio, mensajeError, obtenerSupabase } from "../../../servicios/api";
import { consultarPerfil, type PerfilPropio } from "../../../servicios/perfil";
import { perfilSimulado } from "./datos";
import { simulacion } from "../../../servicios/simulacion";

// ¿Hay sesión iniciada? undefined = todavía no se sabe; null = visitante; texto = id de la persona.
// En desarrollo, ?simular=sesion (o sesion-menor) finge una sesión para revisar pantallas sin backend.
const modo = typeof window === "undefined" ? null : simulacion(); // en pruebas no hay navegador
export const sesionSimulada = modo === "sesion" || modo === "sesion-menor";
export const menorSimulado = modo === "sesion-menor";

export function useSesion(): string | null | undefined {
    const [usuario, setUsuario] = useState<string | null | undefined>(sesionSimulada ? "simulado" : undefined);
    useEffect(() => {
        if (sesionSimulada) return;
        let vigente = true;
        let cancelar: (() => void) | undefined;
        obtenerSupabase().then((cliente) => {
            if (!vigente) return;
            const { data } = cliente.auth.onAuthStateChange((_evento, sesion) => setUsuario(sesion?.user.id ?? null));
            cancelar = () => data.subscription.unsubscribe();
        }).catch(() => { if (vigente) setUsuario(null); });
        return () => { vigente = false; cancelar?.(); };
    }, []);
    return usuario;
}

// Perfil de la persona con sesión (GET /perfil). En modo simulado usa datos de ejemplo.
export type CargaPerfil = { perfil: PerfilPropio } | { error: string; ingresar: boolean } | null;
export function usePerfil(usuario: string | null | undefined, intento = 0): CargaPerfil {
    const [carga, setCarga] = useState<{ usuario: string; intento: number; valor: Exclude<CargaPerfil, null> } | null>(
        sesionSimulada ? { usuario: "simulado", intento, valor: { perfil: perfilSimulado(menorSimulado) } } : null);
    useEffect(() => {
        if (!usuario || sesionSimulada) return;
        let vigente = true;
        consultarPerfil()
            .then((perfil) => { if (vigente) setCarga({ usuario, intento, valor: { perfil } }); })
            .catch((e) => { if (vigente) setCarga({ usuario, intento, valor: { error: mensajeError(e), ingresar: e instanceof ErrorServicio && e.estado === 401 } }); });
        return () => { vigente = false; };
    }, [usuario, intento]);
    if (!carga || carga.usuario !== usuario || (!sesionSimulada && carga.intento !== intento)) return null;
    return carga.valor;
}
