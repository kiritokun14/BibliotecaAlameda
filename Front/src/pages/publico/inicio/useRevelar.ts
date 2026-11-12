import { useEffect } from "react";

// Hace que las secciones de Inicio (.seccion-inicio) aparezcan suavemente al llegar a ellas con el scroll.
// Las secciones que se pintan después (al llegar los datos) también se observan.
// Sin IntersectionObserver, o si la persona pidió reducir animaciones, todo se ve desde el principio.
export function useRevelar() {
    useEffect(() => {
        const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reducir || !("IntersectionObserver" in window)) return;
        const raiz = document.querySelector("main");
        if (!raiz) return;

        const observador = new IntersectionObserver((entradas) => {
            for (const entrada of entradas) {
                if (!entrada.isIntersecting) continue;
                entrada.target.classList.add("seccion-inicio--revelada");
                observador.unobserve(entrada.target);
            }
        }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });

        const preparar = () => {
            raiz.querySelectorAll<HTMLElement>(".seccion-inicio:not(.seccion-inicio--revelar)").forEach((seccion) => {
                seccion.classList.add("seccion-inicio--revelar");
                observador.observe(seccion);
            });
        };
        preparar();
        const cambios = new MutationObserver(preparar);
        cambios.observe(raiz, { childList: true, subtree: true });

        return () => { observador.disconnect(); cambios.disconnect(); };
    }, []);
}
