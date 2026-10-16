# Registro de prompts

| Nº | Prompt (resumido) | Qué hizo el agente | Qué corregí yo |
|---|---|---|---|
| 1 | Lista los servicios y rellena una tabla (imagen/build, puerto externo e interno, volúmenes, dependencias, qué hace) | Tabla completa desde `docker-compose.yml`: 5 servicios; solo el proxy publica 8080 | Nada; verifiqué con los ficheros (su etiqueta «/salud (healthcheck)» se cazó en el punto 7) |
| 2 | ¿Qué servicios son accesibles desde fuera del equipo y por qué? | Solo `proxy` (`0.0.0.0:8080`); `EXPOSE` no publica; red interna aislada; matiz Docker vs ufw | Nada |
| 3 | Clasifica los recursos del proyecto y comprueba/propón `.gitignore` | Clasificación por tipo (estático, código, datos, dependencias, configuración, secretos, logs); creó el `.gitignore` (no existía) | Apliqué el `.gitignore`; cacé después que dijo que `JWT_SECRET` se inyecta también a `db` (falso) |
| 4 | Dos diagramas Mermaid: `GET /api/libros` (caché) y `POST /api/pedidos` (cola + worker), con cotejo y verificación de render | Diagramas + banco de pruebas `docs/verificar-mermaid.html`; cotejo correcto con `server.js` y `worker.js` | Le exigí verificación visual en el visor: quedó pendiente (visor desconectado) y se retomó al final |
| 5 | Modelo de arquitectura y contraste crítico (evidencias y generalidades que no se sostienen) | 3 capas + caché + cola asíncrona; desmontó «microservicios» con evidencias de ficheros | Cacé dos frases falsas: «la factura se genera en segundo plano» (`worker.js:10`) y «ambos en Node/Express» (el worker no usa Express) |
| 6 | Ficha de requerimientos de implantación (hardware, red, TLS, backups, monitorización, despliegue, rollback) | `docs/ficha-implantacion.md` completa, con marcas ✅/➕ | Nada; validé sus hallazgos (Node 20 EOL, `jsonwebtoken` sin usar) |
| 7 | Caza de afirmaciones falsas (mínimo 3, con fichero:línea y corrección) | 4 cazas + 2 dudosas en `docs/caza-afirmaciones-falsas.md`; commit `listaerrores` | Verifiqué las líneas con `grep` (`server.js:12`, `docker-compose.yml:45`, `:20`…) |
| 8 | Repite el ejercicio con dos prompts (vago vs preciso, citando ficheros) y compara | Comparativa: cambia alcance, formato, citas y verificabilidad del resultado | Nada |
| 9 | Publica `docs/arquitectura.md` con el diagrama renderizado | Creó el documento (3 diagramas), commit `01a2feb`; render headless en marcha (Chromium ya instalado) | Se quedó en modo Plan sin publicar; insistí y lo ejecutó |
| 10 | Mantén el registro de prompts en `prompts.md` | Redactó esta tabla | — |
