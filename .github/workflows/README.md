# .github/workflows/

GitHub Actions workflows.

## Файлы

```
workflows/
└── sync.yml     # Еженедельная синхронизация Lucide + деплой + npm publish
```

## sync.yml

### Триггеры

- `schedule`: каждый понедельник в 06:00 UTC
- `workflow_dispatch`: ручной запуск с опциональным `from_version` (force-старт с указанной версии вместо `manifest.latest`)

### Pipeline

Один job `sync-and-deploy` на `ubuntu-latest`. Каждый шаг блокирует следующий при провале (`set -e` в `bash`-скриптах + GitHub Actions exit code).

1. **Checkout** + **SSH agent** (`webfactory/ssh-agent`) с приватным ключом.
2. **Pull state с VDS** — `rsync` `manifest.json`, `blobs/`, `versions/` в локальный workspace. Сервер — single source of truth для текущего состояния storage.
3. **Detect current version** из `manifest.latest`.
4. **Run `sync-lucide.sh sync`** — определяет новые версии, скачивает diff через `gh compare`, обновляет blobs/versions/manifest.
5. **Detect new version** — если `latest` не изменился, дальнейшие шаги пропускаются (`if: steps.after.outputs.changed == 'true'`).
6. **Push blobs/versions на VDS** — `--ignore-existing` (content-addressable, хэш = идентичность). `manifest.json` копируется последним: новая `latest` видна серверу только когда все её зависимости уже доехали.
7. **Smoke-test SVG**: `curl https://icon.createui.dev/{ver}/user.svg` (стабильный target).
8. **Setup Node 22** + npm cache + `registry-url: https://registry.npmjs.org` (нужен для npm Trusted Publishing).
9. **Bump component**: `npm version {ver}` + `npm install --save-dev lucide@{ver}`.
10. **Build bundle** (`npm run build` → `dist/bundle/createui-icons.js[.map]`).
11. **Deploy bundle** в `/var/icons/bundles/{ver}/` через `rsync --mkpath` (директория версии создаётся автоматически).
12. **Smoke-test bundle URL**: `curl https://icon.createui.dev/{ver}/createui-icons.js`.
13. **`npm publish --access public --provenance`** через **Trusted Publishing (OIDC)**: npm CLI получает короткоживущий токен по id-token workflow permission, проверяет trust-конфигурацию в npm.com и публикует без долгоживущего `NPM_TOKEN`. `--provenance` добавляет SLSA-аттестацию со ссылкой на этот workflow run. Публикуется **до** деплоя лендинга — чтобы при падении publish лендинг не ссылался на несуществующий в npm пакет.
14. **Landing build + deploy**: `npm ci && npm run build` в `landing/` (prebuild пишет только что bumped версию в `src/generated/version.ts`), затем `rsync landing/dist/` в `/var/www/icons-landing/`. Smoke-test: `/` и `/en/` возвращают 200 + отданный HTML содержит `/{ver}/` (защита от stale-cache).
15. **Commit + tag**: коммитим `component/package.json`, `component/package-lock.json`, `landing/package-lock.json` (`manifest.json` живёт на VDS, не в репо). Тег `v{ver}`, `git push --follow-tags`.
16. **GitHub Release**: `gh release create v{ver}` с body, собранным из Lucide compare API (`v{before}...v{after}`). Разделы Added / Modified / Removed / Renamed + ссылки на npm и CDN. Diff **суммарный** между последним опубликованным пакетом и новой версией — если Lucide выпустил несколько релизов за неделю, все изменения видны в одном релизе.

### Concurrency

`concurrency: { group: sync-lucide, cancel-in-progress: false }` — два запуска одновременно невозможны, второй ждёт первого.

### Секреты

| Секрет | Назначение |
|---|---|
| `SERVER_HOST` | IP / домен VDS |
| `SERVER_USER` | Пользователь SSH (например, `deploy`) |
| `SSH_PRIVATE_KEY` | Приватный ключ deploy-пользователя |

Долгоживущий `NPM_TOKEN` **не нужен** — публикация идёт через Trusted Publishing. Настраивается один раз в npm.com → Package → Settings → Trusted Publishers: привязка к `anthropics-forbes/createui-icons` + workflow `sync-lucide.yml` + environment пустой.

`GITHUB_TOKEN` подставляется автоматически — нужен `gh` для compare API и `git push`. Для push требуется `permissions: contents: write` в job (уже выставлено). Для Trusted Publishing нужен `id-token: write` (тоже выставлен).

### TODO

- **Уведомления о падениях** — Telegram/Slack webhook на `failure()` (опционально, после 1-2 успешных прогонов).

### Локальная отладка

```bash
# Прогнать sync вручную (без деплоя)
STORAGE_DIR=./icons-storage bash scripts/sync-lucide.sh sync

# Force-bootstrap (если storage потерян)
bash scripts/sync-lucide.sh bootstrap --version 1.8.0 --storage ./icons-storage
```

Проверить yaml-синтаксис без push:

```bash
# Через actionlint (brew install actionlint)
actionlint .github/workflows/sync.yml
```
