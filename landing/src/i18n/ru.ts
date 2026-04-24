import type { Dictionary } from './types';

const ru: Dictionary = {
  meta: {
    title: 'CreateUI Icons — Lucide CDN',
    description: 'Ноль килобайт в бандле. 11 толщин линий. Глобальная CDN-доставка. Готовые к продакшну Lucide иконки через CDN.',
  },

  header: {
    logo: 'CreateUI Icons',
    switchTo: 'Switch to English',
  },

  hero: {
    titleLine1: 'Иконки',
    titleLine2: 'для продакшна',
    subtitleLine1: 'Нулевой размер бандла. 11 толщин линий.',
    subtitleLine2: 'Глобальная Edge-доставка через CDN.',
    weightLabel: 'толщина',
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
    copyUrl: 'Копировать URL',
    copiedUrl: '✓ Скопировано!',
    closeLabel: 'Закрыть',
    clearLabel: 'Очистить поиск',
  },

  performance: {
    title: 'Сравнение производительности',
    metric: 'Метрика',
    rows: [
      { metric: 'Размер бандла',  lucide: '+250 KB',          createui: '0 KB' },
      { metric: 'Время рендера',  lucide: '~15ms',            createui: '<1ms' },
      { metric: 'DOM-узлы',       lucide: '1 per icon',       createui: '0 (mask-image)' },
      { metric: 'Толщины линий',  lucide: '1',                createui: '11' },
      { metric: 'Кэширование',    lucide: 'None (JS bundle)', createui: 'Immutable, 365 days' },
    ],
  },

  support: {
    title: 'Поддержи проект',
    description: 'Проект работает на энтузиазме и оплачивается лично. Чтобы домен createui.dev не «протух», а иконки не исчезли из ваших приложений — поддержите инфраструктуру.',
    progressLabel: 'Домен оплачен на 2026: $${funded} / $${goal}',
    recommended: 'Рекомендуемый донат: $1/мес — поддерживает CDN для всех.',
    caffeinePitch: {
      line1: 'Этот сервис бесплатный для всех, а вот мой недосып — увы, нет. Ваши донаты идут прямиком на качественный кофеин, который питает мои ночные кодинг-сессии и держит инфраструктуру на плаву.',
      line2: 'Одна чашка кофе = один месяц гарантированного аптайма и ещё одна ночь, когда я пялюсь в экран вместо вас. Поддержите домен живым, а мой мозг — в рабочем состоянии!',
    },
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
    attributionAfter: '. Лицензия ISC. Инфраструктура CreateUI.',
  },
};

export default ru;
