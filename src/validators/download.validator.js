const { z } = require("zod");

// Esquema para validar el endpoint /api/analyze
const analyzeRequestSchema = z.object({
    url: z.string({
        required_error: "La URL es obligatoria."
    })
    .url("El formato de la URL no es válido.")
    .max(2048, "La URL es demasiado larga.")
});

// Esquema para validar el endpoint /api/download
const downloadRequestSchema = z.object({
    token: z.string({
        required_error: "El token de descarga es obligatorio."
    }),
    format: z.string({
        required_error: "El formato es obligatorio."
    })
});

module.exports = {
    analyzeRequestSchema,
    downloadRequestSchema
};
