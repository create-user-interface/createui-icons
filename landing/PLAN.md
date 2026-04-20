# План переноса лендинга

Перенос готовой вёрстки из `landing/landing-base/` в `landing/` под нашу архитектуру. После завершения — `landing-base/` удаляется.

## Что в `landing-base`

**Stack:** Astro + TypeScript + CSS Modules + i18n (ru/en через статические словари).

**Структура (оставляем как есть):**

```
src/
├── layouts/Layout.astro          # <head>, шрифты, theme-script
├── components/
│   ├── LandingShell.astro        # Композиция секций
│   ├── Header.astro              # Лого + переключатель lang
│   ├── Hero.astro                # H1, превью иконки, слайдер веса, плавающие частицы
│   ├── Problems.astro            # «Зачем вообще?» карточки
│   ├── HowItWorks.astro          # Схема request → edge → storage
│   ├── Integration.astro         # Табы с кодом (React/Vue/Svelte/HTML)
│   ├── Explorer.astro            # Сетка иконок + popup + поиск
│   ├── Performance.astro         # Таблица сравнения с Lucide
│   ├── Support.astro             # Crypto-кошельки + sync-бейдж + BMC (закоммент.)
│   └── Footer.astro
├── styles/*.module.css           # Скоупленные стили под каждый компонент
├── scripts/
│   ├── theme.ts                  # Dark/light переключатель
│   └── i18n.ts                   # Применение словаря к data-i18n атрибутам
├── i18n/{en,ru,index,types}.ts   # Словари и helpers
├── utils/
│   ├── nbsp.ts                   # Замена пробелов на &nbsp; в узких местах
│   └── syncStatus.ts             # Build-time fetch npm + HEAD-probe CDN
├── data/
│   ├── icons.json                # Статический список для Explorer
│   └── codeExamples.ts           # Сниппеты для Integration
└── pages/
    ├── index.astro               # lang='ru'
    └── en/index.astro            # lang='en'

public/
├── fonts/{GolosText,JetBrainsMono}-*.woff2  # Self-hosted (preload)
├── favicon.svg
├── og-image.png
├── robots.txt
└── sitemap.xml
```

## Что не совпадает с нашей реализацией

1. **Формат URL иконок.** `landing-base` ожидает `https://icon.createui.dev/{name}-{weight_underscored}.svg` (пример: `/heart-1_5.svg`). Наш Go-сервер принимает `https://icon.createui.dev/{version}/{name}.svg?stroke={value}` (пример: `/1.8.0/heart.svg?stroke=1.5`). Эта разница встречается в `Hero.astro`, `Explorer.astro`, `codeExamples.ts`, `syncStatus.ts` и инлайн-стилях — меняем во всех местах разом.
2. **Версия в URL.** У нас она обязательная и равна `@createui-dev/icons.version` = версии Lucide. Берём её один раз на билде из `component/package.json` (monorepo-соседи) и пробрасываем константой. При следующей синхронизации CI запускает `npm version` в `component/` + билд лендинга — версия обновляется атомарно.
3. **npm-пакет для `syncStatus.ts`.** В `landing-base` это `lucide-static`; у нас — `@createui-dev/icons`. Cron в нём `0 0 1,15 * *` (2×/мес); у нас `0 6 * * 1` (еженедельно). Переписать `fetchNpmLatest` + `cronWindow`.
4. **HEAD-probe CDN.** В `landing-base` пробник `/v${v}/heart-1_5.svg`. У нас — `/{v}/user.svg` (без `v` префикса, без суффикса веса).
5. **Workflow-файл.** Комментарий в `syncStatus.ts` ссылается на `update.yml` — у нас `sync.yml`.
6. **`data/icons.json`.** В `landing-base` 29 вручную выбранных иконок. Мы генерируем полный список из `component/src/icon-names.types.ts` (~1700 иконок) — Explorer должен показывать актуальный набор текущей версии Lucide.
7. **Integration code examples.** Сейчас сниппеты показывают inline `mask-image`-подход. Мы публикуем npm-пакет с Web Component `<createui-icon>` — его и надо продвигать как главный способ интеграции. Rewrite: HTML/CDN (script src), React (с typed props), Vue, Svelte, SolidJS, опционально CSS-only вариант (raw URL + mask).
8. **Dogfooding.** В hot paths (Crypto button icon, Footer, какие-нибудь декоративные иконки) использовать `<createui-icon>` — демонстрация работоспособности пакета на собственном лендинге.
9. **Отсутствуют project files.** В `landing-base/` нет `package.json`, `astro.config.mjs`, `tsconfig.json`. Их создаём на уровне `landing/`.

## Шаги

### 1. Инициализация Astro-проекта в `landing/`
- Создать `landing/package.json` с `name: "createui-icons-landing"`, private, scripts `dev`/`build`/`preview`, `"type": "module"`.
- Зависимости: `astro@^5`, `typescript`. Без UI-фреймворка — всё pure Astro + vanilla JS в `<script>`.
- `landing/astro.config.mjs` — `output: 'static'`, `site: 'https://icons.createui.dev'`, `compressHTML: true`, `build.inlineStylesheets: 'auto'`.
- `landing/tsconfig.json` — `extends: "astro/tsconfigs/strict"`, `baseUrl: "."`.
- `landing/.gitignore` — `dist/`, `node_modules/`, `.astro/`.

### 2. Перенос файлов
- `landing-base/src/` → `landing/src/` целиком, один `git mv`. Кроме `data/icons.json` и `data/codeExamples.ts` — их пишем заново (п. 4-5).
- `landing-base/public/` → `landing/public/` целиком (шрифты, favicon, og-image, robots, sitemap).
- Sanity check: прогнать поиск `landing-base` по перенесённым файлам — не должно остаться.

### 3. Централизация URL-билдера
- Создать `landing/src/utils/iconUrl.ts`:
  ```ts
  import { LUCIDE_VERSION } from '../generated/version';
  export const CDN = 'https://icon.createui.dev';
  export const VERSION = LUCIDE_VERSION;
  export function iconUrl(name: string, stroke: number | string = 2): string {
    return `${CDN}/${VERSION}/${name}.svg?stroke=${stroke}`;
  }
  ```
- Создать `landing/src/generated/version.ts` (генерируется в build-скрипте, коммитится или игнорируется — см. п. 9).
- Заменить **все** конкатенации URL: `Hero.astro` (particle-лоадер + preview), `Explorer.astro` (grid + popup + search), `data/codeExamples.ts`.

### 4. Replace `data/icons.json`
- Добавить build-скрипт `landing/scripts/generate-icons-list.mjs`: читает `../component/src/icon-names.types.ts`, экспортирует массив имён в `src/generated/icons.ts` (TS, а не JSON — для типизации).
- Запускать из `prebuild` хука `package.json`.
- Для UX большого грида (~1700 иконок) убедиться, что `Explorer.astro` рендерит через `content-visibility: auto` или virtualization — проверить после интеграции, оптимизировать при необходимости.

### 5. Переписать `codeExamples.ts`
- Основной пример для каждой вкладки — подключение через npm-пакет + использование `<createui-icon>`.
- Порядок табов: **HTML (CDN)** → **React** → **Vue** → **Svelte** → **SolidJS** → **CSS mask (raw URL)**.
- Все сниппеты используют `iconUrl()` из п. 3 или импорты из `@createui-dev/icons`. Версию в CDN-URL подставлять из `VERSION` (п. 3).

### 6. Переписать `utils/syncStatus.ts`
- `NPM_REGISTRY = 'https://registry.npmjs.org/@createui-dev/icons'` (URL-encoded scope: `%40createui-dev%2Ficons`).
- HEAD-probe: `${CDN}/${v}/user.svg` (без `v` префикса, стабильная иконка — `user` живёт в Lucide много лет).
- `cronWindow` — переписать под `0 6 * * 1` (пн 06:00 UTC, еженедельно). Proposal: `function lastMondayAt06Utc(now)` + `function nextMondayAt06Utc(now)`.
- Фолбэк npmLatest: брать из `VERSION` (п. 3), а не хардкодить `'1.8.0'`.
- Комментарии обновить: `sync.yml`, не `update.yml`.

### 7. Dogfooding `<createui-icon>`
- Добавить `@createui-dev/icons` в `landing/package.json` dependencies (file:../component или последняя npm-версия, через workspace).
- В `Layout.astro` подключить `<script src={`${CDN}/${VERSION}/createui-icons.js`} defer />` (или импорт из npm-пакета в корневом скрипте — посмотреть, какой вариант даёт меньше CLS).
- Заменить инлайновые mask-иконки в Footer, Crypto button, Support на `<createui-icon name="..." stroke="..." size="..." />`. Декоративные частицы в Hero не трогать — там генерация через raw URL оправдана (анимации, плотность).

### 8. Проверка CSP и `Layout.astro`
- `nginx/icons.conf` CSP: `img-src 'self' data: https://icon.createui.dev; script-src 'self' https://icon.createui.dev` — уже разрешает загрузку иконок и бандла с API-домена. Ничего не меняем.
- В `<head>` `Layout.astro` подтянуть preload для `createui-icons.js`, если решим подключать через CDN (экономия TTI).
- `canonical` и `hreflang` — проверить, что ссылаются на `https://icons.createui.dev/` (landing-base уже так и делает через `SITE`).

### 9. Build/deploy в CI
- Обновить `landing/package.json` build-скрипт:
  ```json
  "prebuild": "node scripts/sync-version.mjs && node scripts/generate-icons-list.mjs",
  "build": "astro build"
  ```
  `sync-version.mjs` читает `../component/package.json.version` → пишет `src/generated/version.ts`.
- В `.github/workflows/sync.yml` добавить шаги между `Deploy CDN bundle to VDS` и `Publish to npm`:
  ```yaml
  - name: Install landing deps
    if: steps.after.outputs.changed == 'true'
    working-directory: landing
    run: npm ci
  - name: Build landing
    if: steps.after.outputs.changed == 'true'
    working-directory: landing
    run: npm run build
  - name: Deploy landing
    if: steps.after.outputs.changed == 'true'
    run: |
      rsync -az --delete landing/dist/ \
        ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/var/www/icons-landing/
  - name: Smoke-test landing
    if: steps.after.outputs.changed == 'true'
    run: curl -fsS https://icons.createui.dev/ > /dev/null
  ```
- Обновить `.github/workflows/README.md` и `PLAN.md` — шаг «⏳ Только README» для лендинга → «✅ Готово».
- Добавить `landing/package-lock.json` в workflow npm cache-dependency-path.

### 10. Проверка локально
- `cd landing && npm install && npm run build` — должен пройти без ошибок.
- `npm run dev` — открыть `http://localhost:4321`, пройти чек-лист:
  - Hero: частицы анимируются, превью меняется при смене stroke, URL-копирование работает.
  - Explorer: сетка рендерится, popup открывается, поиск возвращает HEAD-статус, копирование URL работает.
  - Integration: табы переключаются, копирование сниппета работает.
  - Language toggle: `/` ↔ `/en/`, текст меняется, атрибуты `data-i18n-attr` тоже.
  - Theme toggle: сохраняется в localStorage.
  - Crypto modal: открывается, адреса копируются.
  - Support sync badge: показывает реальные версии.
- Открыть DevTools → Network: все иконки идут с `Cache-Control: public, max-age=31536000, immutable`, 200 OK.

### 11. Удаление `landing-base/`
- `rm -rf landing/landing-base`
- `landing/README.md` обновить — убрать упоминание `landing-base`, добавить структуру реальных файлов и команды dev/build.
- `landing/src/README.md` при необходимости переписать (сейчас там заглушка).

### 12. Smoke-тест на проде
- После ближайшего успешного прогона `sync.yml` (пн 06:00 UTC или manual dispatch):
  - `curl -fsSI https://icons.createui.dev/` → 200, text/html.
  - Открыть в браузере — визуальный чек на:
    - Правильность версии в URL всех иконок.
    - Работоспособность `<createui-icon>` в местах, где заменён на компонент.
    - Sync badge показывает реальную (не `1.8.0`-фолбэк) версию.

## Чек-лист блокеров

| Риск | Где | Митигация |
|---|---|---|
| ~1700 иконок в Explorer DOM → лаги | `Explorer.astro` | `content-visibility: auto` на ячейки, lazy-load мас-изображения, IntersectionObserver для вьюпорта |
| Explorer popup preview fetcher → пачка запросов при быстром клике | `Explorer.astro` | Token-based cancellation уже реализован — сохранить |
| Hero particle count (~74 иконок на экране) × 4 темы × re-render → тормоза на старых устройствах | `Hero.astro` | Респект `prefers-reduced-motion`, уменьшать particle count на mobile |
| i18n fallback на `ru` жёстко в `index.astro` | `pages/index.astro` | Оставить — дефолтный язык проекта RU |
| CSP блокирует bundle `createui-icons.js` | `nginx/icons.conf` | Уже разрешено в `script-src https://icon.createui.dev` |
| Версия `VERSION` устарела между пересборками | Сборка | В CI `sync.yml` landing билдится после bump-а component-версии — версии всегда синхронны |

## Порядок выполнения

1-2 → 3-6 (параллельно можно) → 7-8 → 10 (локальная проверка) → 9 (CI) → 11 (уборка) → 12 (prod smoke).

Рабочая сессия идёт линейно по этим шагам; каждый шаг — отдельный коммит.
