# CreateUI Icons — Спецификация

Монорепозиторий, объединяющий сервер хостинга SVG-иконок, npm-пакет `@createui-dev/icons` (Web Component) и лендинг компонента. Версия пакета === версия Lucide (сквозное версионирование).

---

## Стек

- **Go** — HTTP-сервер, подстановка stroke-width в SVG
- **TypeScript** — Web Component `<createui-icon>`, npm-пакет `@createui-dev/icons`
- **Astro / HTML** — лендинг компонента (статика)
- **Nginx** — reverse proxy, кэширование, SSL-терминация, раздача лендинга
- **GitHub Actions** — еженедельный крон: обновление Lucide, деплой на сервер, публикация npm-пакета
- **VDS** — Москва, Ubuntu/Debian, 1 vCPU, 1 ГБ RAM, SSD

---

## Версионирование

Версия `@createui-dev/icons` всегда совпадает с версией Lucide:

```
Lucide 0.460.0 → @createui-dev/icons@0.460.0
Lucide 0.461.0 → @createui-dev/icons@0.461.0
```

Одна версия — один набор иконок на сервере, один npm-пакет, один URL. Никакого маппинга.

---

## Структура репозитория

```
createui-icons/
├── server/
│   ├── main.go              # HTTP-сервер (иконки API)
│   ├── main_test.go         # Юнит-тесты
│   └── go.mod
│
├── component/
│   ├── src/
│   │   ├── icon.ts          # Web Component <createui-icon>
│   │   ├── icon-names.types.ts  # Type union всех имён иконок (генерируется)
│   │   ├── types-react.ts   # Типизация для JSX (React)
│   │   ├── types-solid.ts   # Типизация для JSX (SolidJS)
│   │   └── version.ts       # Экспорт текущей версии пакета
│   ├── scripts/             # Build/codegen-скрипты
│   ├── package.json         # @createui-dev/icons, версия = версия Lucide
│   └── tsconfig.json
│
├── landing/
│   ├── src/                 # Исходники лендинга (пока пусто)
│   └── dist/                # Собранная статика (деплоится на сервер)
│
├── scripts/
│   ├── sync-lucide.sh       # Скрипт синхронизации иконок из Lucide
│   └── bump-lucide.mjs      # Локальное обновление lucide-версии
│
├── nginx/
│   ├── icons.conf           # Server-блок лендинга (icons.createui.dev)
│   ├── icon.conf            # Server-блок API  (icon.createui.dev)
│   └── icons-cache.conf     # http-level (proxy_cache_path, limit_req_zone)
│
├── provisioning/
│   ├── bootstrap.sh         # Первичная настройка чистого VDS
│   └── icon-server.service  # Systemd-юнит для Go-сервера
│
└── .github/
    └── workflows/
        └── sync.yml         # Еженедельный крон (sync Lucide → publish)
```

---

## Домены

Два поддомена на одном сервере:

- `icons.createui.dev` — **лендинг** (статика Astro, отдаётся Nginx напрямую).
- `icon.createui.dev`  — **API**: SVG-иконки (Go-сервер за `proxy_cache`) и CDN-бандл компонента (`/{version}/createui-icons.js`).

Разделение:

- `https://icons.createui.dev/` — лендинг
- `https://icon.createui.dev/{version}/{icon}.svg` — SVG-API
- `https://icon.createui.dev/{version}/createui-icons.js` — CDN-бандл
- `https://icon.createui.dev/health` — healthcheck Go-сервера

---

## Лендинг

Статический сайт на `icons.createui.dev/`. Содержит:

- **Описание компонента** — что такое `<createui-icon>`, как установить, как использовать
- **Примеры кода** — HTML, SolidJS, React, Vue
- **Каталог иконок** — поиск по имени, превью всех доступных иконок
- **Changelog** — список версий с датами, количество новых/изменённых иконок в каждой версии
- **Текущая версия** — отображается на странице, обновляется автоматически при синхронизации

Лендинг собирается в статику (`landing/dist/`) и раздаётся Nginx напрямую, без обращения к Go-серверу.

---

## Формат URL (API иконок)

```
https://icon.createui.dev/{version}/{icon}.svg?stroke={value}
```

| Параметр | Описание | Пример |
|---|---|---|
| `version` | Версия Lucide = версия пакета | `0.460.0` |
| `icon` | Имя иконки (kebab-case) | `arrow-right`, `user`, `chevron-down` |
| `stroke` | Толщина линий (query-параметр, опциональный) | `1.5`, `2`, `3.25` |

### Примеры запросов

```
GET /0.460.0/user.svg              → stroke по умолчанию (2)
GET /0.460.0/user.svg?stroke=1.5   → stroke 1.5
GET /0.460.0/arrow-right.svg?stroke=3 → stroke 3
```

---

## Логика сервера (Go)

### 1. Парсинг запроса

Из URL извлекаются:
- `version` — строка вида semver (`0.460.0`)
- `icon` — имя файла без расширения (только `[a-z0-9-]`)
- `stroke` — query-параметр, float

### 2. Валидация stroke

- Допустимый диапазон: **0.25 — 10**
- Если не указан — значение по умолчанию: **2**
- Невалидное значение (не число, вне диапазона, инъекция) — ответ **400 Bad Request**

### 3. Квантование stroke

Значение округляется до ближайшего шага **0.25**:

```
1.73 → 1.75
2.1  → 2.0
0.3  → 0.25
```

Гарантирует конечное количество вариантов в кэше (40 значений на иконку) и высокий cache hit rate.

### 4. Чтение SVG с диска

Иконки хранятся на сервере с дедупликацией через симлинки (см. раздел «Хранение иконок на сервере»).

Сервер читает файл: `/var/icons/versions/{version}/{icon}.svg`

Go прозрачно следует по симлинку и читает содержимое блоба. Серверу не нужно знать о дедупликации.

Если файл не найден — ответ **404 Not Found**.

### 5. Подстановка stroke-width

В прочитанном SVG заменяется атрибут:

```
stroke-width="2"  →  stroke-width="{квантованное значение}"
```

### 6. Ответ

```
HTTP 200
Content-Type: image/svg+xml
Cache-Control: public, max-age=31536000, immutable
Access-Control-Allow-Origin: *
```

Тело — модифицированный SVG.

### 7. Healthcheck

```
GET /health → 200 OK
```

---

## Хранение иконок на сервере

### Проблема

Между релизами Lucide меняется 5–20 иконок из ~1 500. При наивном хранении (полная копия на каждую версию) за год накапливается 52 × 1 500 = 78 000 файлов, из которых ~95% — дубли.

### Решение — content-addressable storage + симлинки

Иконки хранятся по хэшу содержимого (блобы), а версионные директории содержат симлинки:

```
/var/icons/
├── blobs/                              # Уникальные SVG-файлы, имя = SHA-256 (первые 16 символов)
│   ├── a1b2c3d4e5f6g7h8.svg           # содержимое user.svg (до версии 0.461.0)
│   ├── b2c3d4e5f6g7h8i9.svg           # содержимое user.svg (с версии 0.461.0 — изменился)
│   ├── c3d4e5f6g7h8i9j0.svg           # содержимое arrow-right.svg (не менялся)
│   └── ...
│
├── versions/
│   ├── 0.460.0/
│   │   ├── user.svg → ../../blobs/a1b2c3d4e5f6g7h8.svg
│   │   ├── arrow-right.svg → ../../blobs/c3d4e5f6g7h8i9j0.svg
│   │   └── ...
│   ├── 0.461.0/
│   │   ├── user.svg → ../../blobs/b2c3d4e5f6g7h8i9.svg         # изменился → новый блоб
│   │   ├── arrow-right.svg → ../../blobs/c3d4e5f6g7h8i9j0.svg  # не изменился → тот же блоб
│   │   └── ...
│   └── ...
│
└── manifest.json               # Маппинг: версия + иконка → хэш блоба
```

### manifest.json

Хранит полный маппинг всех версий и иконок. Используется CI-скриптом для инкрементального обновления.

```json
{
  "latest": "0.461.0",
  "versions": {
    "0.460.0": {
      "user": "a1b2c3d4e5f6g7h8",
      "arrow-right": "c3d4e5f6g7h8i9j0",
      "chevron-down": "d4e5f6g7h8i9j0k1"
    },
    "0.461.0": {
      "user": "b2c3d4e5f6g7h8i9",
      "arrow-right": "c3d4e5f6g7h8i9j0",
      "chevron-down": "d4e5f6g7h8i9j0k1"
    }
  }
}
```

### Экономия

| Метрика | Наивное хранение | С дедупликацией |
|---|---|---|
| Файлов на сервере (1 год, 52 версии) | 78 000 SVG | ~2 000 блобов + 78 000 симлинков |
| Диск (1 год) | ~62 МБ | ~1.6 МБ (блобы) + ~4 МБ (симлинки) ≈ 6 МБ |
| Трафик при деплое одной версии | ~1.2 МБ (1 500 файлов) | ~16 КБ (10–20 изменённых файлов) |

Симлинки на ext4 занимают ~60 байт каждый (хранятся в inode, не в блоке данных).

---

## Еженедельная синхронизация Lucide (CI/CD)

GitHub Actions workflow, запускается по крону раз в неделю.

### Общий алгоритм

```
1. Узнать какие версии Lucide вышли после нашей текущей
2. Для каждой новой версии:
   a. Получить список изменённых иконок через GitHub compare API
   b. Скачать только изменённые SVG
   c. Верифицировать скачанные файлы
   d. Захэшировать, создать новые блобы
   e. Создать симлинки: изменённые → новые блобы, остальные → из предыдущей версии
3. Задеплоить на сервер (только новые блобы + симлинки)
4. Обновить лендинг
5. Опубликовать npm-пакет (с версией = последняя версия Lucide)
```

### Шаги подробно

#### Шаг 1. Получение списка новых релизов Lucide

```bash
# Текущая версия из component/package.json
CURRENT_VERSION=$(jq -r '.version' component/package.json)

# Все релизы Lucide через GitHub API
# Фильтруем: только те, что новее CURRENT_VERSION
gh api repos/lucide-icons/lucide/releases --paginate \
  --jq '.[].tag_name' \
  | sed 's/^v//' \
  | sort -V \
  | awk -v cur="$CURRENT_VERSION" '$0 > cur'
```

Результат — список версий для обработки, например:
```
0.461.0
0.462.0
0.463.0
```

Если список пуст — workflow завершается, ничего не делать.

#### Шаг 2. Для каждой новой версии — получение изменённых файлов

Итерируем по версиям **последовательно**, от старой к новой. Для каждой версии:

##### 2a. Список изменённых иконок через compare API

```bash
PREV_VERSION="0.460.0"
NEW_VERSION="0.461.0"

# Получить список изменённых файлов между тегами
gh api "repos/lucide-icons/lucide/compare/v${PREV_VERSION}...v${NEW_VERSION}" \
  --jq '.files[]
    | select(.filename | startswith("icons/"))
    | select(.filename | endswith(".svg"))
    | {
        name: (.filename | ltrimstr("icons/") | rtrimstr(".svg")),
        status: .status,
        filename: .filename
      }'
```

Результат:
```json
{"name": "user", "status": "modified", "filename": "icons/user.svg"}
{"name": "new-icon", "status": "added", "filename": "icons/new-icon.svg"}
{"name": "old-icon", "status": "removed", "filename": "icons/old-icon.svg"}
```

Статусы:
- `added` — новая иконка, скачать
- `modified` — изменилась, скачать
- `removed` — удалена, не создавать симлинк в новой версии
- `renamed` — переименована, скачать по новому имени

##### 2b. Скачивание только изменённых SVG

```bash
# Для каждого added/modified файла — скачать raw SVG по тегу
for icon in $CHANGED_ICONS; do
  curl -sL "https://raw.githubusercontent.com/lucide-icons/lucide/v${NEW_VERSION}/icons/${icon}.svg" \
    -o "tmp/${icon}.svg"
done
```

Скачиваем 5–20 файлов вместо 1 500.

##### 2c. Верификация скачанных файлов

Для каждого скачанного SVG:

```bash
for file in tmp/*.svg; do
  # Файл не пустой
  [ -s "$file" ] || fail "Empty file: $file"

  # Содержит <svg
  grep -q '<svg' "$file" || fail "Not a valid SVG: $file"

  # Содержит stroke-width (необходим для подстановки)
  grep -q 'stroke-width=' "$file" || fail "No stroke-width attribute: $file"
done
```

Если верификация не прошла — workflow падает, ничего не публикуется.

##### 2d. Хэширование и создание блобов

```bash
for file in tmp/*.svg; do
  icon=$(basename "$file" .svg)
  hash=$(sha256sum "$file" | cut -c1-16)

  # Если блоба с таким хэшем ещё нет — это новый уникальный SVG
  if [ ! -f "blobs/${hash}.svg" ]; then
    cp "$file" "blobs/${hash}.svg"
    NEW_BLOBS+=("${hash}.svg")
  fi

  # Записать маппинг: иконка → хэш
  ICON_HASHES["$icon"]="$hash"
done
```

##### 2e. Создание директории версии с симлинками

```bash
mkdir -p "versions/${NEW_VERSION}"

# Начинаем с копирования симлинков предыдущей версии
# (все иконки, которые не изменились, указывают на те же блобы)
for link in "versions/${PREV_VERSION}"/*.svg; do
  icon=$(basename "$link" .svg)

  # Если иконка была удалена в этой версии — пропустить
  if is_removed "$icon"; then
    continue
  fi

  # Если иконка изменилась — симлинк на новый блоб
  if [ -n "${ICON_HASHES[$icon]}" ]; then
    ln -s "../../blobs/${ICON_HASHES[$icon]}.svg" "versions/${NEW_VERSION}/${icon}.svg"
  else
    # Не изменилась — симлинк на тот же блоб, что и в предыдущей версии
    target=$(readlink "$link")
    ln -s "$target" "versions/${NEW_VERSION}/${icon}.svg"
  fi
done

# Добавить новые иконки (added), которых не было в предыдущей версии
for icon in $ADDED_ICONS; do
  ln -s "../../blobs/${ICON_HASHES[$icon]}.svg" "versions/${NEW_VERSION}/${icon}.svg"
done
```

##### 2f. Обновление manifest.json

```bash
# Добавить в manifest.json секцию для новой версии
# Для изменённых иконок — новый хэш
# Для остальных — хэш из предыдущей версии
# Обновить поле "latest"
jq --arg ver "$NEW_VERSION" \
   --argjson hashes "$ICON_HASHES_JSON" \
   '.versions[$ver] = (.versions[$PREV_VERSION] + $hashes) | .latest = $ver' \
   manifest.json > manifest.tmp && mv manifest.tmp manifest.json
```

#### Шаг 3. Деплой на сервер

После обработки всех новых версий — деплой на сервер одним пакетом:

```bash
# Скопировать только новые блобы
rsync -az blobs/ deploy@server:/var/icons/blobs/

# Скопировать новые директории версий (симлинки)
# --links (-l) — сохранять симлинки как симлинки, не копировать содержимое
for version in $NEW_VERSIONS; do
  rsync -az --links "versions/${version}/" "deploy@server:/var/icons/versions/${version}/"
done

# Обновить manifest.json
scp manifest.json deploy@server:/var/icons/manifest.json

# Проверить что сервер отдаёт иконки новых версий
for version in $NEW_VERSIONS; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
    "https://icon.createui.dev/${version}/user.svg")
  [ "$STATUS" = "200" ] || fail "Server check failed for version ${version}"
done
```

Трафик деплоя: ~16 КБ (10–20 новых блобов) + ~90 КБ (1 500 симлинков × 60 байт) ≈ **~100 КБ на версию**.

#### Шаг 4. Обновление лендинга

```bash
# Обновить данные changelog
# Для каждой новой версии: дата, количество иконок, список новых/изменённых/удалённых
# Данные берутся из compare API (шаг 2a)

# Собрать лендинг
cd landing && npm run build

# Скопировать на сервер
rsync -az --delete dist/ deploy@server:/var/www/icons-landing/
```

#### Шаг 5. Публикация npm-пакета

```bash
LATEST_VERSION=$(jq -r '.latest' manifest.json)

# Установить версию пакета = последняя версия Lucide
cd component
npm version "$LATEST_VERSION" --no-git-tag-version

# Обновить lucide в devDependencies
npm install "lucide@${LATEST_VERSION}" --save-dev

# Собрать пакет
npm run build

# Опубликовать
npm publish --access public
```

Публикуется только одна версия — последняя. Промежуточные версии Lucide (если за неделю вышло несколько) обрабатываются для хранения иконок на сервере, но npm-пакет выпускается один раз.

#### Шаг 6. Коммит и тег

```bash
git add manifest.json component/package.json component/package-lock.json landing/
git commit -m "sync: lucide ${LATEST_VERSION}"
git tag "v${LATEST_VERSION}"
git push origin main --tags
```

### Обработка пограничных случаев

**Lucide выпустил 0 релизов за неделю:**
Workflow завершается на шаге 1, ничего не делает.

**Lucide выпустил 5 релизов за неделю:**
Все 5 обрабатываются последовательно (шаг 2). Блобы дедуплицируются. На сервере появляются 5 директорий с симлинками. В npm публикуется только последняя версия.

**Compare API вернул > 300 файлов (лимит GitHub API):**
Это может произойти при крупном рефакторинге Lucide. В этом случае — fallback: скачать полный набор SVG из релиза (`npm install lucide@{version}`), захэшировать все файлы, создать блобы и симлинки для всех.

**Иконка удалена в Lucide:**
Не создаётся симлинк в новой версии. Старые версии продолжают работать (блоб остаётся, симлинк в старой директории указывает на него).

**Иконка переименована в Lucide:**
Старое имя — `removed`, новое — `added`. В старых версиях работает старое имя, в новых — новое.

### Гарантии

- Если иконки не прошли верификацию — ничего не публикуется
- Если деплой на сервер не удался — npm-пакет не публикуется
- Если npm publish не удался — git tag не создаётся
- Каждый шаг зависит от успеха предыдущего
- Лендинг обновляется только после успешного деплоя иконок
- Промежуточные версии Lucide не теряются — иконки для каждой есть на сервере

---

## Web Component (`@createui-dev/icons`)

### Что делает

Кастомный элемент `<createui-icon>`, который загружает SVG с сервера через CSS `mask-image`. Фреймворк-независимый — работает в SolidJS, React, Vue, чистом HTML.

### Связь с сервером

Компонент знает версию Lucide (зашита при сборке, равна версии пакета) и подставляет её в URL:

```
https://icon.createui.dev/{lucide-version}/{name}.svg?stroke={stroke}
```

Версия пакета = версия Lucide = версия в URL. Обновил пакет — иконки автоматически запрашиваются с нового пути.

### Атрибуты

| Атрибут | Тип | По умолчанию | Описание |
|---|---|---|---|
| `name` | `TIconName` | — | Имя иконки (kebab-case) |
| `size` | `number` | `16` | Размер в px |
| `stroke` | `number` | `2` | Толщина линий |

### Экспорты пакета

```ts
import '@createui-dev/icons'                          // регистрация Web Component
import { createIcon } from '@createui-dev/icons'      // программное создание
import type { TIconName } from '@createui-dev/icons'  // тип имён иконок
import type { IIconProps } from '@createui-dev/icons'  // интерфейс атрибутов
```

---

## Nginx — роутинг

Nginx обслуживает два server-блока на одном инстансе:

```nginx
# icons.createui.dev — лендинг
server {
    listen 443 ssl http2;
    server_name icons.createui.dev;

    location / {
        root /var/www/icons-landing;
        try_files $uri $uri/ $uri.html =404;
    }
}

# icon.createui.dev — API (SVG + CDN-бандл)
server {
    listen 443 ssl http2;
    server_name icon.createui.dev;

    # CDN-бандл (статика из /var/icons/bundles/{ver}/)
    location ~ "^/[0-9]+\.[0-9]+\.[0-9]+/createui-icons\.js(\.map)?$" {
        root /var/icons/bundles;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Access-Control-Allow-Origin "*";
    }

    # SVG-иконки — Go-сервер с кэшированием
    location ~ "^/[0-9]+\.[0-9]+\.[0-9]+/[a-z0-9-]+\.svg$" {
        proxy_cache icons;
        proxy_cache_key "$uri$is_args$args";
        proxy_cache_valid 200 7d;
        proxy_cache_lock on;

        add_header X-Cache-Status $upstream_cache_status;

        proxy_pass http://127.0.0.1:3000;
    }

    # Healthcheck — напрямую к Go
    location = /health {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

Полные конфиги — в `nginx/` (см. `nginx/README.md`).

---

## Nginx — кэширование иконок

### Параметры кэша

| Параметр | Значение | Пояснение |
|---|---|---|
| Ключ кэша | `$uri$is_args$args` | `/0.460.0/user.svg?stroke=1.5` |
| Время жизни | 7 дней | Протухший ключ обновляется при следующем запросе |
| `inactive` | 7 дней | Если никто не запрашивал 7 дней — файл удаляется |
| `max_size` | 200 МБ | Потолок для кэша на диске |
| `proxy_cache_lock` | on | При одинаковых запросах к бэкенду идёт только один |

### Размер кэша (worst case)

```
1 500 иконок × 40 stroke-значений = 60 000 файлов ≈ 48 МБ
```

Не растёт со временем благодаря `inactive=7d`.

---

## Безопасность

- **Валидация stroke** — только числа в диапазоне 0.25–10, предотвращает инъекции
- **Валидация имени иконки** — только `[a-z0-9-]`, предотвращает path traversal
- **Валидация версии** — только формат semver
- **CORS** — `Access-Control-Allow-Origin: *` (только на API иконок, не на лендинге)
- **Rate limiting** — базовый rate limit в Nginx

---

## Публичный репозиторий — что можно и нельзя

Репозиторий **публичный**. Открытый код сервера не является уязвимостью — логика подстановки stroke тривиальна, защита обеспечивается валидацией на сервере и настройками Nginx.

### Безопасно в публичном репо

- Код Go-сервера (логика подстановки stroke, валидация)
- Web Component (публикуется в npm — уже открыт)
- Шаблон Nginx-конфига (без реальных данных)
- CI workflow (логика синхронизации)
- Лендинг
- Скрипты деплоя

### НЕ должно попасть в репо

Все секреты хранятся в **GitHub Secrets** и подставляются в workflow через переменные окружения:

| Секрет | Назначение |
|---|---|
| `SERVER_HOST` | IP-адрес или домен VDS |
| `SERVER_USER` | Пользователь для SSH-подключения |
| `SSH_PRIVATE_KEY` | Приватный SSH-ключ для деплоя |

Для `npm publish` долгоживущий `NPM_TOKEN` **не используется**: настроено [Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers) — npm CLI получает короткоживущий токен по `id-token: write` permission GitHub Actions, проверяет trust-конфигурацию в npm.com (репо + workflow-файл должны совпадать) и публикует с `--provenance` (SLSA-аттестация).

### Использование в workflow

```yaml
jobs:
  sync-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write   # commit + tag
      id-token: write   # npm Trusted Publishing
    steps:
      - uses: webfactory/ssh-agent@v0.10.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      - name: Deploy to server
        run: rsync -az blobs/ ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/var/icons/blobs/

      - uses: actions/setup-node@v6
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'   # обязательно для Trusted Publishing

      - name: Publish to npm
        run: npm publish --access public --provenance
        working-directory: component
```

### .gitignore

```gitignore
# Секреты
.env
.npmrc
*.pem
id_*

# Артефакты сборки
landing/dist/
component/dist/
node_modules/
```

---

## Обновление иконок

URL содержит версию Lucide. При обновлении:

1. CI получает список изменённых иконок через GitHub compare API
2. CI скачивает только изменённые SVG, хэширует, создаёт блобы
3. CI деплоит новые блобы и симлинки на сервер
4. CI обновляет лендинг (changelog, каталог)
5. CI публикует `@createui-dev/icons@{lucide-version}` в npm
6. Пользователь обновляет пакет — компонент автоматически запрашивает иконки по новому URL
7. Кэш старых версий доживает неделю и вытесняется сам

Старые версии на сервере **не удаляются** — пользователи на предыдущих версиях пакета продолжают получать свои иконки.

---

## Деплой сервера (первоначальный)

1. Собрать бинарник: `GOOS=linux GOARCH=amd64 go build -o icon-server ./server`
2. Скопировать на VDS: `scp icon-server user@server:/usr/local/bin/`
3. Создать systemd-юнит для автозапуска Go-сервера
4. Создать структуру директорий: `/var/icons/blobs/`, `/var/icons/versions/`
5. Выполнить начальную синхронизацию (скачать все иконки текущей версии Lucide)
6. Собрать лендинг, скопировать в `/var/www/icons-landing/`
7. Настроить Nginx по шаблонам из `nginx/icons.conf` (лендинг) и `nginx/icon.conf` (API)
8. Получить SSL-сертификат (certbot)
9. Настроить SSH-ключ для GitHub Actions (деплой иконок и лендинга)

---

## Расчёт ресурсов

| Метрика | Наивное хранение | С дедупликацией |
|---|---|---|
| RAM (Go-сервер) | ~10 МБ | ~10 МБ |
| RAM (Nginx) | ~20 МБ | ~20 МБ |
| Диск — SVG (1 год, 52 версии) | ~62 МБ | ~6 МБ |
| Диск — кэш Nginx (worst case) | ~48 МБ | ~48 МБ |
| Диск — лендинг | ~5–20 МБ | ~5–20 МБ |
| Трафик деплоя (1 версия) | ~1.2 МБ | ~100 КБ |
| CPU | Минимальная нагрузка, 1 vCPU достаточно | Без изменений |
