vi.mock("../services/metadata.service", () => ({
    fetchVideoMetadata: vi.fn().mockResolvedValue({
        id: "v123",
        title: "Video Test",
        creator: "Test User",
        thumbnail: "https://www.tiktok.com/logo.png",
        duration: 15,
        formats: [
            { id: "mp3", type: "audio", container: "mp3", quality: "Audio (320kbps)" },
            { id: "original", type: "video", container: "mp4", quality: "Calidad Original" }
        ]
    })
}));

// Mock de child_process para simular yt-dlp y ffmpeg
vi.mock("child_process", () => ({
    execFile: vi.fn().mockImplementation((cmd, args, options, callback) => {
        const cb = typeof options === "function" ? options : callback;
        if (cmd === "yt-dlp") {
            cb(null, "2026.03.17", ""); // Versión simulada
        } else if (cmd === "ffmpeg") {
            cb(null, "ffmpeg version 6.0", "");
        } else {
            cb(null, "ok", "");
        }
    }),
    spawn: vi.fn().mockImplementation(() => {
        return {
            stdout: { on: vi.fn() },
            stderr: { on: vi.fn() },
            on: vi.fn().mockImplementation((event, cb) => {
                if (event === "close") {
                    setTimeout(() => cb(0), 10); // Simula fin exitoso inmediato
                }
            })
        };
    })
}));

// Mock de dns para resolver a IPs públicas
vi.mock("dns", () => ({
    promises: {
        resolve: vi.fn().mockResolvedValue(["104.244.42.1"]),
        lookup: vi.fn().mockResolvedValue({ address: "104.244.42.1" })
    }
}));

const request = require("supertest");
const app = require("../app");

describe("Rutas de la API e Integración", () => {
    
    describe("Diagnósticos y Salud", () => {
        it("GET /health debe retornar 200 y el estado ok", async () => {
            const res = await request(app).get("/health");
            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe("ok");
            expect(res.body.service).toBe("fasttok");
            expect(res.body.adsEnabled).toBeDefined();
        });

        it("GET /ready debe verificar dependencias y retornar 200", async () => {
            // Mock temporal de la escritura del archivo listo
            const fs = require("fs");
            const spyWrite = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
            const spyUnlink = vi.spyOn(fs, "unlinkSync").mockImplementation(() => {});

            const res = await request(app).get("/ready");
            expect(res.statusCode).toBe(200);
            expect(res.body.ready).toBe(true);
            expect(res.body.checks.yt_dlp).toBe("ok");
            expect(res.body.checks.ffmpeg).toBe("ok");

            spyWrite.mockRestore();
            spyUnlink.mockRestore();
        });
    });

    describe("API de Análisis (/api/analyze)", () => {
        it("POST /api/analyze debe retornar metadatos y tokens válidos", async () => {
            const res = await request(app)
                .post("/api/analyze")
                .send({ url: "https://www.tiktok.com/@user/video/12345" });
                
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe("v123");
            expect(res.body.data.title).toBe("Video Test");
            expect(res.body.data.formats).toHaveLength(2);
            expect(res.body.data.formats[0].token).toBeDefined(); // Token generado
        });

        it("POST /api/analyze debe rechazar payloads sin URL o URLs inválidas", async () => {
            const resNoUrl = await request(app)
                .post("/api/analyze")
                .send({});
            expect(resNoUrl.statusCode).toBe(400);

            const resBadUrl = await request(app)
                .post("/api/analyze")
                .send({ url: "esto-no-es-una-url" });
            expect(resBadUrl.statusCode).toBe(400);
        });
    });

    describe("API de Descargas (/api/download)", () => {
        it("POST /api/download debe iniciar un trabajo asíncrono y retornar un jobId", async () => {
            // 1. Obtener primero un token analizando la url
            const analyzeRes = await request(app)
                .post("/api/analyze")
                .send({ url: "https://www.tiktok.com/@user/video/12345" });
            
            const formatData = analyzeRes.body.data.formats[0]; // Formato MP3
            
            // 2. Solicitar descarga usando el token y el formato
            const downloadRes = await request(app)
                .post("/api/download")
                .send({
                    token: formatData.token,
                    format: formatData.id
                });
                
            expect(downloadRes.statusCode).toBe(202);
            expect(downloadRes.body.success).toBe(true);
            expect(downloadRes.body.jobId).toBeDefined();
        });

        it("POST /api/download debe rechazar tokens corruptos o de formato no coincidente", async () => {
            const res = await request(app)
                .post("/api/download")
                .send({
                    token: "tokeninvalido.firmafalsa",
                    format: "mp4"
                });
            expect(res.statusCode).toBe(400);
            expect(res.body.error.message).toContain("inválido");
        });
    });
});
