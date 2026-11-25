import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorConteo, errorPeriodo, fechasParticipacion } from "../src/pages/admin/administracion/participacion";
import { consultarParticipacion, descargarParticipacion, guardarConteo } from "../src/servicios/estadisticas";

const autenticacion = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: autenticacion }) }));

const filtros = { desde: "2026-11-02", hasta: "2026-11-24", actividadId: "00000000-0000-4000-8000-000000000001" };
const peticiones = vi.fn();

beforeEach(() => {
    autenticacion.getSession.mockResolvedValue({ data: { session: { access_token: "token-privado-local" } } });
    peticiones.mockReset().mockImplementation(async (ruta: string) => ruta.endsWith("/configuracion")
        ? Response.json({ url: "https://ejemplo.supabase.co", clavePublicable: "sb_publishable_prueba" })
        : Response.json({}));
    vi.stubGlobal("fetch", peticiones);
});

describe("Estadísticas de participación", () => {
    it("calcula periodos inclusivos con la fecha de Tepic", () => {
        const ahora = new Date("2026-01-01T05:00:00Z");
        expect(fechasParticipacion("30dias", ahora)).toEqual({ desde: "2025-12-02", hasta: "2025-12-31" });
        expect(fechasParticipacion("mes", ahora)).toEqual({ desde: "2025-12-01", hasta: "2025-12-31" });
        expect(fechasParticipacion("anio", ahora)).toEqual({ desde: "2025-01-01", hasta: "2025-12-31" });
    });

    it("valida fechas y capturas sin confundir blanco con cero", () => {
        expect(errorPeriodo("", filtros.hasta)).toBeTruthy();
        expect(errorPeriodo(filtros.hasta, filtros.desde)).toBeTruthy();
        expect(errorPeriodo("2024-01-01", "2024-12-31")).toBe("");
        expect(errorPeriodo("2024-01-01", "2025-01-01")).toBeTruthy();
        expect(errorConteo("0", "Bitácora de entrada")).toBe("");
        expect(errorConteo("", "Bitácora de entrada")).toBeTruthy();
        expect(errorConteo("-1", "Bitácora de entrada")).toBeTruthy();
        expect(errorConteo("2147483648", "Bitácora de entrada")).toBeTruthy();
        expect(errorConteo("1", " ")).toBeTruthy();
        expect(errorConteo("1", "a".repeat(121))).toBeTruthy();
    });

    it("consulta y descarga en el servidor con las mismas fechas, ámbito y sesión", async () => {
        const ruta = "/api/administracion/estadisticas/participacion";
        const consulta = "?desde=2026-11-02&hasta=2026-11-24&actividad_id=" + filtros.actividadId;
        await consultarParticipacion(filtros);
        const opciones = expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-privado-local" }) });
        expect(peticiones).toHaveBeenCalledWith(ruta + consulta, opciones);
        const csv = "Fecha,Asistencia real,Visitas generales\n2026-11-24,1,42";
        peticiones.mockResolvedValueOnce(new Response(csv, { headers: { "Content-Type": "text/csv;charset=utf-8" } }));
        expect(await (await descargarParticipacion(filtros)).text()).toBe(csv);
        expect(peticiones).toHaveBeenLastCalledWith(ruta + ".csv" + consulta, opciones);
    });

    it("omite un ámbito vacío y mantiene el error de permisos al descargar", async () => {
        const causa = "Sin permiso en el ámbito solicitado.";
        await consultarParticipacion({ ...filtros, actividadId: "" });
        expect(peticiones.mock.lastCall?.[0]).toBe("/api/administracion/estadisticas/participacion?desde=2026-11-02&hasta=2026-11-24");
        peticiones.mockResolvedValueOnce(Response.json({ detail: causa }, { status: 403 }));
        await expect(descargarParticipacion(filtros)).rejects.toMatchObject({ estado: 403, message: causa });
    });

    it("conserva la versión de la captura para evitar sobrescribir otras ediciones", async () => {
        const actualizacion = { total: 0, referencia: "Registro de sala", version: "2026-11-22T00:00:00Z" };
        await guardarConteo("visitas-generales", "2026-11-22", actualizacion);
        expect(peticiones).toHaveBeenLastCalledWith("/api/administracion/estadisticas/visitas-generales/2026-11-22",
            expect.objectContaining({ method: "PUT", body: JSON.stringify(actualizacion) }));
        await guardarConteo("incidencias", filtros.actividadId, { ...actualizacion, version: null });
        expect(peticiones).toHaveBeenLastCalledWith("/api/administracion/estadisticas/incidencias/" + filtros.actividadId,
            expect.objectContaining({ method: "PUT", body: JSON.stringify({ ...actualizacion, version: null }) }));
    });
});
