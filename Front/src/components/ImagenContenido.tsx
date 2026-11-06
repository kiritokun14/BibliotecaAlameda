import { useEffect, useState } from 'react';
import { cargarImagenPrivada } from '../servicios/imagenes';
import { mensajeError } from '../servicios/api';

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
    if (resultado.clave !== clave) return <p role="status">Cargando imagen…</p>;
    if (resultado.error) return <p role="alert">{resultado.error}</p>;
    return <img src={resultado.url} alt={texto} style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }} />;
}
