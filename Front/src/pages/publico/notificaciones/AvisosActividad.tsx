import { useEffect, useState } from 'react';
import { mensajeError, ErrorServicio, obtenerSupabase, pedirApi } from '../../../servicios/api';

import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import { Link } from 'react-router';
import { Chip } from "../credencial/piezas";
import { EtiquetaPerfil } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";
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

    // Bloque de fecha («20 / NOV») de cada aviso, como en las tarjetas de lista del catálogo
    const fecha = (iso: string) => {
        const d = new Date(iso);
        return { dia: d.toLocaleString('es-MX', { timeZone: 'America/Mazatlan', day: 'numeric' }), mes: d.toLocaleString('es-MX', { timeZone: 'America/Mazatlan', month: 'short' }).replace('.', '') };
    };
    return <section className="perfil-panel" aria-labelledby="avisos-actividad-titulo">
        <div className="notif-avisos__cabecera">
            <EtiquetaPerfil id="avisos-actividad-titulo" icono={iconosSeccion.eventos}>Cambios y cancelaciones de tus actividades</EtiquetaPerfil>
            <p>Te avisamos aquí cuando una sesión en la que te inscribiste cambia de fecha, de lugar o se cancela.</p>
        </div>
        {!actual && <EsqueletoLista texto="Cargando avisos…" />}
        {actual?.error && <div className="perfil-vacio perfil-vacio--eventos perfil-vacio--panel" role="alert">
            <span className="perfil-vacio__insignia" aria-hidden="true" />
            <p><strong>No pudimos cargar tus avisos</strong>{actual.error}</p>
            <button type="button" className="perfil-boton" onClick={() => reintentar(i => i + 1)}>Reintentar</button>
        </div>}
        {actual?.avisos?.length === 0 && <div className="perfil-vacio perfil-vacio--eventos perfil-vacio--panel">
            <span className="perfil-vacio__insignia" aria-hidden="true" />
            <p><strong>Estás al día</strong>Si una actividad en la que te inscribiste cambia o se cancela, aparecerá aquí.</p>
            <Link to="/mi-perfil/eventos" className="perfil-boton">Ver mis eventos</Link>
        </div>}
        {!!actual?.avisos?.length && <ul className="perfil-solicitudes">{actual.avisos.slice(0, 20).map(aviso => {
            const { dia, mes } = fecha(aviso.creadoEn);
            return <li className="perfil-solicitud perfil-solicitud--dorado perfil-evento" key={aviso.id}>
                <span className="perfil-evento__fecha" aria-hidden="true"><strong>{dia}</strong>{mes}</span>
                <div className="perfil-solicitud__textos">
                    <strong>{aviso.titulo}</strong>
                    <span>{aviso.cuerpoAviso}</span>
                    <small className="notif-item__meta">Actividades · <time dateTime={aviso.creadoEn}>{new Date(aviso.creadoEn).toLocaleString('es-MX', { timeZone: 'America/Mazatlan', dateStyle: 'long', timeStyle: 'short' })}</time></small>
                </div>
                <Chip color="dorado">Cambio</Chip>
            </li>;
        })}</ul>}
        {(pagina > 0 || (actual?.avisos?.length ?? 0) > 20) && <div className="perfil-acciones">
            <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={!actual || pagina === 0} onClick={() => setPagina(i => i - 1)}>Anteriores</button>
            <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={(actual?.avisos?.length ?? 0) <= 20 || pagina >= 5000} onClick={() => setPagina(i => i + 1)}>Siguientes</button>
        </div>}
    </section>;
}
