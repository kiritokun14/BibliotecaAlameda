// Imágenes del servidor que ya fallaron en esta pestaña (solo en memoria; se olvida al recargar).
// Si la imagen de una noticia o reseña no carga (por ejemplo, el servidor responde 503 tras un segundo),
// las siguientes veces se muestra el respaldo de inmediato, sin volver a esperar al servidor.
const fallidas = new Set<string>();

export function imagenFallo(src?: string | null): boolean {
    return Boolean(src && fallidas.has(src));
}

export function marcarImagenFallida(src?: string | null) {
    if (src) fallidas.add(src);
}
