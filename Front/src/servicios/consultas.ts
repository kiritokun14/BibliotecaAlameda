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
