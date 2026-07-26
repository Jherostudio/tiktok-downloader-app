const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const env = require("../config/env");
const { TEMP_DIR } = require("../config/constants");
const logger = require("../utils/logger");

/**
 * Ejecuta el subproceso de descarga e interpreta su progreso.
 * Crea una carpeta temporal aislada por trabajo para evitar colisiones y accesos cruzados.
 */
function runDownload(job, onProgress) {
    return new Promise((resolve, reject) => {
        const { id, url, format } = job;
        
        // Crear carpeta temporal aislada para el trabajo
        const jobTempDir = path.join(TEMP_DIR, id);
        try {
            fs.mkdirSync(jobTempDir, { recursive: true });
        } catch (err) {
            logger.error({ err, id }, "No se pudo crear el directorio temporal del trabajo.");
            return reject(new Error("Error al inicializar el almacenamiento de la descarga."));
        }

        const isAudio = format === "mp3" || format === "m4a";
        const extension = format; // mp3, m4a o mp4
        
        // Plantilla de salida de yt-dlp dentro de la carpeta aislada del trabajo
        const outputTemplate = path.join(jobTempDir, `file.%(ext)s`);

        let args = [
            "--no-playlist",
            "--restrict-filenames",
            "--no-progress", // Evita barras animadas, preferimos --newline
            "--newline",     // Genera saltos de línea estructurados
            "--socket-timeout", "15",
            "--retries", "3",
            "--fragment-retries", "3",
            "--max-filesize", env.MAX_FILE_SIZE_BYTES.toString(),
            "-o", outputTemplate
        ];

        // Añadir formato
        if (isAudio) {
            args.push(
                "-f", "ba",
                "-x",
                "--audio-format", format,
                "--audio-quality", "0" // Máxima calidad
            );
        } else {
            // Descargar video, preferiblemente MP4 combinado, o remuxear a MP4
            args.push(
                "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / best",
                "--remux-video", "mp4"
            );
        }

        // Agregar la URL al final de los argumentos (seguro mediante spawn)
        args.push(url);

        logger.info({ jobId: id, format, args: args.slice(0, -1) }, "Lanzando proceso yt-dlp");

        const child = spawn("yt-dlp", args);
        job.childProcess = child;

        // Escuchar el output de descarga para actualizar progreso
        const parseProgress = (data) => {
            const output = data.toString();
            // Buscar patrón de porcentaje (ej: "[download]  45.3% of ...")
            const match = output.match(/(\d+(?:\.\d+)?)%/);
            if (match) {
                const percentage = parseFloat(match[1]);
                onProgress(percentage);
            }
        };

        child.stdout.on("data", parseProgress);
        child.stderr.on("data", parseProgress);

        child.on("close", (code) => {
            if (code === 0) {
                try {
                    // Buscar el archivo final resultante en la carpeta aislada
                    const files = fs.readdirSync(jobTempDir);
                    const finalFile = files.find(file => !file.endsWith(".part") && !file.endsWith(".temp"));
                    
                    if (finalFile) {
                        const finalPath = path.join(jobTempDir, finalFile);
                        resolve({
                            filePath: finalPath,
                            fileName: job.fileName // Mantiene el nombre sanitizado
                        });
                    } else {
                        reject(new Error("No se generó el archivo de salida final."));
                    }
                } catch (e) {
                    reject(e);
                }
            } else {
                // Si falla el comando, intentar una descarga de fallback con formato best simple
                logger.warn({ jobId: id, code }, "Proceso yt-dlp falló. Intentando fallback simple.");
                
                const fallbackArgs = [
                    "--no-playlist",
                    "--restrict-filenames",
                    "--newline",
                    "-f", "best",
                    "-o", outputTemplate,
                    url
                ];

                const fallbackChild = spawn("yt-dlp", fallbackArgs);
                job.childProcess = fallbackChild;

                fallbackChild.stdout.on("data", parseProgress);
                fallbackChild.stderr.on("data", parseProgress);

                fallbackChild.on("close", (fallbackCode) => {
                    if (fallbackCode === 0) {
                        try {
                            const files = fs.readdirSync(jobTempDir);
                            const finalFile = files.find(file => !file.endsWith(".part") && !file.endsWith(".temp"));
                            if (finalFile) {
                                resolve({
                                    filePath: path.join(jobTempDir, finalFile),
                                    fileName: job.fileName
                                });
                            } else {
                                reject(new Error("La descarga de fallback falló."));
                            }
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error("Error al descargar el video. El enlace podría ser inválido o estar protegido."));
                    }
                });
            }
        });

        child.on("error", (err) => {
            reject(err);
        });
    });
}

module.exports = {
    runDownload
};
