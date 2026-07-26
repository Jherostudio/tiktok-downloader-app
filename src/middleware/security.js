const helmet = require("helmet");
const cors = require("cors");
const env = require("../config/env");

// Configuración dinámica de políticas de seguridad de contenido (CSP)
const getCspDirectives = () => {
    const directives = {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'", 
            "'unsafe-inline'", // Necesario para scripts integrados y Google Fonts
            "https://fonts.googleapis.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
            "'self'", 
            "data:", 
            "*.tiktokcdn.com", 
            "*.tiktok.com", 
            "*.akamaized.net",
            "*.byteoversea.com"
        ],
        connectSrc: ["'self'"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
    };

    // Si la publicidad está habilitada, permitir los dominios de la red publicitaria Adsterra
    if (env.ADS_ENABLED) {
        directives.scriptSrc.push("*.profitablecpmratenetwork.com", "*.akamaized.net");
        directives.connectSrc.push("https://*.profitablecpmratenetwork.com");
        directives.frameSrc.push("https://*.profitablecpmratenetwork.com");
    }

    return directives;
};

const helmetMiddleware = helmet({
    contentSecurityPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

// Configuración de CORS basada en la lista blanca de variables de entorno
const corsOptions = {
    origin: (origin, callback) => {
        // En desarrollo y test, permitir peticiones sin origen (ej: curl, Postman o desarrollo local)
        if (!origin && env.NODE_ENV !== "production") {
            return callback(null, true);
        }

        const allowedList = env.ALLOWED_ORIGINS.split(",").map(o => o.trim().toLowerCase());
        
        if (origin && allowedList.includes(origin.toLowerCase())) {
            callback(null, true);
        } else {
            callback(new Error("Acceso denegado por políticas de CORS."));
        }
    },
    credentials: false,
    optionsSuccessStatus: 200
};

const corsMiddleware = cors(corsOptions);

module.exports = {
    helmetMiddleware,
    corsMiddleware
};
