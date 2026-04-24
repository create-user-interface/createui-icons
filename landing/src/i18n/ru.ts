import type { Dictionary } from './types';

const ru: Dictionary = {
  meta: {
    title: 'CreateUI Icons — Lucide CDN',
    description: '1700+ Lucide иконок через CDN. 3 KB gzipped рантайм, 11 толщин линий, иммутабельный кэш на 365 дней. Никакого JS-бандла с иконками.',
  },

  header: {
    logo: 'CreateUI Icons',
    switchTo: 'Switch to English',
    githubLabel: 'GitHub',
  },

  hero: {
    titleLine1: 'Иконки',
    titleLine2: 'для продакшна',
    subtitleLine1: 'Нулевой размер бандла. 11 толщин линий.',
    subtitleLine2: 'Глобальная Edge-доставка через CDN.',
    weightLabel: 'толщина',
    stats: [
      { value: '1700+', label: 'иконок' },
      { value: '3 KB', label: 'рантайм gzip' },
      { value: '11', label: 'толщин' },
      { value: '365д', label: 'immutable cache' },
    ],
  },

  weightSpectrum: {
    title: '11 толщин — одна иконка',
    subtitle: 'Один ресурс на сервере, толщина управляется query-параметром. Пропорции и антиалиасинг считает сервер, никакой runtime-обработки на клиенте.',
    captionPrefix: 'stroke=',
  },

  problems: {
    title: 'Почему традиционные иконки — это больно',
    cards: [
      {
        title: 'Раздутые бандлы',
        text: 'NPM-пакеты иконок весят мегабайты и замедляют LCP. Наш CDN — это 0 байт в вашем JS.',
      },
      {
        title: 'Засорение DOM',
        text: 'Инлайновые SVG забивают DOM и дублируются при SSR. Mask-image держит код чистым.',
      },
      {
        title: 'Проблема толщины',
        text: 'Стандартные библиотеки дают один вес. Мы даём 11 — от сверхтонких до жирных акцентов.',
      },
    ],
  },

  howItWorks: {
    title: 'Как это работает',
    nodes: {
      request: 'Запрос',
      edge: 'Edge-кэш',
      storage: 'SVG-хранилище',
    },
    geo: {
      title: 'Квантование stroke',
      text: 'Любое значение `stroke` округляется до шага 0.25 на сервере. Визуально разницы нет, зато `?stroke=1.52` и `?stroke=1.5` делят один кэш-ключ — и клиенты не фрагментируют CDN пустыми комбинациями.',
    },
    cache: {
      title: 'Иммутабельный кэш',
      textBefore: 'Каждый URL версионирован:',
      textAfter: ' Браузер кэширует на 365 дней без revalidation-запросов. Для обновления — смена версии в URL. Старые версии не удаляются. Новая версия = новый URL = новый кэш-слот. Ноль инвалидаций, ноль даунтайма.',
    },
    browserSupport: {
      title: 'Поддержка браузеров',
      text: 'Web Components + CSS mask-image. Работает во всех современных браузерах — это baseline с 2019 года.',
      browsers: [
        { name: 'Chrome', version: '77+' },
        { name: 'Firefox', version: '63+' },
        { name: 'Safari', version: '10.1+' },
        { name: 'Edge', version: '79+' },
      ],
    },
  },

  integration: {
    title: 'Интеграция с фреймворками',
    subtitle: 'Готовые сниппеты для любого стека',
    copy: 'Копировать',
    copied: '✓ Скопировано!',
  },

  explorer: {
    title: 'Обзор иконок',
    searchPlaceholder: 'Поиск иконки по имени…',
    browseAll: 'Все иконки Lucide',
    notFound: 'Не найдено —',
    browseLucide: 'смотреть на Lucide',
    copyUrl: 'Копировать',
    copiedUrl: '✓ Скопировано!',
    closeLabel: 'Закрыть',
    clearLabel: 'Очистить поиск',
  },

  performance: {
    title: 'Сравнение с альтернативами',
    subtitle: 'Размер сравнивается для 50 используемых иконок в продакшне.',
    metric: 'Метрика',
    columns: ['lucide-react', '@iconify/react', 'react-icons', 'CreateUI CDN'],
    rows: [
      { metric: 'Размер в бандле',      values: ['+250 KB', '+4 KB + on-demand HTTP', '+45 KB (tree-shaken)', '0 KB'],                     highlightLast: true },
      { metric: 'Рантайм-загрузка',     values: ['Весь пакет в JS',  'Async JSON на иконку', 'Весь пакет в JS',   '3 KB gzip + SVG по запросу'], highlightLast: true },
      { metric: 'Толщины линий',        values: ['1', '1', '1', '11'],                                                                         highlightLast: true },
      { metric: 'DOM-узлы на иконку',   values: ['1 SVG + paths',  '1 SVG + paths', '1 SVG + paths', '0 (mask-image)'],                        highlightLast: true },
      { metric: 'Кэширование',          values: ['—', 'per-icon HTTP', '—', 'immutable 365 дней'],                                             highlightLast: true },
      { metric: 'Framework-agnostic',   values: ['React only', 'React/Vue/Svelte', 'React only', 'любой (Web Component)'],                     highlightLast: true },
    ],
    footnote: 'Цифры lucide-react — unpkg.com/lucide-react, esm.sh bundle; react-icons — оценка для 50 иконок после tree-shake; @iconify/react — рантайм-обвязка + async-подгрузка. CreateUI CDN — прямое измерение gzipped runtime bundle.',
  },

  faq: {
    title: 'Частые вопросы',
    items: [
      {
        q: 'Что будет, если CDN ляжет?',
        a: 'Бандл и SVG-эндпойнты — статика за nginx на одном VDS + HTTP-кэш браузера на 365 дней. Уже загруженные иконки не исчезают при даунтайме. Для паранойи: можно использовать CSS-вариант (пример в блоке «Интеграция»), он читает SVG по URL напрямую и эквивалентен, если веб-компонент не загрузился.',
      },
      {
        q: 'Работает ли с SSR (Next.js, Nuxt, Remix, Astro)?',
        a: 'Да. `<createui-icon>` — custom element, при SSR рендерится как пустой тег, иконка подгружается на клиенте. Mask-image-путь работает в SSR полностью — URL в CSS безопасен для любого рендеринга. Этот сайт собран на Astro и использует оба подхода.',
      },
      {
        q: 'А tree-shaking? Я же не использую все 1700 иконок.',
        a: 'И не нужно. В бандле у вас только рантайм (3 KB gzipped) — он умеет рисовать любую иконку по имени. SVG подгружается только при первом использовании, дальше — из кэша. Платите ровно за то, что показали на экране.',
      },
      {
        q: 'Что если Lucide переименует или удалит иконку?',
        a: 'Каждая версия URL-а иммутабельна — `/1.11.0/foo.svg` не меняется никогда. Даже если Lucide удалит `foo` в 1.12.0, ваш прод, фиксированный на 1.11.0, продолжит работать. Когда обновитесь — пройдёте миграцию один раз.',
      },
      {
        q: 'Можно ли без CDN, всё локально?',
        a: 'Можно. SVG на сервере — плоский CAS (`versions/{ver}/{name}.svg`), Go-сервер в `server/` в репо — self-hostable. Подключаете свой домен в `icon.ts` и получаете тот же URL-формат. Бандл `@createui-dev/icons` из npm работает с любым origin.',
      },
      {
        q: 'Как это лицензируется?',
        a: 'SVG-файлы — лицензия Lucide (ISC). Наш рантайм (`@createui-dev/icons`) — MIT. Инфраструктура CDN — публичная, бесплатная. Код и конфиг открыты на GitHub.',
      },
      {
        q: 'Насколько актуален набор иконок?',
        a: 'Синхронизация с Lucide каждый понедельник 06:00 UTC. Когда выходит новая версия Lucide — автоматически публикуется новая версия нашего пакета с тем же номером. Текущая версия — в футере.',
      },
    ],
  },

  support: {
    title: 'Поддержать проект',
    intro: 'CreateUI Icons поддерживается как open-source инфраструктура. CDN работает на личном VDS, домен и трафик оплачиваются из кармана. Если библиотека решает вашу задачу — поддержите, чтобы она продолжала работать. Одна чашка кофе ≈ месяц домена и трафика.',
    bmcButton: 'Buy Me a Coffee',
    cryptoButton: 'Crypto',
    sync: {
      header: 'СТАТУС СИНХРОНИЗАЦИИ',
      cdnVersion: 'Версия на CDN',
      cdnBehind: '· отстаёт',
      npmLatest: 'npm latest (@createui-dev/icons)',
      lastSync: 'Последняя',
      nextSync: 'Следующая',
      footnote: 'Обновление: каждый понедельник, 06:00 UTC',
    },
    crypto: {
      title: 'Донат в криптовалюте',
      copy: 'Копировать',
      copied: '✓ Готово',
    },
  },

  footer: {
    attributionBefore: 'Оригинальные иконки от',
    attributionAfter: '. Лицензия ISC.',
    licenseLabel: 'Рантайм MIT',
    changelogLabel: 'Changelog',
    statusLabel: 'CDN',
    statusOk: 'online',
    statusError: 'offline',
  },
};

export default ru;
