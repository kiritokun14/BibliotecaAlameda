import { datosPublicosPropuesta } from '../src/servicios/publicacionPropuestas';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => cliente }));
import { publicarPropuesta, enviarPropuesta, listarTramites, resolverTramite, solicitarCredencial, type SolicitudAtencion } from '../src/servicios/tramites';
import { capacidadPanel } from '../src/servicios/accesoPanel';
import { invalidarConsultas } from '../src/servicios/consultas';
import { registrarPropuestaUsuario } from '../src/servicios/propuestasUsuario';
import { propuestaVacia } from '../src/pages/publico/proponer/datos';
const peticiones = vi.fn();
const solicitud = { id: 'solicitud', actualizadoEn: '2026-11-05T12:00:00Z', actualizadaEn: '2026-11-05T13:00:00Z' } as SolicitudAtencion;
const propuesta = { tituloPropuesta: 'Club', descripcion: 'Lecturas', tipoPropuesta: 'Club', publicoDirigido: 'General', necesidadEspacio: 'Sala', frecuenciaReunion: 'Semanal', diasSolicitados: 'Viernes', horarioSolicitado: '16:00', abiertaAlPublico: true, sinFinesDeLucro: true };
beforeEach(() => {
    vi.clearAllMocks(); invalidarConsultas();
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'sesion' } } });
    peticiones.mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith('/configuracion')
        ? { url: 'https://ejemplo.supabase.co', clavePublicable: 'sb_publishable_prueba' } : { total: 0, solicitudes: [] }), { status: 200 }));
    vi.stubGlobal('fetch', peticiones);
});
afterEach(() => vi.unstubAllGlobals());
it('las rutas usan un solo prefijo api y el titular se decide en el servidor', async () => {
    await solicitarCredencial('obtencion', ' Consulta ');
    const [ruta, opciones] = peticiones.mock.calls.find(([url]) => url.includes('/credenciales/solicitudes'))!;
    expect(ruta).toBe('/api/credenciales/solicitudes');
    expect(JSON.parse(opciones.body)).toEqual({ tipoSolicitud: 'obtencion', observaciones: 'Consulta' });
    expect(opciones.headers.Authorization).toBe('Bearer sesion');
});
it('el formulario diseñado recibe el folio del servidor y propaga fallos de envío', async () => {
    const datos = { ...propuestaVacia('Ana', '3110000000'), titulo: 'Club', descripcion: 'Lectura', publico: 'General', participantes: '12', abiertaAlPublico: true, sinFinesDeLucro: true, acepta: true };
    peticiones.mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith('/configuracion')
        ? { url: 'https://ejemplo.supabase.co', clavePublicable: 'sb_publishable_prueba' }
        : { id: 'folio-servidor', estadoRevision: 'en_revision', historial: [] }), { status: 200 }));
    expect(await registrarPropuestaUsuario(datos)).toMatchObject({ id: 'folio-servidor', estadoRevision: 'en_revision' });
    const llamada = peticiones.mock.calls.find(([url, opciones]) => url === '/api/propuestas' && opciones?.method === 'POST')!;
    expect(JSON.parse(llamada[1].body)).toMatchObject({ tituloPropuesta: 'Club', abiertaAlPublico: true, sinFinesDeLucro: true });
    peticiones.mockResolvedValue(new Response(JSON.stringify({ detail: 'No disponible' }), { status: 503 }));
    await expect(registrarPropuestaUsuario(datos)).rejects.toMatchObject({ estado: 503 });
});
it('la corrección del usuario no usa el endpoint de resolución del personal', async () => {
    await enviarPropuesta(propuesta, solicitud);
    const [ruta, opciones] = peticiones.mock.calls.find(([url]) => url.endsWith('/corregir'))!;
    expect(ruta).toBe('/api/propuestas/solicitud/corregir');
    expect(opciones.method).toBe('PUT');
    expect(JSON.parse(opciones.body)).toMatchObject({ actualizadoEn: solicitud.actualizadoEn, abiertaAlPublico: true, sinFinesDeLucro: true });
});
it('las decisiones conservan la versión de su tipo de solicitud', async () => {
    await resolverTramite('credencial', solicitud, 'cita_programada', 'Cita', '2035-06-12T17:00:00Z');
    await resolverTramite('propuesta', solicitud, 'requiere_correccion', 'Aclara el horario');
    const llamadas = peticiones.mock.calls.filter(([,opciones]) => opciones?.method === 'PATCH');
    expect(JSON.parse(llamadas[0][1].body)).toMatchObject({ actualizadaEn: solicitud.actualizadaEn, fechaCita: '2035-06-12T17:00:00Z' });
    expect(JSON.parse(llamadas[1][1].body)).toMatchObject({ actualizadoEn: solicitud.actualizadoEn, observacionesInstitucionales: 'Aclara el horario' });
});
it('las consultas son paginadas y propias no envían filtros de personal', async () => {
    await listarTramites('propuesta', true, 2, 'aprobada', 'Otra persona');
    const ruta = peticiones.mock.calls.find(([url]) => url.includes('/propuestas/me'))![0];
    expect(ruta).toContain('desplazamiento=40');
    expect(ruta).not.toContain('estadoRevision');
    expect(ruta).not.toContain('Otra');
});
it('envía el acuerdo de dirección separado del motivo y sin imponer al registrador', async () => {
    const acuerdo = { responsable: 'Dirección de la biblioteca', fecha: '2026-01-01', referencia: 'Oficio 001' };
    await resolverTramite('propuesta', solicitud, 'aprobada', ' Acuerdo favorable ', undefined, acuerdo);
    const llamada = peticiones.mock.calls.find(([,opciones]) => opciones?.method === 'PATCH')!;
    expect(JSON.parse(llamada[1].body)).toEqual({ estadoRevision: 'aprobada', actualizadoEn: solicitud.actualizadoEn, observacionesInstitucionales: 'Acuerdo favorable', acuerdoDireccion: acuerdo });
});
it('sin sesión no consulta solicitudes privadas', async () => {
    cliente.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(listarTramites('credencial', true)).rejects.toMatchObject({ estado: 401 });
    expect(peticiones.mock.calls.some(([url]) => url.includes('/credenciales'))).toBe(false);
});
it('conflictos o permisos denegados no se convierten en éxitos', async () => {
    peticiones.mockResolvedValue(new Response(JSON.stringify({ detail: 'Recarga' }), { status: 409 }));
    await expect(resolverTramite('propuesta', solicitud, 'aprobada', '')).rejects.toMatchObject({ estado: 409 });
});
it('todas las pantallas de resolución usan la capacidad institucional correcta', () => {
    expect(capacidadPanel('/admin/atencion/propuestas')).toBe('registrar_resoluciones_actividades');
    expect(capacidadPanel('/admin/atencion/propuestas/id/publicar')).toBe('publicar_contenidos');
    expect(capacidadPanel('/admin/atencion/credenciales/id')).toBe('validar_credenciales');
});

it('publica la propuesta con versión y confirmación, sin resolverla nuevamente', async () => {
    const datos = datosPublicosPropuesta({ ...solicitud, tituloPropuesta: 'Taller', descripcion: 'Lectura pública\n\nDatos de la propuesta:\nTeléfono de contacto: 3110000000', diasSolicitados: '2035-06-12', horarioSolicitado: '10:00 a 11:00 (hora de Tepic)' });
    expect(datos.descripcion).toBe('Lectura pública');
    expect(datos.inicio).toBe('10:00');
    expect(datos.responsable).toBe('');
    expect(datos.cupo).toBe('');
    await publicarPropuesta(solicitud, datos);
    const [ruta, opciones] = peticiones.mock.calls.find(([url]) => url.endsWith('/publicar'))!;
    expect(ruta).toBe('/api/propuestas/solicitud/publicar');
    expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body)).toMatchObject({ actualizadoEn: solicitud.actualizadoEn, confirmacion: true, descripcion: 'Lectura pública' });
    expect(opciones.body).not.toContain('3110000000');
});
