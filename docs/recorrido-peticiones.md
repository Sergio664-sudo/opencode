# Recorrido de una petición — tienda-libros

Diagramas Mermaid del recorrido de `GET /api/libros` y `POST /api/pedidos`,
cotejados con `api/src/server.js`, `worker/worker.js` y `nginx/default.conf`.

## 1. GET /api/libros (con caché Redis)

```mermaid
flowchart TD
    CL["Cliente<br/>GET http://localhost:8080/api/libros"]
    PX["proxy · nginx<br/>location /api/ → proxy_pass http://api:3000/<br/>(reescribe /api/libros como /libros)"]
    API["api · Express<br/>app.get('/libros')"]
    CK{"await cache.get('libros')"}
    HIT["HIT: Redis devuelve el JSON cacheado"]
    MISS["MISS: no hay valor en Redis"]
    DB["PostgreSQL<br/>SELECT id, titulo, autor, precio<br/>FROM libros ORDER BY id"]
    SET["cache.set('libros', JSON.stringify(rows), EX: 60)<br/>(TTL 60 segundos)"]
    R1["200 OK<br/>res.json(JSON.parse(enCache))"]
    R2["200 OK<br/>res.json(rows)"]
    FIN["El cliente recibe la lista de libros"]

    CL --> PX --> API --> CK
    CK -- "sí (hit)" --> HIT --> R1 --> FIN
    CK -- "no (miss)" --> MISS --> DB --> SET --> R2 --> FIN
```

## 2. POST /api/pedidos (cola de facturas + worker)

```mermaid
flowchart TD
    CL["Cliente<br/>POST http://localhost:8080/api/pedidos<br/>body: libroId, unidades"]
    PX["proxy · nginx<br/>location /api/ → proxy_pass http://api:3000/<br/>(/api/pedidos → /pedidos)"]
    API["api · Express + express.json()<br/>app.post('/pedidos')"]
    VAL{"¿libroId y unidades?"}
    E400["400 · error: 'Faltan datos'"]
    INS["PostgreSQL<br/>INSERT INTO pedidos (libro_id, unidades)<br/>VALUES ($1, $2) RETURNING id"]
    LPUSH["cache.lPush('cola:facturas', String(id))"]
    R201["201 · pedido: id"]
    WST["worker · inicio<br/>cache.connect() + log 'Worker de facturas en marcha'"]
    WLOOP["worker · bucle infinito<br/>await cache.brPop('cola:facturas', 0) — bloqueante"]
    WLOG["console.log('Generando la factura del pedido', id)<br/>(única acción del worker: registrar en el log)"]

    CL --> PX --> API --> VAL
    VAL -- "no (ausente o 0)" --> E400 --> EC["Cliente recibe el error 400"]
    VAL -- "sí" --> INS --> LPUSH --> R201 --> OC["Cliente recibe el nº de pedido"]
    LPUSH -. "el id queda encolado en Redis; la API NO espera al worker" .-> WLOOP
    WST --> WLOOP
    WLOOP -- "llega un id" --> WLOG --> WLOOP
```

## Cotejo con el código (comprobaciones)

- `GET /api/libros` lee **primero** la caché (`cache.get('libros')`) y solo consulta PostgreSQL si no hay valor; al responder desde la caché no se refresca el TTL.
- En el *miss*, el `SELECT` es exactamente `id, titulo, autor, precio FROM libros ORDER BY id` y el resultado se guarda con `EX: 60` (60 s).
- `POST /api/pedidos` usa `express.json()` para leer el body; si `libroId` o `unidades` son falsy devuelve **400** sin tocar la base de datos.
- El `INSERT` devuelve el `id` (`RETURNING id`), que se encola como texto en `cola:facturas` con `lPush`, y la API responde **201** sin esperar al worker.
- El `worker` arranca conectando a Redis, hace `brPop('cola:facturas', 0)` (0 = espera bloqueante indefinida) y por cada id solo escribe un `console.log`; después vuelve al bucle.
