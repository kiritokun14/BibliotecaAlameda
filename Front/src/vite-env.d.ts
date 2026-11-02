/// <reference types="vite/client" />

interface ImportMetaEnv {
    // Dirección pública del catálogo Koha (HU-04)
    readonly VITE_KOHA_URL?: string;
    // Solo desarrollo: "true" abre todas las secciones del panel a cualquier sesión (ver servicios/accesoPanel.ts)
    readonly VITE_PANEL_COMPLETO?: string;
}
