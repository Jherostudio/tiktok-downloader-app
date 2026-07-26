const fs = require("fs");
const { verifyDownloadToken } = require("../services/token.service");
const queueService = require("../services/queue.service");
const { ValidationError, NotFoundError } = require("../utils/errors");
const { isSafeFile } = require("../utils/files");
const logger = require("../utils/logger");

/**
 * Inicia un trabajo de descarga en la cola verificando primero el token temporal firmado.
 */
function requestDownload(req, res, next) {
    try {
        const { token, format } = req.body;
        const clientIp = req.ip;

        // 1. Verificar firma y validez del token
        const payload = verifyDownloadToken(token);
        if (!payload) {
            throw new ValidationError("El token de descarga es inválido o ha expirado. Por favor, vuelve a analizar el enlace.");
        }

        // 2. Verificar que el formato solicitado coincide con el del token
        if (payload.format !== format) {
            throw new ValidationError("El formato solicitado no coincide con la autorización del token.");
        }

        // 3. Crear un trabajo en la cola de descarga
        const title = payload.title || "fasttok_download";
        const jobId = queueService.createJob(clientIp, payload.url, format, title);

        res.status(202).json({
            success: true,
            jobId
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Conecta al flujo de eventos Server-Sent Events (SSE) para seguir el progreso de una descarga en tiempo real.
 */
function getDownloadProgress(req, res, next) {
    const { jobId } = req.params;

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    });

    const registered = queueService.registerClient(jobId, res);
    
    if (!registered) {
        res.write(`data: ${JSON.stringify({ status: "error", error: "El identificador de descarga no existe." })}\n\n`);
        res.end();
    }
}

/**
 * Envía el archivo descargado final al navegador y limpia los archivos físicos del disco.
 */
function retrieveDownloadedFile(req, res, next) {
    try {
        const { jobId } = req.params;
        const job = queueService.jobs[jobId];

        if (!job || job.status !== "completed" || !job.filePath) {
            throw new NotFoundError("El archivo solicitado no está disponible o ya fue descargado.");
        }

        const { filePath, fileName } = job;

        // Validación de seguridad para evitar path traversal y symlinks antes de transferir
        if (!isSafeFile(filePath)) {
            logger.error({ jobId, filePath }, "Intento de descarga de archivo fuera de límites seguros bloqueado.");
            throw new ValidationError("Descarga de archivo bloqueada por directivas de seguridad.");
        }

        res.download(filePath, fileName, (err) => {
            // Programar la eliminación de los archivos temporales después de 2 minutos 
            // para permitir HEAD/Range requests y gestores de descarga de los navegadores.
            setTimeout(() => {
                const jobTempDir = require("path").dirname(filePath);
                try {
                    if (fs.existsSync(jobTempDir)) {
                        fs.rmSync(jobTempDir, { recursive: true, force: true });
                    }
                } catch (unlinkError) {
                    logger.error({ err: unlinkError, jobTempDir }, "Error limpiando carpeta temporal tras la descarga.");
                }
                
                // Eliminar el trabajo de la memoria del despachador
                delete queueService.jobs[jobId];
            }, 2 * 60 * 1000); // 2 minutos de gracia
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Cancela una descarga en proceso y remueve el trabajo de la cola.
 */
function cancelDownload(req, res, next) {
    try {
        const { jobId } = req.params;
        const job = queueService.jobs[jobId];

        if (!job) {
            throw new NotFoundError("Trabajo de descarga no encontrado.");
        }

        queueService.cancelJob(jobId);

        res.status(200).json({
            success: true,
            message: "Descarga cancelada con éxito."
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Retorna el estado y progreso actual en formato JSON simple.
 * Diseñado para clientes que no pueden usar Server-Sent Events (SSE), como Atajos de iOS.
 */
function getDownloadStatus(req, res, next) {
    try {
        const { jobId } = req.params;
        const job = queueService.jobs[jobId];

        if (!job) {
            throw new NotFoundError("Trabajo de descarga no encontrado.");
        }

        res.status(200).json({
            success: true,
            status: job.status,
            progress: job.progress,
            error: job.status === "error" ? (job.error || "Error al procesar la descarga.") : undefined
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    requestDownload,
    getDownloadProgress,
    retrieveDownloadedFile,
    cancelDownload,
    getDownloadStatus
};
