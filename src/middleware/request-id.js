const { v4: uuidv4 } = require("uuid");

/**
 * Middleware para asociar un identificador UUID único a cada solicitud HTTP.
 */
function requestIdMiddleware(req, res, next) {
    // Si la petición ya trae una cabecera de Request ID (ej: de un balanceador o proxy como Cloudflare), reusarla
    const requestId = req.headers["x-request-id"] || uuidv4();
    req.id = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
}

module.exports = requestIdMiddleware;
