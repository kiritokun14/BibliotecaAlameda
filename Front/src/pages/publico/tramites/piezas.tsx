import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useCuentaTramites } from '../../../servicios/useCuentaTramites';
import { cancelarPropuesta, puedeCancelarPropuesta, puedeCorregirPropuesta, enviarPropuesta, ESTADOS_CREDENCIAL, ESTADOS_PROPUESTA, estadoTramite, type DatosPropuesta, type SolicitudAtencion } from '../../../servicios/tramites';
import { mensajeError } from '../../../servicios/api';
import PedirSesion from '../sesion/PedirSesion';

// Color del estado: verde = resuelto bien, dorado = en curso, guinda = necesita algo o se rechazó, gris = cerrado
const TONO_TRAMITE: Record<string, 'verde' | 'dorado' | 'guinda' | 'gris'> = {
    recibida: 'dorado', en_atencion: 'dorado', cita_programada: 'dorado', atendida: 'verde', rechazada: 'guinda', cancelada: 'gris',
    borrador: 'gris', en_revision: 'dorado', requiere_correccion: 'guinda', aprobada: 'verde',
};
const nombreEstado = (e: string) => (ESTADOS_CREDENCIAL[e] ?? ESTADOS_PROPUESTA[e]) || e;
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-MX', { timeZone: 'America/Mazatlan', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function ChipTramite({ estado }: { estado: string }) {
    return <span className={`tramites-chip tramites-chip--${TONO_TRAMITE[estado] ?? 'gris'}`}>{nombreEstado(estado)}</span>;
}

export function HistorialTramite({ solicitud: s }: { solicitud: SolicitudAtencion }) {
    return <section className="tramites-seguimiento"><h3>Seguimiento</h3>
        <ol className="tramites-linea">
            <li><strong>Solicitud registrada</strong><small>{fechaHora(s.creadaEn)}</small></li>
            {s.historial.map((h, i) => <li key={i} className={i === s.historial.length - 1 ? 'tramites-linea__ultimo' : undefined}>
                <strong>{nombreEstado(h.estadoNuevo)}</strong><small>{fechaHora(h.fecha)}</small>
                {h.nota && <p>{h.nota}</p>}
                {h.acuerdoDireccion && <p>Acuerdo de dirección: {h.acuerdoDireccion.responsable} · {h.acuerdoDireccion.fecha} · Referencia: {h.acuerdoDireccion.referencia}. Registrado por la cuenta de coordinación: {h.registradoPor}.</p>}
            </li>)}
        </ol>
        {!s.historial.length && <p className="tramites-nota">Todavía no hay decisiones del personal. Te avisaremos en tus notificaciones.</p>}
        {!!s.versiones?.length && <><h3>Versiones guardadas</h3><ol>{s.versiones.map(v => <li key={v.numero}>Versión {v.numero} · {v.accion} · {v.motivo} · {new Date(v.fecha).toLocaleString('es-MX')}</li>)}</ol></>}
    </section>;
}
export function FichaTramite({ solicitud: s }: { solicitud: SolicitudAtencion }) {
    return <>
        <div className="tramites-ficha__cabecera">
            <div><h2>{s.tituloPropuesta || (s.tipoSolicitud === 'renovacion' ? 'Renovación de credencial' : 'Obtención de credencial')}</h2>
                <p className="tramites-nota">Folio <span className="tramites-folio">{s.id.slice(0, 8)}</span> · enviada el {fechaHora(s.creadaEn)}</p></div>
            <ChipTramite estado={estadoTramite(s)} />
        </div>
        {(s.observacionesInstitucionales || s.observaciones) && <p className="tramites-aviso">Observaciones del personal: {s.observacionesInstitucionales ?? s.observaciones}</p>}
        {s.fechaCita && <p className="tramites-aviso tramites-aviso--verde">Tu cita: {new Date(s.fechaCita).toLocaleString('es-MX', { timeZone: 'America/Mazatlan', dateStyle: 'full', timeStyle: 'short' })} · hora de Tepic</p>}
        {s.estadoRevision === 'aprobada' && <p className="tramites-aviso tramites-aviso--verde">La propuesta fue aprobada. La biblioteca la programará y publicará en la agenda por separado.</p>}
        {s.estadoSolicitud === 'atendida' && <p className="tramites-aviso tramites-aviso--verde">Se registró la atención del trámite; este estado no emite ni valida una credencial automáticamente.</p>}
        {s.descripcion && <p className="tramites-descripcion">{s.descripcion}</p>}
        <dl className="tramites-datos">
            {s.perfil && <div><dt>Solicitante</dt><dd>{s.perfil.nombres} {s.perfil.primerApellido} {s.perfil.segundoApellido}</dd></div>}
            {s.perfil && <div><dt>Teléfono</dt><dd>{s.perfil.telefono}{s.perfil.municipio && ` · ${s.perfil.municipio}`}</dd></div>}
            {([['Tipo', s.tipoPropuesta], ['Público', s.publicoDirigido], ['Espacio solicitado', s.necesidadEspacio], ['Frecuencia', s.frecuenciaReunion], ['Días solicitados', s.diasSolicitados], ['Horario solicitado', s.horarioSolicitado]] as const)
                .filter(([, valor]) => valor).map(([campo, valor]) => <div key={campo}><dt>{campo}</dt><dd>{valor}</dd></div>)}
        </dl>
        <HistorialTramite solicitud={s} />
    </>;
}
const campos = [
    ['tituloPropuesta', 'Título de la propuesta', 200], ['descripcion', 'Descripción', 5000], ['tipoPropuesta', 'Tipo: evento, taller o club', 100],
    ['publicoDirigido', 'Público al que va dirigido', 500], ['necesidadEspacio', 'Espacio que necesitas', 5000],
    ['frecuenciaReunion', 'Frecuencia de reunión', 200], ['diasSolicitados', 'Días solicitados', 200], ['horarioSolicitado', 'Horario solicitado', 200],
] as const;
export function FormularioPropuesta({ anterior, alGuardar }: { anterior?: SolicitudAtencion; alGuardar: (solicitud: SolicitudAtencion) => void }) {
    const [error, setError] = useState(''); const [guardando, setGuardando] = useState(false); const bloqueo = useRef(false);
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        const formulario = new FormData(e.currentTarget);
        const datos = Object.fromEntries(campos.map(([campo]) => [campo, String(formulario.get(campo) ?? '').trim()])) as unknown as DatosPropuesta;
        datos.abiertaAlPublico = formulario.get('abiertaAlPublico') === 'on'; datos.sinFinesDeLucro = formulario.get('sinFinesDeLucro') === 'on';
        bloqueo.current = true; setGuardando(true); setError('');
        try { alGuardar(await enviarPropuesta(datos, anterior, anterior ? String(formulario.get('motivoCambio') ?? '') : undefined)); }
        catch (error) { setError(mensajeError(error)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    return <form className="tramites-formulario" onSubmit={enviar}><h2>{anterior ? 'Corregir y reenviar propuesta' : 'Proponer un evento o club'}</h2>
        <p>Las fechas y los espacios solicitados quedan sujetos a revisión; enviar esta propuesta no reserva ni publica una actividad.</p>
        {anterior && <p>Al guardar, la propuesta vuelve a revisión y necesita una nueva resolución. Se conserva la versión anterior y el motivo.</p>}
        <fieldset disabled={guardando} className="tramites-campos">
            {campos.map(([campo, etiqueta, maximo]) => <label key={campo}>{etiqueta}
                {maximo === 5000 ? <textarea name={campo} required maxLength={maximo} defaultValue={String(anterior?.[campo] ?? '')} />
                    : <input name={campo} required maxLength={maximo} defaultValue={String(anterior?.[campo] ?? '')} />}
            </label>)}
            {anterior && <label>Motivo de la corrección<textarea name="motivoCambio" required maxLength={1000} /></label>}
            <label><input type="checkbox" name="abiertaAlPublico" required /> Confirmo que la actividad será abierta al público.</label>
            <label><input type="checkbox" name="sinFinesDeLucro" required /> Confirmo que será sin fines de lucro.</label>
            <button className="tramites-boton">{guardando ? 'Enviando…' : anterior ? 'Guardar corrección y reenviar' : 'Enviar a revisión'}</button>
        </fieldset>{error && <p className="tramites-aviso-error" role="alert">{error}</p>}
    </form>;
}
export function AccionesPropuesta({ solicitud: s, alGuardar }: { solicitud: SolicitudAtencion; alGuardar: () => void }) {
    const usuario = useCuentaTramites();
    const [motivo, setMotivo] = useState('');
    const [confirmar, setConfirmar] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    async function cancelar(e: FormEvent) {
        e.preventDefault(); if (guardando) return;
        setGuardando(true); setError('');
        try { await cancelarPropuesta(s, motivo); alGuardar(); }
        catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); }
    }
    if (!usuario || s.propuestoPor !== usuario) return null;
    return <>
        {s.actividadId ? <p>Esta propuesta ya tiene una actividad vinculada. <Link to="/mis-actividades/cambios">Solicitar cambios o cancelación de sus sesiones</Link></p> :
            puedeCorregirPropuesta(s) && <FormularioPropuesta key={s.actualizadoEn} anterior={s} alGuardar={alGuardar} />}
        {puedeCancelarPropuesta(s) && <>
            <button className="boton-panel" disabled={guardando} onClick={() => setConfirmar(true)}>Cancelar propuesta</button>
            {confirmar && <form onSubmit={e => void cancelar(e)}>
                <h3>Confirmar cancelación de la propuesta</h3><p>Se conserva el expediente y su historial. No se publicará esta propuesta.</p>
                <label>Motivo<textarea required maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} disabled={guardando} /></label>
                <button disabled={guardando}>{guardando ? 'Cancelando…' : 'Confirmar cancelación'}</button>
                <button type="button" disabled={guardando} onClick={() => setConfirmar(false)}>Mantener propuesta</button>
            </form>}
        </>}
        {error && <p role="alert">{error}</p>}
    </>;
}
export function AccesoTramites() {
    return <PedirSesion nivel="h2" titulo="Inicia sesión para ver tus trámites" texto="Con tu cuenta consultas y envías solicitudes, y sigues su avance." />;
}
