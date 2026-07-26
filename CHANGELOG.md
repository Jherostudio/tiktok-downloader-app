# Historial de Cambios (CHANGELOG.md)

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [1.0.0] - 2026-07-18

### Añadido
- **Estructura Modular (`src/`):** Separación de responsabilidades en controladores, servicios, rutas, validadores y middlewares.
- **Protección SSRF Avanzada:** Validador estricto que resuelve redirecciones acortadas (`vm`/`vt`) y verifica la resolución DNS contra rangos de IP privadas, loopback, multicast e interfaces de metadatos cloud.
- **Seguridad Express (Helmet & CSP):** Configuración estricta de cabeceras HTTP y políticas de seguridad de contenido.
- **Limitación de Tasa (Rate Limiting):** Reglas separadas de peticiones por minuto por IP para análisis y descargas.
- **Manejador de Colas Asíncronas (Queue Service):** Control estricto de descargas concurrentes globales y por cliente.
- **Servidor Resistente:** Gestión de apagado limpio (Graceful Shutdown) liberando subprocesos y borrando temporales ante señales `SIGTERM`/`SIGINT`.
- **Suite de Pruebas (Vitest & Supertest):** Pruebas unitarias de seguridad (SSRF) y pruebas de integración de API con mocks de red y procesos.
- **Integración Continua:** Configuración de GitHub Actions para linter, pruebas, auditoría de seguridad y compilación de contenedor Docker.
- **Páginas Legales y Aviso de Privacidad:** Adición de términos de uso, políticas de cookies, privacidad y DMCA accesibles en el frontend.

### Modificado
- **Lógica de Anuncios:** Implementación de carga de anuncios condicional y no invasiva mediante `ADS_ENABLED=true/false` en variables de entorno.
- **Limpieza de Archivos Temporales:** Generación de subcarpetas aisladas mediante UUIDs con limpieza forzada en flujos de éxito, error, cancelación y purga periódica cada 5 minutos.
- **Dockerfile Seguro:** Actualización del contenedor a `node:20-slim` ejecutándose bajo un usuario no root (`node`) y añadiendo `HEALTHCHECK`.

### Eliminado
- Scripts de publicidad invasiva (Popunders, SmartLinks automáticos) por defecto.
- Funcionalidad ficticia "HD PRO". Reemplazada por oferta de formatos y calidades reales.
