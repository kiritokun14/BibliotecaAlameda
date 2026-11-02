import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import "./BotonAsistente.css";
import PanelAsistente from "./asistente/PanelAsistente";
import { useConversacion } from "./asistente/conversacion";
import haloExterior from "../assets/inicio/asistente-halo-exterior.svg";
import haloInterior from "../assets/inicio/asistente-halo-interior.svg";
import robot from "../assets/inicio/asistente-robot.svg";
import enLinea from "../assets/inicio/asistente-en-linea.svg";
import flecha from "../assets/inicio/asistente-flecha.svg";
import destello from "../assets/inicio/asistente-destello.svg";

type Posicion = { x: number; y: number } | null; // null = esquina inferior derecha (posición inicial)
type Ventana = "cerrada" | "compacta" | "expandida"; // panel del asistente

// La ventana abierta se recuerda en esta pestaña para que siga abierta al cambiar de página
const CLAVE_VENTANA = "biblioteca-asistente-ventana";

function leerVentana(): Ventana {
    try {
        const guardada = sessionStorage.getItem(CLAVE_VENTANA);
        if (guardada === "compacta" || guardada === "expandida") return guardada;
    } catch { /* sin almacenamiento: empieza cerrada */ }
    return "cerrada";
}

const CLAVE = "biblioteca-asistente"; // aquí se recuerda dónde lo dejó la persona
const MARGEN = 12; // distancia mínima a la orilla de la pantalla
const UMBRAL = 5; // px que hay que mover el mouse para que cuente como arrastre y no como clic
const TAM_BURBUJA = 60; // tamaño de la burbuja minimizada (igual que en BotonAsistente.css)

function leerPreferencias(): { posicion: Posicion; minimizado: boolean } {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
        if (guardado) return { posicion: guardado.posicion ?? null, minimizado: Boolean(guardado.minimizado) };
    } catch { /* sin almacenamiento: se usa la posición inicial */ }
    return { posicion: null, minimizado: false };
}

// Mantiene el asistente dentro de la pantalla
function dentroDePantalla(x: number, y: number, ancho: number, alto: number) {
    return {
        x: Math.min(Math.max(x, MARGEN), window.innerWidth - ancho - MARGEN),
        y: Math.min(Math.max(y, MARGEN), window.innerHeight - alto - MARGEN),
    };
}

// Posición de la burbuja pegada a la orilla (izquierda o derecha) más cercana,
// a la altura de "centroY" (el centro vertical de donde estaba)
function pegadaAlCostado(centroX: number, centroY: number) {
    const x = centroX < window.innerWidth / 2 ? MARGEN : window.innerWidth - TAM_BURBUJA - MARGEN;
    return dentroDePantalla(x, centroY - TAM_BURBUJA / 2, TAM_BURBUJA, TAM_BURBUJA);
}

// Botón flotante del asistente: se puede arrastrar con el mouse y minimizar a una burbuja.
// Al presionarlo abre el panel del asistente (compacto o expandido).
function BotonAsistente() {
    const ubicacion = useLocation();
    const navegar = useNavigate();
    // /asistente redirige a Inicio con { abrirAsistente: true } para abrir la ventana grande
    const pedidoAbrir = Boolean((ubicacion.state as { abrirAsistente?: boolean } | null)?.abrirAsistente);
    const [ventana, setVentana] = useState<Ventana>(() => (pedidoAbrir ? "expandida" : leerVentana()));
    const conversacion = useConversacion();
    const enCurso = conversacion.mensajes.length > 0;
    const [inicial] = useState(leerPreferencias);
    const [posicion, setPosicion] = useState<Posicion>(inicial.posicion);
    const [minimizado, setMinimizado] = useState(inicial.minimizado);
    const [mostrarGlobo, setMostrarGlobo] = useState(true);
    const [arrastrando, setArrastrando] = useState(false);

    const refCaja = useRef<HTMLDivElement>(null);
    // Datos del arrastre en curso (no necesitan redibujar, por eso van en una ref)
    const arrastre = useRef({ activo: false, movido: false, inicioX: 0, inicioY: 0, cajaX: 0, cajaY: 0 });
    // Para quitar las escuchas de la ventana si la página cambia a mitad de un arrastre
    const quitarEscuchas = useRef<(() => void) | null>(null);
    useEffect(() => () => quitarEscuchas.current?.(), []);

    // Se quita el aviso de la dirección para que al recargar no se vuelva a abrir
    useEffect(() => {
        if (pedidoAbrir) navegar(ubicacion.pathname + ubicacion.search, { replace: true, state: null });
    }, [pedidoAbrir, navegar, ubicacion.pathname, ubicacion.search]);

    useEffect(() => {
        try {
            sessionStorage.setItem(CLAVE_VENTANA, ventana);
        } catch { /* no pasa nada si no se puede guardar */ }
    }, [ventana]);

    // Guardar posición y estado
    useEffect(() => {
        try {
            localStorage.setItem(CLAVE, JSON.stringify({ posicion, minimizado }));
        } catch { /* no pasa nada si no se puede guardar */ }
    }, [posicion, minimizado]);

    // Si cambia el tamaño de la ventana (o el del asistente al minimizar/expandir), que no quede fuera
    useEffect(() => {
        function acomodar() {
            const caja = refCaja.current;
            if (!caja || !posicion) return;
            const { width, height } = caja.getBoundingClientRect();
            const ajustada = dentroDePantalla(posicion.x, posicion.y, width, height);
            if (ajustada.x !== posicion.x || ajustada.y !== posicion.y) setPosicion(ajustada);
        }
        acomodar();
        window.addEventListener("resize", acomodar);
        return () => window.removeEventListener("resize", acomodar);
    }, [posicion, minimizado, mostrarGlobo]);

    // Al presionar se escucha el movimiento en TODA la ventana (no solo encima del asistente):
    // así no se pierde aunque el mouse se mueva rápido y salga de la burbuja.
    function alPresionar(e: PointerEvent<HTMLDivElement>) {
        if (e.button !== 0 || !refCaja.current) return; // solo botón izquierdo
        // Los botones pequeños (cerrar mensaje, minimizar) no inician arrastre
        if ((e.target as HTMLElement).closest(".asistente__sin-arrastre")) return;
        const rect = refCaja.current.getBoundingClientRect();
        arrastre.current = { activo: true, movido: false, inicioX: e.clientX, inicioY: e.clientY, cajaX: rect.left, cajaY: rect.top };
        const eraBurbuja = minimizado;

        function alMover(ev: globalThis.PointerEvent) {
            const a = arrastre.current;
            const caja = refCaja.current;
            if (!a.activo || !caja) return;
            const dx = ev.clientX - a.inicioX;
            const dy = ev.clientY - a.inicioY;
            if (!a.movido) {
                if (Math.hypot(dx, dy) < UMBRAL) return; // todavía es un clic
                a.movido = true;
                setArrastrando(true);
            }
            const { width, height } = caja.getBoundingClientRect();
            setPosicion(dentroDePantalla(a.cajaX + dx, a.cajaY + dy, width, height));
        }

        function alSoltar() {
            const a = arrastre.current;
            // Al soltar la burbuja después de arrastrarla, se pega al costado más cercano
            if (a.movido && eraBurbuja && refCaja.current) {
                const r = refCaja.current.getBoundingClientRect();
                setPosicion(pegadaAlCostado(r.left + r.width / 2, r.top + r.height / 2));
            }
            a.activo = false;
            setArrastrando(false);
            dejarDeEscuchar();
        }

        function dejarDeEscuchar() {
            window.removeEventListener("pointermove", alMover);
            window.removeEventListener("pointerup", alSoltar);
            window.removeEventListener("pointercancel", alSoltar);
            quitarEscuchas.current = null;
        }

        window.addEventListener("pointermove", alMover);
        window.addEventListener("pointerup", alSoltar);
        window.addEventListener("pointercancel", alSoltar);
        quitarEscuchas.current = dejarDeEscuchar;
    }

    // Minimiza y manda la burbuja a la orilla más cercana, a la altura de la pastilla
    function minimizar() {
        const pastilla = refCaja.current?.querySelector(".asistente__pastilla");
        if (pastilla) {
            const r = pastilla.getBoundingClientRect();
            setPosicion(pegadaAlCostado(r.left + r.width / 2, r.top + r.height / 2));
        }
        setMinimizado(true);
    }

    // Si se acaba de arrastrar, el clic de soltar no debe abrir ni expandir nada
    function evitarClicTrasArrastre(e: MouseEvent) {
        if (arrastre.current.movido) {
            e.preventDefault();
            arrastre.current.movido = false;
            return true;
        }
        return false;
    }

    // ---------- Panel abierto ----------
    if (ventana !== "cerrada") {
        return (
            <PanelAsistente
                modo={ventana === "expandida" ? "expandido" : "compacto"}
                conversacion={conversacion}
                alExpandir={() => setVentana("expandida")}
                alContraer={() => setVentana("compacta")}
                // Minimizar conserva la conversación y deja la burbuja en la orilla
                alMinimizar={() => { setVentana("cerrada"); setMinimizado(true); }}
                // Cerrar termina la conversación y regresa la pastilla
                alCerrar={() => { conversacion.nuevaConsulta(); setVentana("cerrada"); setMinimizado(false); }}
            />
        );
    }

    const clases = ["asistente", minimizado && "asistente--minimizado", arrastrando && "asistente--arrastrando"]
        .filter(Boolean)
        .join(" ");
    const estilo = posicion ? { left: posicion.x, top: posicion.y, right: "auto", bottom: "auto" } : undefined;

    return (
        <div
            ref={refCaja}
            className={clases}
            style={estilo}
            onPointerDown={alPresionar}
            title="Puedes arrastrarlo a otro lugar de la pantalla"
        >
            {minimizado ? (
                <button
                    type="button"
                    className="asistente__burbuja"
                    aria-label={enCurso ? "Volver a la conversación con el asistente" : "Mostrar el asistente"}
                    onClick={(e) => {
                        if (evitarClicTrasArrastre(e)) return;
                        // Con una conversación en curso se abre directo el panel
                        if (enCurso) setVentana("compacta");
                        else setMinimizado(false);
                    }}
                >
                    <img className="asistente__halo asistente__halo--exterior" src={haloExterior} alt="" draggable={false} />
                    <img className="asistente__halo asistente__halo--interior" src={haloInterior} alt="" draggable={false} />
                    <span className="asistente__avatar">
                        <img src={robot} alt="" draggable={false} />
                    </span>
                    <img className="asistente__en-linea" src={enLinea} alt="" draggable={false} />
                    {enCurso && <span className="asistente__en-curso" aria-hidden="true" />}
                </button>
            ) : (
                <>
                    {mostrarGlobo && (
                        <div className="asistente__globo">
                            <img src={destello} alt="" draggable={false} />
                            Hola, ¿te ayudo a encontrar un libro?
                            <button
                                type="button"
                                className="asistente__sin-arrastre"
                                aria-label="Cerrar mensaje"
                                onClick={() => setMostrarGlobo(false)}
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <div className="asistente__pastilla">
                        <button
                            type="button"
                            className="asistente__boton"
                            draggable={false}
                            aria-haspopup="dialog"
                            onClick={(e) => { if (!evitarClicTrasArrastre(e)) setVentana("compacta"); }}
                        >
                            <img className="asistente__halo asistente__halo--exterior" src={haloExterior} alt="" draggable={false} />
                            <img className="asistente__halo asistente__halo--interior" src={haloInterior} alt="" draggable={false} />
                            <span className="asistente__avatar">
                                <img src={robot} alt="" draggable={false} />
                            </span>
                            <img className="asistente__en-linea" src={enLinea} alt="" draggable={false} />
                            <span className="asistente__texto">
                                <strong>¿Tienes dudas?</strong>
                                Pregunta al asistente
                            </span>
                            <span className="asistente__flecha">
                                <img src={flecha} alt="" draggable={false} />
                            </span>
                        </button>
                        <button
                            type="button"
                            className="asistente__minimizar asistente__sin-arrastre"
                            aria-label="Minimizar el asistente"
                            onClick={minimizar}
                        >
                            <span aria-hidden="true" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default BotonAsistente;
