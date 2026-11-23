import { useEffect, useState } from 'react';
import { cargarImagenPrivada } from '../servicios/imagenes';
import { mensajeError } from '../servicios/api';

import { Bloque } from "./portal/Esqueleto";
export default function ImagenContenido({ folio, version, revision = false, texto = 'Imagen del contenido' }:
    { folio: string; version?: string; revision?: boolean; texto?: string }) {
    const clave = `${folio}:${version}:${revision}`;
    const [resultado, setResultado] = useState<{ clave: string; url?: string; error?: string }>({ clave: '' });
    useEffect(() => {
        let vigente = true; let url: string | undefined;
        cargarImagenPrivada(folio, revision).then(blob => {
            if (!vigente) return;
            url = URL.createObjectURL(blob); setResultado({ clave, url });
        }).catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; if (url) URL.revokeObjectURL(url); };
    }, [folio, clave, revision]);
    if (resultado.clave !== clave) return <span role="status" className="imagen-contenido-cargando"><span className="solo-lectores">Cargando imagen…</span><Bloque clase="imagen-contenido-cargando__bloque" /></span>;
    // Si la imagen no llega (p. ej. el servidor no puede leer el almacenamiento), un recuadro en su lugar en vez de texto suelto
    if (resultado.error) return <span role="status" className="imagen-contenido-error"><strong>Imagen no disponible por ahora</strong><span>{resultado.error}</span></span>;
    return <img src={resultado.url} alt={texto} style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }} />;
}
