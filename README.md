# ⚡ FastTok Downloader - Versión de Producción

FastTok es una aplicación web rápida, segura y ligera para analizar y descargar videos y audio de TikTok (y otras plataformas compatibles) de forma independiente. Esta versión ha sido completamente auditada, reestructurada y endurecida para producción, siguiendo las mejores prácticas de seguridad, arquitectura limpia y experiencia de usuario.

## 🏗️ Arquitectura del Proyecto

El backend se ha estructurado de forma modular para garantizar la mantenibilidad y la facilidad de prueba:

```
src/
├── app.js                 # Inicialización de Express y middlewares globales
├── server.js              # Arranque del servidor HTTP y graceful shutdown
├── config/
│   ├── env.js             # Validación estricta de variables de entorno (Zod)
│   └── constants.js       # Constantes del sistema y listas de hosts permitidos
├── routes/
│   ├── analyze.routes.js  # Rutas de análisis de enlaces
│   ├── download.routes.js # Rutas de colas, descargas y flujo de progreso
│   └── health.routes.js   # Diagnósticos de salud (/health y /ready)
├── controllers/
│   ├── analyze.controller.js
│   └── download.controller.js
├── services/
│   ├── metadata.service.js# Extracción segura de metadatos vía yt-dlp
│   ├── download.service.js# Procesamiento de descargas (spawn) e integración de FFmpeg
│   ├── cleanup.service.js # Tarea periódica de limpieza de archivos temporales
│   └── queue.service.js   # Cola de descargas en memoria con límites concurrentes
├── middleware/
│   ├── error-handler.js   # Manejador centralizado de errores (oculta stack traces)
│   ├── rate-limit.js      # Límites de solicitudes por IP (express-rate-limit)
│   ├── request-id.js      # Trazabilidad con Request ID único por petición
│   ├── security.js        # Cabeceras Helmet, CSP dinámica y orígenes CORS
│   └── validate-request.js# Middleware de validación con esquemas Zod
├── validators/
│   └── url.validator.js   # Validador de URL robusto y mitigación de ataques SSRF
└── tests/                 # Suite de pruebas automatizadas con Vitest y Supertest
```

---

## 🛡️ Medidas de Seguridad Implementadas

1. **Mitigación de SSRF (Server-Side Request Forgery):**
   - El validador estricto de URLs solo permite protocolo HTTPS y dominios oficiales de TikTok.
   - Resuelve enlaces acortados (`vm.tiktok.com`, `vt.tiktok.com`) de manera manual (máximo 5 redirecciones) usando peticiones `HEAD` rápidas sin descargar contenido.
   - Resuelve el DNS y bloquea cualquier host que apunte a rangos de IP privadas, loopback, multicast o servicios de metadatos de proveedores cloud (ej: `169.254.169.254`).
2. **Seguridad contra Inyección de Comandos:**
   - La ejecución de `yt-dlp` y `ffmpeg` se realiza mediante `spawn` o `execFile` pasando argumentos estructurados en arreglos independientes. Nunca se concatenan cadenas provenientes del usuario para ejecutar comandos.
3. **Hardening de Express:**
   - Inyección de cabeceras de seguridad mediante `Helmet`.
   - Política de Seguridad de Contenido (CSP) restrictiva que deshabilita scripts desconocidos y opcionalmente permite anuncios controlados.
   - Desactivación de cabeceras reveladoras como `x-powered-by`.
   - Limitación estricta del tamaño de payload JSON a un máximo de 10 KB.
4. **Protección contra DoS (Denegación de Servicio):**
   - Separación de rate limiters para análisis (10 req/min) y descargas (5 req/min, 20/hora).
   - Cola de trabajos en memoria con concurrencia máxima global (3) y por IP (1) para evitar sobrecargas de CPU por descargas simultáneas.
   - Temporizadores de timeout de 90 segundos por proceso.
5. **Manejo Seguro de Archivos Temporales:**
   - Cada descarga se realiza en una subcarpeta temporal aislada nombrada con UUID.
   - Sanitización absoluta de los nombres de archivos finales.
   - Eliminación forzada del archivo temporal al completarse la transferencia, en caso de error, al cancelarse la petición por el cliente, al exceder el timeout o cada 5 minutos por la tarea de purga en segundo plano.

---

## ⚙️ Variables de Entorno (.env)

Configura las siguientes variables en tu entorno de producción o archivo `.env`:

*   `NODE_ENV`: Entorno (`development`, `production`, `test`).
*   `PORT`: Puerto del servidor (predeterminado `8080` en el `.env`).
*   `PUBLIC_URL`: URL pública de la aplicación (predeterminado `http://localhost:8080`).
*   `ALLOWED_ORIGINS`: Dominios permitidos por CORS separados por comas.
*   `ADS_ENABLED`: `true` para activar espacios publicitarios no invasivos, `false` para desactivar por completo.
*   `MAX_GLOBAL_CONCURRENT_DOWNLOADS`: Descargas simultáneas globales (predeterminado `3`).
*   `MAX_CONCURRENT_DOWNLOADS_PER_IP`: Descargas simultáneas por cliente (predeterminado `1`).
*   `DOWNLOAD_TIMEOUT_MS`: Tiempo de espera máximo por descarga (predeterminado `90000`).

*(Consulta el archivo [.env.example](file:///.env.example) para ver la lista completa).*

---

## 🚀 Requisitos e Instalación

### Ejecución Local

1. Asegúrate de tener instalado **Node.js 20+**, **Python 3**, **FFmpeg** y **yt-dlp** en tu sistema.
2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```
3. Copia el archivo `.env.example` a `.env` y configura tus variables locales.
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   # o
   npm start
   ```

### Ejecución con Docker (Recomendado)

El proyecto incluye un `Dockerfile` seguro que corre bajo un usuario no root (`node`):

1. Construye la imagen Docker:
   ```bash
   docker build -t fasttok-prod .
   ```
2. Ejecuta el contenedor exponiendo el puerto:
   ```bash
   docker run -p 8080:8080 --env-file .env fasttok-prod
   ```

---

## 🧪 Pruebas Automatizadas

La aplicación cuenta con una suite completa de pruebas unitarias e integración usando **Vitest** y **Supertest** que no realizan peticiones reales a TikTok (mockeadas para seguridad y velocidad).

Las pruebas están configuradas mediante [vitest.config.js](file:///Volumes/CORSAIR/MY%20FILES/ING%20SOFTWARE/Cybersecurity/TikTok%20Downloader/vitest.config.js) para habilitar variables globales (`describe`, `it`, `expect`, `vi`, `beforeEach`) y excluir automáticamente archivos ocultos y temporales de macOS (`**/._*`).

Ejecuta las pruebas:
```bash
npm test
```

Ejecuta el reporte de cobertura:
```bash
npm run coverage
```

---

## 🛠️ Mantenimiento y Actualizaciones

### Cómo actualizar `yt-dlp` y `FFmpeg` de forma segura
Para evitar bloqueos por cambios en los reproductores de TikTok, es vital mantener actualizada la herramienta `yt-dlp`:

*   **En Docker:** Reconstruye tu contenedor periódicamente ejecutando `docker build --no-cache ...`. El build descarga automáticamente la última versión de `yt-dlp` desde pip.
*   **Localmente:** Ejecuta `pip install -U yt-dlp` periódicamente en tu sistema servidor.

---

## ⚖️ Aviso de Exención de Responsabilidad

FastTok es un software independiente desarrollado con fines educativos y de respaldo personal de contenido. No está afiliado, asociado, patrocinado, respaldado ni conectado de ninguna manera oficial con TikTok, ByteDance ni ninguna de sus subsidiarias o afiliadas. Los usuarios son responsables de garantizar que sus descargas cumplen con los términos de servicio de la plataforma de origen y las leyes de propiedad intelectual de sus respectivos países.
