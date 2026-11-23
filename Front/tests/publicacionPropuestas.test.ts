import { expect, it } from 'vitest';
import { datosPublicosPropuesta } from '../src/servicios/publicacionPropuestas';
import type { SolicitudAtencion } from '../src/servicios/tramites';

it('precarga cupo y material sin publicar los datos privados de la propuesta', () => {
    const solicitud = {
        tituloPropuesta: 'Taller', tipoPropuesta: 'Evento', publicoDirigido: 'Todo público',
        descripcion: 'Lectura pública\n\nDatos de la propuesta:\nParticipantes estimados: 24\nMaterial solicitado: Mesas\nPersona responsable: Persona privada\nTeléfono de contacto: 3110000000',
        diasSolicitados: '2035-06-12', horarioSolicitado: '10:00 a 11:00 (hora de Tepic)',
    } as SolicitudAtencion;
    const datos = datosPublicosPropuesta(solicitud);
    expect(datos).toMatchObject({ descripcion: 'Lectura pública', cupo: '24', materiales: 'Mesas', responsable: '' });
    expect(JSON.stringify(datos)).not.toContain('3110000000');
    expect(JSON.stringify(datos)).not.toContain('Persona privada');
});
