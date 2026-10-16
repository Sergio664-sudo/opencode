# Ficha de requerimientos de implantación — tienda-libros

> **Leyenda: ✅ ya lo trae la aplicación (estado actual del repo) · ➕ hay que añadirlo o decidirlo para producción.**
> Aplicación: web estática + API REST (Express) + worker de facturas + PostgreSQL + Redis, orquestada con Docker Compose (5 contenedores, 1 unidad de despliegue). Hoy solo está lista para desarrollo local (`docker compose up`).

## 1. Hardware o instancia

| Recurso | Requerimiento | Estado |
|---|---|---|
| Instancia | 1 VPS x86-64: 2 vCPU, 4 GB RAM, 60 GB SSD NVMe, IP pública fija | ➕ |
| Justificación | 5 contenedores ligeros (uso estimado < 1,5 GB RAM; imágenes ~1,5–2 GB; margen para construir imágenes en el propio host) | ➕ |
| Alternativas | 2 vCPU/2 GB solo si las imágenes se construyen fuera; equipo físico con SAI; futuro: base de datos gestionada (RDS/Cloud SQL) y/o segundo host | ➕ |

## 2. Software y versiones

| Componente | Repo actual | Producción | Estado |
|---|---|---|---|
| Sistema operativo | — (no definido) | Ubuntu Server 24.04 LTS o Debian 12 + parches automáticos | ➕ |
| Docker Engine + Compose v2 | — | Docker 27.x+ con plugin `docker compose` | ➕ |
| Proxy | `nginx:1.27-alpine` | fijar patch vigente o digest sha256 | ✅ / ➕ |
| Node (api y worker) | `node:20-alpine` | ⚠️ Node 20 está EOL (abr-2026): subir a `node:24-alpine` (mínimo 22) | ➕ |
| PostgreSQL | `postgres:16-alpine` | fijar patch 16.x o digest | ✅ / ➕ |
| Redis | `redis:7-alpine` | fijar patch 7.x o digest | ✅ / ➕ |
| Dependencias npm | `express ^4.19.2`, `pg ^8.11.5`, `redis ^4.6.13`, `jsonwebtoken ^9.0.2` (api, sin usar); `redis ^4.6.13` (worker) | generar `package-lock.json` y usar `npm ci` (hoy: rangos `^` sin lockfile = builds no reproducibles) | ➕ |
| Herramientas auxiliares | — | certbot, age/gpg (backups), fail2ban, trivy (escaneo) | ➕ |

## 3. Red (dominio, DNS, puertos, cortafuegos)

✅ **Ya trae:** un único puerto publicado `8080:80` (host:contenedor); `api`, `db`, `cache` y `worker` solo en la red interna de Compose; nginx sirve el estático y hace proxy de `/api/` → `api:3000`.

➕ **Añadir:**
- **Dominio y DNS:** `tienda.midominio.es` → registro A a la IP del VPS (AAAA si IPv6); TTL 300 durante migraciones; subdominio `staging.` para preproducción.
- **Puertos en producción:** publicar `80:80` y `443:443` en el proxy (hoy 8080) o mantener 8080 con otro proxy delante; el 8080 nunca directo a Internet sin TLS.
- **TLS:** Certbot + Let's Encrypt; montar `/etc/letsencrypt` (solo lectura) en el contenedor proxy; `ssl_certificate` en `default.conf` (hoy no existe TLS); redirección 80→443 + HSTS; renovación automática con recarga de nginx.
- **Cortafuegos** (ufw/nftables): 443/80 abiertos; 22 solo desde IP de administración. ⚠️ Docker inserta reglas iptables que se saltan ufw: gestionar con la cadena `DOCKER-USER`, el plugin `ufw-docker`, o publicar en `127.0.0.1` y usar proxy externo.
- **Salida:** 443 para apt/npm/registry; SMTP relay si se implementa el envío de facturas por correo (no usar el 25 directo).

## 4. Seguridad y secretos

✅ **Ya trae:** secretos fuera del repo (`docker-compose.yml` interpola `${POSTGRES_PASSWORD}` y `${JWT_SECRET}` desde `.env`; `.env.example` como plantilla; `.gitignore` excluye `.env` y `node_modules/`); red interna aislada; un solo puerto expuesto; imágenes oficiales con usuario propio en db/cache; `restart: unless-stopped`; healthcheck de PostgreSQL.

➕ **Añadir:**
- Generar secretos de producción fuertes (`openssl rand -base64 48`), distintos de los de ejemplo; `.env` con permisos 600; procedimiento de rotación.
- ⚠️ **Hallazgo:** `jsonwebtoken` y `JWT_SECRET` están declarados pero la API **no autentica nada** (`POST /pedidos` queda abierto). Implementar autenticación por token o, como mínimo, limitar en nginx (rate limiting, basic auth para administración) y validar entradas.
- Endurecer contenedores: `USER node` en api/worker (hoy corren como root), `.dockerignore`, `cap_drop`, `no-new-privileges`, `read_only` donde aplique, límites de memoria/CPU.
- Servidor: SSH solo con clave, root deshabilitado, fail2ban, cuentas mínimas.
- Gestión de secretos: evolucionar de `.env` a Docker secrets/SOPS/Vault si crece; backups cifrados; secretos nunca en Git ni en claro.
- Vulnerabilidades: escaneo de imágenes (trivy) y actualización periódica (Renovate/dependabot).

## 5. Entornos

✅ **Ya trae:** un único entorno implícito (local); `NODE_ENV=production` puesto a mano en el compose; `.env.example` como plantilla.

➕ **Añadir:**
| Entorno | Dónde | Configuración | Datos |
|---|---|---|---|
| Desarrollo | PC del desarrollador | compose actual + `.env` local | semilla de `init.sql` |
| Preproducción (staging) | VPS pequeño u otro puerto/dominio del mismo host | `docker-compose.staging.yml` + `.env.staging` | sintéticos, nunca reales |
| Producción | VPS | `docker-compose.prod.yml` (TLS, límites, logging) + `.env.production` fuera del repo | reales + backups |

- Promoción del **mismo artefacto**: construir la imagen una vez con tag de versión (`v1.2.0`) y desplegar la misma en staging y producción (registry privado/GHCR). Hoy las imágenes se construyen sin tag ni registry: imposible elegir versión al hacer rollback.
- **Esquema:** `db/init.sql` solo se ejecuta con el volumen vacío (primer arranque) y no hay herramienta de migraciones → añadir (Flyway, node-pg-migrate) para evolucionar la BD sin recrearla.

## 6. Datos y copias de seguridad

✅ **Ya trae:** esquema + semilla en `db/init.sql`; volúmenes nombrados `datos-db` y `datos-cache`; persistencia de Redis por RDB (`--save 60 1`).

➕ **Añadir:**
- **Backups de PostgreSQL:** `pg_dump` diario por cron (host o contenedor sidecar) → gzip → cifrado (age/gpg) → copia local + offsite (S3/Backblaze/rsync). Retención 7 diarias / 4 semanales / 12 mensuales. Restauración de prueba mensual documentada.
- Antes de cada despliegue con cambios de esquema: `pg_dump` manual obligatorio (punto de retorno).
- **Cola de facturas:** la caché puede perderse; la cola no. Activar AOF en Redis (`--appendonly yes`) y/o job de reconciliación que detecte pedidos sin factura.
- Objetivos: **RPO ≤ 24 h** (mejorable a ~1 h con WAL/pgBackRest); **RTO ≤ 1–2 h**.
- Copia del `.env` de producción en un gestor de secretos (nunca junto a backups sin cifrar ni en el repo).
- Vigilar disco: backups + imágenes + datos; alerta al 80 %.

## 7. Monitorización y registros

✅ **Ya trae:** logs a stdout/stderr de todos los contenedores (visibles con `docker compose logs`); endpoint `GET /salud` en la API; healthcheck `pg_isready` en PostgreSQL; `restart: unless-stopped` en todos los servicios.

➕ **Añadir:**
- **Rotación de logs de Docker** (`/etc/docker/daemon.json`: `max-size: 10m`, `max-file: 3`): hoy son ilimitados y pueden llenar el disco.
- Healthchecks que faltan: api (`wget -qO- localhost:3000/salud`), cache (`redis-cli ping`), proxy (puerto 80 / `nginx -t`). El worker no tiene endpoint: vigilar por reinicios/logs.
- Monitorización externa de disponibilidad: chequeo de `/salud` y de la home cada minuto (Uptime Kuma o servicio cloud) con alertas a email/Telegram.
- Métricas: node_exporter + cAdvisor + Prometheus/Grafana (o Netdata, más simple). Alertas mínimas: host caído, disco > 80 %, RAM, contenedor reiniciándose, backup fallido, cola con pedidos sin consumir.
- Centralización de logs (opcional recomendado): Loki/Promtail o vector; retención 14–30 días.
- Mejora en la app: middleware de errores en Express (hoy un fallo de Redis en una ruta async produce un *unhandled rejection*, el proceso termina y `restart` lo reinicia en bucle).

## 8. Fases del despliegue

1. **Prerrequisitos:** dominio, VPS y decisión TLS/proxy.
2. **Servidor:** SO + parches; usuario admin con clave SSH; ufw (22 restringido, 80/443); instalar Docker Engine + compose; `daemon.json` con logs rotados; opcional fail2ban.
3. **Proyecto:** clonar el repo en `/opt/tienda-libros`; crear `.env` de producción con secretos nuevos (permisos 600).
4. **Configuración de producción:** `docker-compose.prod.yml` (puertos 80/443, certificados en solo lectura, límites de recursos); nginx con TLS y redirección; lockfiles para builds reproducibles.
5. **TLS:** emitir certificado con certbot para el dominio; verificar la renovación automática.
6. **Build y arranque por capas:** `docker compose build` → `up -d db cache` → esperar `pg_isready` y `redis-cli ping` → `up -d api worker` → comprobar `GET /salud` → `up -d proxy` → comprobar HTTPS y `/api/libros`.
7. **Datos:** si viene de otra instalación, restaurar el `pg_dump` (no fiarse solo de `init.sql`); verificar conteos.
8. **Pruebas de aceptación (smoke):** `/libros` 200 con datos; `/pedidos` 201 con id; log del worker «Generando la factura del pedido N»; 400 si faltan datos; 80→443; certificado válido.
9. **DNS:** bajar el TTL con antelación, apuntar el registro A al host y verificar propagación.
10. **Puesta en servicio vigilada** 24–48 h con backups y monitorización activos.
11. **Documentar el runbook:** arranque/parada, restauración de backup, rotación de secretos, contactos.

## 9. Plan de vuelta atrás

- **Disparadores:** `/salud` caído, tasa de 5xx > 1 % durante 10 min, datos erróneos tras el despliegue, worker sin consumir la cola.
- **Preparación previa:** imágenes de la versión anterior tagueadas (➕ hoy no hay tags: sin esto no se puede volver a una versión concreta); `pg_dump` pre-despliegue; config y `.env` respaldados fuera del repo.
- **Escenarios:**
  a) *Fallo de la app sin cambio de esquema:* `docker compose down` (SIN `-v`) → arrancar las imágenes del tag anterior → verificar. ~5–10 min.
  b) *Cambio de esquema o datos corruptos:* modo mantenimiento en el proxy → restaurar el `pg_dump` pre-despliegue → volver al tag anterior → verificar.
  c) *Fallo del servidor completo:* recrear el host (pasos documentados), restaurar el backup offsite más reciente y levantar el compose. RTO 1–2 h (según último backup).
  d) *Migración de host:* devolver el registro DNS a la IP antigua (TTL bajo).
- **Regla de oro:** nunca `docker compose down -v` (borra los volúmenes); el rollback de datos va antes que el de código.
- Ensayo obligatorio en staging; registrar en un log de cambios hora, causa, decisión y resultado.

## 10. Resumen: ya trae vs. hay que añadir

| Área | ✅ Ya trae | ➕ Añadir para producción |
|---|---|---|
| Hardware | — | 1 VPS 2 vCPU / 4 GB / 60 GB SSD |
| SO y runtime | Imágenes Docker versionadas | Ubuntu LTS, Docker 27+/Compose v2, Node 24 (20 está EOL) |
| Red | Solo 8080 publicado; red interna | Dominio + DNS, 80/443, TLS, cortafuegos (DOCKER-USER) |
| Seguridad | Secretos fuera del repo (.env), red aislada | Auth real (JWT sin usar), no-root, límites, trivy, fail2ban |
| Entornos | Un entorno local | staging + prod, compose.prod, tags de imagen, migraciones |
| Datos/copias | Volúmenes + init.sql + RDB | pg_dump diario cifrado + offsite, AOF cola, RPO/RTO |
| Monitorización | Logs stdout, /salud, healthcheck db | Rotación de logs, healthchecks api/cache/proxy, uptime + alertas |
| Despliegue/rollback | restart, depends_on | Fases documentadas, imágenes tagueadas, plan de vuelta atrás ensayado |
