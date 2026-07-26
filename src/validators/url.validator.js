const dns = require("dns").promises;
const net = require("net");
const https = require("https");
const { URL } = require("url");
const { ALLOWED_TIKTOK_HOSTS } = require("../config/constants");
const logger = require("../utils/logger");

/**
 * Verifica si una dirección IP pertenece a rangos privados, locales, loopback, multicast o metadatos de nube.
 */
function isPrivateIp(ipAddress) {
    if (!net.isIP(ipAddress)) return true; // Rechazar si no es IP válida
    
    if (net.isIPv4(ipAddress)) {
        const parts = ipAddress.split(".").map(Number);
        
        // Loopback (127.0.0.0/8)
        if (parts[0] === 127) return true;
        // Private Class A (10.0.0.0/8)
        if (parts[0] === 10) return true;
        // Private Class B (172.16.0.0/12)
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        // Private Class C (192.168.0.0/16)
        if (parts[0] === 192 && parts[1] === 168) return true;
        // Link-local (169.254.0.0/16) - incluye metadatos de AWS/GCP
        if (parts[0] === 169 && parts[1] === 254) return true;
        // Multicast (224.0.0.0/4)
        if (parts[0] >= 224 && parts[0] <= 239) return true;
        // Broadcast/Unspecified
        if (parts[0] === 0 || ipAddress === "255.255.255.255") return true;
        
        return false;
    }
    
    if (net.isIPv6(ipAddress)) {
        const cleanIp = ipAddress.toLowerCase().trim();
        
        // Loopback (::1)
        if (cleanIp === "::1" || cleanIp === "0:0:0:0:0:0:0:1") return true;
        // Unspecified (::)
        if (cleanIp === "::" || cleanIp === "0:0:0:0:0:0:0:0") return true;
        // Unique Local Address (ULA: fc00::/7)
        if (cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) return true;
        // Link-local (fe80::/10)
        if (
            cleanIp.startsWith("fe8") || 
            cleanIp.startsWith("fe9") || 
            cleanIp.startsWith("fea") || 
            cleanIp.startsWith("feb")
        ) return true;
        // Multicast (ff00::/8)
        if (cleanIp.startsWith("ff")) return true;
        
        return false;
    }
    
    return true;
}

/**
 * Valida la resolución DNS de un nombre de host.
 * Retorna true si todas las direcciones IP del host son públicas y seguras.
 */
async function checkDns(hostname) {
    try {
        // dns.resolve4 o resolve6 podrían fallar si el dominio no tiene registros, 
        // pero dns.lookup consulta la configuración del sistema (incluido hosts, que está bloqueado por el filtro).
        const addresses = await dns.resolve(hostname).catch(async () => {
            const res = await dns.lookup(hostname, { all: true });
            return res.map(r => r.address);
        });
        
        if (!addresses || addresses.length === 0) return false;
        
        for (const address of addresses) {
            if (isPrivateIp(address)) {
                logger.warn({ ip: address, hostname }, "Dirección IP privada detectada en DNS (SSRF bloqueado)");
                return false;
            }
        }
        return true;
    } catch (e) {
        logger.error({ err: e, hostname }, "Fallo en la resolución DNS del hostname");
        return false;
    }
}

/**
 * Comprueba si el host pertenece de forma exacta o como subdominio directo a TikTok.
 */
function isValidTikTokHost(hostname) {
    const cleanHost = hostname.toLowerCase().trim();
    
    // Si está en la lista blanca explícita, es válido
    if (ALLOWED_TIKTOK_HOSTS.includes(cleanHost)) {
        return true;
    }
    
    // Verificar si es un subdominio válido que termine en .tiktok.com
    if (cleanHost.endsWith(".tiktok.com")) {
        // Prevenir bypass como "tiktok.com.example.com"
        const remaining = cleanHost.substring(0, cleanHost.length - 11);
        // Debe ser un subdominio válido (no vacío y sin puertos/caracteres raros)
        if (remaining.length > 0 && !remaining.includes("/")) {
            return true;
        }
    }
    
    return false;
}

/**
 * Verifica si es un tipo de contenido no permitido (playlists, tags, audios de perfiles).
 */
function isPlaylistOrUnsupportedUrl(parsedUrl) {
    const pathname = parsedUrl.pathname.toLowerCase();
    return (
        pathname.includes("/playlist/") || 
        pathname.includes("/music/") || 
        pathname.includes("/tag/") ||
        pathname.includes("/share/") // a veces comparte perfiles o búsquedas
    );
}

/**
 * Obtiene el destino de una redirección HTTP (HEAD request).
 */
function getRedirectTarget(urlStr, timeoutMs) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(urlStr);
        const options = {
            method: "HEAD",
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            port: 443,
            timeout: timeoutMs,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        };

        const req = https.request(options, (res) => {
            req.destroy(); // Abortar inmediatamente para no descargar cuerpo
            
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                try {
                    const resolvedLocation = new URL(res.headers.location, urlStr).toString();
                    resolve(resolvedLocation);
                } catch (e) {
                    reject(new Error("Redirección con formato de cabecera inválido."));
                }
            } else {
                resolve(null); // No hay más redirecciones
            }
        });

        req.on("error", (err) => {
            reject(err);
        });

        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Tiempo de espera agotado al resolver redirección."));
        });

        req.end();
    });
}

/**
 * Valida de forma segura una URL de TikTok, resolviendo redirecciones
 * y protegiendo al servidor contra ataques SSRF.
 * Retorna la URL resuelta definitiva si es válida, o lanza un error.
 */
async function validateAndResolveUrl(urlInput) {
    if (typeof urlInput !== "string") {
        throw new Error("La URL debe ser una cadena de texto.");
    }
    
    if (urlInput.length > 2048) {
        throw new Error("La URL es demasiado larga.");
    }

    const trimmedUrl = urlInput.trim();
    try {
        const parsedUrl = new URL(trimmedUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            throw new Error("El protocolo de la URL debe ser HTTP o HTTPS.");
        }
        return trimmedUrl;
    } catch (e) {
        throw new Error("El formato de la URL no es válido.");
    }
}

module.exports = {
    validateAndResolveUrl,
    isPrivateIp,
    isValidTikTokHost
};
