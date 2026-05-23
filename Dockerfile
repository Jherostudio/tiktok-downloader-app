FROM node:20-slim

# Instalar Python, FFmpeg y herramientas necesarias en el sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Crear un entorno virtual para yt-dlp (recomendado en sistemas modernos)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Instalar yt-dlp al sistema
RUN pip install -U yt-dlp

# Crear y movernos a la carpeta de tu app
WORKDIR /app

# Copiar el package.json e instalar las librerías de Node.js
COPY package*.json ./
RUN npm install

# Copiar todo el resto de tus archivos (server.js, index.html)
COPY . .

# Exponer el puerto
ENV PORT=3000
EXPOSE 3000

# Comando para iniciar el Servidor
CMD ["node", "server.js"]
