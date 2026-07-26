const express = require("express");
const path = require("path");
const env = require("./config/env");
const requestIdMiddleware = require("./middleware/request-id");
const { helmetMiddleware, corsMiddleware } = require("./middleware/security");
const errorHandler = require("./middleware/error-handler");

// Rutas
const healthRoutes = require("./routes/health.routes");
const analyzeRoutes = require("./routes/analyze.routes");
const downloadRoutes = require("./routes/download.routes");

const app = express();

// Configurar confianza en proxies (requerido para Render / Cloudflare para leer IPs reales)
app.set("trust proxy", 1);

// Middlewares globales de seguridad e identificación
app.use(requestIdMiddleware);
app.use(helmetMiddleware);
app.use(corsMiddleware);

// Limitar el tamaño de payload JSON para evitar ataques de denegación de servicio (DoS)
app.use(express.json({ limit: env.MAX_JSON_SIZE }));

// Servir archivos estáticos del directorio /public en la raíz
app.use(express.static(path.join(__dirname, "../public")));

// Montar rutas de salud y diagnóstico
app.use("/", healthRoutes);

// Montar rutas de API
app.use("/api", analyzeRoutes);
app.use("/api", downloadRoutes);

// Servir la página web principal index.html desde la raíz del proyecto
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

// Manejo centralizado de errores
app.use(errorHandler);

module.exports = app;
