# nginx/

Конфигурация Nginx для двух доменов:

- `icons.createui.dev` — лендинг (статика Astro).
- `icon.createui.dev`  — API (SVG-иконки + CDN-бандл компонента).

## Файлы

```
nginx/
├── icons.conf          # Server-блок лендинга (icons.createui.dev)
├── icon.conf           # Server-блок API  (icon.createui.dev)
└── icons-cache.conf    # HTTP-level директивы (proxy_cache_path, limit_req_zone)
```

Файлы разделены потому, что `proxy_cache_path` и `limit_req_zone` должны быть в `http {}`-контексте (`conf.d/`), а server-блоки — в `sites-available/`.

## Что делает

### `icons-cache.conf` (`conf.d/`, используется API-доменом)
- `proxy_cache_path /var/cache/nginx/icons` с `keys_zone=icons:10m`, `inactive=7d`, `max_size=200m`.
- `limit_req_zone` на `$binary_remote_addr`, 20 req/s.

Лендинг-домен эти директивы не использует: статика дёшева, отдаётся напрямую.

### `icons.conf` (`sites-available/`) — лендинг
**:80 (HTTP)** — редирект на HTTPS, ACME challenge для certbot.

**:443 (HTTPS + HTTP/2)** — `location /` отдаёт статику из `/var/www/icons-landing/`, try_files с фолбэком на `.html`. Без `/index.html`-фолбэка (битые URL → 404, а не лендинг). `.html` кэшируются 5 мин, `/_astro/` — 1 год immutable. CSP разрешает `img-src` и `script-src` с `https://icon.createui.dev`, чтобы `<createui-icon>` на лендинге мог грузить иконки и (опционально) бандл с API-домена.

### `icon.conf` (`sites-available/`) — API
**:80 (HTTP)** — редирект на HTTPS, ACME challenge.

**:443 (HTTPS + HTTP/2)** с маршрутизацией по приоритету:
1. `location = /health` — прямой проксинг на Go (127.0.0.1:3000), без кэша и логов.
2. `location ~ ^/{ver}/createui-icons\.js(\.map)?$` — статика бандла из `/var/icons/bundles/{ver}/`. `Cache-Control: max-age=31536000, immutable`, CORS `*`.
3. `location ~ ^/\d+\.\d+\.\d+/[a-z0-9-]+\.svg$` — проксирование на Go с `proxy_cache icons`, ключ `$uri$is_args$args`, TTL 7d, `proxy_cache_lock on`, `X-Cache-Status`.
4. `location /` — 301-редирект на `https://icons.createui.dev$request_uri` (чтобы случайные заходы из браузера не упирались в 404).

### Безопасность
- HSTS (15768000s ≈ 6 месяцев), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin`.
- TLSv1.2 + TLSv1.3 только. Modern ciphers.
- OCSP stapling.
- Rate limit `20r/s` с burst=50 (только на API-домене, через `limit_req zone=icons_rl`).

### gzip
Включён для `image/svg+xml`, JS, CSS, HTML, JSON. SVG жмётся хорошо (~600B → ~400B).

### Логи
`access_log off` в обоих server-блоках, `error_log ... crit` (только критические ошибки). Причина — 14 GB диска на VDS + ожидаемая высокая нагрузка на SVG API; access.log бы съел диск за дни. Для диагностики проблем использовать `proxy_cache` counters (`X-Cache-Status` в headers) и `journalctl -u icon-server`.

## Установка на сервере

### 1. Предварительно
- Установлен `nginx` и `certbot`:
  ```bash
  sudo apt install -y nginx certbot python3-certbot-nginx
  ```
- Создана директория кэша:
  ```bash
  sudo mkdir -p /var/cache/nginx/icons
  sudo chown www-data:www-data /var/cache/nginx/icons
  ```
- Созданы директории для статики и бандлов:
  ```bash
  sudo mkdir -p /var/www/icons-landing /var/icons/bundles /var/www/certbot
  ```

### 2. Копирование конфигов

```bash
sudo cp nginx/icons-cache.conf /etc/nginx/conf.d/
sudo cp nginx/icons.conf /etc/nginx/sites-available/icons.createui.dev
sudo cp nginx/icon.conf  /etc/nginx/sites-available/icon.createui.dev
sudo ln -sf /etc/nginx/sites-available/icons.createui.dev /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/icon.createui.dev  /etc/nginx/sites-enabled/
```

### 3. Сертификаты

**Первый запуск** — сертификатов нет, certbot создаст через webroot challenge.

Временно закомментировать `ssl_certificate*` директивы и `listen 443 ssl` блоки в обоих файлах, оставить только `:80` server → `sudo nginx -t && sudo systemctl reload nginx`.

Получить один сертификат с SAN на оба домена (renewal общий):

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d icons.createui.dev \
  -d icon.createui.dev
```

(Альтернатива — по сертификату на домен: тогда `ssl_certificate` в каждом файле указывает на `/etc/letsencrypt/live/<domain>/fullchain.pem`. Сейчас в конфигах именно этот вариант — правь пути, если решишь взять SAN.)

Вернуть `:443` блоки, проверить и перезагрузить:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Обновление** — certbot автоматически ходит через `/.well-known/acme-challenge/` (обслуживается из `/var/www/certbot` обоих server-блоков).

### 4. Проверка

```bash
# API
curl -I https://icon.createui.dev/health
curl -I https://icon.createui.dev/1.8.0/user.svg
curl -I https://icon.createui.dev/1.8.0/createui-icons.js

# Лендинг
curl -I https://icons.createui.dev/
```

Должны вернуться `200` с правильными `Cache-Control` и `X-Cache-Status` для SVG.

## Локальная валидация синтаксиса

```bash
sudo nginx -t -c /etc/nginx/nginx.conf
```

Или (без установки на сервер — в Docker):

```bash
docker run --rm -v $PWD/nginx:/etc/nginx/sites-available:ro nginx:alpine nginx -t
```
