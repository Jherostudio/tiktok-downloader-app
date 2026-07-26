const { ERROR_CODES } = require("../config/constants");

class AppError extends Error {
    constructor(message, statusCode, errorCode = ERROR_CODES.INTERNAL_ERROR) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Indica que es un error previsto/controlado
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message = "Los datos proporcionados no son válidos.") {
        super(message, 400, ERROR_CODES.VALIDATION_ERROR);
    }
}

class NotFoundError extends AppError {
    constructor(message = "El recurso solicitado no fue encontrado.") {
        super(message, 404, ERROR_CODES.NOT_FOUND);
    }
}

class RateLimitError extends AppError {
    constructor(message = "Has superado el límite de solicitudes permitidas. Por favor, inténtalo más tarde.") {
        super(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED);
    }
}

class ServerBusyError extends AppError {
    constructor(message = "El servidor está ocupado procesando otras descargas en este momento. Por favor, reintenta en unos instantes.") {
        super(message, 503, ERROR_CODES.SERVER_BUSY);
    }
}

class TimeoutError extends AppError {
    constructor(message = "El procesamiento del archivo ha superado el tiempo de espera límite.") {
        super(message, 504, ERROR_CODES.TIMEOUT);
    }
}

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    ServerBusyError,
    TimeoutError
};
