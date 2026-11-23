import { useEffect, useState, type FormEvent } from 'react';
import { corregirMiSolicitud, diaLocal, horaLocal, listarAreas, type AreaEspacio, type SolicitudEspacioApi } from '../../../servicios/espacios';
import { mensajeError } from '../../../servicios/api';
import '../tramites/Tramites.css';

export default function CorregirSolicitudEspacio({ solicitud: s, alGuardar }: { solicitud: SolicitudEspacioApi; alGuardar: (s: SolicitudEspacioApi) => void }) {
    const [abierto, setAbierto] = useState(false);
    const [areas, setAreas] = useState<AreaEspacio[]>([]);
    const [areaId, setAreaId] = useState(s.espacio?.slug ?? '');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    useEffect(() => {
        if (!abierto) return;
        let vigente = true;
        listarAreas().then(datos => { if (vigente) setAreas(datos); }).catch(e => { if (vigente) setError(mensajeError(e)); });
        return () => { vigente = false; };
    }, [abierto]);
    async function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (guardando) return;
        const f = new FormData(e.currentTarget);
        setGuardando(true); setError('');
        try {
            const resultado = await corregirMiSolicitud(s.folio, { tipo: s.tipo, areaId: String(f.get('areaId') ?? '') || null,
                fecha: String(f.get('fecha')), horaInicio: String(f.get('inicio')), horaFin: String(f.get('fin')), personas: Number(f.get('personas')),
                motivo: String(f.get('motivo')), institucion: String(f.get('institucion') ?? ''), motivoCambio: String(f.get('motivoCambio')), actualizadoEn: s.actualizadoEn });
            setAbierto(false); alGuardar(resultado);
        } catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); }
    }
    if (!['en_revision', 'requiere_correccion'].includes(s.estado)) return null;
    return <section className="cred-tarjeta">
        <h2>Corregir mi solicitud</h2><p>Se conserva la versión anterior y el motivo. La solicitud vuelve a revisión; estos datos no confirman una reserva.</p>
        {!abierto ? <button className="boton-visitante cred-boton-contorno" onClick={() => setAbierto(true)}>Editar datos solicitados</button> :
            <form onSubmit={e => void guardar(e)}><fieldset disabled={guardando} className="tramites-campos">
                <label>Espacio solicitado<select name="areaId" value={areaId} onChange={e => setAreaId(e.target.value)} required={s.tipo === 'uso_espacio'}><option value="">Por acordar con la biblioteca</option>{areas.map(a => <option key={a.slug} value={a.slug}>{a.nombre}</option>)}</select></label>
                <label>Fecha<input name="fecha" type="date" required defaultValue={diaLocal(s.inicio)} /></label>
                <label>Inicio<input name="inicio" type="time" required defaultValue={horaLocal(s.inicio)} /></label>
                <label>Término<input name="fin" type="time" required defaultValue={horaLocal(s.fin)} /></label>
                <label>Personas<input name="personas" type="number" min={1} max={200} required defaultValue={s.personas} /></label>
                <label>Descripción de la actividad<textarea name="motivo" required maxLength={300} defaultValue={s.motivo} /></label>
                <label>Institución<input name="institucion" maxLength={150} defaultValue={s.institucion ?? ''} /></label>
                <label>Motivo de la corrección<textarea name="motivoCambio" required maxLength={1000} /></label>
                <button>{guardando ? 'Guardando…' : 'Guardar corrección y reenviar'}</button>
                <button type="button" onClick={() => setAbierto(false)}>Mantener datos actuales</button>
            </fieldset></form>}
        {error && <p role="alert">{error}</p>}
    </section>;
}
