import { beforeEach, describe, expect, it } from 'vitest';
import {
    ajustarProgreso, avanceDe, disponibilidad, entregarRecompensa, estadoRecompensa, guardarMeta, guardarRecompensa,
    obtenerMeta, obtenerParticipante, obtenerRecompensa, porEntregarDe, reiniciarProgreso, validarMeta, validarRecompensa,
} from '../src/pages/admin/participantes/progreso';
import {
    advertirPersona, aprobarPublicacion, buscarPublicacion, enFiltroForo, fechaHasta, hiloDe, historialDe, normaProbable,
    obtenerPublicacion, QUIEN_MODERA, reiniciarForo, restaurarParticipacion, retirarPublicacion, silenciarPersona, silencioDe,
    ultimaDecision, validarDecision, leerForo as foroActual,
} from '../src/pages/admin/participantes/moderacion';
import { capacidadPanel } from '../src/servicios/accesoPanel';

describe('Progreso y recompensas', () => {
    beforeEach(() => reiniciarProgreso());

    it('calcula el avance y el estado de la recompensa', () => {
        expect(avanceDe(obtenerParticipante('P-0112')!)).toMatchObject({ hechas: 4, necesarias: 5, puntos: 120, cumplida: false });
        expect(estadoRecompensa(obtenerParticipante('P-0112')!)).toBe('sin');
        expect(estadoRecompensa(obtenerParticipante('P-0111')!)).toBe('entregada');
        expect(estadoRecompensa(obtenerParticipante('P-0108')!)).toBe('por-entregar');
        expect(porEntregarDe('insignia-lector')).toBe(1);
    });

    it('ajustar exige motivo y puede completar la meta', () => {
        expect(() => ajustarProgreso('P-0112', 1, ' ')).toThrow();
        ajustarProgreso('P-0112', 1, 'Asistió y no se marcó');
        expect(estadoRecompensa(obtenerParticipante('P-0112')!)).toBe('por-entregar');
        expect(() => ajustarProgreso('P-0111', 1, 'x')).toThrow(/ya se entregó/);
    });

    it('entregar solo con la meta cumplida y descuenta existencias', async () => {
        await expect(entregarRecompensa('P-0110')).rejects.toThrow();
        await entregarRecompensa('P-0108');
        expect(estadoRecompensa(obtenerParticipante('P-0108')!)).toBe('entregada');
        expect(obtenerRecompensa('insignia-lector')?.existencias).toBe(11);
        expect(obtenerRecompensa('insignia-lector')?.entregadas).toBe(32);
    });

    it('disponibilidad: pocas con 5 o menos, documentos sin límite', () => {
        expect(disponibilidad(obtenerRecompensa('insignia-explorador')!).texto).toBe('Pocas');
        expect(disponibilidad(obtenerRecompensa('constancia')!).texto).toBe('Disponible');
        expect(disponibilidad({ id: 'x', nombre: 'x', tipo: 'Insignia', existencias: 0, entregadas: 0 }).texto).toBe('Agotada');
    });

    it('valida y guarda metas y recompensas', () => {
        const meta = { nombre: '', estado: 'activa' as const, necesarias: '0', plazo: '1 mes', puntos: '', recompensa: '', descripcion: '' };
        expect(Object.keys(validarMeta(meta))).toEqual(expect.arrayContaining(['nombre', 'necesarias', 'puntos', 'recompensa']));
        const id = guardarMeta({ ...meta, nombre: 'Lectura de verano', necesarias: '4', puntos: '20', recompensa: 'constancia' });
        expect(obtenerMeta(id)?.necesarias).toBe(4);
        expect(validarRecompensa({ nombre: 'x', tipo: 'Insignia', existencias: '', sinLimite: false }).existencias).toBeDefined();
        const r = guardarRecompensa({ nombre: 'Separador', tipo: 'Documento', existencias: '', sinLimite: true });
        expect(obtenerRecompensa(r)?.existencias).toBeNull();
    });

    it('permisos de Participantes', () => {
        expect(capacidadPanel('/admin/participantes/progreso')).toBe('registrar_recompensas');
        expect(capacidadPanel('/admin/participantes/cotejos')).toBe('validar_credenciales');
        expect(capacidadPanel('/admin/participantes/foro')).toBe('moderar_foro');
    });
});

import { avisarRenovacion, enFiltroCotejo, obtenerCotejo, pedirCorreccion, rechazarVinculo, reiniciarCotejos, resultadoDe, vincular } from '../src/pages/admin/participantes/cotejos';

describe('Cotejo de credenciales', () => {
    beforeEach(() => reiniciarCotejos());

    it('clasifica cada caso de cotejo', () => {
        expect(resultadoDe(obtenerCotejo('CT-0051')!).tipo).toBe('coincide');
        expect(resultadoDe(obtenerCotejo('CT-0050')!)).toEqual({ tipo: 'diferencias', diferencias: 2 });
        expect(resultadoDe(obtenerCotejo('CT-0049')!).tipo).toBe('vencida');
        expect(resultadoDe(obtenerCotejo('CT-0053')!).tipo).toBe('sin-coincidencia');
        expect(resultadoDe(obtenerCotejo('CT-0052')!).tipo).toBe('ya-vinculada');
        expect(enFiltroCotejo(obtenerCotejo('CT-0050')!, 'diferencias')).toBe(true);
    });

    it('solo se vincula cuando todo coincide', () => {
        expect(() => vincular('CT-0050')).toThrow();
        vincular('CT-0051');
        expect(obtenerCotejo('CT-0051')?.estado).toBe('vinculada');
        expect(() => vincular('CT-0051')).toThrow();
    });

    it('corrección, rechazo y aviso de renovación', () => {
        expect(() => pedirCorreccion('CT-0050', 'Nombre', ' ')).toThrow();
        pedirCorreccion('CT-0050', 'Nombre', 'Corrige tu nombre');
        expect(obtenerCotejo('CT-0050')?.estado).toBe('correccion');
        expect(() => avisarRenovacion('CT-0051')).toThrow();
        avisarRenovacion('CT-0049');
        expect(obtenerCotejo('CT-0049')?.estado).toBe('aviso');
        expect(() => rechazarVinculo('CT-0053', '')).toThrow();
        rechazarVinculo('CT-0053', 'No existe la credencial');
        expect(enFiltroCotejo(obtenerCotejo('CT-0053')!, 'resueltos')).toBe(true);
    });
});

describe('Moderación del foro', () => {
    beforeEach(() => reiniciarForo());

    it('cuenta la cola por filtro y busca por texto o autor', () => {
        const { publicaciones } = foroActual();
        expect(publicaciones.filter((p) => enFiltroForo(p, 'reportadas'))).toHaveLength(5);
        expect(publicaciones.filter((p) => enFiltroForo(p, 'pendientes'))).toHaveLength(3);
        expect(publicaciones.filter((p) => enFiltroForo(p, 'retiradas'))).toHaveLength(2);
        expect(buscarPublicacion(obtenerPublicacion('FO-0231')!, 'misterio')).toBe(true);
        expect(buscarPublicacion(obtenerPublicacion('FO-0231')!, 'usuaria c')).toBe(true);
        expect(buscarPublicacion(obtenerPublicacion('FO-0231')!, 'poesía')).toBe(false);
    });

    it('da contexto: norma probable, historial y hilo', () => {
        const p = obtenerPublicacion('FO-0233')!;
        expect(normaProbable(p)).toBe(2);
        expect(historialDe(p.autor, p.folio).texto).toBe('1 retiro previo · sin silencios');
        expect(hiloDe(p).map((x) => x.folio)).toEqual(['FO-0223', 'FO-0233', 'FO-0222']);
    });

    it('retirar exige norma y deja registro; aprobar cambia el estado', async () => {
        expect(validarDecision('', '', false).norma).toBeTruthy();
        expect(validarDecision(2, '', true).mensaje).toBeTruthy();
        await retirarPublicacion('FO-0233', 2, '');
        expect(obtenerPublicacion('FO-0233')!.estado).toBe('retirada');
        expect(ultimaDecision(obtenerPublicacion('FO-0233')!, 'retirada')).toMatchObject({ norma: 2, quien: QUIEN_MODERA });
        await aprobarPublicacion('FO-0231');
        expect(obtenerPublicacion('FO-0231')!.estado).toBe('aprobada');
    });

    it('advertir no retira la publicación', async () => {
        await advertirPersona('FO-0232', 3, 'Evita la publicidad.');
        expect(obtenerPublicacion('FO-0232')!.estado).toBe('reportada');
        expect(ultimaDecision(obtenerPublicacion('FO-0232')!, 'advertencia')?.mensaje).toBe('Evita la publicidad.');
    });

    it('silenciar y restaurar participación', async () => {
        await expect(silenciarPersona('FO-0233', 7, ' ')).rejects.toThrow();
        await silenciarPersona('FO-0233', 7, 'Reincidencia');
        const s = silencioDe('Persona usuaria A (ejemplo)')!;
        expect(s.motivo).toBe('Reincidencia');
        expect(fechaHasta(7, new Date('2026-11-03T12:00:00'))).toBe('2026-11-10');
        expect(foroActual().silencios).toHaveLength(2);
        await restaurarParticipacion(s.id);
        expect(silencioDe('Persona usuaria A (ejemplo)')).toBeUndefined();
        await expect(restaurarParticipacion(s.id)).rejects.toThrow(/ya no está silenciada/);
    });
});
