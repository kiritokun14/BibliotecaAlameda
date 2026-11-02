// Puntitos de página (el activo es una barrita dorada) y flechas a los lados
export function Puntos({
    total,
    activo,
    alElegir,
}: {
    total: number;
    activo: number;
    alElegir: (numero: number) => void;
}) {
    return (
        <div className="puntos">
            {Array.from({ length: total }, (_, numero) => (
                <button
                    key={numero}
                    type="button"
                    className={numero === activo ? "puntos__punto puntos__punto--activo" : "puntos__punto"}
                    aria-label={`Ir a la página ${numero + 1}`}
                    aria-current={numero === activo}
                    onClick={() => alElegir(numero)}
                />
            ))}
        </div>
    );
}

export function Flecha({
    lado,
    icono,
    alPresionar,
}: {
    lado: "anterior" | "siguiente";
    icono: string;
    alPresionar: () => void;
}) {
    return (
        <button
            type="button"
            className={`flecha-carrusel flecha-carrusel--${lado}`}
            aria-label={lado === "anterior" ? "Anterior" : "Siguiente"}
            onClick={alPresionar}
        >
            <img src={icono} alt="" />
        </button>
    );
}
