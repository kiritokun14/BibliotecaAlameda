import { useEffect, useState } from 'react';
import { mensajeError, ErrorServicio, obtenerSupabase, pedirApi } from '../../../servicios/api';

import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import iconoCalendario from "../../../assets/perfil/fila-calendario.svg";
import vacioCampana from "../../../assets/notificaciones/vacio-campana.svg";
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

    return <section className="notif-avisos" aria-labelledby="avisos-actividad-titulo">
        <div className="notif-avisos__cabecera">
            <h2 id="avisos-actividad-titulo">Cambios y cancelaciones de tus actividades</h2>
            <p>Te avisamos aquí cuando una sesión en la que te inscribiste cambia de fecha, de lugar o se cancela.</p>
        </div>
        {!actual && <EsqueletoLista texto="Cargando avisos…" />}
        {actual?.error && <div className="notif-vacio" role="alert">
            <span><img src={vacioCampana} alt="" /></span>
            <h2>No pudimos cargar tus avisos</h2>
            <p>{actual.error}</p>
            <button type="button" className="notif-tarjeta__ver" onClick={() => reintentar(i => i + 1)}>Reintentar</button>
        </div>}
        {actual?.avisos?.length === 0 && <div className="notif-vacio">
            <span><img src={vacioCampana} alt="" /></span>
            <h2>No tienes avisos de cambios</h2>
            <p>Si una actividad en la que te inscribiste cambia o se cancela, aparecerá aquí.</p>
        </div>}
        {!!actual?.avisos?.length && <ul className="notif-tarjetas">{actual.avisos.slice(0, 20).map(aviso => <li className="notif-tarjeta" key={aviso.id}>
            <span className="notif-tarjeta__icono"><img src={iconoCalendario} alt="" /></span>
            <div className="notif-tarjeta__textos">
                <p className="notif-tarjeta__area">Actividades</p>
                <h2>{aviso.titulo}</h2>
                <p>{aviso.cuerpoAviso}</p>
                <small><time dateTime={aviso.creadoEn}>{new Date(aviso.creadoEn).toLocaleString('es-MX', { timeZone: 'America/Mazatlan', dateStyle: 'long', timeStyle: 'short' })}</time></small>
            </div>
        </li>)}</ul>}
        {(pagina > 0 || (actual?.avisos?.length ?? 0) > 20) && <div className="notif-acciones">
            <button type="button" className="notif-tarjeta__ver" disabled={!actual || pagina === 0} onClick={() => setPagina(i => i - 1)}>Anteriores</button>
            <button type="button" className="notif-tarjeta__ver" disabled={(actual?.avisos?.length ?? 0) <= 20 || pagina >= 5000} onClick={() => setPagina(i => i + 1)}>Siguientes</button>
        </div>}
    </section>;
}
