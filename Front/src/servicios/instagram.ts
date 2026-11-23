import { pedirApi } from './api'; // Añade /api y convierte fallos HTTP en errores del servicio.
import { Consultas } from './consultas'; // Comparte promesas y conserva resultados en memoria.

/** Contrato normalizado por FastAPI; los campos opcionales pueden llegar como null. */
export type PublicacionInstagram = {
    id: string; // Identificador que React utiliza como key de la tarjeta.
    caption: string; // Descripción; puede ser una cadena vacía.
    thumbnail: string | null; // Dirección de la imagen o null cuando no es válida.
    url: string | null; // Enlace validado de Instagram; null oculta el botón.
    type: string | null; // Tipo de contenido informado por el proveedor.
    taken_at: string | null; // Fecha ISO en UTC; null indica ausencia de fecha válida.
};
/** desactualizado indica que el backend está usando una copia de más de seis horas. */
export type NoticiasInstagram = { publicaciones: PublicacionInstagram[]; desactualizado: boolean };

const consultas = new Consultas(); // Vive fuera del componente para sobrevivir a sus remontajes.

/** Consulta nuestro backend, nunca API.SH directamente. No necesita la API Key. */
export function consultarInstagram(): Promise<NoticiasInstagram> {
    // Promise describe una operación asíncrona; NoticiasInstagram es el tipo del resultado.
    // TypeScript comprueba tipos al compilar, pero esta anotación no valida el JSON en ejecución.
    // Comparte la petición en curso y reutiliza un minuto los datos al volver al inicio.
    // La vigencia de seis horas del proveedor sigue controlada por el backend.
    // pedirApi añade /api; Consultas elimina los fallos de su caché para permitir otro intento.
    return consultas.obtener('cultura-nayarit', // Clave interna que identifica la consulta compartida.
        () => pedirApi<NoticiasInstagram>('/instagram/publicaciones'), 60_000); // 60 000 milisegundos.
}
