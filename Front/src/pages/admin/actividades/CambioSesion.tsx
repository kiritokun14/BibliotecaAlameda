import { useEffect, useRef, useState, type FormEvent } from 'react';
import { consultarEspaciosAgenda, resolverSesion, type ActividadGestion } from '../../../servicios/actividades';
import { mensajeError } from '../../../servicios/api';
import '../../publico/tramites/Tramites.css';

type Sesion = ActividadGestion['sesiones'][number];

export function CambioSesion({ actividad, sesion, alGuardar }: {
    actividad: ActividadGestion; sesion: Sesion; alGuardar: (mensaje: string) => void;
}) {
    const [accion, elegir] = useState<'reprogramar' | 'cancelar'>();
    const [espacios, setEspacios] = useState<{ nombre: string; capacidad: number }[]>([]);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);

    useEffect(() => {
        if (accion !== 'reprogramar') return;
        let vigente = true;
        consultarEspaciosAgenda().then(datos => { if (vigente) setEspacios(datos); })
            .catch(e => { if (vigente) setError(mensajeError(e)); });
        return () => { vigente = false; };
    }, [accion]);

    async function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!accion || bloqueo.current) return;
        const f = new FormData(e.currentTarget);
        const valor = (campo: string) => String(f.get(campo) ?? '').trim();
        const motivo = valor('motivo');
        if (!motivo) return setError('Escribe el motivo.');
        bloqueo.current = true;
        setGuardando(true);
        setError('');
        try {
            const resultado = await resolverSesion(actividad, sesion.id, accion === 'cancelar' ? { accion, motivo } :
                { accion, motivo, fecha: valor('fecha'), inicio: valor('inicio'), fin: valor('fin'), espacio: valor('espacio') });
            alGuardar(`Sesión ${accion === 'cancelar' ? 'cancelada' : 'reprogramada'}. Avisos en el portal: ${resultado.avisos}. Folio: ${resultado.folioCambio}.`);
        } catch (e) { setError(mensajeError(e)); }
        finally { setGuardando(false); bloqueo.current = false; }
    }

    return <div>
        {!accion && <div className="cn-acciones">
            <button className="boton-panel" onClick={() => elegir('reprogramar')}>Reprogramar sesión</button>
            <button className="boton-panel" onClick={() => elegir('cancelar')}>Cancelar sesión</button>
        </div>}
        {accion && <form key={accion} onSubmit={guardar}>
            <fieldset className="tramites-campos" disabled={guardando}>
                <legend>{accion === 'reprogramar' ? 'Reprogramar sesión' : 'Cancelar sesión'}</legend>
                {accion === 'reprogramar' && <>
                    <label>Nueva fecha<input name="fecha" type="date" defaultValue={sesion.fecha} required /></label>
                    <label>Inicio en Tepic<input name="inicio" type="time" defaultValue={sesion.inicio} required /></label>
                    <label>Fin en Tepic<input name="fin" type="time" defaultValue={sesion.fin} required /></label>
                    <label>Espacio<select name="espacio" required defaultValue="">
                        <option value="">Selecciona un espacio</option>
                        {espacios.filter(e => e.capacidad >= sesion.cupo).map(e => <option key={e.nombre}>{e.nombre}</option>)}
                    </select></label>
                </>}
                <label>Motivo<textarea name="motivo" required maxLength={1000} /></label>
                <label><input type="checkbox" required /> Confirmo el cambio y el aviso en el portal a las personas inscritas.</label>
                <button className="boton-panel" disabled={accion === 'reprogramar' && espacios.length === 0}>
                    {guardando ? 'Guardando…' : accion === 'cancelar' ? 'Confirmar cancelación' : 'Guardar nueva programación'}
                </button>
                <button type="button" onClick={() => { elegir(undefined); setError(''); }}>Volver</button>
            </fieldset>
        </form>}
        {error && <p role="alert">{error}</p>}
    </div>;
}
