import { useEffect, useState } from "react";
import { publicadosEnMemoria } from "../../../servicios/publicacion";
import { noticiaPublicada, obtenerNoticias, type Noticia } from "./datos";

export type CargaNoticias =
    | { estado: "cargando" }
    | { estado: "error" }
    | { estado: "listo"; noticias: Noticia[] };

// Lo que ya se había cargado en esta pestaña, para pintar al instante
function enMemoria(): CargaNoticias {
    const guardadas = publicadosEnMemoria("noticia");
    return guardadas ? { estado: "listo", noticias: guardadas.map(noticiaPublicada) } : { estado: "cargando" };
}

// Pide las noticias publicadas; reintentar() las vuelve a pedir tras un error.
// Si ya había noticias en memoria se muestran mientras llega la respuesta nueva.
export function useNoticias() {
    const [carga, setCarga] = useState<CargaNoticias>(enMemoria);
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        let vigente = true;
        obtenerNoticias()
            .then((noticias) => { if (vigente) setCarga({ estado: "listo", noticias }); })
            .catch(() => { if (vigente) setCarga((previa) => (previa.estado === "listo" ? previa : { estado: "error" })); });
        return () => { vigente = false; };
    }, [intento]);

    function reintentar() {
        setCarga({ estado: "cargando" });
        setIntento((n) => n + 1);
    }

    return { carga, reintentar };
}
