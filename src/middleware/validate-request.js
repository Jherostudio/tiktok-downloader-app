const { ValidationError } = require("../utils/errors");

/**
 * Middleware para validar el cuerpo de una petición utilizando esquemas de Zod.
 */
function validateRequest(schema) {
    return (req, res, next) => {
        try {
            // Validar req.body contra el esquema de Zod
            schema.parse(req.body);
            next();
        } catch (error) {
            // Extraer el primer mensaje de error legible de Zod
            const message = error.errors && error.errors.length > 0 
                ? error.errors[0].message 
                : "Datos de petición no válidos.";
                
            next(new ValidationError(message));
        }
    };
}

module.exports = validateRequest;
