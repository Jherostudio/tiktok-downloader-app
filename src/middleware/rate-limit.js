const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const { RateLimitError } = require("../utils/errors");

// Limiter para el endpoint de análisis (/api/analyze)
const analyzeLimiter = env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 60 * 1000, // 1 minuto
        max: env.ANALYZE_RATE_LIMIT_PER_MINUTE,
        standardHeaders: true, // Retorna cabeceras RateLimit-* estándar
        legacyHeaders: false,
        handler: (req, res, next) => {
            next(new RateLimitError(`Límite de análisis de video excedido (${env.ANALYZE_RATE_LIMIT_PER_MINUTE} por minuto). Por favor, espera 1 minuto.`));
        }
    });

// Limiter para el endpoint de descarga (/api/download)
const downloadLimiter = env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 60 * 1000, // 1 minuto
        max: env.DOWNLOAD_RATE_LIMIT_PER_MINUTE,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next) => {
            next(new RateLimitError(`Límite de descargas excedido (${env.DOWNLOAD_RATE_LIMIT_PER_MINUTE} por minuto). Por favor, reintenta en un momento.`));
        }
    });

module.exports = {
    analyzeLimiter,
    downloadLimiter
};
