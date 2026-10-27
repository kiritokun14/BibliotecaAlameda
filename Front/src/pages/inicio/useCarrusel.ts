import { useCallback, useEffect, useState } from "react";

// Lógica de un carrusel horizontal: botones anterior/siguiente y los puntitos de página.
// Se usa en Lecturas y en Actividades. Uso: <div ref={carrusel.refPista} ...>
export function useCarrusel() {
    // Guardamos el elemento de la pista en estado (React lo llena al dibujarla)
    const [pista, setPista] = useState<HTMLDivElement | null>(null);
    const [pagina, setPagina] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(1);

    // Calcula en qué "página" va según cuánto se ha desplazado
    const actualizar = useCallback(() => {
        if (!pista) return;
        const paginas = Math.max(1, Math.ceil(pista.scrollWidth / pista.clientWidth));
        const maximo = pista.scrollWidth - pista.clientWidth;
        const avance = maximo > 0 ? pista.scrollLeft / maximo : 0;
        setTotalPaginas(paginas);
        setPagina(Math.round(avance * (paginas - 1)));
    }, [pista]);

    useEffect(() => {
        // Esperamos a que el navegador dibuje para poder medir
        const cuadro = requestAnimationFrame(actualizar);
        window.addEventListener("resize", actualizar);
        return () => {
            cancelAnimationFrame(cuadro);
            window.removeEventListener("resize", actualizar);
        };
    }, [actualizar]);

    function mover(direccion: 1 | -1) {
        pista?.scrollBy({ left: direccion * pista.clientWidth, behavior: "smooth" });
    }

    function irAPagina(numero: number) {
        pista?.scrollTo({ left: numero * pista.clientWidth, behavior: "smooth" });
    }

    return {
        refPista: setPista,
        pagina,
        totalPaginas,
        alDesplazar: actualizar,
        irAnterior: () => mover(-1),
        irSiguiente: () => mover(1),
        irAPagina,
    };
}
