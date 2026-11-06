// ⚠️ SIMULACIÓN: mientras no conectamos Supabase, estas funciones fingen la
// respuesta del servidor para poder ver todas las pantallas. Cuando conectemos
// Supabase, solo se cambia el contenido de estas funciones; las páginas no.
//
// Para probar:
//   - Iniciar sesión funciona con cualquier correo y la contraseña "biblioteca".
//     Con otra contraseña aparece "El correo o la contraseña no coinciden".
//   - deshabilitada@ejemplo.mx  → pantalla de cuenta deshabilitada.
//   - Crear cuenta con registrado@ejemplo.mx → "Ese correo ya tiene una cuenta".

function esperar() {
    return new Promise((resolver) => setTimeout(resolver, 600));
}

export type ResultadoInicioSesion = "ok" | "credenciales-incorrectas" | "cuenta-deshabilitada";

export async function iniciarSesion(correo: string, contrasena: string): Promise<ResultadoInicioSesion> {
    await esperar();
    if (correo === "deshabilitada@ejemplo.mx") return "cuenta-deshabilitada";
    if (contrasena !== "biblioteca") return "credenciales-incorrectas";
    return "ok";
}

export type ResultadoCrearCuenta = "ok" | "correo-registrado";

export async function crearCuenta(correo: string): Promise<ResultadoCrearCuenta> {
    await esperar();
    if (correo === "registrado@ejemplo.mx") return "correo-registrado";
    return "ok";
}

export async function reenviarConfirmacion(correo: string) {
    await esperar();
    console.log("Reenviar confirmación a", correo);
}

export async function reenviarAutorizacionTutor() {
    await esperar();
    console.log("Reenviar correo de autorización al tutor");
}

export async function enviarEnlaceRecuperacion(correo: string) {
    await esperar();
    console.log("Enviar enlace de recuperación a", correo);
}

export async function guardarNuevaContrasena(contrasena: string) {
    await esperar();
    console.log("Nueva contraseña guardada", contrasena.length, "caracteres");
}
