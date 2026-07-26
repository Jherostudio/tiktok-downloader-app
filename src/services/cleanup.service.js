const fs = require("fs");
const path = require("path");
const env = require("../config/env");
const { TEMP_DIR } = require("../config/constants");
const logger = require("../utils/logger");
const { isSafePath } = require("../utils/files");

/**
 * Limpia carpetas temporales huérfanas o antiguas dentro de TEMP_DIR.
 */
function runCleanup() {
    try {
        if (!fs.existsSync(TEMP_DIR)) {
            // Asegurarnos de que el directorio temporal existe al iniciar
            fs.mkdirSync(TEMP_DIR, { recursive: true });
            return;
        }

        const items = fs.readdirSync(TEMP_DIR);
        const now = Date.now();
        const maxAgeMs = env.TEMP_FILE_MAX_AGE_MINUTES * 60 * 1000;

        let foldersDeleted = 0;

        items.forEach(item => {
            const itemPath = path.join(TEMP_DIR, item);
            
            // Validaciones de seguridad de ruta
            if (!isSafePath(itemPath)) {
                logger.warn({ itemPath }, "Ruta sospechosa detectada en limpieza temporales. Ignorando.");
                return;
            }

            try {
                const stats = fs.statSync(itemPath);
                
                // Solo limpiar subcarpetas del tipo fasttok-job-
                if (stats.isDirectory() && item.startsWith("fasttok-job-")) {
                    const age = now - stats.mtimeMs;
                    
                    if (age > maxAgeMs) {
                        // Borrar de forma recursiva la subcarpeta de trabajo
                        fs.rmSync(itemPath, { recursive: true, force: true });
                        foldersDeleted++;
                    }
                }
            } catch (err) {
                // Silencioso por si el archivo está siendo usado o ya fue borrado
            }
        });

        if (foldersDeleted > 0) {
            logger.info({ foldersDeleted }, "Limpieza de archivos temporales completada.");
        }
    } catch (e) {
        logger.error({ err: e }, "Error en el servicio de limpieza de temporales.");
    }
}

/**
 * Inicializa el limpiador recurrente.
 */
function initCleanupService() {
    // Ejecutar inmediatamente
    runCleanup();
    
    // Configurar intervalo recurrente
    const intervalMs = env.CLEANUP_INTERVAL_MINUTES * 60 * 1000;
    setInterval(runCleanup, intervalMs);
    
    logger.info({ intervalMinutes: env.CLEANUP_INTERVAL_MINUTES }, "Servicio de limpieza temporales inicializado.");
}

module.exports = {
    runCleanup,
    initCleanupService
};
