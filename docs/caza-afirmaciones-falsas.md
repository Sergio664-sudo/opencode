# Caza de afirmaciones falsas

Auto-revisión del agente durante la práctica: afirmaciones hechas por el agente que **no son ciertas para esta aplicación**, con el fichero y la línea que las desmienten y la afirmación correcta. Líneas verificadas contra los ficheros actuales del proyecto (16/10/2026).

| # | Frase del agente | La desmiente | Afirmación correcta |
|---|---|---|---|
| 1 | «La factura se genera en segundo plano» (respuesta sobre arquitectura, *Ventajas*) | `worker/worker.js:10` | La API responde 201 y **encola** el pedido; el worker solo escribe un log: la generación de la factura **no está implementada** |
| 2 | «Ambos están en Node/Express» (tabla de evidencias, consistencia del «microservicio») | `worker/package.json:9-11` y `worker/worker.js:1` | La **api** usa Express; el **worker** es un script Node sin framework ni HTTP, solo con el cliente de Redis |
| 3 | «El compose los inyecta a `api` y `db` como variables de entorno» (clasificación de recursos, fila *Secretos*) | `docker-compose.yml:20` vs `38-41` | `POSTGRES_PASSWORD` llega a `db` y a `api` (dentro de `DATABASE_URL`); **`JWT_SECRET` solo se inyecta a `api`** |
| 4 | «`/salud` (healthcheck)» (primera tabla de servicios, fila api) | `docker-compose.yml:45` y `api/src/server.js:12` | `/salud` es un endpoint que la API ofrece, pero **nadie lo comprueba**; el único healthcheck real es el de `db` (`pg_isready`) |

---

## 1. «La factura se genera en segundo plano»

- **Frase del agente** (respuesta sobre el modelo de arquitectura, apartado *Ventajas*):
  > «**Asincronía útil**: el pedido responde 201 al instante y la factura se genera en segundo plano; un pico de pedidos no bloquea la compra.»
- **La desmiente**: `worker/worker.js`, **línea 10**:
  ```js
  console.log('Generando la factura del pedido', tarea.element);
  ```
  junto con el bucle de las líneas 8–11: el worker saca el id de la cola, escribe esa línea de log y vuelve a bloquearse en `brPop`. No genera ningún documento, no escribe en la base de datos, no envía nada.
- **Afirmación correcta**: la API responde 201 de inmediato y el pedido queda *encolado*; el worker consume la cola, pero **la generación de la factura no está implementada**: por ahora solo registra el id en el log.

## 2. «Ambos están en Node/Express»

- **Frase del agente** (tabla de evidencias de la respuesta de arquitectura, fila *Consistencia del «microservicio»*):
  > «Ambos están en Node/Express (mismo stack, no hay politglotia).»
- **La desmiente**: `worker/package.json`, **líneas 9–11** — su única dependencia es `redis`; y `worker/worker.js`, **línea 1**, que solo hace `require('redis')`. Una búsqueda de `express` en `worker/` da **0 coincidencias**.
- **Afirmación correcta**: la **api** usa Express (API HTTP); el **worker** es un script Node sin framework ni servidor HTTP, que solo usa el cliente de Redis. Comparten lenguaje (Node), no framework.

## 3. «El compose los inyecta a `api` y `db`»

- **Frase del agente** (clasificación de recursos, fila *Secretos*, hablando de `POSTGRES_PASSWORD` y `JWT_SECRET`):
  > «El compose los inyecta a `api` y `db` como variables de entorno.»
- **La desmiente**: `docker-compose.yml`, **línea 20**: `JWT_SECRET` aparece **solo** bajo `api`; el servicio `db` (**líneas 38–41**) recibe únicamente `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD`; el worker solo recibe `REDIS_URL` (línea 31) y el proxy ninguna variable.
- **Afirmación correcta**: `POSTGRES_PASSWORD` llega a `db` y a `api` (dentro de `DATABASE_URL`); **`JWT_SECRET` solo se inyecta a `api`**. Ningún otro servicio recibe secretos.

## 4. «`/salud` (healthcheck)»

- **Frase del agente** (primera tabla de servicios, fila api):
  > «API REST en Node/Express: `/salud` (healthcheck), `/libros` (…) y `/pedidos` (…).»
- **La desmiente**: en `docker-compose.yml`, **línea 45**, el único servicio con la clave `healthcheck:` es `db`; el servicio `api` (líneas 13–26) **no tiene healthcheck**. Y `/salud` solo aparece en `api/src/server.js`, **línea 12**, donde se define: nada del despliegue lo invoca. La propia ficha de implantación (`docs/ficha-implantacion.md:82`) lo lista como "healthcheck que falta".
- **Afirmación correcta**: `/salud` es un endpoint que la API ofrece y que *podría* usarse para monitorizar, pero **en el despliegue actual nadie lo comprueba**; el único healthcheck real es el de `db` (`pg_isready`, líneas 45–49).

---

## Menciones dudosas (no del todo falsas, pero sin base)

- «El catálogo (`/libros`) sale de Redis **casi siempre**»: depende del tráfico; con peticiones separadas más de 60 s (`api/src/server.js:18`, `EX: 60`), la caché siempre daría *miss*.
- «Si Redis cae, el proceso **revienta**»: con node-redis la petición puede quedar en la cola *offline* en vez de rechazar; lo defendible es "no hay manejo de errores en la ruta", no el comportamiento exacto del proceso.
