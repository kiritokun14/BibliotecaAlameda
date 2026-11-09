import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "../actividades/EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { BloqueResumen, Buscador, Chip, Encabezado, EncabezadoTarjeta, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Resultado, Tabla, Tarjeta } from "../contenidoDemo/piezas";
import { clasesBoton, paginar } from "../contenidoDemo/utiles";
import { fechaCorta } from "../actividades/datos";
import { enFiltroCotejo, NOMBRE_ESTADO_COTEJO, sistemaDisponible, textoResultado, useCotejos, type Cotejo as TipoCotejo, type FiltroCotejo } from "./cotejos";
import { BASE_COTEJO, TONO_COTEJO } from "./utiles";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoXGuinda from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import iconoXDorado from "../../../assets/admin/participantes/resumen-x-dorado.svg";
import iconoCheck from "../../../assets/admin/contenidos/resumen-check.svg";
import iconoIntercambio from "../../../assets/admin/participantes/tarjeta-intercambio.svg";
import iconoRelojTarjeta from "../../../assets/admin/contenidos/tarjeta-reloj.svg";
import iconoAlerta from "../../../assets/admin/actividades/resultado-alerta.svg";
import vacioCheck from "../../../assets/admin/contenidos/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

// Participantes · Cotejo de credenciales: bandeja (Figma 573:28730), sin cotejos (573:29222), sin resultados (573:29447),
// historial (573:33317) y sistema no disponible (573:32910)
function Cotejo() {
    const cotejos = useCotejos();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [filtro, setFiltro] = useState<FiltroCotejo>("pendientes");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const [semana] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));

    if (!sistemaDisponible()) return <SinSistema />;
    if (params.get("vista") === "historial") return <Historial cotejos={cotejos} />;

    const texto = busqueda.trim().toLowerCase();
    const cuenta = (f: FiltroCotejo) => cotejos.filter((c) => enFiltroCotejo(c, f)).length;
    const filas = cotejos.filter((c) => enFiltroCotejo(c, filtro) && (!texto || c.persona.toLowerCase().includes(texto) || c.portal.credencial.toLowerCase().includes(texto) || c.folio.toLowerCase().includes(texto))).sort((a, b) => b.folio.localeCompare(a.folio));
    const { paginas, actual, visibles } = paginar(filas, pagina, 6);
    const elegir = (f: FiltroCotejo) => { setFiltro(f); setPagina(0); };

    return (
        <PanelLayout titulo="Participantes" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Cotejo de credenciales"], ["Bandeja"]]} />
                <Encabezado etiqueta="Participantes · Cotejo" titulo="Cotejo de credenciales" texto="Compara los datos que la persona capturó en el portal con los del sistema de la biblioteca antes de vincular su cuenta." />
                <BloqueResumen
                    insignia="Cotejo de credenciales"
                    titulo="Cotejos de"
                    resalte="hoy"
                    subtitulo="Cuentas por vincular con su credencial de la biblioteca · cifras de ejemplo"
                    accesos={[
                        { icono: iconoReloj, numero: cuenta("pendientes"), titulo: "Por cotejar", texto: "Esperan revisión", enlace: "Cotejar", tono: "dorado", activo: filtro === "pendientes", alPresionar: () => elegir("pendientes") },
                        { icono: iconoXGuinda, numero: cuenta("diferencias"), titulo: "Con diferencias", texto: "Piden corrección", enlace: "Ver diferencias", tono: "guinda", activo: filtro === "diferencias", alPresionar: () => elegir("diferencias") },
                        { icono: iconoXDorado, numero: cuenta("vencidas"), titulo: "Credencial vencida", texto: "Requiere renovación", enlace: "Ver vencida", tono: "dorado", activo: filtro === "vencidas", alPresionar: () => elegir("vencidas") },
                        { icono: iconoCheck, numero: cotejos.filter((c) => c.estado === "vinculada" && (c.resolucion?.fecha ?? "") >= semana).length, titulo: "Vinculadas esta semana", texto: "Con cuenta activa", enlace: "Ver historial", tono: "verde", alPresionar: () => navigate(`${BASE_COTEJO}?vista=historial`) },
                    ]}
                />
                <Tarjeta icono={iconoIntercambio} titulo="Cuentas por cotejar">
                    <div className="cn-barra">
                        <Filtros
                            valor={filtro}
                            alCambiar={elegir}
                            opciones={[
                                { valor: "pendientes", texto: `Pendientes (${cuenta("pendientes")})` },
                                { valor: "diferencias", texto: `Con diferencias (${cuenta("diferencias")})` },
                                { valor: "vencidas", texto: `Vencidas (${cuenta("vencidas")})` },
                                { valor: "resueltos", texto: `Resueltos (${cuenta("resueltos")})` },
                            ]}
                        />
                        <Buscador texto="Buscar por nombre o credencial" valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
                    </div>
                    {filas.length === 0 ? (
                        texto ? (
                            <EstadoVacio icono={vacioBuscar} titulo={`Sin resultados para «${busqueda.trim()}»`} texto="Prueba con otro nombre o número de credencial." accion={{ texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("pendientes"); } }} />
                        ) : (
                            <EstadoVacio icono={vacioCheck} titulo={filtro === "pendientes" ? "No hay cuentas por cotejar" : "No hay cotejos en este filtro"} texto="Cuando alguien capture su credencial en el portal, aparecerá aquí." />
                        )
                    ) : (
                        <Tabla
                            columnas={[
                                { titulo: "FOLIO", ancho: 90, folio: true, celda: (c: TipoCotejo) => c.folio },
                                { titulo: "PERSONA", fuerte: true, celda: (c: TipoCotejo) => c.persona },
                                { titulo: "CREDENCIAL", ancho: 150, celda: (c: TipoCotejo) => c.portal.credencial },
                                { titulo: "SE REGISTRÓ", ancho: 110, celda: (c: TipoCotejo) => fechaCorta(c.registro) },
                                { titulo: "RESULTADO", ancho: 170, celda: (c: TipoCotejo) => { const r = textoResultado(c); return <Chip tono={r.tono} ancho={160}>{r.texto}</Chip>; } },
                                { titulo: "ESTADO", ancho: 160, celda: (c: TipoCotejo) => <Chip tono={TONO_COTEJO[c.estado]} ancho={150}>{NOMBRE_ESTADO_COTEJO[c.estado]}</Chip> },
                                { titulo: "ACCIÓN", ancho: 90, celda: (c: TipoCotejo) => <Link to={`${BASE_COTEJO}/${c.folio}`} className="cn-enlace">{c.estado === "pendiente" ? "Cotejar" : "Ver"} →<span className="cn-solo-lectores"> {c.persona}</span></Link> },
                            ]}
                            filas={visibles}
                            clave={(c) => c.folio}
                        />
                    )}
                    {filas.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filas.length} (ejemplo)</p>
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                    <div className="cn-acciones"><Link to={`${BASE_COTEJO}?vista=historial`} className={clasesBoton("suave")}>Ver historial de cotejos</Link></div>
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

function Historial({ cotejos }: { cotejos: TipoCotejo[] }) {
    const resueltos = cotejos.filter((c) => c.estado !== "pendiente").sort((a, b) => b.folio.localeCompare(a.folio));
    return (
        <PanelLayout titulo="Participantes" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Cotejo de credenciales", BASE_COTEJO], ["Historial"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Cotejo de credenciales", ruta: BASE_COTEJO }} etiqueta="Participantes · Cotejo" titulo="Historial de cotejos" texto="Registro de cada cotejo y quién lo resolvió." />
                <Tarjeta icono={iconoRelojTarjeta} titulo="Cotejos resueltos">
                    {resueltos.length === 0 ? (
                        <EstadoVacio icono={vacioCheck} titulo="Todavía no hay cotejos resueltos" texto="Lo que resuelvas aparecerá aquí con su responsable." />
                    ) : (
                        <>
                            <Tabla
                                columnas={[
                                    { titulo: "FOLIO", ancho: 90, folio: true, celda: (c: TipoCotejo) => <Link to={`${BASE_COTEJO}/${c.folio}`} className="cn-enlace">{c.folio}</Link> },
                                    { titulo: "PERSONA", fuerte: true, celda: (c: TipoCotejo) => c.persona },
                                    { titulo: "RESULTADO", ancho: 170, celda: (c: TipoCotejo) => <Chip tono={TONO_COTEJO[c.estado]} ancho={160}>{NOMBRE_ESTADO_COTEJO[c.estado]}</Chip> },
                                    { titulo: "RESOLVIÓ", ancho: 160, celda: (c: TipoCotejo) => c.resolucion?.quien ?? "—" },
                                    { titulo: "FECHA", ancho: 110, celda: (c: TipoCotejo) => fechaCorta(c.resolucion?.fecha ?? "") },
                                ]}
                                filas={resueltos}
                                clave={(c) => c.folio}
                            />
                            <p className="cn-nota">{resueltos.length} registros (ejemplo)</p>
                        </>
                    )}
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export function SinSistema() {
    return (
        <PanelLayout titulo="Participantes" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Cotejo de credenciales", BASE_COTEJO], ["Sistema no disponible"]]} />
                <Encabezado etiqueta="Participantes · Cotejo" titulo="Cotejo de credenciales" texto="No se pudo consultar el sistema de la biblioteca." />
                <Resultado tono="guinda" icono={iconoAlerta} titulo="No se pudo consultar el sistema" linea="No se perdió nada. Inténtalo de nuevo en unos minutos o coteja manualmente." chip={<Chip tono="guinda">Sin conexión</Chip>} />
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={() => window.location.reload()}>Reintentar</button>
                    <Link to={BASE_COTEJO} className={`${clasesBoton("contorno")} panel-regresar`}>Volver a Cotejo de credenciales</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default Cotejo;
