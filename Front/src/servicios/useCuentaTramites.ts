import { useEffect, useState } from 'react';
import { obtenerSupabase } from './api';

export function useCuentaTramites() {
    const [usuario, setUsuario] = useState<string | null>();
    useEffect(() => {
        let vigente = true; let cancelar: (() => void) | undefined;
        obtenerSupabase().then(cliente => {
            if (!vigente) return;
            const { data } = cliente.auth.onAuthStateChange((_evento, sesion) => { if (vigente) setUsuario(sesion?.user.id ?? null); });
            cancelar = () => data.subscription.unsubscribe();
        }).catch(() => { if (vigente) setUsuario(null); });
        return () => { vigente = false; cancelar?.(); };
    }, []);
    return usuario;
}
