# ⚡ FastTok Downloader

FastTok es una aplicación web rápida y ligera para descargar videos de TikTok (y otras plataformas compatibles con `yt-dlp`) sin complicaciones. Está construida con Node.js, Express y una interfaz PWA amigable para dispositivos móviles.

## ✨ Características

- **Descarga Rápida:** Integra `yt-dlp` para procesar y descargar videos en su mejor calidad.
- **Interfaz Limpia y Responsiva:** Diseño oscuro y minimalista adaptado tanto para móviles como para PC.
- **Progressive Web App (PWA):** Instalable en dispositivos móviles para una experiencia nativa.
- **Monetización Integrada:** Incluye un sistema de anuncios (Adsterra) con un botón "HD PRO" que muestra publicidad durante 10 segundos antes de realizar la descarga.
- **Dockerizado:** Listo para ser desplegado en cualquier entorno compatible con Docker mediante un `Dockerfile` optimizado.

## 🛠️ Tecnologías

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Procesamiento de Video:** `yt-dlp`, FFmpeg, Python 3
- **Contenerización:** Docker

## 🚀 Requisitos Previos

Si deseas ejecutar el proyecto localmente sin Docker, necesitarás tener instalado:

- Node.js (v18 o superior)
- Python 3 y `pip`
- FFmpeg
- `yt-dlp` (se puede instalar con `pip install -U yt-dlp`)

## 📦 Instalación y Uso (Local)

1. Clona este repositorio y navega al directorio del proyecto:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd FastTok
   ```

2. Instala las dependencias de Node.js:
   ```bash
   npm install
   ```

3. Inicia el servidor:
   ```bash
   node server.js
   ```

4. Abre tu navegador y accede a `http://localhost:3000`.

## 🐳 Uso con Docker (Recomendado)

El proyecto incluye un `Dockerfile` que configura automáticamente todo el entorno (Node.js, Python, FFmpeg y yt-dlp).

1. Construye la imagen de Docker:
   ```bash
   docker build -t fasttok-downloader .
   ```

2. Ejecuta el contenedor:
   ```bash
   docker run -p 3000:3000 fasttok-downloader
   ```

3. Accede a `http://localhost:3000`.

## 📝 Estructura del Proyecto

- `server.js`: Servidor Express que maneja la ruta de descarga usando `execFile` por seguridad.
- `index.html`: Interfaz de usuario principal.
- `public/`: Archivos estáticos como el manifest de PWA, íconos y Service Worker (`sw.js`).
- `Dockerfile`: Instrucciones para construir el contenedor.

## 🛡️ Seguridad y Consideraciones

- El servidor utiliza `execFile` en lugar de `exec` para invocar `yt-dlp`, previniendo inyección de comandos en la URL.
- Los videos descargados se eliminan automáticamente del servidor una vez que se envían al cliente.

## 👨‍💻 Autor

Creado por **[Jhero Studio]** © 2026.
