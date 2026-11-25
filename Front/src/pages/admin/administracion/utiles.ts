// Ayudas de Administración que no son componentes (separadas para que Fast Refresh funcione)
import { useCallback, useEffect, useState } from "react";
import { mensajeError } from "../../../servicios/api";

// Pide datos y los vuelve a pedir cuando cambia la clave o al llamar recargar
export function useCarga<T>(clave: string, pedir: () => Promise<T>) {
    const [recarga, setRecarga] = useState(0);
    const [r, setR] = useState<{ clave: string; datos?: T; error?: string }>({ clave: "" });
    const actual = `${clave}#${recarga}`;
    useEffect(() => {
        let vigente = true;
        pedir().then((datos) => { if (vigente) setR({ clave: actual, datos }); }).catch((e) => { if (vigente) setR({ clave: actual, error: mensajeError(e) }); });
        return () => { vigente = false; };
        // Solo se vuelve a pedir cuando cambia la clave (la función es nueva en cada render)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actual]);
    const v = r.clave === actual ? r : undefined;
    return { datos: v?.datos, error: v?.error, cargando: !v, recargar: useCallback(() => setRecarga((x) => x + 1), []) };
}

// Descarga un CSV armado en el navegador (exportar estadísticas y bitácora)
export function descargarCsv(nombre: string, filas: (string | number)[][]) {
    const texto = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    descargarArchivo(nombre, new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
}

export function descargarArchivo(nombre: string, archivo: Blob) {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
