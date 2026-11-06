import { afterEach, expect, it, vi } from 'vitest';
import { Consultas } from '../src/servicios/consultas';
afterEach(() => vi.useRealTimers());
it('deduplica lecturas concurrentes, pero repite después de completar si no hay caché', async () => {
    const cache = new Consultas(); const cargar = vi.fn(async () => 7);
    expect(await Promise.all([cache.obtener('a',cargar),cache.obtener('a',cargar)])).toEqual([7,7]);
    expect(cargar).toHaveBeenCalledTimes(1);
    await cache.obtener('a',cargar); expect(cargar).toHaveBeenCalledTimes(2);
});
it('expira y separa la identidad de cada token', async () => {
    vi.useFakeTimers(); const cache = new Consultas(); const cargar = vi.fn(async () => 7);
    await cache.obtener('token1',cargar,15000); await cache.obtener('token1',cargar,15000);
    expect(cargar).toHaveBeenCalledTimes(1);
    await cache.obtener('token2',cargar,15000); expect(cargar).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(15001); await cache.obtener('token1',cargar,15000);
    expect(cargar).toHaveBeenCalledTimes(3);
});
it('no guarda errores como respuestas válidas', async () => {
    const cache = new Consultas(); const cargar = vi.fn().mockRejectedValueOnce(new Error('fallo')).mockResolvedValue(2);
    await expect(cache.obtener('a',cargar,1000)).rejects.toThrow();
    expect(await cache.obtener('a',cargar,1000)).toBe(2);
});
it('invalidar durante una consulta impide que vuelva a llenar la caché', async () => {
    const cache = new Consultas(); let resolver!: (valor: number) => void;
    const pendiente = cache.obtener('a',()=>new Promise<number>(r=>{resolver=r;}),1000);
    await Promise.resolve(); cache.limpiar(); resolver(1); await pendiente;
    const cargar = vi.fn(async()=>2); expect(await cache.obtener('a',cargar,1000)).toBe(2);
    expect(cargar).toHaveBeenCalledTimes(1);
});
