// Participantes › Cotejo de credenciales (rediseño del perfil de Préstamos, 22 nov 2026, T3): misma plantilla que
// Administración (lista | lateral del mismo alto) con las piezas del panel. Datos simulados de cotejos.ts (TODO backend ahí).
import { useId, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import { Aviso, Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, Paginas, Plegable, Tarjeta, Vacio } from "../piezasPanel";
import { fechaCorta } from "../actividades/datos";
import { enFiltroCotejo, iconoResultado, TONO_ESTADO_COTEJO, NOMBRE_ESTADO_COTEJO, resultadoDe, sistemaDisponible, textoResultado, useCotejos, type Cotejo as TipoCotejo, type FiltroCotejo, type Resultado } from "./cotejos";
import { BASE_COTEJO } from "./utiles";

const POR_PAGINA = 8;

const FILTROS: { valor: FiltroCotejo; texto: string }[] = [
    { valor: "pendientes", texto: "Pendientes" }, { valor: "diferencias", texto: "Con diferencias" }, { valor: "vencidas", texto: "Vencidas" }, { valor: "resueltos", texto: "Resueltos" },
];
const RESULTADOS: { valor: Resultado; texto: string }[] = [
    { valor: "coincide", texto: "Coincide" }, { valor: "diferencias", texto: "Con diferencias" }, { valor: "vencida", texto: "Credencial vencida" },
    { valor: "sin-coincidencia", texto: "Sin coincidencia" }, { valor: "ya-vinculada", texto: "Ya vinculada" },
];
// El resultado solo se calcula en los pendientes; los resueltos ya tienen su estado final
const tieneResultado = (c: TipoCotejo, r: Resultado | "todos") => r === "todos" || (c.estado === "pendiente" && resultadoDe(c).tipo === r);

export function PantallaCotejo({ migas, children }: { migas: [string, string?][]; children: ReactNode }) {
    return (
        <PanelLayout titulo="Participantes" tema="contenidos paleta">
            <Migas raiz="Participantes" pasos={migas} />
            <div className="pz-pagina">{children}</div>
        </PanelLayout>
    );
}

const diasDesde = (fecha: string) => {
    const [a, m, d] = fecha.split("-").map(Number);
    const hoy = new Date();
    const dias = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - new Date(a, m - 1, d).getTime()) / 86400000);
    return dias <= 0 ? "Se registró hoy" : dias === 1 ? "Se registró ayer" : `Se registró hace ${dias} días`;
};

// Bandeja (Figma 573:28730), sin cotejos (573:29222), sin resultados (573:29447), historial (573:33317)
export default function Cotejo() {
    const id = useId();
    const cotejos = useCotejos();
    const [params] = useSearchParams();
    // ?vista=historial (enlaces anteriores) abre directo los resueltos
    const [filtro, setFiltro] = useState<FiltroCotejo>(params.get("vista") === "historial" ? "resueltos" : "pendientes");
    const [resultado, setResultado] = useState<Resultado | "todos">("todos");
    const [texto, setTexto] = useState("");
    const [pagina, setPagina] = useState(1);

    if (!sistemaDisponible()) return <SinSistema />;

    const cuenta = (f: FiltroCotejo) => cotejos.filter((c) => enFiltroCotejo(c, f)).length;
    const t = texto.trim().toLowerCase();
    const filas = cotejos
        .filter((c) => enFiltroCotejo(c, filtro) && tieneResultado(c, resultado) && (!t || [c.persona, c.folio, c.portal.credencial].some((v) => v.toLowerCase().includes(t))))
        .sort((a, b) => (filtro === "resueltos" ? (b.resolucion?.fecha ?? "").localeCompare(a.resolucion?.fecha ?? "") : a.registro.localeCompare(b.registro)));
    const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
    const actual = Math.min(pagina, paginas);
    const visibles = filas.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);
    const elegir = (f: FiltroCotejo) => { setFiltro(f); setResultado("todos"); setPagina(1); };
    const activos = (filtro !== "pendientes" ? 1 : 0) + (resultado !== "todos" ? 1 : 0);
    const recientes = cotejos.filter((c) => c.estado !== "pendiente").sort((a, b) => (b.resolucion?.fecha ?? "").localeCompare(a.resolucion?.fecha ?? "")).slice(0, 4);

    return (
        <PantallaCotejo migas={[["Cotejo de credenciales"]]}>
            <Encabezado titulo="Cotejo de credenciales" texto="Compara lo que la persona capturó en el portal con el sistema de la biblioteca antes de vincular su cuenta.">
                <Cifra icono="cotejo" valor={cuenta("pendientes")} texto="por cotejar" activa={filtro === "pendientes"} alPresionar={() => elegir("pendientes")} />
                <Cifra icono="alerta" tono="vino" valor={cuenta("diferencias")} texto="con diferencias" activa={filtro === "diferencias"} alPresionar={() => elegir("diferencias")} />
                <Cifra icono="reloj" valor={cuenta("vencidas")} texto="credencial vencida" activa={filtro === "vencidas"} alPresionar={() => elegir("vencidas")} />
            </Encabezado>

            <div className="pz-columnas">
                <Tarjeta icono="cotejo" id={`${id}-lista`} className="pz-pendientes"
                    titulo={filtro === "resueltos" ? "Cotejos resueltos" : "Cuentas por cotejar"}
                    texto={filtro === "resueltos" ? "Quién lo resolvió y cuándo; lo más reciente arriba" : "Lo que lleva más tiempo esperando, primero"}>
                    <Buscador etiqueta="Buscar por nombre, folio o credencial" placeholder="Buscar por nombre, folio o credencial" valor={texto} alCambiar={(v) => { setTexto(v); setPagina(1); }}>
                        <FiltrosAvanzados activos={activos} alQuitar={() => elegir("pendientes")} grupos={[
                            { titulo: "Mostrar", valor: filtro, alCambiar: (v) => { setFiltro(v as FiltroCotejo); if (v === "resueltos") setResultado("todos"); setPagina(1); },
                                opciones: FILTROS.map((f) => ({ ...f, cantidad: cotejos.filter((c) => enFiltroCotejo(c, f.valor) && tieneResultado(c, resultado)).length })) },
                            ...(filtro === "resueltos" ? [] : [{ titulo: "Resultado del cotejo", valor: resultado, alCambiar: (v: string) => { setResultado(v as Resultado | "todos"); setPagina(1); },
                                opciones: [{ valor: "todos", texto: "Todos" }, ...RESULTADOS.map((r) => ({ ...r, cantidad: cotejos.filter((c) => enFiltroCotejo(c, filtro) && tieneResultado(c, r.valor)).length }))] }]),
                        ]} />
                    </Buscador>

                    {filas.length === 0 ? (
                        t || resultado !== "todos" ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto="Nadie coincide con esa búsqueda o esos filtros."
                            accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { setTexto(""); setResultado("todos"); }}>Quitar filtros</button>} />
                            : filtro === "resueltos" ? <Vacio icono="reloj" titulo="Todavía no hay cotejos resueltos" texto="Lo que vincules, rechaces o devuelvas aparecerá aquí con quién lo resolvió." />
                                : <Vacio titulo="Estás al día" texto="Cuando alguien capture su credencial en el portal, aparecerá aquí para cotejarla." />
                    ) : (
                        <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lista de cotejos">
                            <ul className="pz-filas">
                                {visibles.map((c) => {
                                    const r = textoResultado(c);
                                    const pendiente = c.estado === "pendiente";
                                    return (
                                        <li key={c.folio}>
                                            <article className={`pz-fila${pendiente && r.tono === "guinda" ? " pz-fila--guinda" : ""}`}>
                                                <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={iconoResultado(c)} /></span>
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{c.persona}</h4>
                                                    <p className="pz-fila__detalle">
                                                        <span>Folio {c.folio}</span>
                                                        <span>{pendiente ? diasDesde(c.registro) : `${c.resolucion?.quien}, ${fechaCorta(c.resolucion?.fecha ?? "")}`}</span>
                                                    </p>
                                                </div>
                                                {pendiente ? <Chip tono={r.tono}>{r.texto}</Chip> : <Chip tono={TONO_ESTADO_COTEJO[c.estado]}>{NOMBRE_ESTADO_COTEJO[c.estado]}</Chip>}
                                                <Link to={`${BASE_COTEJO}/${c.folio}`} className={`pz-boton pz-boton--chico${pendiente ? "" : " pz-boton--contorno"}`}>
                                                    {pendiente ? "Cotejar" : "Ver"}<span className="solo-lectores"> a {c.persona}</span>
                                                </Link>
                                            </article>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {filas.length > 0 && (
                        <div className="pz-tarjeta__pie">
                            <p aria-live="polite">{visibles.length} de {filas.length} {filas.length === 1 ? "cotejo" : "cotejos"}</p>
                            <Paginas pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                </Tarjeta>

                <aside className="pz-lateral" aria-label="Cómo se coteja y lo último resuelto">
                    <Tarjeta icono="reloj" id={`${id}-recientes`} titulo="Lo último resuelto" texto="Quién lo resolvió y cuándo" className="pz-tarjeta--actividades">
                        {recientes.length === 0 ? <Vacio icono="reloj" titulo="Nada resuelto todavía" texto="Cada cotejo que resuelvas aparecerá aquí." /> : (
                            <ul className="pz-actividades">
                                {recientes.map((c) => (
                                    <li key={c.folio}>
                                        <div className="pz-actividades__textos">
                                            <p className="pz-actividades__titulo">{c.persona}</p>
                                            <p className="pz-actividades__detalle">{c.resolucion?.quien}, {fechaCorta(c.resolucion?.fecha ?? "")}</p>
                                            <div className="pz-actividades__pie">
                                                <Chip tono={TONO_ESTADO_COTEJO[c.estado]}>{NOMBRE_ESTADO_COTEJO[c.estado]}</Chip>
                                                <Link to={`${BASE_COTEJO}/${c.folio}`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver<span className="solo-lectores"> el cotejo de {c.persona}</span></Link>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {filtro !== "resueltos" && cuenta("resueltos") > 0 && <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => elegir("resueltos")}>Ver todos los resueltos</button>}
                    </Tarjeta>
                    <Plegable icono="check" titulo="Cómo se coteja">
                        <ul>
                            <li>Compara nombre, número y fecha de nacimiento con el sistema de la biblioteca.</li>
                            <li>Revisa que la credencial esté vigente y sin adeudos ni bloqueos.</li>
                            <li>Vincula si todo coincide; si no, pide corrección o avisa que la renueve.</li>
                        </ul>
                    </Plegable>
                    <Plegable titulo="Reglas del cotejo">
                        <ul>
                            <li>Solo se vincula cuando nombre, número y fecha de nacimiento coinciden y la credencial está vigente.</li>
                            <li>Una credencial solo puede estar vinculada a una cuenta del portal.</li>
                            <li>Pedir corrección o rechazar siempre lleva un mensaje que la persona recibe.</li>
                            <li>Cotejar no emite credenciales: las solicitudes nuevas están en Atención › Solicitudes de credencial.</li>
                        </ul>
                    </Plegable>
                </aside>
            </div>
        </PantallaCotejo>
    );
}

// Sistema de la biblioteca no disponible (Figma 573:32910); en desarrollo, ?simular=sin-sistema
export function SinSistema() {
    return (
        <PantallaCotejo migas={[["Cotejo de credenciales", BASE_COTEJO], ["Sistema no disponible"]]}>
            <Encabezado titulo="Cotejo de credenciales" texto="Para cotejar se consulta el sistema de la biblioteca, y ahora no responde." />
            <section className="pz-tarjeta pz-resultado" aria-label="Sistema no disponible">
                <Vacio icono="alerta" titulo="No se pudo consultar el sistema de la biblioteca"
                    texto="No se perdió nada. Inténtalo de nuevo en unos minutos; mientras tanto, la persona puede esperar en Préstamos."
                    accion={<div className="pz-resultado__acciones">
                        <button type="button" className="pz-boton" onClick={() => window.location.reload()}>Reintentar</button>
                        <Link to="/admin/resumen" className="pz-boton pz-boton--contorno">Ir al Resumen</Link>
                    </div>} />
            </section>
            <Aviso tono="espera" titulo="Sin conexión con el sistema de la biblioteca." texto="Los cotejos pendientes siguen guardados." />
        </PantallaCotejo>
    );
}
