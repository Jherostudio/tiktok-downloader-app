const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos públicos (como imágenes, logos y PWA)
app.use(express.static(path.join(__dirname, "public")));

// Servir el archivo index.html en la ruta principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/download", (req, res) => {
    const url = req.body.url;

    if (!url) {
        return res.status(400).json({ error: "No URL provided" });
    }

    // Le damos un nombre único al archivo para que no choque si se descargan varios a la vez
    const filePath = path.join(__dirname, `video-${Date.now()}.mp4`);

    // Usamos execFile por seguridad (evita inyección de comandos en la URL)
    execFile("yt-dlp", ["-f", "best", "-o", filePath, url], (error) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: "Download failed" });
        }

        res.download(filePath, "video.mp4", (err) => {
            // Asegurarse de borrar el archivo temporal
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});