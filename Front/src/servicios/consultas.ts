// Solo lecturas en memoria; nunca persiste tokens ni respuestas en el navegador.
export class Consultas {
    private pendientes = new Map<string, { promesa: Promise<unknown>; vence: number }>();
    obtener<T>(clave: string, cargar: () => Promise<T>, vigencia = 0): Promise<T> {
        const entrada = this.pendientes.get(clave);
        if (entrada && entrada.vence > Date.now()) return entrada.promesa as Promise<T>;
        const registro = { promesa: Promise.resolve().then(cargar), vence: Infinity };
        this.pendientes.set(clave, registro);
        registro.promesa.then(() => {
            if (this.pendientes.get(clave) === registro) {
                if (vigencia) registro.vence = Date.now() + vigencia;
                else this.pendientes.delete(clave);
            }
        }, () => { if (this.pendientes.get(clave) === registro) this.pendientes.delete(clave); });
        return registro.promesa;
    }
    limpiar() { this.pendientes.clear(); }
}
export const consultasAcceso = new Consultas();
export const consultasEditor = new Consultas();
export function invalidarConsultas() { consultasAcceso.limpiar(); consultasEditor.limpiar(); }

// ---------- Memoria de listas del panel ----------
// Última respuesta de cada lista: al volver a una pantalla se muestra al instante mientras se actualiza.
// Solo vive en la memoria de la pestaña; se borra al cerrar sesión, al cambiar de cuenta y después de cada cambio.
const memoria = new Map<string, unknown>();
let cuentaMemoria = '';
export function enMemoria<T>(clave: string): T | undefined { return memoria.get(clave) as T | undefined; }
// Une las peticiones iguales que están en curso (React monta dos veces en desarrollo) y guarda la respuesta
export function consultarConMemoria<T>(clave: string, cargar: () => Promise<T>): Promise<T> {
    return consultasEditor.obtener('memoria:' + clave, cargar).then((valor) => { memoria.set(clave, valor); return valor; });
}
export function olvidarMemoria() { memoria.clear(); }
// Si entra otra cuenta en la misma pestaña, no se le muestra nada de la anterior
export function memoriaDeCuenta(usuarioId: string) {
    if (cuentaMemoria !== usuarioId) { memoria.clear(); cuentaMemoria = usuarioId; }
}
// Al cerrar sesión se borra todo lo recordado (memoria de listas y lo que haya registrado cada pantalla)
const alSalir = new Set<() => void>();
export function registrarAlSalir(accion: () => void) { alSalir.add(accion); }
export function olvidarSesion() { memoria.clear(); cuentaMemoria = ''; alSalir.forEach((accion) => accion()); }
