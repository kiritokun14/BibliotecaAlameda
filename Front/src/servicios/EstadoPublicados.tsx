import type { ReactNode } from 'react';
import type { ContenidoPublico } from './publicacion';

export function EstadoPublicados({ datos, error, children }: { datos?: ContenidoPublico[]; error?: string; children?: ReactNode }) {
    if (error) return <p role="alert">{error}</p>;
    if (!datos) return <p role="status">Cargando publicaciones…</p>;
    return <>{children}</>;
}
