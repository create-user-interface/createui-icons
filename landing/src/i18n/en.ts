import type { Dictionary } from './types';

const en: Dictionary = {
  meta: {
    title: 'CreateUI Icons — Lucide CDN',
    description: 'Zero bundle size. 11 stroke weights. Global Edge Delivery. Production-ready Lucide icons via CDN.',
  },

  header: {
    logo: 'CreateUI Icons',
    switchTo: 'Switch to Russian',
  },

  hero: {
    titleLine1: 'Icons',
    titleLine2: 'for production',
    subtitleLine1: 'Zero bundle size. 11 stroke weights.',
    subtitleLine2: 'Global Edge Delivery via CDN.',
    weightLabel: 'weight',
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
    browseAll: 'Browse all Lucide icons →',
    notFound: 'Not found —',
    browseLucide: 'browse Lucide',
    copyUrl: 'Copy URL',
    copiedUrl: '✓ Copied!',
    closeLabel: 'Close',
    clearLabel: 'Clear search',
  },

  performance: {
    title: 'Performance Comparison',
    metric: 'Metric',
    rows: [
      { metric: 'Bundle size',    lucide: '+250 KB',          createui: '0 KB' },
      { metric: 'Render time',    lucide: '~15ms',            createui: '<1ms' },
      { metric: 'DOM nodes',      lucide: '1 per icon',       createui: '0 (mask-image)' },
      { metric: 'Stroke weights', lucide: '1',                createui: '11' },
      { metric: 'Caching',        lucide: 'None (JS bundle)', createui: 'Immutable, 365 days' },
    ],
  },

  support: {
    title: 'Support the Project',
    description: 'This project runs on enthusiasm and is funded personally. To keep createui.dev alive and icons in your apps — support the infrastructure.',
    progressLabel: 'Domain funded for 2026: $${funded} / $${goal}',
    recommended: 'Recommended: $1/month — keeps the CDN alive for everyone.',
    caffeinePitch: {
      line1: 'This service is free for everyone, but my sleep deprivation isn\'t. Your donations go straight into the high-quality caffeine that fuels my late-night coding sessions and keeps the infrastructure running.',
      line2: 'One coffee = one month of guaranteed uptime and one more night of me staring at the screen so you don\'t have to. Help keep the domain alive and my brain functional!',
    },
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

  footer: {
    attributionBefore: 'Original icons by',
    attributionAfter: '. Licensed under ISC. Infrastructure by CreateUI.',
  },
};

export default en;
