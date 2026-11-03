// Medición optativa contra un backend YA encendido; nunca inicia servicios.
import process from 'node:process';
import { expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({auth}) }));
import { consultarMiAcceso } from '../src/servicios/auth';
import { invalidarConsultas } from '../src/servicios/consultas';
it.skipIf(!process.env.BIBLIOTECA_TOKEN_MEDICION)('mide permisos con el backend existente sin escribir datos', async () => {
    invalidarConsultas();
    auth.getSession.mockResolvedValue({data:{session:{access_token:process.env.BIBLIOTECA_TOKEN_MEDICION}}});
    const red = globalThis.fetch; let llamadas = 0;
    vi.stubGlobal('fetch', (url: string, opciones: RequestInit) => {
        if (url.endsWith('/mi-acceso')) llamadas++;
        return red('http://127.0.0.1:8000'+url.replace(/^\/api/,''),opciones);
    });
    try {
        const ms: number[]=[];
        for (let i=0;i<4;i++) { const t=performance.now(); await consultarMiAcceso(); ms.push(Math.round((performance.now()-t)*10)/10); }
        console.info('MEDICION_PERMISOS_MS',JSON.stringify(ms),'PETICIONES_BACKEND',llamadas);
        expect(llamadas).toBe(1);
    } finally { vi.unstubAllGlobals(); invalidarConsultas(); }
});
