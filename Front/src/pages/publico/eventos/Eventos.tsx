import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import PaginaPublica from '../../../components/portal/PaginaPublica';
import { consultarActividadPublica, consultarAgenda, type ActividadPublica, type ListaAgenda } from '../../../servicios/actividades';
import { mensajeError } from '../../../servicios/api';
import './Eventos.css';
import './AgendaReal.css';

export default function Eventos() {
    const { id: parametro } = useParams();
    const id = ['todas', 'calendario'].includes(parametro ?? '') ? undefined : parametro;
    const [parametros, setParametros] = useSearchParams();
    const [recarga, recargar] = useState(0);
    const desde = parametros.get('desde') ?? '';
    const hasta = parametros.get('hasta') ?? '';
    const busqueda = parametros.get('busqueda') ?? '';
    const tipo = parametros.get('tipo') ?? '';
    const pagina = Math.max(0, Number(parametros.get('pagina')) || 0);
    const clave = JSON.stringify([id, desde, hasta, busqueda, tipo, pagina, recarga]);
    const [resultado, setResultado] = useState<{ clave: string; lista?: ListaAgenda; actividad?: ActividadPublica; error?: string }>({ clave: '' });
    const actual = resultado.clave === clave ? resultado : undefined;
    useEffect(() => {
        let vigente = true;
        const consulta = id ? consultarActividadPublica(id).then(actividad => ({ actividad }))
            : consultarAgenda({ desde, hasta, busqueda, tipo, pagina, limite: 12 }).then(lista => ({ lista }));
        consulta.then(datos => { if (vigente) setResultado({ clave, ...datos }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, id, desde, hasta, busqueda, tipo, pagina]);
    function filtrar(datos: FormData) {
        const siguiente = new URLSearchParams();
        for (const campo of ['desde', 'hasta', 'tipo', 'busqueda']) {
            const valor = String(datos.get(campo) ?? '').trim();
            if (valor) siguiente.set(campo, valor);
        }
        setParametros(siguiente);
    }
    function ir(numero: number) {
        const siguientes = new URLSearchParams(parametros); siguientes.set('pagina', String(numero)); setParametros(siguientes);
    }
    return <PaginaPublica><div className="agenda-publica">
        <Link to={id ? '/eventos' : '/'}>{id ? '← Volver a la agenda' : '← Volver al inicio'}</Link>
        <p><Link to="/proponer-evento">Proponer un evento o club</Link> · <Link to="/mis-tramites/propuestas">Consultar mis propuestas</Link></p>
        <h1>{id ? 'Detalle de la actividad' : 'Agenda de actividades'}</h1>
        <p>Consulta fechas, horarios, espacios y requisitos sin iniciar sesión. Horarios de Tepic, Nayarit.</p>
        {!id && <form key={`${desde}:${hasta}:${busqueda}:${tipo}`} className="agenda-filtros" onSubmit={e => { e.preventDefault(); filtrar(new FormData(e.currentTarget)); }}>
            <label>Desde<input type="date" name="desde" defaultValue={desde} /></label>
            <label>Hasta<input type="date" name="hasta" defaultValue={hasta} /></label>
            <label>Tipo<select name="tipo" defaultValue={tipo}><option value="">Todos</option>{['Taller', 'Club', 'Curso', 'Charla', 'Visita', 'Cuentacuentos', 'Presentación', 'Exposición'].map(t => <option key={t}>{t}</option>)}</select></label>
            <label>Buscar por nombre<input name="busqueda" maxLength={100} defaultValue={busqueda} /></label>
            <button type="submit">Buscar actividades</button><Link to="/eventos">Limpiar filtros</Link>
        </form>}
        {!actual && <p role="status">Consultando agenda…</p>}
        {actual?.error && <div role="alert"><p>{actual.error}</p><button onClick={() => recargar(x => x + 1)}>Reintentar</button></div>}
        {actual?.lista && <>
            <p role="status">{actual.lista.total} actividades encontradas</p>
            {actual.lista.actividades.length === 0 && <p>No hay actividades publicadas para esos filtros.</p>}
            <div className="agenda-lista">{actual.lista.actividades.map(a => <article className="agenda-tarjeta" key={a.folio}>
                <p>{a.tipo}</p><h2><Link to={`/eventos/${a.folio}`}>{a.nombre}</Link></h2><p>{a.descripcion}</p>
                {a.sesiones.filter(s => (!desde || s.fecha >= desde) && (!hasta || s.fecha <= hasta)).map(s => <p key={s.id}>{s.fecha} · {s.inicio} a {s.fin} · {s.espacio}{s.estado === 'cancelada' ? ' · Sesión cancelada' : ''}</p>)}
            </article>)}</div>
            <nav aria-label="Páginas de la agenda"><button disabled={pagina === 0} onClick={() => ir(pagina - 1)}>Anterior</button>
                <span> Página {pagina + 1} de {Math.max(1, Math.ceil(actual.lista.total / 12))} </span>
                <button disabled={(pagina + 1) * 12 >= actual.lista.total} onClick={() => ir(pagina + 1)}>Siguiente</button></nav>
        </>}
        {actual?.actividad && <Detalle actividad={actual.actividad} />}
    </div></PaginaPublica>;
}

function Detalle({ actividad: a }: { actividad: ActividadPublica }) {
    return <article className="agenda-tarjeta"><p>{a.tipo} · {a.folio}</p><h2>{a.nombre}</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{a.descripcion}</p>
        <dl><dt>Público</dt><dd>{a.publico}</dd><dt>Área o responsable</dt><dd>{a.responsable || 'Consulta con la biblioteca'}</dd>
            <dt>Materiales y requisitos</dt><dd>{a.materiales || 'Sin requisitos adicionales'}</dd>
            <dt>Participación</dt><dd>{a.inscripcion ? 'Requiere inscripción; consultar una actividad no reserva un lugar.' : 'Entrada libre, sujeta al cupo del espacio.'}</dd></dl>
        <h3>Sesiones y avisos</h3>{a.sesiones.map(s => <section key={s.id}><h4>{s.fecha} · {s.inicio} a {s.fin}</h4>
            <p>{s.espacio} · cupo {s.cupo}</p><p>{s.estado === 'cancelada' ? 'Aviso: esta sesión está cancelada.' : s.estado === 'finalizada' ? 'Sesión finalizada.' : s.estado === 'en_curso' ? 'Sesión en curso.' : 'Sesión programada.'}</p>
        </section>)}
        <p>Para gestionar tu participación, consulta al personal de la biblioteca. Esta pantalla no realiza inscripciones.</p>
    </article>;
}
