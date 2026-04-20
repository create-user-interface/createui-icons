# План разработки `createui-icons`

Общий roadmap монорепозитория. Детальный план по компоненту — `component/PLAN.md`.

---

## Статус модулей

| Модуль | Статус |
|---|---|
| `component/` (`@createui-dev/icons`) | ✅ Готово (см. `component/PLAN.md`) |
| `server/` (Go) | ✅ Готово |
| `scripts/sync-lucide.sh` | ✅ Готово |
| `nginx/icons.conf` + `nginx/icon.conf` | ✅ Готово (два домена: лендинг + API) |
| `landing/` (Astro) | ✅ Готово (Astro 5 + i18n + CI деплой в sync.yml) |
| `.github/workflows/sync.yml` | ✅ Готово |
| VDS (provisioning) | ✅ Настроен (`85.239.48.234`) |
| Первичный деплой | ✅ Готово — https://icons.createui.dev (лендинг) + https://icon.createui.dev (API) |

---

## Этап 1 — Go-сервер (`server/`)

- `main.go` + `go.mod` (только stdlib `net/http`)
- Роутинг:
  - `GET /{version}/{icon}.svg?stroke={value}` — отдача SVG
  - `GET /health` — `200 OK`
- Валидация: `version` (semver), `icon` (`^[a-z0-9-]+$`), `stroke` (0.25–10, по умолчанию 2)
- Квантование `stroke` до ближайшего шага 0.25 — мирроит клиент для cache hit rate
- Чтение `/var/icons/versions/{version}/{icon}.svg` (прозрачно через симлинк на блоб)
- Подстановка `stroke-width="2"` → `stroke-width="{квант}"`
- Заголовки: `Content-Type: image/svg+xml`, `Cache-Control: public, max-age=31536000, immutable`, `Access-Control-Allow-Origin: *`
- Обработка 400 (валидация), 404 (файл не найден)
- Локальный smoke-test против фиктивного `/var/icons`

---

## Этап 2 — `sync-lucide.sh` (`scripts/`)

Реализация алгоритма из корневого `README.md` §«Еженедельная синхронизация Lucide»:

- Получение списка новых релизов через `gh api` (фильтр по текущей версии)
- Для каждой новой версии последовательно:
  - `gh api compare/{prev}...{new}` → список изменённых SVG (`added`/`modified`/`removed`/`renamed`)
  - Скачивание только изменённых файлов с `raw.githubusercontent.com`
  - Верификация: не пусто, содержит `<svg`, содержит `stroke-width=`
  - SHA-256 (16 символов) → блобы в `blobs/`
  - `versions/{new}/` — симлинки: изменённые на новые блобы, остальные копируются из `versions/{prev}/`
  - Обновление `manifest.json`
- Fallback на полный набор при > 300 изменённых файлов
- Локально воспроизводимый — для bootstrap первой версии без CI

---

## Этап 3 — Nginx-конфиги (`nginx/icons.conf` + `nginx/icon.conf`)

Два server-блока на одном инстансе.

**`nginx/icons.conf`** — лендинг, `server_name icons.createui.dev`:
- 443/SSL + HTTP/2
- `location /` → статика лендинга из `/var/www/icons-landing/`
- CSP разрешает `img-src`/`script-src` с `https://icon.createui.dev` (чтобы `<createui-icon>` на лендинге мог грузить иконки/бандл).

**`nginx/icon.conf`** — API, `server_name icon.createui.dev`:
- 443/SSL + HTTP/2
- `location ~ ^/\d+\.\d+\.\d+/.+\.svg$` → `proxy_pass http://127.0.0.1:3000` + `proxy_cache icons`
  - Ключ: `$uri$is_args$args`
  - TTL 7d, `inactive=7d`, `max_size=200m`, `proxy_cache_lock on`
  - `X-Cache-Status $upstream_cache_status`
- `location ~ ^/(?<ver>[^/]+)/createui-icons\.js(\.map)?$` → статика бандла из `/var/icons/bundles/$ver/` (см. `component/PLAN.md` §10)
  - `Cache-Control: public, max-age=31536000, immutable`
- `location = /health` → прямой proxy_pass на Go
- `location /` → 301 на `https://icons.createui.dev` (случайный заход в браузер)
- `limit_req` rate-limit (только API-домен)
- Security headers (HSTS, X-Content-Type-Options, и т.п.)

http-level директивы (`proxy_cache_path`, `limit_req_zone`) вынесены в `nginx/icons-cache.conf` (ставится в `/etc/nginx/conf.d/`), используются API-доменом.

---

## Этап 4 — Лендинг (`landing/`)

Astro, статическая сборка:

- Главная: описание `<createui-icon>`, установка, «how it works»
- Примеры кода: HTML/CDN, React, SolidJS, Vue, Svelte
- Каталог иконок: live-поиск, превью всех иконок текущей версии (dogfooding через `@createui-dev/icons`)
- Changelog: список версий Lucide, даты, количество added/modified/removed (данные из `manifest.json` + compare API)
- Текущая версия — обновляется CI при синхронизации
- Сборка `npm run build` → `dist/` → rsync на `/var/www/icons-landing/`

---

## Этап 5 — CI/CD (`.github/workflows/sync.yml`)

- Triggers: `schedule` (weekly cron) + `workflow_dispatch`
- Pipeline (каждый шаг блокирует следующий при провале):
  1. `sync-lucide.sh` — подготовка блобов/симлинков локально
  2. `rsync` блобов и симлинков на VDS
  3. Smoke-check: `curl` по новым версиям на сервере
  4. Пересборка лендинга (с обновлённым changelog) + деплой
  5. `cd component && npm version {latest} --no-git-tag-version && npm install lucide@{latest} && npm run build && npm publish --access public`
  6. `rsync` CDN-бандла в `/var/icons/bundles/{latest}/`
  7. `git tag v{latest}` + push
- Secrets: `SERVER_HOST`, `SERVER_USER`, `SSH_PRIVATE_KEY` (npm-публикация — через Trusted Publishing / OIDC, без `NPM_TOKEN`)
- Публикация в npm — только одна (последняя) версия за итерацию, промежуточные остаются на сервере

---

## Этап 6 — Настройка VDS (provisioning)

Первичная подготовка чистого сервера (Ubuntu/Debian, 1 vCPU, 1 GB RAM):

### Базовая безопасность
- `apt update && apt upgrade -y`
- Создание пользователя `deploy` с sudo
- SSH: отключение password-auth, отключение root-login, копирование публичного ключа
- UFW: allow 22/80/443, default deny
- `fail2ban` на SSH
- `unattended-upgrades` для security-патчей

### Окружение
- Swap 1G (RAM маленькая)
- Timezone (`Europe/Moscow`), locale
- Базовый мониторинг (`htop`, `iotop`)

### Зависимости
- `nginx`, `certbot` (python3-certbot-nginx)
- `rsync`, `jq`, `curl`, `git`
- Go runtime НЕ ставим — бинарник кросс-компилируется локально / в CI

### Структура директорий
```
/var/icons/
├── blobs/
├── versions/
└── bundles/
/var/www/icons-landing/
/var/cache/nginx/icons/
```
Права: `deploy:deploy` на всё, что деплоится; `www-data` чтение для nginx.

---

## Этап 7 — Первичный деплой

- Сборка Go-бинарника: `GOOS=linux GOARCH=amd64 go build -o icon-server ./server`
- Копирование `/usr/local/bin/icon-server`
- Systemd-юнит (`/etc/systemd/system/icon-server.service`): слушает `127.0.0.1:3000`, `Restart=always`, `User=deploy`
- Bootstrap: локальный прогон `sync-lucide.sh` для Lucide 1.8.0 → rsync блобов/симлинков/`manifest.json` на сервер
- Certbot: `certbot --nginx -d icons.createui.dev -d icon.createui.dev` (один сертификат с SAN; renewal общий)
- Применение `nginx/icons.conf` + `nginx/icon.conf`, `nginx -t`, `systemctl reload nginx`
- Первая сборка и деплой лендинга
- Загрузка CDN-бандла в `/var/icons/bundles/1.8.0/`
- Регистрация SSH deploy-key в GitHub для Actions
- Финальная валидация:
  - `curl https://icon.createui.dev/health`
  - `curl https://icon.createui.dev/1.8.0/user.svg`
  - `curl https://icon.createui.dev/1.8.0/createui-icons.js`
  - Открыть лендинг `https://icons.createui.dev/` в браузере

---

## Зависимости между этапами

```
1 (Go) ──┐
2 (sync) ─┼─→ 6 (VDS) ─→ 7 (deploy) ─→ 5 (CI/CD)
3 (Nginx)─┤
4 (lending) ─ может идти параллельно 1-3
```

Этапы 1–4 можно разрабатывать локально независимо. Этап 6 (VDS) можно начать параллельно. Этап 7 требует 1–3+6. Этап 5 (CI) — последний, после ручного подтверждения работоспособности.
