import { beforeEach, describe, expect, it } from 'vitest';
import { validar, tituloDe, revisarImagen } from '../src/pages/admin/contenidos/esquemas';
import {
    crearContenido,
    cuandoSeActualizo,
    enviarAAutorizacion,
    esEditable,
    filtrarContenidos,
    obtenerContenido,
    reiniciarContenidos,
} from '../src/pages/admin/contenidos/datos';
import { capacidadPanel } from '../src/servicios/accesoPanel';

const noticiaCompleta = {
    titulo: 'Horario especial', resumen: 'Resumen corto', texto: 'Texto completo',
    categoria: 'Avisos', fecha: '2026-10-24',
};

describe('Validación para enviar a autorización (HU-12)', () => {
    it('una noticia completa no tiene errores', () => {
        expect(validar('noticia', noticiaCompleta)).toEqual({});
    });

    it('marca los obligatorios que faltan con su mensaje', () => {
        const errores = validar('noticia', { ...noticiaCompleta, titulo: '  ', texto: '' });
        expect(errores.titulo).toBe('Escribe un título para la noticia.');
        expect(errores.texto).toBe('El texto completo es obligatorio.');
        expect(Object.keys(errores)).toHaveLength(2);
    });

    it('respeta el máximo de caracteres', () => {
        expect(validar('noticia', { ...noticiaCompleta, titulo: 'x'.repeat(91) }).titulo).toMatch(/Máximo 90/);
    });

    it('si hay imagen, exige texto alternativo', () => {
        expect(validar('noticia', { ...noticiaCompleta, imagen: 'foto.jpg', alt: '' }).alt).toBe('Falta el texto alternativo.');
        expect(validar('noticia', { ...noticiaCompleta, imagen: 'foto.jpg', alt: 'Fachada' }).alt).toBeUndefined();
    });

    it('memoria pública: una imagen necesita permiso de uso', () => {
        const pieza = { titulo: 'Calle Lerdo', fuente: 'Archivo', resumen: 'R', texto: 'T', sePublica: 'Memoria pública', imagen: 'calle.jpg' };
        expect(validar('memoria', { ...pieza, permiso: false }).permiso).toBeDefined();
        expect(validar('memoria', { ...pieza, permiso: true })).toEqual({});
    });
});

describe('Datos del contenido', () => {
    beforeEach(() => reiniciarContenidos());

    it('el título del listado lleva prefijo en reseñas', () => {
        expect(tituloDe('resena', { libro: 'Cuentos de la Alameda' })).toBe('Reseña: Cuentos de la Alameda');
        expect(tituloDe('noticia', {})).toBe('Sin título');
    });

    it('solo JPG o PNG de hasta 5 MB', () => {
        expect(revisarImagen({ name: 'a.gif', size: 10, type: 'image/gif' })).toMatch(/JPG o PNG/);
        expect(revisarImagen({ name: 'a.png', size: 6 * 1024 * 1024, type: 'image/png' })).toMatch(/5 MB/);
        expect(revisarImagen({ name: 'a.jpg', size: 1024, type: 'image/jpeg' })).toBeNull();
    });

    it('solo se editan borradores y contenidos con observaciones', () => {
        expect(esEditable('borrador')).toBe(true);
        expect(esEditable('observaciones')).toBe(true);
        expect(esEditable('por-autorizar')).toBe(false);
        expect(esEditable('publicado')).toBe(false);
    });

    it('un contenido nuevo recibe el siguiente folio y empieza como borrador', () => {
        const folio = crearContenido('noticia');
        expect(folio).toBe('CN-0032');
        expect(obtenerContenido(folio)?.estado).toBe('borrador');
    });

    it('al enviar queda "por autorizar" con la nota', async () => {
        await enviarAAutorizacion('CN-0031', noticiaCompleta, ' Confirmar fecha ');
        const c = obtenerContenido('CN-0031');
        expect(c?.estado).toBe('por-autorizar');
        expect(c?.notaEnvio).toBe('Confirmar fecha');
    });

    it('filtra por estado y busca por folio o título', () => {
        const todos = filtrarContenidos(obtenerTodos(), 'todos', '');
        expect(filtrarContenidos(todos, 'observaciones', '').map((c) => c.folio)).toEqual(['CN-0029']);
        expect(filtrarContenidos(todos, 'todos', 'cn-0024').map((c) => c.folio)).toEqual(['CN-0024']);
        expect(filtrarContenidos(todos, 'todos', 'alameda').map((c) => c.folio)).toEqual(['CN-0030']);
    });
});

function obtenerTodos() {
    return ['CN-0031', 'CN-0030', 'CN-0029', 'CN-0027', 'CN-0024', 'CN-0022', 'CN-0020', 'CN-0018', 'CN-0015']
        .map((f) => obtenerContenido(f)!)
        .filter(Boolean);
}

describe('Fechas relativas', () => {
    const ahora = new Date(2026, 10, 2, 12, 0);
    it('hoy, ayer, hace días y fecha corta', () => {
        expect(cuandoSeActualizo(new Date(2026, 10, 2, 10, 20).toISOString(), ahora)).toBe('Hoy, 10:20');
        expect(cuandoSeActualizo(new Date(2026, 10, 1, 9, 0).toISOString(), ahora)).toBe('Ayer');
        expect(cuandoSeActualizo(new Date(2026, 9, 30, 9, 0).toISOString(), ahora)).toBe('Hace 3 días');
        expect(cuandoSeActualizo(new Date(2026, 9, 12, 9, 0).toISOString(), ahora)).toBe('12 oct 2026');
    });
});

describe('Permisos del panel de Contenidos', () => {
    it('el Editor necesita preparar_contenidos y la revisión publicar_contenidos', () => {
        expect(capacidadPanel('/admin/contenidos/editor')).toBe('preparar_contenidos');
        expect(capacidadPanel('/admin/contenidos/editor/CN-0031/vista-previa')).toBe('preparar_contenidos');
        expect(capacidadPanel('/admin/contenidos/revision')).toBe('publicar_contenidos');
    });
});
