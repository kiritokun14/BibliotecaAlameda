import { describe, expect, it } from "vitest";
import {
    cuandoRelativo, diasDesde, errorObservaciones, estadoVisual, eventosDetalle, filtrarHistorial, nombreCompleto, notaObservaciones,
    notaRechazo, numerar, publicadosEnElMes, renglones, separarRechazo, textoAntiguedad, textoAutorizar, versionPublicada, ultimaPublicacion,
    MOTIVOS_RECHAZO,
} from "../src/pages/admin/revision/datos";

const ahora = new Date(2026, 10, 8, 12, 0);
const hace = (dias: number) => new Date(2026, 10, 8 - dias, 9, 30).toISOString();
const evento = (accion: string, fecha: string, extra: object = {}) => ({ accion, fecha, nota: null, observaciones: [], detalles: {}, responsable: "Ana López", ...extra });

describe("Revisión y publicación", () => {
    it("traduce los estados del backend a los de las pantallas", () => {
        expect(estadoVisual("en_revision")).toBe("por-autorizar");
        expect(estadoVisual("con_observaciones")).toBe("observaciones");
        expect(estadoVisual("aprobado")).toBe("publicado");
        expect(estadoVisual("archivado")).toBe("retirado");
    });

    it("cuenta días y escribe fechas relativas", () => {
        expect(diasDesde(hace(3), ahora)).toBe(3);
        expect(cuandoRelativo(hace(0), ahora)).toBe("Hoy");
        expect(cuandoRelativo(hace(1), ahora)).toBe("Ayer");
        expect(cuandoRelativo(hace(5), ahora)).toBe("Hace 5 días");
    });

    it("dice cuánto lleva el pendiente más antiguo", () => {
        expect(textoAntiguedad([], ahora)).toBe("No hay nada pendiente.");
        expect(textoAntiguedad([{ enviadoEn: hace(1) }], ahora)).toBe("El más antiguo lleva 1 día.");
        expect(textoAntiguedad([{ enviadoEn: hace(3) }, { enviadoEn: hace(0) }], ahora)).toBe("El más antiguo lleva 3 días.");
        expect(textoAntiguedad([{ enviadoEn: hace(0) }], ahora)).toBe("El más antiguo llegó hoy.");
    });

    it("cuenta solo los publicados de este mes", () => {
        const lista = [{ publicadoEn: hace(2) }, { publicadoEn: new Date(2026, 9, 30).toISOString() }, { publicadoEn: null }];
        expect(publicadosEnElMes(lista, ahora)).toBe(1);
    });

    it("toma quién autorizó y la versión del historial", () => {
        const c = { historial: [evento("envio", hace(9)), evento("publicacion", hace(8), { detalles: { referencia: "OF-1" } }), evento("publicacion", hace(2), { responsable: "Luis", detalles: { referencia: "OF-2" } })] };
        expect(ultimaPublicacion(c)?.responsable).toBe("Luis");
        expect(ultimaPublicacion(c)?.detalles.referencia).toBe("OF-2");
        expect(versionPublicada(c)).toBe(2);
        expect(versionPublicada({ historial: [] })).toBe(1);
    });

    it("filtra el historial por tipo, retirados y búsqueda, del más reciente al más antiguo", () => {
        const lista = [
            { folio: "CN-1", tipo: "noticia", estado: "publicado", titulo: "Visita guiada", publicadoEn: hace(5) },
            { folio: "CN-2", tipo: "resena", estado: "publicado", titulo: "Mitos del Nayar", publicadoEn: hace(1) },
            { folio: "CN-3", tipo: "noticia", estado: "retirado", titulo: "Horario de diciembre", publicadoEn: hace(3) },
        ];
        expect(filtrarHistorial(lista, "todos", "").map((c) => c.folio)).toEqual(["CN-2", "CN-3", "CN-1"]);
        expect(filtrarHistorial(lista, "noticia", "").map((c) => c.folio)).toEqual(["CN-3", "CN-1"]);
        expect(filtrarHistorial(lista, "retirado", "").map((c) => c.folio)).toEqual(["CN-3"]);
        expect(filtrarHistorial(lista, "todos", "MITOS").map((c) => c.folio)).toEqual(["CN-2"]);
        expect(filtrarHistorial(lista, "todos", "cn-1").map((c) => c.folio)).toEqual(["CN-1"]);
    });

    it("ordena el historial de decisiones con el más reciente primero e incluye la creación", () => {
        const eventos = eventosDetalle({ creadoEn: hace(4), historial: [evento("envio", hace(1))] });
        expect(eventos.map((e) => e.titulo)).toEqual(["Enviado a autorización", "Creado"]);
    });

    it("separa y numera las observaciones, y valida lo que acepta el backend", () => {
        expect(renglones("1. Corregir fecha\n\n2) Agregar fuente\nSin número")).toEqual(["Corregir fecha", "Agregar fuente", "Sin número"]);
        expect(numerar(["Uno", "Dos"])).toBe("1. Uno\n2. Dos");
        expect(errorObservaciones("   ")).toMatch(/al menos una/);
        expect(errorObservaciones("x".repeat(601))).toMatch(/Máximo 600/);
        expect(errorObservaciones(Array.from({ length: 21 }, (_, i) => `${i}`).join("\n"))).toMatch(/20/);
        expect(errorObservaciones("1. Revisar ortografía")).toBe("");
    });

    it("guarda la fecha límite y el motivo del rechazo en la nota, y los recupera", () => {
        expect(notaObservaciones("Sin fecha", "Sin fecha")).toBeUndefined();
        expect(notaObservaciones("En una semana", "Sin fecha")).toBe("Fecha límite sugerida: en una semana.");
        const nota = notaRechazo("Contenido duplicado", "  Ya existe la reseña CN-0022. ");
        expect(nota).toBe("Contenido duplicado. Ya existe la reseña CN-0022.");
        expect(separarRechazo(nota, MOTIVOS_RECHAZO)).toEqual({ motivo: "Contenido duplicado", explicacion: "Ya existe la reseña CN-0022." });
        expect(separarRechazo("Texto libre", MOTIVOS_RECHAZO)).toEqual({ motivo: "Texto libre", explicacion: "" });
    });

    it("nombra el contenido y el destino de la publicación", () => {
        expect(nombreCompleto({ tipo: "resena", titulo: "Cuentos de la Alameda" })).toBe("Reseña: Cuentos de la Alameda");
        expect(nombreCompleto({ tipo: "noticia", titulo: "Horario especial" })).toBe("Horario especial");
        expect(textoAutorizar("resena")).toBe("La reseña se publicará en Lecturas y reseñas y quedará registrada en la bitácora.");
        expect(textoAutorizar("acerca")).toBe("El texto de Acerca de se publicará en Acerca de la biblioteca y quedará registrado en la bitácora.");
    });
});
