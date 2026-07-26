const { execFile } = require("child_process");
const env = require("../config/env");
const logger = require("../utils/logger");
const { ValidationError } = require("../utils/errors");

/**
 * Filtra y valida dominios seguros para miniaturas de TikTok.
 */
function isSafeThumbnailUrl(urlStr) {
    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== "https:") return false;
        
        const host = parsed.hostname.toLowerCase();
        // Permitir solo CDN oficiales de TikTok o Akamai de confianza
        return (
            host.endsWith(".tiktokcdn.com") ||
            host.endsWith(".tiktok.com") ||
            host.endsWith(".akamaized.net") ||
            host.endsWith(".byteoversea.com")
        );
    } catch (e) {
        return false;
    }
}

/**
 * Sanitiza textos para remover caracteres que puedan ser dañinos y limita la longitud.
 */
function sanitizeText(text, maxLength = 80) {
    if (!text) return "";
    return text
        .replace(/[/\\?%*:|"<>\s]/g, " ") // quitar caracteres especiales
        .replace(/\s+/g, " ")              // colapsar espacios múltiples
        .trim()
        .substring(0, maxLength);
}

/**
 * Extrae formatos de video y audio reales disponibles.
 */
function extractAvailableFormats(metadata) {
    const formats = [];
    
    // Determinar la resolución vertical/horizontal del video
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const maxDimension = Math.max(width, height);
    
    // 1. Ofrecer MP3 (Audio)
    formats.push({
        id: "mp3",
        type: "audio",
        container: "mp3",
        quality: "Audio (320kbps)",
        estimatedSize: metadata.duration ? Math.round(metadata.duration * 320 * 1024 / 8) : null
    });

    // 2. Ofrecer formatos de video dependiendo de la calidad del original
    // TikTok suele entregar videos en 720p o 576p (máximo 1080p).
    if (maxDimension >= 1080) {
        formats.push({
            id: "1080p",
            type: "video",
            container: "mp4",
            quality: "1080p Full HD",
            estimatedSize: null
        });
    }

    if (maxDimension >= 720) {
        formats.push({
            id: "720p",
            type: "video",
            container: "mp4",
            quality: "720p HD",
            estimatedSize: null
        });
    }

    if (maxDimension >= 480) {
        formats.push({
            id: "480p",
            type: "video",
            container: "mp4",
            quality: "480p SD",
            estimatedSize: null
        });
    }

    // Siempre ofrecer el formato original "best"
    formats.push({
        id: "original",
        type: "video",
        container: "mp4",
        quality: "Calidad Original",
        estimatedSize: metadata.filesize || metadata.filesize_approx || null
    });

    return formats;
}

/**
 * Obtiene los metadatos de un video mediante yt-dlp de manera segura.
 */
function fetchVideoMetadata(url) {
    return new Promise((resolve, reject) => {
        const args = [
            "-j",
            "--skip-download",
            "--no-playlist",
            "--no-warnings",
            "--socket-timeout", "15",
            url
        ];

        logger.info({ url }, "Obteniendo metadatos con yt-dlp");

        const options = {
            maxBuffer: 10 * 1024 * 1024, // 10MB máximo de salida JSON
            timeout: env.ANALYZE_TIMEOUT_MS
        };

        execFile("yt-dlp", args, options, (error, stdout, stderr) => {
            if (error) {
                logger.error({ err: error, stderr }, "Fallo en yt-dlp al extraer metadatos.");
                
                if (error.killed) {
                    return reject(new Error("Tiempo de espera agotado al analizar el video."));
                }
                
                return reject(new ValidationError("No se pudo extraer información de este enlace. Es posible que sea privado o inválido."));
            }

            try {
                const metadata = JSON.parse(stdout);

                // Validar límites de duración
                const duration = metadata.duration || 0;
                if (duration > env.MAX_VIDEO_DURATION_SECONDS) {
                    return reject(new ValidationError(`El video excede la duración máxima permitida de ${env.MAX_VIDEO_DURATION_SECONDS / 60} minutos.`));
                }

                // Filtrar thumbnail inseguro
                const rawThumb = metadata.thumbnail || (metadata.thumbnails && metadata.thumbnails.length > 0 ? metadata.thumbnails[metadata.thumbnails.length - 1].url : "");
                const thumbnail = isSafeThumbnailUrl(rawThumb) ? rawThumb : "/icon.svg";

                // Sanitizar campos descriptivos
                const info = {
                    id: metadata.id || `video-${Date.now()}`,
                    title: sanitizeText(metadata.title || metadata.description || "Video de FastTok"),
                    creator: sanitizeText(metadata.uploader || metadata.creator || "Creador"),
                    thumbnail,
                    duration,
                    formats: extractAvailableFormats(metadata)
                };

                resolve(info);
            } catch (parseError) {
                logger.error({ err: parseError }, "Error parseando metadatos JSON.");
                reject(new Error("Error al estructurar los detalles del video."));
            }
        });
    });
}

module.exports = {
    fetchVideoMetadata
};
