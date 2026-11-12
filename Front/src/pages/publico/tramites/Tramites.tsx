import { useCuentaTramites } from '../../../servicios/useCuentaTramites';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import PaginaPublica, { EncabezadoPublico } from '../../../components/portal/PaginaPublica';
import { NavLink } from 'react-router';
import { consultarTramite, listarTramites, solicitarCredencial, estadoTramite, ESTADOS_CREDENCIAL, ESTADOS_PROPUESTA,
    type ListaTramites, type SolicitudAtencion, type TipoTramite } from '../../../servicios/tramites';
import { mensajeError } from '../../../servicios/api';
import { AccesoTramites, FichaTramite, FormularioPropuesta } from './piezas';
import './Tramites.css';

export default function Tramites() {
    const { pathname } = useLocation(); const { id } = useParams(); const navigate = useNavigate();
    const usuario = useCuentaTramites(); const [intento, recargar] = useState(0); const [pagina, setPagina] = useState(0);
    const tipo: TipoTramite = pathname.includes('credencial') ? 'credencial' : 'propuesta';
    const nueva = pathname === '/proponer-evento';
    const clave = JSON.stringify([usuario, tipo, id, intento, pagina]);
    const [resultado, setResultado] = useState<{ clave: string; lista?: ListaTramites; solicitud?: SolicitudAtencion; error?: string }>({ clave: '' });
    const actual = resultado.clave === clave ? resultado : undefined;
    useEffect(() => {
        if (!usuario || nueva) return;
        let vigente = true;
        const consulta = id ? consultarTramite(tipo, id).then(solicitud => ({ solicitud })) : listarTramites(tipo, true, pagina).then(lista => ({ lista }));
        consulta.then(datos => { if (vigente) setResultado({ clave, ...datos }); }).catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [usuario, nueva, clave, id, tipo, pagina]);
    const base = `/mis-tramites/${tipo === 'credencial' ? 'credencial' : 'propuestas'}`;
    return <PaginaPublica>
        <EncabezadoPublico etiqueta="Mis trámites" titulo={tipo === 'credencial' ? <>Mis solicitudes de <span>credencial</span></> : <>Mis <span>propuestas</span></>}
            texto={tipo === 'credencial' ? 'Consulta el estado de las solicitudes de credencial que enviaste.' : 'Consulta el estado de tus propuestas de eventos y clubes.'} />
        <div className="tramites">
        <nav className="tramites-pestanas" aria-label="Mis trámites">
            <NavLink to="/mis-tramites/credencial">Credencial</NavLink>
            <NavLink to="/mis-tramites/propuestas">Propuestas</NavLink>
            <Link to="/mi-perfil" className="tramites-pestanas__perfil">Ir a Mi perfil</Link>
        </nav>
        {usuario === undefined ? <p role="status" className="tramites-estado">Comprobando sesión…</p> : usuario === null ? <AccesoTramites /> : <>
            {nueva ? <section className="tramites-tarjeta"><FormularioPropuesta key={usuario} alGuardar={s => navigate(`/mis-tramites/propuestas/${s.id}`)} /></section> : <>
                {!actual && <p role="status" className="tramites-estado">Cargando tus solicitudes…</p>}
                {actual?.error && <p role="alert">{actual.error} <button onClick={() => recargar(x => x + 1)}>Reintentar</button></p>}
                {actual?.lista && <>
                    {tipo === 'credencial' ? <SolicitudCredencial key={usuario} alGuardar={s => navigate(`${base}/${s.id}`)} /> : <p><Link to="/proponer-evento">Enviar una nueva propuesta</Link></p>}
                    <p className="tramites-total">{actual.lista.total} {actual.lista.total === 1 ? 'solicitud registrada' : 'solicitudes registradas'}</p>
                    {actual.lista.solicitudes.map(s => <article className="tramites-tarjeta" key={s.id}><h2>{s.tituloPropuesta || `Credencial: ${s.tipoSolicitud}`}</h2>
                        <p className="tramites-chip">{(tipo === 'credencial' ? ESTADOS_CREDENCIAL : ESTADOS_PROPUESTA)[estadoTramite(s)]}</p><Link className="tramites-enlace" to={`${base}/${s.id}`}>Ver seguimiento →</Link></article>)}
                    {actual.lista.total > 20 && <div className="tramites-paginas"><button disabled={pagina === 0} onClick={() => setPagina(x => x - 1)}>Anterior</button><span> Página {pagina + 1} </span>
                    <button disabled={(pagina + 1) * 20 >= actual.lista.total} onClick={() => setPagina(x => x + 1)}>Siguiente</button></div>}
                </>}
                {actual?.solicitud && <section className="tramites-tarjeta"><Link className="tramites-enlace" to={base}>← Volver a mis solicitudes</Link><FichaTramite solicitud={actual.solicitud} />
                    {tipo === 'propuesta' && ['borrador', 'requiere_correccion'].includes(estadoTramite(actual.solicitud)) && <FormularioPropuesta key={actual.solicitud.actualizadoEn} anterior={actual.solicitud} alGuardar={() => recargar(x => x + 1)} />}
                </section>}
            </>}
        </>}
    </div></PaginaPublica>;
}
function SolicitudCredencial({ alGuardar }: { alGuardar: (s: SolicitudAtencion) => void }) {
    const [guardando, setGuardando] = useState(false); const bloqueo = useRef(false); const [error, setError] = useState('');
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const f = new FormData(e.currentTarget); bloqueo.current = true; setGuardando(true); setError('');
        try { alGuardar(await solicitarCredencial(String(f.get('tipo')), String(f.get('nota') ?? ''))); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    return <form className="tramites-tarjeta" onSubmit={enviar}><h2>Solicitar atención para tu credencial</h2>
        <p>La solicitud inicia el trámite; no emite una credencial. El cotejo de documentos se realiza presencialmente en la biblioteca.</p>
        <fieldset className="tramites-campos" disabled={guardando}><label>Tipo<select name="tipo"><option value="obtencion">Obtención</option><option value="renovacion">Renovación</option></select></label>
            <label>Observaciones opcionales<textarea name="nota" maxLength={1000} /></label><button>{guardando ? 'Enviando…' : 'Enviar solicitud'}</button></fieldset>
        {error && <p role="alert">{error}</p>}
    </form>;
}
