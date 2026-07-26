const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../");
const TEMP_DIR = path.join(ROOT_DIR, "temp");

module.exports = {
    TEMP_DIR,
    ROOT_DIR,
    // Hosts de TikTok permitidos de manera explícita
    ALLOWED_TIKTOK_HOSTS: [
        "tiktok.com",
        "www.tiktok.com",
        "m.tiktok.com",
        "vm.tiktok.com",
        "vt.tiktok.com"
    ],
    // Extensiones multimedia permitidas
    ALLOWED_EXTENSIONS: ["mp4", "mp3", "m4a", "webm"],
    // Códigos de error estandarizados
    ERROR_CODES: {
        VALIDATION_ERROR: "ERR_VALIDATION",
        UNAUTHORIZED: "ERR_UNAUTHORIZED",
        FORBIDDEN: "ERR_FORBIDDEN",
        NOT_FOUND: "ERR_NOT_FOUND",
        RATE_LIMIT_EXCEEDED: "ERR_RATE_LIMIT",
        SERVER_BUSY: "ERR_SERVER_BUSY",
        TIMEOUT: "ERR_TIMEOUT",
        INTERNAL_ERROR: "ERR_INTERNAL"
    }
};
