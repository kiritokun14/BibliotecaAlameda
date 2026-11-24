// Límite de mensajes de contacto (Aldahir, 18 nov 2026): solo con sesión y hasta 3 mensajes EN PROCESO a la vez
// (registrados o en revisión). Cuando el personal atiende uno, se libera un lugar. Así no se llena la base.
// El backend debe hacer cumplir la regla (PARA_BACKEND.md, «Límite de mensajes»); aquí solo se avisa antes de escribir.
// TODO backend: cuando exista GET /v1/me/contacto, el conteo sale de `conteos.abiertos` y no de los folios del navegador.
import { useCallback, useEffect, useState } from "react";
import { consultarContacto } from "../../../servicios/atencionComunidad";
import { foliosDe } from "../perfil/mensajesGuardados";
import { limiteSimulado, sesionSimulada } from "../perfil/usarSesion";

export const LIMITE_EN_PROCESO = 3;

// Cuenta los que siguen en proceso (todo lo que no está «cerrado»)
export function contarEnProceso(estados: string[]): number {
    return estados.filter((estado) => estado !== "cerrado").length;
}

// Cuántos puede enviar todavía (nunca negativo)
export function lugaresLibres(enProceso: number, limite = LIMITE_EN_PROCESO): number {
    return Math.max(0, limite - enProceso);
}

// Mensajes en proceso de la cuenta: undefined mientras se consulta.
// Devuelve también `sumar` para contar uno recién enviado sin volver a consultar.
export function useMensajesEnProceso(cuenta: string | null | undefined): [number | undefined, () => void, (n: number) => void] {
    const simulado = sesionSimulada ? (limiteSimulado ? LIMITE_EN_PROCESO : 2) : undefined;
    const [enProceso, setEnProceso] = useState<{ cuenta: string; n: number } | null>(null);

    useEffect(() => {
        if (sesionSimulada || !cuenta) return;
        let vigente = true;
        Promise.all(foliosDe(cuenta).map((folio) => consultarContacto(folio).then((s) => s.estadoAtencion).catch(() => "cerrado")))
            .then((estados) => { if (vigente) setEnProceso({ cuenta, n: contarEnProceso(estados) }); });
        return () => { vigente = false; };
    }, [cuenta]);

    const sumar = useCallback(() => {
        if (cuenta) setEnProceso((actual) => ({ cuenta, n: (actual?.cuenta === cuenta ? actual.n : 0) + 1 }));
    }, [cuenta]);
    const fijar = useCallback((n: number) => { if (cuenta) setEnProceso({ cuenta, n }); }, [cuenta]);

    if (!cuenta) return [undefined, sumar, fijar];
    if (enProceso?.cuenta === cuenta) return [enProceso.n, sumar, fijar];
    return [simulado, sumar, fijar];
}
