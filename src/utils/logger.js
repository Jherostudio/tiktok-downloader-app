const pino = require("pino");
const env = require("../config/env");

// Configuración de Pino para registro estructurado de logs
const logger = pino({
    level: env.LOG_LEVEL,
    redact: {
        paths: [
            "url", 
            "link", 
            "token", 
            "password", 
            "email", 
            "authorization", 
            "cookie",
            "req.headers.cookie",
            "req.headers.authorization"
        ],
        censor: "[REDACTED]"
    },
    // Serializadores para limitar la información registrada de peticiones y respuestas
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url, // Ojo: Se redactará si contiene url, pero Pino lo maneja por redact
            query: req.query,
            // Registramos un hash de la IP o la IP anonimizada en producción
            ip: req.ip ? require("crypto").createHash("sha256").update(req.ip).digest("hex").substring(0, 10) : undefined
        }),
        res: (res) => ({
            statusCode: res.statusCode
        }),
        err: (err) => ({
            type: err.name,
            message: err.message,
            code: err.code
            // Evitamos registrar stack trace en producción para mayor privacidad y rendimiento
        })
    }
});

module.exports = logger;
