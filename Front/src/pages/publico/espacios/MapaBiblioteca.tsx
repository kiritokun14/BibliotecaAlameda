import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import {
    disponibilidadDe, espaciosEvento, FORMA_MESANIM, nombresDisponibilidad, zonaPorId, zonas,
    type Categoria, type Disponibilidad, type Planta, type Zona,
} from "./datos";

// Mapa 2D de la biblioteca (a partir del mapa de Aldahir, 20 nov 2026) con los colores del portal.
// Planta baja con todas las áreas y planta alta con el Mesanim (encima del Área infantil).
// Solo los espacios para eventos se pueden elegir (con el mouse o con Tab + Enter); el resto se ve en gris.
// Al elegir uno, el resto del plano se desenfoca y el espacio queda nítido con su contorno dorado (Aldahir, 20 nov):
// el plano se dibuja dos veces, la segunda recortada a la forma del espacio. Las etiquetas solo dicen el nombre;
// capacidad, uso y condiciones están en el detalle. `resaltar` atenúa lo que no tenga esa disponibilidad (leyenda).

const colorCategoria: Record<Categoria, string> = {
    lectura: "#1f6b5c", infantil: "#d39b35", publico: "#5f8f7a", oficina: "#b9b3a5",
    bano: "#b9b3a5", restringido: "#6b675e", exterior: "#5f8f7a", mesanim: "#a8743f",
};

type Props = {
    planta: Planta;
    alCambiarPlanta: (p: Planta) => void;
    elegido: string | null;
    alElegir: (id: string) => void;
    resaltar?: Disponibilidad | null;
    // Solo para ver (p. ej. «Dónde es» en el detalle de una actividad): sin clics, sin globo ni botones de planta
    soloLectura?: boolean;
};

type Globo = { x: number; y: number; zona: Zona } | null;

// La forma de una zona como elemento SVG (con los atributos que se le pasen)
function forma(z: Zona, atributos: Record<string, unknown>, key?: string) {
    if ("rect" in z.forma) {
        const [x, y, w, h] = z.forma.rect;
        return <rect key={key} {...atributos} x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={z.id === "04" ? 2 : 8} />;
    }
    if ("circulo" in z.forma) {
        const [cx, cy, r] = z.forma.circulo;
        return <circle key={key} {...atributos} cx={cx} cy={cy} r={r} />;
    }
    return <path key={key} {...atributos} d={z.forma.ruta} />;
}

export default function MapaBiblioteca({ planta, alCambiarPlanta, elegido, alElegir, resaltar = null, soloLectura = false }: Props) {
    const caja = useRef<HTMLDivElement>(null);
    const [globo, setGlobo] = useState<Globo>(null);
    const alta = planta === "alta";
    const elegida = elegido ? zonaPorId(elegido) : undefined;
    const foco = !!elegida && elegida.planta === planta; // el espacio elegido está en la planta que se ve

    function mover(e: MouseEvent, zona: Zona) {
        const r = caja.current?.getBoundingClientRect();
        if (!r) return;
        let x = e.clientX - r.left + 16, y = e.clientY - r.top + 16;
        if (x + 240 > r.width) x = e.clientX - r.left - 256;
        if (y + 80 > r.height) y = e.clientY - r.top - 86;
        setGlobo({ x, y, zona });
    }
    function tecla(e: KeyboardEvent, accion: () => void) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); accion(); }
    }

    const atenuada = (z: Zona) => !!resaltar && disponibilidadDe(z.id) !== resaltar && z.id !== "04";
    // Los espacios para eventos no son bloques de color: se ve su piso y su mobiliario con un tinte suave y un contorno
    // de su color (Aldahir, 20 nov: «no quiero cuadros, que se seleccione su contorno»). Las demás áreas, en gris.
    const pintura = (z: Zona) => {
        const evento = espaciosEvento[z.id];
        if (z.id === "04") return { fill: "url(#esp-baldosa)", stroke: "none" };
        if (z.relleno === "adoquin") return { fill: "url(#esp-adoquin)", stroke: colorCategoria[z.categoria] };
        if (z.id === "M") return { fill: "url(#esp-duela)", stroke: colorCategoria[z.categoria] };
        if (!evento) return { fill: z.relleno === "rayas" ? "url(#esp-rayas)" : "#e2ddd2", stroke: "#fffdf9" };
        return { fill: colorCategoria[z.categoria], fillOpacity: 0.16, stroke: colorCategoria[z.categoria] };
    };

    // copia = la segunda pasada del plano (recortada al espacio elegido): sin eventos ni lectores de pantalla
    const zonaSvg = (z: Zona, copia = false) => {
        const evento = espaciosEvento[z.id];
        const clase = ["esp-zona", evento ? "esp-zona--libre" : "esp-zona--no", elegido === z.id ? "esp-zona--elegida" : "", atenuada(z) ? "esp-zona--tenue" : ""].join(" ");
        const base = { className: clase, ...pintura(z), strokeWidth: 3 };
        if (copia || soloLectura) return forma(z, { ...base, "aria-hidden": true, pointerEvents: "none" }, z.id);
        return forma(z, {
            ...base,
            ...(evento ? {
                tabIndex: 0, role: "button", "aria-pressed": elegido === z.id,
                "aria-label": `${z.nombre}: ${nombresDisponibilidad[evento.disponibilidad]}, ${evento.capacidadTexto.toLowerCase()}`,
                onClick: () => alElegir(z.id), onKeyDown: (e: KeyboardEvent) => tecla(e, () => alElegir(z.id)),
            } : { "aria-hidden": true }),
            onMouseMove: (e: MouseEvent) => mover(e, z), onMouseLeave: () => setGlobo(null),
        }, z.id);
    };

    const baja = zonas.filter((z) => z.planta === "baja");
    const mesanim = zonas.find((z) => z.id === "M")!;
    const globoEvento = globo ? espaciosEvento[globo.zona.id] : undefined;

    const plantaBaja = (copia: boolean): ReactNode => (
        <>
            <g filter="url(#esp-edificio)">
                <rect x="45" y="180" width="1005" height="675" fill="#f7f3ea" />
                <rect x="305" y="115" width="430" height="70" fill="#f7f3ea" />
                <rect x="415" y="855" width="275" height="140" rx="4" fill="#f7f3ea" />
            </g>
            <g>{baja.map((z) => zonaSvg(z, copia))}</g>
            <Mobiliario />
            <g fill="none" stroke="#26303d" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
                <path d="M305,180 L45,180 L45,855 L512,855 M595,855 L1050,855 L1050,180 L735,180" strokeWidth="7" />
                <path d="M305,180 V115 H735 V180" strokeWidth="5" />
                <path d="M45,180 L45,855 M1050,180 L1050,855" stroke="#8ed1e0" strokeWidth="2.5" />
                <path d="M415,855 V995 H690 V855" strokeWidth="3" strokeDasharray="10 7" />
            </g>
        </>
    );
    const planoAlto = (copia: boolean): ReactNode => (
        <>
            {zonaSvg(mesanim, copia)}
            <g pointerEvents="none" aria-hidden="true">
                <path d="M735,185 L1045,185 L1045,508" fill="none" stroke="#26303d" strokeWidth="7" />
                <path d="M925,508 Q890,470 870,425 Q850,385 790,370 Q745,350 738,300 L735,185" fill="none" stroke="#fff" strokeWidth="7" opacity=".9" />
                <path d="M925,508 Q890,470 870,425 Q850,385 790,370 Q745,350 738,300 L735,185" fill="none" stroke="#6b4a22" strokeWidth="2" strokeDasharray="1 9" strokeLinecap="round" />
                <path d="M856,368 Q898,378 914,420" fill="none" stroke="#f5efe4" strokeWidth="20" strokeLinecap="round" />
                <path d="M856,368 Q898,378 914,420" fill="none" stroke="#9a7a55" strokeWidth="20" strokeDasharray="2 5" />
            </g>
        </>
    );

    return (
        <div className="esp-mapa__lienzo" ref={caja}>
            <svg className={`esp-mapa__svg${alta ? " esp-mapa__svg--alta" : ""}${foco ? " esp-mapa__svg--foco" : ""}`} viewBox="15 85 1070 935"
                role={soloLectura ? "img" : "group"}
                aria-label={soloLectura && elegida ? `Mapa de la biblioteca con ${elegida.nombre} resaltado` : alta ? "Mapa de la planta alta de la biblioteca" : "Mapa de la planta baja de la biblioteca"}>
                <defs>
                    <filter id="esp-sombra" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#2b2214" floodOpacity=".18" /></filter>
                    <filter id="esp-edificio" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#2b2214" floodOpacity=".22" /></filter>
                    <filter id="esp-pildora"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity=".18" /></filter>
                    <filter id="esp-brillo" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#c9a24a" floodOpacity=".75" /></filter>
                    <pattern id="esp-baldosa" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="#f7f3ea" /><path d="M34 0H0V34" fill="none" stroke="#ebe4d6" /></pattern>
                    <pattern id="esp-duela" width="120" height="22" patternUnits="userSpaceOnUse">
                        <rect width="120" height="22" fill="#d39a5e" /><path d="M0 21.5H120" stroke="#b67c42" /><path d="M70 0V22" stroke="#bf8549" /><path d="M0 8H120" stroke="#dba76d" strokeWidth="2" opacity=".5" />
                    </pattern>
                    <pattern id="esp-rayas" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#e2ddd2" /><path d="M0 0V10" stroke="#d3cdc0" strokeWidth="4" /></pattern>
                    <pattern id="esp-libros" width="9" height="40" patternUnits="userSpaceOnUse">
                        <rect width="9" height="40" fill="#8b5e34" /><rect x="1" y="2" width="2.2" height="36" fill="#9b2247" /><rect x="3.6" y="2" width="2.2" height="36" fill="#1f6b5c" /><rect x="6.2" y="2" width="2.2" height="36" fill="#e6d194" />
                    </pattern>
                    <pattern id="esp-libros-h" width="40" height="9" patternUnits="userSpaceOnUse">
                        <rect width="40" height="9" fill="#8b5e34" /><rect y="1" x="2" height="2.2" width="36" fill="#9b2247" /><rect y="3.6" x="2" height="2.2" width="36" fill="#1f6b5c" /><rect y="6.2" x="2" height="2.2" width="36" fill="#e6d194" />
                    </pattern>
                    <pattern id="esp-pasto" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#dcead7" /><circle cx="4" cy="5" r="1.2" fill="#c6dcbf" /><circle cx="12" cy="12" r="1.2" fill="#c6dcbf" /></pattern>
                    <pattern id="esp-adoquin" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#e9e1d1" /><rect x="1" y="1" width="20" height="20" rx="3" fill="#f2ecdf" /></pattern>
                    <radialGradient id="esp-arbol" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#a9d3b9" /><stop offset=".7" stopColor="#4f9a7c" /><stop offset="1" stopColor="#1f6b5c" /></radialGradient>
                    <marker id="esp-flecha" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#164f44" /></marker>
                    {foco && elegida && <clipPath id="esp-recorte">{forma(elegida, {})}</clipPath>}
                </defs>

                {/* fondo: jardín, árboles y el plano; con un espacio elegido se desenfoca */}
                <g className="esp-mapa__fondo">
                    <rect x="20" y="140" width="1060" height="755" rx="28" fill="url(#esp-pasto)" />
                    <g aria-hidden="true">
                        {arboles.map(([x, y], i) => {
                            const r = 13 + (i % 3) * 3;
                            return <g key={i}><circle cx={x + 2} cy={y + 3} r={r} fill="#1f6b5c" opacity=".2" /><circle cx={x} cy={y} r={r} fill="url(#esp-arbol)" /></g>;
                        })}
                    </g>
                    <g className="esp-mapa__baja">
                        {plantaBaja(false)}
                        <g pointerEvents="none" aria-hidden="true">
                            <path d="M514,855 A38,38 0 0 1 552,817 V855" stroke="#26303d" strokeWidth="2" fill="none" />
                            <path d="M593,855 A38,38 0 0 0 555,817 V855" stroke="#26303d" strokeWidth="2" fill="none" />
                            <path d="M553,985 L553,905" stroke="#164f44" strokeWidth="3" markerEnd="url(#esp-flecha)" />
                            <rect x="508" y="962" width="90" height="26" rx="13" fill="#164f44" />
                            <text x="553" y="980" fontSize="13" fontWeight="700" fill="#fff" textAnchor="middle">Entrada</text>
                        </g>
                        <g pointerEvents="none" aria-hidden="true">
                            {baja.filter((z) => !(foco && z.id === elegido)).map((z) => <Etiqueta key={z.id} zona={z} tenue={atenuada(z)} />)}
                        </g>
                    </g>
                    {!alta && (
                        <path d={FORMA_MESANIM} fill="none" stroke="#8a6414" strokeWidth="2.5" strokeDasharray="9 6" pointerEvents="none" />
                    )}
                    {alta && (
                        <g className="esp-mapa__alta">
                            {planoAlto(false)}
                            <g pointerEvents="none" aria-hidden="true">
                                <text x="842" y="450" fontSize="13" fontWeight="600" textAnchor="end" fill="#5a3a10">Escalera al Área infantil</text>
                                {!(foco && elegido === "M") && <Etiqueta zona={mesanim} tenue={atenuada(mesanim)} />}
                            </g>
                        </g>
                    )}
                </g>

                {/* el espacio elegido, nítido: el plano recortado a su forma, su contorno dorado y su nombre */}
                {foco && elegida && (
                    <g className="esp-mapa__foco" key={elegida.id} pointerEvents="none" aria-hidden="true">
                        <g clipPath="url(#esp-recorte)">{elegida.planta === "alta" ? planoAlto(true) : plantaBaja(true)}</g>
                        {/* En el mapa chico («Dónde es») el espacio además se ilumina en verde para distinguirse de lejos */}
                        {soloLectura && forma(elegida, { className: "esp-mapa__luz", fill: "#1f6b5c", fillOpacity: 0.42, stroke: "none" })}
                        {forma(elegida, { className: "esp-mapa__contorno", fill: "none", stroke: "#c9a24a", strokeWidth: soloLectura ? 10 : 6, filter: "url(#esp-brillo)" })}
                        <Etiqueta zona={elegida} tenue={false} elegida />
                    </g>
                )}

                {/* botones del plano para cambiar de planta (siempre nítidos) */}
                {soloLectura ? null : !alta ? (
                    <g className="esp-mapa__pildora" role="button" tabIndex={0} aria-label="Ver el Mesanim en la planta alta"
                        onClick={() => alCambiarPlanta("alta")} onKeyDown={(e) => tecla(e, () => alCambiarPlanta("alta"))}>
                        <rect x="908" y="455" width="134" height="28" rx="14" fill="#8a6414" filter="url(#esp-pildora)" />
                        <text x="975" y="474" fontSize="13" fontWeight="700" fill="#fff" textAnchor="middle">Ver el Mesanim</text>
                    </g>
                ) : (
                    <g className="esp-mapa__pildora" role="button" tabIndex={0} aria-label="Volver a la planta baja"
                        onClick={() => alCambiarPlanta("baja")} onKeyDown={(e) => tecla(e, () => alCambiarPlanta("baja"))}>
                        <rect x="450" y="455" width="200" height="38" rx="19" fill="#164f44" filter="url(#esp-pildora)" />
                        <text x="550" y="479" fontSize="14" fontWeight="700" fill="#fff" textAnchor="middle">Volver a la planta baja</text>
                    </g>
                )}
            </svg>

            {globo && (
                <div className="esp-mapa__globo" style={{ left: globo.x, top: globo.y }} aria-hidden="true">
                    <strong>{globo.zona.nombre}</strong>
                    <span>{globoEvento ? nombresDisponibilidad[globoEvento.disponibilidad] : "No se presta para eventos"}</span>
                    {globoEvento && <em>{elegido === globo.zona.id ? "Clic para quitarlo" : "Clic para elegirlo"}</em>}
                </div>
            )}
        </div>
    );
}

// Etiqueta en pastilla con el nombre (corto) del área; la del espacio elegido va en verde
function Etiqueta({ zona, tenue, elegida = false }: { zona: Zona; tenue: boolean; elegida?: boolean }) {
    const evento = espaciosEvento[zona.id];
    const texto = zona.corto ?? zona.nombre;
    const [x, y, s] = zona.etiqueta;
    const ancho = texto.length * 7.4 + 26;
    const fondo = elegida ? "#164f44" : evento ? "#fffdf9" : "#f4f1ea";
    const letra = elegida ? "#fff" : evento ? "#161a1d" : "#8a8578";
    return (
        <g className={`esp-etiqueta${tenue ? " esp-etiqueta--tenue" : ""}`} transform={`translate(${x} ${y}) scale(${evento ? s : s * 0.9})`}>
            <rect x={-ancho / 2} y={-14} width={ancho} height={28} rx={14} fill={fondo} filter={evento ? "url(#esp-pildora)" : undefined} />
            <text x={0} y={5} fontSize="14" fontWeight="700" fill={letra} textAnchor="middle">{texto}</text>
        </g>
    );
}

// Mobiliario de referencia (no se elige): estantes, mesas, catálogo, anillo del coliseo, computadoras, mostradores y bancas
function Mobiliario() {
    const mesa = (x: number, y: number, w: number, h: number, k: string) => (
        <g key={k}>
            {[x + w * 0.27, x + w * 0.73].map((cx) => <g key={cx}><rect x={cx - 6} y={y - 9} width={12} height={7} rx={2.5} fill="#5b6472" /><rect x={cx - 6} y={y + h + 2} width={12} height={7} rx={2.5} fill="#5b6472" /></g>)}
            <rect x={x} y={y} width={w} height={h} rx={5} fill="#e9c891" stroke="#c79a55" />
        </g>
    );
    const redonda = (cx: number, cy: number, r: number, k: string, colores = ["#5b6472"]) => (
        <g key={k}>
            {[0, 90, 180, 270].map((a, i) => { const t = (a * Math.PI) / 180; return <circle key={a} cx={cx + (r + 7) * Math.cos(t)} cy={cy + (r + 7) * Math.sin(t)} r={5} fill={colores[i % colores.length]} />; })}
            <circle cx={cx} cy={cy} r={r} fill="#f3dcb0" stroke="#c79a55" />
        </g>
    );
    const infantil = ["#9b2247", "#1f6b5c", "#e6d194", "#5f8f7a"];
    return (
        <g pointerEvents="none" aria-hidden="true">
            {[328, 377, 425, 474, 688, 737, 786].map((x) => <rect key={x} x={x} y={438} width={16} height={160} rx={2} fill="url(#esp-libros)" stroke="#6d4524" />)}
            <rect x={304} y={258} width={22} height={110} rx={2} fill="url(#esp-libros)" stroke="#6d4524" />
            {mesa(355, 332, 60, 30, "m1")}{mesa(455, 332, 60, 30, "m2")}{mesa(440, 652, 60, 30, "m3")}{mesa(605, 652, 60, 30, "m4")}
            {[[605, 283, 13], [683, 302, 13], [578, 338, 13], [858, 462, 13], [345, 660, 13], [812, 700, 11], [812, 775, 11]].map(([x, y, r]) => redonda(x, y, r, `r${x}-${y}`))}
            <rect x={404} y={194} width={40} height={18} rx={3} fill="#b07a3e" stroke="#7a4f22" />
            <rect x={598} y={194} width={40} height={18} rx={3} fill="#b07a3e" stroke="#7a4f22" />
            <text x={521} y={207} fontSize="11" fontWeight="600" fill="#7a6a55" textAnchor="middle">Catálogo público</text>
            <path d="M556,592 A76,76 0 1 1 620,592" fill="none" stroke="#6d4524" strokeWidth="16" strokeLinecap="round" />
            <path d="M556,592 A76,76 0 1 1 620,592" fill="none" stroke="url(#esp-libros-h)" strokeWidth="12" />
            <path d="M556,592 A76,76 0 1 1 620,592" fill="none" stroke="#e6d194" strokeWidth="4" strokeDasharray="3 4" />
            {[[828, 252], [960, 262], [790, 300], [960, 355], [948, 428]].map(([x, y]) => redonda(x, y, 16, `i${x}-${y}`, infantil))}
            <rect x={768} y={196} width={250} height={11} rx={2} fill="url(#esp-libros-h)" stroke="#6d4524" />
            <rect x={1022} y={210} width={11} height={200} rx={2} fill="url(#esp-libros)" stroke="#6d4524" />
            <rect x={933} y={492} width={64} height={10} rx={2} fill="url(#esp-libros-h)" stroke="#6d4524" />
            <path d="M856,368 Q898,378 914,420" fill="none" stroke="#fff" strokeWidth="16" strokeOpacity=".7" strokeDasharray="2 4" />
            <rect x={931} y={520} width={108} height={9} rx={2} fill="#3d5a7a" />
            <rect x={1030} y={529} width={9} height={94} rx={2} fill="#3d5a7a" />
            {[268, 310, 352, 394].map((x) => <g key={x}><rect x={x} y={744} width={28} height={16} rx={3} fill="#fff" /><rect x={x + 5} y={747} width={18} height={8} rx={1.5} fill="#1d2433" /><circle cx={x + 14} cy={772} r={5} fill="#26303d" /></g>)}
            <path d="M605,768 H685" stroke="#c79a55" strokeWidth="9" strokeLinecap="round" />
            <path d="M705,772 Q740,760 775,772" fill="none" stroke="#5b6472" strokeWidth="9" strokeLinecap="round" />
            <rect x={440} y={900} width={14} height={56} rx={3} fill="#c79a55" />
            <rect x={652} y={900} width={14} height={56} rx={3} fill="#c79a55" />
        </g>
    );
}

const arboles: [number, number][] = [
    [30, 160], [30, 260], [28, 420], [30, 580], [28, 740], [34, 880], [120, 885], [250, 882], [360, 888], [760, 888], [880, 884],
    [1000, 886], [1068, 870], [1066, 700], [1070, 540], [1066, 380], [1068, 220], [1060, 150], [900, 150], [800, 150], [250, 150], [150, 150],
];
