const express = require("express");
const { 
    requestDownload, 
    getDownloadProgress, 
    retrieveDownloadedFile, 
    cancelDownload,
    getDownloadStatus
} = require("../controllers/download.controller");
const { downloadRequestSchema } = require("../validators/download.validator");
const validateRequest = require("../middleware/validate-request");
const { downloadLimiter } = require("../middleware/rate-limit");

const router = express.Router();

// Rutas de descarga y monitoreo
router.post("/download", downloadLimiter, validateRequest(downloadRequestSchema), requestDownload);
router.get("/progress/:jobId", getDownloadProgress);
router.get("/status/:jobId", getDownloadStatus);
router.get("/file/:jobId", retrieveDownloadedFile);
router.post("/cancel/:jobId", cancelDownload);

module.exports = router;
