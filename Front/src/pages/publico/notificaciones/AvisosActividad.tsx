import { useEffect, useState } from 'react';
import { mensajeError, ErrorServicio, obtenerSupabase, pedirApi } from '../../../servicios/api';

type Aviso = { id: string; titulo: string; cuerpoAviso: string; creadoEn: string };

export function AvisosActividad() {
    const [pagina, setPagina] = useState(0);
    const [intento, reintentar] = useState(0);
    const [carga, setCarga] = useState<{ clave: string; avisos?: Aviso[]; error?: string }>();
    const clave = `${pagina}:${intento}`;
    const actual = carga?.clave === clave ? carga : undefined;
    useEffect(() => {
        let vigente = true;
        async function cargar() {
            const { data, error } = await (await obtenerSupabase()).auth.getSession();
            if (error || !data.session) throw new ErrorServicio('Inicia sesión para ver tus avisos.', 401);
            return pedirApi<Aviso[]>(`/notificaciones/actividades?pagina=${pagina}`, {
                headers: { Authorization: `Bearer ${data.session.access_token}` },
            });
        }
        cargar().then(avisos => { if (vigente) setCarga({ clave, avisos }); })
            .catch(e => { if (vigente) setCarga({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [clave, pagina]);

    return <section aria-labelledby="avisos-actividad-titulo">
        <h2 id="avisos-actividad-titulo">Cambios y cancelaciones de actividades</h2>
        {!actual && <p role="status">Cargando avisos…</p>}
        {actual?.error && <p role="alert">{actual.error} <button type="button" onClick={() => reintentar(i => i + 1)}>Reintentar</button></p>}
        {actual?.avisos?.length === 0 && <p>No tienes avisos de cambios ni cancelaciones.</p>}
        {actual?.avisos?.slice(0, 20).map(aviso => <article className="notif-tarjeta" key={aviso.id}>
            <div><h3>{aviso.titulo}</h3><p>{aviso.cuerpoAviso}</p>
                <time dateTime={aviso.creadoEn}>{new Date(aviso.creadoEn).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })}</time>
            </div>
        </article>)}
        {(pagina > 0 || (actual?.avisos?.length ?? 0) > 20) && <div className="notif-acciones">
            <button type="button" disabled={!actual || pagina === 0} onClick={() => setPagina(i => i - 1)}>Anterior</button>
            <button type="button" disabled={(actual?.avisos?.length ?? 0) <= 20 || pagina >= 5000} onClick={() => setPagina(i => i + 1)}>Siguiente</button>
        </div>}
    </section>;
}
