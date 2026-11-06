// Dirección del catálogo Koha. Se configura en Front/.env con VITE_KOHA_URL.
// Devuelve null si falta o no es una dirección web válida.

export function urlCatalogo(): string | null {
    const url = import.meta.env.VITE_KOHA_URL?.trim();

    if (!url) return null;
    try{
        const direccion = new URL(url);
        return direccion.protocol === "https:" || direccion.protocol === "http:" ? direccion.href : null;
    }catch{
        return null;
    }
}