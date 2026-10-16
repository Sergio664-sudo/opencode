# Evidencias de render (Mermaid)

PNGs generados el 16/10/2026 para verificar que los diagramas Mermaid de la documentación **se renderizan sin errores** (ejercicio 2 y documento de arquitectura).

| PNG | Diagrama | Documento fuente |
|---|---|---|
| `arquitectura-1.png` | Despliegue de servicios | `../arquitectura.md` |
| `arquitectura-2.png` | `GET /api/libros` (con caché) | `../arquitectura.md` |
| `arquitectura-3.png` | `POST /api/pedidos` (cola + worker) | `../arquitectura.md` |
| `recorrido-peticiones-1.png` | `GET /api/libros` (detallado) | `../recorrido-peticiones.md` |
| `recorrido-peticiones-2.png` | `POST /api/pedidos` (detallado) | `../recorrido-peticiones.md` |

## Cómo se generaron

`render-all.js` extrae los bloques `mermaid` de los documentos y los renderiza con [`@mermaid-js/mermaid-cli@11`](https://github.com/mermaid-js/mermaid-cli) sobre `chrome-headless-shell` (puppeteer), con `--no-sandbox`:

```bash
npm install @mermaid-js/mermaid-cli@11
node render-all.js   # genera los PNG en el directorio de trabajo
```

(El script se ejecutó en `/tmp/opencode/mermaid-verify` con esa configuración de puppeteer.)
