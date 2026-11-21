// Atención › Propuestas de eventos › Programar y publicar la propuesta aprobada (datos reales).
// Diseño común del panel (docs/guia-diseno.md): tarjeta, campos de 44 px, botones del panel. La lógica no cambia.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Tarjeta } from '../../componentes';
import { consultarEspaciosAgenda, type DatosActividadReal } from '../../../../servicios/actividades';
import { publicarPropuesta, type SolicitudAtencion } from '../../../../servicios/tramites';
import { mensajeError } from '../../../../servicios/api';
import { datosPublicosPropuesta } from '../../../../servicios/publicacionPropuestas';
import { fechaHoyTepic } from '../../../../servicios/propuestasUsuario';
import tarjetaCalendario from '../../../../assets/admin/tarjeta-calendar.svg';
import '../AtencionTramites.css';

const ETIQUETAS = {
    nombre: 'Nombre público', tipo: 'Tipo', descripcion: 'Descripción pública', fecha: 'Fecha de la sesión (Tepic)', inicio: 'Inicio', fin: 'Término',
    cupo: 'Cupo', publico: 'Público dirigido', responsable: 'Área o responsable público', materiales: 'Materiales o requisitos',
} as const;
type Campo = keyof typeof ETIQUETAS;

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

    if (folio) return (
        <div className="at-bloque at-bloque--info" role="status">
            <strong>Actividad publicada: {folio}</strong>
            <p>La propuesta quedó vinculada a la actividad y a su primera sesión.</p>
            <p className="tr-acciones tr-acciones--separado">
                <Link className="contenidos-boton contenidos-boton--oscuro contenidos-boton--chico" to={`/eventos/${folio}`}>Ver actividad publicada</Link>
                <Link className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" to="/eventos">Ver próximas actividades</Link>
            </p>
        </div>
    );
    if (solicitud.actividadId) return (
        <div className="at-bloque"><strong>Ya tiene una actividad vinculada</strong>
            <p>No se creará otra. <Link to="/eventos/todas">Consultar la agenda</Link></p></div>
    );

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
    const campo = (c: Campo) => {
        const id = `publicar-${c}`;
        const obligatorio = c !== 'materiales';
        const etiqueta = <label htmlFor={id}>{ETIQUETAS[c]}{obligatorio && <span className="contenidos-campo__obligatorio"> *</span>}</label>;
        if (c === 'descripcion' || c === 'materiales') return (
            <div className="contenidos-campo" key={c}>{etiqueta}
                <textarea id={id} rows={c === 'descripcion' ? 4 : 2} maxLength={1000} required={c === 'descripcion'} value={datos[c]} onChange={e => cambiar(c, e.target.value)} />
                {c === 'descripcion' && <span className="contenidos-campo__ayuda">Sin teléfonos ni datos privados.</span>}
            </div>
        );
        return (
            <div className="contenidos-campo" key={c}>{etiqueta}
                <input id={id} className="tr-entrada" required value={datos[c]}
                    type={c === 'fecha' ? 'date' : c === 'inicio' || c === 'fin' ? 'time' : c === 'cupo' ? 'number' : 'text'}
                    min={c === 'fecha' ? fechaHoyTepic() : c === 'cupo' ? 1 : undefined}
                    max={c === 'cupo' ? espacios?.find(s => s.nombre === datos.espacio)?.capacidad : undefined}
                    maxLength={c === 'tipo' ? 80 : 150} onChange={e => cambiar(c, e.target.value)} />
            </div>
        );
    };

    return (
        <Tarjeta icono={tarjetaCalendario} titulo="Programar y publicar la propuesta aprobada"
            subtitulo="Confirma los datos públicos y una primera sesión. La aprobación se conserva; no se generan fechas recurrentes.">
            <form onSubmit={enviar}>
                <fieldset disabled={guardando} className="tr-campos">
                    <legend className="tr-oculto">Datos de la actividad</legend>
                    {campo('nombre')}
                    <div className="at-fila">{campo('tipo')}{campo('publico')}</div>
                    {campo('descripcion')}
                    <div className="at-fila">{campo('fecha')}{campo('inicio')}{campo('fin')}</div>
                    <div className="at-fila">
                        <div className="contenidos-campo"><label htmlFor="publicar-espacio">Espacio confirmado <span className="contenidos-campo__obligatorio">*</span></label>
                            <select id="publicar-espacio" required value={datos.espacio} onChange={e => cambiar('espacio', e.target.value)}>
                                <option value="">{espacios ? 'Selecciona un espacio' : 'Cargando espacios…'}</option>
                                {espacios?.map(s => <option key={s.nombre} value={s.nombre}>{s.nombre} · capacidad {s.capacidad}</option>)}
                            </select></div>
                        {campo('cupo')}
                    </div>
                    {campo('responsable')}
                    {campo('materiales')}
                    <label className="at-casilla"><input type="checkbox" checked={datos.inscripcion} onChange={e => cambiar('inscripcion', e.target.checked)} /> Requiere inscripción</label>
                    <label className="at-casilla"><input type="checkbox" required /> Confirmo la programación y que el texto público no contiene datos privados.</label>
                    {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se publicó</strong><p>{error} Si cambió la solicitud, vuelve a abrirla para cargar su versión actual.</p></div>}
                    <div className="tr-acciones">
                        <button className="contenidos-boton contenidos-boton--oscuro" disabled={!espacios}>{guardando ? 'Publicando…' : 'Publicar en Eventos'}</button>
                    </div>
                </fieldset>
            </form>
        </Tarjeta>
    );
}
