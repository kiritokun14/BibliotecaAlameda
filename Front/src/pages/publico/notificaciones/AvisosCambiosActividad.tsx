import { useEffect, useState } from 'react';
import { consultarAvisosCambios, leerAvisoCambio, type AvisoCambioActividad } from '../../../servicios/cambiosActividad';
import { mensajeError } from '../../../servicios/api';

// Avisos persistentes de HU-17; las operaciones del resto del centro siguen independientes.
export default function AvisosCambiosActividad({ usuario }: { usuario: string }) {
    const [intento, recargar] = useState(0);
    const [pagina, setPagina] = useState(0);
    const [carga, setCarga] = useState<{ clave: string; avisos?: AvisoCambioActividad[]; total?: number; error?: string }>({ clave: '' });
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const clave = `${usuario}:${pagina}:${intento}`;
    const actual = carga.clave === clave ? carga : undefined;
    useEffect(() => {
        let vigente = true;
        consultarAvisosCambios(pagina * 20).then(datos => { if (vigente) setCarga({ clave, ...datos }); })
            .catch(e => { if (vigente) setCarga({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [clave, pagina]);
    async function marcar(id: string) {
        setOcupado(true); setError('');
        try { await leerAvisoCambio(id); recargar(x => x + 1); }
        catch (e) { setError(mensajeError(e)); }
        finally { setOcupado(false); }
    }
    return <section className="notif-estado" aria-label="Avisos de cambios y cancelaciones">
        <h2>Cambios y cancelaciones de actividades</h2>
        {!actual ? <p role="status">Cargando avisos…</p> : actual.error ? <><p role="alert">{actual.error}</p><button onClick={() => recargar(x => x + 1)}>Reintentar</button></> : <>
            {actual.avisos?.length === 0 && <p>No tienes avisos de cambios o cancelaciones.</p>}
            {actual.avisos?.map(a => <article key={a.id}>
                <h3>{a.titulo}</h3><p>{a.texto}</p>
                <p>{new Date(a.fecha).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })} · {a.leida ? 'Leído' : 'Sin leer'}</p>
                {!a.leida && <button disabled={ocupado} onClick={() => void marcar(a.id)}>Marcar como leído</button>}
            </article>)}
            {(actual.total ?? 0) > 20 && <div><button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</button><span> Página {pagina + 1} </span><button disabled={(pagina + 1) * 20 >= (actual.total ?? 0)} onClick={() => setPagina(p => p + 1)}>Siguiente</button></div>}
        </>}
        {error && <p role="alert">{error}</p>}
    </section>;
}
