const http = require("http");
const { execFile } = require("child_process");
const app = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");
const { initCleanupService } = require("./services/cleanup.service");
const queueService = require("./services/queue.service");

// Inicializar el servicio de limpieza periódica de archivos temporales
initCleanupService();

const server = http.createServer(app);

// Comprobar la disponibilidad de herramientas críticas de sistema al iniciar
function checkSystemDependencies() {
    execFile("yt-dlp", ["--version"], (err, stdout) => {
        if (err) {
            logger.error({ err }, "❌ ADVERTENCIA: 'yt-dlp' no está instalado o no es accesible en el PATH del sistema.");
        } else {
            logger.info({ version: stdout.trim() }, "✅ 'yt-dlp' detectado correctamente.");
        }
    });

    execFile("ffmpeg", ["-version"], (err) => {
        if (err) {
            logger.error({ err }, "❌ ADVERTENCIA: 'ffmpeg' no está instalado o no es accesible en el PATH del sistema. La extracción de audio no funcionará.");
        } else {
            logger.info("✅ 'ffmpeg' detectado correctamente.");
        }
    });
}

checkSystemDependencies();

// Iniciar la escucha del servidor HTTP
server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, "🚀 Servidor HTTP iniciado.");
});

// Manejo de apagado limpio (Graceful Shutdown)
function handleGracefulShutdown(signal) {
    logger.warn({ signal }, "Se recibió señal de apagado. Iniciando graceful shutdown...");

    // Evitar recibir nuevas conexiones
    server.close(() => {
        logger.info("Servidor HTTP cerrado. Limpiando procesos de descarga pendientes...");

        // Matar todos los subprocesos de descargas activas en la cola
        let activeKilled = 0;
        Object.values(queueService.jobs).forEach(job => {
            if (job.childProcess) {
                try {
                    job.childProcess.kill();
                    activeKilled++;
                } catch (e) {}
            }
            // Borrar archivos temporales asociados
            if (job.filePath) {
                const fs = require("fs");
                try {
                    if (fs.existsSync(job.filePath)) {
                        fs.unlinkSync(job.filePath);
                    }
                } catch (e) {}
            }
        });

        if (activeKilled > 0) {
            logger.info({ activeKilled }, "Subprocesos de descargas activas detenidos.");
        }

        logger.info("Apagado limpio finalizado. Saliendo del proceso.");
        process.exit(0);
    });

    // Forzar el apagado tras 10 segundos en caso de que queden conexiones colgadas
    setTimeout(() => {
        logger.fatal("Apagado forzado por timeout de apagado limpio.");
        process.exit(1);
    }, 10000);
}

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));

// Captura de errores no controlados para evitar caídas silenciosas
process.on("unhandledRejection", (reason, promise) => {
    logger.fatal({ reason, promise }, "Unhandled Rejection detectado en el proceso.");
});

process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "Uncaught Exception detectada en el proceso.");
    // Apagar inmediatamente de forma segura ante un error fatal no controlado
    process.exit(1);
});
