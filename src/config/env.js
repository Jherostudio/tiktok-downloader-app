const { z } = require("zod");

// Esquema de validación para las variables de entorno
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.preprocess((val) => parseInt(val || "3000", 10), z.number().positive().default(3000)),
    PUBLIC_URL: z.string().url().default("http://localhost:3000"),
    
    // Lista de orígenes CORS permitidos (separados por comas en producción)
    ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
    
    ADS_ENABLED: z.preprocess((val) => val === "true", z.boolean().default(false)),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    MAX_JSON_SIZE: z.string().default("10kb"),
    
    // Límites de tasa (Rate Limiting)
    ANALYZE_RATE_LIMIT_PER_MINUTE: z.preprocess((val) => parseInt(val || "10", 10), z.number().positive().default(10)),
    DOWNLOAD_RATE_LIMIT_PER_MINUTE: z.preprocess((val) => parseInt(val || "5", 10), z.number().positive().default(5)),
    DOWNLOAD_RATE_LIMIT_PER_HOUR: z.preprocess((val) => parseInt(val || "20", 10), z.number().positive().default(20)),
    
    // Cola y concurrencia
    MAX_GLOBAL_CONCURRENT_DOWNLOADS: z.preprocess((val) => parseInt(val || "3", 10), z.number().positive().default(3)),
    MAX_CONCURRENT_DOWNLOADS_PER_IP: z.preprocess((val) => parseInt(val || "1", 10), z.number().positive().default(1)),
    MAX_QUEUE_SIZE: z.preprocess((val) => parseInt(val || "20", 10), z.number().positive().default(20)),
    
    // Timeouts en milisegundos
    DOWNLOAD_TIMEOUT_MS: z.preprocess((val) => parseInt(val || "90000", 10), z.number().positive().default(90000)),
    ANALYZE_TIMEOUT_MS: z.preprocess((val) => parseInt(val || "20000", 10), z.number().positive().default(20000)),
    
    // Límites de archivos y contenido
    MAX_FILE_SIZE_BYTES: z.preprocess((val) => parseInt(val || "209715200", 10), z.number().positive().default(209715200)), // 200MB
    MAX_VIDEO_DURATION_SECONDS: z.preprocess((val) => parseInt(val || "600", 10), z.number().positive().default(600)), // 10 min
    ANALYSIS_TOKEN_TTL_SECONDS: z.preprocess((val) => parseInt(val || "600", 10), z.number().positive().default(600)), // 10 min
    
    // Limpieza de archivos temporales
    TEMP_FILE_MAX_AGE_MINUTES: z.preprocess((val) => parseInt(val || "15", 10), z.number().positive().default(15)),
    CLEANUP_INTERVAL_MINUTES: z.preprocess((val) => parseInt(val || "5", 10), z.number().positive().default(5)),
    
    // Opcionales
    SENTRY_DSN: z.string().url().optional(),
    CONTACT_EMAIL: z.string().email().optional(),
    ADS_PROVIDER_SCRIPT_URL: z.string().optional()
});

let env;
try {
    env = envSchema.parse(process.env);
} catch (error) {
    console.error("❌ Error de configuración. Variables de entorno inválidas:");
    console.error(JSON.stringify(error.format(), null, 2));
    process.exit(1);
}

module.exports = env;
