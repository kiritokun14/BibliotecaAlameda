# Noticias culturales de Instagram

El inicio conserva las noticias de la biblioteca y añade hasta seis publicaciones
de `culturanayarit`. El navegador usa `pedirApi`; la clave solo existe en el backend.

## Configuración y ejecución

1. Agregar `APISH_KEY=tu_clave` a `Back/.env` (o al entorno del proceso).
   No usar variables `VITE_` para este secreto. `.env` y la caché están excluidos de Git.
2. Con las dependencias de `Back/requirements.txt` instaladas, ejecutar desde la raíz:
   `python -m uvicorn Back.main:app --reload --workers 1`.
3. En `Front`, ejecutar `npm.cmd ci` y `npm.cmd run dev`. Abrir `http://localhost:5173`.
4. El endpoint directo es `http://localhost:8000/api/instagram/publicaciones`.
   También existe `/instagram/publicaciones` porque el proxy de Vite elimina `/api`.
   No cambiar ese proxy: las otras funciones dependen de él.

La primera visita con una clave configurada realiza una solicitud real. No abrir
el endpoint con la clave real si solo se desean ejecutar pruebas simuladas.
No hay tareas programadas, paginación ni reintentos automáticos en el frontend.

## Caché y límites

`Back/.cache/instagram.json` conserva los datos normalizados y los tiempos de
actualización/intento. Cada instancia consulta como máximo una vez por seis horas,
incluyendo los fallos; las visitas concurrentes en un proceso comparten un bloqueo.
Los datos vacíos también se guardan. Los fallos devuelven la última copia con
`desactualizado: true`, o un 503 genérico si no hay copia. No se devuelve el cuerpo
del error del proveedor. Si la clave falta, tampoco se llama al proveedor.

Usar **un solo worker/instancia**, con el directorio de caché persistente y escribible,
para mantener el límite global sin añadir infraestructura. El bloqueo es local al
proceso: varios workers o réplicas podrían consumir créditos por separado. Si el
disco no permite escritura se conserva únicamente la caché en memoria; un reinicio
la pierde. No se modifica Supabase.

Después de corregir una clave o configuración fallida, se puede esperar seis horas,
o, con el servidor detenido, eliminar únicamente `Back/.cache/instagram.json` y
reiniciar. Esto habilita una nueva solicitud real en la siguiente visita.

Las imágenes de Instagram pueden caducar antes de la siguiente actualización. La
tarjeta muestra «Imagen no disponible» cuando la carga falla. Una publicación sin
URL válida no muestra un enlace inventado; una fecha inválida se omite.
Solo se permiten enlaces HTTPS a `instagram.com` o `www.instagram.com` para las publicaciones.

## Pruebas sin créditos

Desde la raíz:

```powershell
python -m unittest Back.tests.test_instagram -v
```

Desde `Front`:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Los tests Python simulan HTTP, reloj y almacenamiento temporal. Los tests React
verifican el HTML renderizado, los estados y el servicio con `fetch` simulado.
No invocan API.SH ni requieren clave. El comportamiento visual y el evento de
error de una imagen deben comprobarse también en navegador.

El adaptador acepta listas y envoltorios `posts`, `items`, `results` o `data` y
normaliza los seis campos públicos. Durante esta implementación se verificó una
respuesta autenticada HTTP 200 con 12 elementos en `posts`; se guardaron los seis
primeros. Esa comprobación no garantiza disponibilidad futura del proveedor.
Referencia del proveedor: https://api.sh/instagram-api y https://api.sh/catalog/instagram.

## Guía para explicar el código

### 1. Idea principal y recorrido

La API externa obtiene publicaciones públicas de Instagram. Nuestro backend actúa
como intermediario para proteger la clave, adaptar los datos y ahorrar solicitudes.
Supabase sigue atendiendo las otras funciones del portal; esta sección no consulta
ni modifica sus tablas.

```text
Inicio.tsx monta NoticiasCulturales
    -> consultarInstagram() comparte/reutiliza la consulta durante un minuto
    -> pedirApi() hace GET /api/instagram/publicaciones
    -> FastAPI ejecuta publicaciones_instagram()
    -> CacheInstagram.obtener()
         -> caché vigente: devuelve los datos guardados
         -> plazo vencido: hace GET a API.SH con username y x-api-key
              -> éxito: normaliza y guarda
              -> fallo: conserva los datos anteriores, o responde 503 si no existen
    -> React muestra los datos en el carrusel
```

El proxy de Vite quita `/api` antes de enviar al backend. Por eso el mismo router
acepta también `/instagram/publicaciones`. El registro en `Back/main.py` mediante
`app.include_router(instagram_router)` hace que FastAPI reconozca estas rutas.

### 2. Funciones del backend

| Elemento de `Back/instagram.py` | Qué hace y por qué |
| --- | --- |
| `enlace_seguro()` | Acepta HTTPS sin credenciales incrustadas. Para publicaciones exige dominio de Instagram; las imágenes pueden venir de una CDN. No comprueba si la URL sigue disponible. |
| `fecha_valida()` | Convierte segundos Unix o texto ISO a una fecha ISO en UTC; devuelve `None` si no puede convertirla. |
| `normalizar_publicaciones()` | Localiza la lista, conserva las seis primeras en el orden del proveedor y selecciona únicamente los campos públicos. No ordena ni descarga páginas adicionales. |
| `CacheInstagram.__init__()` | Recupera del disco la última copia y sus tiempos cuando arranca el proceso. |
| `guardar()` | Escribe un archivo temporal y lo reemplaza; guarda datos y tiempos, nunca la clave. |
| `obtener()` | Decide si devuelve caché o intenta actualizar. Conserva los datos anteriores ante un fallo. |
| `publicaciones_instagram()` | Expone el resultado como JSON por medio del router de FastAPI. |

La llamada a API.SH utiliza `httpx.Client`, el parámetro
`params={'username': 'culturanayarit'}` y el encabezado
`headers={'x-api-key': clave}`. `load_dotenv()` carga `Back/.env` sin sustituir por
defecto variables ya definidas en el entorno del proceso; `os.getenv('APISH_KEY')`
lee la clave. `raise_for_status()` rechaza respuestas HTTP no exitosas y `.json()`
convierte el cuerpo recibido a estructuras de Python.

El timeout de conexión es de cinco segundos y el de las otras fases de entrada/salida
es de doce segundos. No es un plazo total único de doce segundos. Las redirecciones
están desactivadas para evitar reenviar la solicitud autenticada a otro destino.

### 3. Contrato de datos entre Python y TypeScript

Ejemplo ilustrativo, sin datos reales ni credenciales:

```json
{
  "publicaciones": [
    {
      "id": "ejemplo-1",
      "caption": "Actividad cultural en Nayarit",
      "thumbnail": null,
      "url": "https://www.instagram.com/p/CODIGO_DE_EJEMPLO/",
      "type": "image",
      "taken_at": "2026-11-01T18:00:00+00:00"
    }
  ],
  "desactualizado": false
}
```

| Campo | Significado | Si falta o no es válido |
| --- | --- | --- |
| `id` | Identificador de la publicación y clave de la tarjeta en React. | Se genera `publicacion-0`, `publicacion-1`, etc. |
| `caption` | Descripción como texto plano. | Cadena vacía; React muestra un texto de respaldo. |
| `thumbnail` | URL HTTPS de la imagen. | `null`; React muestra «Imagen no disponible». |
| `url` | Enlace HTTPS a la publicación en Instagram. | `null`; no se muestra el botón. |
| `type` | Tipo indicado por API.SH. | `null`; actualmente no cambia el diseño de la tarjeta. |
| `taken_at` | Fecha ISO normalizada en UTC. | `null`; no se muestra fecha. |

Python usa `None`, que FastAPI convierte a `null` en JSON. El tipo
`PublicacionInstagram` declara esos casos en TypeScript. React también valida la
fecha antes de mostrarla y escapa el texto de la descripción; no se inserta HTML
del proveedor con `dangerouslySetInnerHTML`.

### 4. Las dos cachés

| Caché | Dónde vive | Vigencia y propósito |
| --- | --- | --- |
| Backend | Memoria y `Back/.cache/instagram.json`. | Seis horas; reduce las llamadas con créditos a API.SH. |
| Frontend | Instancia de `Consultas` en `instagram.ts`, solo en memoria. | Un minuto desde que la consulta termina; evita repetir solicitudes a nuestro servidor al regresar al inicio. |

En el backend, `actualizado` registra el último éxito y `proximo_intento` limita
los siguientes intentos, incluso si hubo un fallo. El `Lock` hace que las visitas
simultáneas de un mismo proceso no actualicen la caché en paralelo.

Ejemplo: si a las 10:00 se actualiza correctamente, las visitas siguientes reciben
esa copia. La primera petición a partir de las 16:00 intenta actualizar. Si falla,
devuelve la copia con `desactualizado: true` y aplaza el próximo intento otras seis
horas. **No hay una tarea que se ejecute sola a las 16:00**: una visita activa la
comprobación. Una lista vacía `[]` es un resultado válido; `None` significa que no
hay una respuesta exitosa guardada.

Los errores del servicio frontend no se guardan en su caché. Esto permite volver
a consultar nuestro servidor en otra visita, pero no anula el límite del backend.

### 5. Componentes del frontend

- `Inicio.tsx`: incluye la sección en la página principal.
- `servicios/instagram.ts`: define el contrato y consulta el backend con `pedirApi()`.
- `NoticiasCulturales`: carga los datos con `useEffect`; la variable `activa` evita
  actualizar el estado si el componente ya se desmontó. No cancela la consulta compartida.
- `ContenidoCultural`: decide entre error, esqueletos de carga, lista vacía y carrusel.
- `CarruselCultural`: reutiliza `useCarrusel`, flechas y puntos; solo desplaza tarjetas
  ya descargadas. No hace nuevas peticiones al navegar ni tiene reproducción automática.
- `TarjetaCultural`: presenta descripción, fecha y enlace; carga la imagen de forma
  diferida y recuerda sus fallos durante la pestaña. Las imágenes sí se descargan
  desde su CDN, pero esa descarga no usa la clave de API.SH.
- `NoticiasCulturales.css`: adapta las tarjetas a tres, dos o una por vista, según
  el ancho, y añade animaciones respetando `prefers-reduced-motion`.

Los enlaces usan `target="_blank"` para abrir otra pestaña y
`rel="noopener noreferrer"` para aislar la página de destino y no enviar el referente.

### 6. Qué explicar sobre seguridad, pruebas y límites

La API Key se utiliza solo de servidor a proveedor; no se manda a React ni se
guarda en la caché. Los errores de conexión, timeout, HTTP o formato generan un
mensaje público genérico cuando no hay datos previos. La normalización evita
reenviar campos internos y cuerpos completos del proveedor.

Las pruebas de `Back/tests/test_instagram.py` simulan la red, el reloj y el archivo
de caché. Verifican normalización, nulos, respuestas vacías o inválidas, fallos,
persistencia, vencimiento y ambas rutas del endpoint. Las de
`Front/tests/instagram.test.tsx` verifican el servicio y el HTML de React, la caché
breve, los estados y el respaldo de imágenes. No comprueban por sí solas el
deslizamiento real ni el aspecto visual: eso requiere revisar el navegador.

La solución depende de la disponibilidad de API.SH y de las imágenes de Instagram.
La actualización no es instantánea y el límite compartido requiere un solo proceso
con disco persistente. Reiniciar sin ese disco puede provocar otra consulta real.

### 7. Guion breve para exponer

> La sección Cultura Nayarit muestra hasta seis publicaciones públicas mediante
> API.SH. React consulta a nuestro backend de FastAPI, que protege la clave de API
> y revisa primero una caché. Si corresponde actualizar, hace la petición con httpx,
> selecciona los campos necesarios y guarda el resultado durante seis horas. Si
> falla el proveedor, conserva los últimos datos válidos. El frontend presenta los
> resultados en un carrusel con estados de carga y error, fechas válidas y respaldo
> para imágenes que no cargan. Las pruebas usan respuestas simuladas para no
> consumir créditos y esta integración no modifica la base de datos de Supabase.
