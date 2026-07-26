const crypto = require("crypto");
const logger = require("../utils/logger");

// Generar una clave secreta aleatoria al iniciar el servidor
const TOKEN_SECRET = crypto.randomBytes(32).toString("hex");

/**
 * Genera un token firmado temporal que liga una URL y formato válidos
 * con una expiración de 10 minutos.
 */
function generateDownloadToken(url, format, duration = 0) {
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos de expiración
    const payload = JSON.stringify({ url, format, duration, expiresAt });
    const payloadBase64 = Buffer.from(payload).toString("base64");
    
    const signature = crypto
        .createHmac("sha256", TOKEN_SECRET)
        .update(payload)
        .digest("hex");
        
    return `${payloadBase64}.${signature}`;
}

/**
 * Verifica un token temporal. Si es válido y no ha expirado,
 * retorna el payload decodificado. Si es inválido, retorna null.
 */
function verifyDownloadToken(token) {
    try {
        if (typeof token !== "string") return null;
        
        const parts = token.split(".");
        if (parts.length !== 2) return null;
        
        const payloadBase64 = parts[0];
        const signature = parts[1];
        
        const payloadStr = Buffer.from(payloadBase64, "base64").toString("utf8");
        const expectedSignature = crypto
            .createHmac("sha256", TOKEN_SECRET)
            .update(payloadStr)
            .digest("hex");
            
        if (signature !== expectedSignature) {
            logger.warn("Firma de token de descarga no coincide.");
            return null;
        }
        
        const payload = JSON.parse(payloadStr);
        if (Date.now() > payload.expiresAt) {
            logger.warn("Token de descarga expirado.");
            return null;
        }
        
        return payload;
    } catch (e) {
        logger.error({ err: e }, "Error verificando token de descarga.");
        return null;
    }
}

module.exports = {
    generateDownloadToken,
    verifyDownloadToken
};
