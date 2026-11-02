import { useEffect, useState } from "react";
import { obtenerNoticias, type Noticia } from "./datos";

export type CargaNoticias =
    | { estado: "cargando" }
    | { estado: "error" }
    | { estado: "listo"; noticias: Noticia[] };

// Pide las noticias publicadas; reintentar() las vuelve a pedir tras un error
export function useNoticias() {
    const [carga, setCarga] = useState<CargaNoticias>({ estado: "cargando" });
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        let vigente = true;
        obtenerNoticias()
            .then((noticias) => { if (vigente) setCarga({ estado: "listo", noticias }); })
            .catch(() => { if (vigente) setCarga({ estado: "error" }); });
        return () => { vigente = false; };
    }, [intento]);

    function reintentar() {
        setCarga({ estado: "cargando" });
        setIntento((n) => n + 1);
    }

    return { carga, reintentar };
}
