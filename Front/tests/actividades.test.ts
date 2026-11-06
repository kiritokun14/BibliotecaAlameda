import { beforeEach, describe, expect, it } from 'vitest';
import {
    archivarActividad,
    crearActividad,
    fechaCorta,
    filtrarActividades,
    obtenerActividad,
    publicarActividad,
    reiniciarActividades,
    useActividades,
    VACIA,
    validarActividad,
} from '../src/pages/admin/actividades/datos';
import { capacidadPanel } from '../src/servicios/accesoPanel';

const completa = {
    ...VACIA, nombre: 'Taller', descripcion: 'Desc', fecha: '2026-11-12', inicio: '16:00', fin: '17:00',
    espacio: 'Sala infantil', cupo: '20', responsable: 'Fomento a la lectura',
};

describe('Validación de una actividad', () => {
    it('una actividad completa no tiene errores', () => {
        expect(validarActividad(completa)).toEqual({});
    });

    it('la hora de fin debe ser posterior al inicio', () => {
        expect(validarActividad({ ...completa, fin: '15:00' }).fin).toBe('La hora de fin debe ser posterior al inicio.');
    });

    it('el cupo no pasa la capacidad del espacio', () => {
        expect(validarActividad({ ...completa, cupo: '26' }).cupo).toBe('Máximo 25 personas en este espacio.');
        expect(validarActividad({ ...completa, cupo: '0' }).cupo).toMatch(/mayor que 0/);
    });

    it('el borrador solo exige el nombre', () => {
        expect(validarActividad({ ...VACIA, nombre: 'Algo' }, true)).toEqual({});
        expect(validarActividad(VACIA, true).nombre).toBeDefined();
    });
});

describe('Flujo de propuestas', () => {
    beforeEach(() => reiniciarActividades());

    it('una actividad nueva recibe el siguiente folio', () => {
        expect(crearActividad(completa, 'en-revision')).toBe('AC-0109');
        expect(obtenerActividad('AC-0109')?.estado).toBe('en-revision');
    });

    it('solo se publica lo aprobado', async () => {
        await expect(publicarActividad('AC-0107')).rejects.toThrow();
        await publicarActividad('AC-0106');
        expect(obtenerActividad('AC-0106')?.estado).toBe('publicada');
    });

    it('archivar pide motivo y no aplica a publicadas', () => {
        expect(() => archivarActividad('AC-0106', ' ')).toThrow();
        expect(() => archivarActividad('AC-0108', 'x')).toThrow();
        archivarActividad('AC-0106', 'Ya no se realizará');
        expect(obtenerActividad('AC-0106')?.estado).toBe('archivada');
    });

    it('"Todas" no muestra las archivadas y se busca por folio o nombre', () => {
        archivarActividad('AC-0105', 'x');
        const todas = ['AC-0100', 'AC-0101', 'AC-0102', 'AC-0103', 'AC-0104', 'AC-0105', 'AC-0106', 'AC-0107', 'AC-0108'].map((f) => obtenerActividad(f)!);
        expect(filtrarActividades(todas, 'todas', '').some((a) => a.folio === 'AC-0105')).toBe(false);
        expect(filtrarActividades(todas, 'todas', 'tepic').map((a) => a.folio)).toEqual(['AC-0106']);
        expect(filtrarActividades(todas, 'todas', 'ac-0108').map((a) => a.folio)).toEqual(['AC-0108']);
    });
});

describe('Formatos y permisos', () => {
    it('fecha corta', () => {
        expect(fechaCorta('2026-11-12')).toBe('12 nov 2026');
        expect(fechaCorta('')).toBe('Por definir');
    });

    it('Actividades distingue gestión, inscripciones, asistencia y evidencias', () => {
        expect(capacidadPanel('/admin/actividades/propuestas')).toBe('gestionar_actividades');
        expect(capacidadPanel('/admin/actividades/calendario')).toBe('gestionar_actividades');
        expect(capacidadPanel('/admin/actividades/asistencia')).toBe('registrar_asistencia');
        expect(capacidadPanel('/admin/actividades/inscripciones')).toBe('confirmar_inscripciones');
        expect(capacidadPanel('/admin/actividades/evidencias')).toBe('gestionar_evidencias');
    });

    it('el almacén se puede usar como hook', () => {
        expect(typeof useActividades).toBe('function');
    });
});

import { celdasDelMes, conflictoBloqueo, diaLargo, eventosDelDia, ocupacion, semanaDe } from '../src/pages/admin/actividades/calendario';
import { guardarBloqueo, leerSalas, quitarBloqueo, reiniciarSalas, validarBloqueo } from '../src/pages/admin/actividades/salas';

describe('Calendario y salas', () => {
    beforeEach(() => { reiniciarActividades(); reiniciarSalas(); });
    const actividades = () => ['AC-0101', 'AC-0106', 'AC-0104'].map((f) => obtenerActividad(f)!);

    it('detecta el choque de un bloqueo con una actividad', () => {
        const base = { sala: 'Auditorio', fecha: '2026-11-19', motivo: 'Mantenimiento' };
        expect(conflictoBloqueo({ ...base, desde: '17:00', hasta: '19:00' }, actividades())?.folio).toBe('AC-0106');
        expect(conflictoBloqueo({ ...base, desde: '09:00', hasta: '11:00' }, actividades())).toBeUndefined();
        expect(conflictoBloqueo({ ...base, desde: '', hasta: '' }, actividades())?.folio).toBe('AC-0106');
    });

    it('una actividad cancelada ya no ocupa la sala', () => {
        expect(conflictoBloqueo({ sala: 'Sala infantil', fecha: '2026-10-24', desde: '', hasta: '', motivo: 'x' }, actividades())).toBeUndefined();
    });

    it('ocupación por bloque de dos horas', () => {
        expect(ocupacion('Auditorio', '2026-11-19', '17:00', actividades(), []).texto).toBe('Charla');
        expect(ocupacion('Auditorio', '2026-11-19', '09:00', actividades(), []).tipo).toBe('libre');
        const bloqueo = { id: 'b', sala: 'Auditorio', fecha: '2026-11-19', desde: '', hasta: '', motivo: 'x' };
        expect(ocupacion('Auditorio', '2026-11-19', '09:00', actividades(), [bloqueo]).tipo).toBe('bloqueada');
    });

    it('la agenda del día pone "todo el día" al final', () => {
        const bloqueo = { id: 'b', sala: 'Sala B', fecha: '2026-11-19', desde: '', hasta: '', motivo: 'Mantenimiento (ejemplo)' };
        const ev = eventosDelDia('2026-11-19', actividades(), [bloqueo]);
        expect(ev.map((e) => e.clase)).toEqual(['actividad', 'bloqueo']);
    });

    it('el mes empieza en lunes y la semana va de lunes a viernes', () => {
        const celdas = celdasDelMes(2026, 9); // octubre 2026 empieza en jueves
        expect(celdas.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
        expect(celdas.length % 7).toBe(0);
        expect(semanaDe('2026-10-28')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
        expect(diaLargo('2026-10-27')).toBe('Martes 27 de octubre');
    });

    it('valida, guarda y quita bloqueos', async () => {
        expect(validarBloqueo({ sala: 'Auditorio', fecha: '2026-11-20', desde: '15:00', hasta: '11:00', motivo: 'x' }).hasta).toMatch(/posterior/);
        expect(validarBloqueo({ sala: '', fecha: '', desde: '', hasta: '', motivo: '' })).toHaveProperty('motivo');
        const id = await guardarBloqueo({ sala: 'Sala B', fecha: '2026-11-20', desde: '', hasta: '', motivo: 'x' });
        expect(leerSalas().bloqueos.some((b) => b.id === id)).toBe(true);
        quitarBloqueo(id);
        expect(leerSalas().bloqueos.some((b) => b.id === id)).toBe(false);
    });
});

import { confirmarVisita, enFiltro, guardarUso, obtenerUso, obtenerVisita, proponerFecha, rechazarVisita, reiniciarVisitas, validarUso } from '../src/pages/admin/actividades/visitas';

describe('Visitas y uso de espacios', () => {
    beforeEach(() => reiniciarVisitas());

    it('confirmar pide los datos y deja la visita confirmada', () => {
        expect(() => confirmarVisita('VS-0041', { fecha: '', hora: '10:00', duracion: '2 horas', espacio: 'Sala de cómputo', guia: 'G', mensaje: '' })).toThrow();
        confirmarVisita('VS-0041', { fecha: '2026-11-05', hora: '10:00', duracion: '2 horas', espacio: 'Sala de cómputo', guia: 'G', mensaje: '' });
        expect(obtenerVisita('VS-0041')?.estado).toBe('confirmada');
        expect(() => rechazarVisita('VS-0041', 'x')).toThrow();
    });

    it('proponer y rechazar exigen motivo', () => {
        expect(() => proponerFecha('VS-0040', { opcion1: '12 nov', opcion2: '', motivo: ' ' })).toThrow();
        proponerFecha('VS-0040', { opcion1: '12 nov', opcion2: '', motivo: 'Sala ocupada' });
        expect(obtenerVisita('VS-0040')?.estado).toBe('propuesta');
        expect(enFiltro(obtenerVisita('VS-0040')!, 'por-confirmar')).toBe(true);
        rechazarVisita('VS-0040', 'Sin disponibilidad');
        expect(enFiltro(obtenerVisita('VS-0040')!, 'cancelada')).toBe(true);
    });

    it('registrar uso valida capacidad y horas', () => {
        expect(validarUso({ sala: 'Sala B', fecha: '2026-10-26', personas: '13', horas: '2' }, 12).personas).toMatch(/hasta 12/);
        expect(validarUso({ sala: 'Sala B', fecha: '2026-10-26', personas: '10', horas: '0' }, 12).horas).toBeDefined();
        guardarUso({ sala: 'Auditorio', fecha: '2026-10-26', actividad: 'Charla', personas: '54', horas: '2', incidencias: '' }, 'US-0010');
        expect(obtenerUso('US-0010')?.estado).toBe('registrado');
    });
});

import { aplicarCambio, cancelarActividad, obtenerCambio, rechazarCambio, reiniciarCambios, solicitarReprogramacion } from '../src/pages/admin/actividades/cambios';

describe('Cambios y cancelaciones', () => {
    beforeEach(() => { reiniciarActividades(); reiniciarCambios(); });

    it('aplicar un cambio de sala actualiza la actividad', () => {
        aplicarCambio('CB-0020', 'Aviso');
        expect(obtenerCambio('CB-0020')?.estado).toBe('aplicado');
        expect(obtenerCambio('CB-0020')?.avisados).toBe(18);
        expect(obtenerActividad('AC-0108')?.espacio).toBe('Sala de lectura');
        expect(() => aplicarCambio('CB-0020', '')).toThrow();
    });

    it('rechazar exige motivo', () => {
        expect(() => rechazarCambio('CB-0021', ' ')).toThrow();
        rechazarCambio('CB-0021', 'Coincide con otro evento');
        expect(obtenerCambio('CB-0021')?.estado).toBe('rechazado');
    });

    it('reprogramar crea una solicitud pendiente; cancelar se aplica y cancela la actividad', () => {
        const f = solicitarReprogramacion('AC-0106', { fecha: '2026-11-26', hora: '18:00', sala: 'Auditorio' }, 'Ponente');
        expect(obtenerCambio(f)?.estado).toBe('pendiente');
        expect(obtenerCambio(f)?.tipo).toBe('Cambio de fecha');
        expect(() => cancelarActividad('AC-0107', 'x', 'Correo')).toThrow(); // en revisión: no está programada
        const c = cancelarActividad('AC-0108', 'Ponente no disponible', 'Correo electrónico');
        expect(obtenerCambio(c)?.avisados).toBe(18);
        expect(obtenerActividad('AC-0108')?.estado).toBe('cancelada');
    });
});

import { ajustarCupo, cancelarInscripcion, deActividad, estadoCupo, inscribir, lugaresLibres, obtenerInscripcion, ofrecerLugar, reiniciarInscripciones, validarCupo } from '../src/pages/admin/actividades/inscripciones';

describe('Inscripciones y cupos', () => {
    beforeEach(() => { reiniciarActividades(); reiniciarInscripciones(); });
    const datos = { persona: 'Persona nueva', contacto: 'correo', acompanantes: '0', notas: '' };

    it('los ejemplos cuadran con los contadores de cada actividad', () => {
        expect(deActividad('AC-0108').filter((i) => i.estado === 'confirmada')).toHaveLength(obtenerActividad('AC-0108')!.inscritos);
        expect(lugaresLibres(obtenerActividad('AC-0103')!)).toBe(0);
        expect(estadoCupo(obtenerActividad('AC-0103')!, '2026-11-01').clave).toBe('completo');
        expect(estadoCupo(obtenerActividad('AC-0108')!, '2026-11-01').clave).toBe('casi');
        expect(estadoCupo(obtenerActividad('AC-0108')!, '2026-12-01').clave).toBe('pasada');
    });

    it('sin lugares solo se anota en lista de espera', () => {
        expect(() => inscribir('AC-0103', datos)).toThrow(/No hay lugares/);
        const n = inscribir('AC-0103', datos, true);
        expect(n.estado).toBe('espera');
        expect(obtenerActividad('AC-0103')?.espera).toBe(5);
    });

    it('inscribir y cancelar actualizan la actividad', () => {
        const n = inscribir('AC-0101', datos);
        expect(obtenerActividad('AC-0101')?.inscritos).toBe(10);
        cancelarInscripcion(n.id);
        expect(obtenerActividad('AC-0101')?.inscritos).toBe(9);
        expect(() => cancelarInscripcion(n.id)).toThrow();
    });

    it('ofrecer lugar necesita un lugar libre', () => {
        expect(() => ofrecerLugar('IN-0103-E1')).toThrow(/Ajusta el cupo/);
        ofrecerLugar('IN-0108-E1');
        expect(obtenerInscripcion('IN-0108-E1')?.estado).toBe('ofrecido');
    });

    it('el cupo respeta inscritos y capacidad de la sala', () => {
        const a = obtenerActividad('AC-0108')!;
        expect(validarCupo(a, '10')).toMatch(/no puede ser menor/);
        expect(validarCupo(a, '26')).toMatch(/Máximo 25/);
        ajustarCupo('AC-0108', '24');
        expect(obtenerActividad('AC-0108')?.cupo).toBe('24');
    });
});

import { agregarSinInscripcion, cerrarLista, conteo, corregir, estadoLista, listaDe, marcar, reiniciarAsistencia } from '../src/pages/admin/actividades/asistencia';

describe('Asistencia', () => {
    beforeEach(() => { reiniciarActividades(); reiniciarInscripciones(); reiniciarAsistencia(); });

    it('cuenta presentes, ausentes, sin marcar y personas sin inscripción', () => {
        expect(conteo('AC-0098')).toEqual({ presentes: 9, ausentes: 2, sinMarcar: 2, sinInscripcion: 1, inscritos: 12 });
    });

    it('al cerrar, quien no tiene marca queda ausente y ya no se marca directo', () => {
        cerrarLista('AC-0098');
        expect(conteo('AC-0098').sinMarcar).toBe(0);
        expect(conteo('AC-0098').ausentes).toBe(4);
        expect(() => marcar('AC-0098', 'IN-0098-01', 'ausente')).toThrow();
        expect(estadoLista('AC-0098').clave).toBe('cerrada');
    });

    it('corregir una lista cerrada exige motivo y queda registrado', () => {
        expect(() => corregir('AC-0099', 'IN-0099-14', 'presente', ' ')).toThrow();
        corregir('AC-0099', 'IN-0099-14', 'presente', 'Sí asistió');
        expect(listaDe('AC-0099').correcciones).toHaveLength(1);
        expect(conteo('AC-0099').presentes).toBe(14);
    });

    it('agregar sin inscripción respeta los lugares libres', () => {
        agregarSinInscripcion('AC-0098', 'Visitante', '');
        expect(conteo('AC-0098').sinInscripcion).toBe(2);
        expect(() => agregarSinInscripcion('AC-0099', 'Otra', '')).toThrow(); // cerrada
    });

    it('una actividad futura aún no empieza', () => {
        expect(estadoLista('AC-0108', new Date(2026, 10, 1)).clave).toBe('futura');
        expect(estadoLista('AC-0104').clave).toBe('cancelada');
    });
});

import { cambiarAcceso, obtenerEvidencia, pedirAcceso, puedeVer, registrarConsulta, reiniciarEvidencias, retirarEvidencia, revisarArchivo, subirEvidencia } from '../src/pages/admin/actividades/evidencias';

describe('Evidencias privadas', () => {
    beforeEach(() => reiniciarEvidencias());

    it('solo PDF, JPG o PNG de hasta 10 MB', () => {
        expect(revisarArchivo({ name: 'a.docx', size: 10, type: 'application/msword' })).toMatch(/PDF, JPG o PNG/);
        expect(revisarArchivo({ name: 'a.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' })).toMatch(/10 MB/);
        expect(revisarArchivo({ name: 'a.pdf', size: 1024, type: 'application/pdf' })).toBeNull();
    });

    it('cada descarga queda registrada y lo restringido no se abre', () => {
        registrarConsulta('EV-0061', 'Descargó');
        expect(obtenerEvidencia('EV-0061')?.consultas.at(-1)?.accion).toBe('Descargó');
        expect(puedeVer(obtenerEvidencia('EV-0058')!)).toBe(false);
        expect(() => registrarConsulta('EV-0058', 'Consultó')).toThrow();
        pedirAcceso('EV-0058');
        expect(obtenerEvidencia('EV-0058')?.solicitada).toBe(true);
    });

    it('subir, cambiar acceso y retirar', () => {
        const f = subirEvidencia({ actividad: 'AC-0098', actividadTexto: 'Club', tipo: 'Fotografía', archivo: 'x.jpg', tamano: 2, nota: '', acceso: 'personal' });
        expect(f).toBe('EV-0062');
        cambiarAcceso(f, 'coordinacion');
        expect(puedeVer(obtenerEvidencia(f)!)).toBe(false);
        expect(() => retirarEvidencia('EV-0061', ' ')).toThrow();
        retirarEvidencia('EV-0061', 'Duplicada');
        expect(obtenerEvidencia('EV-0061')?.retirada?.motivo).toBe('Duplicada');
    });
});
