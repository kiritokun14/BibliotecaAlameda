import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Chip } from "../credencial/piezas";
import { iconosSeccion } from "../perfil/iconos";
import { espaciosEvento, nombresDisponibilidad, type Zona } from "./datos";
import { fotosDe, iconoDe, type FotoEspacio } from "./fotos";

// Detalle de un espacio para eventos (Espacios y su formulario; Aldahir, 20 nov 2026).
// En su propia tarjeta (`.esp-tarjeta`): portada con la foto (abre la vista previa) y, sobre un degradado, el ícono del
// espacio, su nombre y su chip → capacidad y planta en una línea, cada una con su ícono → «Ideal para» → «Ten en cuenta»
// → acciones al pie (`children`). Las secciones se separan con una línea fina; sin símbolos de relleno.
const COLOR_CHIP = { disponible: "verde", ludico: "dorado", condiciones: "guinda" } as const;

export function DetalleEspacio({ zona, children }: { zona: Zona; children?: ReactNode }) {
    const evento = espaciosEvento[zona.id];
    const [abierta, setAbierta] = useState<number | null>(null);
    if (!evento) return null;
    const fotos = fotosDe(evento.slug);
    const cabeza = (
        <div className="esp-detalle__cabeza">
            <span className="esp-detalle__icono"><img src={iconoDe(evento.slug)} alt="" /></span>
            <div>
                <h3>{zona.nombre}</h3>
                <Chip color={COLOR_CHIP[evento.disponibilidad]}>{nombresDisponibilidad[evento.disponibilidad]}</Chip>
            </div>
        </div>
    );
    return (
        <div className="esp-detalle" key={zona.id}>
            {fotos.length > 0 ? (
                <div className="esp-detalle__portada">
                    <button type="button" onClick={() => setAbierta(0)} aria-label={`Ver las fotos de ${zona.nombre}`}>
                        <img src={fotos[0].mini} alt="" />
                        <span>{fotos.length > 1 ? "Ver fotos" : "Ver foto"}</span>
                    </button>
                    {cabeza}
                </div>
            ) : cabeza}
            <dl className="esp-detalle__datos">
                <div style={{ "--icono": `url("${iconosSeccion.datos}")` } as CSSProperties}><dt>Capacidad</dt><dd>Hasta {evento.capacidad} personas</dd></div>
                <div style={{ "--icono": `url("${iconosSeccion.espacios}")` } as CSSProperties}><dt>Planta</dt><dd>{zona.planta === "alta" ? "Alta" : "Baja"}</dd></div>
            </dl>
            <div className="esp-detalle__bloque">
                <h4>Ideal para</h4>
                <p>{evento.uso}</p>
            </div>
            {evento.condiciones.length > 0 && (
                <div className="esp-detalle__bloque">
                    <h4>Ten en cuenta</h4>
                    <ul>{evento.condiciones.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
            )}
            {evento.condiciones.length <= 1 && (
                <div className="esp-detalle__bloque">
                    <h4>Cómo se pide</h4>
                    <ol className="esp-detalle__pasos">
                        <li><span>1</span>Elige la fecha, el horario y cuántas personas van.</li>
                        <li><span>2</span>El personal revisa la agenda de la biblioteca.</li>
                        <li><span>3</span>Te responde en tu cuenta; no se reserva hasta entonces.</li>
                    </ol>
                </div>
            )}
            {children}
            {abierta !== null && fotos.length > 0 && <VistaFotos titulo={zona.nombre} fotos={fotos} inicial={abierta} alCerrar={() => setAbierta(null)} />}
        </div>
    );
}

// Vista previa de las fotos de un lugar, a pantalla completa sobre un velo oscuro: el nombre y «Cerrar» arriba,
// la foto grande al centro con «Anterior» y «Siguiente» a sus lados, y las miniaturas abajo (la actual con aro dorado).
// Cada foto entra con un fundido. Teclado: Esc cierra; flechas izquierda y derecha cambian de foto.
// Se monta en el <body> (dentro de una tarjeta animada el velo quedaba encerrado en la columna).
export function VistaFotos({ titulo, fotos, inicial = 0, alCerrar }: { titulo: string; fotos: FotoEspacio[]; inicial?: number; alCerrar: () => void }) {
    const [actual, setActual] = useState(inicial);
    const cerrar = useRef<HTMLButtonElement>(null);
    const total = fotos.length;
    const ir = (paso: number) => setActual((a) => (a + paso + total) % total);
    useEffect(() => {
        cerrar.current?.focus();
        const tecla = (e: KeyboardEvent) => {
            if (e.key === "Escape") alCerrar();
            if (e.key === "ArrowRight") setActual((a) => (a + 1) % total);
            if (e.key === "ArrowLeft") setActual((a) => (a - 1 + total) % total);
        };
        document.addEventListener("keydown", tecla);
        const desplazar = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.removeEventListener("keydown", tecla); document.body.style.overflow = desplazar; };
    }, [alCerrar, total]);
    return createPortal(
        <div className="esp-visor" role="dialog" aria-modal="true" aria-labelledby="titulo-visor"
            onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
            <div className="esp-visor__barra">
                <h2 id="titulo-visor">{titulo}</h2>
                <button ref={cerrar} type="button" className="esp-visor__boton" onClick={alCerrar}>Cerrar</button>
            </div>
            <div className="esp-visor__escena" onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
                {total > 1 && <button type="button" className="esp-visor__boton esp-visor__lado" onClick={() => ir(-1)}>Anterior</button>}
                <img key={actual} src={fotos[actual].grande} alt={`${titulo}, foto ${actual + 1} de ${total}`} />
                {total > 1 && <button type="button" className="esp-visor__boton esp-visor__lado" onClick={() => ir(1)}>Siguiente</button>}
            </div>
            {total > 1 && (
                <div className="esp-visor__miniaturas">
                    {fotos.map((f, i) => (
                        <button key={f.mini} type="button" aria-label={`Ver la foto ${i + 1}`} aria-current={i === actual ? "true" : undefined}
                            className={i === actual ? "esp-visor__miniatura--actual" : undefined} onClick={() => setActual(i)}>
                            <img src={f.mini} alt="" />
                        </button>
                    ))}
                </div>
            )}
        </div>,
        document.body,
    );
}
