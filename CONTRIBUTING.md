# Guía de Contribución (CONTRIBUTING.md)

¡Gracias por tu interés en colaborar con FastTok! Este proyecto busca mantener altos estándares de calidad, seguridad y limpieza de código.

## Proceso de Desarrollo

1. **Crear una rama:** Crea siempre una rama a partir de `main` con un nombre descriptivo:
   - Características: `feature/nombre-feature`
   - Parche de errores: `bugfix/nombre-bug`
   - Refactor/Seguridad: `refactor/nombre-refactor`
2. **Escribir pruebas:** Si agregas funcionalidad o corriges un error, incluye pruebas unitarias o de integración correspondientes en `src/tests`.
3. **Validar código:** Asegúrate de ejecutar el linter y pasar todas las pruebas locales antes de hacer un push:
   ```bash
   npm run lint
   npm test
   ```
4. **Hacer un Pull Request (PR):**
   - Asegúrate de que tu PR describa claramente los cambios.
   - Las compilaciones de Docker y los workflows de GitHub Actions deben pasar con éxito.

## Estándares de Codificación

- Utiliza nombres de variables descriptivos en inglés o español (manteniendo la consistencia actual).
- Usa `async/await` en lugar de callbacks anidados para flujos asíncronos.
- No uses `exec` de Node.js con entradas directas del usuario; prefiere siempre `spawn` o `execFile` con argumentos separados en arrays por motivos de seguridad contra inyección.
- Mantén la privacidad de los usuarios: no registres direcciones IP legibles ni URLs completas en producción.
