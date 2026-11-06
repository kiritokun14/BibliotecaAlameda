import { useCallback, useEffect, useRef, useState } from "react";
import { consultarAsistente, enviarAlPersonal, type MensajeHistorial, type RespuestaAsistente } from "./servicio";

// Qué se le pidió al asistente; se guarda para poder reintentar si falla
export type Accion = { tipo: "pregunta"; texto: string } | { tipo: "personal" };

export type Mensaje =
    | { id: string; autor: "persona"; texto: string }
    | { id: string; autor: "asistente"; estado: "consultando"; accion: Accion }
    | { id: string; autor: "asistente"; estado: "listo"; respuesta: RespuestaAsistente }
    | { id: string; autor: "asistente"; estado: "error"; accion: Accion };

export const PREGUNTAS_SUGERIDAS = ["¿Cuál es el horario?", "¿Cómo tramito mi credencial?", "¿Qué actividades hay?"];
export const TEXTO_HABLAR_CON_PERSONAL = "Quiero hablar con el personal.";
export const LIMITE_PREGUNTA = 500;

// La conversación se guarda en esta pestaña (sessionStorage): sobrevive al cambiar de página
// o al minimizar, y se borra al cerrar la pestaña. No se guarda nada en el servidor desde aquí.
const CLAVE = "biblioteca-asistente-conversacion";

let contador = 0;
const nuevoId = () => `${Date.now().toString(36)}-${(contador++).toString(36)}`;

// Si la página se recargó a mitad de una consulta, esa consulta se muestra como error con "Reintentar"
export function restaurar(guardado: unknown): Mensaje[] {
    if (!Array.isArray(guardado)) return [];
    return guardado
        .filter((m): m is Mensaje => typeof m === "object" && m !== null && "id" in m && "autor" in m)
        .map((m) => (m.autor === "asistente" && m.estado === "consultando" ? { ...m, estado: "error" as const } : m));
}

function leer(): Mensaje[] {
    try {
        return restaurar(JSON.parse(sessionStorage.getItem(CLAVE) ?? "[]"));
    } catch {
        return [];
    }
}

// Texto plano de la conversación para que el backend entienda preguntas de seguimiento
export function aHistorial(mensajes: Mensaje[]): MensajeHistorial[] {
    return mensajes.flatMap((m): MensajeHistorial[] => {
        if (m.autor === "persona") return [{ autor: "persona", texto: m.texto }];
        if (m.estado === "listo" && m.respuesta.tipo === "respuesta") {
            return [{ autor: "asistente", texto: [...m.respuesta.parrafos, m.respuesta.cierre ?? ""].join(" ").trim() }];
        }
        return [];
    });
}

export function useConversacion() {
    const [mensajes, setMensajes] = useState<Mensaje[]>(leer);
    const montado = useRef(true);

    useEffect(() => {
        montado.current = true;
        return () => { montado.current = false; };
    }, []);

    useEffect(() => {
        try {
            if (mensajes.length) sessionStorage.setItem(CLAVE, JSON.stringify(mensajes));
            else sessionStorage.removeItem(CLAVE);
        } catch { /* sin almacenamiento: la conversación vive solo en esta página */ }
    }, [mensajes]);

    const ocupado = mensajes.some((m) => m.autor === "asistente" && m.estado === "consultando");

    // Pone el mensaje "consultando…" y lo reemplaza por la respuesta o por el error
    const ejecutar = useCallback(async (accion: Accion, previos: Mensaje[], idEspera: string) => {
        const historial = aHistorial(previos);
        try {
            const respuesta: RespuestaAsistente = accion.tipo === "pregunta"
                ? await consultarAsistente(accion.texto, historial)
                : { tipo: "enviada", ...(await enviarAlPersonal(historial)) };
            if (!montado.current) return;
            setMensajes((actuales) => actuales.map((m) => (m.id === idEspera ? { id: m.id, autor: "asistente", estado: "listo", respuesta } : m)));
        } catch {
            if (!montado.current) return;
            setMensajes((actuales) => actuales.map((m) => (m.id === idEspera ? { id: m.id, autor: "asistente", estado: "error", accion } : m)));
        }
    }, []);

    const pedir = useCallback((accion: Accion, textoPersona: string) => {
        if (ocupado) return;
        const persona: Mensaje = { id: nuevoId(), autor: "persona", texto: textoPersona };
        const espera: Mensaje = { id: nuevoId(), autor: "asistente", estado: "consultando", accion };
        const previos = [...mensajes, persona];
        setMensajes([...previos, espera]);
        void ejecutar(accion, previos, espera.id);
    }, [ejecutar, mensajes, ocupado]);

    const preguntar = useCallback((texto: string) => {
        const limpio = texto.trim().slice(0, LIMITE_PREGUNTA);
        if (limpio) pedir({ tipo: "pregunta", texto: limpio }, limpio);
    }, [pedir]);

    const hablarConPersonal = useCallback(() => pedir({ tipo: "personal" }, TEXTO_HABLAR_CON_PERSONAL), [pedir]);

    // El error se vuelve a intentar en el mismo lugar de la conversación
    const reintentar = useCallback((id: string) => {
        if (ocupado) return;
        const indice = mensajes.findIndex((m) => m.id === id);
        const mensaje = mensajes[indice];
        if (!mensaje || mensaje.autor !== "asistente" || mensaje.estado !== "error") return;
        setMensajes(mensajes.map((m) => (m.id === id ? { ...mensaje, estado: "consultando" } : m)));
        void ejecutar(mensaje.accion, mensajes.slice(0, indice), id);
    }, [ejecutar, mensajes, ocupado]);

    const nuevaConsulta = useCallback(() => setMensajes([]), []);

    // Última pregunta escrita, para "Reformular mi pregunta"
    const ultimaPregunta = [...mensajes].reverse().find((m) => m.autor === "persona" && m.texto !== TEXTO_HABLAR_CON_PERSONAL);

    return {
        mensajes,
        ocupado,
        preguntar,
        hablarConPersonal,
        reintentar,
        nuevaConsulta,
        ultimaPregunta: ultimaPregunta?.autor === "persona" ? ultimaPregunta.texto : "",
    };
}

export type Conversacion = ReturnType<typeof useConversacion>;
