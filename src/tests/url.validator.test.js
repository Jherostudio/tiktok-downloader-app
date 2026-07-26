const { describe, it, expect, vi, beforeEach } = require("vitest");

// Mock de las funciones de red nativas para evitar tráfico real
vi.mock("dns", () => ({
    promises: {
        resolve: vi.fn().mockImplementation(async (host) => {
            if (host === "localhost" || host === "127.0.0.1") return ["127.0.0.1"];
            if (host === "private.tiktok.com") return ["192.168.1.50"];
            if (host === "metadata.tiktok.com") return ["169.254.169.254"];
            return ["104.244.42.1"]; // IP pública simulada de TikTok
        }),
        lookup: vi.fn().mockImplementation(async (host) => {
            if (host === "localhost") return { address: "127.0.0.1" };
            if (host === "private.tiktok.com") return { address: "192.168.1.50" };
            return { address: "104.244.42.1" };
        })
    }
}));

const { validateAndResolveUrl, isPrivateIp, isValidTikTokHost } = require("../validators/url.validator");

describe("Validador de URL y Protección SSRF", () => {
    
    describe("isPrivateIp", () => {
        it("debe identificar IPs IPv4 privadas y locales", () => {
            expect(isPrivateIp("127.0.0.1")).toBe(true);
            expect(isPrivateIp("10.0.0.1")).toBe(true);
            expect(isPrivateIp("172.16.0.1")).toBe(true);
            expect(isPrivateIp("192.168.1.1")).toBe(true);
            expect(isPrivateIp("169.254.169.254")).toBe(true); // Metadata Cloud
            expect(isPrivateIp("224.0.0.1")).toBe(true); // Multicast
            expect(isPrivateIp("0.0.0.0")).toBe(true);
        });

        it("debe identificar IPs IPv6 privadas y locales", () => {
            expect(isPrivateIp("::1")).toBe(true);
            expect(isPrivateIp("fc00::1")).toBe(true); // ULA
            expect(isPrivateIp("fe80::1")).toBe(true); // Link-local
            expect(isPrivateIp("ff02::1")).toBe(true); // Multicast
        });

        it("debe retornar false para IPs IPv4/IPv6 públicas", () => {
            expect(isPrivateIp("8.8.8.8")).toBe(false);
            expect(isPrivateIp("104.244.42.1")).toBe(false);
            expect(isPrivateIp("2606:4700:4700::1111")).toBe(false);
        });
    });

    describe("isValidTikTokHost", () => {
        it("debe aceptar hosts oficiales de TikTok", () => {
            expect(isValidTikTokHost("tiktok.com")).toBe(true);
            expect(isValidTikTokHost("www.tiktok.com")).toBe(true);
            expect(isValidTikTokHost("m.tiktok.com")).toBe(true);
            expect(isValidTikTokHost("vm.tiktok.com")).toBe(true);
            expect(isValidTikTokHost("vt.tiktok.com")).toBe(true);
            expect(isValidTikTokHost("sub.tiktok.com")).toBe(true);
        });

        it("debe rechazar variaciones sospechosas", () => {
            expect(isValidTikTokHost("tiktok.com.malicioso.com")).toBe(false);
            expect(isValidTikTokHost("faketiktok.com")).toBe(false);
            expect(isValidTikTokHost("google.com")).toBe(false);
        });
    });

    describe("validateAndResolveUrl", () => {
        it("debe aceptar URLs válidas de TikTok con IP pública", async () => {
            const url = "https://www.tiktok.com/@username/video/1234567890";
            const res = await validateAndResolveUrl(url);
            expect(res).toBe(url);
        });

        it("debe rechazar enlaces HTTP no seguros", async () => {
            await expect(
                validateAndResolveUrl("http://www.tiktok.com/@username/video/1234567890")
            ).rejects.toThrow("Se requiere HTTPS");
        });

        it("debe rechazar localhost y IPs de loopback", async () => {
            await expect(
                validateAndResolveUrl("https://localhost/@username/video/123")
            ).rejects.toThrow();
        });

        it("debe rechazar hosts que resuelven a IPs privadas (SSRF)", async () => {
            await expect(
                validateAndResolveUrl("https://private.tiktok.com/@username/video/123")
            ).rejects.toThrow("Resolución de host denegada");
            
            await expect(
                validateAndResolveUrl("https://metadata.tiktok.com/@username/video/123")
            ).rejects.toThrow("Resolución de host denegada");
        });

        it("debe rechazar puertos personalizados", async () => {
            await expect(
                validateAndResolveUrl("https://www.tiktok.com:8080/@username/video/123")
            ).rejects.toThrow("No se permiten puertos personalizados");
        });

        it("debe rechazar credenciales incrustadas", async () => {
            await expect(
                validateAndResolveUrl("https://user:pass@www.tiktok.com/@username/video/123")
            ).rejects.toThrow("credenciales");
        });

        it("debe rechazar listas de reproducción (playlists)", async () => {
            await expect(
                validateAndResolveUrl("https://www.tiktok.com/playlist/un-id-playlist")
            ).rejects.toThrow("playlist");
        });
    });
});
