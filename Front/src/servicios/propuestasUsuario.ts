import type { DatosPropuesta } from '../pages/publico/proponer/datos';
import { enviarPropuesta, type DatosPropuesta as EntradaServidor } from './tramites';

export function fechaHoyTepic(fecha = new Date()) {
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(fecha);
    const valor = (tipo: string) => partes.find(p => p.type === tipo)!.value;
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

// Los datos complementarios se conservan como texto identificado en la descripción,
// porque el contrato vigente no tiene columnas independientes para esos campos.
export function adaptarPropuesta(datos: DatosPropuesta): EntradaServidor {
    return {
        tituloPropuesta: datos.titulo.trim(),
        descripcion: `${datos.descripcion.trim()}\n\nDatos de la propuesta:\nParticipantes estimados: ${datos.participantes}\nFecha propuesta: ${datos.fecha || 'Por acordar'}\nMaterial solicitado: ${datos.material.trim() || 'No especificado'}\nPersona responsable: ${datos.responsable.trim()}\nTeléfono de contacto: ${datos.telefono.trim()}`,
        tipoPropuesta: datos.tipo === 'club' ? 'Club' : 'Evento', publicoDirigido: datos.publico,
        necesidadEspacio: datos.espacio || 'Por acordar con la biblioteca',
        frecuenciaReunion: datos.tipo === 'club' ? 'Regularidad por acordar con la biblioteca' : 'Única',
        diasSolicitados: datos.fecha || 'Por acordar con la biblioteca',
        horarioSolicitado: datos.horaInicio && datos.horaFin ? `${datos.horaInicio} a ${datos.horaFin} (hora de Tepic)` : 'Por acordar con la biblioteca',
        abiertaAlPublico: datos.abiertaAlPublico, sinFinesDeLucro: datos.sinFinesDeLucro,
    };
}

export function registrarPropuestaUsuario(datos: DatosPropuesta) {
    return enviarPropuesta(adaptarPropuesta(datos));
}
