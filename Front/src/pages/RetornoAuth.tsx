import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import AccesoLayout from '../components/AccesoLayout';
import { procesarRetorno } from '../servicios/auth';

export default function RetornoAuth() {
    const navigate = useNavigate();
    const enlace = useRef(window.location.href);
    const [mensaje, setMensaje] = useState('Estamos verificando el enlace de tu correo…');
    useEffect(() => {
        let activo = true;
        const recuperacion = new URL(enlace.current).searchParams.get('flujo') === 'recuperacion'
            || new URLSearchParams(new URL(enlace.current).hash.slice(1)).get('type') === 'recovery';
        procesarRetorno(enlace.current).then(flujo => {
            if (activo) navigate(flujo === 'recuperacion' ? '/recuperar/nueva-contrasena' : '/iniciar-sesion?confirmado=si', { replace: true });
        }).catch(() => {
            if (!activo) return;
            setMensaje('No pudimos verificar el enlace. Solicita uno nuevo.');
            navigate(recuperacion ? '/recuperar/enlace-vencido' : '/confirma-tu-correo/enlace-vencido', { replace: true });
        });
        return () => { activo = false; };
    }, [navigate]);
    return <AccesoLayout titulo="Verificando tu correo" texto="Espera un momento.">
        <div className="tarjeta" role="status">{mensaje}</div>
    </AccesoLayout>;
}
