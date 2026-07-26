const logger = require("../utils/logger");
const env = require("../config/env");
const { ERROR_CODES } = require("../config/constants");

/**
 * Middleware centralizador para el manejo y formateo seguro de errores en Express.
 */
function errorHandler(err, req, res, next) {
    const isOperational = err.isOperational || false;
    const statusCode = err.statusCode || 500;
    const errorCode = err.errorCode || ERROR_CODES.INTERNAL_ERROR;

    // Registrar log técnico estructurado detallado en el servidor
    logger.error({
        requestId: req.id,
        path: req.path,
        method: req.method,
        err: {
            name: err.name,
            message: err.message,
            statusCode,
            errorCode,
            stack: env.NODE_ENV !== "production" ? err.stack : undefined
        }
    }, "Error capturado en el flujo de Express.");

    // Respuesta genérica de seguridad para el cliente
    const response = {
        success: false,
        error: {
            code: errorCode,
            message: isOperational 
                ? err.message 
                : "Ha ocurrido un error inesperado en el servidor. Por favor, inténtalo de nuevo."
        }
    };

    // Si estamos en desarrollo y no es un error previsto, inyectar stacktrace para depuración
    if (env.NODE_ENV === "development" && !isOperational) {
        response.error.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

module.exports = errorHandler;
