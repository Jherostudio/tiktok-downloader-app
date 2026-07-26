FROM node:20-slim

# Instalar dependencias de sistema: Python3 (para yt-dlp) y FFmpeg (para conversión/extracción)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Crear entorno virtual de Python e instalar yt-dlp
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install -U --no-cache-dir yt-dlp

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias e instalar solo las de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fuente y estáticos necesarios de forma segura
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY server.js ./

# Crear el directorio temporal para descargas y asignar propiedad al usuario no root 'node'
RUN mkdir -p /app/temp && chown -R node:node /app

# Usar el usuario no root por defecto de la imagen de Node
USER node

# Configuración de variables de entorno predeterminadas de producción
ENV NODE_ENV=production
ENV PORT=3000

# Exponer el puerto de escucha
EXPOSE 3000

# Monitoreo de salud del contenedor (HEALTHCHECK)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de inicio
CMD ["node", "server.js"]
