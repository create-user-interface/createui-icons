# landing/

Лендинг на `icons.createui.dev/`. Astro 5, статика, i18n через ru/en словари. Иконки рендерятся через `<createui-icon>` (загружается с API-домена `icon.createui.dev`) либо напрямую SVG URL-ом `https://icon.createui.dev/{ver}/{name}.svg?stroke={w}`.

## Структура

```
landing/
├── astro.config.mjs         # output: static, site, i18n (ru default, en prefix)
├── package.json             # dev/build/preview + generate скрипты
├── tsconfig.json            # astro/tsconfigs/strict
├── scripts/
│   ├── sync-version.mjs     # component/package.json.version → src/generated/version.ts
│   └── generate-icons-list.mjs  # icon-names.types.ts → src/generated/icons.ts
├── public/                  # favicon, og-image, sitemap, self-hosted fonts
├── src/
│   ├── layouts/Layout.astro # <head>, CSP, preload шрифтов + createui-icons.js
│   ├── components/          # Hero / Problems / HowItWorks / Integration / Explorer / Performance / Support / Footer
│   ├── styles/*.module.css  # Scoped стили
│   ├── scripts/             # theme.ts, i18n.ts
│   ├── i18n/{ru,en,index,types}.ts
│   ├── data/codeExamples.ts # Сниппеты для Integration tabs
│   ├── utils/
│   │   ├── iconUrl.ts       # CDN, VERSION, iconUrl(name, stroke)
│   │   ├── syncStatus.ts    # Build-time fetch npm + HEAD probe CDN (для sync badge)
│   │   └── nbsp.ts
│   └── generated/           # sync-version / generate-icons-list outputs (gitignored)
└── dist/                    # Результат astro build (gitignored, деплоится rsync'ом)
```

## Команды

```sh
npm install      # ставит зависимости + сразу запускает npm run generate (postinstall)
npm run dev      # astro dev на localhost:4321, pre-hook генерит version/icons
npm run build    # полный build: generate → astro build → dist/
npm run preview  # preview последнего build из dist/
```

## URL иконок

Единственное место, где можно трогать URL-формат — `src/utils/iconUrl.ts`. Версия берётся из `component/package.json.version` через `scripts/sync-version.mjs` и кладётся в `src/generated/version.ts`.

CI (`.github/workflows/sync.yml`) после bump-а component-версии собирает лендинг тем же run-ом, так что HTML всегда ссылается на уже опубликованный на CDN bundle / SVG.

## Деплой

`sync.yml` → `rsync -az --delete landing/dist/ deploy@vds:/var/www/icons-landing/`. Nginx (`nginx/icons.conf`) отдаёт `dist/` как статику; CSP уже пропускает `img-src`/`script-src`/`connect-src https://icon.createui.dev`.
