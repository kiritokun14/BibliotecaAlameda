import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { CampoTexto } from '../../contenidoDemo/piezas';
import { consultarEspaciosAgenda, type DatosActividadReal } from '../../../../servicios/actividades';
import { publicarPropuesta, type SolicitudAtencion } from '../../../../servicios/tramites';
import { mensajeError } from '../../../../servicios/api';
import { datosPublicosPropuesta } from '../../../../servicios/publicacionPropuestas';
import { fechaHoyTepic } from '../../../../servicios/propuestasUsuario';


export default function PublicarPropuesta({ solicitud }: { solicitud: SolicitudAtencion }) {
    const [datos, setDatos] = useState(() => datosPublicosPropuesta(solicitud));
    const [espacios, setEspacios] = useState<{ nombre: string; capacidad: number }[]>();
    const [error, setError] = useState(''); const [guardando, setGuardando] = useState(false);
    const [folio, setFolio] = useState(''); const bloqueo = useRef(false);
    useEffect(() => {
        let vigente = true;
        consultarEspaciosAgenda().then(r => { if (vigente) setEspacios(r); })
            .catch(e => { if (vigente) setError(mensajeError(e)); });
        return () => { vigente = false; };
    }, []);
    if (folio) return <section role="status"><h3>Actividad publicada: {folio}</h3>
        <p>La propuesta quedó vinculada a la actividad y su sesión en la BD.</p>
        <Link className="boton-panel" to={`/eventos/${folio}`}>Ver actividad publicada</Link>
        <p><Link to="/eventos">Ver próximas actividades</Link></p></section>;
    if (solicitud.actividadId) return <p>Ya tiene una actividad vinculada; no se creará otra. <Link to="/eventos/todas">Consultar agenda</Link></p>;
    const cambiar = (campo: keyof DatosActividadReal, valor: string | boolean) => setDatos(d => ({ ...d, [campo]: valor }));
    async function enviar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); if (bloqueo.current) return;
        setError('');
        if (datos.fin <= datos.inicio) return setError('La hora de término debe ser posterior al inicio.');
        bloqueo.current = true; setGuardando(true);
        try { const resultado = await publicarPropuesta(solicitud, datos); setFolio(resultado.folio); }
        catch (e) { setError(mensajeError(e)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    return <form onSubmit={enviar} className="cn-tarjeta"><h3>Programar y publicar la propuesta aprobada</h3>
        <p>Confirma los datos públicos y una primera sesión. La aprobación institucional existente se conserva. No se generan fechas recurrentes automáticamente.</p>
        <fieldset disabled={guardando} className="tramites-campos">
            {(['nombre', 'tipo', 'descripcion', 'fecha', 'inicio', 'fin', 'cupo', 'publico', 'responsable', 'materiales'] as const).map(campo => {
                const etiquetas = { nombre: 'Nombre público', tipo: 'Tipo', descripcion: 'Descripción pública (sin teléfonos ni datos privados)',
                    fecha: 'Fecha de la sesión (Tepic)', inicio: 'Inicio', fin: 'Término', cupo: 'Cupo', publico: 'Público dirigido',
                    responsable: 'Área o responsable público', materiales: 'Materiales o requisitos' };
                return <CampoTexto key={campo} id={`publicar-${campo}`} etiqueta={etiquetas[campo]} obligatorio={campo !== 'materiales'}>
                    {campo === 'descripcion' || campo === 'materiales'
                        ? <textarea id={`publicar-${campo}`} className="cn-control" maxLength={1000} required={campo === 'descripcion'} value={datos[campo]} onChange={e => cambiar(campo, e.target.value)} />
                        : <input id={`publicar-${campo}`} className="cn-control" required value={datos[campo]}
                            type={campo === 'fecha' ? 'date' : campo === 'inicio' || campo === 'fin' ? 'time' : campo === 'cupo' ? 'number' : 'text'}
                            min={campo === 'fecha' ? fechaHoyTepic() : campo === 'cupo' ? 1 : undefined}
                            max={campo === 'cupo' ? espacios?.find(s => s.nombre === datos.espacio)?.capacidad : undefined}
                            maxLength={campo === 'tipo' ? 80 : 150} onChange={e => cambiar(campo, e.target.value)} />}
                </CampoTexto>;
            })}
            <label>Espacio confirmado<select className="cn-control" required value={datos.espacio} onChange={e => cambiar('espacio', e.target.value)}>
                <option value="">Selecciona un espacio</option>
                {espacios?.map(s => <option key={s.nombre} value={s.nombre}>{s.nombre} · capacidad {s.capacidad}</option>)}
            </select></label>
            <label><input type="checkbox" checked={datos.inscripcion} onChange={e => cambiar('inscripcion', e.target.checked)} /> Requiere inscripción (su gestión en línea sigue pendiente)</label>
            <label><input type="checkbox" required /> Confirmo la programación y que el texto público no contiene datos privados.</label>
            <button className="boton-panel" disabled={!espacios}>{guardando ? 'Publicando…' : 'Publicar en Eventos'}</button>
        </fieldset>{error && <p role="alert">{error} Si cambió la solicitud, vuelve a abrirla para cargar su versión actual.</p>}
    </form>;
}
