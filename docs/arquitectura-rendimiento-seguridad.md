# Trainnery: rendimiento, caché y seguridad

Estado al 22 de octubre de 2026. Qué está hecho en el código y qué queda en manos de quien opera
el servidor.

## 1. Datos y "consultas"

Trainnery no usa una base de datos SQL. `db.json` (usuarios, passkeys, vínculos, invitaciones,
suscripciones push) vive en memoria; cada usuario tiene sus archivos en `DATA_DIR`
(`state-*`, `records-*`, `chat-*`, `content-*`, `assign-*`). Las "consultas" son búsquedas en esos
arreglos y lecturas de esos archivos.

| Ruta caliente | Antes | Ahora |
|---|---|---|
| Sesión en cada petición | recorre `db.users` | índice `userById` (Map) |
| Recordatorio diario (cada 10 s) | leía y parseaba el estado de cada usuario con notificaciones | índice de recordatorios en memoria; lee el estado solo el minuto en que toca |
| Insignia del chat (cada 30 s por cliente) | leía y parseaba el chat (hasta 2.000 mensajes) | caché en memoria |
| Lista de clientes, ficha, admin | lecturas de disco por cliente | caché en memoria |
| Escritura de `db.json` | síncrona, con sangría, en cada cambio | agrupada por tick, compacta, en segundo plano |

Cuándo pasar a una base de datos real: con miles de usuarios activos o más de un proceso de API.
El paso natural es SQLite (un archivo, sin servidor) con índices por `userId`/`trainerId`; la capa
`api/lib/store.js` es el único lugar que lee y escribe archivos, así que el cambio queda acotado.

## 2. Estrategia de caché

**Servidor (`api/lib/store.js`)**: caché LRU de archivos ya parseados (300 entradas), de
escritura directa (write-through). Toda escritura actualiza la caché al instante, así que no hay
datos viejos: este proceso es el único que escribe en `DATA_DIR`. Si se restaura un respaldo hay
que reiniciar la API (igual que antes con `db.json`).

**HTTP (`web/nginx.conf`)**, según cuánto cambia cada archivo:

| Recurso | Cache-Control |
|---|---|
| `/assets/*` (con hash de Vite) | `public, max-age=31536000, immutable` |
| `index.html`, `sw.js`, `manifest.json` | `no-cache` (cada deploy se ve en la siguiente carga) |
| Íconos y logo | 7 días |
| `/img`, `/gif` (medios de ejercicios) | 30 días, `immutable` |
| `/api/*` | `no-store` (privado por usuario) |
| Archivos de contenido del entrenador | `private, max-age=3600` |

Compresión gzip también para las respuestas de la API (`gzip_proxied any`).

**Cloudflare**: en *Caching → Configuration*, "Browser Cache TTL" en **Respect Existing Headers**,
para que valgan las cabeceras de arriba (hoy Cloudflare reescribe los JS a 4 horas).

**Navegador**: el service worker guarda los medios (cache-first) y el resto con network-first; la
API nunca se guarda.

## 3. Trabajo pesado fuera de la petición

- Escrituras de `db.json` y de los archivos por usuario: asíncronas, atómicas (archivo temporal y
  luego renombrar), una a la vez por archivo; si se acumulan varias, solo se escribe la última.
- Subidas de contenido: se escriben en disco de forma asíncrona. Las descargas se sirven por
  streaming, sin cargar el archivo completo en memoria.
- Notificaciones push: se envían sin bloquear la respuesta.
- Apagado ordenado: con `SIGTERM` (cada deploy), la API termina las escrituras pendientes antes
  de salir.
- Coach IA: ya corre en un proceso aparte (`coach/jobs.js`).

## 4. Estrategia de seguridad

### En el código (hecho)

- **Cabeceras** (`web/security-headers.inc`): CSP estricta (todo `'self'`, sin scripts
  externos), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  `COOP`.
- **Límite de peticiones por visitante** (`api/lib/security.js`): registro, inicio de sesión e
  invitaciones a 20 por minuto; escrituras a 300 por minuto; lecturas a 900 por minuto. Responde
  `429` con `Retry-After`. La IP se toma de `CF-Connecting-IP`.
- **CSRF**: cookie `SameSite=Lax` + rechazo de escrituras cuyo `Origin` no es el del sitio.
- **Tamaño de las peticiones**: 256 KB en general; 5 MB solo en la sincronización de datos y en
  las subidas (`413` si se excede). nginx acepta hasta 6 MB en `/api/`; antes, su límite de 1 MB
  rompía las subidas de más de unos 700 KB.
- **Errores**: `400`/`413` para peticiones mal formadas; `500` genérico, sin detalles internos.
- **Dependencias**: `npm audit` de producción en 0 en la API y el frontend. Lo que queda son
  herramientas de desarrollo que no llegan a producción.
- Lo que ya existía: passkeys (sin contraseñas), cookie firmada `HttpOnly; Secure`, revocación con
  "cerrar sesión en todos los dispositivos", `DATA_DIR` en 0700, archivos de contenido privados
  (solo el entrenador y sus clientes) y solo imágenes o PDF.

### En el servidor (pendiente, requiere tu decisión)

Encontrado el 22/10/2026:

- SSH acepta contraseña y root.
- No hay firewall ni fail2ban.
- El panel de Coolify (`:8000`, sin HTTPS) y sus puertos `6001`, `6002` y `8080` están abiertos a
  internet.

`ops/harden-server.sh <tu IP>` lo corrige en un orden que no te deja fuera:

- SSH solo con llave;
- fail2ban;
- `ufw` con 22, 80 y 443;
- los puertos de Coolify solo desde tu IP, en la cadena `DOCKER-USER` (Docker se salta `ufw`);
- actualizaciones automáticas de seguridad.

Mantén abierta tu sesión SSH hasta comprobar que una nueva entra.

### Borde (Cloudflare, pendiente)

1. SSL/TLS en **Full (strict)**.
2. **WAF**: reglas administradas activas y una regla de rate limiting para `/api/login/*` y
   `/api/register/*`.
3. Origen oculto: hoy se puede llegar al servidor por IP sin pasar por Cloudflare. Lo ideal es
   permitir en 80/443 solo los rangos de IP de Cloudflare, o usar Cloudflare Tunnel.
4. El panel de Coolify detrás de un subdominio con **Cloudflare Access** en lugar del puerto 8000
   por HTTP.

### Datos y respaldos (pendiente)

- Los respaldos fuera del servidor incluyen `secret` (firma de sesiones) y las llaves VAPID:
  cifrarlos con `rclone crypt` antes de subirlos al bucket.
- Probar una restauración completa una vez por trimestre.

### Operación

- Revisar `npm audit` en cada entrega.
- Rotar `DATA_DIR/secret` si se sospecha una filtración (cierra todas las sesiones).
- Monitoreo de disponibilidad de `https://trainnery.com/api/health`.
