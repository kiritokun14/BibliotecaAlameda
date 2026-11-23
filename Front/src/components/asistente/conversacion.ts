import { useCallback, useEffect, useRef, useState } from "react";
import { consultarAsistente, type MensajeHistorial, type RespuestaAsistente } from "./servicio";

// Qué se le pidió al asistente; se guarda para poder reintentar si falla
export type Accion = { tipo: "pregunta"; texto: string };

export type Mensaje =
    | { id: string; autor: "persona"; texto: string }
    | { id: string; autor: "asistente"; estado: "consultando"; accion: Accion }
    | { id: string; autor: "asistente"; estado: "listo"; respuesta: RespuestaAsistente }
    | { id: string; autor: "asistente"; estado: "error"; accion: Accion };

export const PREGUNTAS_SUGERIDAS = ["¿Cuál es el horario?", "¿Cómo tramito mi credencial?", "¿Qué actividades hay?"];
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
        .filter((m) => {
            if (m.autor === "persona") return typeof m.texto === "string";
            if (m.estado === "listo") return m.respuesta && (m.respuesta.tipo !== "enviada" || Boolean(m.respuesta.folio));
            return m.accion?.tipo === "pregunta";
        })
        .map((m) => (m.autor === "asistente" && m.estado === "consultando" ? { ...m, estado: "error" as const } : m));
}

function leer(): Mensaje[] {
    try {
        return restaurar(JSON.parse(sessionStorage.getItem(CLAVE) ?? "[]"));
    } catch {
        return [];
    }
}

// Solo las preguntas de orientación aportan contexto al seguimiento.
export function aHistorial(mensajes: Mensaje[]): MensajeHistorial[] {
    return mensajes.flatMap((m, i): MensajeHistorial[] => {
        if (m.autor !== "persona") return [];
        const respuesta = mensajes[i + 1];
        if (respuesta?.autor === "asistente" && respuesta.estado === "listo" && respuesta.respuesta.tipo === "privada") return [];
        return [{ autor: "persona", texto: m.texto }];
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
            const respuesta = await consultarAsistente(accion.texto, historial);
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
        void ejecutar(accion, mensajes, espera.id);
    }, [ejecutar, mensajes, ocupado]);

    const preguntar = useCallback((texto: string) => {
        const limpio = texto.trim().slice(0, LIMITE_PREGUNTA);
        if (limpio) pedir({ tipo: "pregunta", texto: limpio }, limpio);
    }, [pedir]);

    // El error se vuelve a intentar en el mismo lugar de la conversación
    const reintentar = useCallback((id: string) => {
        if (ocupado) return;
        const indice = mensajes.findIndex((m) => m.id === id);
        const mensaje = mensajes[indice];
        if (!mensaje || mensaje.autor !== "asistente" || mensaje.estado !== "error") return;
        setMensajes(mensajes.map((m) => (m.id === id ? { ...mensaje, estado: "consultando" } : m)));
        void ejecutar(mensaje.accion, mensajes.slice(0, Math.max(0, indice - 1)), id);
    }, [ejecutar, mensajes, ocupado]);

    const nuevaConsulta = useCallback(() => setMensajes([]), []);

    // Última pregunta escrita, para "Reformular mi pregunta"
    const ultimaPregunta = [...mensajes].reverse().find((m) => m.autor === "persona");

    return {
        mensajes,
        ocupado,
        preguntar,
        reintentar,
        nuevaConsulta,
        ultimaPregunta: ultimaPregunta?.autor === "persona" ? ultimaPregunta.texto : "",
    };
}

export type Conversacion = ReturnType<typeof useConversacion>;
