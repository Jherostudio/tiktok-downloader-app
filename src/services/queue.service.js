const crypto = require("crypto");
const env = require("../config/env");
const logger = require("../utils/logger");
const { ServerBusyError } = require("../utils/errors");

class QueueService {
    constructor() {
        this.jobs = {}; // Almacén de trabajos activos
        this.globalActiveCount = 0; // Descargas concurrentes globales activas
    }

    /**
     * Registra un nuevo trabajo en la cola.
     * Valida límites de tamaño de cola y concurrencia por IP.
     */
    createJob(ip, url, format, title) {
        const jobsList = Object.values(this.jobs);

        // 1. Validar límite máximo de la cola (trabajos pendientes)
        const totalQueued = jobsList.filter(j => j.status === "queued").length;
        if (totalQueued >= env.MAX_QUEUE_SIZE) {
            logger.warn({ ip, queueSize: totalQueued }, "Intento de agregar trabajo rechazado por cola llena.");
            throw new ServerBusyError("El servidor está procesando demasiadas descargas en este momento. Inténtalo más tarde.");
        }

        // 2. Validar concurrencia por IP (evitar que un solo cliente abuse)
        const activeIpJobs = jobsList.filter(
            j => j.ip === ip && (j.status === "processing" || j.status === "queued")
        ).length;
        
        if (activeIpJobs >= env.MAX_CONCURRENT_DOWNLOADS_PER_IP) {
            logger.warn({ ip, activeIpJobs }, "Intento de descarga simultánea por la misma IP bloqueado.");
            throw new ServerBusyError("Ya tienes una descarga en proceso. Espera a que finalice antes de iniciar otra.");
        }

        // Generar identificador criptográfico único e impredecible
        const jobId = `fasttok-job-${crypto.randomUUID()}`;

        const job = {
            id: jobId,
            ip,
            url,
            format,
            title,
            status: "queued",
            progress: 0,
            filePath: null,
            fileName: null,
            createdAt: Date.now(),
            childProcess: null,
            clients: [],
            timeoutTimer: null
        };

        this.jobs[jobId] = job;
        logger.info({ jobId, format }, "Trabajo registrado en la cola.");

        // Intentar despachar el trabajo si hay cupo disponible
        this.processQueue();

        return jobId;
    }

    /**
     * Procesa los trabajos pendientes de la cola respetando el límite global de concurrencia.
     */
    processQueue() {
        const queuedJobs = Object.values(this.jobs)
            .filter(j => j.status === "queued")
            .sort((a, b) => a.createdAt - b.createdAt);

        for (const job of queuedJobs) {
            if (this.globalActiveCount >= env.MAX_GLOBAL_CONCURRENT_DOWNLOADS) {
                logger.debug("Límite global de descargas simultáneas alcanzado. Esperando liberación...");
                break;
            }
            this.startJob(job.id);
        }
    }

    /**
     * Inicia la ejecución de un trabajo.
     */
    async startJob(jobId) {
        const job = this.jobs[jobId];
        if (!job || job.status !== "queued") return;

        job.status = "processing";
        this.globalActiveCount++;
        logger.info({ jobId: job.id }, "Trabajo en proceso.");

        // Configurar temporizador de tiempo de espera límite (Timeout)
        job.timeoutTimer = setTimeout(() => {
            logger.warn({ jobId: job.id }, "Tiempo límite de procesamiento excedido (Timeout).");
            this.failJob(job.id, "Tiempo de procesamiento de la descarga agotado.");
        }, env.DOWNLOAD_TIMEOUT_MS);

        try {
            // Importación diferida para evitar dependencias circulares
            const downloadService = require("./download.service");
            
            const onProgress = (percentage) => {
                this.updateProgress(job.id, percentage);
            };

            const result = await downloadService.runDownload(job, onProgress);
            this.completeJob(job.id, result.filePath, result.fileName);
        } catch (error) {
            logger.error({ err: error, jobId: job.id }, "Fallo en la ejecución de la descarga.");
            this.failJob(job.id, error.message || "Error al procesar la descarga.");
        }
    }

    /**
     * Actualiza el porcentaje del trabajo y notifica a los clientes escuchando.
     */
    updateProgress(jobId, percentage) {
        const job = this.jobs[jobId];
        if (!job || job.status !== "processing") return;

        job.progress = Math.min(percentage, 99.9);
        this.notifyClients(jobId, { status: "processing", progress: job.progress });
    }

    /**
     * Finaliza exitosamente el trabajo.
     */
    completeJob(jobId, filePath, fileName) {
        const job = this.jobs[jobId];
        if (!job || job.status !== "processing") return;

        if (job.timeoutTimer) clearTimeout(job.timeoutTimer);
        
        job.status = "completed";
        job.progress = 100;
        job.filePath = filePath;
        job.fileName = fileName;
        
        this.globalActiveCount = Math.max(0, this.globalActiveCount - 1);
        logger.info({ jobId }, "Trabajo finalizado con éxito.");
        
        this.notifyClients(jobId, { status: "completed", progress: 100 });
        this.closeClients(jobId);
        
        // Ejecutar siguiente trabajo en cola
        this.processQueue();
    }

    /**
     * Finaliza con error el trabajo, liberando recursos y eliminando archivos físicos.
     */
    failJob(jobId, errorMessage) {
        const job = this.jobs[jobId];
        if (!job) return;

        if (job.timeoutTimer) clearTimeout(job.timeoutTimer);

        const wasProcessing = job.status === "processing";
        job.status = "error";
        
        // Matar el subproceso yt-dlp/FFmpeg si sigue ejecutándose
        if (job.childProcess) {
            try {
                job.childProcess.kill();
            } catch (e) {}
        }

        if (wasProcessing) {
            this.globalActiveCount = Math.max(0, this.globalActiveCount - 1);
        }

        logger.info({ jobId, error: errorMessage }, "Trabajo terminado con error.");
        
        this.notifyClients(jobId, { status: "error", error: errorMessage });
        this.closeClients(jobId);
        
        // Limpiar archivos físicos temporales si existen
        const { safeUnlink } = require("../utils/files");
        if (job.filePath) {
            safeUnlink(job.filePath);
        }

        // Ejecutar siguiente trabajo en cola
        this.processQueue();
    }

    /**
     * Cancela un trabajo a petición del usuario.
     */
    cancelJob(jobId) {
        logger.info({ jobId }, "Trabajo cancelado por el usuario.");
        this.failJob(jobId, "Proceso de descarga cancelado.");
    }

    /**
     * Transmite actualizaciones a los clientes conectados.
     */
    notifyClients(jobId, data) {
        const job = this.jobs[jobId];
        if (!job) return;
        job.clients.forEach(res => {
            try {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (e) {}
        });
    }

    /**
     * Cierra todas las conexiones SSE activas de este trabajo.
     */
    closeClients(jobId) {
        const job = this.jobs[jobId];
        if (!job) return;
        job.clients.forEach(res => {
            try {
                res.end();
            } catch (e) {}
        });
        job.clients = [];
    }

    /**
     * Registra un cliente SSE (EventSource) para monitorear el progreso.
     */
    registerClient(jobId, res) {
        const job = this.jobs[jobId];
        if (!job) return false;

        if (job.status === "completed" || job.status === "error") {
            res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, error: job.status === "error" ? "Descarga fallida" : undefined })}\n\n`);
            res.end();
            return true;
        }

        job.clients.push(res);
        res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress })}\n\n`);
        return true;
    }
}

module.exports = new QueueService();
