import { useCallback, useEffect, useState } from "react";

// Lógica de un carrusel horizontal: botones anterior/siguiente y los puntitos de página.
// Se usa en Lecturas y en Actividades. Uso: <div ref={carrusel.refPista} ...>
// "contenido" cambia cuando cambian las tarjetas (por ejemplo, al filtrar): el carrusel vuelve al inicio.
export function useCarrusel(contenido?: unknown) {
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
        pista?.scrollTo({ left: 0 });
    }, [pista, contenido]);

    useEffect(() => {
        // Esperamos a que el navegador dibuje para poder medir
        const cuadro = requestAnimationFrame(actualizar);
        window.addEventListener("resize", actualizar);
        return () => {
            cancelAnimationFrame(cuadro);
            window.removeEventListener("resize", actualizar);
        };
    }, [actualizar, contenido]);

    // Si ya está en la orilla, da la vuelta: del final regresa al inicio y viceversa
    function mover(direccion: 1 | -1) {
        if (!pista) return;
        const maximo = pista.scrollWidth - pista.clientWidth;
        const margen = 4; // tolerancia en px por redondeos del navegador
        if (direccion === 1 && pista.scrollLeft >= maximo - margen) {
            pista.scrollTo({ left: 0, behavior: "smooth" });
        } else if (direccion === -1 && pista.scrollLeft <= margen) {
            pista.scrollTo({ left: maximo, behavior: "smooth" });
        } else {
            pista.scrollBy({ left: direccion * pista.clientWidth, behavior: "smooth" });
        }
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
