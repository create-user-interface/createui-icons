import type { Dictionary } from './types';

const en: Dictionary = {
  meta: {
    title: 'CreateUI Icons — Lucide CDN',
    description: '1700+ Lucide icons via CDN. 3 KB gzipped runtime, 11 stroke weights, 365-day immutable cache. No icon bundle in your JS.',
  },

  header: {
    logo: 'CreateUI Icons',
    switchTo: 'Switch to Russian',
    githubLabel: 'GitHub',
  },

  hero: {
    titleLine1: 'Icons',
    titleLine2: 'for production',
    subtitleLine1: 'Zero bundle size. 11 stroke weights.',
    subtitleLine2: 'Global Edge Delivery via CDN.',
    weightLabel: 'weight',
    stats: [
      { value: '1700+', label: 'icons' },
      { value: '3 KB', label: 'gzip runtime' },
      { value: '11', label: 'stroke weights' },
      { value: '365d', label: 'immutable cache' },
    ],
  },

  weightSpectrum: {
    title: '11 stroke weights · one icon',
    subtitle: 'Single asset on the server, weight is a query param. Proportions and anti-aliasing handled server-side — zero client runtime for the stroke math.',
    captionPrefix: 'stroke=',
  },

  problems: {
    title: 'Why traditional icons hurt',
    cards: [
      {
        title: 'Bloated Bundles',
        text: 'NPM icon packages add megabytes to your JS and tank LCP. Our CDN means 0 bytes in your bundle.',
      },
      {
        title: 'DOM Pollution',
        text: 'Inline SVGs bloat the DOM and duplicate on SSR. Mask-image keeps your markup clean.',
      },
      {
        title: 'The Stroke Gap',
        text: 'Standard libraries ship one weight. We deliver 11 — from hairline to bold accents.',
      },
    ],
  },

  howItWorks: {
    title: 'How It Works',
    nodes: {
      request: 'User Request',
      edge: 'Edge Cache',
      storage: 'SVG Storage',
    },
    geo: {
      title: 'Stroke Quantization',
      text: 'Any `stroke` value is rounded to a 0.25 step on the server. Visually identical, but `?stroke=1.52` and `?stroke=1.5` now share a cache key — clients can\'t fragment the CDN with arbitrary combinations.',
    },
    cache: {
      title: 'Immutable Caching',
      textBefore: 'Every URL is versioned:',
      textAfter: ' The browser caches for 365 days with zero revalidation. To update — change the version in the URL. Old versions stay alive. New version = new URL = new cache slot. Zero invalidation, zero downtime.',
    },
    browserSupport: {
      title: 'Browser Support',
      text: 'Web Components + CSS mask-image. Works in every modern browser — baseline since 2019.',
      browsers: [
        { name: 'Chrome', version: '77+' },
        { name: 'Firefox', version: '63+' },
        { name: 'Safari', version: '10.1+' },
        { name: 'Edge', version: '79+' },
      ],
    },
  },

  integration: {
    title: 'Framework Integration',
    subtitle: 'Copy-paste ready snippets for any stack',
    copy: 'Copy',
    copied: '✓ Copied!',
  },

  explorer: {
    title: 'Explore Icons',
    searchPlaceholder: 'Search any icon name…',
    browseAll: 'Browse all Lucide icons',
    notFound: 'Not found —',
    browseLucide: 'browse Lucide',
    copyUrl: 'Copy',
    copiedUrl: '✓ Copied!',
    closeLabel: 'Close',
    clearLabel: 'Clear search',
  },

  performance: {
    title: 'vs. the alternatives',
    subtitle: 'Bundle cost compared at 50 production icons.',
    metric: 'Metric',
    columns: ['lucide-react', '@iconify/react', 'react-icons', 'CreateUI CDN'],
    rows: [
      { metric: 'Bundle footprint',   values: ['+250 KB', '+4 KB + on-demand HTTP', '+45 KB (tree-shaken)', '0 KB'],                     highlightLast: true },
      { metric: 'Runtime payload',    values: ['Full package in JS', 'Async JSON per icon', 'Full package in JS',   '3 KB gzip + SVG on request'], highlightLast: true },
      { metric: 'Stroke weights',     values: ['1', '1', '1', '11'],                                                                         highlightLast: true },
      { metric: 'DOM nodes per icon', values: ['1 SVG + paths', '1 SVG + paths', '1 SVG + paths', '0 (mask-image)'],                       highlightLast: true },
      { metric: 'Caching',            values: ['—', 'per-icon HTTP', '—', 'immutable 365 days'],                                           highlightLast: true },
      { metric: 'Framework-agnostic', values: ['React only', 'React/Vue/Svelte', 'React only', 'any (Web Component)'],                     highlightLast: true },
    ],
    footnote: 'lucide-react numbers from unpkg.com/lucide-react esm.sh bundle; react-icons estimated for 50 icons after tree-shake; @iconify/react is a runtime wrapper + async fetches. CreateUI CDN is the measured gzipped runtime bundle.',
  },

  talk: {
    eyebrow: 'Conference talk · RU',
    title: 'The idea behind the project',
    description: 'Recording of the talk that introduced the approach behind CreateUI Icons. The talk is in Russian.',
    thumbAlt: 'Talk recording preview',
    videoLabel: 'Open the talk recording on YouTube',
  },

  faq: {
    title: 'FAQ',
    items: [
      {
        q: 'What if the CDN goes down?',
        a: 'Bundle and SVG endpoints are plain nginx static on a single VDS, plus 365-day browser HTTP cache. Icons already loaded survive any downtime. Paranoid mode: use the CSS snippet from the Integration section — it reads SVGs directly via URL and works even if the web component fails to load.',
      },
      {
        q: 'Does it work with SSR (Next.js, Nuxt, Remix, Astro)?',
        a: 'Yes. `<createui-icon>` is a custom element — it renders as an empty tag during SSR and hydrates on the client. The mask-image approach works fully at SSR — URLs in CSS are safe for any render pipeline. This site is built with Astro and uses both.',
      },
      {
        q: 'What about tree-shaking? I don\'t use all 1700 icons.',
        a: 'You don\'t need to. Your bundle only contains the 3 KB gzipped runtime — it can render any icon by name. Each SVG is fetched on first use, then served from cache. You pay exactly for what the user actually sees on screen.',
      },
      {
        q: 'What if Lucide renames or removes an icon?',
        a: 'Every version URL is immutable — `/1.11.0/foo.svg` never changes. Even if Lucide drops `foo` in 1.12.0, your production pinned to 1.11.0 keeps working. When you upgrade, you migrate once.',
      },
      {
        q: 'Can I self-host, no CDN?',
        a: 'Yes. The SVG storage is a flat content-addressable store (`versions/{ver}/{name}.svg`) and the Go server in `server/` is self-hostable. Point `@createui-dev/icons` at your own origin via the `icon.ts` constant. URL format stays the same.',
      },
      {
        q: 'How is it licensed?',
        a: 'SVG files — Lucide ISC license. Our runtime (`@createui-dev/icons`) — MIT. CDN infrastructure — public, free, no signup. Source and config on GitHub.',
      },
      {
        q: 'How current is the icon set?',
        a: 'Synced with Lucide every Monday 06:00 UTC. When Lucide ships a new version, a matching `@createui-dev/icons` release goes out automatically. Current version: see the footer.',
      },
    ],
  },

  support: {
    title: 'Support the project',
    intro: 'CreateUI Icons is maintained as open-source infrastructure. The CDN runs on a personal VDS; domain and traffic are paid out of pocket. If the library solves your problem, help keep it online. A single coffee ≈ one month of domain and traffic.',
    bmcButton: 'Buy Me a Coffee',
    cryptoButton: 'Crypto',
    sync: {
      header: 'SYNC STATUS',
      cdnVersion: 'CDN version',
      cdnBehind: '· behind',
      npmLatest: 'npm latest (@createui-dev/icons)',
      lastSync: 'Last sync',
      nextSync: 'Next sync',
      footnote: 'Updates: every Monday, 06:00 UTC',
    },
    crypto: {
      title: 'Crypto Donations',
      copy: 'Copy',
      copied: '✓ Copied',
    },
  },

  changelog: {
    eyebrow: 'Releases',
    title: "What's new",
    allReleases: 'All releases →',
    counts: {
      added: 'added',
      modified: 'modified',
      removed: 'removed',
      renamed: 'renamed',
    },
  },

  footer: {
    attributionBefore: 'Original icons by',
    attributionAfter: '. ISC license.',
    licenseLabel: 'Runtime MIT',
    changelogLabel: 'Changelog',
    statusLabel: 'CDN',
    statusOk: 'online',
    statusError: 'offline',
  },
};

export default en;
