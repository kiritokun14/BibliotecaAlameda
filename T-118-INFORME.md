# T-118 y HU-30 · Asistente de servicios y requisitos

Se integró el asistente existente con el catálogo de fuentes aprobadas de Biblioteca Alameda. Las pruebas del 23 de noviembre de 2026 verificaron la cita del requisito vigente, su retiro y la salida a Contacto para consultas privadas o sin sustento. El RAG conserva la búsqueda textual y puede usar Gemma en LM Studio para seleccionar entre fragmentos pertinentes.

Sprint 6. Titular Luis, apoyo Roberto y revisor Aldahir. [T-118 · BDLAG-104](https://ittepic-team-gps.atlassian.net/browse/BDLAG-104) · [HU-30 · BDLAG-40](https://ittepic-team-gps.atlassian.net/browse/BDLAG-40)

## Criterios verificados

| Criterio | Resultado |
|---|---|
| CA-30.1 · Requisito con origen identificable | En PostgreSQL 16.16 y PostgREST 16.4, la API pública excluyó un borrador y una fuente aprobada inactiva. Después de activarla, devolvió el extracto de prueba y su identificador, título, tipo y versión. Al retirarla, la misma consulta volvió a ofrecer atención humana. |
| CA-30.2 · Consultas privadas o sin respaldo | Se verificaron peticiones de datos de terceros, seguimiento de trámites propios e instrucciones para revelar información. Esos casos cortan la consulta antes de acceder al catálogo o al modelo. Una pregunta sin respaldo sobre el costo de un servicio mostró el acceso a Contacto. La API y la interfaz ofrecen esa alternativa. |
| T-118 · Atención y requisitos | La acción «Hablar con el personal» abre Contacto desde las respuestas que requieren atención. Ahí están el teléfono, el correo y el formulario institucional. El usuario elige qué información proporcionar. |

La prueba de regresión verificó que una salida del modelo con un identificador inventado se descarta y el sistema conserva el extracto recuperado del catálogo. También se comprobó que una pregunta de seguimiento conserva el tema anterior sin usar las respuestas que lleguen en el historial del cliente como fuentes. [Pruebas de FastAPI](Back/tests/test_asistente.py) · [Pruebas de recuperación](Back/tests/test_asistente_fuentes.py) · [Pruebas del portal](Front/tests/asistente.test.ts)

La consulta «cómo veo mis propuestas de eventos» abre Mis propuestas. Las pruebas también distinguen la agenda pública, el formulario para proponer y las secciones personales de inscripciones, espacios, credencial y mensajes. Los enlaces a estas secciones requieren iniciar sesión en el portal.

## Modelo, recursos y alojamiento

- **Candidato probado.** Gemma 4 E4B Q4_K_M servido por LM Studio mediante `/v1/chat/completions`, con salida JSON de identificadores. La instalación local ocupó 6.33 GB de disco. El equipo de prueba tenía un Ryzen 7 3700X, 31.9 GiB de RAM y una RTX 3070 de 8 GiB. [Ficha de Gemma](https://huggingface.co/google/gemma-4-E4B-it) · [Salida estructurada de LM Studio](https://lmstudio.ai/docs/developer/openai-compat/structured-output)
- **Medición local.** Con 2048 tokens de contexto, 65 % de descarga a GPU y una inferencia a la vez, LM Studio estimó 4.13 GiB de GPU y 6.18 GiB de memoria total. La carga temporal tomó 12.43 s. Una consulta en frío agotó el límite de 12 s. Con el modelo precargado, las seis consultas sintéticas eligieron el resultado esperado, con mediana de 2.24 s y máximo de 2.96 s. La consulta integrada de un solo fragmento tardó entre 16 y 51 ms en dos ejecuciones locales.
- **Condición de alojamiento.** La configuración local usa un modelo precargado. La recuperación textual sigue disponible si el modelo está apagado o alcanza su tiempo límite. Para decidir el alojamiento de producción quedan la capacidad y el presupuesto del equipo, la conectividad privada desde FastAPI y la validación de carga del piloto. [Opciones de servidor LM Studio](https://lmstudio.ai/docs/developer/core/server/settings) · [T-114 · BDLAG-185](https://ittepic-team-gps.atlassian.net/browse/BDLAG-185)

## Ejecución y revisión

- Backend. Pasaron las 302 pruebas de `python -m unittest discover -s Back/tests` con las pruebas de PostgreSQL habilitadas en una base desechable. El recorrido FastAPI → PostgREST → PostgreSQL usó una fuente sintética que se aprobó, activó y retiró mediante las funciones existentes de gestión.
- Frontend. Pasaron 379 pruebas de Vitest. Se omitió la medición manual de latencia que requiere una sesión de prueba. Lint y compilación terminaron correctamente.
- Catálogo. La lectura pública del proyecto Supabase configurado devolvió cero fuentes activas con aprobación explícita. Para validar con contenido institucional, registrar el extracto vigente en **Administración → Fuentes**, seguir el flujo de aprobación y activación y repetir el caso CA-30.1 desde `/asistente`. [Flujo de fuentes](Supabase/fuentes_rag.sql)
- **Aldahir · revisión pendiente.** Revisar las citas y el acceso a Contacto en el portal, y registrar el resultado con una fuente institucional activa. [Instrucciones del asistente](README.md#asistente-de-orientación)
