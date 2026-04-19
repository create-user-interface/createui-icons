# План работы над `@createui-dev/icons`

План доведения компонента `<createui-icon>` до production-ready состояния.

---

## ✅ Сделано

### 1. Соответствие API сервера
- [x] URL исправлен: `https://icons.createui.dev/{version}/{name}.svg?stroke={value}` (домен с `s`, версия в пути, stroke — query-параметр).
- [x] `stroke` — `number` (было: string union), дефолт `2` (было: `'1'`), диапазон `0.25–10`.
- [x] Клиентское квантование `stroke` до шага `0.25` — для cache hit rate на Nginx (ключ кэша = `$uri$is_args$args`).
- [x] Невалидный `stroke` (NaN/Infinity) → дефолт `2`.
- [x] Пустой `name` не уходит на сервер — shadow DOM очищается.

### 2. Версия Lucide
- [x] Создан `src/version.ts` с константой `LUCIDE_VERSION`.
- [x] Константа подставляется в URL при рендере.
- [x] CI будет обновлять `LUCIDE_VERSION` вместе с `package.json.version` перед `npm publish`.

### 3. JSX-типы — opt-in по фреймворкам
- [x] `src/icon.ts` не импортирует ни `react`, ни `solid-js` — ядро чистое.
- [x] `src/react.ts` — `declare module 'react'` + полный `DetailedHTMLProps<HTMLAttributes<HTMLElement>>` (все `on*`, `aria-*`, `ref`, `key`).
- [x] `src/solid.ts` — `declare module 'solid-js'` + `JSX.HTMLAttributes<HTMLElement>`.
- [x] `HTMLElementTagNameMap` augmentation в core — для `document.createElement` / `querySelector`.
- [x] `exports` в `package.json` разделён: `.`, `./types/react`, `./types/solid` (namespace `types/` сразу говорит «это type-only augmentation»).
- [x] Svelte/Vue/Preact/чистый HTML не цепляют React/Solid ни в runtime, ни в type-resolution.

### 4. Пакетирование
- [x] `tsconfig.json` в `component/` с `rootDir: "src"`, `outDir: "dist"`, `declaration`, `declarationMap`, `sourceMap`.
- [x] `package.json`: `main`, `module`, `types`, условные `exports` (`types` → `import`).
- [x] `sideEffects: ["./dist/icon.js"]` — бандлер не выкинет `customElements.define`.
- [x] `files: ["dist"]` — в npm уезжает только `dist/`, исходников нет.
- [x] Scripts: `build`, `typecheck`, `clean`.
- [x] `.gitignore` — `dist/`, node_modules в подпапках, секреты.

### 5. Генерация `TIconName` без Lucide у потребителей
- [x] `scripts/generate-icon-names.mjs` — читает `icons` из `lucide`, делает kebab-case, пишет `src/icon-names.types.ts` (1939 имён).
- [x] `icon.ts` импортирует тип из сгенерированного файла, удалены type-level `KebabCase`/`PascalToKebab`.
- [x] `npm scripts`: `generate:names`, `prebuild` → автоматический запуск перед `build`.
- [x] `lucide` осталась только в `devDependencies`.
- [x] `grep lucide dist/` — **0 совпадений**. Потребитель полностью изолирован от Lucide.

---

## ✅ Сделано (продолжение)

### 6. Оптимизация рендера
- [x] `<style>` создаётся один раз в `constructor` — `innerHTML` больше не пересоздаётся.
- [x] Динамика через CSS custom properties (`--createui-icon-size`, `--createui-icon-mask`) — `render()` делает два `style.setProperty`, без парсинга HTML.
- [x] `isConnected` guard в `attributeChangedCallback` — устранён двойной рендер при парсинге HTML (атрибуты применяются до `connectedCallback`).
- [x] Пустой `name` скрывается через CSS-селекторы (`:host(:not([name]))`, `:host([name=""])`) — инлайн-стили пользователя не трогаем.
- [x] Аргументы `attributeChangedCallback` типизированы через `typeof OBSERVED[number]`.

---

## ✅ Сделано (продолжение)

### 7. Валидация `name`
- [x] Regex `^[a-z0-9-]+$` в `render()` — мирроит серверную валидацию.
- [x] На невалидном `name` — `console.warn` с подсказкой и ранний return, URL не строится.
- [x] Валидные `name` (по типу `TIconName`) проходят TS-проверку на этапе компиляции; runtime-check ловит только обход типов через `setAttribute` / нестрогий код.

---

## ✅ Сделано (продолжение)

### 8. Фиксация версии `lucide`
- [x] Три места синхронизированы на точную версию `1.8.0`:
  - `package.json.version` (версия пакета = версия Lucide)
  - `package.json.devDependencies.lucide` (жёсткий пин без `^`/`~`)
  - `src/version.ts.LUCIDE_VERSION` (то, что летит в URL-запросы)
- [x] `package-lock.json` пересобран — детерминированная установка.
- [x] CI при еженедельном обновлении будет перезаписывать все три синхронно.

---

## ✅ Сделано (продолжение)

### 9. Accessibility
- [x] Через `attachInternals()` — `role='img'` всегда, `ariaHidden='true'` по умолчанию (декоративная иконка, screen reader скипает).
- [x] Наблюдаются `aria-label` / `aria-labelledby` — при наличии любого из них `ariaHidden` сбрасывается: screen reader озвучивает иконку по метке.
- [x] Defaults живут в ElementInternals, не в атрибутах хоста — DOM пользователя не засоряется, любой его явный `aria-*` перекрывает дефолт.

---

## ✅ Сделано (продолжение)

### 10. Standalone bundle для CDN (`<script>`-тег)
- [x] `esbuild` в `devDependencies` — zero-config, 2 пакета на диске.
- [x] `build:bundle` → `dist/bundle/createui-icons.js` — IIFE, минифицированный, с sourcemap, target `es2020`. Текущий размер **2.4 kB**.
- [x] IIFE всё inline (LUCIDE_VERSION, HOST_STYLES, `customElements.define`) — никаких рантайм-зависимостей, один `<script>` регистрирует `<createui-icon>`.
- [x] Глобал `window.CreateUIIcons = { createIcon, LUCIDE_VERSION }` — для императивного использования и инспекции версии Lucide.
- [x] Бандл уезжает в npm (попадает под `files: ["dist"]`) И будет выкладываться CI-скриптом на сервер `/var/icons/bundles/{version}/createui-icons.js`, чтобы URL был единым с SVG-доменом: `https://icons.createui.dev/{version}/createui-icons.js`.
- [x] Nginx location rule задокументирован для серверного этапа (см. ниже).

**Nginx-заметка для server-этапа:**
```nginx
location ~ ^/(?<ver>[^/]+)/createui-icons\.js(\.map)?$ {
  root /var/icons/bundles;
  try_files /$ver/createui-icons.js$2 =404;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```
Иммутабельный кэш по версии — как у SVG.

**CDN-usage:**
```html
<script src="https://icons.createui.dev/1.8.0/createui-icons.js"></script>
<createui-icon name="arrow-right" size="24" stroke="1.5"></createui-icon>
```

---

## ✅ Сделано (продолжение)

### 11. Финальный аудит и мелочи
- [x] `-webkit-mask-*` префиксы для Safari < 15.4 — без них mask не рендерится, иконка видна как currentColor-прямоугольник.
- [x] Reflecting-properties (`get/set name | size | stroke`) на классе — `el.name = 'heart'` теперь работает и на рантайме, не только в TS. Типы `HTMLElementTagNameMap` больше не врут.
- [x] Отдельный интерфейс `CreateUIIconElement extends HTMLElement` экспортируется — чистое типизирование DOM-нод из `querySelector` / `createElement`.
- [x] Валидация `size` симметрично `stroke`: невалидный (`NaN`, `0`, отрицательный) → warn + fallback `16`. В `stroke` тоже добавлен warn на `NaN`/`Infinity` — раньше был тихий откат.
- [x] SSR-guard в `createIcon` — `typeof document === 'undefined'` бросает понятную ошибку вместо мутного `ReferenceError`.
- [x] Убраны неиспользуемые параметры `_oldValue`, `_newValue` у `attributeChangedCallback` — спецификация не обязывает объявлять их все, TS тоже.
- [x] Флаг `firstConnected` вместо `this.isConnected` — убирает multi-render при upgrade (когда `<script>` грузится после `<createui-icon>` в DOM). Раньше было 3–5 рендеров подряд, теперь 1.
- [x] `disconnectedCallback` — решено не добавлять: нет подписок/таймеров/observers, GC уберёт shadow DOM сам.
- [x] README пакета `component/README.md` — usage для React / Solid / Vue / Svelte / HTML / CDN + стилизация + a11y + browser support + «how it works».

**Размер бандла после всех правок:** 3.3 kB min / **1.5 kB gzip** (было 1.21 kB) — +280 B за счёт префиксов, getter/setter и warn-сообщений. Акцептабельно.

---

## Вне scope этой итерации

- **Сам API сервера (Go)** — отдельный этап.
- **CI workflow** (sync-lucide, rsync бандла на `/var/icons/bundles/{version}/`, publish в npm) — отдельный этап.
- **Лендинг** — отдельный этап.
