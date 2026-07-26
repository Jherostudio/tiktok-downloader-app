const fs = require("fs");
const path = require("path");
const { TEMP_DIR } = require("../config/constants");

/**
 * Valida que una ruta de archivo esté estrictamente dentro de la carpeta temporal permitida.
 * Previene ataques de Path Traversal.
 */
function isSafePath(filePath) {
    const resolvedPath = path.resolve(filePath);
    const resolvedTempDir = path.resolve(TEMP_DIR);
    return resolvedPath.startsWith(resolvedTempDir);
}

/**
 * Comprueba de manera segura si un archivo existe y no es un enlace simbólico (Symlink).
 * Previene ataques basados en enlaces simbólicos.
 */
function isSafeFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return false;
        
        // Obtener estadísticas de forma que no siga enlaces simbólicos (lstat)
        const stats = fs.lstatSync(filePath);
        
        // Debe ser un archivo regular y no un enlace simbólico
        return stats.isFile() && !stats.isSymbolicLink() && isSafePath(filePath);
    } catch (e) {
        return false;
    }
}

/**
 * Elimina un archivo de forma segura si cumple con los criterios de seguridad.
 */
function safeUnlink(filePath) {
    try {
        if (isSafeFile(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
    } catch (e) {
        // Silencioso en errores de borrado de temporales para no romper flujos principales
    }
    return false;
}

module.exports = {
    isSafePath,
    isSafeFile,
    safeUnlink
};
