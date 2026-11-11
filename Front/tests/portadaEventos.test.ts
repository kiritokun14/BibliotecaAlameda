import { describe, expect, it } from "vitest";
import { eventosPortada, tipoPortada } from "../src/pages/publico/inicio/eventosPortada";
import type { ActividadPublica } from "../src/servicios/actividades";

const actividad = (folio: string, tipo: string, fecha: string, inicio: string, sesiones: ActividadPublica["sesiones"] = []): ActividadPublica => ({
    folio, slug: folio, estado: "publicada", actualizado: "", publicadaEl: null, sesiones,
    nombre: `Actividad ${folio}`, tipo, descripcion: "", fecha, inicio, fin: "12:00", espacio: "", cupo: "20",
    inscripcion: true, publico: "Todo público", responsable: "", materiales: "",
});

describe("Tarjeta de eventos de la portada de Inicio", () => {
    it("ordena de la más próxima a la más lejana y descarta las pasadas", () => {
        const lista = [
            actividad("A-2", "Taller", "2026-11-20", "10:00"),
            actividad("A-1", "Exposición", "2026-11-12", "11:00:00"),
            actividad("A-0", "Taller", "2026-11-01", "09:00"),
        ];
        const eventos = eventosPortada(lista, "2026-11-11");
        expect(eventos.map((e) => e.id)).toEqual(["A-1", "A-2"]);
        expect(eventos[0]).toMatchObject({ tipo: "Agenda cultural", cuando: "Jue 12 nov · 11:00 h" });
    });

    it("usa la próxima sesión cuando la actividad tiene varias", () => {
        const sesiones = [
            { id: "s1", fecha: "2026-11-05", inicio: "10:00", fin: "11:00", espacio: "", cupo: 10, estado: "", registroAbierto: true },
            { id: "s2", fecha: "2026-11-15", inicio: "17:30", fin: "19:00", espacio: "", cupo: 10, estado: "", registroAbierto: true },
        ];
        const [evento] = eventosPortada([actividad("A-3", "Lectura", "2026-11-05", "10:00", sesiones)], "2026-11-11");
        expect(evento).toMatchObject({ tipo: "Actividad", cuando: "Dom 15 nov · 17:30 h" });
    });

    it("clasifica igual que la sección Actividades", () => {
        expect(tipoPortada("Taller")).toBe("Taller");
        expect(tipoPortada("Presentación")).toBe("Agenda cultural");
        expect(tipoPortada("Conferencia")).toBe("Actividad");
    });
});
