const express = require("express");
const { analyzeVideo } = require("../controllers/analyze.controller");
const { analyzeRequestSchema } = require("../validators/download.validator");
const validateRequest = require("../middleware/validate-request");
const { analyzeLimiter } = require("../middleware/rate-limit");

const router = express.Router();

// Ruta de análisis con rate limiter y validación de entrada
router.post("/analyze", analyzeLimiter, validateRequest(analyzeRequestSchema), analyzeVideo);

module.exports = router;
