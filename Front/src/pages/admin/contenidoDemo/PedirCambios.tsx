import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import { obtenerContenido, pedirCambios, useContenidos } from "./datos";
import { CampoTexto, Columnas, EncabezadoTarjeta, Migas, Pagina, PieDatos, Tarjeta } from "./piezas";
import { clasesBoton } from "./utiles";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoFlecha from "../../../assets/admin/contenidos/tarjeta-flecha.svg";

const BASE = "/admin/contenidos/revision";
const MAXIMO = 600;

const LIMITES = ["Sin fecha", "En 2 días", "En una semana", "En dos semanas"];

// Separa el texto en renglones sin número ("1. Algo" → "Algo")
const renglones = (texto: string) => texto.split(/\n+/).map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
const numerar = (lineas: string[]) => lineas.map((l, i) => `${i + 1}. ${l}`).join("\n");

// HU-12 · Revisión: pedir cambios al Editor (Figma 560:18418, Memoria 610:48486)
function PedirCambios() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useContenidos();
    const contenido = obtenerContenido(folio);
    const [texto, setTexto] = useState("");
    const [limite, setLimite] = useState(LIMITES[0]);
    const [error, setError] = useState("");

    if (!contenido || contenido.estado !== "por-autorizar") return <Navigate to={contenido ? `${BASE}/${contenido.folio}` : BASE} replace />;
    const ruta = `${BASE}/${contenido.folio}`;
    const esMemoria = contenido.tipo === "memoria";

    const preparados: [string, string][] = [
        esMemoria ? ["Faltan datos de la pieza", "Completar los datos de la pieza (fuente, tipo y periodo)."] : ["Faltan datos del libro", "Completar los datos del libro (título, autoría y género)."],
        ["Corregir ortografía", "Revisar la ortografía y la redacción."],
        ["Falta texto alternativo", "Agregar texto alternativo a la imagen."],
        [esMemoria ? "Confirmar permiso de uso" : "Confirmar derechos de imagen", "Confirmar que la imagen puede publicarse y anotar la fuente."],
        ["Ajustar el tono", "Ajustar el tono al estilo institucional."],
    ];
    const lineas = renglones(texto);

    function alternar(frase: string) {
        const nuevas = lineas.includes(frase) ? lineas.filter((l) => l !== frase) : [...lineas, frase];
        setTexto(numerar(nuevas));
        setError("");
    }

    function enviar() {
        if (lineas.length === 0) return setError("Escribe al menos una observación para el Editor.");
        if (texto.length > MAXIMO) return setError(`Máximo ${MAXIMO} caracteres (llevas ${texto.length}).`);
        pedirCambios(contenido!.folio, texto, limite === LIMITES[0] ? undefined : limite);
        navigate(`${ruta}/observaciones-enviadas`);
    }

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Revisión y publicación", BASE], ["Pedir cambios al Editor"]]} />

                <EncabezadoTarjeta
                    volver={{ texto: "Volver a la revisión", ruta }}
                    etiqueta={`Contenido ${contenido.folio} · Pedir cambios`}
                    titulo="Pedir cambios al Editor"
                    texto="El Editor recibirá tus observaciones, corregirá y volverá a enviar. El contenido no se publica."
                />

                <Columnas
                    principal={
                        <Tarjeta icono={iconoLapiz} titulo="Observaciones" subtitulo="Indica qué debe cambiar, de forma concreta.">
                            <p className="cn-subtitulo">Mensajes preparados</p>
                            <div className="cn-pastillas" role="group" aria-label="Mensajes preparados">
                                {preparados.map(([nombre, frase]) => (
                                    <button key={nombre} type="button" className="cn-pastilla" aria-pressed={lineas.includes(frase)} onClick={() => alternar(frase)}>
                                        {nombre}
                                    </button>
                                ))}
                            </div>
                            <CampoTexto id="cn-observaciones" etiqueta="Observaciones para el Editor" obligatorio ayuda={`Máximo ${MAXIMO} caracteres.${texto ? ` (${texto.length}/${MAXIMO})` : ""}`} error={error}>
                                <textarea
                                    id="cn-observaciones"
                                    className={`cn-control cn-control--area cn-control--grande ${error ? "cn-control--error" : ""}`}
                                    placeholder="1. Qué debe cambiar…"
                                    value={texto}
                                    onChange={(e) => { setTexto(e.target.value); setError(""); }}
                                    aria-invalid={!!error}
                                    aria-describedby={error ? "cn-observaciones-error" : "cn-observaciones-ayuda"}
                                />
                            </CampoTexto>
                            <CampoTexto id="cn-limite" etiqueta="Fecha límite sugerida (opcional)">
                                <select id="cn-limite" className="cn-control" value={limite} onChange={(e) => setLimite(e.target.value)}>
                                    {LIMITES.map((l) => <option key={l}>{l}</option>)}
                                </select>
                            </CampoTexto>
                            <div className="cn-acciones">
                                <button type="button" className={clasesBoton("verde")} onClick={enviar}>Enviar observaciones</button>
                                <Link to={ruta} className={clasesBoton("contorno")}>Cancelar</Link>
                            </div>
                        </Tarjeta>
                    }
                    lateral={
                        <Tarjeta icono={iconoFlecha} titulo="¿Qué pasa después?" tono="crema" lateral>
                            <ul className="cn-lista">
                                <li>El estado cambia a «Con observaciones».</li>
                                <li>El Editor recibe un aviso con tus comentarios.</li>
                                <li>Cuando vuelva a enviar, regresa a tu bandeja como «Por autorizar».</li>
                                <li>Queda registro de quién pidió cambios y cuándo.</li>
                            </ul>
                        </Tarjeta>
                    }
                />

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default PedirCambios;
