import { useEffect, useRef, useState, type FormEvent } from 'react';
import { consultarEspaciosAgenda, resolverSesion, type ActividadGestion } from '../../../servicios/actividades';
import { mensajeError } from '../../../servicios/api';
import '../atencion/AtencionTramites.css';

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

    const id = (campo: string) => `sesion-${sesion.id}-${campo}`;
    return <div className="tr-cambio-sesion">
        {!accion && <div className="tr-acciones">
            <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => elegir('reprogramar')}>Reprogramar sesión</button>
            <button type="button" className="contenidos-boton at-boton--guinda contenidos-boton--chico" onClick={() => elegir('cancelar')}>Cancelar sesión</button>
        </div>}
        {accion && <form key={accion} onSubmit={guardar}>
            <fieldset className="tr-campos" disabled={guardando}>
                <legend className="at-subtitulo">{accion === 'reprogramar' ? 'Reprogramar sesión' : 'Cancelar sesión'}</legend>
                {accion === 'reprogramar' && <>
                    <div className="at-fila">
                        <div className="contenidos-campo"><label htmlFor={id('fecha')}>Nueva fecha</label><input id={id('fecha')} className="tr-entrada" name="fecha" type="date" defaultValue={sesion.fecha} required /></div>
                        <div className="contenidos-campo"><label htmlFor={id('inicio')}>Inicio (Tepic)</label><input id={id('inicio')} className="tr-entrada" name="inicio" type="time" defaultValue={sesion.inicio} required /></div>
                        <div className="contenidos-campo"><label htmlFor={id('fin')}>Fin (Tepic)</label><input id={id('fin')} className="tr-entrada" name="fin" type="time" defaultValue={sesion.fin} required /></div>
                    </div>
                    <div className="contenidos-campo"><label htmlFor={id('espacio')}>Espacio</label>
                        <select id={id('espacio')} name="espacio" required defaultValue="">
                            <option value="">{espacios.length ? 'Selecciona un espacio' : 'Cargando espacios…'}</option>
                            {espacios.filter(e => e.capacidad >= sesion.cupo).map(e => <option key={e.nombre}>{e.nombre}</option>)}
                        </select></div>
                </>}
                <div className="contenidos-campo"><label htmlFor={id('motivo')}>Motivo <span className="contenidos-campo__obligatorio">*</span></label>
                    <textarea id={id('motivo')} name="motivo" rows={2} required maxLength={1000} /></div>
                <label className="at-casilla"><input type="checkbox" required /> Confirmo el cambio y el aviso en el portal a las personas inscritas.</label>
                <div className="tr-acciones">
                    <button className={`contenidos-boton contenidos-boton--chico ${accion === 'cancelar' ? 'at-boton--guinda-lleno' : 'contenidos-boton--oscuro'}`} disabled={accion === 'reprogramar' && espacios.length === 0}>
                        {guardando ? 'Guardando…' : accion === 'cancelar' ? 'Confirmar cancelación' : 'Guardar nueva programación'}
                    </button>
                    <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => { elegir(undefined); setError(''); }}>Volver</button>
                </div>
            </fieldset>
        </form>}
        {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se guardó el cambio</strong><p>{error}</p></div>}
    </div>;
}
