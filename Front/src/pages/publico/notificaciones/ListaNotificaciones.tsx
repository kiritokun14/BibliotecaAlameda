// Notificaciones de la persona (rediseño del 22 nov 2026, Aldahir): UNA sola lista «Notificaciones» con todo lo que le
// llega (centro de notificaciones de datos.ts + avisos de sesiones + cambios y cancelaciones de HU-17), con las piezas de
// las listas del perfil (ListaPerfil): buscador + «Filtros» (área y lectura), filas con bloque de fecha o ícono del área,
// y la tarjeta llena el alto de la columna derecha («Cómo te avisamos» + «Tus trámites»); las filas se recorren dentro.
// «Ver» abre el texto completo con su acción, «Marcar como leída» y, en las del centro, «Eliminar».
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ErrorServicio, mensajeError, obtenerSupabase, pedirApi } from "../../../servicios/api";
import { consultarAvisosCambios, leerAvisoCambio, type AvisoCambioActividad } from "../../../servicios/cambiosActividad";
import type { NombreIcono } from "../../admin/piezasPanel";
import { FilaPerfil, ListaPerfil } from "../perfil/ListaPerfil";
import { coincide, diaMes } from "../perfil/utilesLista";
import { nombreArea, notificaciones, useNotificaciones, type Area } from "./datos";
import { enFiltros, marcable, unirNotificaciones, type AvisoSesion, type FiltroArea, type FiltroLectura, type ItemNotificacion } from "./avisosCambios";

const POR_PAGINA = 20; // las dos fuentes del servidor entregan de 20 en 20
const FECHA = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mazatlan", dateStyle: "long", timeStyle: "short" });
const FECHA_CORTA = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mazatlan", day: "numeric", month: "short" });
const ICONO: Record<Area, NombreIcono> = { propuesta: "propuesta", espacios: "espacios", credencial: "credencial", actividades: "calendario", avisos: "aviso" };
const AREAS: Area[] = ["actividades", "credencial", "propuesta", "espacios", "avisos"];

async function avisosDeSesiones(pagina: number) {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio("Inicia sesión para ver tus avisos.", 401);
    return pedirApi<AvisoSesion[]>(`/notificaciones/actividades?pagina=${pagina}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
}

type Carga = { clave: string; sesiones?: AvisoSesion[]; cambios?: AvisoCambioActividad[]; hayMas?: boolean; parcial?: boolean; error?: string };

// Estado de la fila: color y texto del chip
function estadoDe(n: ItemNotificacion): { tono: "dorado" | "guinda" | "gris" | "verde"; texto: string } {
    if (n.leida === true) return { tono: "gris", texto: "Leída" };
    if (n.tipo === "cancelacion") return { tono: "guinda", texto: n.leida === false ? "Cancelación · sin leer" : "Cancelación" };
    if (n.tipo === "cambio") return { tono: "dorado", texto: n.leida === false ? "Cambio · sin leer" : "Cambio" };
    return { tono: "dorado", texto: "Sin leer" };
}

export default function ListaNotificaciones({ usuario, alEliminarLeidas }: { usuario: string; alEliminarLeidas: () => void }) {
    const navegar = useNavigate();
    const centro = useNotificaciones();
    const simulada = usuario === "simulado"; // ?simular=sesion: solo los ejemplos del centro
    const [pagina, setPagina] = useState(0);
    const [intento, setIntento] = useState(0);
    const [carga, setCarga] = useState<Carga>({ clave: "" });
    const [texto, setTexto] = useState("");
    const [area, setArea] = useState<FiltroArea>("todas");
    const [lectura, setLectura] = useState<FiltroLectura>("todas");
    const [abierta, setAbierta] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);
    const [anuncio, setAnuncio] = useState("");
    const clave = `${usuario}:${pagina}:${intento}`;
    const actual = simulada ? { clave, sesiones: [], cambios: [] } : carga.clave === clave ? carga : undefined;

    useEffect(() => {
        if (simulada) return;
        let vigente = true;
        // Las dos fuentes del servidor a la vez; si solo una responde, se muestra lo que llegó y se avisa abajo
        Promise.allSettled([avisosDeSesiones(pagina), consultarAvisosCambios(pagina * POR_PAGINA)]).then(([sesiones, cambios]) => {
            if (!vigente) return;
            if (sesiones.status === "rejected" && cambios.status === "rejected") { setCarga({ clave, error: mensajeError(cambios.reason) }); return; }
            const deSesiones = sesiones.status === "fulfilled" ? sesiones.value : [];
            const deCambios = cambios.status === "fulfilled" ? cambios.value : { total: 0, avisos: [] };
            setCarga({
                clave, sesiones: deSesiones.slice(0, POR_PAGINA), cambios: deCambios.avisos,
                hayMas: deSesiones.length > POR_PAGINA || deCambios.total > (pagina + 1) * POR_PAGINA,
                parcial: sesiones.status === "rejected" || cambios.status === "rejected",
            });
        });
        return () => { vigente = false; };
    }, [clave, pagina, simulada]);

    // Marca como leídos en el servidor los avisos de HU-17 y en la pestaña los del centro
    async function marcar(lista: ItemNotificacion[]) {
        const delServidor = lista.filter((n) => n.origen === "cambio");
        lista.filter((n) => n.origen === "centro").forEach((n) => notificaciones.marcarLeida(n.id));
        if (!delServidor.length) return;
        setOcupado(true);
        try {
            await Promise.all(delServidor.map((n) => leerAvisoCambio(n.id)));
            const ids = new Set(delServidor.map((n) => n.id));
            setCarga((c) => ({ ...c, cambios: c.cambios?.map((a) => (ids.has(a.id) ? { ...a, leida: true } : a)) }));
        } catch (e) { setAnuncio(mensajeError(e)); }
        finally { setOcupado(false); }
    }

    const todas = actual && !actual.error ? unirNotificaciones(centro, actual.sesiones ?? [], actual.cambios ?? []) : [];
    const filtradas = todas.filter((n) => enFiltros(n, area, lectura) && coincide(texto, n.titulo, n.texto, nombreArea[n.area]));
    const cuenta = (a: FiltroArea, l: FiltroLectura) => todas.filter((n) => enFiltros(n, a, l)).length;
    const porMarcar = todas.filter(marcable);
    const hayLeidasDelCentro = centro.some((n) => n.leida);
    const irA = (p: number) => { setAbierta(null); setPagina(p); };

    return (
        <ListaPerfil icono="mensajes" titulo="Notificaciones" llenar
            texto="Tus solicitudes, tus inscripciones, los cambios de tus actividades y los avisos de la biblioteca"
            accion={todas.length > 0 && <>
                <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={!porMarcar.length || ocupado}
                    onClick={() => { void marcar(porMarcar); setAnuncio("Marcaste todas como leídas."); }}>Marcar todas como leídas</button>
                {hayLeidasDelCentro && <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico pz-boton--guinda" onClick={alEliminarLeidas}>Eliminar las leídas</button>}
            </>}
            buscar={{ etiqueta: "Buscar una notificación", placeholder: "Título, texto o área", valor: texto, alCambiar: setTexto }}
            filtros={[
                { titulo: "Área", valor: area, alCambiar: (v) => setArea(v as FiltroArea), opciones: [
                    { valor: "todas", texto: "Todas", cantidad: cuenta("todas", lectura) },
                    ...AREAS.filter((a) => cuenta(a, "todas") > 0).map((a) => ({ valor: a, texto: nombreArea[a], cantidad: cuenta(a, lectura) })),
                ] },
                { titulo: "Lectura", valor: lectura, alCambiar: (v) => setLectura(v as FiltroLectura), opciones: [
                    { valor: "todas", texto: "Todas", cantidad: cuenta(area, "todas") },
                    { valor: "sin-leer", texto: "Sin leer", cantidad: cuenta(area, "sin-leer") },
                    { valor: "leidas", texto: "Leídas", cantidad: cuenta(area, "leidas") },
                ] },
            ]}
            activos={(area === "todas" ? 0 : 1) + (lectura === "todas" ? 0 : 1)} alQuitar={() => { setArea("todas"); setLectura("todas"); }}
            estado={!actual ? "cargando" : actual.error ? "error" : "listo"} error={actual?.error} alReintentar={() => setIntento((x) => x + 1)}
            hayElementos={todas.length > 0} sinResultados={filtradas.length === 0}
            vacio={{ titulo: pagina === 0 ? "Estás al día" : "No hay más notificaciones", texto: "Cuando haya cambios en tus solicitudes, tus inscripciones o tus actividades, o un aviso de la biblioteca, aparecerá aquí." }}
            despues={<>
                <p className="pl-anuncio" role="status">{anuncio}</p>
                {actual?.parcial && <p className="pl-nota" role="alert">Algunas notificaciones no se pudieron cargar; inténtalo de nuevo en un momento.</p>}
            </>}
            pie={(pagina > 0 || actual?.hayMas) && <>
                <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={pagina === 0} onClick={() => irA(pagina - 1)}>Más recientes</button>
                <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={!actual?.hayMas} onClick={() => irA(pagina + 1)}>Más antiguas</button>
            </>}>
            {filtradas.map((n) => {
                const estado = estadoDe(n);
                const ver = abierta === n.id;
                const cuando = n.fecha ? FECHA_CORTA.format(new Date(n.fecha)).replace(".", "") : n.cuando;
                return (
                    <FilaPerfil key={`${n.origen}-${n.id}`} fecha={n.fecha ? diaMes(n.fecha) : null} icono={ICONO[n.area]} tono={estado.tono}
                        titulo={n.titulo} estado={estado.texto} apagada={n.leida === true}
                        detalle={<><span className="pz-fila__folio">{nombreArea[n.area]}</span>{cuando && <span>{cuando}</span>}<span>{n.texto}</span></>}
                        acciones={<button type="button" className={`pz-boton pz-boton--chico${ver || n.leida !== false ? " pz-boton--contorno" : ""}`} aria-expanded={ver}
                            onClick={() => setAbierta(ver ? null : n.id)}>{ver ? "Cerrar" : "Ver"}</button>}
                        panel={ver && (
                            <div className="pl-aviso">
                                <p className="pl-aviso__texto">{n.texto}</p>
                                <p className="pl-aviso__fecha">{nombreArea[n.area]} · {n.fecha ? <><time dateTime={n.fecha}>{FECHA.format(new Date(n.fecha))}</time> · hora de Tepic</> : n.cuando}</p>
                                <div className="pl-aviso__acciones">
                                    {n.accion && (
                                        <button type="button" className="pz-boton pz-boton--chico" onClick={() => { if (marcable(n)) void marcar([n]); navegar(n.accion!.ruta); }}>{n.accion.texto}</button>
                                    )}
                                    {marcable(n) && (
                                        <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={ocupado} onClick={() => void marcar([n])}>Marcar como leída</button>
                                    )}
                                    {n.origen === "centro" && (
                                        <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico pz-boton--guinda"
                                            onClick={() => { notificaciones.quitar(n.id); setAbierta(null); setAnuncio("Notificación eliminada."); }}>Eliminar</button>
                                    )}
                                </div>
                            </div>
                        )} />
                );
            })}
        </ListaPerfil>
    );
}
