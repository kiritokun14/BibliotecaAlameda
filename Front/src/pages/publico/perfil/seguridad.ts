// Seguridad · cambiar la contraseña con la sesión iniciada (Supabase Auth, sin claves secretas).
// Se comprueba la contraseña actual volviendo a iniciar sesión, se guarda la nueva y se cierran
// las demás sesiones («Al cambiarla se revocan las sesiones previas»).
import { ErrorServicio, obtenerSupabase } from "../../../servicios/api";
import { invalidarConsultas } from "../../../servicios/consultas";

export async function cambiarContrasena(correo: string, actual: string, nueva: string) {
    const supabase = await obtenerSupabase();
    const verificacion = await supabase.auth.signInWithPassword({ email: correo, password: actual });
    if (verificacion.error) {
        if (verificacion.error.code === "invalid_credentials") throw new ErrorServicio("La contraseña actual no es correcta.", 401);
        throw new ErrorServicio("No pudimos comprobar tu contraseña. Intenta más tarde.");
    }
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) {
        if (error.code === "weak_password" || error.code === "same_password")
            throw new ErrorServicio("Usa una contraseña diferente, de entre 8 y 128 caracteres.", 422);
        throw new ErrorServicio("No se pudo cambiar la contraseña. Intenta más tarde.");
    }
    invalidarConsultas();
    await supabase.auth.signOut({ scope: "others" });
}
