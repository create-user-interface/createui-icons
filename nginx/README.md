# nginx/

Конфигурация Nginx для `icons.createui.dev`.

## Файлы

```
nginx/
├── icons.conf              # Server-блоки (HTTP → HTTPS redirect + HTTPS server)
└── icons-cache.conf        # HTTP-level директивы (proxy_cache_path, limit_req_zone)
```

Файлы разделены потому, что `proxy_cache_path` и `limit_req_zone` должны быть в `http {}`-контексте (`conf.d/`), а server-блоки — в `sites-available/`.

## Что делает

### `icons-cache.conf` (`conf.d/`)
- `proxy_cache_path /var/cache/nginx/icons` с `keys_zone=icons:10m`, `inactive=7d`, `max_size=200m`.
- `limit_req_zone` на `$binary_remote_addr`, 20 req/s.

### `icons.conf` (`sites-available/`)
Два server-блока:

**:80 (HTTP)** — редирект на HTTPS, ACME challenge для certbot.

**:443 (HTTPS + HTTP/2)** с маршрутизацией по приоритету:
1. `location = /health` — прямой проксинг на Go (127.0.0.1:3000), без кэша и логов.
2. `location ~ ^/{ver}/createui-icons\.js(\.map)?$` — статика бандла из `/var/icons/bundles/{ver}/`. `Cache-Control: max-age=31536000, immutable`.
3. `location ~ ^/\d+\.\d+\.\d+/[a-z0-9-]+\.svg$` — проксирование на Go с `proxy_cache icons`, ключ `$uri$is_args$args`, TTL 7d, `proxy_cache_lock on`, `X-Cache-Status`.
4. `location /` — статика лендинга из `/var/www/icons-landing/`, с разным кэшем для `.html` (5 минут, must-revalidate) и `/_astro/` (1 год, immutable).

### Безопасность
- HSTS (15768000s ≈ 6 месяцев), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin`.
- TLSv1.2 + TLSv1.3 только. Modern ciphers.
- OCSP stapling.
- Rate limit `20r/s` с burst=50 (через `limit_req zone=icons_rl`).

### gzip
Включён для `image/svg+xml`, JS, CSS, HTML, JSON. SVG жмётся хорошо (~600B → ~400B).

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
sudo ln -sf /etc/nginx/sites-available/icons.createui.dev /etc/nginx/sites-enabled/
```

### 3. Сертификат

**Первый запуск** — сертификата нет, certbot создаст через webroot challenge:

Временно закомментировать `ssl_certificate*` директивы и `listen 443 ssl` блок, оставить только `:80` server → `sudo nginx -t && sudo systemctl reload nginx`.

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d icons.createui.dev
```

Вернуть `:443` блок, проверить и перезагрузить:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Обновление** — certbot автоматически ходит через `/.well-known/acme-challenge/` (обслуживается из `/var/www/certbot`).

### 4. Проверка

```bash
curl -I https://icons.createui.dev/health
curl -I https://icons.createui.dev/1.8.0/user.svg
curl -I https://icons.createui.dev/1.8.0/createui-icons.js
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
