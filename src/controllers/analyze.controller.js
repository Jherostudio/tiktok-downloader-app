const { validateAndResolveUrl } = require("../validators/url.validator");
const { fetchVideoMetadata } = require("../services/metadata.service");
const { generateDownloadToken } = require("../services/token.service");

/**
 * Controlador de análisis de video de TikTok.
 * Valida la URL, extrae metadatos seguros de forma asíncrona y firma tokens de descarga individuales.
 */
async function analyzeVideo(req, res, next) {
    try {
        const { url } = req.body;

        // 1. Validar y resolver de forma segura (mitigación SSRF) la URL de entrada
        const resolvedUrl = await validateAndResolveUrl(url);

        // 2. Extraer metadatos de forma segura (sin descarga del archivo completo)
        const metadata = await fetchVideoMetadata(resolvedUrl);

        // 3. Firmar un token criptográfico único para cada formato disponible
        // Esto previene que los usuarios modifiquen la URL o elijan formatos no validados
        const formatsWithTokens = metadata.formats.map(format => {
            const token = generateDownloadToken(resolvedUrl, format.id, metadata.duration);
            return {
                id: format.id,
                type: format.type,
                container: format.container,
                quality: format.quality,
                estimatedSize: format.estimatedSize,
                token // Token de descarga seguro y firmado
            };
        });

        res.status(200).json({
            success: true,
            data: {
                id: metadata.id,
                title: metadata.title,
                creator: metadata.creator,
                thumbnail: metadata.thumbnail,
                duration: metadata.duration,
                formats: formatsWithTokens
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    analyzeVideo
};
