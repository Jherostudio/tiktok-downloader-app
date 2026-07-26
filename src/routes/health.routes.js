const express = require("express");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { TEMP_DIR } = require("../config/constants");
const logger = require("../utils/logger");

const router = express.Router();

// Almacén para caché de comprobación de dependencias (para no saturar con spawns en cada probe)
let cachedReadyStatus = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché

/**
 * Función para comprobar de manera ligera la disponibilidad de yt-dlp y FFmpeg
 */
function checkDependency(command, args) {
    return new Promise((resolve) => {
        execFile(command, args, { timeout: 3000 }, (err) => {
            if (err) {
                logger.warn({ command, err }, `Dependencia no disponible: ${command}`);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

router.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "fasttok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        adsEnabled: require("../config/env").ADS_ENABLED
    });
});

router.get("/ready", async (req, res) => {
    const now = Date.now();

    // Reusar estado de preparación si está dentro del tiempo de vida de la caché
    if (cachedReadyStatus && (now - lastCheckTime < CACHE_TTL_MS)) {
        if (cachedReadyStatus.ready) {
            return res.status(200).json(cachedReadyStatus);
        } else {
            return res.status(503).json(cachedReadyStatus);
        }
    }

    let tempDirWritable = false;
    try {
        // Verificar si podemos escribir en la carpeta temporal
        const testFile = path.join(TEMP_DIR, `.ready-test-${now}`);
        fs.writeFileSync(testFile, "test");
        fs.unlinkSync(testFile);
        tempDirWritable = true;
    } catch (e) {
        logger.error({ err: e }, "La carpeta temporal no es escribible.");
    }

    // Comprobar la existencia de yt-dlp y ffmpeg
    const ytdlpAvailable = await checkDependency("yt-dlp", ["--version"]);
    const ffmpegAvailable = await checkDependency("ffmpeg", ["-version"]);

    const isReady = tempDirWritable && ytdlpAvailable && ffmpegAvailable;

    cachedReadyStatus = {
        ready: isReady,
        timestamp: new Date().toISOString(),
        checks: {
            temp_directory: tempDirWritable ? "ok" : "fail",
            yt_dlp: ytdlpAvailable ? "ok" : "fail",
            ffmpeg: ffmpegAvailable ? "ok" : "fail"
        }
    };
    
    lastCheckTime = now;

    if (isReady) {
        res.status(200).json(cachedReadyStatus);
    } else {
        res.status(503).json(cachedReadyStatus);
    }
});

module.exports = router;
