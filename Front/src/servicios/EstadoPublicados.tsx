import type { ReactNode } from 'react';
import type { ContenidoPublico } from './publicacion';
import { EsqueletoArticulo } from '../components/portal/Esqueleto';

// Mientras carga, la forma del contenido (esqueleto) en lugar de un texto suelto
export function EstadoPublicados({ datos, error, children }: { datos?: ContenidoPublico[]; error?: string; children?: ReactNode }) {
    if (error) return <p role="alert">{error}</p>;
    if (!datos) {
        return (
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px 72px', boxSizing: 'content-box' }}>
                <EsqueletoArticulo texto="Cargando publicación…" />
            </div>
        );
    }
    return <>{children}</>;
}
