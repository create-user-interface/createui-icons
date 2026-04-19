# scripts/

Вспомогательные скрипты (вызываются из CI и локально).

## Файлы

```
scripts/
├── sync-lucide.sh        # Синхронизация иконок из Lucide → content-addressable хранилище
└── bump-lucide.mjs       # Обновление версии Lucide в component/ (package.json, version.ts, регенерация типов)
```

## sync-lucide.sh

Две команды: `bootstrap` (первая версия) и `sync` (инкремент).

### bootstrap

Для первой инициализации — скачивает полный tarball релиза, создаёт `blobs/`, `versions/VER/` с симлинками, пишет `manifest.json`.

```bash
./scripts/sync-lucide.sh bootstrap --version 1.8.0 --storage /tmp/icons
```

Отказывается перезаписывать существующую `versions/VER/`.

### sync

Инкрементальная синхронизация: для каждой версии новее `manifest.latest` (или `--from`) получает diff через GitHub compare API, скачивает изменённые SVG, обновляет блобы/симлинки/манифест.

```bash
./scripts/sync-lucide.sh sync --storage /tmp/icons
./scripts/sync-lucide.sh sync --storage /tmp/icons --from 1.8.0  # игнорировать manifest.latest
```

Статусы из compare API:
- `added` → скачать, создать симлинк
- `modified` / `changed` → скачать, пересоздать симлинк
- `renamed` → старое имя в removed, новое — скачать
- `removed` → не создавать симлинк в новой версии

При > 300 изменённых файлов в одной версии (может быть при крупном рефакторинге Lucide) — fallback на полный tarball для этой версии.

### Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `STORAGE_DIR` | `./icons-storage` | Override для `--storage` |
| `GH_REPO` | `lucide-icons/lucide` | GitHub репозиторий |
| `TAG_PREFIX` | `""` (пусто) | Префикс git-тегов. Для Lucide 1.x релизы без префикса; старые v0.x были с `v` |

### Требования

- **bash 4.0+** — на macOS `brew install bash` (системный 3.2 не подойдёт)
- **`gh`** (аутентифицирован: `gh auth login`)
- **`curl`**, **`jq`**, **`tar`**
- **`sha256sum`** (Linux) или **`shasum`** (macOS)

### Что делает и чего не делает

Скрипт готовит **локальное** состояние: `blobs/` + `versions/` + `manifest.json`. Не деплоит на сервер и не публикует в npm — это делает GitHub Actions workflow (см. `PLAN.md` Этап 5).

### Верификация скачанных SVG

Каждый скачанный файл проверяется:
- не пустой,
- содержит `<svg`,
- содержит `stroke-width=` (необходим для подстановки на Go-сервере).

Любая проверка не прошла — скрипт падает, хранилище остаётся в предыдущем состоянии.

## bump-lucide.mjs

Обновляет версию Lucide в трёх местах (источник истины — один):
- `component/package.json.version`
- `component/package.json.devDependencies.lucide` (жёсткий пин)
- `component/src/version.ts` (константа `LUCIDE_VERSION` в URL запросов)

Затем — `npm install` + `generate:names` + `typecheck`.

```bash
node scripts/bump-lucide.mjs 1.9.0
```

Используется в CI перед `npm publish` для синхронной смены версии всех трёх мест.
